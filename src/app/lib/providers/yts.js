(function (App) {
  "use strict";

  var Q = require("q");
  var axios = require("axios");
  var inherits = require("util").inherits;

  function YTS() {
    if (!(this instanceof YTS)) {
      return new YTS();
    }

    App.Providers.Generic.call(this);
  }
  inherits(YTS, App.Providers.Generic);

  YTS.prototype.extractIds = function (items) {
    return _.pluck(items.results, "imdb_id");
  };

  var format = function (data) {
    /*
        var results = _.chain(data.movies)
         .filter(function (movie) {
         // Filter any 3D only movies
         return _.any(movie.torrents, function (torrent) {
         return torrent.quality !== '3D';
         });
         })*/
    var tracker_list = "";

    Settings.trackers.forEach(function (item) {
      tracker_list += "&tr=" + item;
    });

    function check_trailer(movie) {
      if (movie.yt_trailer_code && movie.yt_trailer_code != "") {
        return "https://www.youtube.com/watch?v=" + movie.yt_trailer_code;
      } else return null;
    }

    var results = _.chain(data.movies)
      .map(function (movie) {
        return {
          type: "movie",
          id: movie.id,
          imdb_id: movie.imdb_code,
          title: movie.title,
          slug: movie.slug,
          year: movie.year,
          genre: movie.genres,
          directors: movie.directors,
          cast: movie.cast,
          rating: movie.rating,
          runtime: movie.runtime,
          image: movie.medium_cover_image,
          cover: movie.medium_cover_image, //movie.large_cover_image,
          backdrop: movie.background_image,
          synopsis: movie.synopsis,
          trailer: check_trailer(movie),
          google_video: movie.google_video || false,
          certification: movie.mpa_rating,
          torrents: _.reduce(
            movie.torrents,
            function (torrents, torrent) {
              if (torrent.quality !== "3D") {
                torrents[torrent.quality] = {
                  url: torrent.url,
                  magnet: "magnet:?xt=urn:btih:" + torrent.hash + tracker_list,
                  size: torrent.size_bytes,
                  filesize: torrent.size,
                  seed: torrent.seeds,
                  peer: torrent.peers,
                };
              }
              return torrents;
            },
            {},
          ),
        };
      })
      .value();

    return {
      results: Common.sanitize(results),
      hasMore: true, //data.movie_count > data.page_number * data.limit
    };
  };

  YTS.prototype.fetch = function (filters) {
    var params = {
      sort_by: "seeds",
      limit: 50,
      with_rt_ratings: true,
    };

    if (filters.page) {
      params.page = filters.page;
    }

    if (filters.keywords) {
      params.query_term = filters.keywords;
    }

    if (filters.genre && filters.genre !== "All") {
      params.genre = filters.genre;
    }

    if (filters.order === 1) {
      params.order_by = "asc";
    }

    if (filters.sorter) {
      switch (filters.sorter) {
        case "last added":
          params.sort_by = "date_added";
          break;
        case "last added & google cloud":
          params.sort_by = "google_cloud";
          App.settings["chosenPlayer"] = "googlecloud";
          break;
        case "downloads":
          params.sort_by = "download_count";
          break;
        case "likes":
          params.sort_by = "like_count";
          break;
        default:
          params.sort_by = filters.sorter;
      }
    }

    if (Settings.movies_quality !== "all") {
      params.quality = Settings.movies_quality;
    }

    if (Settings.translateSynopsis) {
      params.lang = Settings.language;
    }

    var defer = Q.defer();

    function get(index) {
      //Convert to axios
      var options = {
        url: Settings.ytsAPI[index].url + "api/v2/list_movies.json",
        params: params,
      };

      win.info("Request to YTS API: " + options.url);

      var req = jQuery.extend(true, {}, Settings.ytsAPI[index], options);

      axios(req)
        .then(function (res) {
          if (res.status >= 400 || (res.data && !res.data.data)) {
            win.warn(
              "YTS API endpoint '%s' failed.",
              Settings.ytsAPI[index].url,
            );
            if (index + 1 >= Settings.ytsAPI.length) {
              return defer.reject(err || "Status Code is above 400");
            } else {
              get(index + 1);
            }
            return;
          } else if (!res.data || res.data.status === "error") {
            err = res.data ? res.data.status_message : "No data returned";
            return defer.reject(err);
          } else {
            return defer.resolve(format(res.data.data));
          }
        })
        .catch(function (error) {
          if (error.response) {
            // The request was made and the server responded with a status code
            // that falls out of the range of 2xx
            win.error(error.response.status);
          } else if (error.request) {
            // The request was made but no response was received
            // `error.request` is an instance of XMLHttpRequest in the browser and an instance of
            // http.ClientRequest in node.js
            win.error(error.request);
          } else {
            // Something happened in setting up the request that triggered an Error
            win.error("Error", error.message);
          }

          //If error state check if another endpoint is available and retry
          if (index + 1 >= Settings.ytsAPI.length) {
            return defer.reject(error.message || "Status Code is above 400");
          } else {
            get(index + 1);
          }
          return;
        });
    }

    //Get Movie list via request
    //get(0);
    get(0);

    return defer.promise;
  };

  /*YTS.prototype.random = function () {
        var defer = Q.defer();

        function get(index) {
            var options = {
                uri: Settings.ytsAPI[index].url + 'api/v2/get_random_movie.json?' + Math.round((new Date()).valueOf() / 1000),
                json: true,
                timeout: 10000
            };
            var req = jQuery.extend(true, {}, Settings.ytsAPI[index], options);
            request(req, function (err, res, data) {
                if (err || res.statusCode >= 400 || (data && !data.data)) {
                    win.warn('YTS API endpoint \'%s\' failed.', Settings.ytsAPI[index].url);
                    if (index + 1 >= Settings.ytsAPI.length) {
                        return defer.reject(err || 'Status Code is above 400');
                    } else {
                        get(index + 1);
                    }
                    return;
                } else if (!data || data.status === 'error') {
                    err = data ? data.status_message : 'No data returned';
                    return defer.reject(err);
                } else {
                    return defer.resolve(Common.sanitize(data.data));
                }
            });
        }
        get(0);

        return defer.promise;
    };*/

  YTS.prototype.detail = function (torrent_id, old_data) {
    return Q(old_data);
  };

  App.Providers.Yts = YTS;
})(window.App);
