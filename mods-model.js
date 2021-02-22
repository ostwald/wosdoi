/**
Parse and access MODS name elements and components
*/

var ModsName = Class.extend({
    init: function (name_json) {
        this.json = name_json;
        this.role = this.get_role();
        this.type = getContent(this.json.type);
        this.display = this.get_display();
			this.upid = this.get_upid();

        //  this.report();
        // log (stringify (this.json))
    },

    get_upid: function () {
        var upid = null;
        if (this.json.nameIdentifier) {
            var nids = this.json.nameIdentifier;
            if (!$.isArray(nids)) {
                nids = [nids];
            }
            for (var i=0;i<nids.length;i++) {
                if (nids[i].type && nids[i].type == 'UPID') {
                    return getContent(nids[i]);
                }
            }
        }
    },
    get_role: function () {

        var role = '';
        try {
            var roleTerms = this.json.role.roleTerm;
            if (roleTerms) {
                $(roleTerms).each(function (i, roleTerm) {
                    if (roleTerm.type == 'text') {
                        role = roleTerm.content;
                    }
                })
            }
        } catch (error) {}
        return role;
    },
    get_name_parts: function () {
        var parts = {
            'first':null,
            'last':null,
            'middle':null
        }
        var nameParts = this.json.namePart;
        if (nameParts) {
            $(nameParts).each(function (i, namePart) {
                if (namePart.type == 'given') {
                    if (parts.first)
                        parts.middle = namePart.content;
                    else
                        parts.first = namePart.content;
                }
                if (namePart.type == 'family') {
                    parts.last = namePart.content;
                }
            })
        }

        return parts;
    },

    get_display: function () {
        if (this.type == 'personal') {
            var name_parts = this.get_name_parts();
            if (name_parts.middle)
                return name_parts.first + " " + name_parts.middle + " " + name_parts.last
            else
                return name_parts.first + " " + name_parts.last
        }
        else if (this.type == 'corporate'){
//            log ('- GET_DISPLAY (corp) returning: ' + getContent(this.json.namePart))
//            log ("  - role: " + this.role)
            //log (stringify(this.json))
            return getContent(this.json.namePart);
        }
    },
    report: function () {
        log ("NAME: " + this.display);
        log (" - role: " + this.role);
        log (" - type: " + this.type);
    }
})

