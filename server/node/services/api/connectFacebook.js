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

function connectFB(req,res){
	
	var accessTokenUrl = 'https://graph.facebook.com/v2.3/oauth/access_token';
	  var graphApiUrl = 'https://graph.facebook.com/v2.3/me';
	  var params = {
	    code: req.body.code,
	    client_id: req.body.clientId,
	    client_secret: config.FACEBOOK_SECRET,
	    redirect_uri: req.body.redirectUri
	  };

	  // Step 1. Exchange authorization code for access token.
	  request.get({ url: accessTokenUrl, qs: params, json: true }, function(err, response, accessToken) {
	    if (response.statusCode !== 200) {
	      return res.status(500).send({ message: accessToken.error.message });
	    }

	    // Step 2. Retrieve profile information about the current user.
	    request.get({ url: graphApiUrl, qs: accessToken, json: true }, function(err, response, profile) {
	      if (response.statusCode !== 200) {
	        return res.status(500).send({ message: profile.error.message });
	      }
	      if (req.headers.authorization) {
	    	  
	    	  var query="select U_ID from USR_DTL_TBL where U_ID='"+profile.id+"';";
	     	 
	    	  mysql.dbcall(function(err,results){
	    		  if(err){
	    			  throw err;
	    		  }
	    		  else 
	    		  {
	    			  if(results) {
	        			  console.log("user looking up 1");
	        			  return res.status(409).send({ message: 'There is already a Facebook account that belongs to you' });
	    			  }
	    			  //res.send({"save":"Success"});
	    		  }  
	    	  },query);
	    	 
	          var token = req.headers.authorization.split(' ')[1];
	          var payload = jwt.decode(token, config.TOKEN_SECRET);
	          
	          var query="select U_ID from USR_DTL_TBL where U_ID='"+payload.id+"';";
	      	 
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
	      
	    	  console.log(profile.id);
	    	    
	    	  var sqlQuery="insert into db_pixel.USR_DTL_TBL (U_ID,UNAME,PICTURE,SRC,CREATION_DATE)" +
	      		" VALUES ('"+profile.id+"','"+profile.name+"','https://graph.facebook.com/v2.3/"+profile.id+'/picture?type=large'+
	      		"','F',SYSDATE())";  

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
	        // Step 3b. Create a new user account or return an existing one.
	    	  var query="select U_ID from USR_DTL_TBL where U_ID='"+profile.id+"';";
	       	     //var query="select * from USR_DTL_TBL;";
	       	     console.log("in else...!!!");
	       	     
	      		 mysql.dbcall(function(err,results){
	      			if(err){
	      				console.log("in error..!!!");
	      				throw err;
	      			}
	      			else 
	      			{
	      				if((results.length == 0)){
	      					
	      					var sqlQuery="insert into db_pixel.USR_DTL_TBL (U_ID,UNAME,PICTURE,SRC,CREATION_DATE)" +
	      		      		" VALUES ('"+profile.id+"','"+profile.name+"','https://graph.facebook.com/v2.3/"+profile.id+'/picture?type=large'+
	      		      		"','F',SYSDATE())";  

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

exports.connectFB = connectFB;