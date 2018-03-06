/**
 * Created by ostwald on 12/27/17.
 */
function get_dois(input) {
    var n = input.match(/DI .*\n/g);
    var dois = []
    if (n != null) {
        log("matches (" + n.length + ")");

        var dois = $.map(n, function (doi, i) {
            // log ('i: ' + i + ' doi: ' + doi);
            return doi.slice(3).trim();
        });
    }

    show_matches(dois)
    return dois
}

function show_matches (dois) {

    $out = $('#debug');
    $list = $t('ul)');
    $out.html ($t('div')
        .html("DOIS (" + dois.length + ")")
        .append($list))
    $(dois).each (function (i, doi) {
        $list.append($t('li').html(doi));
    })

}

// http://localhost:8080/osws/search/v1?q=doi:"10.1016/j.scitotenv.2017.03.262"&start=0&rows=10&output=json&sort=date desc&facet=true

// var baseurl = 'http://localhost:8080/osws/search/v1';
var baseurl = 'https://osws.ucar.edu/service/search/v1';

function do_search (dois) {

    // MAKE THE URL
    var url = baseurl;

    // dois = [
    //     '10.1016/j.scitotenv.2017.03.262',
    //     '10.3847/1538-4357/aa6f5f'
    // ]

    var q = $.map(dois, function (doi, i) {
        return 'doi:"' + doi + '"';
    }).join(' OR ');

    url += '?q=' + encodeURIComponent(q);
    url += '&start=' + encodeURIComponent(0);
    url += '&rows=' + encodeURIComponent(dois.length);
    url += '&output=json';

    log ("url: " + url)

    $.ajax({
        url: url,
        crossDomain: true,
        context: $('#response-json'),
        dataType: 'json'
    }).done(function(data) {
        // log (stringify(data))
        var numFound, numShowing, response, serviceError;
        try {
            // log ("SERVICE RESPONSE\n" + stringify(data));
            log ('instantiating ...')
            response = new OSWSResponse (data);
            if (response.error)
                throw (response.error)
            numFound = response.numFound;
            numShowing = response.length;
        } catch (error) {
            log ("ERROR instantiating OSWSResponse: " + error)
            response = null;
            numFound = 0;
            numShowing = 0;
            serviceError = error;
        }

        log ('numFound!: ' + response.numFound);
        log ('numShowing: ' + numShowing);
        process_results(dois, response);

        $('#tabs').tabs('option','active', 1);

        // $('#wos-input').hide()
        // $('#doi-report').show()

    })
    .error (function (jqXHR, textStatus, errorThrown) {
        log ('There was an AJAX error! textStatus: ' + textStatus +
            ', errorThrown: ' + errorThrown);
        log ('url: ' + url);
        log ('responseText: ' + jqXHR.responseText);
        var errMsg = "Unknown AJAX error";
    })
    
}

function doi_link (doi) {
    return $t('a')
        .prop('href', 'https://dx.doi.org/'+doi)
        .prop('target', 'doi')
        .html(doi);
}

function process_results(dois, response) {
    // log ('process_results (' +  response.results.length + ') - ' + stringify(response.results));
    log ('process_results (' +  response.results.length + ')');

    // clear results
    $('#not-cataloged-dois, #cataloged-dois').html('')
    $('#not-cataloged-dois-count, #cataloged-dois-count').html('?')

    var found = {}
    $.each(response.results, function (i, val) {
        log (' --- ' + stringify(val))
        var osws_result = new OSWSModsResult (val);
        var doi = osws_result.doi;
        var pid = osws_result.PID;
        var ark = osws_result.ark;
        log ('- ARK: ' + ark);
        log ('- PID: ' + pid);
        found[osws_result.doi] = osws_result.PID;
        $('#cataloged-dois')
            .append ($t('li')
                .addClass('fixed-width')
                .html(doi_link(osws_result.doi))
                .append(' (PID: ')
                .append($t('a')
                    .prop('href', 'http://n2t.net/'+ark)
                    .prop('target', 'pid')
                    .html(pid))
                .append(')'));
    });

    var found_dois = Object.keys(found)
    $('#cataloged-dois-count').html(found_dois.length)

    log ("found dois: " + found_dois + '  ' + typeof (found_dois));
    not_found = []
    $.each(dois, function (i, doi) {
        if (found_dois.indexOf(doi) == -1) {
            not_found.push(doi)
            $('#not-cataloged-dois').append($t('li')
                .addClass('fixed-width')
                // .html(doi_link(doi)));
                .html(doi));
        }
    })
    $('#not-cataloged-dois-count').html(not_found.length);
    $('#clip-area').val(not_found.join('\n'));

}
