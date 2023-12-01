(function (App) {
  "use strict";

  var path = require("path");
  var fs = require("fs");
  var readdirp = require("readdirp");
  var async = require("async");
  var collection = App.Device.Collection;
  var child = require("child_process");

  var model; //Store current streamModel

  var ExtPlayer = App.Device.Generic.extend({
    defaults: {
      type: "ext-app",
      name: i18n.__("External Player"),
    },

    model,

    play: function (streamModel) {
      var options = {};
      var args = [];
      var url = streamModel.get("src"); //streamModel.attributes.src;
      var cmd;

      this.model = streamModel;

      if (process.platform == "win32") {
        // "" So it behaves when spaces in path
        //Node.js Format: spawn('"with spaces.cmd"', ['arg with spaces'], { shell: true });
        cmd = path.normalize('"' + this.get("path") + '"');
        options = {
          shell: true,
        };
      } else if (process.platform == "linux" || process.platform == "darwin") {
        cmd = path.normalize("" + this.get("path") + "");
        options = {
          shell: true,
        };
      } else {
        cmd = path.normalize('"' + this.get("path") + '" ');
      }

      args.push(getPlayerSwitches(this.get("id")));

      var subtitle = streamModel.attributes.subFile || "";
      if (subtitle !== "") {
        if (
          this.get("id") === "mplayer" ||
          this.get("id") === "MPlayer OSX Extended"
        ) {
          //detect charset
          var dataBuff = fs.readFileSync(subtitle);
          var charsetDetect = require("jschardet");
          //var targetEncodingCharset = 'utf8';
          var charset = charsetDetect.detect(dataBuff);
          var detectedEncoding = charset.encoding;
          win.debug("Subtitles charset detected: %s", detectedEncoding);
          if (detectedEncoding.toLowerCase() === "utf-8") {
            args.push("-utf8 ");
          }
        }
        args.push(getPlayerSubSwitch(this.get("id")) + '"' + subtitle + '" ');
      }
      if (getPlayerFS(this.get("id")) !== "") {
        // Start player fullscreen if available and asked
        if (Settings.alwaysFullscreen) {
          args.push(this.get("id"));
        }
      }
      if (getPlayerFilenameSwitch(this.get("id")) !== "") {
        // The video file is the biggest file in the torrent
        var videoFile = _.sortBy(
          streamModel.attributes.torrent.info.files,
          function (file) {
            return -file.length;
          },
        )[0];
        args.push(
          videoFile
            ? getPlayerFilenameSwitch(this.get("id")) +
                '"' +
                videoFile.name +
                '" '
            : "",
        );
      }

      //Push localhost URL for external devices
      args.push(url);

      win.info("Launching External Player: " + cmd + " URL: " + url);
      win.info("Launching External Player Args: " + args);
      win.info("Launching External Player Options: " + JSON.stringify(options));

      var player = child.spawn(cmd, args, options);

      this.sendToTrakt("start");

      player.stdout.on("data", (data) => {
        win.info(`stdout: ${data}`);
      });

      player.stderr.on("data", (data) => {
        win.error(`stderr: ${data}`);
      });

      player.on("error", (data) => {
        win.error("External Player Error" + data);
        this.sendToTrakt("stop");
        App.vent.trigger("player:close");
        App.vent.trigger("stream:stop");
        App.vent.trigger("preload:stop");
      });

      player.on("close", (code) => {
        win.debug(`Player process exited with code ${code}`);
        if (streamModel.attributes.device.id === "Bomi") {
          // don't stop on exit, because Bomi could be already running in background and the command ends while the stream should continue
          return;
        }
        this.sendToTrakt("stop");

        App.vent.trigger("player:close");
        App.vent.trigger("stream:stop");
        App.vent.trigger("preload:stop");
      });
    },

    pause: function () {},

    stop: function () {},

    unpause: function () {},

    sendToTrakt: function (method) {
      var type = this.isMovie();
      var id =
        type === "movie"
          ? this.model.get("imdb_id")
          : this.model.get("episode_id");
      var progress = 0; //this.video.currentTime() / this.video.duration() * 100 | 0;

      if (method == "stop") progress = 100;

      App.Trakt.scrobble(method, type, id, progress);
    },
    isMovie: function () {
      if (this.model.get("tvdb_id") === undefined) {
        if (
          this.model.get("type") === "video/youtube" ||
          this.model.get("imdb_id") === undefined
        ) {
          return undefined;
        } else {
          return "movie";
        }
      } else {
        return "episode";
      }
    },
  });

  function getPlayerName(loc) {
    return path.basename(loc).replace(path.extname(loc), "");
  }

  function getPlayerSubSwitch(loc) {
    var name = getPlayerName(loc);
    return players[name].subswitch || "";
  }

  function getPlayerFilenameSwitch(loc) {
    var name = getPlayerName(loc);
    return players[name].filenameswitch || "";
  }

  function getPlayerCmd(loc) {
    var name = getPlayerName(loc);
    return players[name].cmd;
  }

  function getPlayerSwitches(loc) {
    var name = getPlayerName(loc);
    return players[name].switches || "";
  }

  function getPlayerFS(loc) {
    var name = getPlayerName(loc);
    return players[name].fs || "";
  }

  var players = {
    VLC: {
      type: "vlc",
      cmd: "/Contents/MacOS/VLC",
      switches: "--no-video-title-show",
      subswitch: "--sub-file=",
      fs: "-f",
      stop: "vlc://quit",
      pause: "vlc://pause",
    },
    "Fleex player": {
      type: "fleex-player",
      cmd: "/Contents/MacOS/Fleex player",
      filenameswitch: "-file-name ",
    },
    "MPlayer OSX Extended": {
      type: "mplayer",
      cmd: "/Contents/Resources/Binaries/mpextended.mpBinaries/Contents/MacOS/mplayer",
      switches: '-font "/Library/Fonts/Arial Bold.ttf"',
      subswitch: "-sub ",
      fs: "-fs",
    },
    mplayer: {
      type: "mplayer",
      cmd: "mplayer",
      switches: "-nolirc -prefer-ipv4 -really-quiet",
      subswitch: "-sub ",
      fs: "-fs",
    },
    mpv: {
      type: "mpv",
      switches: "--quiet",
      subswitch: "--sub-file=",
      fs: "--fs",
    },
    "MPC-HC": {
      type: "mpc-hc",
      switches: "",
      subswitch: "/sub ",
      fs: "/fullscreen",
    },
    "MPC-HC64": {
      type: "mpc-hc",
      switches: "",
      subswitch: "/sub ",
      fs: "/fullscreen",
    },
    "MPC-BE": {
      type: "mpc-be",
      switches: "",
      subswitch: "/sub ",
      fs: "/fullscreen",
    },
    "MPC-BE64": {
      type: "mpc-be",
      switches: "",
      subswitch: "/sub ",
      fs: "/fullscreen",
    },
    SMPlayer: {
      type: "smplayer",
      switches: "",
      subswitch: "-sub ",
      fs: "-fs",
      stop: "smplayer -send-action quit",
      pause: "smplayer -send-action pause",
    },
    Bomi: {
      type: "bomi",
      switches: "",
      subswitch: "--set-subtitle ",
      fs: "--action window/enter-fs",
    },
    PotPlayerMini: {
      type: "DAUM-PotPlayer",
      switches: "",
      subswitch: "",
      fs: "",
    },
    PotPlayerMini64: {
      type: "DAUM-PotPlayer",
      switches: "",
      subswitch: "",
      fs: "",
    },
    WMPlayer: {
      type: "wmplayer",
      switches: "",
      subswitch: "",
      fs: "/fullscreen",
    }, // wmplayer /fullscreen
  };

  /* map name back into the object as we use it in match */
  _.each(players, function (v, k) {
    players[k].name = k;
  });

  var searchPaths = {
    linux: [],
    darwin: [],
    win32: [],
  };

  var addPath = function (path) {
    if (fs.existsSync(path)) {
      searchPaths[process.platform].push(path);
    }
  };

  // linux
  addPath("/usr/bin");
  addPath("/usr/local/bin");
  // darwin
  addPath("/Applications");
  addPath(process.env.HOME + "/Applications");
  // win32
  addPath(process.env.SystemDrive + "\\Program Files\\");
  addPath(process.env.SystemDrive + "\\Program Files (x86)\\");
  // win7+
  /*
    "LOCALAPPDATA": "C:\\Users\\{username}\\AppData\\Local",
    "ProgramData": "C:\\ProgramData",
    "ProgramFiles": "C:\\Program Files",
    "ProgramFiles(x86)": "C:\\Program Files (x86)",
    "ProgramW6432": "C:\\Program Files",
    "SystemDrive": "C:",
    "SystemRoot": "C:\\WINDOWS",
    */
  addPath(process.env.ProgramFiles);

  addPath(process.env.LOCALAPPDATA);
  addPath(process.env.LOCALAPPDATA + "\\Programs");
  addPath(process.env.LOCALAPPDATA + "\\Apps\\2.0\\");

  /*
    win.debug("SystemDrive:"+process.env.SystemDrive);
    win.debug("LOCALAPPDATA:"+process.env.LOCALAPPDATA);
    win.debug("HOMEPATH:"+process.env.HOMEPATH);
    win.debug("HOME:"+process.env.HOME);

    win.debug(JSON.stringify(process.env));
    */

  /*
    win.debug("SystemDrive:"+process.env.SystemDrive);
    win.debug("LOCALAPPDATA:"+process.env.LOCALAPPDATA);
    win.debug("HOMEPATH:"+process.env.HOMEPATH);
    win.debug("HOME:"+process.env.HOME);

    win.debug(JSON.stringify(process.env));
    */

  var folderName = "";
  var birthtimes = {};

  async.each(
    searchPaths[process.platform],
    function (folderName, pathcb) {
      folderName = path.resolve(folderName);
      win.info("Scanning: " + folderName);
      var appIndex = -1;

      var fileStream = readdirp(folderName, {
        depth: 3,
        alwaysStat: true,
      });

      fileStream.on("data", function (d) {
        var app = d.basename
          .replace(".app", "")
          .replace(".exe", "")
          .toLowerCase();
        var match = _.filter(players, function (v, k) {
          return k.toLowerCase() === app;
        });

        if (match.length) {
          match = match[0];
          var birthtime = d.stats.birthtime;
          var previousBirthTime = birthtimes[match.name];
          if (!previousBirthTime || birthtime > previousBirthTime) {
            if (!previousBirthTime) {
              collection.add(
                new ExtPlayer({
                  id: match.name,
                  type: "external-" + match.type,
                  name: match.name,
                  path: d.fullPath,
                }),
              );
              win.info(
                "Found External Player: " + match.name + " in " + d.fullPath,
              );
            } else {
              collection
                .findWhere({
                  id: match.name,
                })
                .set("path", d.fullPath);
              win.info(
                "Updated External Player: " +
                  app +
                  " with more recent version found in " +
                  d.fullPath,
              );
            }
            birthtimes[match.name] = birthtime;
          }
        }
      });
      fileStream.on("end", function () {
        pathcb();
      });
    },
    function (err) {
      if (err) {
        win.error("External Players: scan", err);
        return;
      } else {
        win.info("External Players: scan finished");
        return;
      }
    },
  );

  App.Device.ExtPlayer = ExtPlayer;
})(window.App);
