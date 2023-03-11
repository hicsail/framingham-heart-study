"use strict";
const Joi = require("joi");
const AnchorModel = require("../anchor/anchor-model");
const Hoek = require("hoek");
const Assert = require("assert");

class Feedback extends AnchorModel {
  static async create(doc) {
    Assert.ok(doc.userId, "Missing userId argument.");
    Assert.ok(doc.proposalId, "Missing proposalId argument.");
    Assert.ok(
      doc.weakness.significance,
      "Missing significanceWeakness argument."
    );
    Assert.ok(doc.weakness.innovation, "Missing innovationWeakness argument.");
    Assert.ok(doc.weakness.approach, "Missing approachWeakness argument.");
    Assert.ok(
      doc.strength.significance,
      "Missing significanceStrength argument."
    );
    Assert.ok(doc.strength.innovation, "Missing innovationStrength argument.");
    Assert.ok(doc.strength.approach, "Missing approachStrength argument.");
    Assert.ok(doc.decisionTag, "Missing decisionTag argument.");
    Assert.ok(doc.decisionComment, "Missing decisionComment argument.");

    const document = new this({
      userId: doc.userId, //userId of the person who submits the feedback
      proposalId: doc.proposalId,      
      weakness: {
        significance: doc.weakness.significance,
        innovation: doc.weakness.innovation,
        approach: doc.weakness.approach,
      },
      strength: {
        significance: doc.strength.significance,
        innovation: doc.strength.innovation,
        approach: doc.strength.approach,
      },
      decisionTag: doc.decisionTag,
      decisionComment: doc.decisionComment,
      createdAt: new Date(),
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
  CONFLICT_OF_INTEREST: "Conflict of interest",
};

Feedback.schema = Joi.object({
  _id: Joi.object().required(),
  userId: Joi.string().required(),
  proposalId: Joi.string().required(),  
  weakness: Joi.object({
    significance: Joi.string().required(),
    innovation: Joi.string().required(),
    approach: Joi.string().required(),
  }).required(),
  strength: Joi.object({
    significance: Joi.string().required(),
    innovation: Joi.string().required(),
    approach: Joi.string().required(),
  }).required(),
  decisionTag: Joi.string().required(),
  decisionComment: Joi.string().required(),
  createdAt: Joi.date().required(),
});

Feedback.routes = Hoek.applyToDefaults(AnchorModel.routes, {
  create: {
    scope: ["reviewer", "root"],
    payload: Joi.object({
      userId: Joi.string().required(),
      proposalId: Joi.string().required(),      
      weakness: Joi.object({
        significance: Joi.string().required(),
        innovation: Joi.string().required(),
        approach: Joi.string().required(),
      }).required(),
      strength: Joi.object({
        significance: Joi.string().required(),
        innovation: Joi.string().required(),
        approach: Joi.string().required(),
      }).required(),
      decisionTag: Joi.string().required(),
      decisionComment: Joi.string().required(),
    }),
  },
});

Feedback.lookups = [
  {
    from: require("./user"),
    local: "userId",
    foreign: "_id",
    as: "user",
    one: true,
  },
  {
    from: require("./proposal"),
    local: "proposalId",
    foreign: "_id",
    as: "proposal",
    one: true,
  },
];

module.exports = Feedback;
