(function (App) {
  "use strict";

  var FavoriteBrowser = App.View.PCTBrowser.extend({
    collectionModel: App.Model.FavoriteCollection,
    filters: {
      genres: App.Config.genres,
      sorters: App.Config.sorters,
    },
  });

  App.View.FavoriteBrowser = FavoriteBrowser;
})(window.App);
