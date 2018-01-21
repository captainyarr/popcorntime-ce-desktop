(function (App) {
    'use strict';

    var request = require('request'),
        URI = require('urijs'),
        Q = require('q'),
        _ = require('underscore'),
        inherits = require('util').inherits,

        PT_VERSION = AdvSettings.get('version'),

        API_ENDPOINT = URI('https://api.tvshowtime.com/v1'),
        CLIENT_ID = 'iM2Vxlwr93imH7nwrTEZ',
        CLIENT_SECRET = 'ghmK6ueMJjQLHBwsaao1tw3HUF7JVp_GQTwDwhCn',
        //REDIRECT_URI = 'http://localhost/popcorntimece/oauth',
        REDIRECT_URI = 'urn:ietf:wg:oauth:2.0:oob:auto',
        STATE = "popcorntimece" + Math.random().toString(36).substring(20);

    win.debug("TVShowTime:State: " + STATE);

    //https://www.tvtime.com/oauth/authorize?response_type=code&client_id=iM2Vxlwr93imH7nwrTEZ&redirect_uri=urn:ietf:wg:oauth:2.0:oob

    function TVShowTime() {
        App.Providers.CacheProviderV2.call(this, 'tvst');
        this.restoreToken();
    }

    /*
     * Cache
     */

    // Inherit the Cache Provider
    inherits(TVShowTime, App.Providers.CacheProviderV2);

    // Try to restore token from settings and auth to tvst api
    TVShowTime.prototype.restoreToken = function () {
        var tvstAccessToken = AdvSettings.get('tvstAccessToken');

        if (tvstAccessToken !== '') {
            this.authenticated = true;
            App.vent.trigger('system:tvstAuthenticated');
            this._credentials = {
                token: tvstAccessToken
            };

        } else {
            this.authenticated = false;
            this._credentials = {
                token: ''
            };
        }
    };

    function MergePromises(promises) {
        return Q.all(promises).then(function (results) {
            return _.unique(_.flatten(results));
        });
    }

    TVShowTime.prototype.cache = function (key, ids, func) {
        var self = this;
        return this.fetch(ids).then(function (items) {
            var nonCachedIds = _.difference(ids, _.pluck(items, key));
            return MergePromises([
                Q(items),
                func(nonCachedIds).then(self.store.bind(self, key))
            ]);
        });
    };

    /*
     * TV Show v1
     * METHODS (https://api.tvshowtime.com/doc)
     */

    TVShowTime.prototype.post = function (endpoint, postVariables) {
        var defer = Q.defer();

        postVariables = postVariables || {};

        var requestUri = API_ENDPOINT.clone()
            .segment(endpoint);

        request.post(requestUri.toString(), {
            form: postVariables
        }, function (err, res, body) {
            if (err || !body || res.statusCode >= 400) {
                defer.reject(err);
            } else {
                defer.resolve(body);
            }
        });

        return defer.promise;
    };


    TVShowTime.prototype.authenticate = function (callback) {
        var defer = Q.defer();
        var self = this;

        this
            .post('oauth/device/code', {
                'client_id': API_CLIENT_ID
            })
            .then(function (data) {
                win.debug("TV ShowTime: Authenicate Device Code");
                data = Common.sanitize(JSON.parse(data));
                if (data.result === 'OK') {
                    var activateUri = data.verification_url + '?user_code=' + data.user_code;
                    self.oauthAuthorizing = setInterval(function () {
                        self.post('oauth/access_token', {
                            'client_id': API_CLIENT_ID,
                            'client_secret': API_CLIENT_SECRET,
                            'code': data.device_code
                        }).then(function (data) {
                            data = JSON.parse(data);
                            if (data.result === 'OK') {
                                clearInterval(self.oauthAuthorizing);
                                self._credentials.token = data.access_token;
                                self.authenticated = true;
                                App.vent.trigger('system:tvstAuthenticated');
                                // Store the credentials (hashed ofc)
                                AdvSettings.set('tvstAccessToken', data.access_token);
                            } else
                                resolve(false);
                        });
                    }, (data.interval + 1) * 1000);
                    callback(activateUri);
                    resolve(true);
                } else
                    resolve(false);
            });
        return defer.promise;
    };

    /*
     * General
     * FUNCTIONS
     * 
     */

    TVShowTime.prototype.oauth = {
        authenticate: function () {
            win.debug("TV ShowTime: Authenticate started");
            var defer = Q.defer();
            var self = this;

            this.authorize()
                .then(function (token) {
                    win.debug("TV ShowTime: Authorize token: " + token);
                    App.TVShowTime.post('oauth/access_token', {
                        code: token,
                        client_id: CLIENT_ID,
                        client_secret: CLIENT_SECRET,
                        redirect_uri: REDIRECT_URI,
                        grant_type: 'authorization_code'
                    }).then(function (data) {
                        if (data.access_token && data.expires_in && data.refresh_token) {
                            Settings.tvstToken = data.access_token;
                            AdvSettings.set('tvstToken', data.access_token);
                            AdvSettings.set('tvstTokenRefresh', data.refresh_token);
                            AdvSettings.set('tvstTokenTTL', new Date().valueOf() + data.expires_in * 1000);
                            self.authenticated = true;
                            App.vent.trigger('system:tvstAuthenticated');
                            defer.resolve(true);
                        } else {
                            win.debug("TV ShowTime: Authenicate No Data returned.");
                            AdvSettings.set('tvstToken', '');
                            AdvSettings.set('tvstTokenTTL', '');
                            AdvSettings.set('tvstTokenRefresh', '');
                            defer.reject('TV ShowTime: Sent back no token');
                        }
                    });
                })
                .catch(function (err) {
                    defer.reject(err);
                });
            return defer.promise;
        },
        authorize: function () {
            win.debug("TV ShowTime: Authorize started");
            var defer = Q.defer();
            var url = false;
            var loginWindow;

            var API_URI = 'https://www.tvtime.com';
            var OAUTH_URI = API_URI + '/oauth/device/code?response_type=code&client_id=' + CLIENT_ID; //+ '&state=' + STATE;

            var gui = require('nw.gui');
            win.debug("tvshowtime:OAUTH: " + OAUTH_URI + '&redirect_uri=' + encodeURIComponent(REDIRECT_URI));
            gui.App.addOriginAccessWhitelistEntry(API_URI, 'app', 'host', true);
            //+ '&redirect_uri=' + REDIRECT_URI
            window.loginWindow = gui.Window.open(OAUTH_URI, {
                    position: 'center',
                    focus: true,
                    title: 'TV Show Time API',
                    icon: 'src/app/images/icon.png',
                    resizable: false,
                    width: 600,
                    height: 600
                },
                function (new_win) {
                    // And listeners to new window's focus event
                    new_win.on('loaded', function () {
                        url = this.window.document.URL;
                        win.debug("TV ShowTime: Loaded URL:" + url);
                        /*
                        if (url.indexOf(REDIRECT_URI) === -1 && url.indexOf('oauth/authorize') === -1 && url.indexOf('signin') === -1 && url.indexOf('login?') === -1) {
                            win.debug("TV ShowTime: Found URL Code");
                            if (url.indexOf('authorize/') !== -1) {
                                url = url.split('/');
                                url = url[url.length - 1];
                                new_win.close();
                                win.debug("TV Show Time Authorize Code:" + url);
                            } else {
                                new_win.close();
                                win.debug("TV Show Time Authorize Code Not Found:" + url);
                            }
                        } else {
                            win.debug("TV ShowTime: Found URL Code");
                            url = false;
                        }   */
                    });
                    new_win.on('closed', function () {
                        if (url) {
                            defer.resolve(url);
                        } else {
                            AdvSettings.set('tvstAccessToken', '');
                            AdvSettings.set('tvstTokenTTL', '');
                            AdvSettings.set('tvstTokenRefresh', '');
                            defer.reject('TV ShowTime window closed without exchange token');
                        }
                        this.close(true);
                    });
                }
            );
            return defer.promise;
        },
        checkToken: function () {
            var self = this;
            if (Settings.traktTokenTTL <= new Date().valueOf() && Settings.traktTokenRefresh !== '') {
                win.info('Trakt: refreshing access token');
                this._authenticationPromise = self.post('oauth/token', {
                    refresh_token: Settings.traktTokenRefresh,
                    client_id: CLIENT_ID,
                    client_secret: CLIENT_SECRET,
                    grant_type: 'refresh_token'
                }).then(function (data) {
                    if (data.access_token && data.expires_in && data.refresh_token) {
                        Settings.traktToken = data.access_token;
                        AdvSettings.set('traktToken', data.access_token);
                        AdvSettings.set('traktTokenRefresh', data.refresh_token);
                        AdvSettings.set('traktTokenTTL', new Date().valueOf() + data.expires_in * 1000);
                        self.authenticated = true;
                        App.vent.trigger('system:traktAuthenticated');
                        return true;
                    } else {
                        AdvSettings.set('traktToken', '');
                        AdvSettings.set('traktTokenTTL', '');
                        AdvSettings.set('traktTokenRefresh', '');
                        return false;
                    }
                });
            } else if (Settings.traktToken !== '') {
                this.authenticated = true;
                App.vent.trigger('system:traktAuthenticated');
            }
        },
        revokeAccess: function () {
            win.debug("TV ShowTime: Revoke Access Token");

            var defer = Q.defer();
            var postVariables = "token=" + Settings.traktToken;

            var requestUri = API_ENDPOINT.clone()
                .segment("oauth/revoke");

            request({
                method: 'POST',
                url: requestUri.toString(),
                headers: {
                    'Content-Type': 'application/x-www-form-urlencode',
                    'Authorization': 'Bearer ' + Settings.traktToken,
                    'trakt-api-version': '2',
                    'trakt-api-key': CLIENT_ID
                },
                body: JSON.stringify(postVariables)
            }, function (error, response, body) {
                //win.debug('Status:', response.statusCode);
                //win.debug('Headers:', JSON.stringify(response.headers));
                //win.debug('Response:', body);
                if (error || !body) {
                    defer.reject(error);
                } else if (response.statusCode >= 400) {
                    defer.resolve({});
                } else {
                    defer.resolve(Common.sanitize(JSON.parse(body)));
                }
            });
            return defer.promise;
        }
    }

    TVShowTime.prototype.authenticate = function (callback) {
        var self = this;
        this.post('oauth/device/code', {
                'client_id': CLIENT_ID
            })
            .then(function (data) {
                data = Common.sanitize(JSON.parse(data));
                if (data.result === 'OK') {
                    var activateUri = data.verification_url + '?user_code=' + data.user_code;
                    self.oauthAuthorizing = setInterval(function () {
                        self.post('oauth/access_token', {
                            'client_id': CLIENT_ID,
                            'client_secret': CLIENT_SECRET,
                            'code': data.device_code
                        }).then(function (data) {
                            data = JSON.parse(data);
                            if (data.result === 'OK') {
                                clearInterval(self.oauthAuthorizing);
                                self._credentials.token = data.access_token;
                                self.authenticated = true;
                                App.vent.trigger('system:tvstAuthenticated');
                                // Store the credentials (hashed ofc)
                                AdvSettings.set('tvstAccessToken', data.access_token);
                            }
                        });
                    }, (data.interval + 1) * 1000);
                    callback(activateUri);
                }
            });
    };


    TVShowTime.prototype.disconnect = function (callback) {
        this.authenticated = false;
        AdvSettings.set('tvstAccessToken', '');
        callback();
    };


    TVShowTime.prototype.checkin = function (show) {
        this
            .post('checkin', {
                'show_id': show.tvdb_id,
                'season_number': show.season,
                'number': show.episode,
                'access_token': this._credentials.token
            })
            .then(function (data) {
                //console.log(data);
            });
    };

    TVShowTime.prototype.checkout = function (show) {
        this
            .post('checkout', {
                'show_id': show.tvdb_id,
                'season_number': show.season,
                'number': show.episode,
                'access_token': this._credentials.token
            })
            .then(function (data) {
                //console.log(data);
            });
    };

    function onShowWatched(show, channel) {
        if (App.TVShowTime.authenticated) {
            App.TVShowTime.checkin(show);
        }
    }

    function onShowUnWatched(show, channel) {
        if (App.TVShowTime.authenticated) {
            App.TVShowTime.checkout(show);
        }
    }

    App.vent.on('show:watched', onShowWatched);
    App.vent.on('show:unwatched', onShowUnWatched);

    App.Providers.TVShowTime = TVShowTime;

})(window.App);