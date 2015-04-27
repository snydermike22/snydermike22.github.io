$(document).ready(function(){
    $(window).scrollTop(0);
});

function AppViewModel() {

	var self = this;
	var map,
		mapOptions,
		placeLat,
		placeLon,
		venueName,
		bounds,
		service,
		marker,
		newNeighborhood,
		infowindow;

	var venueMarkers = [];
	var defaultNeighborhood = 'Connecticut';
	var days = ['SUN','MON','TUE','WED','THU','FRI','SAT'];

	self.exploreKeyword = ko.observable(''); // explore neighborhood keywords
	self.neighborhood = ko.observable(defaultNeighborhood);	// neighborhood location
	self.formattedAddress = ko.observable('');	// formatted neighborhood location address
	self.topPicks = ko.observableArray('');	// most popular foursquare picks depending on neighborhood keywords and location
	self.currentlyForecasts = ko.observable(''); // current weather forecast
	self.photosAPIurl = ko.observableArray(''); // foursquare photos urls
	self.selectedVenue = ko.observable(''); // selected venue info
	self.chosenMarker = ko.observable(''); // selected marker info
	self.displayVenuesList = ko.observable('false'); // boolean value fore venues list display

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


  	// format and return most popular venues data 
  	// error handlings if no data is found
  	self.computedTopPicks = ko.computed(function() {
  		var tempTopPicks = self.topPicks();

  		for (var i in tempTopPicks) {

  			var photoPrefix = 'https://irs0.4sqi.net/img/general/';

  			if (!tempTopPicks[i].venue.contact.formattedPhone) {
  				tempTopPicks[i].formatedContact = 'No contact available';
  			}else{
  				tempTopPicks[i].formatedContact = tempTopPicks[i].venue.contact.formattedPhone;
  			}

  			if (!tempTopPicks[i].tips) {
  				tempTopPicks[i].formatedTip = 'No reviews available';
  			}else{
  				tempTopPicks[i].formatedTip = tempTopPicks[i].tips[0].text;
  			}

  			if (!tempTopPicks[i].venue.url) {
  				tempTopPicks[i].formatedUrl = 'No website available';
  			}else{
  				tempTopPicks[i].formatedUrl = tempTopPicks[i].venue.url;
  			}

  			if (!tempTopPicks[i].venue.rating) {
  				tempTopPicks[i].venue.formatedRating = '0.0';
  			}else{
  				tempTopPicks[i].venue.formatedRating = tempTopPicks[i].venue.rating;
  			}

  			if (tempTopPicks[i].venue.featuredPhotos){
  				var photoSuffix = tempTopPicks[i].venue.featuredPhotos.items[0].suffix;
  				photoFullURL = photoPrefix + 'width100' + photoSuffix;
  			}
 						
  			tempTopPicks[i]['photoFullURL'] = photoFullURL;

  		}
  		return tempTopPicks;
  	});


	// updates City and NY Times information after input into field
	self.computedNeighborhood = function() {
		if (self.neighborhood() != '') {
			if (venueMarkers.length > 0)
				removeVenueMarkers();
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



	// when user update neighborhood address in input bar,
	// update displays for map, and popular venues
	self.neighborhood.subscribe(self.computedNeighborhood);	

	// when user update explore keyword in input bar,
	// update displays for map, and popular venues
	self.exploreKeyword.subscribe(self.computedNeighborhood);

	/**
 	 * When venue item is clicked in venues listing,
 	 * panto the venue marker on map, display infowindow, 
 	 * start marker bounce animation
 	 * @param {Object} venue A clicked venue object in venues list
 	 * @return {void}
 	 */ 
	self.panToMarker = function(venue) {
		var venueInfo = setVenueInfowindow(venue.venue);

		for (var i in venueMarkers) {
			if (venueMarkers[i].title === venueInfo.venueName) {
				self.chosenMarker(venueMarkers[i]);
				self.selectedVenue(venueInfo.venueID);
				infowindow.setContent(venueInfo.contentString);
				infowindow.open(map, venueMarkers[i]);
				map.panTo(venueMarkers[i].position);
				selectedMarkerBounce(venueMarkers[i]);
			}
		}
	}

	// empty venuMarkers array, remove all venue markers on map
	// this function gets called once neighborhood keywords or address is updated
	function removeVenueMarkers() {
	    for (var i = 0; i < venueMarkers.length; i++) {

    		venueMarkers[i].setMap(null);

		}

		venueMarkers = [];
	}

	function getNeighborhoodVenues(place) {
		infowindow = new google.maps.InfoWindow();
		placeLat = place.geometry.location.k;
		placeLon = place.geometry.location.D;
		venueName = place.name;
		var formattedVenueAddress = place.formatted_address; 
		self.formattedAddress(formattedVenueAddress);
		newNeighborhood = new google.maps.LatLng(placeLat, placeLon);
		map.setCenter(newNeighborhood);

		// create one marker for neighborhood address user input
//		createNeighborhoodMarker(place);

		// get nearby venues based on explore keywords and neighborhood address
		getFoursquareData(); 	

		// get forecast data
		getForecastData();

		// disable marker animation when infowindow is closed
		google.maps.event.addListener(infowindow, 'closeclick', function() {  
    		self.chosenMarker().setAnimation(null); 
		});

	};

	/**
 	 * Get best nearby neighborhood venues data from foursquare API,
 	 * retrieve foursquare venue photos
 	 * create 2D array to store foursquare venue photos data
 	 * set venue photos groups for swipebox lightbox display
 	 * create venues markers on map
 	 * @return {void}
 	 */
	function getFoursquareData() {
		var foursquareBaseURL = 'https://api.foursquare.com/v2/venues/explore?';
  		var foursquareID = 'client_id=S2EMNUJJK1YLQSOOZRAUCDAGAJBYPKUQ0LJ22YGXNIKJ3Q2E&client_secret=S1SC00UAMLUAI5D3NYIM1K10QPQR4BINK4LBFZLZRGQYFRLM';
  		var neighborhoodLL = '&ll=' + placeLat + ',' + placeLon;
  		var query = '&query=' + self.exploreKeyword();
  		var foursquareURL = foursquareBaseURL + foursquareID + '&v=20130815&venuePhotos=1' + neighborhoodLL + query;
  		$.ajax({
  			url: foursquareURL, 
  			dataType:'jsonp',
  			success: function(data) {
  				self.topPicks(data.response.groups[0].items);
				var venueImgsURLlist = []; // keep a list of all venues photo urls
				var venueIDlist = []; // keep a list of all venues ID

				// retrieve and set venue photo url to get photos for each venue
				for(var i in self.topPicks()) {
					var baseImgsURL = 'https://api.foursquare.com/v2/venues/';
					var venueID = self.topPicks()[i].venue.id;
					var venueName = self.topPicks()[i].venue.name;
					var venueImgsURL = baseImgsURL + venueID + '/photos?' + foursquareID + '&v=20130815';
					venueImgsURLlist.push(venueImgsURL);
					venueIDlist.push(venueID);
				}

	      		// create venue markers
	      		for (var i in self.topPicks()) {

	        		createVenueMarker(self.topPicks()[i].venue);
	      		}

	      		// set bounds according to suggestedBounds from foursquare data resonse
	      		var tempBounds = data.response.suggestedBounds;
		      	if (tempBounds != undefined) {
			        bounds = new google.maps.LatLngBounds(
			        	new google.maps.LatLng(tempBounds.sw.lat, tempBounds.sw.lng),
			        	new google.maps.LatLng(tempBounds.ne.lat, tempBounds.ne.lng));
			        map.fitBounds(bounds);
		      	}
      		}	     		
      	});
	}


	// get forecasts data from forecast.io API 
	function getForecastData() {
		
      	var forecastBaseURL = 'https://api.forecast.io/forecast/';
		var forecastAPIkey = '86f23490cf06571a502e3fe671ad188d';
		var formattedLL = '/'+ placeLat + ',' + placeLon;
		var forecastURL = forecastBaseURL + forecastAPIkey + formattedLL;

		$.ajax({
			url: forecastURL,
			dataType: 'jsonp',
			success: function(data) {
				self.currentlyForecasts(data.currently);
			}
		});
	}

	
//  set a venue's marker infowindow

	function setVenueInfowindow(venue) {
		var lat = venue.location.lat;
		var lng = venue.location.lng;
		var venueName = venue.name;
		var venueID = venue.id;
		var venueCategory = venue.categories[0].name;
		var venuePosition = new google.maps.LatLng(lat, lng);
		var venueAddress = venue.location.formattedAddress;
		var venueContact = venue.contact.formattedPhone;
		var foursquareUrl = "https://foursquare.com/v/" + venue.id;
		var venueRating = venue.rating;
		var venueUrl = venue.url;

		if (!venueContact)
			venueContact = 'Contact not available';
		if (!venueUrl)
			venueUrl = 'Website not available';
		if (!venueRating)
			venueRating = '0.0';


		var contentString = '<div class="venue-infowindow">' 
							+ '<div class="venue-name">'
							+ '<a href ="' + foursquareUrl + '">'
							+ venueName
							+ '</a>'
							+ '<span class="venue-rating badge">'
							+ venueRating
							+ '</span>'
							+ '</div>'
							+ '<div class="venue-category"><span></span>'
							+ venueCategory
							+ '</div>'
							+ '<div class="venue-address"><span></span>'
							+ venueAddress
							+ '</div>'
							+ '<div class="venue-contact"><span></span>'
							+ venueContact
							+ '</div>'  
							+ '<div class="venue-url"><span></span>'
							+ venueUrl
							+ '</div>'  						    						    						
							+ '</div>';
		return	{
					'venueName': venueName,
					'contentString': contentString,
					'venueID': venueID,
					'venuePosition': venuePosition
				}

	}


// 	 create a venue marker on map and bounce

 
	function createVenueMarker(venue) {

		var venueInfo = setVenueInfowindow(venue);

		var venueMarker = new google.maps.Marker({
		  	map: map,
		  	position: venueInfo.venuePosition,
		  	title: venueInfo.venueName
		});
	    
		google.maps.event.addListener(venueMarker, 'click', function() {
	    	
			document.getElementById(venueInfo.venueID).scrollIntoView();
			var clickEvent = jQuery.Event('click');
			clickEvent.stopPropagation();
			$('#' + venueInfo.venueID).closest(".venue-listing-item").trigger('clickEvent');
			self.selectedVenue(venueInfo.venueID);
			infowindow.setContent(venueInfo.contentString);
			infowindow.open(map, venueMarker);
			selectedMarkerBounce(venueMarker);
			map.panTo(venueInfo.venuePosition);
		});

		venueMarkers.push(venueMarker);

	}

	/**
 	 * if this marker has no animation, disable other marker's animation
 	 * set this marker's animation to bounce
	 * @param {Object} venueMarker A venue marker object 
 	 * @return {void}
 	 */
	function selectedMarkerBounce(venueMarker) {
		if (venueMarker.getAnimation() == null) {
			self.chosenMarker(venueMarker);
			venueMarkers.forEach(function(marker) {
				marker.setAnimation(null);
			});
			
			venueMarker.setAnimation(google.maps.Animation.BOUNCE);
		}
	}

	// callback(results, status) makes sure the search returned results for a location.
	// if so, get and update neighborhood venues 
	function getNeighborhoodCallback(results, status) {

	    if (status == google.maps.places.PlacesServiceStatus.OK) {

	      	getNeighborhoodVenues(results[0]);

	    }
	}

	/**
 	 * get neighborhood data for the app
 	 * this function gets called when explore keywords or 
 	 * neighborhood location gets updates
	 * @param {string} neighborhood A neighborhood location retrieved from user input
 	 * @return {void}
 	 */
	function getNeighborhood(neighborhood) {

		// the search request object
		var request = {
			query: neighborhood
		};

		// creates a Google place search service object. 
		// PlacesService does the work of searching for location data.
		service = new google.maps.places.PlacesService(map);
		// searches the Google Maps API for location data and runs the callback 
      	// function with the search results after each search.
		service.textSearch(request, getNeighborhoodCallback);

	}

	// initliaze neighborhood data when application is load
	function initializeNeighborhood(neighborhood) {
		getNeighborhood(neighborhood);
	}

	// function that initializes the application map
	function initializeMap() {
		mapOptions = {
			zoom: 15,
			disableDefaultUI: true
		};

		map = new google.maps.Map(document.getElementById('map-canvas'), mapOptions);
		
		$('#map-canvas').height($(window).height());
	};

	// initialize map
	initializeMap();

	// initialize neighborhood
	initializeNeighborhood(defaultNeighborhood);

	// the map bounds is updated when page resizes
	window.addEventListener('resize', function(e) {
    	
		map.fitBounds(bounds);
    	
		$('#map-canvas').height($(window).height());
	});

};

// initialize AppViewModel 
$(function() {

	ko.applyBindings(new AppViewModel());


});

