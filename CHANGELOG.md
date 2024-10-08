## 0.4.3-1 Beta

New Features:
- Removed experimental miner

Updated:
- Updated various packages

BugFixes:
- Fixed Build Issues with CircleCi
- Fixed default tv show api
- Fixed gulpfile isses

## 0.4.3-0 Beta - Let's All Go To The Movies! - 1 September 2020

New Features:

- Added Experimental section
  BugFixes:
- Fix category search
- Various small fixes.

## 0.4.2-0 Beta - Extra Time, Extra Popcorn - 23 August 2020

New Features:

- Sort: Sort By, Genres, Type are now saved when going between Movies
  and TV Shows.
- RARBG: Updated categories for RARBG to support 4K, Movies, TV Shows, XXX
- Tracker: Added Tracker Updater

BugFixes:

- Trakt: Authorize Fixed
- RARBG: Fixed RARBG search support in Torrent Collection
- Trailer: Validate trailer information is correct
- Favorites: Fixed Favorites to handle bad movie entries

Updated:

- OpenSubtitles: Updated handling of subtitle search
- OpenSubtitles: Added performance tests
- OpenSubtitles: Subtitle information is now loaded in the background
- Trakt: Updated Watchlist refresh and trakt clean up
- Trakt: Added Trak scrobble to ext players
- Code: Intergrated torrent health into repo
- Chromecast: Enabled auto discovery of new chromecast device on a set period
  of time

## 0.4.1-17.1 Beta - Popcorn Treats - 24 October 2019

New Features:

- Added more information to status screen: Active Users, and Total User,
  Time remaining

BugFixes:

- Fixed Next TV episode playing Automatically
- Disabled autoupdate by default
- Improved subtitle support

Updated:

- Updated to nw.js version 0.41.3
- Updated various packages to latest version

## 0.4.1-16 Beta - Summer Dream - 28 August 2018

New Features:

- OpenSubtitles: Add link to create account
- OpenSubtitles: Added Username and Password for OpenSubtitles API into the
  settings screen.
- ExtPlayer: Added Windows Media Player
- Player: Added a "Download Only" option to the player selection
- gulp: Add ffmpeg update to cache sdk
- gulp: Add ffmpeg update to builds
- gulp: Add commandline paramters to set nw.js version and downloadUrl location

BugFixes:

- Register: Fixed default torrent
- Settings: Fixed Download direction selection
- Magnet and Torrent: Fixed Magnet and Torrent Drop
- Cache: Fixed SQL execute methods
- About: Added OpenSubtitles.org link
- circleci: Removed osx64 from automated builds and zip
- Trackers: Updated trackers
- GulpArm: Updated LinuxArm downloadUrl
- GulpArmSupport: Add support for linuxarm platform
- OpenSubtitles: Better handling of subtitle information downloading
- OpenSubtitles: Better error handling and fixed settings

Updated:

- Nodejs: Updated to version 0.31.5
- jQuery: Updated to version 3.3.1
- Mousetrap: Updated to latest version 1.6.2
- gitlab: Updated to version 3.11.0
- xmlbuilder: Updated to version 10.0.0
- webtorrent: Updated to version 0.102.1
- yargs: Updated to version 12.0.1
- opensubtitles-api: Updated to version 4.1.0

## 0.4.1-15 Beta - Ides of March - 11 March 2018

BugFixes:

- Bookmark and Seen button visual issue fixed for both Movie and TV Show
- Fixed icon location in Themes for About screen
- Fixed About and minor Theme issues
- Remove tvApiServer copy from appearing incorrectly
- Genre will default to 'N/A' when it can't be determined
- Removed text referencing yts.ph
- Streamer: Increased Buffer Stream
- Webtorrent: Display torrent warning in the console

Updated:

- Updated various packages
- Updated analytics calls

## 0.4.1-14 Beta - Lets start the New Year right... - 26 December 2017

New Features:

- Packages are updated by Greenkeeper

BugFixes:

