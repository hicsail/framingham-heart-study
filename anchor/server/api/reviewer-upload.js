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

const register = function (server, options){

    server.route({
        method: 'POST',
        path: '/api/reviewUpload',
        options: {
            auth: {
                strategies: ['simple','session'],
                scope: ['reviewer', 'root']
            }
        },
        handler: async function (request, h){
            console.log(request.payload);
            return 0;
            //need to compile the data to create new document 
            //make call to an S3 endpoint to upload file to S3 and get the link
        }
    });
}

module.exports = {
    name: 'api-reviewupload',
    dependencies: [
        'hapi-anchor-model',
        'auth'
    ],
    register
}