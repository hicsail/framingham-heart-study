'use strict';
const Joi = require('joi');
const Assert = require('assert');
const AnchorModel = require('../anchor/anchor-model');
const User = require('./user');
const Hoek = require('hoek');


class PostApprovalInfo extends AnchorModel {

  static async create(doc) {  

    Assert.ok(doc.briefSubmissionId, 'Missing briefSubmissionId argument.');    
    Assert.ok(doc.proposalSubmissionId, 'Missing proposalSubmissionId argument.');
    Assert.ok(doc.userId, 'Missing userId argument.');

    let document = {      
      briefSubmissionId: doc.briefSubmissionId,
      proposalSubmissionId: doc.proposalSubmissionId,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastUpdatedBy: doc.userId    
    };

    document['investigator'] = doc.investigator ? doc.investigator : null;      
    document['analyst'] = doc.analyst ? doc.analyst : null;
    document['DUADate'] = doc.DUADate ? doc.DUADate : null;      
    document['dataRequestDate'] = doc.dataRequestDate ? doc.dataRequestDate : null;
    document['preparationDate'] = doc.preparationDate ? doc.preparationDate : null      
    document['DUAStatus'] = doc.DUAStatus ? doc.DUAStatus : 'pending'; 
    document['dataReqStatus'] = doc.dataReqStatus ? doc.dataReqStatus : 'pending';      
    document['preparationStatus'] = doc.preparationStatus ? doc.preparationStatus : 'in queue';         

    const submissions = await this.insertOne(document);
    return submissions[0];
  }
}


PostApprovalInfo.collectionName = 'postApprovalInfo';

PostApprovalInfo.schema = Joi.object({
  _id: Joi.object(),  
  lastUpdatedBy: Joi.string().required(),
  briefSubmissionId: Joi.string().required(),
  proposalSubmissionId: Joi.string().required(),
  createdAt: Joi.date().required(),
  updatedAt: Joi.date().required(), 
  DUAStatus: Joi.string().required(),  
  dataReqStatus: Joi.string().required(),
  preparationStatus: Joi.string().required(),
  preparationDate: Joi.date(),
  dataRequestDate: Joi.date(),
  DUADate: Joi.date(),
  investigator: Joi.string(),
  analyst: Joi.string()
});

PostApprovalInfo.routes = Hoek.applyToDefaults(AnchorModel.routes, {  
  create: {
    payload: Joi.object({      
      briefSubmissionId: Joi.string().required(),
      proposalSubmissionId: Joi.string().required(),
      lastUpdatedBy: Joi.string().required(),            
    }),
    scope: ['root', 'reviewer']    
  },  
  update: { //need to finalize what's required here
    payload: Joi.object({
      feedback: Joi.string().optional().allow('').allow(null),
      status: Joi.string().required(),
      reviewerId: Joi.string().required(),
      decisionDate: Joi.date().required()      
    }),
    scope: ['root']    
  },
  delete: {
    scope: ['root']   
  }  
});

PostApprovalInfo.lookups = [
  {
    from: require('./user'),
    local: 'lastUpdatedBy',
    foreign: '_id',
    as: 'user',
    one: true
  },
  {
    from: require('./brief-submission'),
    local: 'briefSubmissionId',
    foreign: '_id',
    as: 'brief',
    one: true
  },
  {
    from: require('./concept-proposal'),
    local: 'proposalSubmissionId',
    foreign: '_id',
    as: 'proposal',
    one: true
  }
];

PostApprovalInfo.indexes = [
  { key: { userId: 1 } }  
];

module.exports = PostApprovalInfo;