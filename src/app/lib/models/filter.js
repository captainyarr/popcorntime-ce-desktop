(function (App) {
  "use strict";

  var Filter = Backbone.Model.extend({
    defaults: {
      genres: [],
      sorters: [],
      types: [],
      order: -1,
    },

    initialize: function () {
      switch (App.currentview) {
        case "movies":
          this.set(
            "sorter",
            this.get("sorter") ||
              AdvSettings.get("lastSortMovie") ||
              this.get("sorters")[0],
          );
          this.set(
            "genre",
            this.get("genre") ||
              AdvSettings.get("lastGenreMovie") ||
              this.get("genres")[0],
          );
          this.set(
            "type",
            this.get("type") ||
              AdvSettings.get("lastTypeMovie") ||
              this.get("types")[0],
          );
          break;
        case "shows":
          this.set(
            "sorter",
            this.get("sorter") ||
              AdvSettings.get("lastSortTV") ||
              this.get("sorters")[0],
          );
          this.set(
            "genre",
            this.get("genre") ||
              AdvSettings.get("lastGenreTV") ||
              this.get("genres")[0],
          );
          this.set(
            "type",
            this.get("type") ||
              AdvSettings.get("lastTypeTV") ||
              this.get("types")[0],
          );
          break;
        case "anime":
          this.set(
            "sorter",
            this.get("sorter") ||
              AdvSettings.get("lastSortAnime") ||
              this.get("sorters")[0],
          );
          this.set(
            "genre",
            this.get("genre") ||
              AdvSettings.get("lastGenreAnime") ||
              this.get("genres")[0],
          );
          this.set(
            "type",
            this.get("type") ||
              AdvSettings.get("lastTypeAnime") ||
              this.get("types")[0],
          );
          break;
        default:
          this.set(
            "sorter",
            this.get("sorter") ||
              AdvSettings.get("lastSortMovie") ||
              this.get("sorters")[0],
          );
          this.set(
            "genre",
            this.get("genre") ||
              AdvSettings.get("lastGenreMovie") ||
              this.get("genres")[0],
          );
          this.set(
            "type",
            this.get("type") ||
              AdvSettings.get("lastTypeMovie") ||
              this.get("types")[0],
          );
      }
      this.set("order", this.get("order") || -1);
    },
  });

  App.Model.Filter = Filter;
})(window.App);
