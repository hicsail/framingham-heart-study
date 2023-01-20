"use strict";
const Joi = require("joi");
const AnchorModel = require("../anchor/anchor-model");
const Hoek = require("hoek");

const PENDING = "Pending";
const APPROVED = "Approved";
const REJECTED = "Rejected";

class Proposal extends AnchorModel {
  static async populate() {
    const path =
      "/Users/wenhwang/hicsail/framingham-heart-study/anchor/proposals";
    const nameList = [
      "Katie Carney",
      "Derrick Higgins",
      "Brandon Paul",
      "Florence Johnson",
      "Cheryl Ware",
      "Dena Hobbs",
      "Noel Curry",
      "Lyle Shaw",
      "Suzanne Shepard",
      "Sally Graham",
      "Karin Jordan",
      "Jesse Rose",
      "Robbie Delgado",
      "Claudia Collier",
      "Chester Welch",
    ];

    const documents = [];
    for (let idx = 0; idx < 15; idx++) {
      let status = null;
      if (idx % 3 === 0) status = PENDING;
      else if (idx % 3 === 1) status = APPROVED;
      else status = REJECTED;

      documents.push({
        name: `Proposal No.${idx}`,
        submitter: nameList[idx],
        feasibilityStatus: status,
        reviewStatus: PENDING,
        url: path + `prop_${idx}`,
        uploadedAt: new Date(2020, 5, 0 + 2 * idx),
      });
    }

    return this.insertMany(documents);
  }

  static async create(name, submitter, url) {
    const document = new this({
      name,
      submitter,
      feasibilitiesStatus: PENDING,
      reviewStatus: PENDING,
      url,
      uploadedAt: new Date(),
    });

    return this.insertOne(document);
  }

  static async findByName(name) {
    return this.findOne({ name });
  }

  static async findBySubmitter(submitter) {
    return this.findOne({ submitter });
  }

  static async findManyByFeasibilityStatus(feasibilityStatus) {
    return this.find({ feasibilityStatus });
  }

  static async findManyByReviewStatus(reviewStatus) {
    return this.find({ reviewStatus });
  }

  static async updateFeasibilityStatus(_id, feasibilityStatus) {
    const update = {
      $set: {
        feasibilityStatus,
      },
    };

    return this.findByIdAndUpdate(_id, update);
  }

  static async updateReviewStatus(_id, reviewStatus) {
    const update = {
      $set: {
        reviewStatus,
      },
    };

    return this.findByIdAndUpdate(_id, update);
  }

  static async delete(_id) {
    await this.deleteOne({ _id });
  }
}

Proposal.collectionName = "proposals";

Proposal.schema = Joi.object({
  _id: Joi.object(),
  name: Joi.string().required(),
  submitter: Joi.string().required(),
  feasibilityStatus: Joi.string(),
  reviewStatus: Joi.string(),
  url: Joi.string().required(),
  uploadedAt: Joi.date(),
});

Proposal.routeMap = Hoek.applyToDefaults(AnchorModel.routes, {
  create: {
    payload: Joi.object({
      name: Joi.string().required(),
      url: Joi.string().required(),
    }),
  },
  update: {
    payload: Joi.object({
      name: Joi.string().required(),
    }),
  },
});

Proposal.payload = Joi.object({
  id: Joi.string().required(),
  feasibilityStatus: Joi.string().valid("Approved", "Rejected").required(),
});

module.exports = Proposal;
