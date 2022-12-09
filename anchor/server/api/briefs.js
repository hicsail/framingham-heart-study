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
    method: 'GET',
    path: '/api/briefSubmission/table',
    options: {
      auth: {
        strategies: ['simple', 'session'],
        scope: ['reviewer', 'root']
      }      
    },      
    handler: async function (request, h) {

      const sortOrder = request.query['order[0][dir]'] === 'asc' ? '' : '-';
      let sort = { createdAt : -1 };      
      const limit = Number(request.query.length);
      const page = Math.ceil(Number(request.query.start) / limit) + 1;      

      if ('createdAt' in request.query) {
        let start; 
        let end;               
        if(request.query['createdAt'].includes(':')) { //range date filter 
          start = new Date (request.query['createdAt'].split(':')[0]).toISOString();
          end = new Date (request.query['createdAt'].split(':')[1]).toISOString();           
        }        
        else { //exact date match filter
          const date = new Date(request.query['createdAt']);          
          start = date.toISOString();
          end = new Date(date.setDate(date.getDate() + 1)).toISOString();           
        }
        
        request.query['$and'] = [ {'createdAt': {$gte: new Date(start)}}, {'createdAt': {$lt: new Date(end)}}]
        delete request.query.createdAt; 
      }
      if ('sort' in request.query) {
        sort = {}; //delete default sort keys 
        const sortKey = request.query['sort'].split(':')[0];
        const value = request.query['sort'].split(':')[1];
        sort[sortKey] = Number(value);
        delete request.query.sort;
      }
      if ('reviewerId' in request.query) {        
        const comments = await Comment.find({userId: request.query['reviewerId']});        
        const commentedBriefIds = comments.map(comment => new ObjectId(comment.briefSubmissionId));        
        request.query['$or'] = [ {'_id': { '$in': commentedBriefIds }}, {'reviewerId': new ObjectId(request.query['reviewerId'])}];
        delete request.query.reviewerId;              
      }

      const options = {
        collation: { locale: "en" },
        sort: sort        
      };  
      
      const results =  await Submission.pagedLookup(request.query, page, limit, options, Submission.lookups);      
      for (let i=0; i < results.data.length; ++i) {
        const res = results.data[i];
        const briefSubmissionId = res._id.toString();
        const proposals = await ConceptProposal.find({briefSubmissionId}, {sort:{createdAt : -1 }});        
        if (proposals.length > 0) {          
          results.data[i]['proposal'] = proposals[0];
        }
        else {
          results.data[i]['proposal'] = {};            
        }          
      }     
      
      return {
        draw: request.query.draw,
        recordsTotal: results.data.length,
        recordsFiltered: results.items.total,
        data: results.data
      };      
    }
  });  

  server.route({
    method: 'PUT',
    path: '/api/briefSubmission/submitReview/{id}',
    options: {
      auth: {
        strategies: ['simple', 'session'],
        scope: ['reviewer', 'root']
      },
      validate: {
         payload: {
          status: Joi.string().required(),          
          feedback: Joi.string().optional().allow('').allow(null),
          rejectionReason: Joi.string().optional().allow('').allow(null)
        }
      }
    },      
    handler: async function (request, h) {

      const submissionId = request.params.id;
      let statusToTemplateMapping = {'approved': 'approval-msg',
                                     'rejected': 'rejection-msg'};
      
      const update = {
        $set: {
          status: request.payload.status,
          reviewerId: request.auth.credentials.user._id,
          feedback: request.payload.feedback,
          decisionDate: new Date()
        }
      };

      if (request.payload.rejectionReason) {
        update['$set']['rejectionReason'] = request.payload.rejectionReason;
      }

      const submission = await Submission.findByIdAndUpdate(submissionId, update); 
                     
      if (!submission) {
        throw Boom.notFound('Submission not found.');
      }

      const user = await User.findById(submission.userId);

      if (!user) {
        throw Boom.notFound('User not found.');
      }             
      
      const emailOptions = {
        subject: 'Status of your brief query submission for ' + submission.query['10'],
        to: {
          name: user.name,          
          address: user.email
        },
        bcc: Config.get('/bccReviewrs')
      }; 

      const emailTemplateData = {
        'name':user.name,             
        'projectTitle': submission.query['10'],
        'loginURL': Config.get('/baseUrl') + 'login'  
      };

      if (request.payload.rejectionReason) {
        emailTemplateData['rejectionReason'] = request.payload.rejectionReason;
      }

      try {
        await Mailer.sendEmail(emailOptions, statusToTemplateMapping[submission.status], emailTemplateData);
      }
      catch (err) {
        request.log(['mailer', 'error'], err);
      }     

      return ({ message: 'Success' , submission: submission});      
    }
  });  

  server.route({
    method: 'POST',
    path: '/api/briefSubmission/sendEmailsToReviewers/{briefSubId}/{proposalSubId?}',
    options: {
      auth: {
        strategies: ['simple', 'session']
      }      
    },      
    handler: async function (request, h) {

      const briefSubId = request.params.briefSubId;
      //find all the reviewers 
      const reviewers = await User.find({'roles.reviewer': true});
      
      const submission = await Submission.findById(briefSubId); 
                     
      if (!submission) {
        throw Boom.notFound('Brief Submission not found.');
      }

      const user = await User.findById(submission.userId);

      if (!user) {
        throw Boom.notFound('User not found.');
      }             
      
      //we need to send an email to each reviewer separately 
      for (let reviewer of reviewers) {

        const emailOptions = {
          subject: request.params.proposalSubId ? 'New concept proposal submission in BWHS portal' : 'New brief query submission in BWHS portal',
          to: {
            name: reviewer.name,
            address: reviewer.email
          }
        }; 
        
        try {
          await Mailer.sendEmail(emailOptions, 'brief-sub-notification-msg', {
            'name':reviewer.name,             
            'projectTitle': submission.query['10'],
            'requester': user.name,
            'position': submission.query['3'],
            'instituition': submission.query['4'], 
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

  /*server.route({
    method: 'GET',
    path: '/api/briefSubmission/history/{submissionId}/{userId}/{createdAt}',
    options: {
      auth: {
        strategies: ['simple', 'session'],
        scope: ['reviewer', 'root']
      }      
    },      
    handler: async function (request, h) {

      const filter = {
          userId: request.params.userId,
          createdAt: new Date(request.params.createdAt),
          _id: { $ne: new ObjectId(request.params.submissionId) }                   
      };

      const pipeline = [
        { $match :  filter},        
        { $lookup: {          
          from: "users",
          localField: "reviewerId",   
          foreignField: "_id",  
          as: "reviewer"
        }},        
        { $group: {
          _id: { id: '$_id'},          
          objectId: { $first : '$_id' },
          updatedAt: {$first : '$updatedAt'},
          reviewer: {$first : '$reviewer'}           
        }}
      ];     
      
      const submissions = await Submission.aggregate(pipeline);     
      return (submissions);
    }
  });*/  
};

module.exports = {
  name: 'briefSubmissions',
  dependencies: [
    'hapi-anchor-model',
    'auth'
  ],
  register
};