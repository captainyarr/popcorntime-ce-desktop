(function(App) {
    'use strict';

    var _ = require('underscore');
    var Q = require('q');
    var OpenSubtitlesApi = require('opensubtitles-api');
    const Bottleneck = require('bottleneck');
    const {
        performance,
        PerformanceObserver
    } = require('perf_hooks');

    var osError = false;

    let obs;

    //Default non-authenicated login
    var OS = new OpenSubtitlesApi({
        useragent: 'Popcorn Time v1'
    });

    const limiter = new Bottleneck({
        reservoir: 40, // initial value
        reservoirRefreshAmount: 40,
        reservoirRefreshInterval: 10 * 1000, // must be divisible by 250

        // also use maxConcurrent and/or minTime for safety
        maxConcurrent: 4,
        minTime: 250 // pick a value that makes sense for your use case
    });

    var TTL = 1000 * 60 * 60 * 24 * 14; // 14 Day retention

    var OpenSubtitlesMovies = function() {
        win.debug('OpenSubtitles Init')
        App.Providers.CacheProvider.call(this, 'subtitle', TTL);

        //Login with Default Values
        this.authenticated = false;

        this.authenticate(App.settings.opensubtitlesUsername, App.settings.opensubtitlesPassword);

    };

    OpenSubtitlesMovies.prototype = Object.create(App.Providers.CacheProvider.prototype);
    OpenSubtitlesMovies.prototype.constructor = OpenSubtitlesMovies;

    // Language mapping to match PT langcodes
    var languageMapping = {
        'albanian': 'sq',
        'arabic': 'ar',
        'bengali': 'bn',
        'brazilian-portuguese': 'pt-br',
        'bulgarian': 'bg',
        'bosnian': 'bs',
        'chinese': 'zh',
        'croatian': 'hr',
        'czech': 'cs',
        'danish': 'da',
        'dutch': 'nl',
        'english': 'en',
        'estonian': 'et',
        'farsi-persian': 'fa',
        'finnish': 'fi',
        'french': 'fr',
        'german': 'de',
        'greek': 'el',
        'hebrew': 'he',
        'hungarian': 'hu',
        'indonesian': 'id',
        'italian': 'it',
        'japanese': 'ja',
        'korean': 'ko',
        'lithuanian': 'lt',
        'macedonian': 'mk',
        'malay': 'ms',
        'norwegian': 'no',
        'polish': 'pl',
        'portuguese': 'pt',
        'romanian': 'ro',
        'russian': 'ru',
        'serbian': 'sr',
        'slovenian': 'sl',
        'spanish': 'es',
        'swedish': 'sv',
        'thai': 'th',
        'turkish': 'tr',
        'urdu': 'ur',
        'ukrainian': 'uk',
        'vietnamese': 'vi'
    };

    OpenSubtitlesMovies.prototype.authenticate = function(username, password, callback) {
        win.debug("Opensubtitles Authenicate")

        var deferred = Q.defer();

        //Login with Default Values
        this.authenticated = false;

        if (username != "" || password != "") {
            OS = new OpenSubtitlesApi({
                useragent: 'Popcorn Time v1',
                username: username,
                password: password,
                ssl: true
            });
            OS.login()
                .then(res => {
                    //win.debug(res.token);
                    //win.debug(res.userinfo);
                    this.authenticated = true;
                    win.debug("OpenSubtitles API Login Successful");

                    ga('send', {
                        hitType: 'event',
                        eventCategory: 'OpenSubtitles',
                        eventAction: 'OpenSubtitles Login Successful',
                        eventLabel: 'OpenSubtitles Login Successful'
                    });

                    deferred.resolve(this.authenticated);
                })
                .catch(err => {
                    win.error(err);
                    OS = new OpenSubtitlesApi({
                        useragent: 'Popcorn Time v1'
                    });
                    this.authenticated = false;
                    win.debug("OpenSubtitles API Login Unsuccessful");
                    ga('send', {
                        hitType: 'event',
                        eventCategory: 'OpenSubtitles',
                        eventAction: 'OpenSubtitles Login Unsuccessful',
                        eventLabel: 'OpenSubtitles: ' + err
                    });
                    deferred.resolve(this.authenticated);
                });

        } else {
            OS = new OpenSubtitlesApi({
                useragent: 'Popcorn Time v1'
            });
            this.authenticated = false;
            win.debug("OpenSubtitles API Login Unsuccessful");
            ga('send', {
                hitType: 'event',
                eventCategory: 'OpenSubtitles',
                eventAction: 'OpenSubtitles Login Anonymous',
                eventLabel: 'OpenSubtitles Login Anonymous'
            });
            deferred.resolve(this.authenticated);
        }
        return deferred.promise;
    };

    OpenSubtitlesMovies.prototype.disconnect = function(callback) {
        //reset API to non-authenicated user
        OS = new OpenSubtitlesApi({
            useragent: 'Popcorn Time v1'
        });
        this.authenticated = false;
        win.debug("Opensubtitles API Logout");
        ga('send', {
            hitType: 'event',
            eventCategory: 'OpenSubtitles',
            eventAction: 'OpenSubtitles Disconnect',
            eventLabel: 'OpenSubtitles Disconnect'
        });
        callback();
    };

    var subtitleSearch = function(id) {
        var deferred = Q.defer();

        if (!osError) {
            win.debug("Search Start: " + id);
            OS.search({
                imdbid: id,
                gzip: false
            }).then(subtitles => {
                //win.debug("OS:Subtitles: "+JSON.stringify(subtitles));
                win.debug("Search End: " + id);
                if (subtitles) {
                    deferred.resolve({
                        [id]: subtitles
                    });
                } else {
                    //subtitles is blank
                    deferred.resolve({});
                }
            }).catch(err => {
                win.error("OpenSubtitlesMovies API Error: " + id + " " + err);
                validateOSError(err);
                //subtitles is blank
                deferred.resolve({});
            });
        } else {
            //subtitles is blank
            deferred.resolve({});
        }
        return deferred.promise;
    };

    const throttledsubtitleSearch = limiter.wrap(subtitleSearch);

    var querySubtitles = function(imdbIds) {
        performance.mark('querySubtitles_start');
        var deferred = Q.defer();

        if (_.isEmpty(imdbIds)) {
            //subtitles is blank
            deferred.resolve({});
            return deferred.promise;
        }

        osError = false; //Clear OS error flag

        //win.debug("querySubtitles: " + imdbIds);

        //Cycle through each imdbId then return the sublist
        //Search for imdbId

        return Q.all(
            _.map(imdbIds, throttledsubtitleSearch))
            .then(data => {
                //Create subtitleList Array and return based on the input list
                var subtitleList = {};
                subtitleList.subs = {};

                _.each(data, function(item) {
                    for (var name in item) {
                        //win.debug("Subtitle IMDB ID: " + name);
                        subtitleList.subs[name] = item[name];
                    }
                });
                performance.mark('querySubtitles_end');
                performance.measure('querySubtitles', 'querySubtitles_start', 'querySubtitles_end');
                return subtitleList;
            });
    };

    var normalizeLangCodes = function(data) {
        if ('pb' in data) {
            data['pt-br'] = data['pb'];
            delete data['pb'];
        }
        return data;
    };

    var formatForPopcorn = function(data) {
        performance.mark('formatForPopcorn_start');
        //win.debug("formatForPopcorn:data: " + JSON.stringify(data));
        var allSubs = {};
        // Iterate each movie
        _.each(data.subs, function(langs, imdbId) {
            var movieSubs = {};
            langs = normalizeLangCodes(langs);
            // Iterate each language
            _.each(langs, function(subs, lang) {
                // Pick highest rated
                var langCode = lang;
                var ratedSub = _.max({
                    subs
                }, function(s) {
                    return s.score;
                });
                movieSubs[langCode] = ratedSub.url;
            });

            // Remove unsupported subtitles
            var filteredSubtitle = App.Localization.filterSubtitle(movieSubs);
            allSubs[imdbId] = filteredSubtitle;
        });

        //win.debug("Common.santize: " + JSON.stringify(Common.sanitize(allSubs)));
        performance.mark('formatForPopcorn_end');
        performance.measure('formatForPopcorn_subtitles', 'formatForPopcorn_start', 'formatForPopcorn_end');
        return Common.sanitize(allSubs);
    };

    var validateOSError = function(err) {
        //Check and process OS errors
        switch (err.message) {
            case 'API seems offline':
            case '401 Unauthorized':
                osError = true;
                break;
            default:
                break;
        }

    }

    var stopPerformance = function() {
        try {
            obs.disconnect();
        } catch (e) {
            win.error(e)
        }
    }
    OpenSubtitlesMovies.prototype.query = function(ids) {
        obs = new PerformanceObserver((list, observer) => {
            const entries = list.getEntries();
            entries.forEach((entry) => {
                win.debug('Performance Test: ' + entry.name + ' Duration: ' + entry.duration + 'ms');
            });
        });
        obs.observe({ entryTypes: ['measure'], buffered: true });

        return querySubtitles(ids).then(formatForPopcorn).finally(stopPerformance);
    };

    App.Providers.OpenSubtitlesMovies = OpenSubtitlesMovies;

})(window.App);