- Fixed build archive so that all files are included when a new build is
  generated. All builds should now have all the proper files as expected and
  run properly.
- Updated dependencies

## 0.4.1-11 Beta - Now with some butter - 6 December 2017

New Features:

- Watch movies and tv series directly in the PopcornTime player.

BugFixes:

- Updated nw.js with ffmpeg fix from Butter Project (butterproject.org)

OpenSubtitles:

- Added error handling to OpenSubtitles search call, movie list will appear
  after a short time.

## 0.4.1-9 Beta - I have a need for speed - 10 October 2017

New Features:

- Added webtorrent support to Movie and TV Shows download
- Added opensubtitles support

BugFixes:

- Stats on download details update after download complete
- PT-BR subtitles are supported again

## 0.4.1-5 Beta - New Year's Eve in front of the door - 28 December 2016

New Features:

- sort by trending
- sort by popularity
- rarbg search in 'torrent collection'
- small plugin system for kat, rarbg, vlc, google drive, html5 video, virus scanner, trakt
- html5 video player for tv shows and 'torrent collection'
- new order for Settings (overview and visibility)

BugFixes:

- get direct stream url 127.0.0.1:port while using html5 video player
- remove 'filter by views', 'filter by last added & google cloud', 'provider links'
- set rarbg as online search engine in settings.js
- fix chromecast scrollbar

## 0.4.1-4 Beta - Give me some Nachos - 5 June 2016

New Features:

- add Nacho Link to player list
- add subtitle support for Nacho Links
- add poster support for Nacho Links
- add enryption support for Nacho Links
- add Nacho Link support for http://yts.ph

BugFixes:

- fix tv api to eztv.is
- fix fast forward while chromecasting
- fix cancel button while streaming to nacholink
- set "deleteTmpOnClose" to false
- set "activateAutoplay" to false, in order to select chromecast
- fix favorites in 0.4.1 version
- set 'chosenPlayer' to html5 by default
- set 'chosenPlayer' to local if magnet link is clicked

## 0.4.0-5 Beta - Patience is a fruit of the Spirit - 13 Feb 2015

BugFixes:

- fix chromecast
- fixed bookmark crash
- fixed crew info
- fixed opensubtitles module on MAC
- fixed series issue on MAC
- rename application to Popcorn Time Community
- rename github organization to PopcornTimeCommunity
- kat.cr search (API fixed)
- remove strike search (API service closed)
- added yts API (yts.ph set as default)
- added eztv API (eztvapi.ml)
- video2k url fixed
- github url fixed
- set 'activateTorrentCollection' to true
- set 'translateSynopsis' to false
- set 'alwaysOnTop' to false
- set 'movies_quality' to false
- Hide strike and kat icons (clean up)
- app crash fixed (if no posters found)
- updated dependencies

New Features:

- stream from any browser and website by just clicking the magnet link (disabled by default)
- add download option 'deleteTmpOnClose' to recommended settings
- add VLC player option in settings (disabled by default)
- new virus scan option (enabled by default)
- new autoplay option, that allows you to stream with just one click (enabled by default)
- new history option to list all your downloaded torrents (kat.cr) to keep track of them (enabled by default)
- view megabyte size in torrent files (autoplay must be disabled)
- allow multiple players at the same time (multiple instances)
- show info tooltip onhover settings
- new order for Settings (overview and visibility)

## 0.3.9 Beta - Merry Christmas Eve ♡ I love y'all so much - 25 Dec 2015

BugFixes:

- Fix the bookmarking cache (favorites work again)
- IMDB Synopsis API (80 % of movies were not showing synopsis)
- Set TV/Movie API urls to yify.is/index.php/ (restore to defaults icon in settings)
- Added eztv API
- Remove option to select randomize feature in settings page
- Delete randomize function in provider settings
- Set randomize to false in settings file
- Remove option to select vpn feature in settings page
- Set vpn to false in settings file
- Remove sort by trending score option from sorters
- Remove sort by popularity option from sorters
- Hide runtime info if false
- Hide 'report an issue' link (.io git url)
- Chage default sorting to 'latest added' on movies (sort by popularity not working)
- Seach by multiple keyword
- Replace 'No description available' text with synopsis
- Change default movie API to yify.is/index.php/
- Genre array bug fix in endpoint api/v2/list_movies.json
- Fixed youtube trailer url
- Sort by year (and last added)
- Added CE suffix
- Updated dependencies

