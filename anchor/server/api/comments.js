'use strict';
const Boom = require('boom');
const Submission = require('../models/brief-submission');
const ConceptProposal = require('../models/concept-proposal');
const Comment = require('../models/brief-comment');
const User = require('../models/user');
const Joi = require('joi');
const ObjectId = require('mongodb').ObjectID;
const Mailer = require('../mailer');
const Config = require('../../config');

const register = function (server, options) {  

  server.route({
    method: 'POST',
    path: '/api/comments/sendEmailsToReviewers/{userId}/{briefSubId}/{proposalSubId?}',
    options: {
      auth: {
        strategies: ['simple', 'session'],
        scope: ['reviewer']        
      }      
    },      
    handler: async function (request, h) {

      const briefSubId = request.params.briefSubId;
      
      const commentor = await User.findById(request.params.userId);//user who has left a comment  
      if (!commentor) {
        throw Boom.notFound('User not found.');
      }     
      const reviewers = await User.find({'roles.reviewer': true, '_id': { $ne: commentor._id }});//find all the reviewers except ofr the one submitting the comment      
      const briefSub = await Submission.findById(briefSubId); 
                     
      if (!briefSub) {
        throw Boom.notFound('Brief Submission not found.');
      }

      //we need to send an email to each reviewer separately 
      for (let reviewer of reviewers) {

        const emailOptions = {
          subject: request.params.proposalSubId ? 'New comment submission on a concept proposal in BWHS portal' : 'New comment submission on a brief query in BWHS portal',
          to: {
            name: reviewer.name,
            address: reviewer.email
          }
        }; 
        
        try {
          await Mailer.sendEmail(emailOptions, 'comment-sub-notification-msg', {
            'name':reviewer.name,  
            'commentor': commentor.name,           
            'projectTitle': briefSub.query['10'],            
            'loginURL': Config.get('/baseUrl') + 'login',
            'formName': request.params.proposalSubId ? 'concept proposal' : 'brief query'
          });
        }
        catch (err) {          
          request.log(['mailer', 'error'], err);
        }        
      }

      return ({ message: 'Success'});
    }
  });
  
};

module.exports = {
  name: 'comments',
  dependencies: [
    'hapi-anchor-model',
    'auth'
  ],
  register
};