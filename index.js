var request = require('request');
var eventSource = require('eventsource')
var sseChannel = require('sse-channel');


var sseChannels = {};
var HandleSse = (req, res, targetHost) => {

    var sseTargetURL = targetHost + req.url;

    if (!(sseTargetURL in sseChannels)) {
        sseChannels[sseTargetURL] = new sseChannel();
        var eventSourceInitDict = { headers: { 'Cookie': req.headers['cookie'] } };
        es = new eventSource(sseTargetURL, eventSourceInitDict);
        es.sseTargetURL = sseTargetURL;
        es.onmessage = function (e) {
            if (sseTargetURL in sseChannels)
                sseChannels[sseTargetURL].send(e.data);
        }
        es.onerror = function (e) {
            console.error('event-source error to ' + es.sseTargetURL + ' ,' + e.data)
        }
    }

    sseChannels[sseTargetURL].addClient(req, res);
}

var HandleHttpReq = (req, res, targetHost) => {

    var data = [];

    req.on('data', function (chunk) {
        data.push(chunk);
    }).on('end', function () {
        var buffer = Buffer.concat(data);


        var options = {
            url: targetHost + req.path,
            method: req.method,
            headers: req.headers,
            encoding: null,
        }

        if (buffer.length != 0) {
            options['body'] = buffer;
        }

        options.headers.host = targetHost.split('//')[1];

        // Start the request
        request(options, function (error, response, body) {
            if (error || !response) {
                res.statusCode = 501;
                res.send('proxy request error: ' + error.message);
                return;
            }

            res.statusCode = response.statusCode;
            res._headers = response.headers;
            res.send(body);
        });
    });
}



function domain_proxy(routing) {
    this.routing = routing;

    this.express_middleware = function (req, res) {

        var targetHost = routing[req.host];

        if (!targetHost) {
            console.warn('Cant find target for host: ' + req.host);
            res.statusCode = 501;
            res.send();
            return;
        }

        if (req.headers['accept'] == "text/event-stream") {
            HandleSse(req, res, targetHost);
            return;
        }

        HandleHttpReq(req, res, targetHost);
    }
}

module.exports = domain_proxy;