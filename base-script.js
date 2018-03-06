function log (s) {
	if (window.console)
		console.log(s)
}

function stringify (json) {
	return JSON.stringify(json,null,2)
}

function slog(s) {
    log(stringify(s));
}

var PARAMS;

/**
 * obtained from https://gist.github.com/kares/956897
 * modified to accept whole URL
 */
(function($) {
    var re = /([^&=]+)=?([^&]*)/g;
    var decode = function(str) {
        return decodeURIComponent(str.replace(/\+/g, ' '));
    };
    $.parseParams = function(query) {
        var params = {}, e;

        if (!query)
            return params;

        var i = query.indexOf('?');
        if (i != -1)
            query = query.substring(i+1);

        if (query) {
            if (query.substr(0, 1) == '?') {
                query = query.substr(1);
            }

            while (e = re.exec(query)) {
                var k = decode(e[1]);
                var v = decode(e[2]);
                if (params[k] !== undefined) {
                    if (!$.isArray(params[k])) {
                        params[k] = [params[k]];
                    }
                    params[k].push(v);
                } else {
                    params[k] = v;
                }
            }
        }
        return params;
    };
//    log ("$.parseParams defined");
})(jQuery);

(window.onpopstate = function () {
    PARAMS = $.parseParams(window.location.search.substring(1));
})();

String.prototype.trimToLength = function(m) {
  return (this.length > m) 
    ? jQuery.trim(this).substring(0, m).split(" ").slice(0, -1).join(" ") + "..."
    : this;
};

var SCRIPT_REGEX = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi;
// var SCRIPT_REGEX = /<script\\\b[^<]*(?:(?!<\\\/script>)<[^<]*)*<\\\/script>/gi;

/* see http://stackoverflow.com/questions/6659351/removing-all-script-tags-from-html-with-js-regular-expression */
function stripScripts (text) {
	while (SCRIPT_REGEX.test(text)) {
		text = text.replace(SCRIPT_REGEX, "");
	}
	return text;
}

var TAG_REGEX = /<[^>]+>/ig;
	
/* see https://css-tricks.com/snippets/javascript/strip-html-tags-in-javascript/ */
function stripTags(input) {
	if (input) {
		if (!$.isArray(input)) {
			input = input.replace(TAG_REGEX,"");
		}
		else {
			var i = input.length;
			var newInput = new Array();
			while(i--) {
				input[i] = input[i].replace(TAG_REGEX,"");
			}
		}
		return input;
	}
	//return false;
	return '';
}



function isString(obj) {
	return $.type(obj) === 'string';
}

function sanitize (s) {
	return stripTags(stripScripts(s));
}
/**
Tries to parse as YYYY-MM-DD, returns the input datestr if not successfull
*/
function normalizeDateInput (datestr) {
    log ("normalizeDateInput: " + datestr)
    if (datestr == '*' || datestr == null || datestr.trim() == "")
        return '*';
    datestr = sanitize(datestr)
    var pats = [/([\d]{4})-([\d]{2})-([\d]{2})/, /([\d]{4})-([\d]{2})/, /([\d]{4})/]
    var match = null;
    for (var i=0;i<pats.length;i++) {
        match = pats[i].exec(datestr)
        if (match) {
//            log ("match: " + match)
            break;
        }
    }
    if (match) {
//        log ('mATCH: ' + match)
        try {
            var datespec = []

            for (var i=1;i<match.length;i++) {
                var val = parseInt(match[i])
                if (i == 2)
                    val = val - 1;
                datespec.push(val)
            }

//            log ("DATESPEC (" + datespec.length + ") : " + datespec)
            var m = moment (datespec)
            return m.format('YYYY-MM-DD');
        } catch (error) {
            log ("WARN: could not normalize datestr: " + datestr + ": " + error)
        }
    }
//    return datestr;
    throw ("could not parse input as date (" + datestr + ")");
}


// Handle json paths for repeating fields, fields with content (e.g. xml attributes), dc variations:
/* ported from DDS service JS client which used prototype */
function getContent(path,maxElms,matchesRegex) {
	try{	
		var value = '';
		
		// If a single object:
		if(!path)
			value = '';
		else if(isString(path))
			value = sanitize(path)
		else if(path.content && isString(path.content))
			value = sanitize(path.content);
		if(matchesRegex && !matchesRegex.test(value))
			value = '';
		
		// If multiple objects:		
		if($.isArray(path)) {
			value = '';
			for(var i in path) {
				var pathEle = path[i];
				var str = null;
				if(isString(pathEle))
					str = pathEle.strip();
				else if(pathEle.content && isString(pathEle.content))
					str = pathEle.content.strip();
				if(str != null && str.length > 0 && (!matchesRegex || matchesRegex.test(str))) {
					if(maxElms && maxElms == 1)
						value = sanitize(str);
					else
						value += '<div style="margin-bottom: 4px;">'+sanitize(str)+' </div>';
					
					if(maxElms && i+1 >= maxElms)
						break;				
				}			
			}
		}
		// log("getContent() returing: '" + value + "'");
		return value;
	} catch (e) {
		log("getContent() error: " + e);
		return '';
	}
}

