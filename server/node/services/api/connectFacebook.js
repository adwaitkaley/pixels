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
	    	  User.User.findOne({ facebook: profile.id }, function(err, existingUser) {
	          if (existingUser) {
	            return res.status(409).send({ message: 'There is already a Facebook account that belongs to you' });
	          }
	          var token = req.headers.authorization.split(' ')[1];
	          var payload = jwt.decode(token, config.TOKEN_SECRET);
	          User.User.findById(payload.sub, function(err, user) {
	            if (!user) {
	              return res.status(400).send({ message: 'User not found' });
	            }
	            user.facebook = profile.id;
	            user.picture = user.picture || 'https://graph.facebook.com/v2.3/' + profile.id + '/picture?type=large';
	            user.displayName = user.displayName || profile.name;
	            user.save(function() {
	              var token = jwtServer.createJWT(user);
	              res.send({ token: token });
	            });
	          });
	        });
	      } else {
	        // Step 3b. Create a new user account or return an existing one.
	    	  User.User.findOne({ facebook: profile.id }, function(err, existingUser) {
	          if (existingUser) {
	            var token = jwtServer.createJWT(existingUser);
	            return res.send({ token: token });
	          }
	          var user = new User.User();
	          user.facebook = profile.id;
	          user.picture = 'https://graph.facebook.com/' + profile.id + '/picture?type=large';
	          user.displayName = profile.name;
	          user.save(function() {
	            var token = jwtServer.createJWT(user);
	            res.send({ token: token });
	          });
	        });
	      }
	    });
	  });
}

exports.connectFB = connectFB;