var webserver = require('webserver'),
    server = webserver.create(),
    system = require('system'),
    fs = require('fs');

function parseGET(url) {
    var query = url.substr(url.indexOf('?') + 1);
    return query.split('&').reduce(function (p, v) {
        var e = v.indexOf('=');
        p[v.substr(0, e)] = decodeURIComponent(v.substr(e + 1));
        return p;
    }, {url: null, selector: null});
}

function respond(response, code, headers, message, isBinary) {
    if (isBinary) {
        response.setEncoding('binary');
    }
    response.writeHead(code, headers);
    response.write(message);
    response.close();
};

function formResponse(response) {
    var fs = require('fs');
    respond(response, 200, {'Content-Type': 'text/html'}, fs.read('form.html'));
};

function errorResponse(response, code, error) {
    respond(response, code, {'Content-Type': 'text/html'}, error);
};

var service = server.listen(system.env.PORT || 8088, function (request, response) {
    var params = parseGET(request.url),
        url = decodeURIComponent(params.url),
        selector = params.selector || 'body',
        page = require('webpage').create();

    if (!url) {
        return formResponse(response);
    }

    page.viewportSize = { width: 1024, height: 600 };

    // page.onResourceRequested = function (request) {
    //     system.stderr.writeLine('= onResourceRequested()');
    //     system.stderr.writeLine('  request: ' + JSON.stringify(request, undefined, 4));
    // };

    // page.onResourceReceived = function(response) {
    //     system.stderr.writeLine('= onResourceReceived()' );
    //     system.stderr.writeLine('  id: ' + response.id + ', stage: "' + response.stage + '", response: ' + JSON.stringify(response));
    // };

    // page.onLoadStarted = function() {
    //     system.stderr.writeLine('= onLoadStarted()');
    //     var currentUrl = page.evaluate(function() {
    //         return window.location.href;
    //     });
    //     system.stderr.writeLine('  leaving url: ' + currentUrl);
    // };

    // page.onLoadFinished = function(status) {
    //     system.stderr.writeLine('= onLoadFinished()');
    //     system.stderr.writeLine('  status: ' + status);
    // };

    // page.onNavigationRequested = function(url, type, willNavigate, main) {
    //     system.stderr.writeLine('= onNavigationRequested');
    //     system.stderr.writeLine('  destination_url: ' + url);
    //     system.stderr.writeLine('  type (cause): ' + type);
    //     system.stderr.writeLine('  will navigate: ' + willNavigate);
    //     system.stderr.writeLine('  from page\'s main frame: ' + main);
    // };

    // page.onResourceError = function(resourceError) {
    //     system.stderr.writeLine('= onResourceError()');
    //     system.stderr.writeLine('  - unable to load url: "' + resourceError.url + '"');
    //     system.stderr.writeLine('  - error code: ' + resourceError.errorCode + ', description: ' + resourceError.errorString );
    // };

    // page.onError = function(msg, trace) {
    //     system.stderr.writeLine('= onError()');
    //     var msgStack = ['  ERROR: ' + msg];
    //     if (trace) {
    //         msgStack.push('  TRACE:');
    //         trace.forEach(function(t) {
    //             msgStack.push('    -> ' + t.file + ': ' + t.line + (t.function ? ' (in function "' + t.function + '")' : ''));
    //         });
    //     }
    //     system.stderr.writeLine(msgStack.join('\n'));
    // };    

    console.log('Requested URL: ' + url + ' with selector: ' + selector);

    page.open(url, function (status) {
        if (status !== 'success') {
            page.close();
            return errorResponse(response, 500, 'Internal server error')
        } else {
            window.setTimeout(function () {
                var clipRect = page.evaluate(function (s) {
                    var style = document.createElement('style'),
                    text = document.createTextNode('body {-webkit-filter: brightness(120%) grayscale(100%) contrast(100%) invert(100%);} a {text-decoration:none;}');
                    style.setAttribute('type', 'text/css');
                    style.appendChild(text);
                    document.head.insertBefore(style, document.head.firstChild);

                    var cr = document.querySelector(s).getBoundingClientRect();
                    return cr;
                }, selector),
                    renderedPage;

                if (!clipRect) {
                    page.close();
                    return errorResponse(response, 400, 'Selector not found');
                }

                page.clipRect = {
                    top: clipRect.top,
                    left: clipRect.left,
                    width: clipRect.width,
                    height: clipRect.height
                };

                renderedPage = atob(page.renderBase64('png'));
                page.close();

                return respond(
                    response,
                    200,
                    {
                        'Content-Type': 'image/png',
                        'Content-Length': renderedPage.length.toString(),
                        'Cache': 'no-cache'
                    },
                    renderedPage,
                    true
                );
            }, 400);
        }
    });
});