New Features:

- Google Cloud Player (possibly bad quality but very fast speed, no ISP monitor & unlimited download bandwidth)
- Subtitles for Google Cloud Player
- Interrupting movie (on Google Cloud Player) and watch again with last view
- Show Google Cloud icon on list
- Added an option to disable Coogle Cloud icon in settings
- Save choosen player (also for Google Cloud Player)
- Option to change movie API endpoint in settings (forget the YIFY API patcher)
- Get Provider info in movie details (more control over sources)
- Sort by Last Added & Google Cloud
- Sort by Views
- Sort by Downloads
- Sort by Likes
- Display crew info with director and cast in movie details
- New recommended settings (lightweight - less is more)
- New style for Settings (heading on top) and much better order (overview and visibility)
- Multiple UI improvment (subtitles floating, overview height, etc.)

## 0.3.8 Beta - There's nothing on TV - 09 July 2015

BugFixes:

- Fullscreen consistent while playing
- Multi-screen support
- Windows 8.1 : the app doesn't go under the taskbar anymore
- " & " in titles are now correctly handled
- Local subtitles should now always load correctly
- UI fixes
- More descriptive error messages and logs
- Fix "Open the app in last-open tab"
- Mac OS: fix mousewheel inverted
- Mac OS: Menu support
- Fix some issues with Keyboard navigation
- Allow to hide the updater notification
- Fix an issue corrupting cache if used on an external HDD
- Improvements in subtitle encoding
- Autoplay fixes
- Trakt.tv is back!
- Torrenting enhanced (finding more peers and better seeding)
- Remote control (httpapi) fixes
- Open TV Details "jump to" fixed
- More subtitles results for TV Series
- Download progress in the player now works for single file taken out of multifile torrents
- Images positionning in Movies & TV Series details
- Anime: fixes an issue where series got no episodes & movies no links
- Subtitles: most external torrents should be matched with subtitles now
- Arabic fonts (aljazeera & khalid art) can now be used to correctly display arabic subtitles
- Fix most issues with remotes.
- Fix the Popcorn Time player when watching trailers.

New Features:

