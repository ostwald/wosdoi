/**
 * Created by ostwald on 12/27/17.
 */
function get_dois(input) {

    input = input.trim()

    var last_char = input.charAt(input.length - 1)
    if (last_char != '\n') {
     input = input + '\n';
     }

    var n = input.match(/.*\n/g);
    var dois = []
    if (n != null) {

        var dois = $.map(n, function (doi, i) {
            if (doi.trim().length > 0) {
                return doi.trim();
                }
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


// var baseurl = 'http://localhost:8080/osws/search/v1';
var baseurl = 'https://osws.ucar.edu/service/search/v1';
// var baseurl = 'https://oswscl.dls.ucar.edu/service/search/v1';


function do_search (dois) {

    // clear results
    $('#progress').show();
    $('#output').hide();
    $('#not-cataloged-dois, #cataloged-dois').html('')
    $('#not-cataloged-dois-count, #cataloged-dois-count').html('?')


    log ("got " + dois.length + " dois!");

    // MAKE THE URL

    var batch_size = 150;
    var i = 0;
    var FOUND = {}
    var reps = 0;
    var max_reps = 10;

    // for testing ..
    // dois = [
    //     '10.1016/j.scitotenv.2017.03.262',
    //     '10.3847/1538-4357/aa6f5f'
    // ]

    function get_batch (i, dois) {
        log ("GET BATCH");
        j = Math.min (i+batch_size, dois.length)

        var doi_batch = dois.slice(i, j)
        log("sending " + doi_batch.length + " dois");

        if (reps > max_reps) {
            log ("BAILING!! reps: " + reps)
            return;
        }

        var q = $.map(doi_batch, function (doi, i) {
            return 'doi:"' + doi + '"';
        }).join(' OR ');
        q = "(" + q + ")";  // this is crucial

        var url = baseurl;
        url += '?q=' + encodeURIComponent(q);
        url += '&start=' + encodeURIComponent(0);
        url += '&rows=' + encodeURIComponent(dois.length);
        url += '&output=json';

//        log ("URL: " + url)

        $.ajax({
            url: url,
            crossDomain: true,
            context: $('#response-json'),
            dataType: 'json'
        }).done(function (data) {
            // log (stringify(data))
            var numFound, numShowing, response, serviceError;
            try {
//                 log ("SERVICE RESPONSE\n" + stringify(data));
                log('instantiating ...')
                response = new OSWSResponse(data);
                if (response.error)
                    throw (response.error)
                numFound = response.numFound;
                log ("num_found: " + numFound)
                numShowing = response.length;
            } catch (error) {
                log("ERROR instantiating OSWSResponse: " + error)
                response = null;
                numFound = 0;
                numShowing = 0;
                serviceError = error;
            }

            // log ('numFound!: ' + response.numFound);
            // log ('numShowing: ' + numShowing);
            tally_results(FOUND, response);

            $('#tabs').tabs('option', 'active', 1);

            // $('#doi-input').hide()
            // $('#doi-report').show()

            reps++;
            i = j;
            if (i >= dois.length) {
                process_results(dois, FOUND)
            }
            else {
                get_batch(i, dois);
            }

        })
        .error(function (jqXHR, textStatus, errorThrown) {
            log('There was an AJAX error! textStatus: ' + textStatus +
                ', errorThrown: ' + errorThrown);
            // log('url: ' + url);
            log('responseText: ' + jqXHR.responseText.slice(0,1000));
            // var errMsg = "Unknown AJAX error";
        })
    }
    get_batch (0, dois);

}

function doi_link (doi) {
    return $t('a')
        .prop('href', 'https://dx.doi.org/'+doi)
        .prop('target', 'doi')
        .html(doi);
}

function tally_results (FOUND, response) {
    log ('tally_results (' +  response.results.length + ')');

    var found = {}
    $.each(response.results, function (i, val) {
        // log (' --- ' + stringify(val))
        var osws_result = new OSWSModsResult (val);
        var doi = osws_result.doi;
        var pid = osws_result.PID;
        var ark = osws_result.ark;
        // log ('- ARK: ' + ark);
        // log ('- PID: ' + pid);
        FOUND[osws_result.doi] = osws_result;
    });

}

function process_results (dois, FOUND) {
    // log ('process_results (' +  response.results.length + ') - ' + stringify(response.results));
    log ('process_results');
    $('#progress').hide();
    $('#output').show();
     for (var doi in FOUND) {
        var osws_result = FOUND[doi];
        $('#cataloged-dois')
            .append ($t('li')
                .addClass('fixed-width')
                .html(doi_link(osws_result.doi))
                .append(' (PID: ')
                .append($t('a')
                    .prop('href', 'http://n2t.net/'+osws_result.ark)
                    .prop('target', 'pid')
                    .html(osws_result.PID))
                .append(')'));
    }

    var found_dois = Object.keys(FOUND)
    $('#cataloged-dois-count').html(found_dois.length)

    var not_found = []
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
