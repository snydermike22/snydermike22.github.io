
var Venue = function(data, foursquareID) {
	
	this.id = data.venue.id;
	this.name = data.venue.name;
	this.lat = data.venue.location.lat;
	this.lon = data.venue.location.lng;
	this.formattedAddress = data.venue.location.formattedAddress;
	this.categories = data.venue.categories[0].name;
	this.foursquareUrl = "https://foursquare.com/v/" + this.id;
	this.photoAlbumn = [];
	this.marker = {};
	this.photoPrefix = 'https://irs0.4sqi.net/img/general/';
	this.photoPlaceHolder = 'http://placehold.it/100x100';
	this.photoSuffix;
	this.basePhotoAlbumnURL = 'https://api.foursquare.com/v2/venues/';
	this.photoAlbumnURL = this.getPhotoAlbumnURL(data, foursquareID);
	this.formattedPhone = this.getFormattedPhone(data);
	this.tips = this.getTips(data);
	this.url = this.getUrl(data);
	this.rating = this.getRating(data);
	this.featuredPhoto = this.getFeaturedPhoto(data);

}


Venue.prototype = {

	getPhotoAlbumnURL: function(data, foursquareID) {
		return this.basePhotoAlbumnURL + this.id + '/photos?' + foursquareID + '&v=20130815';
	},

	getFormattedPhone: function(data) {
		if ( !data.venue.contact.formattedPhone )
			return 'Contact Not Available';
		else
			return data.venue.contact.formattedPhone;
	},

	getTips: function(data) {
		if ( !data.tips )
			return 'Tips Not Available';
		else
			return data.tips[0].text;
	},

	getUrl: function(data) {
		if ( !data.venue.url )
			return 'Website Not Available';
		else
			return data.venue.url;
	},

	getRating: function(data) {
		if ( !data.venue.rating )
			return '0.0';
		else
			return data.venue.rating;
	},

	getFeaturedPhoto: function(data) {
		if ( !data.venue.featuredPhotos )
			return this.photoPlaceHolder;
		else {
			this.photoSuffix = data.venue.featuredPhotos.items[0].suffix;
  			return this.photoPrefix + 'width100' + this.photoSuffix;
		}
	}
}

