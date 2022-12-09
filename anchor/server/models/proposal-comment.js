'use strict';
const Joi = require('joi');
const Assert = require('assert');
const AnchorModel = require('../anchor/anchor-model');
const Hoek = require('hoek');

class ProposalComment extends AnchorModel {

  static async create(doc) {  

    Assert.ok(doc.text, 'Missing text argument.');    
    Assert.ok(doc.userId, 'Missing userId argument.');
    Assert.ok(doc.submissionId, 'Missing submissionId argument.');

    let document = {
      userId: doc.userId,  
      submissionId: doc.submissionId,
      text: doc.text    
    };

    document['createdAt'] = doc.createdAt ? doc.createdAt : new Date();     

    const comments = await this.insertOne(document);
    console.log(comments[0])
    return comments[0];
  }
}


ProposalComment.collectionName = 'proposalComments';

ProposalComment.schema = Joi.object({
  _id: Joi.object(),  
  userId: Joi.string().required(),
  submissionId: Joi.string().required(),  
  createdAt: Joi.date().required(),  
  text: Joi.string().required()
});

ProposalComment.routes = Hoek.applyToDefaults(AnchorModel.routes, { 
  tableView: {
    outputDataFields: {
      _id: { label: 'ID'},    
      reviewerName: { label: 'Reviewer\'s name', from: 'user', property: 'name' },
      reviewerEmail: { label: 'Reviewer\'s email', from: 'user', property: 'email' }, 
      text: { label: 'Text'},   
      createdAt: { label: 'Creation date', invisible: true },            
      userId: { label: 'Reviewer Id', invisible: true },
      submissionId: { label: 'Submission Id', invisible: true }
    },
    scope: ['reviewer', 'root']
  },  
  create: {
    payload: Joi.object({      
      text: Joi.string().required(),
      userId: Joi.string().required(),
      submissionId: Joi.string().required()           
    })    
  },  
  update: {
    payload: Joi.object({
      text: Joi.string().required()           
    }),
    scope: ['reviewer', 'root']    
  },
  delete: {
    scope: ['reviewer', 'root']
  }  
});

ProposalComment.lookups = [
  {
    from: require('./user'),
    local: 'userId',
    foreign: '_id',
    as: 'user',
    one: true
  },
  {
    from: require('./concept-proposal'),
    local: 'proposalSubmissionId',
    foreign: '_id',
    as: 'submission',
    one: true
  }
];

ProposalComment.indexes = [
  { key: { userId: 1 } },
  { key: { submissionId: 1 } }
];

module.exports = ProposalComment;