'use strict';
const Boom = require('boom');
const Submission = require('../models/brief-submission');
const ConceptProposal = require('../models/concept-proposal');
const Comment = require('../models/proposal-comment');
const User = require('../models/user');
const Joi = require('joi');
const ObjectId = require('mongodb').ObjectID;
const Mailer = require('../mailer');
const Config = require('../../config');

const register = function (server, options) {

  server.route({
    method: 'GET',
    path: '/api/conceptProposal/table',
    options: {
      auth: {
        strategies: ['simple', 'session'],
        scope: ['reviewer', 'root']
      }      
    },      
    handler: async function (request, h) {

      let sort = { createdAt : -1 };      
      const limit = Number(request.query.length);
      const page = Math.ceil(Number(request.query.start) / limit) + 1; 
      let sortByTitle = false;  
      let sortByTitleValue; 

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

        if (sortKey === 'query.10') {
          sortByTitle = true;
          sortByTitleValue = value;
        }
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
      
      const results =  await ConceptProposal.pagedLookup(request.query, page, limit, options, ConceptProposal.lookups);

      if (sortByTitle) { //have to sort by title manually since title is part of brief query objects attached after look up
        results.data.sort((elem1, elem2) => {
          let key1 = elem1.brief ? elem1.brief.query[10] : 'N/A';
          let key2 = elem2.brief ? elem2.brief.query[10] : 'N/A';          
          if (sortByTitleValue === '-1') {
            const temp = key1;
            key1 = key2;
            key2 = temp;
          }          
          return key1.localeCompare(key2, 'en');                       
        });
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
    path: '/api/conceptProposal/editPostApproval/{id}',
    options: {
      auth: {
        strategies: ['simple', 'session'],
        scope: ['reviewer', 'root']
      },
      /*validate: {
        payload: ConceptProposal.postApprovalPayload
      }*/
    },      
    handler: async function (request, h) {

      const submissionId = request.params.id; 
      const userId = request.auth.credentials.user._id.toString(); 
      let postApprovalInfo = request.payload.postApprovalInfo; 
      postApprovalInfo['updatedAt'] = new Date(); 
      postApprovalInfo['updatedBy'] =  userId;
      
      const update = {
        $set: {
          postApprovalInfo: postApprovalInfo          
        }
      };      

      const proposalSubmission = await ConceptProposal.findByIdAndUpdate(submissionId, update);     
                     
      if (!proposalSubmission) {
        throw Boom.notFound('Submission not found.');
      }      
      return ({ message: 'Success' , submission: proposalSubmission});
    }
  }); 

  server.route({
    method: 'PUT',
    path: '/api/conceptProposal/uploadFile/{id}',
    options: {
      auth: {
        strategies: ['simple', 'session'],
        scope: ['reviewer', 'root']
      },
      validate: {
        payload: {
          fileName: Joi.string().required(), 
          content: Joi.string().required() 
        }
      }
    },      
    handler: async function (request, h) {

      const submissionId = request.params.id; 
      const userId = request.auth.credentials.user._id.toString(); 
      const fileName = request.payload.fileName;
      const content = request.payload.content;
      let files = {};

      let proposalSubmission = await ConceptProposal.findById(submissionId);
      if (!proposalSubmission) {
        throw Boom.notFound('Submission not found.');
      }     

      if (proposalSubmission.files) {
        files = proposalSubmission.files;
        if (fileName in files) {
          throw Boom.badRequest('A file with the same name already exists.');
        }
      }  

      files[fileName] = {
        'content': content,
        'date': new Date(),
        'userId': userId
      };      
      
      const update = {
        $set: {
          files: files         
        }
      };      

      proposalSubmission = await ConceptProposal.findByIdAndUpdate(submissionId, update);
      return ({ message: 'Success' , submission: proposalSubmission});
    }
  });   

  server.route({
    method: 'PUT',
    path: '/api/conceptProposal/submitReview/{id}',
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
      let statusToTemplateMapping = {'approved': 'proposal-approval-msg',
                                     'rejected': 'proposal-rejection-msg'};
      
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

      const proposalSubmission = await ConceptProposal.findByIdAndUpdate(submissionId, update); 
                     
      if (!proposalSubmission) {
        throw Boom.notFound('Submission not found.');
      }

      const briefSubmission = await Submission.findById(proposalSubmission.briefSubmissionId);
      const user = await User.findById(proposalSubmission.userId);

      if (!user) {
        throw Boom.notFound('User not found.');
      }             
      
      const emailOptions = {
        subject: 'Status of your concept proposal submission for ' + briefSubmission.query[10],
        to: {
          name: user.name,
          address: user.email
        },
        bcc: Config.get('/bccReviewrs')
      };

      const emailTemplateData = {
        'name':user.name,             
        'projectTitle': briefSubmission.query['10'],
        'loginURL': Config.get('/baseUrl') + 'login'  
      };

      if (request.payload.rejectionReason) {
        emailTemplateData['rejectionReason'] = request.payload.rejectionReason;
      } 

      try {
        await Mailer.sendEmail(emailOptions, statusToTemplateMapping[proposalSubmission.status], emailTemplateData);
      }
      catch (err) {
        request.log(['mailer', 'error'], err);
      }     

      return ({ message: 'Success' , submission: proposalSubmission});
    }
  });  

  server.route({
    method: 'GET',
    path: '/api/conceptProposal/history/{briefSubmissionId}/{submissionId}',
    options: {
      auth: {
        strategies: ['simple', 'session'],
        scope: ['reviewer', 'root']
      }      
    },      
    handler: async function (request, h) {

      const options = {
          sort: ConceptProposal.sortAdapter('-createdAt')
      };

      const filter = {
          briefSubmissionId: request.params.briefSubmissionId,
          _id: { $ne: new ObjectId(request.params.submissionId) }                             
      };

      const proposals = await ConceptProposal.find(filter, options);        
      return (proposals);
    }
  });  
};

module.exports = {
  name: 'proposalSubmissions',
  dependencies: [
    'hapi-anchor-model',
    'auth'
  ],
  register
};