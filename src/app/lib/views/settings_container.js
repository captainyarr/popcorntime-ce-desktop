(function(App) {
    'use strict';
    var clipboard = gui.Clipboard.get(),
        AdmZip = require('adm-zip'),
        fdialogs = require('node-webkit-fdialogs'),
        waitComplete,
        oldTmpLocation,
        that;

    var Settings = Backbone.Marionette.ItemView.extend({
        template: '#settings-container-tpl',
        className: 'settings-container-contain',

        ui: {
            success_alert: '.success_alert',
            fakeTempDir: '#faketmpLocation',
            tempDir: '#tmpLocation'
        },

        events: {
            'click .keyboard': 'showKeyboard',
            'click .help': 'showHelp',
            'click .close-icon': 'closeSettings',
            'change select,input': 'saveSetting',
            'contextmenu input': 'rightclick_field',
            'click .flush-bookmarks': 'flushBookmarks',
            'click .flush-databases': 'flushAllDatabase',
            'click .flush-subtitles': 'flushAllSubtitles',
            'click #faketmpLocation': 'showCacheDirectoryDialog',
            'click .default-settings': 'resetSettings',
            'click .open-tmp-folder': 'openTmpFolder',
            'click .open-database-folder': 'openDatabaseFolder',
            'click .export-database': 'exportDatabase',
            'click .import-database': 'importDatabase',
            'click #authTrakt': 'connectTrakt',
            'click #unauthTrakt': 'disconnectTrakt',
            'click #connect-with-tvst': 'connectWithTvst',
            'click #disconnect-tvst': 'disconnectTvst',
            'click .connect-opensubtitles': 'connectWithOpensubtitles',
            'click #disconnect-opensubtitles': 'disconnectOpenSubtitles',
            'click .reset-ytsAPI': 'resetMovieAPI',
            'click .reset-tvAPI': 'resetTVShowAPI',
            'change #tmpLocation': 'updateCacheDirectory',
            'click #syncTrakt': 'syncTrakt',
            'click .qr-code': 'generateQRcode',
            'click #qrcode-overlay': 'closeModal',
            'click #qrcode-close': 'closeModal',
            'click #reg-Magnet': 'regMagnet',
            'click #reg-Torrent': 'regTorrent',
        },

        onShow: function() {
            that = this;
            this.render();

            AdvSettings.set('ipAddress', this.getIPAddress());

            $('.filter-bar').hide();
            $('#movie-detail').hide();
            $('#header').addClass('header-shadow');
            $('.tooltipped').tooltip({
                delay: {
                    'show': 800,
                    'hide': 100
                }
            });

            Mousetrap.bind('backspace', function(e) {
                App.vent.trigger('settings:close');
            });
        },

        onRender: function() {
            if (App.settings.showAdvancedSettings) {
                $('.advanced').css('display', 'flex');
            }
            oldTmpLocation = $('#faketmpLocation').val();
        },

        rightclick_field: function(e) {
            e.preventDefault();
            var menu = new this.context_Menu(i18n.__('Cut'), i18n.__('Copy'), i18n.__('Paste'), e.target.id);
            menu.popup(e.originalEvent.x, e.originalEvent.y);
        },

        context_Menu: function(cutLabel, copyLabel, pasteLabel, field) {
            var gui = require('nw.gui'),
                menu = new gui.Menu(),

                cut = new gui.MenuItem({
                    label: cutLabel || 'Cut',
                    click: function() {
                        document.execCommand('cut');
                    }
                }),

                copy = new gui.MenuItem({
                    label: copyLabel || 'Copy',
                    click: function() {
                        document.execCommand('copy');
                    }
                }),

                paste = new gui.MenuItem({
                    label: pasteLabel || 'Paste',
                    click: function() {
                        var text = clipboard.get('text');
                        $('#' + field).val(text);
                    }
                });

            menu.append(cut);
            menu.append(copy);
            menu.append(paste);

            return menu;
        },

        onDestroy: function() {
            Mousetrap.bind('backspace', function(e) {
                App.vent.trigger('show:closeDetail');
                App.vent.trigger('movie:closeDetail');
            });
            $('.filter-bar').show();
            $('#header').removeClass('header-shadow');
            $('#movie-detail').show();
            clearInterval(waitComplete);
        },

        closeSettings: function() {
            App.vent.trigger('settings:close');
        },

        resetMovieAPI: function() {
            var value = App.settings['defaultMovieAPI'].slice(0);

            App.settings['ytsAPI'] = value;

            //save to db
            App.db.writeSetting({
                key: 'ytsAPI',
                value: value
            }).then(function() {
                that.ui.success_alert.show().delay(3000).fadeOut(400);
            });

            that.syncSetting('ytsAPI', value);
        },

        resetTVShowAPI: function() {
            var value = App.settings['defaultTvAPI'].slice(0);

            App.settings['tvAPI'] = value;

            //save to db
            App.db.writeSetting({
                key: 'tvAPI',
                value: value
            }).then(function() {
                that.ui.success_alert.show().delay(3000).fadeOut(400);
            });

            that.syncSetting('tvAPI', value);
        },

        generateQRcode: function() {
            var qrcodecanvus = document.getElementById('qrcode'),
                QRCodeInfo = {
                    ip: AdvSettings.get('ipAddress'),
                    port: $('#httpApiPort').val(),
                    user: $('#httpApiUsername').val(),
                    pass: $('#httpApiPassword').val()
                };
            $('#qrcode').qrcode({
                'text': JSON.stringify(QRCodeInfo)
            });
            $('#qrcode-modal, #qrcode-overlay').fadeIn(500);
        },

        closeModal: function() {
            $('#qrcode-modal, #qrcode-overlay').fadeOut(500);
        },

        showHelp: function() {
            App.vent.trigger('help:toggle');
        },

        showKeyboard: function() {
            App.vent.trigger('keyboard:toggle');
        },

        saveSetting: function(e) {
            var value = false,
                apiDataChanged = false,
                tmpLocationChanged = false,
                field = $(e.currentTarget),
                data = {};
    
            let option = field.attr('name');

            switch (option) {
                case 'httpApiPort':
                    apiDataChanged = true;
                    value = parseInt(field.val());
                    break;
                case 'ytsAPI':
                    value = field.val();
                    if (value.substr(-1) !== '/') {
                        value += '/';
                    }
                    if (value.substr(0, 8) !== 'https://' && value.substr(0, 7) !== 'http://') {
                        value = 'http://' + value;
                    }

                    App.settings['ytsAPI'] = App.settings['defaultMovieAPI'].slice(0);

                    App.settings['ytsAPI'].unshift({
                        url: value,
                        strictSSL: value.substr(0, 8) === 'https://'
                    });

                    value = App.settings['ytsAPI'];
                    break;
                case 'tvAPI':
                    value = field.val();
                    if (value.substr(-1) !== '/') {
                        value += '/';
                    }
                    if (value.substr(0, 8) !== 'https://' && value.substr(0, 7) !== 'http://') {
                        value = 'http://' + value;
                    }

                    App.settings['tvAPI'] = App.settings['defaultTvAPI'].slice(0);

                    App.settings['tvAPI'].unshift({
                        url: value,
                        strictSSL: value.substr(0, 8) === 'https://'
                    });

                    value = App.settings['tvAPI'];
                    break;

                case 'opensubtitlesUsername':
                    value = field.val();
                    break;
                case 'opensubtitlesPassword':
                    value = field.val(); //require('crypto').createHash('md5').update(field.val()).digest('hex');
                    break;
                case 'subtitle_size':
                case 'stream_browser':
                    if ($('option:selected', field).val() === 'Torrent Link') {
                        this.regTorrent();
                    } else if ($('option:selected', field).val() === 'Magnet Link') {
                        this.regMagnet();
                    } else {
                        this.remBrowStre();
                    }
                case 'chosenPlayer':
                case 'tv_detail_jump_to':
                case 'subtitle_language':
                case 'subtitle_decoration':
                case 'bufferingSize':
                case 'movies_quality':
                case 'subtitle_font':
                case 'start_screen':
                    if ($('option:selected', field).val() === 'Last Open') {
                        AdvSettings.set('lastTab', App.currentview);
                    }
                /* falls through */
                case 'watchedCovers':
                case 'theme':
                    value = $('option:selected', field).val();
                    break;
                case 'language':
                    value = $('option:selected', field).val();
                    i18n.setLocale(value);
                    break;
                case 'moviesShowQuality':
                case 'deleteTmpOnClose':
                case 'coversShowRating':
                case 'translateSynopsis':
                case 'showAdvancedSettings':
                case 'alwaysOnTop':
                case 'traktSyncOnStart':
                case 'traktPlayback':
                case 'playNextEpisodeAuto':
                case 'automaticUpdating':
                case 'events':
                case 'alwaysFullscreen':
                case 'showPassword':
                case 'minimizeToTray':
                case 'bigPicture':
                case 'activateTorrentCollection':
                case 'activateAutoplay':
                case 'activateRandomize':
                    value = field.is(':checked');
                    break;
                case 'analytics':
                    value = field.is(':checked');
                    window['ga-disable-' + AdvSettings.get('gaCode')] = !value;
                    break;
                case 'httpApiUsername':
                case 'httpApiPassword':
                    apiDataChanged = true;
                    value = field.val();
                    break;
                case 'connectionLimit':
                case 'dhtLimit':
                case 'streamPort':
                case 'subtitle_color':
                    value = field.val();
                    break;
                case 'tmpLocation':
                    tmpLocationChanged = true;
                    value = path.join(field.val(), 'Popcorn-Time');
                    break;
                case 'activateVpn':
                    $('.vpn-connect').toggle();
                    value = field.is(':checked');
                    break;
                default:
                    win.warn('Setting not defined: ' + option);
            }

            if (field.attr('name') != 'opensubtitlesPassword') {
                win.info('Setting changed: ' + option + ' - ' + value);
            } else
                win.info('Setting changed: ' + option);

            // update active session
            App.settings[option] = value;

            if (apiDataChanged) {
                App.vent.trigger('initHttpApi');
            }

            // move tmp folder safely
            if (tmpLocationChanged) {
                value = that.moveTmpLocation(value);
            }

            //Track Setting changed
            ga('send', {
                hitType: 'event',
                eventCategory: 'Settings',
                eventAction: 'ChangeSetting',
                eventLabel: "changesetting_"+ option
            });

            //save to db
            App.db.writeSetting({
                key: option,
                value: value
            }).then(function() {
                that.ui.success_alert.show().delay(3000).fadeOut(400);
            });

            that.syncSetting(option, value);
        },

        syncSetting: function(setting, value) {
            switch (setting) {
                case 'coversShowRating':
                    if (value) {
                        $('.rating').show();
                    } else {
                        $('.rating').hide();
                    }
                    break;
                case 'moviesShowQuality':
                    if (value) {
                        $('.quality').show();
                    } else {
                        $('.quality').hide();
                    }
                    break;
                case 'showAdvancedSettings':
                    if (value) {
                        $('.advanced').css('display', 'flex');
                    } else {
                        $('.advanced').css('display', 'none');
                    }
                    break;
                case 'language':
                case 'watchedCovers':
                    App.vent.trigger('movies:list');
                    App.vent.trigger('settings:show');
                    break;
                case 'alwaysOnTop':
                    win.setAlwaysOnTop(value);
                    break;
                case 'theme':
                    $('link#theme').attr('href', 'themes/' + value + '.css');
                    App.vent.trigger('updatePostersSizeStylesheet');
                    break;
                case 'start_screen':
                    AdvSettings.set('startScreen', value);
                    break;
                case 'events':
                    if ($('.events').css('display') === 'none') {
                        $('.events').css('display', 'block');
                    } else {
                        $('.events').css('display', 'none');
                    }
                    break;
                case 'activateTorrentCollection':
                    if ($('#torrent_col').css('display') === 'none') {
                        $('#torrent_col').css('display', 'block');
                    } else {
                        $('#torrent_col').css('display', 'none');
                        App.vent.trigger('torrentCollection:close');
                    }
                    break;
                case 'activateRandomize':
                case 'movies_quality':
                case 'translateSynopsis':
                    App.Providers.delete('Yts');
                    opensubtitlesPassword
                    App.vent.trigger('movies:list');
                    App.vent.trigger('settings:show');
                    break;
                case 'tvAPI':
                    App.Providers.delete('TVApi');
                    App.vent.trigger('movies:list');
                    App.vent.trigger('settings:show');
                    break;
                case 'ytsAPI':
                    App.Providers.delete('ytsAPI');
                    App.vent.trigger('movies:list');
                    App.vent.trigger('settings:show');
                    break;
                case 'opensubtitles':
                    App.vent.trigger('movies:list');
                    App.vent.trigger('settings:show');
                    break;
                case 'bigPicture':
                    if (!ScreenResolution.SD) {
                        if (App.settings.bigPicture) {
                            win.maximize();
                            AdvSettings.set('noBigPicture', win.zoomLevel);
                            var zoom = ScreenResolution.HD ? 2 : 3;
                            win.zoomLevel = zoom;
                        } else {
                            win.zoomLevel = AdvSettings.get('noBigPicture') || 0;
                        }
                    } else {
                        AdvSettings.set('bigPicture', false);
                        win.info('Setting changed: bigPicture - true');
                        $('input#bigPicture.settings-checkbox').attr('checked', false);
                        $('.notification_alert').show().text(i18n.__('Big Picture Mode is unavailable on your current screen resolution')).delay(2500).fadeOut(400);
                    }
                    break;
                case 'showPassword':
                    {
                        var x = document.getElementById("opensubtitlesPassword");
                        if (x.type === "password") {
                            x.type = "text";
                        } else {
                            x.type = "password";
                        }
                    }
                    break;
                default:
            }
        },

        connectTrakt: function(e) {
            if (AdvSettings.get('traktTokenRefresh') !== '') {
                return;
            }

            $('#authTrakt > i').css('visibility', 'hidden');
            $('.loading-spinner').show();

            App.Trakt.oauth.authenticate()
                .then(function(valid) {
                    if (valid) {
                        $('.loading-spinner').hide();
                        that.render();
                    } else {
                        $('.loading-spinner').hide();
                        $('#authTrakt > i').css('visibility', 'visible');
                    }
                }).catch(function(err) {
                    win.debug('Trakt', err);
                    $('#authTrakt > i').css('visibility', 'visible');
                    $('.loading-spinner').hide();
                });
        },

        disconnectTrakt: function(e) {
            App.settings['traktToken'] = '';
            App.settings['traktTokenRefresh'] = '';
            App.settings['traktTokenTTL'] = '';
            App.Trakt.authenticated = false;

            App.db.writeSetting({
                key: 'traktToken',
                value: ''
            }).then(function() {
                return App.db.writeSetting({
                    key: 'traktTokenRefresh',
                    value: ''
                });
            }).then(function() {
                return App.db.writeSetting({
                    key: 'traktTokenTTL',
                    value: ''
                });
            }).then(function() {
                that.ui.success_alert.show().delay(3000).fadeOut(400);
            });

            _.defer(function() {
                App.Trakt = App.Providers.get('Trakttv');
                that.render();
            });
        },

        connectWithTvst: function() {
            var self = this;

            $('#connect-with-tvst > i').css('visibility', 'hidden');
            $('.tvst-loading-spinner').show();

            App.vent.on('system:tvstAuthenticated', function() {
                window.loginWindow.close();
                $('.tvst-loading-spinner').hide();
                self.render();
            });
            App.TVShowTime.authenticate(function(activateUri) {
                var gui = require('nw.gui');
                gui.App.addOriginAccessWhitelistEntry(activateUri, 'app', 'host', true);
                window.loginWindow = gui.Window.open(activateUri, {
                    position: 'center',
                    focus: true,
                    title: 'TVShow Time',
                    icon: 'src/app/images/icon.png',
                    toolbar: false,
                    resizable: false,
                    width: 600,
                    height: 600
                });

                window.loginWindow.on('closed', function() {
                    $('.tvst-loading-spinner').hide();
                    $('#connect-with-tvst > i').css('visibility', 'visible');
                });

            });
        },

        disconnectTvst: function() {
            var self = this;
            App.OpenSubtitlesMovies.disconnect(function() {
                self.render();
            });
        },

        connectWithOpensubtitles: function() {

            $('.loading-spinner').show();

            var username = App.settings.opensubtitlesUsername;
            var password = require('crypto').createHash('md5').update(App.settings.opensubtitlesPassword).digest('hex');

            App.OpenSubtitlesMovies.authenticate(username, password).then(function(value) {
                if (value == false) {
                    that.alertMessageFailed(i18n.__("Incorrect Username or Password"));
                }
                if (App.settings.analytics) {
                    ga('send', {
                        hitType: 'event',
                        eventCategory: 'Settings',
                        eventAction: 'OpenSubtitles Login Incorrect',
                        eventLabel: 'OpenSubtitles Login Incorrect'
                    });
                }
                return value;
            }).then(function(value) {
                if (value == true) {
                    App.db.writeSetting({
                        key: 'opensubtitlesUsername',
                        value: username
                    }).then(function() {
                        return App.db.writeSetting({
                            key: 'opensubtitlesPassword',
                            value: password
                        });
                    });
                    that.ui.success_alert.show().delay(3000).fadeOut(400);
                    that.syncSetting('opensubtitles', "");
                    //GA: Player Launched
                    ga('send', {
                        hitType: 'event',
                        eventCategory: 'Settings',
                        eventAction: 'OpenSubtitles Login Successful',
                        eventLabel: 'OpenSubtitles Login Successful'
                    });
                    self.render();
                }
            });
        },

        disconnectOpenSubtitles: function(e) {
            var self = this;

            App.settings['opensubtitlesUsername'] = '';
            App.settings['opensubtitlesPassword'] = '';

            App.db.writeSetting({
                key: 'opensubtitlesUsername',
                value: ''
            }).then(function() {
                return App.db.writeSetting({
                    key: 'opensubtitlesPassword',
                    value: ''
                });
            }).then(function() {
                that.ui.success_alert.show().delay(3000).fadeOut(400);
                that.syncSetting('opensubtitles', "");
            });

            //GA: Player Launched
            ga('send', {
                hitType: 'event',
                eventCategory: 'Settings',
                eventAction: 'OpenSubtitles Disconnect',
                eventLabel: 'OpenSubtitles Disconnect'
            });

            App.OpenSubtitlesMovies.disconnect(function() {
                self.render();
            });


        },

        flushBookmarks: function(e) {
            var btn = $(e.currentTarget);

            if (!this.areYouSure(btn, i18n.__('Flushing bookmarks...'))) {
                return;
            }

            this.alertMessageWait(i18n.__('We are flushing your database'));

            Database.deleteBookmarks()
                .then(function() {
                    that.alertMessageSuccess(true);
                });
        },

        resetSettings: function(e) {
            var btn = $(e.currentTarget);

            if (!this.areYouSure(btn, i18n.__('Resetting...'))) {
                return;
            }

            this.alertMessageWait(i18n.__('We are resetting the settings'));

            Database.resetSettings()
                .then(function() {
                    AdvSettings.set('disclaimerAccepted', 1);
                    that.alertMessageSuccess(true);
                });
        },

        flushAllDatabase: function(e) {
            var btn = $(e.currentTarget);

            if (!this.areYouSure(btn, i18n.__('Flushing...'))) {
                return;
            }

            this.alertMessageWait(i18n.__('We are flushing your databases'));

            Database.deleteDatabases()
                .then(function() {
                    deleteCookies();
                    that.alertMessageSuccess(true);
                });
        },

        flushAllSubtitles: function(e) {
            var btn = $(e.currentTarget);

            if (!this.areYouSure(btn, i18n.__('Flushing...'))) {
                return;
            }

            this.alertMessageWait(i18n.__('We are flushing your subtitle cache'));

            var cache = new App.Cache('subtitle');
            cache.flushTable()
                .then(function() {

                    that.alertMessageSuccess(false, btn, i18n.__('Flush subtitles cache'), i18n.__('Subtitle cache deleted'));

                });
        },

        restartApplication: function() {
            App.vent.trigger('restartPopcornTime');
        },

        showCacheDirectoryDialog: function() {
            this.ui.tempDir.click();
        },

        openTmpFolder: function() {
            win.debug('Opening: ' + App.settings['tmpLocation']);
            gui.Shell.openItem(App.settings['tmpLocation']);
        },

        moveTmpLocation: function(location) {
            try {
                if (!fs.existsSync(location)) {
                    fs.mkdirSync(location);
                }
                if (App.settings['deleteTmpOnClose']) {
                    deleteFolder(oldTmpLocation);
                } else {
                    $('.notification_alert').show().text(i18n.__('You should save the content of the old directory, then delete it')).delay(5000).fadeOut(400);
                    gui.Shell.openItem(oldTmpLocation);
                }
                return location;
            } catch (err) {
                if (err.code !== 'EEXIST') {
                    $('.notification_alert').show().text(i18n.__('Unable to create new Download directory')).delay(5000).fadeOut(400);
                    return this.resetTmpLocation();
                }
            }
        },

        resetTmpLocation: function() {
            var value = path.join(os.tmpdir(), 'Popcorn-Time');
            $('#tmpLocation').val(value);
            this.render();
            return value;
        },

        openDatabaseFolder: function() {
            win.debug('Opening: ' + App.settings['databaseLocation']);
            gui.Shell.openItem(App.settings['databaseLocation']);
        },

        exportDatabase: function(e) {
            var zip = new AdmZip();
            var btn = $(e.currentTarget);
            var databaseFiles = fs.readdirSync(App.settings['databaseLocation']);

            databaseFiles.forEach(function(entry) {
                zip.addLocalFile(App.settings['databaseLocation'] + '/' + entry);
            });

            fdialogs.saveFile(zip.toBuffer(), function(err, path) {
                that.alertMessageWait(i18n.__('Exporting Database...'));
                win.info('Database exported to:', path);
                that.alertMessageSuccess(false, btn, i18n.__('Export Database'), i18n.__('Database Successfully Exported'));
            });

        },

        importDatabase: function() {
            fdialogs.readFile(function(err, content, path) {
                that.alertMessageWait(i18n.__('Importing Database...'));
                try {
                    var zip = new AdmZip(content);
                    zip.extractAllTo(App.settings['databaseLocation'] + '/', /*overwrite*/ true);
                    that.alertMessageSuccess(true);
                } catch (err) {
                    that.alertMessageFailed(i18n.__('Invalid PCT Database File Selected'));
                    win.warn('Failed to Import Database');
                }
            });
        },

        updateCacheDirectory: function(e) {
            var field = $('#tmpLocation');
            this.ui.fakeTempDir.val = field.val();
            this.render();
        },

        areYouSure: function(btn, waitDesc) {
            if (!btn.hasClass('confirm')) {
                btn.addClass('confirm warning').text(i18n.__('Are you sure?'));
                return false;
            }
            btn.text(waitDesc).addClass('disabled').prop('disabled', true);
            return true;
        },

        alertMessageWait: function(waitDesc) {
            App.vent.trigger('notification:show', new App.Model.Notification({
                title: i18n.__('Please wait') + '...',
                body: waitDesc + '.',
                type: 'danger'
            }));
        },

        alertMessageSuccess: function(btnRestart, btn, btnText, successDesc) {
            var notificationModel = new App.Model.Notification({
                title: i18n.__('Success'),
                body: successDesc,
                type: 'success'
            });

            if (btnRestart) {
                notificationModel.set('showRestart', true);
                notificationModel.set('body', i18n.__('Please restart your application'));
            } else {
                // Hide notification after 3 seconds
                setTimeout(function() {
                    btn.text(btnText).removeClass('confirm warning disabled').prop('disabled', false);
                    App.vent.trigger('notification:close');
                }, 3000);
            }

            // Open the notification
            App.vent.trigger('notification:show', notificationModel);
        },

        alertMessageFailed: function(errorDesc) {
            App.vent.trigger('notification:show', new App.Model.Notification({
                title: i18n.__('Error'),
                body: errorDesc + '.',
                type: 'danger'
            }));

            // Hide notification after 5 seconds
            setTimeout(function() {
                App.vent.trigger('notification:close');
            }, 5000);
        },

        syncTrakt: function() {
            var oldHTML = document.getElementById('syncTrakt').innerHTML;
            $('#syncTrakt')
                .text(i18n.__('Syncing...'))
                .addClass('disabled')
                .prop('disabled', true);

            Database.deleteWatched(); // Reset before sync

            App.Trakt.syncTrakt.all()
                .then(function() {
                    App.Providers.get('Watchlist').fetchWatchlist();
                })
                .then(function() {
                    $('#syncTrakt')
                        .text(i18n.__('Done'))
                        .removeClass('disabled')
                        .addClass('ok')
                        .delay(3000)
                        .queue(function() {
                            $('#syncTrakt')
                                .removeClass('ok')
                                .prop('disabled', false);
                            document.getElementById('syncTrakt').innerHTML = oldHTML;
                            $('#syncTrakt').dequeue();
                        });
                })
                .catch(function(err) {
                    win.error('App.Trakt.syncTrakt.all()', err);
                    $('#syncTrakt')
                        .text(i18n.__('Error'))
                        .removeClass('disabled')
                        .addClass('warning')
                        .delay(3000)
                        .queue(function() {
                            $('#syncTrakt')
                                .removeClass('warning')
                                .prop('disabled', false);
                            document.getElementById('syncTrakt').innerHTML = oldHTML;
                            $('#syncTrakt').dequeue();
                        });
                });
        },

        getIPAddress: function() {
            var ip, alias = 0;
            var ifaces = require('os').networkInterfaces();
            for (var dev in ifaces) {
                ifaces[dev].forEach(function(details) {
                    if (details.family === 'IPv4') {
                        if (!/(loopback|vmware|internal|hamachi|vboxnet)/gi.test(dev + (alias ? ':' + alias : ''))) {
                            if (details.address.substring(0, 8) === '192.168.' ||
                                details.address.substring(0, 7) === '172.16.' ||
                                details.address.substring(0, 5) === '10.0.'
                            ) {
                                ip = details.address;
                                ++alias;
                            }
                        }
                    }
                });
            }
            return ip;
        },

        remBrowStre: function() {
            if (process.platform == 'linux') {
                require('child_process').exec('gnome-terminal -x bash -c "echo \'This setting requires Admin Rights\'; echo; sudo echo; sudo echo \'Authentication Successful\'; sudo echo; sudo rm /usr/share/applications/popcorntime.desktop; echo; echo \'Done! Press any key to close ...\'; read" & disown');
            }
        },

        writeDesktopFile: function(cb) {
            var pctPath = process.execPath.substr(0, process.execPath.lastIndexOf("/") + 1);
            var Exec = pctPath + 'Popcorn-Time'; //process.execPath
            fs.writeFile(gui.App.dataPath + '/popcorntime.desktop', '[Desktop Entry]\nVersion=2.0\nName=PopcornTime Player\nComment=Popcorn Time CE downloads and streams torrents instantly, directly from your browser! Just click on the torrent or magnet link and start downloading and playing it easily and in no time.\nExec=' + Exec + ' %U\nPath=' + pctPath + '\nIcon=' + pctPath + 'popcorntime.png\nTerminal=false\nType=Application\nMimeType=application/x-bittorrent;x-scheme-handler/magnet;video/avi;video/msvideo;video/x-msvideo;video/mp4;video/x-matroska;video/mpeg;\n', cb);
        },


        //function to move popcorntime.desktop to /usr/share/applications
        //function to set popcorntime.desktop as default for magnet links on browser and popcorntime
        regMagnet: function() {
            if (process.platform == 'linux') {
                this.writeDesktopFile(function(err) {
                    if (err) throw err;
                    var desktopFile = gui.App.dataPath + '/popcorntime.desktop';
                    //var desktopFile = '$HOME/.Popcorn-Time/popcorntime.desktop';
                    var tempMime = 'x-scheme-handler/magnet';

                    //xdg-mime and gvfs-mime configures defaults for applications
                    require('child_process').exec('gnome-terminal -x bash -c "echo \'Streaming magnet links directly from your browser requires Admin Rights\'; echo; sudo echo; sudo echo \'Authentication Successful\'; sudo echo; sudo mv -f ' + desktopFile + ' /usr/share/applications; sudo xdg-mime default popcorntime.desktop ' + tempMime + '; sudo gvfs-mime --set ' + tempMime + ' popcorntime.desktop; echo; echo \'Success! Press any key to close ...\'; read" & disown');
                });
            } else if (process.platform == 'darwin') {
                var pctPath = process.execPath.substr(0, process.execPath.lastIndexOf("/") + 1) + "../../../../Resources/app.nw/";
                require('child_process').exec('"' + pctPath + 'src/duti/duti" -s media.popcorntime.player magnet');
                alert("Success!");
            } else {
                fs.writeFile(gui.App.dataPath + '\\register-magnet.reg', 'REGEDIT4\r\n[HKEY_CLASSES_ROOT\\Magnet]\r\n@="URL:magnet Protocol"\r\n"Content Type"="application/x-magnet"\r\n"URL Protocol"=""\r\n\[HKEY_CLASSES_ROOT\\Magnet\\DefaultIcon]\r\n@="\\"' + process.execPath.split("\\").join("\\\\") + '\\"\r\n[HKEY_CLASSES_ROOT\\Magnet\\shell]\r\n[HKEY_CLASSES_ROOT\\Magnet\\shell\\open]\r\n[HKEY_CLASSES_ROOT\\Magnet\\shell\\open\\command]\r\n@="\\"' + process.execPath.split("\\").join("\\\\") + '\\" \\"%1\\""\r\n[HKEY_CURRENT_USER\\Software\\Classes\\Magnet]\r\n@="URL:magnet Protocol"\r\n"Content Type"="application/x-magnet"\r\n"URL Protocol"=""\r\n[HKEY_CURRENT_USER\\Software\\Classes\\Magnet\\DefaultIcon]\r\n@="\\"' + process.execPath.split("\\").join("\\\\") + '\\"\r\n[HKEY_CURRENT_USER\\Software\\Classes\\Magnet\\shell]\r\n[HKEY_CURRENT_USER\\Software\\Classes\\Magnet\\shell\\open]\r\n[HKEY_CURRENT_USER\\Software\\Classes\\Magnet\\shell\\open\\command]\r\n@="\\"' + process.execPath.split("\\").join("\\\\") + '\\" \\"%1\\""', function(err) {
                    if (err) throw err;
                    gui.Shell.openExternal(gui.App.dataPath + '\\register-magnet.reg');
                });
            }
        },

        regTorrent: function() {
            if (process.platform == 'linux') {
                this.writeDesktopFile(function(err) {
                    if (err) throw err;
                    var desktopFile = gui.App.dataPath + '/popcorntime.desktop';
                    var tempMime = 'application/x-bittorrent';
                    require('child_process').exec('gnome-terminal -x bash -c "echo \'Streaming torrents from your browser requires Admin Rights\'; echo; sudo echo; sudo echo \'Authentication Successful\'; sudo echo; sudo mv -f ' + desktopFile + ' /usr/share/applications; sudo xdg-mime default popcorntime.desktop ' + tempMime + '; sudo gvfs-mime --set ' + tempMime + ' popcorntime.desktop; echo; echo \'Success! Press any key to close ...\'; read" & disown');
                });
            } else if (process.platform == 'darwin') {
                var pctPath = process.execPath.substr(0, process.execPath.lastIndexOf("/") + 1) + "../../../../Resources/app.nw/";
                require('child_process').exec('"' + pctPath + 'src/duti/duti" -s media.PopcornTimeCE.player .torrent viewer');
                alert("Success!");
            } else {
                fs.writeFile(gui.App.dataPath + '\\register-torrent.reg', 'REGEDIT4\r\n[HKEY_CURRENT_USER\\Software\\Classes\\PopcornTimeCE.player\\DefaultIcon]\r\n@="' + process.execPath.split("\\").join("\\\\") + '"\r\n[HKEY_CURRENT_USER\\Software\\Classes\\PopcornTimeCE.player\\shell\\open\\command]\r\n@="\\"' + process.execPath.split("\\").join("\\\\") + '\\" \\"%1\\""\r\n[HKEY_CURRENT_USER\\Software\\Classes\\.torrent]\r\n@="PopcornTimeCE.player"\r\n"Content Type"="application/x-bittorrent"', function(err) {
                    if (err) throw err;
                    gui.Shell.openExternal(gui.App.dataPath + '\\register-torrent.reg');
                });
            }
        }

    });

    App.View.Settings = Settings;
})(window.App);