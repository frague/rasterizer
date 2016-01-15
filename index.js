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

function respond(response, code, headers, message) {
    response.writeHead(code, headers);
    response.write(message)
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
        url = params.url,
        selector = params.selector || 'body',
        page = require('webpage').create();

    if (!url) {
        return formResponse(response);
    }

    page.viewportSize = { width: 1024, height: 600 };

    page.open(url, function (status) {
        if (status !== 'success') {
            page.close();
            return errorResponse(response, 500, 'Internal server error')
        } else {
            window.setTimeout(function () {
                var clipRect = page.evaluate(function (s) {
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

                renderedPage = page.renderBase64('png');
                page.close();

                response.setEncoding('binary');
                return respond(
                    response,
                    200,
                    {
                        'Content-Type': 'image/png',
                        'Cache': 'no-cache'
                    },
                    atob(renderedPage)
                );
            }, 400);
        }
    });
});
