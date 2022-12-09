'use strict';
const Joi = require('joi');
const Assert = require('assert');
const AnchorModel = require('../anchor/anchor-model');
const User = require('./user');
const Hoek = require('hoek');


class ConceptProposal extends AnchorModel {

  static async create(doc) {  

    Assert.ok(doc.query, 'Missing query argument.');    
    Assert.ok(doc.userId, 'Missing userId argument.');
    Assert.ok(doc.briefSubmissionId, 'Missing briefSubmissionId argument.');

    let document = {
      userId: doc.userId, //user of user who submitted 
      briefSubmissionId: doc.briefSubmissionId,
      query: doc.query,
      createdAt: new Date(),
      feedback: null, 
      decisionDate: null //date on which a rejection or approval  happens    
    };

    document['status'] = doc.status ? doc.status : 'pending';      
    document['reviewerId'] = doc.reviewerId ? doc.reviewerId : null;       

    const submissions = await this.insertOne(document);
    return submissions[0];
  }
}


ConceptProposal.collectionName = 'conceptProposal';

ConceptProposal.schema = Joi.object({
  _id: Joi.object(),  
  userId: Joi.string().required(),
  briefSubmissionId: Joi.string().required(),
  query: Joi.object().required(),  
  status: Joi.string().required(),
  createdAt: Joi.date().required(),  
  decisionDate: Joi.date().optional(),
  reviewerId: Joi.string().optional(),
  feedback: Joi.string().optional(),
  rejectionReason: Joi.string().optional().allow('').allow(null)  
});

ConceptProposal.postApprovalPayload = {   
  DUAStatus: Joi.string().optional().allow('').allow(null) ,  
  dataReqStatus: Joi.string().optional().allow('').allow(null) ,
  preparationStatus: Joi.string().optional().allow('').allow(null) ,
  preparationDate: Joi.string().optional().allow('').allow(null) ,
  dataRequestDate: Joi.string().optional().allow('').allow(null),
  DUADate: Joi.string().optional().allow('').allow(null),
  investigator: Joi.string().optional().allow('').allow(null) ,
  analyst: Joi.string().optional().allow('').allow(null) 
};

ConceptProposal.routes = Hoek.applyToDefaults(AnchorModel.routes, {
  tableView: {
    outputDataFields: {
      'query.10': { label: 'Project Short title', from: 'brief', property: 'query.10'},
      briefSubmissionId: {label: 'brief submission Id', invisible: true},
      name: { label: 'User\'s name', from: 'user' },
      email: { label: 'User\'s email', from: 'user' },
      reviewerName: { label: 'Reviewer\'s name', from: 'reviewer', property: 'name' },
      reviewerEmail: { label: 'Reviewer\'s email', from: 'reviewer', property: 'email' },
      status: { label: 'Status' },     
      createdAt: { label: 'Creation date', invisible: true },
      decisionDate: { label: 'Decision date', invisible: true }, 
      feedback: { label: 'Reviwer\'s feedback', invisible: true },      
      _id: { label: 'ID', invisible: true },
      briefLink: {label: 'Brief Link',                      
                    function: (briefId) => { return '../../../brief/' + briefId;},
                    arguments: [{property: 'briefSubmissionId'}]
                    },
      'postApprovalInfo.DUAStatus': { label: 'DUA status' }, 
      'postApprovalInfo.dataReqStatus':  { label: 'Data request status' },
      'postApprovalInfo.preparationStatus': { label: 'Preparation status' },
      'postApprovalInfo.preparationDate': { label: 'Preparation date' },
      'postApprovalInfo.dataRequestDate': { label: 'Data request date' }, 
      'postApprovalInfo.DUADate': { label: 'DUA date' },     
      'postApprovalInfo.investigator': { label: 'investigator' },
      'postApprovalInfo.analyst': { label: 'Analyst' }      
    },
    scope: ['reviewer', 'root'],
    apiDataSourcePath: '/api/conceptProposal/table',
    partials: ['briefSubFilters']
  }, 
  create: {
    payload: Joi.object({      
      query: Joi.object().required(),
      briefSubmissionId: Joi.string().required()            
    }),
    scope: []    
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

ConceptProposal.lookups = [
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
  },
  {
    from: require('./brief-submission'),
    local: 'briefSubmissionId',
    foreign: '_id',
    as: 'brief',
    one: true
  }
];

ConceptProposal.indexes = [
  { key: { userId: 1 } }  
];

module.exports = ConceptProposal;