'use strict';
const Boom = require('boom');
const Config = require('../../../config');
const ReviewerUpload = require('../../models/reviewer-upload')
const User = require('../../models/user');
const ObjectId = require('mongodb').ObjectID;

const register = function (server, options){

    server.route({
        method: 'GET',
        path: '/reviewerUpload',
        options: {
            auth: {
                strategies: ['session'],
                scope: ['reviewer']
            }
        },
        handler: async function (request, h) {
            const user = request.auth.credentials.user;
            const query = {
                reviewerName: user.name
            }
            const files = await ReviewerUpload.find(query);
            return h.view('dashboard/index',{
                user: request.auth.credentials.user,
                filesFromDb: files,
                projectName: 'BROC-FHS',
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