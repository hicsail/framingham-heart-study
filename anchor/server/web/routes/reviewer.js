'use strict';
const Boom = require('boom');
const Config = require('../../../config');
const Submission = require('../../models/brief-submission');
const ConceptProposal = require('../../models/concept-proposal');
const Comment = require('../../models/brief-comment');
const User = require('../../models/user');
const ObjectId = require('mongodb').ObjectID;

const register = function (server, options){

    server.route({
        method: 'GET',
        path: '/reviewerUpload',
        options: {
            auth: {
                strategies: ['session'],
                scope: ['committee_member']
            }
        },
        handler: async function (request, h) {
            const user = request.auth.credentials.user;

            return h.view('reviewer/index',{
                user: request.auth.credentials.user,
                projectName: 'Change later lmao',
                title: 'Reviewer Upload',
                baseUrl: Config.get('/baseUrl')
            })
        }
    })
}


module.exports = {
    name: 'reviewer-upload',
    dependencies: [
        'auth',
        'hapi-anchor-model'
    ],
    register
}