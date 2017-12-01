/**
 * Created by sushantparkhi on 11/29/17.
 */
var net = require('net');
var http = require('http');
var socketio = require('socket.io');
var nodestatic = require('node-static')

var WS_HOST = (process.env.WS_HOST?process.env.WS_HOST:'0.0.0.0');
var WS_PORT = (process.env.WS_PORT?process.env.WS_PORT:8080);
var SYSLOG_HOST = (process.env.SYSLOG_HOST?process.env.SYSLOG_HOST:'127.0.0.1');
var SYSLOG_PORT = (process.env.SYSLOG_PORT?process.env.SYSLOG_PORT:1514);
var SWITCH_USER = (process.env.SWITCH_USER?process.env.SWITCH_USER:null);
var SWITCH_GROUP = (process.env.SWITCH_GROUP?process.env.SWITCH_GROUP:null);
var PUBLICDIR = (process.env.PUBLICDIR?process.env.PUBLICDIR:'./htdocs');

var syslogserver, httpserver, ioserver;

var priRe = '<([0-9]{1,5})>';
var dateRe = '(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) ( [0-9]|[0-9]{2})';
var timeRe = '([0-9]{2}):([0-9]{2}):([0-9]{2})'
var timestampRe = dateRe + ' ' + timeRe;
var hostnameRe = '([^ ]*)';
var tagRe = '(([^ ]{0,32}): |)';
var contentRe = '(.*)';
var syslogRe = '^' + priRe + timestampRe + ' ' + hostnameRe + ' ' + tagRe + contentRe + '$';

var processSyslogLine = function (line) {
    var re = new RegExp(syslogRe);
    var m = re.exec(line);
    var result = null;
    if (m != null) {
        result = {
            pri: {
                facility: Math.floor(m[1]/8),
                severity: m[1]%8
            },
            timestamp: {
                month: m[2],
                day: m[3].replace(/^\s+/, ''),
                hour: m[4],
                minute: m[5],
                second: m[6]
            },
            hostname: m[7],
            tag: m[9],
            message: m[10]
        }
    }
    return result
};

var socketListener = function(socket) {
    var buffer = '';
    socket.on('data', function(data) {
        buffer += data;
        var messages = buffer.split('\n');
        buffer = messages.pop();
        for (var i = 0; i < messages.length; i++) {
            var msg = processSyslogLine(messages[i].replace('\r', ''));
            if (msg) {
                ioserver.sockets.emit('log', msg)
            } else {
                console.log('Unrecognized syslog line: ', messages[i].replace('\r', ''))
            }
        }
    })
};

var createHTTPServer = function(port, host, staticdir) {
    var file = new(nodestatic.Server)(staticdir)
    httpserver = http.createServer(function (request, response) {
        request.addListener('end', function () {
            file.serve(request, response)
        })
    });
    httpserver.listen(port, host);
    ioserver = socketio.listen(httpserver)
};

var createSyslogServer = function(port, host) {
    syslogserver = net.createServer(socketListener);
    syslogserver.listen(port, host)
};

createHTTPServer(WS_PORT, WS_HOST, PUBLICDIR);
createSyslogServer(SYSLOG_PORT, SYSLOG_HOST);

if (SWITCH_GROUP) {
    process.setgid(SWITCH_GROUP)
}
if (SWITCH_USER) {
    process.setuid(SWITCH_USER)
}