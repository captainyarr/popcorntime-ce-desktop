(function (App) {
    'use strict';

    var STREAM_PORT = 21584; // 'PT'!
    var BUFFERING_SIZE = 10 * 1024 * 1024;

    var readTorrent = require('read-torrent');
    var peerflix = require('peerflix');
    var webtorrent = require('webtorrent');
    var path = require('path');
    var crypto = require('crypto');

    var engine = null;
    var preload_engine = null;
    var statsUpdater = null;
    var active = function (wire) {
        return !wire.peerChoking;
    };
    var subtitles = null;
    var hasSubtitles = false;
    var downloadedSubtitles = false;
    var subtitleDownloading = false;
    var serverStarting = false;


    var watchState = function (stateModel) {


         if (engine !== null) {

            var swarm = engine.get(stateModel.get('streamInfo').get('torrent').info);
            var state = 'connecting';

            if ((swarm.downloaded) > BUFFERING_SIZE || swarm.received > BUFFERING_SIZE) { //|| (engine.piecesGot * (swarm !== null ? swarm.lastPieceLength : 0)) > BUFFERING_SIZE){
                state = 'ready';
            } else if (swarm.downloaded || engine.piecesGot > 0 || swarm.received) {
                state = 'downloading';
            } else if (swarm.wires.length) {
                state = 'startingDownload';
            } else if (swarm.received > swarm.downloaded && swarm.received < BUFFERING_SIZE) {
                state = 'validateCache'; //New Cache state
            }

            if (state === 'ready' && (!hasSubtitles || (hasSubtitles && !downloadedSubtitles))) {
                state = 'waitingForSubtitles';
            }

            stateModel.set('state', state);

            if (state !== 'ready') {
                _.delay(watchState, 100, stateModel);
            }

            // This is way too big, should be fixed but basically
            // We only download subtitle once file is ready (to get path)
            // and when the selected lang or default lang is set
            // subtitleDownloading is needed cos this is called every 300ms

            if (stateModel.get('streamInfo').get('torrent').defaultSubtitle && stateModel.get('streamInfo').get('torrent').defaultSubtitle !== 'none' && hasSubtitles && subtitles !== null && swarm.files[0] && !downloadedSubtitles && !subtitleDownloading) {
                subtitleDownloading = true;
                swarm.files = _.sortBy(swarm.files, function (fl) {
                    return fl.length;
                });
                swarm.files.reverse();
                stateModel.get('streamInfo').set('file_index', 0);
                App.vent.trigger('subtitle:download', {
                    url: subtitles[stateModel.get('streamInfo').get('torrent').defaultSubtitle],
                    path: path.join(swarm.path, swarm.files[0].path)
                });
            }

            // No need to download subtitles
            if (!stateModel.get('streamInfo').get('torrent').defaultSubtitle || stateModel.get('streamInfo').get('torrent').defaultSubtitle === 'none') {
                downloadedSubtitles = true;
            }
        }
    };

    var handleTorrent = function (torrent, stateModel) {

        var tmpFilename = torrent.info.infoHash;
        tmpFilename = tmpFilename.replace(/([^a-zA-Z0-9-_])/g, '_'); // +'-'+ (new Date()*1);
        var tmpFile = path.join(App.settings.tmpLocation, tmpFilename);
        subtitles = torrent.subtitle;
        var engineTorrent = null;

        var torrentPeerId = crypto.pseudoRandomBytes(10).toString('hex');

        win.debug('Streaming movie to %s', tmpFile);

        engine = new webtorrent({
            dht: true || parseInt(Settings.dhtLimit, 10), // Enable DHT (default=true), or options object for DHT
            maxConns: parseInt(Settings.connectionLimit, 10) || 100 // Max number of peers to connect to per torrent (default=100)
        });

        engine.add(torrent.info, {
            // dht: true || parseInt(Settings.dhtLimit, 10),   // Enable DHT (default=true), or options object for DHT
            //maxConns: parseInt(Settings.connectionLimit, 10) || 100,     // Max number of peers to connect to per torrent (default=100)
            tracker: true,
            announce: Settings.trackers,
            port: parseInt(Settings.streamPort, 10) || 0,
            tmp: App.settings.tmpLocation,
            path: tmpFile, // we'll have a different file name for each stream also if it's same torrent in same session
            buffer: (1.5 * 1024 * 1024).toString(), // create a buffer on torrent-stream
            index: torrent.file_index,
            name: torrent.info.infoHash,
            id: torrentPeerId
        });

        //get current torrent;
        engineTorrent = engine.get(torrent.info);

        //Create torrent server
        if (engineTorrent !== null) {
            engine.server = engineTorrent.createServer();
            engine.server.port = parseInt(Settings.streamPort, 10) || 0;
        }

        var streamInfo = new App.Model.StreamInfo({
            engine: engine
        });

        //Set stream to default (localhost)
        streamInfo.set('src', Settings.networkUrl);

        engine.piecesGot = 0;
        engine.cachedDownload = 0;

        engineTorrent.on('ready', function () {
            win.debug("torrent:ready");
            App.vent.trigger('stream:server', stateModel);
        });

        engineTorrent.on('metadata', function () {
            win.debug("torrent:metadata");

            var streamInfo = stateModel.get('streamInfo');

            //Set stream to default (localhost)
            streamInfo.set('src', Settings.networkUrl);

            var size = 0;
            var maxSize = 0;
            var file_index = 0;

            if (streamInfo.get('file_index')) {
                size = this.files[streamInfo.get('file_index')].length; // torrent with multi-files
            } else {
                this.files.forEach(function (file, index) { // pct torrent
                    win.debug("file.length: " + file.length);
                    size += file.length || 0;
                    if (file.length >= maxSize) {
                        file_index = index;
                        maxSize = file.length;
                    }
                });
            }

            //Set file_index to the largest file in torrent
            streamInfo.set('file_index', file_index);

            //Set total torrent size 
            streamInfo.set('size', size);
        });

        // Fix for loading modal
        streamInfo.updateStats(engine);
        streamInfo.set('torrent', torrent);
        streamInfo.set('title', torrent.title);
        streamInfo.set('player', torrent.device);
        streamInfo.set('file_index', 0);

        statsUpdater = setInterval(_.bind(streamInfo.updateStats, streamInfo, engine), 1000);
        stateModel.set('streamInfo', streamInfo);
        stateModel.set('state', 'connecting');
        watchState(stateModel);

        App.vent.on('stream:server', function (stateModel) {

            if (engine.server.listening == false && serverStarting == false) {
                win.debug("stream:server");
                if (stateModel.get('streamInfo').get('player') &&
                    stateModel.get('streamInfo').get('player').get('typeFamily') == 'external') {
                    var ips = [],
                        ifaces = require('os').networkInterfaces();
                    for (var dev in ifaces) {
                        ifaces[dev].forEach(function (details) {
                            if (!details.internal) {
                                ips.push(details.address);
                            }
                        });
                    }
                    var deviceIp = Settings.networkUrl;
                    win.info('Device IP: ' + deviceIp);
                    win.info('Available IPs: ' + JSON.stringify(ips));
                    var srcIp = _getClosestIP(ips, deviceIp);
                    win.info('%s picked for external playback', srcIp);
                    Settings.networkUrl = Settings.networkUrl.replace('127.0.0.1', srcIp);
                }
                if (stateModel.get('streamInfo').get('player') &&
                    stateModel.get('streamInfo').get('player').get('typeFamily') == 'internal') {
                    Settings.networkUrl = '127.0.0.1';
                }
                engine.server.listen(engine.server.port, Settings.networkUrl);
                serverStarting = true;
            }
        });

        // Supports both IPv4 and IPv6 comparison
        var _sequentialPartsInCommon = function (ip1, ip2) {
            var separator = (ip1.indexOf('.') > -1) ? '.' : ':';
            var ip2Parts = ip2.split(separator),
                partsCount = 0;
            ip1.split(separator).every(function (ip1Part, idx) {
                var isEqual = (ip1Part === ip2Parts[idx]);
                if (isEqual) {
                    ++partsCount;
                    return isEqual;
                }
            });
            return partsCount;
        };

        var _getClosestIP = function (ips, targetIp) {
            return _.max(ips, function (ip) {
                return _sequentialPartsInCommon(ip, targetIp);
            });
        };

        var checkReady = function () {
            win.debug("engine:checkready");
            if (stateModel.get('state') === 'ready') {
                if (stateModel.get('state') === 'ready' && stateModel.get('streamInfo').get('player') && stateModel.get('streamInfo').get('player').id !== 'local') {
                    stateModel.set('state', 'playingExternally');
                }
                streamInfo.set(torrent);

                // we need subtitle in the player
                streamInfo.set('subtitle', subtitles !== null ? subtitles : torrent.subtitle);

                // clear downloaded so change:downloaded gets triggered for the first time
                streamInfo.set('downloaded', 0);

                if (AdvSettings.get('chosenPlayer') != 'html5') {
                    App.vent.trigger('stream:ready', streamInfo);
                    stateModel.destroy();
                }
            }
        };

        App.vent.on('subtitle:downloaded', function (sub) {
            if (sub) {
                stateModel.get('streamInfo').set('subFile', sub);
                App.vent.trigger('subtitle:convert', {
                    path: sub,
                    language: torrent.defaultSubtitle
                }, function (err, res) {
                    if (err) {
                        win.error('error converting subtitles', err);
                        stateModel.get('streamInfo').set('subFile', null);
                    } else {
                        App.Subtitles.Server.start(res);
                    }
                });
            }
            downloadedSubtitles = true;
        });

        engine.server.on('listening', function () {
            if (engine) {
                win.debug("engine:listening");
                win.debug(`Server running at ` + engine.server.address().address + ":" + engine.server.address().port);
                engine.server.port = engine.server.address().port;
                
                //streamInfo.set('src', 'http://127.0.0.1:' + engine.server.address().port + '/');
                streamInfo.set('src', 'http://' + engine.server.address().address + ':' + engine.server.port + "/" + streamInfo.get('file_index'));
                streamInfo.set('type', 'video/mp4');
                stateModel.on('change:state', checkReady);

                if (AdvSettings.get('chosenPlayer') == 'html5') {
                    $('.vjs-play-control').click();

                    gui.Shell.openExternal('http://127.0.0.1:' + engine.server.port + "/" + streamInfo.get('file_index'));
                    //Mousetrap.trigger('u'); //stream to browser
                } else {
                    checkReady();
                }
            }
        });


        engine.on('uninterested', function () {
            if (engine) {
                engine.pause();
            }

        });

        engine.on('interested', function () {
            if (engine) {
                engine.resume();
            }
        });

    };


    var Preload = {
        start: function (model) {

            if (Streamer.currentTorrent && model.get('torrent') === Streamer.currentTorrent.get('torrent')) {
                return;
            }
            this.currentTorrent = model;

            win.debug('Preloading model:', model.get('title'));
            var torrent_url = model.get('torrent');

            readTorrent(torrent_url, function (err, torrent) {

                win.debug('Preloading torrent:', torrent.name);
                var tmpFilename = torrent.infoHash;
                tmpFilename = tmpFilename.replace(/([^a-zA-Z0-9-_])/g, '_'); // +'-'+ (new Date()*1);
                var tmpFile = path.join(App.settings.tmpLocation, tmpFilename);
                subtitles = torrent.subtitle;

                var torrentPeerId = crypto.pseudoRandomBytes(10).toString('hex');

                win.debug('Preloading movie to %s', tmpFile);

                preload_engine = peerflix(torrent_url, {
                    connections: parseInt(Settings.connectionLimit, 10) || 100, // Max amount of peers to be connected to.
                    dht: parseInt(Settings.dhtLimit, 10) || 50,
                    port: 0,
                    tmp: App.settings.tmpLocation,
                    path: tmpFile, // we'll have a different file name for each stream also if it's same torrent in same session
                    index: torrent.file_index,
                    id: torrentPeerId
                });

            });


        },

        stop: function () {

            if (preload_engine) {
                if (preload_engine.server._handle) {
                    preload_engine.server.close();
                }
                preload_engine.destroy();
                win.info('Preloading stopped');
            }

            preload_engine = null;
        }
    };


    var Streamer = {
        start: function (model) {
            var torrentUrl = model.get('torrent');
            var torrent_read = false;
            if (model.get('torrent_read')) {
                torrent_read = true;
            }

            var stateModel = new Backbone.Model({
                state: 'connecting',
                backdrop: model.get('backdrop'),
                title: '',
                player: '',
                show_controls: false
            });
            App.vent.trigger('stream:started', stateModel);

            if (engine) {
                Streamer.stop();
            }

            this.stop_ = false;
            var that = this;
            var doTorrent = function (err, torrent) {
                // Return if streaming was cancelled while loading torrent
                if (that.stop_) {
                    return;
                }
                if (err) {
                    win.error('Streamer:', err.message);
                    App.vent.trigger('stream:stop');
                    App.vent.trigger('player:close');
                } else {
                    // did we need to extract subtitle ?
                    var extractSubtitle = model.get('extract_subtitle');

                    var getSubtitles = function (data) {
                        win.debug('Subtitles data request:', data);

                        var subtitleProvider = App.Config.getProvider('tvshowsubtitle');

                        subtitleProvider.fetch(data).then(function (subs) {
                            if (subs && Object.keys(subs).length > 0) {
                                subtitles = subs;
                                win.info(Object.keys(subs).length + ' subtitles found');
                            } else {
                                subtitles = null;
                                hasSubtitles = true;
                                downloadedSubtitles = true;
                                win.warn('No subtitles returned');
                            }
                            hasSubtitles = true;
                        }).catch(function (err) {
                            subtitles = null;
                            hasSubtitles = true;
                            downloadedSubtitles = true;
                            win.error('subtitleProvider.fetch()', err);
                        });
                    };

                    var handleTorrent_fnc = function () {
                        // TODO: We should passe the movie / tvshow imdbid instead
                        // and read from the player
                        // so from there we can use the previous next etc
                        // and use all available function with the right imdb id

                        var torrentInfo = {
                            info: torrent,
                            subtitle: model.get('subtitle'),
                            defaultSubtitle: model.get('defaultSubtitle'),
                            title: title,
                            tvdb_id: model.get('tvdb_id'),
                            imdb_id: model.get('imdb_id'),
                            episode_id: model.get('episode_id'),
                            episode: model.get('episode'),
                            season: model.get('season'),
                            file_index: model.get('file_index'),
                            quality: model.get('quality'),
                            device: model.get('device'),
                            cover: model.get('cover'),
                            episodes: model.get('episodes'),
                            auto_play: model.get('auto_play'),
                            auto_id: model.get('auto_id'),
                            auto_play_data: model.get('auto_play_data')
                        };

                        handleTorrent(torrentInfo, stateModel);
                    };

                    if (typeof extractSubtitle === 'object') {
                        extractSubtitle.filename = torrent.name;

                        var subskw = [];
                        for (var key in App.Localization.langcodes) {
                            if (App.Localization.langcodes[key].keywords !== undefined) {
                                subskw[key] = App.Localization.langcodes[key].keywords;
                            }
                        }
                        extractSubtitle.keywords = subskw;

                        getSubtitles(extractSubtitle);
                    }

                    if (model.get('type') === 'movie') {
                        hasSubtitles = true;
                    }

                    //Try get subtitles for custom torrents
                    var title = model.get('title');

                    if (!title) { //From ctrl+v magnet or drag torrent
                        for (var f in torrent.files) {
                            torrent.files[f].index = f;
                            if (isVideo(torrent.files[f].name)) {
                                torrent.files[f].display = true;
                            } else {
                                torrent.files[f].display = false;
                            }
                        }
                        if (torrent.files && torrent.files.length > 0 && !model.get('file_index') && model.get('file_index') !== 0) {
                            torrent.files = $.grep(torrent.files, function (n) {
                                return (n);
                            });
                            var fileModel = new Backbone.Model({
                                torrent: torrent,
                                files: torrent.files
                            });
                            App.vent.trigger('system:openFileSelector', fileModel);
                        } else {
                            model.set('defaultSubtitle', Settings.subtitle_language);
                            var sub_data = {};
                            if (torrent.name) { // sometimes magnets don't have names for some reason
                                var torrentMetadata;
                                if (torrent.info && torrent.info.name) {
                                    torrentMetadata = torrent.info.name.toString();
                                }
                                Common.matchTorrent(torrent.name, torrentMetadata)
                                    .then(function (res) {
                                        if (res.error) {
                                            win.warn(res.error);
                                            sub_data.filename = res.filename;
                                            title = res.filename;
                                            getSubtitles(sub_data);
                                            handleTorrent_fnc();
                                        } else {
                                            switch (res.type) {
                                            case 'movie':
                                                $('.loading-background').css('background-image', 'url(' + res.movie.image + ')');
                                                sub_data.imdbid = res.movie.imdbid;
                                                model.set('quality', res.quality);
                                                model.set('imdb_id', sub_data.imdbid);
                                                title = res.movie.title;
                                                break;
                                            case 'episode':
                                                $('.loading-background').css('background-image', 'url(' + res.show.episode.image + ')');
                                                sub_data.imdbid = res.show.imdbid;
                                                sub_data.season = res.show.episode.season;
                                                sub_data.episode = res.show.episode.episode;
                                                model.set('quality', res.quality);
                                                model.set('tvdb_id', res.show.tvdbid);
                                                model.set('episode_id', res.show.episode.tvdbid);
                                                model.set('imdb_id', res.show.imdbid);
                                                model.set('episode', sub_data.episode);
                                                model.set('season', sub_data.season);
                                                title = res.show.title + ' - ' + i18n.__('Season %s', res.show.episode.season) + ', ' + i18n.__('Episode %s', res.show.episode.episode) + ' - ' + res.show.episode.title;
                                                break;
                                            default:
                                                sub_data.filename = res.filename;
                                            }
                                            getSubtitles(sub_data);
                                            handleTorrent_fnc();
                                        }
                                    })
                                    .catch(function (err) {
                                        title = $.trim(torrent.name.replace('[rartv]', '').replace('[PublicHD]', '').replace('[ettv]', '').replace('[eztv]', '')).replace(/[\s]/g, '.');
                                        sub_data.filename = title;
                                        win.error('An error occured while trying to get metadata and subtitles', err);
                                        getSubtitles(sub_data);
                                        handleTorrent_fnc(); //try and force play
                                    });

                            } else {
                                hasSubtitles = true;
                                handleTorrent_fnc();
                            }
                        }
                    } else {
                        handleTorrent_fnc();
                    }
                }
            };
            // HACK(xaiki): we need to go through parse torrent
            // if we have a torrent and not an http source, this
            // is fragile as shit.
            if (typeof (torrentUrl) === 'string' && torrentUrl.substring(0, 7) === 'http://' && !torrentUrl.match('\\.torrent') && !torrentUrl.match('\\.php?')) {
                return Streamer.startStream(model, torrentUrl, stateModel);
            } else if (!torrent_read) {
                readTorrent(torrentUrl, doTorrent); //preload torrent
            } else {
                doTorrent(null, model.get('torrent')); //normal torrent
            }


        },


        startStream: function (model, url, stateModel) {
            var si = new App.Model.StreamInfo({});
            si.set('title', url);
            si.set('subtitle', {});
            si.set('type', 'video/mp4');
            si.set('device', model.get('device'));

            si.set('src', [{
                type: 'video/mp4',
                src: url
            }]);
            App.vent.trigger('stream:ready', si);
        },

        stop: function () {
            this.stop_ = true;
            if (engine) {
                // update ratio
                AdvSettings.set('totalDownloaded', Settings.totalDownloaded + engine.downloaded);
                AdvSettings.set('totalUploaded', Settings.totalUploaded + engine.uploaded);

                if (engine.server._handle !== undefined && engine.server._handle) {
                    engine.server.close();
                }
                serverStarting = false;
                engine.destroy();
            }
            clearInterval(statsUpdater);
            statsUpdater = null;
            engine = null;
            subtitles = null; // reset subtitles to make sure they will not be used in next session.
            hasSubtitles = false;
            downloadedSubtitles = false;
            subtitleDownloading = false;
            App.vent.off('subtitle:downloaded');
            win.info('Streaming cancelled');
        }


    };

    App.vent.on('preload:start', Preload.start);
    App.vent.on('preload:stop', Preload.stop);
    App.vent.on('stream:start', Streamer.start);
    App.vent.on('stream:stop', Streamer.stop);
    App.vent.on('stream:server', Streamer.startServer);

})(window.App);