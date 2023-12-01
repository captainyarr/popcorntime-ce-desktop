(function (App) {
  "use strict";

  var request = require("request");
  var AdmZip = require("adm-zip");
  var fs = require("fs");
  var async = require("async");
  var path = require("path");
  var mkdirp = require("mkdirp");
  var captions = require("node-captions");
  var charsetDetect = require("jschardet");
  var iconv = require("iconv-lite");
  var Q = require("q");

  var self;

  var findSrt = function (input) {
    var files = fs.readdirSync(input);
    for (var f in files) {
      var stats = fs.lstatSync(path.join(input, files[f]));
      if (path.extname(files[f]) === ".srt" && stats.isFile()) {
        return path.join(input, files[f]);
      }
      if (stats.isDirectory()) {
        var found = findSrt(path.join(input, files[f]));
        if (found) {
          return found;
        }
      }
    }
  };

  var downloadZip = function (data) {
    return Q.Promise(function (resolve, reject) {
      var filePath = data.path;
      var subUrl = data.url;

      var fileFolder = path.dirname(filePath);
      var fileExt = path.extname(filePath);
      var newName =
        filePath.substring(0, filePath.lastIndexOf(fileExt)) + ".srt";

      var zipPath =
        filePath.substring(0, filePath.lastIndexOf(fileExt)) + ".zip";

      var unzipPath = filePath.substring(0, filePath.lastIndexOf(fileExt));
      unzipPath = unzipPath.substring(0, unzipPath.lastIndexOf(path.sep));

      var out = fs.createWriteStream(zipPath);

      var req = request({
        method: "GET",
        uri: subUrl,
      });

      req.on("error", function (e) {
        win.error("Error downloading subtitle: " + e);
        reject(e);
      });
      req.on("end", function () {
        out.end(function () {
          try {
            var zip = new AdmZip(zipPath),
              zipEntries = zip.getEntries();
            zip.extractAllTo(/*target path*/ unzipPath, /*overwrite*/ true);
            fs.unlink(zipPath, function (err) {});
            win.debug("Subtitles extracted to : " + newName);
            var found = findSrt(unzipPath);
            fs.renameSync(found, newName);
            resolve(newName);
          } catch (e) {
            win.error("Error downloading subtitle: " + e);
            reject(e);
          }
        });
      });
      req.pipe(out);
    });
  };

  //Download URL from Butter Project

  var downloadFromUrl = function (data) {
    win.debug("downloadfromUrl");
    return new Promise(function (resolve, reject) {
      var vpath = data.path; // video file path
      var vext = path.extname(vpath); // video extension
      var vname = path
        .basename(vpath)
        .substring(0, path.basename(vpath).lastIndexOf(vext)); // video file name
      var folder = path.dirname(vpath); // cwd
      var furl = data.url; // subtitle url
      var fpath = path.join(folder, vname); // subtitle local path, no extension

      request
        .get(furl)
        .on("response", function (response) {
          var rtype = (response.headers["content-type"] || "")
            .split(";")[0]
            .trim(); // response type
          var cdisp = response.headers["content-disposition"] || ""; // content disposition
          var fgz, fzip, fsrt;
          var ext;

          if (rtype.match("gz") || cdisp.match("gz")) {
            // gzipped file
            ext = ".gz";
            fgz = true;
          } else if (rtype.match("zip") || cdisp.match("zip")) {
            // zipped file
            ext = ".zip";
            fzip = true;
          } else if (rtype.match("srt") || cdisp.match("srt")) {
            // srt subtitle
            ext = ".srt";
            fsrt = true;
          } else {
            reject(
              new Error("Subtitle: response error, file is not gz,zip,srt"),
            );
          }

          var fileStream = fs
            .createWriteStream(fpath + ext)
            .on("finish", function () {
              if (fsrt) {
                resolve(fpath + ext);
              } else if (fzip) {
                try {
                  var zip = new AdmZip(fpath),
                    zipEntries = zip.getEntries();
                  zip.extractAllTo(/*target path*/ fpath, /*overwrite*/ true);
                  fs.unlink(fpath + ext, function (err) {});
                  console.debug("Subtitles extracted to : " + fpath);
                  var found = findSrt(fpath);
                  if (found) {
                    fs.renameSync(found, fpath + ".srt");
                    resolve(fpath + ".srt");
                  } else {
                    throw "no SRT file in the downloaded archive";
                  }
                } catch (e) {
                  reject(e);
                }
              } else if (fgz) {
                require("zlib").unzip(
                  fs.readFileSync(fpath + ext),
                  (error, buffer) => {
                    if (error) {
                      win.error(error);
                      reject(error);
                    } else {
                      var charset = charsetDetect.detect(buffer);
                      var denc = charset.encoding;
                      var subtitle_content = buffer.toString(denc);
                      fs.writeFileSync(fpath + ".srt", subtitle_content, {
                        encoding: denc,
                      });
                      resolve(fpath + ".srt");
                    }
                  },
                );
              }
            });
          this.pipe(fileStream);
        })
        .on("error", function (error) {
          reject(error);
        });
    });
  };

  var downloadSRT = function (data, callback) {
    return Q.Promise(function (resolve, reject) {
      var filePath = data.path;
      var subUrl = data.url;
      var fileExt = path.extname(filePath);
      var srtPath =
        filePath.substring(0, filePath.lastIndexOf(fileExt)) + ".srt";
      var out = fs.createWriteStream(srtPath);
      var req = request({
        method: "GET",
        uri: subUrl,
      });

      req.on("end", function () {
        out.end(function () {
          win.debug("Subtitles downloaded to : " + srtPath);
          resolve(srtPath);
        });
      });
      req.pipe(out);
    });
  };
  var Subtitles = Backbone.Model.extend({
    defaults: {
      id: "generic",
      name: "Generic",
    },
    initialize: function () {
      App.vent.on("subtitle:download", this.download);
      App.vent.on("subtitle:convert", this.convert);
      self = this;
    },
    get: function (data) {
      win.error("Not implemented in parent model");
    },
    download: function (data) {
      if (data.path && data.url) {
        win.debug("Subtitles download url:", data.url);
        win.debug("Save subtitles to AdvSettings " + data.url);
        AdvSettings.set("LastSubtitle", data.url);
        var fileFolder = path.dirname(data.path);

        // Fix cases of OpenSubtitles appending data after file extension.
        var subExt = data.url.split(".").pop();
        if (subExt.indexOf("/") > -1) {
          subExt = subExt.split("/")[0];
        }

        try {
          mkdirp.sync(fileFolder);
        } catch (e) {
          // Ignore EEXIST
        }
        if (subExt === "zip") {
          downloadZip(data)
            .then(function (location) {
              App.vent.trigger("subtitle:downloaded", location);
            })
            .catch(function (error) {
              App.vent.trigger("subtitle:downloaded", null);
            });
        } else if (subExt === "gz") {
          downloadFromUrl(data)
            .then(function (location) {
              App.vent.trigger("subtitle:downloaded", location);
            })
            .catch(function (error) {
              App.vent.trigger("subtitle:downloaded", null);
            });
        } else if (subExt === "srt") {
          downloadSRT(data)
            .then(function (location) {
              App.vent.trigger("subtitle:downloaded", location);
            })
            .catch(function (error) {
              App.vent.trigger("subtitle:downloaded", null);
            });
        } else {
          downloadFromUrl(data)
            .then(function (location) {
              App.vent.trigger("subtitle:downloaded", location);
            })
            .catch(function (error) {
              win.error("Subtitle Error, unknown file format: " + data.url);
              App.vent.trigger("subtitle:downloaded", null);
            });

          //win.error('Subtitle Error, unknown file format: ' + data.url);
          //App.vent.trigger('subtitle:downloaded', null);
        }
      } else {
        win.info(
          "No subtitles downloaded. None picked or language not available",
        );
        App.vent.trigger("subtitle:downloaded", null);
      }
    },
    convert: function (data, cb) {
      // Converts .srt's to .vtt's
      try {
        var srtPath = data.path;
        var vttPath = srtPath.replace(".srt", ".vtt");
        var srtData = fs.readFileSync(srtPath);
        self.decode(srtData, data.language, function (srtDecodedData) {
          captions.srt.parse(srtDecodedData, function (err, vttData) {
            if (err) {
              return cb(err, null);
            }
            // Save vtt as UTF-8 encoded, so that foreign subs will be shown correctly on ext. devices.
            fs.writeFile(
              vttPath,
              captions.vtt.generate(captions.srt.toJSON(vttData)),
              "utf8",
              function (err) {
                if (err) {
                  return cb(err, null);
                } else {
                  cb(null, {
                    vtt: vttPath,
                    srt: srtPath,
                    encoding: "utf8",
                  });
                }
              },
            );
          });
        });
      } catch (e) {
        win.error("error converting subtitles", e);
        cb(e, null);
      }
    },
    // Handles charset encoding
    decode: function (dataBuff, language, callback) {
      var targetEncodingCharset = "utf8";

      var charset = charsetDetect.detect(dataBuff);
      var detectedEncoding = charset.encoding;
      win.debug("SUB charset detected: ", detectedEncoding);
      // Do we need decoding?
      if (
        detectedEncoding.toLowerCase().replace("-", "") ===
        targetEncodingCharset
      ) {
        callback(dataBuff.toString("utf8"));
        // We do
      } else {
        var langInfo = App.Localization.langcodes[language] || {};
        win.debug(
          "SUB charset expected for '%s': ",
          language,
          langInfo.encoding,
        );
        if (
          langInfo.encoding !== undefined &&
          langInfo.encoding.indexOf(detectedEncoding) < 0
        ) {
          // The detected encoding was unexepected to the language, so we'll use the most common
          // encoding for that language instead.
          detectedEncoding = langInfo.encoding[0];
        }
        win.debug("SUB charset used: ", detectedEncoding);
        dataBuff = iconv.encode(
          iconv.decode(dataBuff, detectedEncoding),
          targetEncodingCharset,
        );
        callback(dataBuff.toString("utf8"));
      }
    },
  });

  App.Subtitles = {
    Generic: new Subtitles(),
  };
})(window.App);
