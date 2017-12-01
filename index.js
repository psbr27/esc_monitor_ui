/**
 * Created by sushantparkhi on 11/8/17.
 */
var connect = require('connect');
var serveStatic = require('serve-static');
connect().use(serveStatic(__dirname)).listen(10000, function(){
    console.log('Server running on 10000...');
});
