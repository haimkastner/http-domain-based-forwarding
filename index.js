const request = require('request');
const eventSource = require('eventsource')
const sseChannel = require('sse-channel');
//const webSocket = require('reconnecting-ws');
const logger = require('./logger');

var GetHttpReqIp = (req) => {
    var ipAddr = req.headers["x-forwarded-for"];
    if (ipAddr) {
        var list = ipAddr.split(",");
        ipAddr = list[list.length - 1];
    } else {
        ipAddr = req.connection.remoteAddress;
    }
    return ipAddr;
}

var RquestInfoToString = (req) => {
    var sessionId = req.cookies.sessionID;
    return 'USER: ' + sessionsIdMap[sessionId] + ' IP: ' + GetHttpReqIp(req) + ',    SESSION: ' + sessionId + ',    REQUEST: ' + req.method + ' ' + req.url + ',    DEVICE: ' + req.useragent.platform + ',    OS: ' + req.useragent.os + ',    BROWSER: ' + req.useragent.browser + '/' + req.useragent.version + ',    IS MOBILE: ' + req.useragent.isMobile;
}

var sseChannels = {};

var HandleSse = (req, res, targetHost) => {

    var sseTargetURL = targetHost + req.url;
    var sseID = req.headers['referer'] + sseTargetURL;
    if (!(sseID in sseChannels)) {
        sseChannels[sseID] = new sseChannel();
        var eventSourceInitDict = { headers: { 'Cookie': req.headers['cookie'] } };
        es = new eventSource(sseTargetURL, eventSourceInitDict);
        es.sseID = sseID;
        es.onmessage = function (e) {
            if (sseID in sseChannels)
                sseChannels[sseID].send(e.data);
        }
        es.onerror = function (e) {
            console.error('event-source error to ' + es.sseID + ' ,' + e.data)
        }
        es.onclose = function (e) {
            console.info('event-source  ' + es.sseID + ' close ' + e.data)
        }
    }

    sseChannels[sseID].addClient(req, res);
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

function domain_proxy(routing, log = false) {

    this.routing = routing;
    this.useLog = log ? true : false;
    

    if (this.useLog)
        logger.info('http-domain-based-forwarding ready to route, the route map is:' + JSON.stringify(routing));

    this.express_middleware = function (req, res) {

        if (this.useLog)
            logger.info('Route request arrived, ' + RquestInfoToString(req));

        var targetHost = routing[req.hostname];

        if (!targetHost) {
            if (this.useLog)
                logger.warn('Cant find target for host: ' + req.hostname);
            res.statusCode = 501;
            res.send();
            return;
        }

        if (this.useLog)
            logger.warn('Redirecting  host: ' + req.hostname + ' to: ' + targetHost);
        if (req.headers['accept'] === "text/event-stream") {
            if (this.useLog)
                logger.info('Redirenting ' + req.url + ' to SSE handler');
                HandleSse(req, res, targetHost);
            return;
        }

        HandleHttpReq(req, res, targetHost);
    }

    // IN NEXT UPDATE... support WS
    // this.ws_express_middleware = function (ws, req) {

    //     var targetHost = routing[req.hostname];

    //     if (!targetHost) {
    //         console.warn('Cant find target for host: ' + req.hostname);
    //         ws.close();
    //         return;
    //     }

    //     HandleWs(ws, req, targetHost);
    // }

    // this.HandleWs = (inWS, req, targetHost) => {

    //     var wsHostUrl = targetHost.replace(/^http/, 'ws');
    //     wsHostUrl = wsHostUrl.replace(/^https/, 'ws');
    //     var wsTargetURL = wsHostUrl + req.url.replace(/\/.websocket$/, '');

    //     socket = new webSocket(2000)
    //     socket.open(wsTargetURL);

    //     socket.onopen = () => {
    //         inWS.on('message', msg => {
    //             socket.send(msg);
    //         });

    //         inWS.on('close', () => {
    //             socket.instance.close();
    //         });
    //     }

    //     socket.onmessage = e => {
    //         inWS.send(e);
    //     }

    //     socket.onclose = e => {
    //         inWS.close();
    //     }
    // }
}

module.exports = domain_proxy;