- Node Webkit 12.1 (now known as nw.js)
- Cancel "Play Next Episode"
- Select your subtitles Font, and/or add a solid background to them.
- New subtitles for: Norwegian, Vietnamese
- Report bugs & issues from within the app (open the 'About' page)
- Mark as seen/unseen in Movie Details screen
- No more ads from Youtube
- Stream subtitles with DLNA/UPnP
- Search Strike or KickassTorrents (torrent portals) and save some torrents for later
- Allow SSA/ASS subtitles, along with TXT (mostly Chinese & Polish - needs testing)
- The app will now remember: last chosen quality, player, subtitles position, volume
- Mark an entire TV Series as watched
- Choose the application install directory (provided that it doesn't need admin rights)
- Play local video files in PT Player (mp4, avi, mov, mkv)
- Windows: launcher allowing to use PT as default for torrents/magnets/video files
- Support for multimedia keys
- Launch external players in Fullscreen
- Minimize to tray
- Translated synopsis (overview) for TV Series & Movies
- Calculation of the P2P exchange ratio of the entire app traffic
- FakeSkan (bitsnoop) will now warn you if an external torrent was flagged as "fake"
- "Randomize" button allowing to open a random movie
- Start Popcorn Time minimized with "-m" flag
- 1080p TV Shows are here !
- "Big Picture Mode" will allow you to read Popcorn Time's texts from your couch
- TVShow Time integration
- Display a warning if the HDD is almost full
- Sort by "Trending" on movies & tv shows
- Correctly display the sizes for your OS and language (ex: 32.5MiB in Linux English, 32.5Mo on Windows Spanish, 34.1MB in OSX English)

## 0.3.7 Beta - The Car Won't Start - 15 January 2015

BugFixes:

- Fall back to Sequential ID when AirPlay devices do not respond to ServerInfo queries
- Rebuild the new built-in VPN Client
- Renamed "External" to "ExtPlayer" to avoid confusion with non-local devices
- Fix the movie cover resizing code and garbage collect the cache to ensure old metadata isn't used
- Greatly improves the built-in DLNA detection
- Fix retina display for Ultra HD screens
- Properly hide the spinner in cases where an error occurs
- Always show the FileSelector if TorrentCol is active. Fixes PT-1575
- Fix subtitle error handling in the streamer
- Prevent the app from getting stuck on "Waiting for Subtitles" if subtitle discovery fails
- Fix the HTTP API / Remote API
- Improved IP-Detection for all external devices. Fixes PT-1440
- Fix the issue where the Ukrainian flag was displayed instead of the Armenian flag
- Fixed TV Show covers not showing up due to Trakt shutting down Slurm Image Server

New Features:

- Calculate the remaining time before stream download completion
- Added a "Magnet" icon in the details pane to allow copying of the magnet link
- Added the ability to save the .torrent files and magnet links in-app for later

## 0.3.6 Beta - The Christmas Tree Is Up - 25 December 2014

Bugfixes:

- Changed encoding of VTT Subtitles file to UTF-8. Fixes playback of all subtitle languages on external devices.
- Fixed the bug where streams played on the wrong device when you have multiple AirPlay devices
- Temporarily Fixed IP address in Media URL for external devices
- Reworked the updater to use our DNS servers so it continues to work even with issues
- Automatically close the player on Chromecast when media playback has finished
- Fixed the Chromecast reconnection issue when stopping and starting a new session
- Made further fixes to the "Waiting for Subtitles" bug
- Reworked and fixed multiple issues with Chromecast Status-Updater
- Updated the Chromecast module to use a refactored Chromecast-js
- Added in a BitTorrent PeerID specific to Popcorn Time
- Fixed problems with Watchtrailer, should fix issue PT-1333
- Various other minor bugfixes

New Features:

- Torrent Health now automatically updates
- Added an option to disable updates
- Added a built in OpenVPN client
- Small event's celebration
- Added a 'download progress' status

## 0.3.5 Beta - We're Snowden In - 09 november 2014

- Automatically sync Trakt on start
- New search bar
- Custom color for subtitles
- New window's width/height calculation
- New official theme: 'FlaX'
- PNG's optimization
- You can now choose your player with external torrents/magnets

- Fixed invalid Certificate Fingerprints in the app not verifying causing requests to fail
- Caught when the "Theme" var in Database didn't exist upon upgrading
- Fixed movies not loading because Trakt started replying with 404s
- Fixing bookmarks that don't work on the list page for TV Shows and Anime
- Remove "Blown up" look for Retina but leave it in place for QFHD due to it's size
- Fixed the updater for Popcorn Time in linux

## 0.3.4 Beta - It's Cold Outside - 06 october 2014

After the introduction of the Remote Control API on 0.3.3,
these remotes have been created by our awesome users go grab the one you
like best at http://discuss.popcorntime.io/t/list-of-popcorn-time-remote-controls/2044

- Now comes with release names
- More resiliant to APIs falling down
- HiDPI support, scales properly on 1080p, 2k/Retina and 4k/QHD screens.
- Update vectorial 'about' view.
- New watchlist view, automatically synced to trakt.
- Better caching of network calls, makes the app more snappy.
- [TV] Auto-Play next episode.
- New themes infrastructure allows for easier integration with community
  themes.
- New translation infrastructure allows for easier integration with community
  translations.
- A lot of bugfixes and under-the-hood changes.
- All dependencies have been updated.
- [ALPHA] Anime Tab, thanks to the haruhichan people !
- [ALPHA] ChromeCast now supports subtitles and cover images.

## 0.3.3 Beta - 12 sept 2014

- Move to self-hosted repo, you can now find us at http://git.popcorntime.io
- Use FontAwesome instead of PNG's: nicer sharper icons accross the ui
- Get rid of white flash at startup.
- Rethink Settings: much cleaner layout, separated in advanced.
- Themes: we give you 3 new themes to check out, and soon you'll be able to
  submit your own.
- HTTP Api: to control Popcorn Time from another application
- New settings:

  - Always on Top option
  - Start page option
  - Rating on covers
  - Fade or Hide watched items

- Multiple UI improvements

  - Resize covers on-the-fly
  - [TV] Open directly next unseen episode
  - Builtin help section

- External Players Framework:
  - VLC,
  - XBMC,
  - MPlayer,
  - mpv,
  - and many more !
- Linux installer

- [ALPHA] Trakt.tv synchronisation: trakt will now remember your favs for
- [ALPHA] External Devices Framework:
  - Chromecast
  - Airplay

release notes:

- This release ships with a huge internal code clean up that forced us to
  break former Databases compatibilities, so you most probably will have to reset
  your DataBase on install. sorry, we'll be better next time.
- We will not support auto-update for this release, sorry, we'll be better
  next time.

## 0.3.2 Beta - 12 june 2014

- Code cleanup
- Use official videojs
- IMDb links
- Support HDrip for old movies
- Trakt.tv integration to scrobble watched
- DMG app for MacOS
- Keyboard navigation
- Seen/Unseen icon
- HD TV series
- File selector for custom torrents

## 0.3.1 Beta - 21 may 2014

- Add methods to mark movie as watched
- Added quality filter for movies
- Added Advanced Settings with Connection, DHT, Tmp Folder options
- Added a help view for keyboard shortcuts. Press `?`
- Draggable subtitles. Move subtitles around the player.
- Drag and drop subtitles on the player to load a custom SRT file
- Rebuild TV Show API Endpoint with live data.
- Subtitles encode fixes.
- Copy stream URL to clipboard directly. Press `U`
- Catch exception to prevent blocking on initDb
- Return to Movie list after close movie
- TV Show search keywords can be in any order
- Faster app opening
- Better subtitles results (search by filename)
- Auto updater

## 0.3.0 Beta - 13 may 2014

- New NSIS Windows installer
- Rating stars
- Trailers
- Peers/Seeds view
- Brand new UI
- TV Series
- Bookmarks
- New languages
- Keyboard shortcuts
- More codec support
- More settings
- "About" tab

## 0.2.9 Beta - 15 april 2014

- Updater in-app
- New website
- Bump to working tree src/app
- Use Marionnette
- Speed up API requests
- Use OpenSans
- Loading screen

## 0.2.8 Beta - 16 march 2014

- New languages and subtitles
- Linux 32bits support
- Yts API

## 0.2.6 Beta, 0.2.7 Beta - 14 march 2014

- March 14 : original developers leave :(
- Confusing times & multiple repo change
- Trakt API
- Licence choice: GPL v3

## 0.2.5 Beta - 08 march 2014

- New languages
- Localized Windows Installer
- Update Node-Webkit 0.9.2
- Infinite scroll
- Wipe temp folder on close
- Multiplatform grunt build
- Personnalize title-bar based on the platform
- Settings page

## 0.2.0 Beta - 03 march 2014

- New sidebar UI
- New languages
- Disclaimer
- Movie API

## 0.1.0 Alpha - 20 february 2014

- First release Windows/Linux amd64/MacOS
- Windows Installer
- Connect peerflix using .torrent files
- Use localStorage Web SQL
- Implement optional quality functionality (SD vs. HD)
- VideoJS full integration
- Rotten-Tomato
- Yify Subtitles
- Manual input torrent / subtitles files
- Multi-language App support
