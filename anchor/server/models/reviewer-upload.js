'use strict';
const Joi = require('joi');
const Assert = require('assert');
const AnchorModel = require('../anchor/anchor-model');
const User = require('./user');
const Hoek = require('hoek');
const Config = require('../../config');
const { join } = require('path');

class ReviewerUpload extends AnchorModel {

    static async create(doc) {
        let document = {
            projectTitle: doc.projectTitle,
            dateUploaded: new Date(),
            reviewerName: doc.reviewerName,
            reviewerEmail: doc.reviewerEmail,
        };        

        const upload = await this.insertOne(document);
        return upload[0];
    }
}

ReviewerUpload.collectionName = 'proposal';

ReviewerUpload.routes = Hoek.applyToDefaults(AnchorModel.routes, { 
    insertMany: {
        disabled: false,
        payload: Joi.object({
            projectTitle: Joi.string(),
            reviewerName: Joi.string(),
            reviewerEmail: Joi.string(),
        })
    }
})

ReviewerUpload.schema = Joi.object({
    _id: Joi.object(),
    projectTitle: Joi.string(),
    reviewerName: Joi.string(),
    reviewerEmail: Joi.string(),
})

module.exports = ReviewerUpload