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

var mysql = require('../database/mysql');

var jwtServer=require('../../server');
var config = require('../../config');

var User = require('../database/mongo');
var userSchema = require('../database/mongo');

function connectGmail(req,res) {

var accessTokenUrl = 'https://accounts.google.com/o/oauth2/token';
  var peopleApiUrl = 'https://www.googleapis.com/plus/v1/people/me/openIdConnect';
  var params = {
    code: req.body.code,
    client_id: req.body.clientId,
    client_secret: config.GOOGLE_SECRET,
    redirect_uri: req.body.redirectUri,
    grant_type: 'authorization_code'
  };

  // Step 1. Exchange authorization code for access token.
  request.post(accessTokenUrl, { json: true, form: params }, function(err, response, token) {
    var accessToken = token.access_token;
    var headers = { Authorization: 'Bearer ' + accessToken };
    var headers = { Authorization: 'Bearer ' + accessToken };

 // Step 2. Retrieve profile information about the current user.
    request.get({ url: peopleApiUrl, headers: headers, json: true }, function(err, response, profile) {

      // Step 3a. Link user accounts.
      if (req.headers.authorization) {
    	 
    	  var query="select U_ID from db_pixel.USR_DTL_TBL where U_ID='"+profile.sub+"'";
    	 
    	  mysql.dbcall(function(err,results){
    		  if(err){
    			  throw err;
    		  }
    		  else 
    		  {
    			  if(results) {
        			  console.log("user looking up");
        			  return res.status(409).send({ message: 'There is already a Google account that belongs to you' });
    			  }
    			  //res.send({"save":"Success"});
    		  }  
    	  },query);
    	 
    	  var token = req.headers.authorization.split(' ')[1];
    	  var payload = jwt.decode(token, config.TOKEN_SECRET);
          
    	  var query="select U_ID from db_pixel.USR_DTL_TBL where U_ID='"+payload.sub+"'";
 	 
    	  mysql.dbcall(function(err,results){
    		  if(err){
    			  throw err;
    		  }
    		  else 
    		  {
    			  if(!results) {
    				  console.log("user looking up");
    				  return res.status(400).send({ message: 'User not found' });    		  
    			  }
    		  }  
    	  },query);
      
    	  console.log(profile.sub);
      
    	  var sqlQuery="insert into db_pixel.USR_DTL_TBL (U_ID,UNAME,PICTURE,SRC,CREATION_DATE)" +
      		"VALUES ('"+profile.sub+"','"+profile.name+"','"+profile.picture.replace('sz=50', 'sz=200')+
      		"','G',SYSDATE()";  

    	  mysql.dbcall(function(err,results){
    		  if(err){
    			  throw err;
    		  }
    		  else 
    		  {
    			  console.log("user inserted");
    			  var token = jwtServer.createJWT(user);
    			  res.send({ token: token });
    		  }  
    	  },sqlQuery);
      
      	} 
      	else {
      		// Step 3b. Create a new user account or return an existing one.
      		
      		var query="select U_ID from db_pixel.USR_DTL_TBL where U_ID='"+profile.sub+"'";
       	 
      		mysql.dbcall(function(err,results){
      			if(err){
      				throw err;
      			}
      			else 
      			{
      				if(results){
          				console.log("user looking up");
          				return res.send({ token: jwtServer.createJWT(existingUser) });
      				}
      				
      			  //res.send({"save":"Success"});
      			}  
      		},query);
      		
      		User.User.findOne({ google: profile.sub }, function(err, existingUser) {
      			if (existingUser) {
      				return res.send({ token: jwtServer.createJWT(existingUser) });
      			}
      			
      			var sqlQuery="insert into db_pixel.USR_DTL_TBL (U_ID,UNAME,PICTURE,SRC,CREATION_DATE)" +
          		"VALUES ('"+profile.sub+"','"+profile.name+"','"+profile.picture.replace('sz=50', 'sz=200')+
          		"','G',SYSDATE()";  

        	  mysql.dbcall(function(err,results){
        		  if(err){
        			  throw err;
        		  }
        		  else 
        		  {
        			  console.log("user inserted");
        			  var token = jwtServer.createJWT(user);
        			  res.send({ token: token });
        		  }  
        	  },sqlQuery);
      		});
      	}
    	});
  });
};

exports.connectGmail = connectGmail;
