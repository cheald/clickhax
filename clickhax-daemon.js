var connect = require("connect");
var app = require('express').createServer();
var Db = require('mongodb/db').Db, ObjectID = require('mongodb/bson/bson').ObjectID, Server = require('mongodb/connection').Server;
		
var host = "localhost"
var port = 27017
var database = "clickhax"
var coll = "points"

function parseUrl(url) {
	var matches = url.match(/(http(s)?:\/\/)([^\/]+)(\/[^\?]*)(\?(.*?$))?/);
	return matches ? {scheme: matches[1], host: matches[3], path: matches[4], query: matches[6], url: matches[1] + matches[3] + matches[4]} : {}
}

var db_handle = new Db(database, new Server(host, port, {auto_reconnect: true}, {}));
db_handle.open(function(err, db) {
	db.collection(coll, function(err, coll) {	
		if(err) console.log(err);
		coll.createIndex(["all", ["path", 1], ["url", 1], ["query", 1], ["raw_url", 1], ["x", 1], ["y", 1]], function(){});
		
		app.configure(function(){
			app.use(connect.bodyDecoder());
			app.use(app.router);
		});

		app.get("/", function(req, res) {
			var pointResponse = {};		
			var url = parseUrl(req.header("referer", ""))
			if(url.path) {
				coll.find({url: url.url}, function(err, cursor) {
					with(pointResponse) {			
						cursor.toArray(function(err, docs) {
							for(idx in docs) {
								var doc = docs[idx]								
								var x = doc.x //- (doc.x % 5)
								var y = doc.y //- (doc.y % 5)
								var key = (y * 3000) + x;
								pointResponse[key] = pointResponse[key] || 0
								pointResponse[key] += doc.count
							}
							res.send(pointResponse);
						})
					}
				})
			} else {
				res.send({});
			}
		});

		app.post('/', function(req, res){
			var url = parseUrl(req.header("referer", ""))
			if(url.path) {
			
				// Quantitize to 3-px squares
				var x = parseInt(req.param("x"));
				var y = parseInt(req.param("y"));
				x = x - (x % 5);
				y = y - (y % 5);				
				
				coll.update({
					x: x,
					y: y,
					raw_url: req.header("referer", "")
				}, {
					$set: {
						path: url.path,
						url: url.url,
						query: url.query,
					},
					$inc: {count: 1}
				}, {
					upsert: true
				}, function(err, docs) {
				});
				res.send('ok');
			} else {
				res.send('fail');
			}
		});

		app.listen(3000);
	})
});