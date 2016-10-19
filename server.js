var express = require("express");
var app = express();
var Twit = require('twit');
var sentiment = require("sentiment");
var sse = require('sse-node');
var mongo = require("mongodb");

//***** Routing call ********
var router = require("./router/main");
router(app,Twit,sentiment,mongo);
//****** Engine Logic Here ************* //
app.set('view engine','ejs');
app.engine('html', require('ejs').renderFile); //Specify view engine 

app.use(express.static('images'));

var server = app.listen(process.env.PORT || 3000, process.env.IP || "0.0.0.0",function(){
	console.log("Started server on port 3000 !!!");
});