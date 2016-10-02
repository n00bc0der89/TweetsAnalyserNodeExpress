module.exports = function(app,Twit,sentiment,mongodb){
var bodyParser = require("body-parser");
var randomItem = require("random-item");
var session = require('client-sessions');
var geocoder = require("google-geocoder");
var http = require('http');
//var SSE = require("sse-nodejs");
//var SSE = require("sse-node");
var serverSent = "";
// *********** Routing Logic Here ************** //
var MongoClient ="";
var stream = "";

//var totaltweets = 0;
var samplecoll = [];

var geo = geocoder({
  key: 'AIzaSyCD6FFAPbvxB1-OWHX4iOI-XiCt_FpKBno'
});

var url = "http://api.opencagedata.com/geocode/v1/json?q=";

var T = new Twit({
  consumer_key:         'BSCl6UP5FLtkowbp5umuTdZFH',
  consumer_secret:      'qQIkVqjzJZf8v8Wt99JbFmEtO15c0ujusFOtRCVjV2TGfteto3',
  access_token:         '777926888761077760-Ckh5nFwqMEmTenqww3VxkVJ3UxfgULf',
  access_token_secret:  'NRf8P52PJFg9icdCnJkvnOcbM90VD16PsdoFqJZg9UWIa',
  timeout_ms:           60*1000,  // optional HTTP request timeout to apply to all requests.
})

app.use(session({
  cookieName: 'session',
  secret: 'saefgajahsdfaskj',
  duration: 30 * 60 * 1000,
  activeDuration: 5 * 60 * 1000,
}));

app.use(bodyParser.urlencoded({extended : true}));

MongoClient = mongodb.MongoClient;
    
 var mongourl = 'mongodb://' + process.env.IP + ':27017/demodb';

app.get("/",function(req,res){
   // var data = {"tweetcollect": [],"status":""};
	res.render("login");
});

/// ************************************** SSE   *******************************///
 /* app.get("/tweetflow",function(req, res) {
    const client = SSE(req, res,{'retry':10000});
    
      var twobj = "";
    
    MongoClient.connect(mongourl, function (err, db) {
      
      if (err) {
        console.log('Unable to connect to the mongoDB server. Error:', err);
      } 
      
      else 
      {
          console.log("DB started");
          var tweettable = db.collection('tweets');
          
           tweettable.find(tweetobj).sort({_id : -1}).toArray(function(err,tres){
            var totaltweets = tres.length;
           
            var localcoll = [];
           // console.log("Before samplecoll: " + samplecoll.length);
           // console.log("Before tres length: " + tres.length);
            if(samplecoll.length != tres.length)
            {
                for(var c = 0 ; c < (tres.length - samplecoll.length); c++)
                {
                   localcoll[c] = tres[c]; 
                }
                samplecoll = tres;
                
           // console.log("after samplecoll: " + samplecoll.length);
           // console.log("after tres length: " + tres.length);
            
            
           //Send tweets to client
            var data = {"user": uname ,"tweetcollect": localcoll,"status":"","total":totaltweets};
			 twobj = data;
            }
            
            client.send(twobj);
        });
        
      }
       db.close();
       console.log("DB closed");
      
      });
          // return twobj;  
           });
           
           */

////////// ***** End SSE ****** //////////////


app.post("/loginaction",function(req,res){
   // var data = {"tweetcollect": [],"status":""};
    var uname = req.body.username;
    var pw = req.body.password;
  
   //Logic to verify the credentials from mongodb collection
  
   MongoClient.connect(mongourl, function (err, db) {
      
      if (err) {
        console.log('Unable to connect to the mongoDB server. Error:', err);
      } 
      
      else 
      {
         
          var usertable = db.collection('userinfo');
          //var usertable2 = db.collection('userinfo');
          var tweettable = db.collection('tweets');
          
         var userobj = {};  
         userobj['loginid'] = uname;
         userobj['pw'] = pw;
        
          req.session.user = userobj;
         
          console.log("Userobj: " + JSON.stringify(req.session.user));
           
           //Check if user exist in db
           usertable.find(userobj).toArray(function(err,result){
               
                  if(result.length > 0)
                  {
                      
                      //User login
                      console.log("Role" + result[0].role);
                      if(result[0].role == "admin") 
                      {
                        var data = {"status": "","geo":[]}
               	        res.render("index",data);
                      }
                      else
                      {
                        
                           usertable.update(userobj, { $set: {isactive: 1 } }, function(err, numupdate) {
        
                            if (err) {
                                console.log(err);
                                
                              } else if (numupdate) {
                                
                                console.log('Updated Successfully %d document(s).', numupdate);
                              } else {
                                
                                console.log('No document found with defined "find" criteria!');
                              }
                              
                               getmessage(tweettable,db,res,req);  
                               
                           });
              
                          
                      }
                  }
                  else
                  {
                      //Invalid
                      	res.render("login");
                  }
                  
           });
         
      }
      
   });
   
});

/***********    Get all message function      *************/

var getmessage = function(tweettable,db,res,req)
{
    var tweetobj = {};
    tweetobj['user.loginid'] =  req.session.user.loginid;
    tweetobj['user.pw'] = req.session.user.pw;
    
    console.log("Sess uname: " + req.session.user.loginid);
    console.log("Sess pw: " + req.session.user.pw);
    
       // Get all tweets with respect to logged in user
    tweettable.find(tweetobj).sort({_id : -1}).toArray(function(err,tres){

        tweettable.find().count(function(err,cres){
            
        tweettable.find({$and: [tweetobj,{"sentimentscore": {$gt: 0}}]}).count(function(err,pres){
            
             req.session.positivetweet = pres;
            
            tweettable.find({$and: [tweetobj,{"sentimentscore": {$lt: 0}}]}).count(function(err,nres){
                 req.session.negativetweet = nres;
                 
                 tweettable.find({$and:[tweetobj,{"replied": 1}]}).count(function(err,rres){
                    req.session.repliedcount = rres;
                    var data = {"user": req.session.user.loginid ,"tweetcollect": tres,"status":"","total": tres.length,"alltweets":cres,"positivescore": pres,"negativescore":nres,"repliedcount": rres };
                    req.session.tweetlen = tres.length;
                    req.session.alltweet = cres;
                    res.render("listtweets",data);  
            
                     db.close();
                     
                 });
                  
            });
        });
        
      
        });
       
    });
}

/******************* Post Message  *************************/

app.get("/postdata",function(req,res){
   var msg = req.query.tweetpost;
   var uid = req.query.Uid;
   var uhandle = req.query.Uhandle;
    
   T.post("statuses/update",{ in_reply_to_status_id:uid, status:"@" + uhandle + " "+ msg},function(err,data,response){
   	  
   		if(err)
   		{
   		    console.log("Error: " + err);
   		}
   		
   		//Set flag for replied tweets
   		 MongoClient.connect(mongourl, function (err, db) {
      
          if (err) {
            console.log('Unable to connect to the mongoDB server. Error:', err);
          } 
          
          else 
          {
                  
              var tweettable = db.collection('tweets');
              var findtweet = {};
              findtweet["id"] = uid;
             //update 
             
             tweettable.update(findtweet,{$set:{"replied":1}},function(err,result){
                 
                 if(err)
                 {
                     console.log("Error wulie updating replied tweets");
                 }
                 else
                 {
                    
                 var data1 = {"user": req.session.user.loginid,"tweetcollect":[],"status":"Tweet posted successfully !!!","total": req.session.tweetlen,"alltweets":req.session.alltweet,"positivescore":req.session.positivetweet,"negativescore":req.session.negativetweet,"repliedcount":req.session.repliedcount };
                 res.render("listtweets",data1);
                 db.close();
                     
                 }
                 
             });
          }
          
   		 });
   		
   });
});

/**** Search Tweets and display on screen ****/

app.get("/refreshTweets",function(req,res){
    
   // res.render("");
    MongoClient.connect(mongourl, function (err, db) {
      
      if (err) {
        console.log('Unable to connect to the mongoDB server. Error:', err);
      } 
      
      else 
      {
          var tweettable = db.collection('tweets'); 
          getmessage(tweettable,db,res,req);
      }
    
    }); 
});

app.get("/stopstream",function(req, res) {
    stream.stop();
    console.log("Streaming stopped");
    var data = {"status":"Streaming Stopped !!!","geo":[]};
    res.render("index",data);
    
});

app.post('/gettweets',function(req,res){
    
   var tweet = req.body.tweetreq;
	var fromtweet = req.body.tweetapi;
	var fromfb = req.body.fbapi;
	
 //   const client = SSE(req,res);
    
	if(fromtweet == "true")
	{
     // var sanFrancisco = [ '-122.75', '36.8', '-121.75', '37.8' ]

       stream = T.stream('statuses/filter', { track: tweet, language: 'en' })
 
        stream.on('tweet', function (tweet) {
            
        //var coll = data.statuses;
          
        var msg = {};
       
            var eachc = tweet;
          console.log(JSON.stringify(eachc));
          
            var obj = {};
            var sentimentpath = '';
            
            //Logic to target correct smiley path based on sentiment score.
            var sresult = sentiment(eachc.text);
            var tooltip = '';
           var angrypath = "https://preview.c9users.io/n00bc0der/nodedemo/tweetapp_dev/images/angry.png?_c9_id=livepreview1&_c9_host=https://ide.c9.io";
           var happypath = "https://preview.c9users.io/n00bc0der/nodedemo/tweetapp_dev/images/happy.png?_c9_id=livepreview2&_c9_host=https://ide.c9.io";
           var neutralpath = "https://preview.c9users.io/n00bc0der/nodedemo/tweetapp_dev/images/neutral.png?_c9_id=livepreview3&_c9_host=https://ide.c9.io";
           
           if(sresult.score > 0)
           {
               sentimentpath = happypath; //happy emoticon
               tooltip = "happy";
           }
           else if(sresult.score == 0 )
           {
               sentimentpath = neutralpath; //neutral emoticon
               tooltip = "neutral";
           }
           else
           {
               sentimentpath = angrypath; //angry emoticon
               tooltip = "angry";
           }
            
             obj = {
                    
                'created_at' : eachc.created_at, 
                'id': eachc.id_str, 
                'uhandle': eachc.user.screen_name,
                'text': eachc.text,
                'sourcetype':'Twitter',
                'sentiment':sentimentpath,
                'sentimentscore': sresult.score,
                'tooltip':tooltip,
                'place':eachc.place,
                'userlocation':eachc.user.location,
                    
                };
            
            geo.find(eachc.user.location, function(err, result){
                
                var robj = result ;
                console.log("O: " + robj);
                
               if(robj != undefined &&  robj != "")
               {
                obj['lat'] = robj[0].location.lat;
                obj['lng'] = robj[0].location.lng;
               }
           
            MongoClient.connect(mongourl, function (err, db) {
      
              if (err) {
                console.log('Unable to connect to the mongoDB server. Error:', err);
              } 
                else
                {
                  
                    var tweettable = db.collection('tweets');
                    var usertable = db.collection('userinfo');
                    var userlist = [];
                    
                    usertable.find().toArray(function(err,ures){
                        
                        for(var ui = 0 ; ui < ures.length ; ui++)
                        {
                            var uobj = ures[ui];
                            if(uobj.isactive ==1 && uobj.role != "admin")
                            {
                                userlist.push(uobj);
                            }
                        }
                        
                        //Random user assigned with each tweets
                        var userobj = randomItem(userlist);
                        
                        obj["user"] = userobj;
                        
                    //Insert tweet obj      
                    tweettable.insert(obj,function(err,insertres){
                       console.log("Inserted doc"); 
                      
                        db.close();
                    });
                    
                    });
                   
                }
               
            
            });
                
            });
        
        });
         res.send("Streaming Started ...");
        
	}
	
	else if(fromfb == "true")
	{
	    
	    
	}
	else
	{
	  
	}
	
});

app.get("/logout",function(req,res){
   // var data = {"tweetcollect": [],"status":""};
   // Deactivate user when logged out
    
    res.render("login");
   
    
   MongoClient.connect(mongourl, function (err, db) {
      
      if (err) {
        console.log('Unable to connect to the mongoDB server. Error:', err);
      } 
      
      else 
      {
            var usertable = db.collection('userinfo');
          
             usertable.update(req.session.user, { $set: {isactive: 0 } }, function(err, nupdate) {
           
                if (err) {
                   console.log(err);
                  } 
                else if (nupdate) {
                    console.log('Updated Successfully %d document(s).', nupdate);
                     req.session.reset();
                      db.close();
                     
                  } else {
                    console.log('No document found with defined "find" criteria!');
                  }
             });
    
      }
     
   });
    
});

app.get("/callmaps",function(req,res){
   
     MongoClient.connect(mongourl, function (err, db) {
      
              if (err) {
                console.log('Unable to connect to the mongoDB server. Error:', err);
              } 
                else
                {
                    var tweettable = db.collection('tweets');
                    var geolocation= [];
                    
                    tweettable.find().toArray(function(err,re){
                      var pos = [];
                      for(var k=0; k < re.length; k++)
                      {
                          if(re[k].lat != undefined && re[k].lng != undefined)
                          {
                            pos.push({"lat" : re[k].lat, "lng" : re[k].lng,"sentiment" : re[k].sentimentscore,"tweet": re[k].text}); 
                          }
                      }
                        
                       res.send(pos);
                         
                      });
                      
                     
                    
                }
     });
});
}