function AppViewModel() {

	var self = this;
	var map,
		mapOptions,
		placeLat,
		placeLon,
		bounds,
		service,
		marker,
		infowindow;

	var venueMarkers = [];
	var defaultExploreKeyword = 'best nearby';
	var defaultNeighborhood = 'Connecticut';
	var months = ['January','February','March','April','May','June','July','August','September','October','November','December'];

	self.exploreKeyword = ko.observable(''); 
	self.neighborhood = ko.observable(defaultNeighborhood);	
	self.formattedAddress = ko.observable('');	
	self.topPicks = ko.observableArray('');	
	self.currentlyForecast = ko.observable(''); 
	self.selectedVenue = ko.observable(''); 
	self.selectedMarker = ko.observable(''); 
	self.displayForecastsList = ko.observable('false'); 
	self.displayVenuesList = ko.observable('false'); 

// NY Times
	var $nytHeaderElem = $('#nytimes-header');
	var $nytElem = $('#nytimes-articles');
	$nytHeaderElem.text('New York Times Articles About ' + defaultNeighborhood);


	var nytimesURL = 'http://api.nytimes.com/svc/search/v2/articlesearch.json?q=' + defaultNeighborhood + '&sort=newest&api-key=a36d6720b0e6e27fde6b20dc77045c40:0:71510927';

	$.getJSON(nytimesURL, function(data) {

    articles = data.response.docs;
    for (var i = 0; i < articles.length; i++) {
        var article = articles[i];
        $nytElem.append('<li class="article">' + '<a href="'+article.web_url+'">'+article.headline.main+'</a>' + '<p>' + article.snippet + '</p>' + '</li>');
    };

}).error(function(e) {
    $nytHeaderElem.text('New York Times Articles Could Not Be Loaded');
});


	Date.prototype.getMonthName = function() {
		return months[ this.getMonth() ];
	};


	
  	ko.bindingHandlers.afterHtmlRender = {
		update: function(el, va, ab) {
			ab().html && va()(ab().html);
		}
	}


	self.updateVObservable = function() {
		self.displayVenuesList(!self.displayVenuesList());
	}

	self.computedNeighborhood = function() {

		if (!isEmpty(self.neighborhood())) {
			removeVenueMarkers();
			self.topPicks([]);
			getNeighborhood(self.neighborhood());
			$nytHeaderElem.text('New York Times Articles About ' + (self.neighborhood()));


			var nytimesURL = 'http://api.nytimes.com/svc/search/v2/articlesearch.json?q=' + self.neighborhood() + '&sort=newest&api-key=a36d6720b0e6e27fde6b20dc77045c40:0:71510927';
			$nytElem.text("");
			$.getJSON(nytimesURL, function(data) {

    		articles = data.response.docs;
    			for (var i = 0; i < articles.length; i++) {
        		var article = articles[i];
        		$nytElem.append('<li class="article">' + '<a href="'+article.web_url+'">'+article.headline.main+'</a>' + '<p>' + article.snippet + '</p>' + '</li>');
   					};
   		}).error(function(e) {
    $nytHeaderElem.text('New York Times Articles Could Not Be Loaded');
});	
		} 
		
	};


	function isEmpty(input) {
		return (input.length === 0 || !input.trim());
	}

	self.neighborhood.subscribe(self.computedNeighborhood);	
	self.exploreKeyword.subscribe(self.computedNeighborhood);


	self.panToMarker = function(venue) {

		var venueInfowindowStr = setVenueInfowindowStr(venue);
		var venuePosition = new google.maps.LatLng(venue.lat, venue.lon);

		self.selectedMarker(venue.marker);
		self.selectedVenue(venue.id);
		infowindow.setContent(venueInfowindowStr);
		infowindow.open(map, venue.marker);
		map.panTo(venuePosition);
		selectedMarkerBounce(venue.marker);

	}


	function removeVenueMarkers() {

		// clear current neighborhood marker
		self.currentNeighborhoodMarker.setMap(null);

		// clear all venues' markers
		self.topPicks().forEach(function(venueItem) {
			venueItem.marker.setMap(null);
			venueItem.marker = {};
		});

	}


	function createNeighborhoodMarker(place) {

		var placeName = place.name;

		// create a red star
		var blackStar = {
		    path: 'M 125,5 155,90 245,90 175,145 200,230 125,180 50,230 75,145 5,90 95,90 z',
		    fillColor: 'red',
		    fillOpacity: 1,
		    scale: 0.1
		};

	
		var marker = new google.maps.Marker({
			map: map,
			position: place.geometry.location,
			title: placeName,
			icon: blackStar
		});


		google.maps.event.addListener(marker, 'click', function() {
			infowindow.setContent(placeName);
			infowindow.open(map, marker);
		});


		self.currentNeighborhoodMarker = marker; 

	}


	function getNeighborhoodVenues(place) {

		infowindow = new google.maps.InfoWindow();
		placeLat = place.geometry.location.lat();
		placeLon = place.geometry.location.lng();
		self.formattedAddress(place.formatted_address);
		var newNeighborhood = new google.maps.LatLng(placeLat, placeLon);
		map.setCenter(newNeighborhood);
		createNeighborhoodMarker(place);
		getFoursquareData(); 	
		getForecastData();
		google.maps.event.addListener(infowindow, 'closeclick', function() {  
		self.selectedMarker().setAnimation(null); 
		});

	};


 	function getFoursquareData() {

		var foursquareBaseURL = 'https://api.foursquare.com/v2/venues/explore?';
  		var foursquareID = 'client_id=S2EMNUJJK1YLQSOOZRAUCDAGAJBYPKUQ0LJ22YGXNIKJ3Q2E&client_secret=S1SC00UAMLUAI5D3NYIM1K10QPQR4BINK4LBFZLZRGQYFRLM';
  		var neighborhoodLL = '&ll=' + placeLat + ',' + placeLon;
  		var query = '&query=' + self.exploreKeyword();
  		var foursquareURL = foursquareBaseURL + foursquareID + '&v=20130815&venuePhotos=1' + neighborhoodLL + query;

  		$.ajax({
  			url: foursquareURL, 
 
  			success: function(data) {

  				var initialFoursquareData = data.response.groups[0].items;
					initialFoursquareData.forEach(function(venueItem) {
  					self.topPicks.push( new Venue(venueItem, foursquareID) );
  				});
				

				self.topPicks().forEach(function(venueItem) { 
					setPhotoAlbumns(venueItem);
					createVenueMarker(venueItem);
				});


				var tempBounds = data.response.suggestedBounds;
				if (tempBounds != undefined) {
					bounds = new google.maps.LatLngBounds(
						new google.maps.LatLng(tempBounds.sw.lat, tempBounds.sw.lng),
						new google.maps.LatLng(tempBounds.ne.lat, tempBounds.ne.lng));
					map.fitBounds(bounds);
				}
			},
			complete: function() {
				if(self.topPicks().length === 0)
				 	$('#foursquare-API-error').html('<h2>No result available.</h2><h2>Please change your keywords.</h2>');
			},
      		error: function( data ) {
      			$('#foursquare-API-error').html('<h2>There are errors when retrieving venue data. Please try refresh page later.</h2>');
      		}	     		
		});
	}
 
 	 function setPhotoAlbumns (venueItem) {

		var baseImgURL = 'https://irs3.4sqi.net/img/general/'; // base url to retrieve venue photos

		$.ajax({
			url: venueItem.photoAlbumnURL,
			dataType: 'jsonp',
			success: function(data) {

				var imgItems = data.response.photos.items;


				for (var i in imgItems) {
					var venueImgURL = baseImgURL + 'width800' + imgItems[i].suffix;
					var venueImgObj = {
						href: venueImgURL,
						title: venueItem.name
					};

					venueItem.photoAlbumn.push(venueImgObj);
				}
			},

      		error: function( data ) {
      			$('#foursquare-API-error').html('<h2>There are errors when retrieving venue photo albumns. Please try refresh page later.</h2>');
      		}
		});

  		var venueAlbumnID = '#' + venueItem.id;
  		

		$(venueAlbumnID).click(function( e ) {
			e.preventDefault();
			$.swipebox(venueItem.photoAlbumn);
		});
	}


	function getForecastData() {
		
      	var forecastBaseURL = 'https://api.forecast.io/forecast/';
		var forecastAPIkey = '86f23490cf06571a502e3fe671ad188d';
		var formattedLL = '/'+ placeLat + ',' + placeLon;
		var forecastURL = forecastBaseURL + forecastAPIkey + formattedLL;

		$.ajax({
			url: forecastURL,
			dataType: 'jsonp',
			success: function(data) {

				var initialForecastDailyData = data.daily.data;
					initialForecastDailyData.forEach(function(forecastItem){

				});

				self.currentlyForecast(data.currently);
			},

      		error: function( data ) {
      			$('.current-temp-box').html('<p>Error retrieving forecast data! Try refresh page later.</p>');
      			$('#forecast-API-error').html('<h2>There are errors when retrieving forecast data. Please try refresh page later.</h2>' 
      											+ '<p>Status: ' + data.status + '</p>'
      											+ '<p>Error Type: ' + data.statusText + '</p>');
      		}
		});
	}


	function setVenueInfowindowStr(venue) {
			var contentString = '<div class="venue-infowindow">' 
							+ '<div class="venue-name">'
							+ '<a href ="' + venue.foursquareUrl + '">'
							+ venue.name
							+ '</a>'
							+ '<span class="venue-rating badge">'
							+ venue.rating
							+ '</span>'
							+ '</div>'
							+ '<div class="venue-category">'
							+ venue.categories
							+ '</div>'
							+ '<div class="venue-address">'
							+ venue.formattedAddress
							+ '</div>'
							+ '<div class="venue-contact">'
							+ venue.formattedPhone
							+ '</div>'  
							+ '<div class="venue-url">'
							+ venue.url
							+ '</div>'  						    						    						
							+ '</div>';

		return	contentString;

	}


	function createVenueMarker(venue) {
		var venueInfowindowStr = setVenueInfowindowStr(venue);
		var venuePosition = new google.maps.LatLng(venue.lat, venue.lon);
		var venueMarker = new google.maps.Marker({
		  	map: map,
		  	position: venuePosition,
		  	title: venue.name
		});
	    

		google.maps.event.addListener(venueMarker, 'click', function() {
	    	

			document.getElementById(venue.id).scrollIntoView();
			var clickEvent = jQuery.Event('click');
			clickEvent.stopPropagation();

			$('#' + venue.id).closest(".venue-listing-item").trigger('clickEvent');

			self.selectedVenue(venue.id);

			infowindow.setContent(venueInfowindowStr);

			infowindow.open(map, venueMarker);

			selectedMarkerBounce(venueMarker);

			map.panTo(venuePosition);
		});


		venue.marker = venueMarker;

	}


	function selectedMarkerBounce(venueMarker) {

		if (venueMarker.getAnimation() == null) {

			self.selectedMarker(venueMarker);

			self.topPicks().forEach(function(venue) {
				venue.marker.setAnimation(null);
			});

			venueMarker.setAnimation(google.maps.Animation.BOUNCE);
		}
	}


	function getNeighborhoodCallback(results, status) {


		if (status != google.maps.places.PlacesServiceStatus.OK) {
    		$('#googleMap-API-error').html('<h2>There are errors when retrieving map data.</h2><h2>Please try refresh page later.</h2>'); 
    		return;
  		}

		if (status == google.maps.places.PlacesServiceStatus.OK) {

			getNeighborhoodVenues(results[0]);

	    }
	}


	function getNeighborhood(neighborhood) {


		var request = {
			query: neighborhood
		};

		service = new google.maps.places.PlacesService(map);

		service.textSearch(request, getNeighborhoodCallback);

	}


	function initializeNeighborhood(neighborhood) {
		getNeighborhood(neighborhood);
	}

	function initializeMap() {

		mapOptions = {
			zoom: 15,
			disableDefaultUI: true
		};

		if (typeof google == 'undefined') {
        	$('#googleMap-API-error').html('<h2>There are errors when retrieving map data.</h2><h2>Please try refresh page later.</h2>'); 
    		return;
    	}

		map = new google.maps.Map(document.getElementById('map-canvas'), mapOptions);
		
		$('#map-canvas').height($(window).height());

	};


	window.addEventListener('resize', function(e) {
    	
		map.fitBounds(bounds);
    	
		$('#map-canvas').height($(window).height());
	});


	initializeMap();

	initializeNeighborhood(defaultNeighborhood);

};

$(function() {

	ko.applyBindings(new AppViewModel());

});
