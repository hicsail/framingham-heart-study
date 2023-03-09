"use strict";
const Joi = require("joi");
const AnchorModel = require("../anchor/anchor-model");
const Hoek = require("hoek");
const Assert = require("assert");

class Proposal extends AnchorModel {
  static async create(doc) {
    Assert.ok(doc.userId, "Missing userId argument.");
    Assert.ok(doc.fileName, "Missing file name argument.");

    const document = new this({
      fileName: doc.fileName,
      userId: doc.userId, //userId of the person who uploads the doc
      groupId: doc.groupId ? doc.groupId : null, // we link proposals (revised ones) using groupId
      reviewerIds: [], // list of assigned reviwers
      feasibilityStatus: this.status.PENDING,
      feasibilityReviewDate: null,
      feasibilityReviewerId: null,
      reviewStatus: null,
      reviewDate: null,
    });
    return this.insertOne(document);
  }

  static async createMany(docs) {
    for (const doc of docs) {
      Assert.ok(doc.userId, "Missing userId argument.");
      Assert.ok(doc.fileName, "Missing file name argument.");

      doc.reviewerIds = [];
      doc.feasibilityStatus = this.status.PENDING;
      doc.feasibilityReviewerId = null;
      doc.feasibilityReviewDate = null;
      doc.reviewStatus = null;
      doc.reviewDate = null;
      doc.groupId = doc.groupId ? doc.groupId : null;
    }

    const files = await this.insertMany(docs);
    return files;
  }

  static async findByUploaderId(userId) {
    return this.findOne({ userId });
  }

  static async findManyByFeasibilityStatus(feasibilityStatus) {
    return this.find({ feasibilityStatus });
  }

  static async findManyByReviewStatus(reviewStatus) {
    return this.find({ reviewStatus });
  }

  static async updateFeasibilityStatus(docId, userId, feasibilityStatus) {
    const update = {
      $set: {
        feasibilityReviewerId: userId,
        feasibilityStatus,
        feasibilityReviewDate: new Date(),
      },
    };

    return this.findByIdAndUpdate(docId, update);
  }

  static async updateReviewStatus(docId, userId, reviewStatus) {
    const update = {
      $set: {
        reviewerId: userId,
        reviewStatus,
        reviewDate: new Date(),
      },
    };

    return this.findByIdAndUpdate(docId, update);
  }
}

Proposal.collectionName = "proposals";

Proposal.status = {
  PENDING: "Pending",
  APPROVED: "Feasibility Checked",
  REJECTED: "Revise Requested",
};

Proposal.decision = {
  APPROVE: "Approve",
  REJECT: "Reject",
  REVISE: "Revise",
};

Proposal.schema = Joi.object({
  _id: Joi.object().required(),
  groupId: Joi.string().required(),
  fileName: Joi.string().required(),
  userId: Joi.object().required(),
  feasibilityReviewerId: Joi.object().required(),
  reviewerIds: Joi.array().required(),
  reviewStatus: Joi.string().required(),
  feasibilityStatus: Joi.string().required(),
  createdAt: Joi.date().required(),
  feasibilityReviewDate: Joi.date().required(),
  reviewDate: Joi.date().required(),
});

Proposal.routes = Hoek.applyToDefaults(AnchorModel.routes, {
  create: {
    payload: Joi.object({
      userId: Joi.string().required(),
      fileName: Joi.string().required(),
    }),
  },
  insertMany: {
    disabled: false,
    payload: Joi.object({
      userId: Joi.string().required(),
      fileName: Joi.string().required(),
    }),
  },
});

Proposal.payload = Joi.object({
  feasibilityStatus: Joi.string()
    .valid(Proposal.status.APPROVED, Proposal.status.REJECTED)
    .required(),
});

Proposal.lookups = [
  {
    from: require("./user"),
    local: "userId",
    foreign: "_id",
    as: "user",
    one: true,
  },
  {
    from: require("./user"),
    local: "feasibilityReviewerId",
    foreign: "_id",
    as: "feasibilityReviewer",
    one: true,
  },
];

module.exports = Proposal;
