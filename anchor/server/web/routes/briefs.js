'use strict';
const Boom = require('boom');
const Config = require('../../../config');
const Submission = require('../../models/brief-submission');
const ConceptProposal = require('../../models/concept-proposal');
const Comment = require('../../models/brief-comment');
const User = require('../../models/user');
const ObjectId = require('mongodb').ObjectID;

const register = function (server, options) {

  server.route({
    method: 'GET',
    path: '/brief/{submissionId?}',
    options : {
      auth: {
        strategies: ['session']
      }
    },
    handler: async function (request, h) {

      let reviewerSection = false;      
      let submissionsList = null;// list of submissions created by loggedin user 
      let submission = null;// submission with _id equal to submission id 
      let comments = [];     
      const user = request.auth.credentials.user;
      let approvedSubs;
      let conceptProposals = []; //concept proposals submitted for the brief submission      

      if (request.params.submissionId) {
        
        submission = await Submission.lookupById(request.params.submissionId, [Submission.lookups[0],Submission.lookups[1]]);
        if (!submission) {
          throw Boom.notFound('Brief submission not found.');
        }
        conceptProposals = await ConceptProposal.find({ briefSubmissionId: submission._id.toString() }, 
                                                      { sort: ConceptProposal.sortAdapter('-createdAt')});
        if (user.roles.reviewer) { //show comments only to reviewer 
          comments = await Comment.lookup({briefSubmissionId: request.params.submissionId}, {sort: {createdAt: -1}}, [Comment.lookups[0]]);
        }
        if (user.roles.reviewer && submission.status === 'pending'){
          reviewerSection = true;
        }   
      }

      if (!request.params.submissionId || (request.params.submissionId && !user.roles.reviewer)) {
        
        const options = {
          sort: Submission.sortAdapter('-createdAt')
        };
        //need this for showing the submissions on the dashboard when the registered user is investigator
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

        const mostRecentProposals = await ConceptProposal.aggregate(pipeline);//first find the most recent submitted proposals for each brief submission
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
      
      return h.view('briefs/index', {
        user: request.auth.credentials.user,
        projectName: Config.get('/projectName'),
        title: 'Brief Query Submission',
        baseUrl: Config.get('/baseUrl'),        
        submissions: submissionsList,
        submission,
        comments,        
        reviewerSection,
        approvedSubs,
        conceptProposals,                     
        shortTitle: submission ? submission.query['10'] : null,        
      });
    }
  });

  server.route({
    method: 'GET',
    path: '/brief/review',
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
      let proposalsHash = {};

      /*
        first find the concept proposals for each brief query submission and
        create a dictinoary with brief submission id as the key and 
        corresponding proposal docs as the value
      */
      const pipeline = [                 
        { $group: {
          _id: { briefSubmissionId: '$briefSubmissionId' },
          docs: { $push: '$$ROOT' }                             
        }}
      ];

      const proposals = await ConceptProposal.aggregate(pipeline);
      //create the dictionary
      for (let proposal of proposals) {
        const key = proposal['_id']['briefSubmissionId'];
        proposalsHash[key] = [];
        for (let doc of proposal['docs']) {          
          proposalsHash[key].push(doc);
        }
      }    
      
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
      
      const mostRecentSubmissions =  await Submission.pagedLookup(request.query, page, limit, options, [Submission.lookups[1]]);      
      const submissionIds = mostRecentSubmissions.data.map(sub => sub._id.toString());      
      const comments = await Comment.lookup({briefSubmissionId: {$in: submissionIds}}, {sort: {createdAt: -1}}, [Comment.lookups[0]]);
      const commentsHash = {};
      for (let cm of comments) {
        commentsHash[cm.briefSubmissionId] = cm;
      }

      const submissions = mostRecentSubmissions.data.map(doc => {
        return {
          'id': doc._id.toString(),         
          'userId': doc.userId,
          'createdAt': doc.createdAt.toJSON(),
          'dateString': doc.createdAt.toDateString(),
          'updatedAtString': doc.updatedAt.toDateString(),
          'status': doc.status,          
          'projectTitle': doc.query['9'],
          'shortTitle': doc.query['10'],
          'name': doc.query['1'],
          'email': doc.query['5'],
          'position': doc.query['3'],
          'instituition': doc.query['4'],
          'reviewer': doc.reviewer,
          'comments': commentsHash[doc._id.toString()],
          'conceptProposals': proposalsHash[doc._id.toString()]
        };
      });
      
      for (let i=1; i<=mostRecentSubmissions.pages.total; i++){
        pages.push(i);
      }      

      const usersList = await User.find({'roles': {}}, {'name':1, '_id':1});
      const reviewersList = await User.find({'roles.reviewer': true}, {'name':1, '_id':1});

      const numReviewed = await Submission.count({reviewerId: user._id});          
      const numRejected = await Submission.count({reviewerId: user._id, status: 'rejected'});
      const numApproved = await Submission.count({reviewerId: user._id, status: 'approved'});          
      
      return h.view('briefs/review', {
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

  server.route({
    method: 'GET',
    path: '/edit/briefSubmission/{submissionId}',
    options : {
      auth: {
        strategies: ['session'],
        scope: ['root']
      }
    },
    handler: async function (request, h) {

       
      const user = request.auth.credentials.user;      
      const submissionId = request.params.submissionId;      
      const submission = await Submission.findById(submissionId);       
      
      return h.view('briefs/editView', {
        user: request.auth.credentials.user,
        projectName: Config.get('/projectName'),
        title: 'Brief Query Submission Edit View',
        baseUrl: Config.get('/baseUrl'),        
        submission,                   
        shortTitle: submission ? submission.query['10'] : null,        
      });
    }
  });
};

module.exports = {
  name: 'brief',
  dependencies: [
  'hapi-anchor-model',
  'auth'
  ],
  register
};