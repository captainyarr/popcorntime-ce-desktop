(function(App) {
    'use strict';

    var torrentHealth = require('./lib/util/torrent-tracker-health');

    var clipboard = gui.Clipboard.get(),
        collection = path.join(require('nw.gui').App.dataPath + '/TorrentCollection/'),
        files;

    var TorrentCollection = Backbone.Marionette.ItemView.extend({
        template: '#torrent-collection-tpl',
        className: 'torrent-collection',

        events: {
            'mousedown .file-item': 'openFileSelector',
            'mousedown .result-item': 'onlineOpen',
            'mousedown .item-delete': 'deleteItem',
            'mousedown .item-rename': 'renameItem',
            'mousedown .magnet-icon': 'openMagnet',
            'click .collection-delete': 'clearCollection',
            'click .collection-open': 'openCollection',
            'click .collection-import': 'importItem',
            'click .notorrents-frame': 'importItem',
            'click .online-search': 'onlineSearch',
            'click .engine-icon': 'changeEngine',
            'submit #online-form': 'onlineSearch',
            'click .online-back': 'onlineClose',
            'contextmenu #online-input': 'rightclick_search'
        },

        initialize: function() {
            if (!fs.existsSync(collection)) {
                fs.mkdirSync(collection);
                win.debug('TorrentCollection: data directory created');
            }
            this.files = fs.readdirSync(collection);
            this.searchEngine = Settings.onlineSearchEngine;

            this.torrentBrowse = require('torrent-search-api');

            // Enable public providers
            this.torrentBrowse.enablePublicProviders();

            Settings.onlineProvidersList = this.torrentBrowse.getActiveProviders();
            //Default List of Search Categories
            Settings.onlineProvidersCategories = ["All", "4K", "Movies", "TV Series"];
        },

        onShow: function() {
            Mousetrap.bind(['esc', 'backspace'], function(e) {
                $('#filterbar-torrent-collection').click();
            });

            $('#movie-detail').hide();
            $('#nav-filters').hide();

            this.render();
            /*
            if (AdvSettings.get('pluginKATsearch') === false && AdvSettings.get('pluginRARBGsearch') === false)
                $('.onlinesearch').hide();
            */
            if (AdvSettings.get('pluginKATsearch') === false)
                $('#kat-icon').hide();
            if (AdvSettings.get('pluginRARBGsearch') === false)
                $('#rarbg-icon').hide();
        },

        onRender: function() {
            $('.engine-icon').removeClass('active');
            $('#' + this.searchEngine.toLowerCase() + '-icon').addClass('active');
            $('#online-input').focus();
            if (this.files[0]) {
                $('.notorrents-info').css('display', 'none');
                $('.collection-actions').css('display', 'block');
                $('.torrents-info').css('display', 'block');
            }
            /*
            if (AdvSettings.get('pluginKATsearch') === false && AdvSettings.get('pluginRARBGsearch') === false)
                $('.onlinesearch').hide();
            */
            if (AdvSettings.get('pluginKATsearch') === false)
                $('#kat-icon').hide();
            if (AdvSettings.get('pluginRARBGsearch') === false)
                $('#rarbg-icon').hide();

            this.$('.tooltipped').tooltip({
                delay: {
                    'show': 400,
                    'hide': 100
                }
            });
        },

        updateCategories: function(providerList) {

            var result;
            providerList.forEach(element => {
                if (element.name.toUpperCase() === this.searchEngine.toUpperCase()) {
                    result = element;
                }
            });

            if (!result) {
                return ["All", "4K", "Movies", "TV Series"];
            }

            return result.categories;
        },

        changeEngine: function(e) {
            e.preventDefault();

            Settings.onlineSearchEngine = this.searchEngine = e.currentTarget.dataset.id;
            AdvSettings.set('onlineSearchEngine', this.searchEngine);

            //Update Engine Categories
            Settings.onlineProvidersCategories = this.updateCategories(Settings.onlineProvidersList)

            var searchEngine = this.searchEngine.toLowerCase();

            if (this.searchEngine === '1337x') {
                searchEngine = 'x1337x'
            }

            if ($('#online-input').val().length !== 0) {
                $('.engine-icon').removeClass('active');
                $('#' + searchEngine + '-icon').addClass('active');
                this.onlineSearch();
            }

            this.render()
        },

        createMagnetURI: function(torrentHash) {
            var magnet_uri = 'magnet:?xt=urn:btih:';
            var tracker_list = '&tr=udp:\/\/tracker.coppersurfer.tk:6969'
                + '&tr=udp:\/\/p4p.arenabg.com:1337'
                + '&tr=udp:\/\/9.rarbg.me:2710/announce'
                + '&tr=udp:\/\/glotorrents.pw:6969/announce'
                + '&tr=udp:\/\/torrent.gresille.org:80/announce'
                + '&tr=udp:\/\/tracker.internetwarriors.net:1337'
                + '&tr=udp:\/\/tracker.opentrackr.org:1337/announce'
                + '&tr=udp:\/\/tracker.leechers-paradise.org:696931622A'
                + '&tr=udp:\/\/open.demonii.com:1337'
                + '&tr=udp:\/\/tracker.coppersurfer.tk:6969'
                + '&tr=udp:\/\/tracker.leechers-paradise.org:6969'
                + '&tr=udp:\/\/exodus.desync.com:696931622A';

            Settings.trackers.forEach(function(item) {
                tracker_list += '&tr=' + item;
            });

            return magnet_uri + torrentHash + tracker_list;
        },

        updateMagnetURI: function(magnet_uri) {
            let tracker_list = "";

            Settings.trackers.forEach(function(item) {
                tracker_list += '&tr=' + item;
            });

            return magnet_uri + tracker_list;
        },

        onlineSearch: function(e) {
            if (e) {
                e.preventDefault();
            }
            var that = this;
            var input = $('#online-input').val();
            var category = $('.online-categories > select').val();

            AdvSettings.set('OnlineSearchCategory', category);

            var current = $('.onlinesearch-info > ul.file-list').html();

            if (input === '' && current === '') {
                return;
            } else if (input === '' && current !== '') {
                this.onlineClose();
                return;
            }

            $('.onlinesearch-info>ul.file-list').html('');

            $('.online-search').removeClass('fa-search').addClass('fa-spin fa-spinner');

            var index = 0;

            //Generate async function for each search   
            var asyncSearch = async function() {
                //Initialize the search
                ga('set', {
                    page: '/popcorntimece/' + that.searchEngine + '/search?s=' + encodeURI(input) + '&cat=' + encodeURI(category),
                    title: that.searchEngine + ' Search Results: ' + input
                });

                ga('send', {
                    hitType: 'pageview'
                });

                //Torrent Browse Search

                const defaultParams = {
                    category: "All",
                    limit: 100,
                    sort: 'last',
                    min_seeders: 2,
                    min_leechers: null,
                    format: 'json_extended',
                    ranked: null,
                    searchprovider: [],
                }

                //Set Category for Search Params
                defaultParams.category = category;

                //Set search provider
                switch (that.searchEngine) {
                    //FIX: Specific Search Engine functionality not working properly
                    /*
                    case 'Torrent9':
                        defaultParams.searchprovider = ["Torrent9"];
                        break;
                    case 'Yts':
                        defaultParams.searchprovider = ["Yts"];
                        break;
                    case 'KAT':
                        defaultParams.searchprovider = ["kat"];
                        break;
                    case 'x1337x':
                        defaultParams.searchprovider = ["1337x"];
                        break;
                    */
                    default:
                        defaultParams.searchprovider = "all";
                        break;
                }

                win.debug('torrent browse search started: %s', input);
                win.debug('torrent browse search engine: %s', defaultParams.searchprovider);
                win.debug('torrent browse search category: %s', defaultParams.category);

                var searchResults = function(result) {

                    win.debug('torrent browse search: %s results', result.length);

                    if (result && result.length === 0) {
                        throw new Error('No results found');
                    }

                    //Throw error if no resultsg
                    if (result && result.length === 1 && result[0] && result[0].title === 'No results returned') {
                        //throw error if no results
                        throw new Error('No results found');
                    }
                    //For each item get the torrent magnet URI through the torrent browse API
                    result.forEach(async function(item) {

                        if (!item || !item.title) {
                            win.error('Torrent item missing title or null');
                            return;
                        }

                        try {
                            var itemModel = {
                                title: item.title,
                                magnet: await that.torrentBrowse.getMagnet(item),//FIXME tracker_list
                                seeds: item.seeds,
                                peers: item.peers,
                                size: item.size,
                                index: index
                            };

                            //Check if magnet has trackers
                            itemModel.magnet = that.updateMagnetURI(itemModel.magnet);

                            that.onlineAddItem(itemModel);
                            index++;
                        } catch (ex) {
                            win.error('Failed to add torrent item: %s', ex);
                        }
                    });

                    that.$('.tooltipped').tooltip({
                        html: true,
                        delay: {
                            'show': 50,
                            'hide': 50
                        }
                    });
                    $('.notorrents-info,.torrents-info').hide();
                    $('.online-search').removeClass('fa-spin fa-spinner').addClass('fa-search');
                    $('.onlinesearch-info').show();
                    /*
                    if (index === 0) {
                        $('.onlinesearch-info>ul.file-list').html('<br><br><div style="text-align:center;font-size:30px">' + i18n.__('No results found') + '</div>');
                    }*/

                }

                if (defaultParams.searchprovider === "all") {
                    that.torrentBrowse.search(input, defaultParams.category, defaultParams.limit).then(function(result) {
                        searchResults(result);
                    }).catch(function(err) {
                        win.debug('torrent browse search failed: %s', err.message);

                        $('.notorrents-info,.torrents-info').hide();
                        $('.online-search').removeClass('fa-spin fa-spinner').addClass('fa-search');
                        $('.onlinesearch-info').show();

                        $('.onlinesearch-info>ul.file-list').html('<br><br><div style="text-align:center;font-size:30px">' + i18n.__('No results found') + '</div>');
                        /*
                        if (index === 0) {
                           
                        }*/

                    });
                } else {
                    //Torrent Browse Search
                    that.torrentBrowse.search(input, defaultParams.category, defaultParams.limit).then(function(result) {
                        searchResults(result);
                    }).catch(function(err) {
                        win.debug('torrent browse search failed: %s', err.message);

                        $('.notorrents-info,.torrents-info').hide();
                        $('.online-search').removeClass('fa-spin fa-spinner').addClass('fa-search');
                        $('.onlinesearch-info').show();

                        $('.onlinesearch-info>ul.file-list').html('<br><br><div style="text-align:center;font-size:30px">' + i18n.__('No results found') + '</div>');
                        /*
                        if (index === 0) {
                           
                        }*/

                    });
                }
            }

            //Generate Search Request
            asyncSearch();
        },

        onlineAddItem: function(item) {
            var ratio = item.peers > 0 ? item.seeds / item.peers : +item.seeds;
            $('.onlinesearch-info>ul.file-list').append(
                '<li class="result-item" data-index="' + item.index + '" data-file="' + item.magnet + '"><a>' + item.title + '</a><div class="item-icon magnet-icon tooltipped" data-toogle="tooltip" data-placement="right" title="' + i18n.__('Magnet link') + '"></div><i class="online-size tooltipped" data-toggle="tooltip" data-placement="left" title="' + i18n.__('Ratio:') + ' ' + ratio.toFixed(2) + '<br>' + i18n.__('Seeds:') + ' ' + item.seeds + ' - ' + i18n.__('Peers:') + ' ' + item.peers + '">' + item.size + '</i></li>'
            );
            if (item.seeds === 0) { // recalc the peers/seeds
                //TODO: Update tracker list to full
                //var torrent = item.magnet.split('&tr')[0] + '&tr=udp://tracker.openbittorrent.com:80/announce' + '&tr=udp://open.demonii.com:1337/announce' + '&tr=udp://tracker.coppersurfer.tk:6969';
                var torrent = this.updateMagnetURI(item.magnet);

                //require('torrent-tracker-health')(torrent, {
                torrentHealth(torrent, {
                    timeout: 1000
                }).then(function(res) {
                    //console.log('torrent index %s: %s -> %s (seeds)', item.index, item.seeds, res.seeds)
                    ratio = res.peers > 0 ? res.seeds / res.peers : +res.seeds;
                    $('.result-item[data-index=' + item.index + '] i').attr('data-original-title', i18n.__('Ratio:') + ' ' + ratio.toFixed(2) + '<br>' + i18n.__('Seeds:') + ' ' + res.seeds + ' - ' + i18n.__('Peers:') + ' ' + res.peers);
                });
            }
        },

        onlineOpen: function(e) {
            //var file = $(e.currentTarget).dataset.file;
            var file = e.currentTarget.dataset.file;
            Settings.droppedMagnet = file;
            window.handleTorrent(file);
        },

        onlineClose: function() {
            $('.onlinesearch-info>ul.file-list').html('');
            $('.onlinesearch-info').hide();
            this.render();
        },

        rightclick_search: function(e) {
            e.stopPropagation();
            var search_menu = new this.context_Menu(i18n.__('Cut'), i18n.__('Copy'), i18n.__('Paste'));
            search_menu.popup(e.originalEvent.x, e.originalEvent.y);
        },

        context_Menu: function(cutLabel, copyLabel, pasteLabel) {
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
                        $('#online-input').val(text);
                    }
                });

            menu.append(cut);
            menu.append(copy);
            menu.append(paste);

            return menu;
        },

        openFileSelector: function(e) {
            var _file = e.currentTarget.innerText;
            var file;

            if (_file !== undefined)
                file = _file.substring(0, _file.length - 2); // avoid ENOENT
            else
                file = "";

            if (_file.indexOf('.torrent') !== -1) {
                Settings.droppedTorrent = file;
                window.handleTorrent(collection + file);
            } else { // assume magnet
                var content = fs.readFileSync(collection + file, 'utf8');
                Settings.droppedMagnet = content;
                Settings.droppedStoredMagnet = file;
                window.handleTorrent(content);
            }
        },

        openMagnet: function(e) {
            this.$('.tooltip').css('display', 'none');
            e.preventDefault();
            e.stopPropagation();

            var magnetLink,
                gui = require('nw.gui');

            if (e.currentTarget.parentNode.className === 'file-item') {
                // stored
                var _file = e.currentTarget.parentNode.innerText,
                    file = _file.substring(0, _file.length - 2); // avoid ENOENT
                magnetLink = fs.readFileSync(collection + file, 'utf8');
            } else {
                // search result
                magnetLink = e.currentTarget.parentNode.attributes['data-file'].value;
            }

            if (e.button === 2) { //if right click on magnet link
                var clipboard = gui.Clipboard.get();
                clipboard.set(magnetLink, 'text'); //copy link to clipboard
                $('.notification_alert').text(i18n.__('The magnet link was copied to the clipboard')).fadeIn('fast').delay(2500).fadeOut('fast');
            } else {
                gui.Shell.openExternal(magnetLink);
            }
        },

        deleteItem: function(e) {
            this.$('.tooltip').css('display', 'none');
            e.preventDefault();
            e.stopPropagation();

            var _file = e.currentTarget.parentNode.innerText,
                file = _file.substring(0, _file.length - 2); // avoid ENOENT

            fs.unlinkSync(collection + file);
            win.debug('Torrent Collection: deleted', file);

            // update collection
            this.files = fs.readdirSync(collection);
            this.render();
        },

        renameItem: function(e) {
            this.$('.tooltip').css('display', 'none');
            e.preventDefault();
            e.stopPropagation();

            var _file = e.currentTarget.parentNode.innerText,
                file = _file.substring(0, _file.length - 2), // avoid ENOENT
                isTorrent = false;

            if (file.endsWith('.torrent')) {
                isTorrent = 'torrent';
            }

            var newName = this.renameInput(file);
            if (!newName) {
                return;
            }

            if (isTorrent) { //torrent
                if (!newName.endsWith('.torrent')) {
                    newName += '.torrent';
                }
            } else { //magnet
                if (newName.endsWith('.torrent')) {
                    newName = newName.replace('.torrent', '');
                }
            }

            if (!fs.existsSync(collection + newName) && newName) {
                fs.renameSync(collection + file, collection + newName);
                win.debug('Torrent Collection: renamed', file, 'to', newName);
            } else {
                $('.notification_alert').show().text(i18n.__('This name is already taken')).delay(2500).fadeOut(400);
            }

            // update collection
            this.files = fs.readdirSync(collection);
            this.render();
        },

        renameInput: function(oldName) {
            var userInput = prompt(i18n.__('Enter new name'), oldName);
            if (!userInput || userInput === oldName) {
                return false;
            } else {
                return userInput;
            }
        },

        clearCollection: function() {
            deleteFolder(collection);
            win.debug('Torrent Collection: delete all', collection);
            App.vent.trigger('torrentCollection:show');
        },

        openCollection: function() {
            win.debug('Opening: ' + collection);
            gui.Shell.openItem(collection);
        },

        importItem: function() {
            this.$('.tooltip').css('display', 'none');

            var that = this;
            var input = document.querySelector('.collection-import-hidden');
            input.addEventListener('change', function(evt) {
                var file = $('.collection-import-hidden')[0].files[0];
                that.render();
                window.ondrop({
                    dataTransfer: {
                        files: [file]
                    },
                    preventDefault: function() { }
                });
            }, false);

            input.click();
        },

        onDestroy: function() {
            Mousetrap.unbind(['esc', 'backspace']);
            $('#movie-detail').show();
            $('#nav-filters').show();
        },

        closeTorrentCollection: function() {
            App.vent.trigger('torrentCollection:close');
        }

    });

    App.View.TorrentCollection = TorrentCollection;
})(window.App);
