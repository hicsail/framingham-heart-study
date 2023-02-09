'use strict';
const Config = require('../../../config');
const PermissionConfigTable = require('../../permission-config.json');
const DefaultScopes = require('../../helper/getRoleNames');
const Submission = require('../../models/brief-submission');
const ConceptProposal = require('../../models/concept-proposal');

const register = function (server, options) {

  server.route({
    method: 'GET',
    path: '/dashboard',
    options : {
      auth: {
        strategies: ['session']
        //scope: PermissionConfigTable.GET['/dashboard'] || DefaultScopes
      }
    },
    handler: async function (request, h) {

      const user = request.auth.credentials.user;
      let submissions;
      let approvedSubs;
      let numReviewed;
      let numRejected;
      let numApproved;
      let feed = {'resubmittedBriefs': null};
      let hasApprovedSubmission = false;  

      if (user.roles.reviewer) {
          
      }
      else if (!user.roles.reviewer) {

        const options = {
          sort: Submission.sortAdapter('-createdAt')
        };
        const mostRecentSubmissions = await Submission.find({userId: user._id.toString()}, options);

        submissions = mostRecentSubmissions.map(doc => {
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
      
      return h.view('dashboard/index', {
        user,
        projectName: Config.get('/projectName'),
        title: 'Dashboard',
        baseUrl: Config.get('/baseUrl'),
        submissions,
        numReviewed,
        numRejected,
        numApproved,
        approvedSubs,
        hasApprovedSubmission,
        resubmittedBriefs: feed['resubmittedBriefs']
      });
    }
  });
};

module.exports = {
  name: 'dashboard',
  dependencies: [
    'hapi-anchor-model',
    'auth'
  ],
  register
};
