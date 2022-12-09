'use strict';
const Boom = require('boom');
const Config = require('../../../config');
const Submission = require('../../models/brief-submission');
const ConceptProposal = require('../../models/concept-proposal');
const Comment = require('../../models/proposal-comment');
const User = require('../../models/user');
const ObjectId = require('mongodb').ObjectID;

const register = function (server, options) {

  server.route({
    method: 'GET',
    path: '/proposal/{briefSubmissionId}/{submissionId?}',
    options : {
      auth: {
        strategies: ['session']
      }
    },
    handler: async function (request, h) {

      let reviewerSection = false; 
      let disableInputs = true;
      const user = request.auth.credentials.user; 
      const briefSubmissionId = request.params.briefSubmissionId;
      let mostRecentProposal = null;
      let submissionsList = null;// list of submissions created by loggedin user
      let comments = []; 
      let approvedSubs;       

      //information required to be retrieved from the DB to be shown on dashboard when user is not reviewer 
      if (!user.roles.reviewer) {
        
        const options = {
          sort: Submission.sortAdapter('-createdAt')
        };
        //need this for showing the brief submissions list on the dashboard when the registered user is investigator
        const mostRecentSubmissions = await Submission.find({userId: user._id.toString()}, options);

        submissionsList = mostRecentSubmissions.map(doc => {
          return {'id': doc._id.toString(), 'status': doc.status, 'title': doc.query[10]};
        }); 

        // find the concepts proposals for the approved brief query submissions 
        const pipeline = [
          { $match : { userId: user._id.toString() }},
          { $sort:{ createdAt : -1 }},          
          { $group: {
            _id: { briefSubmissionId: '$briefSubmissionId' },
            objectId: { $first : '$_id' },
            status: { $first : '$status' }                     
          }}
        ]; 

        const mostRecentProposals = await ConceptProposal.aggregate(pipeline);// first find the most recent submitted proposals for each brief submission
        const proposalDict = {};
        for (let proposal of mostRecentProposals) {
          proposalDict[proposal['_id']['briefSubmissionId']] = {'status': proposal['status'], 
                                                                'id': proposal['objectId'].toString()};
        } 

        const approvedSubmissions = await Submission.find({userId: user._id.toString(), status: 'approved'}, options);
        approvedSubs = approvedSubmissions.map(doc => {
          if (doc._id.toString() in proposalDict)
            return {'briefSubmissionId': doc._id.toString(), 
                    'title': doc.query[10], 
                    'status': proposalDict[doc._id.toString()]['status'],
                    'proposalSubmissionId': proposalDict[doc._id.toString()]['id']};
          else
            return {'briefSubmissionId': doc._id.toString(), 'title': doc.query[10]};

        });               
      }

      if (request.params.submissionId) {

        mostRecentProposal = await ConceptProposal.findById(request.params.submissionId);
        if (!mostRecentProposal) {
          throw Boom.notFound('Proposal submission not found.');
        }
        if ( user.roles.reviewer && mostRecentProposal.status === 'pending'){
          reviewerSection = true;
        }
        if (mostRecentProposal.status === 'rejected' && !user.roles.reviewer) {// case when investigor's submission has been rejected
          disableInputs = false; 
        }
        if (user.roles.reviewer) { //show comments only to reviewer
          comments = await Comment.lookup({submissionId: request.params.submissionId}, {sort: {createdAt: -1}}, [Comment.lookups[0]]);
        }
      }  

      //find the brief query submission for getting the short title 
      const briefSubmission = await Submission.findById(briefSubmissionId); 
      if (!briefSubmission) {
        throw Boom.notFound('brief submission not found.');  
      }

      return h.view('proposals/index', {
        user: user,
        projectName: Config.get('/projectName'),
        title: 'BWHS Analysis Proposal',
        baseUrl: Config.get('/baseUrl'), 
        submissions: submissionsList,       
        proposal: mostRecentProposal,
        approvedSubs,
        reviewerSection,
        disableInputs,
        comments,
        briefSubmission,
        files: mostRecentProposal && mostRecentProposal.files ? mostRecentProposal.files : null,       
        shortTitle: briefSubmission ? briefSubmission.query['10'] : 'N/A'         
      });
    }
  });

 server.route({
    method: 'GET',
    path: '/proposal/review',
    options : {
      auth: {
        strategies: ['session'],
        scope: ['reviewer', 'root']
      }
    },
    handler: async function (request, h) {
      
      const user = request.auth.credentials.user;
      let sort = { createdAt : -1 };
      let limit = null;
      let page = 1;
      const pages = [];
      
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
      if ('reviewerId' in request.query) {        
        const comments = await Comment.find({userId: request.query['reviewerId']});        
        const commentedBriefIds = comments.map(comment => new ObjectId(comment.briefSubmissionId));        
        request.query['$or'] = [ {'_id': { '$in': commentedBriefIds }}, {'reviewerId': new ObjectId(request.query['reviewerId'])}];
        delete request.query.reviewerId;              
      }
      if ('sort' in request.query) {
        sort = {}; //delete default sort keys 
        const sortKey = request.query['sort'].split(':')[0];
        const value = request.query['sort'].split(':')[1];
        sort[sortKey] = Number(value);
        delete request.query.sort;
      }
      if ('limit' in request.query) {        
        limit = Number(request.query['limit']);        
        delete request.query.limit;        
      }
      else {
        //limit = await Submission.count({}); 
        limit = 50;
      }
      if ('page' in request.query) {        
        page = Number(request.query['page']);        
        delete request.query.page;        
      }
      
      const options = {
        collation: { locale: "en" },
        sort: sort
      };

      const pipeline = [               
        { $sort:{ createdAt : -1 }},
        { $group: {          
          _id: { briefSubmissionId: '$briefSubmissionId' },          
          count:{ $sum: 1 },
          objectId: { $first : '$_id' }                    
        }}        
      ];
      
      const mostRecentProposals = await ConceptProposal.aggregate(pipeline);
      const countsDict = {};
      for (let pro of mostRecentProposals) {
        countsDict[pro['objectId']] = pro['count'];        
      }      
      const mostRecentProposalIds = mostRecentProposals.map(doc => { return doc.objectId; });      
      request.query['_id'] =  { $in:  mostRecentProposalIds };
      const mostRecentSubmissions =  await ConceptProposal.pagedLookup(request.query, page, limit, options, ConceptProposal.lookups);      
           
      const comments = await Comment.lookup({briefSubmissionId: { $in: mostRecentProposalIds }}, {sort: {createdAt: -1}}, [Comment.lookups[0]]);
      const commentsHash = {};
      for (let cm of comments) {
        commentsHash[cm.briefSubmissionId] = cm;
      }
          
      const submissions = mostRecentSubmissions.data.map(doc => {
        return {
          'id': doc._id.toString(),
          'briefSubmissionId': doc.briefSubmissionId,
          'userId': doc.userId,
          'createdAt': doc.createdAt.toJSON(),
          'dateString': doc.createdAt.toDateString(),         
          'status': doc.status,          
          'projectTitle': doc.query['9'],
          'shortTitle': doc.brief ? doc.brief.query['10'] : 'N/A',
          'name': doc.user.name,
          'email': doc.brief ? doc.brief.query['5'] : 'N/A',
          'position': doc.brief ? doc.brief.query['3'] : 'N/A',
          'instituition': doc.brief ? doc.brief.query['4'] : 'N/A',
          'reviewer': doc.reviewer,
          'comments': commentsHash[doc._id.toString()],
          'numSubmissions': countsDict[doc._id.toString()],
          'hasHistory': countsDict[doc._id.toString()] > 1 ? true : false
        };
      }); 
      for (let i=1; i<=mostRecentSubmissions.pages.total; i++){
        pages.push(i);
      }
      const usersList = await User.find({'roles': {}}, {'name':1, '_id':1});
      const reviewersList = await User.find({'roles.reviewer': true}, {'name':1, '_id':1});

      const numReviewed = await ConceptProposal.count({reviewerId: user._id});          
      const numRejected = await ConceptProposal.count({reviewerId: user._id, status: 'rejected'});
      const numApproved = await ConceptProposal.count({reviewerId: user._id, status: 'approved'});          
      
      return h.view('proposals/review', {
        user,
        projectName: Config.get('/projectName'),
        title: 'Brief Query Submission',
        baseUrl: Config.get('/baseUrl'),
        submissions,
        pages,
        usersList,
        reviewersList,
        numReviewed,
        numRejected,
        numApproved,        
        hasNext: mostRecentSubmissions.pages.hasNext,
        hasPrev: mostRecentSubmissions.pages.hasPrev,
        prev: mostRecentSubmissions.pages.prev,
        next: mostRecentSubmissions.pages.next,
        currentPage: mostRecentSubmissions.pages.current,
        totalNumPages: mostRecentSubmissions.pages.total,
        total: mostRecentSubmissions.items.total,
        notDatatableView: true
      });
    }
  });
};

module.exports = {
  name: 'proposal',
  dependencies: [
  'hapi-anchor-model',
  'auth'
  ],
  register
};