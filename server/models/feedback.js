"use strict";
const Joi = require("joi");
const AnchorModel = require("../anchor/anchor-model");
const Hoek = require("hoek");
const Assert = require('assert');

class Feedback extends AnchorModel { 

  static async create(doc) {

    Assert.ok(doc.userId, 'Missing userId argument.');
    Assert.ok(doc.proposalId, 'Missing proposalId argument.');
    Assert.ok(doc.funding, 'Missing funding argument.');
    Assert.ok(doc.conflict, 'Missing conflict argument.');
    Assert.ok(doc.details, 'Missing details argument.');
    Assert.ok(doc.significanceWeakness, 'Missing significanceWeakness argument.');
    Assert.ok(doc.innovationWeakness, 'Missing innovationWeakness argument.');
    Assert.ok(doc.approachWeakness, 'Missing approachWeakness argument.');
    Assert.ok(doc.significanceStrength, 'Missing significanceStrength argument.');
    Assert.ok(doc.innovationStrength, 'Missing innovationStrength argument.');
    Assert.ok(doc.approachStrength, 'Missing approachStrength argument.');
    Assert.ok(doc.decisionTag, 'Missing decisionTag argument.');
    Assert.ok(doc.decisionComment, 'Missing decisionComment argument.');    

    const document = new this({  
         
      userId: doc.userId, //userId of the person who submits the feedback
      proposalId: doc.proposalId,
      funding: doc.funding, //temporary field, since eventually we'll get info by parsing pdf not from user
      conflict: doc.concflict,//temporary field, since eventually we'll get info by parsing pdf not from user
      details: doc.details,//temporary field, since eventually we'll get info by parsing pdf not from user
      weakness: {
        significance: doc.significanceWeakness,
        innovation: doc.innovationWeakness,
        approach: doc.approachWeakness
      }, 
      strength: {
        significance: doc.significanceStrength,
        innovation: doc.innovationStrength,
        approach: doc.approachStrength
      },      
      decisionTag: doc.decisionTag,
      decisionComment: doc.decisionComment,
      createdAt: new date()          
    });
    return this.insertOne(document);
  }  
}

Feedback.collectionName = "feedbacks";

Feedback.status = {
  APPROVE: "Approve",
  REVISION: "Revision",
  REJECT: "Reject",
  ABSTENTION: "Abstention",
  CONFLICT_OF_INTEREST: "Conflict of interest"
};

Feedback.schema = Joi.object({
  _id: Joi.object().required(), 
  userId: Joi.string().required(),
  proposalId: Joi.string().required(),
  funding: Joi.string().required(), 
  conflict: Joi.string().required(),
  details: Joi.string().required(),  
  weakness: Joi.object({
    significance: Joi.string().required(),
    innovation: Joi.string().required(),
    approach: Joi.string().required() 
  }).required(),   
  strength: Joi.object({
    significance: Joi.string().required(),
    innovation: Joi.string().required(),
    approach: Joi.string().required()
  }).required(),
  decisionTag: Joi.string().required(), 
  decisionComment: Joi.string().required(),
  createdAt: Joi.date().required(), 
});

Feedback.routes = Hoek.applyToDefaults(AnchorModel.routes, {
  create: {
    payload: Joi.object({     
      userId: Joi.string().required(),
      proposalId: Joi.string().required(),
      funding: Joi.string().required(), 
      conflict: Joi.string().required(),
      details: Joi.string().required(),      
      weakness: Joi.object({
        significance: Joi.string().required(),
        innovation: Joi.string().required(),
        approach: Joi.string().required() 
      }).required(),   
      strength: Joi.object({
        significance: Joi.string().required(),
        innovation: Joi.string().required(),
        approach: Joi.string().required()
      }).required(),
      decisionTag: Joi.string().required(), 
      decisionComment: Joi.string().required(),
      createdAt: Joi.date().required(),      
    }),
  }  
});

Feedback.lookups = [
  {
    from: require('./user'),
    local: 'userId',
    foreign: '_id',
    as: 'user',
    one: true
  },  
  {
    from: require('./proposal'),
    local: 'proposalId',
    foreign: '_id',
    as: 'proposal',
    one: true
  }      
];

module.exports = Feedback;
