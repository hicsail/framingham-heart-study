'use strict';
const Comment = require('../models/brief-comment');

const register = function (server, options) {  

  server.route({
    method: 'GET',
    path: '/api/briefComments/{submissionId}',
    options: {
      auth: {
        strategies: ['simple', 'session'],
        scope: ['reviewer', 'root']
      }      
    },      
    handler: async function (request, h) {

      const filter = {
        briefSubmissionId: request.params.submissionId                         
      };
      const options = {
        sort: {createdAt: -1}
      }      
      const comments = await Comment.lookup(filter, options, [Comment.lookups[0]]);     
      return comments;
    }
  });  
};

module.exports = {
  name: 'briefComments',
  dependencies: [
    'hapi-anchor-model',
    'auth'
  ],
  register
};