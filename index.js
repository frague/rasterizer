var webserver = require('webserver'),
    server = webserver.create(),
    system = require('system');

function parseGET(url) {
    var query = url.substr(url.indexOf('?') + 1);
    return query.split('&').reduce(function (p, v) {
        var e = v.indexOf('=');
        p[v.substr(0, e)] = decodeURIComponent(v.substr(e + 1));
        return p;
    }, {url: null, selector: null});
}

function returnError(response) {
    response.statusCode = 500;
    response.close();
};

var service = server.listen(system.env.PORT || 8088, function (request, response) {
    var params = parseGET(request),
        url = params.url,
        selector = params.selector,
        page = require('webpage').create();

    if (!url) {
        return error(response);
    }

    page.viewportSize = { width: 1024, height: 600 };

    page.open(url, function (status) {
        if (status !== 'success') {
            console.log('Unable to load the URL', url);
        } else {
            window.setTimeout(function () {
                var clipRect = page.evaluate(function (s) {
                    var cr = document.querySelector(s).getBoundingClientRect();
                    return cr;
                }, selector);

                page.clipRect = {
                    top: clipRect.top,
                    left: clipRect.left,
                    width: clipRect.width,
                    height: clipRect.height
                };

                response.statusCode = 200;
                response.headers = {
                    'Content-Type': 'image/png',
                    'Cache': 'no-cache'
                };
                response.write(page.renderBase64('png'));
                response.close();
            }, 400);
        }
    });
});