var OSWSModsResult = Result.extend({
    init: function (result) {
        // log ("OSWSModsResult")
        this.result = result;
//        slog(result)
        this.PID = getContent(this.result.head.PID);
        this.keyDateYMD = getContent(this.result.head.keyDateYMD);

//        this.doi = getContent(this.result.head.doi);  // old way

        // don't use getContent for DOI, because it strips tags and some
        // DOI's have angle brackets
        try {
            this.doi = this.result.head.doi;
        } catch (error) {
            this.doi = '';
        }

        this.ark = getContent(this.result.head.ark);

        this.nldr = getContent(this.result.head.nldrCitableUrl);
        this.nldrID = this.nldr ? this.nldr.split('/').pop() : "";
        this.mods_error = this.getMetadataError();
        this.mods = result.metadata.mods
        this.last_mod = getContent(this.result.head.lastMod);
        this.created = getContent(this.result.head.created);

        this.title = ''
        this.date = ''
        this.description = ''
        this.genre = ''
        this.title = ''
        this.pub_name = ''

        this.names = []
        this.authors = []

        this.classification = null;
        this.collaboration = null;
        this.collectionKey = null;

        if (this.mods) {
            this.title = this.getTitle() || 'UNKNOWN';
            this.date = this.getDate();
            this.description = this.getModsContent('abstract');
            this.genre = this.getModsContent('genre.content');
            var relatedItems = this.mods.relatedItem;

            var self = this;
            if (relatedItems && relatedItems.length) {
//                log (relatedItems.length + " related items for " + this.PID)
                $(relatedItems).each (function (i, item) {
                    // log (stringify(item));
                    if (item.type == 'host') {
                        self.pub_name = item.titleInfo.title;
                    }
                })
            }

            $(this.mods.name).each (function (i, name_json){
                //log (' - parsing name #' + i)
                //log (' - ' + stringify(name_json))
                if (name_json.type && (name_json.type == 'personal' || name_json.type == 'corporate')) {
                    var modsName = new ModsName(name_json);
                    self.names.push(modsName);
                }
            });

            $(this.names).each (function (i, name){
                if (name.role == 'author')
                    self.authors.push(name);
            });

            var extensions = this.mods.extension;
            if (extensions && extensions.length) {
                $(extensions).each(function (i, extn) {
                    for (var tag in extn) {
                        if (tag == 'osm:classification')
                            self.classification = extn[tag];
                        if (tag == 'osm:collaboration')
                            self.collaboration = extn[tag];
                        if (tag == 'osm:collectionKey')
                            self.collectionKey = extn[tag];
                    }
                })
            }

        }
        else { // we don't have MODS, grab from header
            this.date = this.keyDateYMD
            this.title = getContent(this.result.head.solrLabel);
        }
    },

    isCollection: function () {
        try {
            return isNaN(this.PID.split(':')[1])
        } catch (error) {
            return false;
        }

    },
    /**
    Returns errors contained in the osws response. These are often
    reporting MODS related errors

    Mods errors always have:
    - a message e.g., "no xml-declaration", and
    - a code e.g., "MODS_ERROR"

    the code can be a key into display rendering
    */
    getMetadataError: function () {
        if (!this.result.metadata.error)
            return null;
        var error = this.result.metadata.error
//        try {
//            return getContent(error.message);
//        } catch (error) {}
//        return "Unknown error";
        return error;
    },

    getDate () {
        return this.keyDateYMD;
    },

    /* tests to see if there is a mods and returns empty string
       if not
    */
    getModsContent: function (path) {
        if (this.mods)
            try {
                path = "this.mods."+path
                return getContent(eval (path))
            } catch (error) {
                // often a path we don't care so much about (e.g., 'genre')
                // log ('WARN: ' + this.PID + ' MODS not found for ' + path);
        }
        return "";
    },

    /* NOTE: there can be two titles (one is alt). This is not currently
    handled */
    getTitle() {
        // log ('getTitle: ' + getContent(this.mods.titleInfo.title));
        return this.getModsContent('titleInfo.title');
    },

    render: function (render_args) {
        var wrapper = this._super(render_args);

        wrapper
            .append(this.render_author_names())
            .append ($('<div>')
                .addClass("description")
                .append(this.description.trimToLength(200)))
//				.append ($('<div>')
//				    .addClass("special")
//				    .append(this.collaboration))

            .append (this.render_id_links())

        if (this.isCollection())
            wrapper.prepend (RESULTS.renderErrorMsg (
                'Collection records cannot be displayed', 'COLLECTION'));

        else if (this.mods_error)
            wrapper.prepend (RESULTS.renderError(this.mods_error));

        return wrapper;
    },

    render_author_names: function () {
        var MAX_AUTHORS = 5;
//		    log ('render_author_names (' + this.authors.length + ')');
        var base = $('<div>').addClass ('authors');

        var display_items = $.map (this.authors, function (author, i) {
            if (author.upid)
                return '<span class="ncar-author">'+author.display+'</span>';
            else
                return author.display;
        });

//		    log ("display has " + display_items.length + " items");
        var display;
        if (display_items.length > MAX_AUTHORS) {
            display = display_items.slice(0, MAX_AUTHORS).join(', ') + ', et al.'
        }
        else {
            display = display_items.join(', ');
        }
//		    log ("author display: " + display);
        base.html(display);
        return base;
    },

    // EXPERIMENTAL
    get_result_tabs: function () {
        var uid = new Date().valueOf();
        return tabs = $t('div')
            .addClass('id', uid)
            .addClass('result_tabs')
            .append($t('ul')
                .append($t('li')
                    .append($t('a')
                        .attr('href', '#' + uid + '_mods')
                        .html("MODS")))
                .append ($t('li')
                    .append ($t('a')
                        .attr('href', '#' + uid + '_head')
                        .html("Header"))))
            .append ($t('div')
                .attr('id', uid + '_mods')
                .html("hello mods"))
            .append ($t('div')
                .attr('id', uid + '_head')
                .html("header"))
            .tabs();
    },

    render_id_links: function () {
        // http://osstage2.ucar.edu:8080/solr/core1/select?q=PID:"technotes:531"
        var pid = this.PID

        var pid_text =  $t('span')
                .addClass('pid-text')
                .append ($t ('span')
                    .addClass('pid-label')
                    .html ("PID: "))
                .append ($t ('span')
                    .addClass('pid-value')
                    .html (pid))

        var oai_link = (function() {
            if (!pid)
                return '';
            return $('<div>')
                .addClass('linkable-id oai')
                .html ($t('a')
                    .html("OAI")
                    .attr('href', 'http://opensky.ucar.edu/oai2?verb=GetRecord&metadataPrefix=mods&identifier=' + pid)
                    .attr('target', 'oai')
                    .attr('title', 'See OAI GetRecord response'))
        })();

        var mods_link = (function  () {
            if (!pid)
                return '';
            return $('<div>')
                .addClass('linkable-id fedora')
                .html ($t('a')
                    .html("MODS")
                    .attr('href', OPENSKY_BASE_URL + '/fedora/objects/' + pid + '/datastreams/MODS/content')
                    .attr('target', 'fedora')
                    .attr('title', 'See MODS stream in fedora object'))
        })();

        var fxml_link = (function  () {
            if (!pid)
                return '';
            return $('<div>')
                .addClass('linkable-id fedora')
                .html ($t('a')
                    .html("fxml")
                    .attr('href', OPENSKY_BASE_URL + '/fedora/objects/' + pid + '/objectXML')
                    .attr('target', 'foxml')
                    .attr('title', 'See Fedora FXML for this object'))
        })();

        var dc_link = (function  () {
            if (!pid)
                return '';
            return $('<div>')
                .addClass('linkable-id fedora')
                .html ($t('a')
                    .html("DC")
                    .attr('href', OPENSKY_BASE_URL + '/fedora/objects/' + pid + '/datastreams/DC/content')
                    .attr('target', 'fedora')
                    .attr('title', 'See DC stream in fedora object'))
        }());

        var solr_link = (function () {
            if (!pid)
                return '';
            return $('<div>')
                .addClass('linkable-id pid')
                .html ($t('a')
                    .html("Solr")
                    .click(function (event) {
                        window.open(OPENSKY_BASE_URL + '/solr/core1/select?q=PID:\"' + pid + '\"&fl=' + PREFS.solr_field_paramstring(), 'pid');
                        return false;
                    })
                    .attr('href', '#')
                    .attr('title', 'See Solr record'))
        })();

        var ark = this.ark;
        var opensky_link = (function () {
            // if we are pointed at test instance, do not bother with PID (since it resolves to production opensky)
            if (OPENSKY_BASE_URL == 'http://osstage2test.ucar.edu:8080') {
                return  $('<div>')
                    .addClass('linkable-id ark')
                    .html ($t('a')
                        .html('OpenSky')
                        .attr('href', 'https://osstage2test.ucar.edu/islandora/object/' + pid)
                        .attr('target', 'ark')
                        .attr('title', 'View in OpenSky TEST'))
            }
            if (!ark) {
//                return '';
                var msg = 'This resource does not have an ARK';
                return  $('<div>')
                    .addClass('linkable-id ark')
                    .html ($t('a')
                    .html('OpenSky')
                    .attr('title', msg)
                    .css('cursor', 'not-allowed')
                    .click(function (event) { alert(msg); return false; }))
            }
            return  $('<div>')
                .addClass('linkable-id ark')
                .html ($t('a')
                    .html('OpenSky')
                    .attr('href', 'http://n2t.net/' + ark)
                    .attr('target', 'ark')
                    .attr('title', 'View in OpenSky'))
        }());

        var doi = this.doi;
        var doi_link = (function getDoiLink () {
            if (!doi)
                return ''
            return $('<div>')
                .addClass('linkable-id doi')
                .html ($t('a')
                    .html('Doi: ')
                    .append($('<span>')
                        .html(doi)
                        .css({'white-space': 'nowrap'}))
                    .attr('href', 'https://doi.org/' + doi)
                    .attr('target', 'doi')
                    .attr('title', 'Go to resolved Doi'))
        })();

        var nldr = this.nldrID
        var nldr_link = (function () {
            if (!nldr)
                return;
            return $('<div>')
                .addClass('linkable-id nldr')
                .html ($t('a')
                    .html('NLDR')
                    .attr('href', 'http://nldr.library.ucar.edu/dds/services/ddsws1-1?verb=GetRecord&id=' + nldr)
                    .attr('target', 'nldr')
                    .attr('title', 'See NLDR Webservice response'))
        }());

        function getSpacer () {
            return $t('span').html(" | ");
        };

        var links = $t('div')
            .addClass ('resource-footer')
            .append ($t('div')
                .addClass ('left')
                .append (pid_text)
                .append (doi_link)
            )
            .append($t('div')
                .addClass ('right')
                .append (opensky_link)
                .append (getSpacer())
                .append (mods_link)
                .append (getSpacer())
                .append (fxml_link)
                .append (getSpacer())
                .append (dc_link)
                .append (getSpacer())
                .append (solr_link)
                .append (getSpacer())
                .append (oai_link)
            )

        /*  // NLDR is no longer available
        if (nldr_link) {
            links.find('.right')
                .append (getSpacer())
                .append (nldr_link)
        }
        */

        return links;
    },

    toCvs: function () {
        log ("TO_CSV ...")
        var headers = ['PID', 'date','title']
        self=this;
        var values = $.map(headers, function (col) {
            var val = eval('self.'+col);
            val = val.replace('"', '');
            if (val.indexOf(',') != -1)
                val = '"' + val + '"';
            return val;
        })
        log ("-> " + values.join(', '))
    }
});

