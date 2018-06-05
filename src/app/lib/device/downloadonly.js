(function (App) {

    'use strict';
    var collection = App.Device.Collection;

   var Downloadonly = App.Device.Generic.extend({
	   stop: function () {},
   });

    //if (this.model.get('google_video')) {
	collection.add(new Downloadonly({
	    id: 'downloadonly',
	    type: 'download', //icon
	    typeFamily: 'internal',
	    name: 'Download Only'
	}));
    //}
	

App.Device.Downloadonly = Downloadonly;

})(window.App);
