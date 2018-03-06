/*
Javascript Model for explorer
*/

/**
Can we alter result at display time based on current query?
e.g., if we're sorting by last_mod, then that should be displayed ...
*/
var Result = Class.extend ({
	init: function (data) {
		this.data = data;
		this.title = "";
		this.date = "";

        /* turns out last_mod (fgs_lastModifiedDate_dt)
           is not so interesting. must get updated when
           record is indexed??
        */
		this.last_mod = "";
		this.created = "";
	},
	
	// return DOM that represents this Result in the display
	render: function (args) {
		// log ("rendering " + this.title);
		args = args = args || {};
		var wrapper = $('<li>')
		var title = $('<div>')
			.html(this.title)
			.addClass('title')
		var date = $('<div>')
            .addClass('date')
            .html($('<div>')
                .html(this.date))

        if (args.showCreated) {
            date.prepend($('<div>')
                .addClass("created")
                .html(this.created))
        }


		wrapper
			.append(date)
			.append(title)
			
		return wrapper;	
	}
});

var NLDRResult = Result.extend({
		init: function (data) {
			log ('NLDRResult');
			this.data = data;
			this.title = data.general.title.content;
			this.date = data.coverage.date.content;
		}
});

var OSWSCustomResult = Result.extend({
		init: function (data) {
			this.data = data;
			this.title = data.title;
			this.date = data.date;
		}
			
});

/* Response
- get results as a list of Result objects
*/

var Response = Class.extend({
	init: function (data) {
		this.data = data;
		this.numFound = 0;
		this.results = [];
		this.length = 0;
		this.start = 0;
		this.error = this._get_error();
		
		if (!this.error) {
			this.numFound = this._get_numFound();
			this.results = this._get_results();
			this.start = this._get_start();
			this.length = this.results.length;
		}
	},
	
	_get_error: function () {
		var error = null;
		try {
			return this.pluckError();
		} catch (error) {}
		return null;
	},
	
	// EXPLORER-SPECIFIC methods
	pluckResults: function () {
		throw 'not implemented'
	},
	
	pluckFacets: function () {
		throw 'not implemented'
	},
	
	pluckError: function () {
		throw 'not implemented'
	},
	
	pluckNumFound: function () {
		throw 'not implemented'
	},

	pluckStart: function () {
		throw 'not implemented'
	},

	_get_results: function () {
		// log ("_get_results");
		// log (stringify(this.data));
		var json_results = [];
		if (this.numFound) {
			try {
				json_results = this.pluckResults();
				// log (JSON.stringify(json_results, null, 2))
				if (json_results == null) {
					log (stringify (this.data))
					throw "could not parse response into results"
				}
				
				// if this is a single result item turn it into a list
				if (!json_results.length) {
					json_results = [json_results]
				}
			} catch (error) {
				throw ("could not find json_results: " + error);
			}
		}
		
		// DEBUGGING
		if (this.verbose) {
			log (json_results.length + " results found");
		}
		
		return json_results;
	},
	
	_get_numFound: function () {
		var numFound = -1;
		try {
			numFound = this.pluckNumFound()
		} catch (error) {}
		return numFound;
	},

	_get_start: function () {
		var start = -1;
		try {
			start = this.pluckStart()
		} catch (error) {}
		return start;
	},

	_get_facets: function () {
		var json_facets = [];
		try {
			json_facets = this.pluckFacets();
			// log (JSON.stringify(json_facets, null, 2))
			if (json_facets == null)
				return null
			if (!$.isArray(json_facets))
				return [ json_facets ];
		} catch (error) {
			// log ("did not find json_facets: " + error);
			return null;
		}
		
		return json_facets;
	}
})

var OSWSResponse = Response.extend({
		
	init: function (data) {
		this._super(data);
		try {
			this.facets = this._get_facets()
		} catch (error) {
			log ("_get_facets ERROR: " + error);
			this.facets = null;
		}
	},
		
	pluckNumFound: function () {
		return parseInt(this.data.OpenSkyWebService.Search.resultInfo.response.numFound);
	},
	pluckStart: function () {
		return parseInt(this.data.OpenSkyWebService.Search.resultInfo.response.start);
	},
	pluckResults: function () {
		return this.data.OpenSkyWebService.Search.results.result
	},
	pluckFacets: function () {
		return this.data.OpenSkyWebService.Search.facetFields.lst;
	},
	pluckError: function () {
		return this.data.OpenSkyWebService.error; 
	},

})

var NLDRResponse = Response.extend({
	pluckNumFound: function () {
		return parseInt(this.data.DDSWebService.Search.resultInfo.totalNumResults)
	},	
	pluckResults: function () {
		records = this.data.DDSWebService.Search.results.record;
		return $(records).map (function (i, rec) {
				return rec.metadata.record;
		});
	}
})

