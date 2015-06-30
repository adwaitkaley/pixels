var path = require('path');
var qs = require('querystring');

var async = require('async');
var bcrypt = require('bcryptjs');
var bodyParser = require('body-parser');
var colors = require('colors');
var cors = require('cors');
var express = require('express');
var logger = require('morgan');
var jwt = require('jwt-simple');
var moment = require('moment');
var mongoose = require('mongoose');
var request = require('request');
var jwtServer=require('../../server')
var config = require('../../config');

var mysql = require('../database/mysql');

var User = require('../database/mongo');
var userSchema = require('../database/mongo');


function connectTwitter(req,res){

var requestTokenUrl = 'https://api.twitter.com/oauth/request_token';
  var accessTokenUrl = 'https://api.twitter.com/oauth/access_token';
  var profileUrl = 'https://api.twitter.com/1.1/users/show.json?screen_name=';

  // Part 1 of 2: Initial request from Satellizer.
  if (!req.body.oauth_token || !req.body.oauth_verifier) {
    var requestTokenOauth = {
      consumer_key: config.TWITTER_KEY,
      consumer_secret: config.TWITTER_SECRET,
      callback: config.TWITTER_CALLBACK
    };

    // Step 1. Obtain request token for the authorization popup.
    request.post({ url: requestTokenUrl, oauth: requestTokenOauth }, function(err, response, body) {
      var oauthToken = qs.parse(body);

      // Step 2. Send OAuth token back to open the authorization screen.
      res.send(oauthToken);
    });
  } else {
    // Part 2 of 2: Second request after Authorize app is clicked.
    var accessTokenOauth = {
      consumer_key: config.TWITTER_KEY,
      consumer_secret: config.TWITTER_SECRET,
      token: req.body.oauth_token,
      verifier: req.body.oauth_verifier
    };

    // Step 3. Exchange oauth token and oauth verifier for access token.
    request.post({ url: accessTokenUrl, oauth: accessTokenOauth }, function(err, response, accessToken) {

      accessToken = qs.parse(accessToken);

      var profileOauth = {
        consumer_key: config.TWITTER_KEY,
        consumer_secret: config.TWITTER_SECRET,
        oauth_token: accessToken.oauth_token
      };

      // Step 4. Retrieve profile information about the current user.
      request.get({
        url: profileUrl + accessToken.screen_name,
        oauth: profileOauth,
        json: true
      }, function(err, response, profile) {

        // Step 5a. Link user accounts.
        if (req.headers.authorization) {
        	
        	var query="select U_ID from USR_DTL_TBL where U_ID='"+profile.sub+"';";
       	 
      	  	mysql.dbcall(function(err,results){
      	  		if(err){
      			  throw err;
      	  		}
      	  		else 
      	  		{
      			  if(results) {
          			  console.log("user looking up 1");
          			  return res.status(409).send({ message: 'There is already a Twitter account that belongs to you' });
      			  }
      			  //res.send({"save":"Success"});
      	  		}  
      	  	},query);
      	  
            var token = req.headers.authorization.split(' ')[1];
            var payload = jwt.decode(token, config.TOKEN_SECRET);

            var query="select U_ID from USR_DTL_TBL where U_ID='"+payload.sub+"';";
	      	 
	    	mysql.dbcall(function(err,results){
	    		if(err){
	    			  throw err;
	    		}
	    		else 
	    		{
	    		  if(!results) {
	    			  console.log("user looking up 2");
	    			  return res.status(400).send({ message: 'User not found' });    		  
	    		  }
	    		}  
	    	  },query);
	      
	    	  console.log(profile.sub);

	    	  var sqlQuery="insert into db_pixel.USR_DTL_TBL (U_ID,UNAME,PICTURE,SRC,CREATION_DATE)" +
	      		" VALUES ('"+profile.sub+"','"+profile.name+"','"+profile.profile_image_url.replace('_normal', '')+
	      		"','T',SYSDATE())"; 
	    	  
	    	  mysql.dbcall(function(err,results){
	    		  if(err){
	    			  throw err;
	    		  }
	    		  else 
	    		  {
	    			  console.log("user inserted");
	    			  var token = jwtServer.createJWT(results);
	    			  res.send({ token: token });
	    		  }  
	    	  },sqlQuery);
        } else {
          // Step 5b. Create a new user account or return an existing one.
        	var query="select U_ID from USR_DTL_TBL where U_ID='"+profile.sub+"';";
      	     //var query="select * from USR_DTL_TBL;";
      	     
     		 mysql.dbcall(function(err,results){
     			if(err){
     				console.log("in error..!!!");
     				throw err;
     			}
     			else 
     			{
     				if((results.length == 0)){
     					
     					var sqlQuery="insert into db_pixel.USR_DTL_TBL (U_ID,UNAME,PICTURE,SRC,CREATION_DATE)" +
     		      		" VALUES ('"+profile.sub+"','"+profile.name+"','"+profile.profile_image_url.replace('_normal', '')+
     		      		"','T',SYSDATE())"; 

     		        	mysql.dbcall(function(err,results){
     		        		  if(err){
     		        			  console.log("in error of insert");
     		        			  throw err;
     		        		  }
     		        		  else 
     		        		  {
     		        			  console.log("user inserted 2");
     		        			  var token = jwtServer.createJWT(results);
     		        			  res.send({ token: token });
     		        		  }  
     		        	  },sqlQuery);
     		        	}
     				else{
         				console.log("user looking up 3");
         				console.log(results);
         				res.send({ token: jwtServer.createJWT(results) });
     				}
     			  //res.send({"save":"Success"});
     			}  
     		},query);
        }
      });
    });
  }
};
exports.connectTwitter=connectTwitter;


