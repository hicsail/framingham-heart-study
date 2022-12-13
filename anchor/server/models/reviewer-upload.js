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
            applicantName: doc.applicantName,
            institutionName: doc.institutionName,
            dateUploaded: new Date(),
            reviewerName: doc.reviewerName,
            reviewerEmail: doc.reviewerEmail,
            approvalStatus: doc.approvalStatus ? doc.approvalStatus : 'pending',
            fundedStatus: doc.fundedStatus ? doc.fundedStatus : false,
            decisionDate: doc.decisionDate ? doc.decisionDate : '',
            pdfLink: doc.pdfLink
        };        

        const upload = await this.insertOne(document);
        return upload[0];
    }
}

ReviewerUpload.collectionName = 'reviewerUpload';

ReviewerUpload.schema = Joi.object({
    _id: Joi.object(),
    projectTitle: Joi.string(),
    applicantName: Joi.string(),
    institutionName: Joi.string(),
    dateUploaded: Joi.date(),
    reviewerName: Joi.string(),
    reviewerEmail: Joi.string(),
    approvalStatus: Joi.string(),
    fundedStatus: Joi.boolean().default(false),
    decisionDate: Joi.date(),
    pdfLink: Joi.string()
})

module.exports = ReviewerUpload