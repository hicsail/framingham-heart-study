'use strict';
const Joi = require('joi');
const Assert = require('assert');
const AnchorModel = require('../anchor/anchor-model');
const User = require('./user');
const Hoek = require('hoek');
const Config = require('../../config');

class BriefSubmmission extends AnchorModel {

  static async create(doc) {  

    Assert.ok(doc.query, 'Missing query argument.');    
    Assert.ok(doc.userId, 'Missing userId argument.');

    let document = {
      userId: doc.userId, //user of user who submitted 
      query: doc.query,
      feedback: null, 
      decisionDate: null //date on which a rejection or approval  happens    
    };

    document['status'] = doc.status ? doc.status : 'pending';
    document['createdAt'] = doc.createdAt ? doc.createdAt : new Date();
    document['updatedAt'] = doc.updatedAt ? doc.updatedAt : new Date();
    document['reviewerId'] = doc.reviewerId ? doc.reviewerId : null;       

    const submissions = await this.insertOne(document);
    return submissions[0];
  }
}


BriefSubmmission.collectionName = 'briefSubmission';

BriefSubmmission.schema = Joi.object({
  _id: Joi.object(),  
  userId: Joi.string().required(),
  query: Joi.object().required(),  
  status: Joi.string().optional(),
  createdAt: Joi.date().required(),
  updatedAt: Joi.date().optional(), 
  decisionDate: Joi.date().optional(),
  reviewerId: Joi.string().optional(),
  feedback: Joi.string().optional(),
  rejectionReason: Joi.string().optional().allow('').allow(null),  
});

BriefSubmmission.routes = Hoek.applyToDefaults(AnchorModel.routes, {
  tableView: {
    outputDataFields: {
      'query.10': { label: 'Project Short title' },
      name: { label: 'User\'s name', from: 'user' },
      email: { label: 'User\'s email', from: 'user' },
      reviewerName: { label: 'Reviewer\'s name', from: 'reviewer', property: 'name' },
      reviewerEmail: { label: 'Reviewer\'s email', from: 'reviewer', property: 'email' },       
      createdAt: { label: 'Submission date of brief query'},
      status: { label: 'Status of brief query' },  
      decisionDate: { label: 'Decision date of brief query', invisible: true }, 
      feedback: { label: 'Reviwer\'s feedback for brief query', invisible: true },      
      _id: { label: 'ID', invisible: true },
      proposalLink: {label: 'Proposal Link',                      
                    function: (briefId, proposalId) => { return '../../../proposal/' + briefId + '/' + proposalId;},
                    arguments: [{property: '_id'}, {property: '_id', from: 'proposal'}]
                    },
      proposalCreationDate: { label: 'Submission date of full concept proposal', from: 'proposal', property: 'createdAt' },
      proposalStatus: { label: 'Status of full concept proposal', from: 'proposal', property: 'status' },
      proposalDecisionDate: { label: 'Decision date of full concept proposal', from: 'proposal', property: 'decisionDate' },
      proposalFeedBack: { label: 'Reviewer feedback for full concept proposa', from: 'proposal', property: 'feedback' },
    },
    scope: ['reviewer', 'root'],
    apiDataSourcePath: '/api/briefSubmission/table',
    partials: ['briefSubFilters']    
  }, 
  create: {
    payload: Joi.object({      
      query: Joi.object().required()            
    }),
    scope: []    
  },  
  update: { //need to finalize what's required here
    payload: Joi.object({
      query: Joi.object().required()      
    }),
    scope: ['root']    
  },
  delete: {
    scope: ['root']   
  },
  editView: {
    disabled: true
  }  
});

BriefSubmmission.lookups = [
  {
    from: require('./user'),
    local: 'userId',
    foreign: '_id',
    as: 'user',
    one: true
  },
  {
    from: require('./user'),
    local: 'reviewerId',
    foreign: '_id',
    as: 'reviewer',
    one: true
  }
];

BriefSubmmission.indexes = [
  { key: { userId: 1 } }  
];

module.exports = BriefSubmmission;