var flash_message = function (msg_el) {
    msg_el = $(msg_el).hide();;

	function showMsg (msg, args) {
		args = args || {}

		if (args.error)
			msg_el.addClass('error');
		else
			msg_el.removeClass('error');
		msg_el
			.html (msg)
			.fadeIn();

		if (args.duration) {
			setTimeout (hideMsg, args.duration);
		}
	}
	function hideMsg () {
		msg_el
			.fadeOut();
	}

	return {
	    hide: hideMsg,
	    show: showMsg
	}
}

/* see http://codetheory.in/javascript-copy-to-clipboard-without-flash-using-cut-and-copy-commands-with-document-execcommand/ */
function CopyToClipboard(obj) {
	obj = $(obj)
	log ("OBJ tagName: " + obj.prop('tagName'));
	var tag = obj.prop('tagName')
	if (tag == 'TEXTAREA' || tag == 'INPUT') {
		obj.select();
	}
	else {
		var range = document.createRange();  
		// set the Node to select the "range"
		range.selectNode(obj[0]);
		// add the Range to the set of window selections
		window.getSelection().addRange(range);
	}
	document.execCommand('copy');
//	alert ("copied");

}

/**
convenience for creating DOM elements
*/
function $t (tag) {
	tag = tag || 'div';
	return $('<'+tag+'/>');
}

// CLASS - see http://ejohn.org/blog/simple-javascript-inheritance/

/* Simple JavaScript Inheritance
 * By John Resig http://ejohn.org/
 * MIT Licensed.
 */
// Inspired by base2 and Prototype
(function(){
  var initializing = false, fnTest = /xyz/.test(function(){xyz;}) ? /\b_super\b/ : /.*/;
 
  // The base Class implementation (does nothing)
  this.Class = function(){};
 
  // Create a new Class that inherits from this class
  Class.extend = function(prop) {
	var _super = this.prototype;
   
	// Instantiate a base class (but only create the instance,
	// don't run the init constructor)
	initializing = true;
	var prototype = new this();
	initializing = false;
   
	// Copy the properties over onto the new prototype
	for (var name in prop) {
	  // Check if we're overwriting an existing function
	  prototype[name] = typeof prop[name] == "function" &&
		typeof _super[name] == "function" && fnTest.test(prop[name]) ?
		(function(name, fn){
		  return function() {
			var tmp = this._super;
		   
			// Add a new ._super() method that is the same method
			// but on the super-class
			this._super = _super[name];
		   
			// The method only need to be bound temporarily, so we
			// remove it when we're done executing
			var ret = fn.apply(this, arguments);        
			this._super = tmp;
		   
			return ret;
		  };
		})(name, prop[name]) :
		prop[name];
	}
   
	// The dummy class constructor
	function Class() {
	  // All construction is actually done in the init method
	  if ( !initializing && this.init )
		this.init.apply(this, arguments);
	}
   
	// Populate our constructed prototype object
	Class.prototype = prototype;
   
	// Enforce the constructor to be what we expect
	Class.prototype.constructor = Class;
 
	// And make this class extendable
	Class.extend = arguments.callee;
   
	return Class;
  };
})();

var FAKE_WOS_TEXT = "*Order Full Text [ ]" + '\n' +
"L5 &lt;http://gateway.webofknowledge.com/gateway/Gateway.cgi?GWVersion=2&SrcAuth=Alerting&SrcApp=Alerting&DestApp=WOS&DestLinkType=FullRecord;UT=WOS:000414162500001&gt;" + '\n' +
"TI Precipitable water characteristics during the 2013 Colorado flood using" + '\n' +
"ground-based GPS measurements" + '\n' +
"AU Huelsing, HK" + '\n' +
"Wang, JH" + '\n' +
"Mears, C" + '\n' +
"Braun, JJ" + '\n' +
"AF Huelsing, Hannah K." + '\n' +
"	Wang, Junhong" + '\n' +
"Mears, Carl" + '\n' +
"Braun, John J." + '\n' +
"BP 4055" + '\n' +
"EP 4066" + '\n' +
"DI 10.5194/amt-10-4055-2017" + '\n' +
"UT WOS:000414162500001" + '\n' +
"ER" + '\n' +
"DI 10.1016/j.scitotenv.2017.03.262" + '\n' +
"DI 10.5194/fooberry" + '\n';