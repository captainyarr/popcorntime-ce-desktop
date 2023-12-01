(function (App) {
  "use strict";
  var querystring = require("querystring");
  var request = require("request");
  var Q = require("q");
  var inherits = require("util").inherits;

  var statusMap = {
    0: "Not Airing Yet",
    1: "Currently Airing",
    2: "Ended",
  };

  /*PopcornTime API Reference
    link: https://popcornofficial.docs.apiary.io/
    */
  var URL = "https://anime.api-fetch.sh/";

  var Anime = function () {
    Anime.super_.call(this);
  };

  inherits(Anime, App.Providers.Generic);

  var queryTorrents = function (filters) {
    var deferred = Q.defer();

    var params = {};
    params.sort = "updated";
    params.limit = "50";
    //params.type = 'All';
    params.order = -1;
    params.genre = "all";

    let page = filters.page ? filters.page : 1;

    if (filters.keywords) {
      params.keywords = filters.keywords.replace(/\s/g, "% ");
    }

    var genres = filters.genre;
    if (genres && genres !== "All") {
      params.genre = genres;
    }

    if (filters.sorter && filters.sorter !== "popularity") {
      params.sort = filters.sorter;
    }
    if (filters.sort === "name") {
      params.order * -1;
    }

    switch (filters.order) {
      case 1:
        params.order = 1;
        break;
      case -1:
      /* falls through */
      default:
        params.order = -1;
        break;
    }

    var url =
      URL +
      "animes/" +
      page +
      "?" +
      querystring.stringify(params).replace(/%25%20/g, "%20");
    win.info("Request to Anime API", url);
    request(
      {
        url: url,
        json: true,
      },
      function (error, response, data) {
        if (error || response.statusCode >= 400) {
          deferred.reject(error);
        } else if (!data || (data.error && data.error !== "No movies found")) {
          var err = data ? data.error : "No data returned";
          win.error("API error:", err);
          deferred.reject(err);
        } else {
          deferred.resolve(data);
        }
      },
    );

    return deferred.promise;
  };

  var parseTime = function (duration) {
    var time = duration.match(/(?:([0-9]+) h)?.*?(?:([0-9]+) min)/);
    if (!time) {
      return win.error("couldn't parse time:", time);
    }
    return (time[1] ? time[1] : 0) * 60 + Number(time[2]);
  };

  var formatForPopcorn = function (items) {
    var results = _.map(items, function (item) {
      var img = item.images.banner;
      var type = item.type === "Movie" ? "movie" : "show";
      var ret = {
        images: {
          poster:
            "https://media.kitsu.io/anime/poster_images/" +
            item._id +
            "/large.jpg",
          fanart:
            "https://media.kitsu.io/anime/cover_images/" +
            item._id +
            "/original.jpg",
          banner:
            "https://media.kitsu.io/anime/cover_images/" +
            item._id +
            "/small.jpg",
        },
        mal_id: item.mal_id,
        haru_id: item._id,
        tvdb_id: "mal-" + item._id,
        imdb_id: "mal-" + item._id,
        slug: item.slug.toLowerCase().replace(/\s/g, "-"),
        title: item.title,
        year: item.year.replace(/ to.*/, ""),
        type: item.type,
        item_data: item.type,
      };
      return ret;
    });

    return {
      results: Common.sanitize(results),
      hasMore: true,
    };
  };

  // Single element query
  var queryTorrent = function (torrent_id, prev_data) {
    return Q.Promise(function (resolve, reject) {
      var id = torrent_id.split("-")[1];
      var url = URL + "anime/" + id;

      win.info("Request to Anime API", url);
      request(
        {
          url: url,
          json: true,
        },
        function (error, response, data) {
          var err;
          if (error || response.statusCode >= 400) {
            reject(error);
          } else if (
            !data ||
            (data.error && data.error !== "No data returned")
          ) {
            err = data ? data.error : "No data returned";
            win.error("API error:", err);
            reject(err);
          } else if (data.episodes.length === 0) {
            err = "No torrents returned";
            win.error("API error:", err);
            reject(err);
          } else {
            // we cache our new element
            resolve(formatDetailForPopcorn(data, prev_data));
          }
        },
      );
    });
  };

  var movieTorrents = function (id, dl) {
    var torrents = {};
    _.each(dl, function (item) {
      var qualityMatch = item.quality.match(/[0-9]+p/);
      var quality = qualityMatch ? qualityMatch[0] : null;
      var qualityNumber = quality.replace("p", "");
      if (qualityNumber > 480 && qualityNumber < 1000) {
        quality = "720p";
      } else if (qualityNumber >= 1000 && qualityNumber < 1800) {
        quality = "1080p";
      }
      torrents[quality] = {
        seeds: 0,
        peers: 0,
        magnet: item.magnet,
        health: "good",
      };
    });

    return torrents;
  };

  var showTorrents = function (id, dl) {
    var torrents = {};
    var episodeNb = null;
    _.each(dl, function (item) {
      /*
            var qualityMatch = item.quality.match(/[0-9]+p/);
            var quality = qualityMatch ? qualityMatch[0] : null;
            var qualityNumber = quality.replace('p', '');
            if (qualityNumber > 200 && qualityNumber < 600) {
                quality = '480p';
            } else if (qualityNumber >= 600 && qualityNumber < 1000) {
                quality = '720p';
            } else if (qualityNumber >= 1000 && qualityNumber < 1800) {
                quality = '1080p';
            }
            */
      var episode, tryName;
      let episodeMatch = "Season " + item.season + " - Episode " + item.episode;
      win.debug(episodeMatch);
      //var match = episodeMatch.match(/[\s_]([0-9]+(-[0-9]+)?|CM|OVA)[\s_]/);
      let match = [item.season, item.episode];
      if (!match) {
        tryName = item.title.split(/:?(\(|\[)/);
        if (tryName.length === 1) {
          return;
        }
        if (torrents[episodeNb] && torrents[episodeNb].title === tryName[0]) {
          episode = episodeNb;
        } else {
          episodeNb++;
          episode = episodeNb;
        }
      } else {
        episode = match[1];
      }
      if (!torrents[episode]) {
        torrents[episode] = {
          title: match ? item.title : tryName[0],
          ordered: match ? true : false,
        };
      }
      torrents[item.episode] = _.extend(torrents[item.episode], item.torrents);
      /*
            torrents[episode][quality] = {
                seeds: 0,
                peers: 0,
                url: item.magnet,
                health: 'good'
            };
            */
    });
    return _.map(torrents, function (torrents, s) {
      return {
        title: torrents.ordered ? "Episode " + s : torrents.title,
        torrents: torrents,
        season: 1,
        episode: Number(s.split("-")[0]),
        overview: i18n.__(
          "We still don't have single episode overviews for anime… Sorry",
        ),
        tvdb_id: id + "-1-" + s,
      };
    });
  };

  var formatDetailForPopcorn = function (item, prev) {
    var img = item.images.banner;
    var type = prev.type;
    var genres = item.genres;

    var ret = _.extend(prev, {
      country: i18n.__("Japan"),
      genre: genres,
      genres: genres,
      num_seasons: item.num_seasons,
      runtime: parseTime(item.runtime),
      status: statusMap[item.status],
      synopsis: item.synopsis,
      network: item.producers, //FIXME
      rating: item.rating,
      /*rating: { // FIXME
                hated: 0,
                loved: 0,
                votes: 0,
                percentage: Math.round(item.score) * 10
            },
            images: {
                poster: img,
                fanart: img,
                banner: img
            },
            */
      images: {
        poster:
          "https://media.kitsu.io/anime/poster_images/" +
          item._id +
          "/large.jpg",
        fanart:
          "https://media.kitsu.io/anime/cover_images/" +
          item._id +
          "/original.jpg",
        banner:
          "https://media.kitsu.io/anime/cover_images/" +
          item._id +
          "/small.jpg",
      },
      year: item.year.replace(/ to.*/, ""),
      type: item.type,
    });

    if (type === "movie") {
      ret = _.extend(ret, {
        cover: img,
        rating: item.rating.percentage,
        subtitle: undefined,
        torrents: movieTorrents(item._id, item.episodes),
      });
    } else {
      ret = _.extend(ret, {
        episodes: showTorrents(item._id, item.episodes),
      });
    }

    return Common.sanitize(ret);
  };

  Anime.prototype.extractIds = function (items) {
    return _.pluck(items.results, "haru_id");
  };

  Anime.prototype.fetch = function (filters) {
    return queryTorrents(filters).then(formatForPopcorn);
  };

  Anime.prototype.detail = function (torrent_id, prev_data) {
    return queryTorrent(torrent_id, prev_data);
  };

  App.Providers.Anime = Anime;
})(window.App);
