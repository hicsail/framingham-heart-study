'use strict';
const Boom = require('boom');
const Config = require('../../../config');
const Proposal = require('../../models/proposal')
const User = require('../../models/user');
const ObjectId = require('mongodb').ObjectID;

const register = function (server, options){

    server.route({
        method: 'GET',
        path: '/reviewer',
        options: {
            auth: {
                strategies: ['session'],
                scope: ['reviewer']
            }
        },
        handler: async function (request, h) {

            const user = request.auth.credentials.user;
            const proposals = await Proposal.lookup({}, Proposal.lookups);
            
            return h.view('reviewer/index',{
                user: request.auth.credentials.user,                
                projectName: Config.get('/projectName'),
                title: 'Reviewer Upload',
                baseUrl: Config.get('/baseUrl'),
                proposals
            })
        }
    })
}


module.exports = {
    name: 'proposal',
    dependencies: [
        'auth',
        'hapi-anchor-model'
    ],
    register
}