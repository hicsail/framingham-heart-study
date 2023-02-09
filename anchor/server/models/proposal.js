"use strict";
const Joi = require("joi");
const AnchorModel = require("../anchor/anchor-model");
const Hoek = require("hoek");
const Assert = require('assert');

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
      if (idx % 3 === 0) status = this.status.PENDING;
      else if (idx % 3 === 1) status = this.status.APPROVED;
      else status = this.status.REJECTED;

      documents.push({
        name: `Proposal No.${idx}`,
        userId: nameList[idx],
        feasibilityReviewerId:
          status === this.status.PENDING ? null : "000000000000000000000000",
        reviewerId: null,
        feasibilityStatus: status,
        reviewStatus: this.status.PENDING,
        url: path + `prop_${idx}`,
        uploadDate: new Date(2020, 5, 0 + 2 * idx),
        feasibilityReviewDate:
          status === this.status.PENDING ? null : new Date(),
        reviewDate: null,
      });
    }

    return this.insertMany(documents);
  }

  static async create(userId, fileName) {

    const document = new this({  
      fileName,    
      userId, //userId of the person who uploads the doc
      feasibilityReviewerId: null,
      reviewerId: null,
      feasibilityStatus: this.status.PENDING,
      reviewStatus: this.status.PENDING,      
      feasibilityReviewDate: null,
      reviewDate: null,
    });
    return this.insertOne(document);
  }

  static async createMany(docs) { 

    for (const doc of docs)  {
      Assert.ok(doc.userId, 'Missing userId argument.');
      Assert.ok(doc.fileName, 'Missing file name argument.');

      doc.reviewerId = null;
      doc.feasibilityReviewerId = null;
      doc.reviewStatus = this.status.PENDING;
      doc.feasibilityStatus = this.status.PENDING;
      doc.reviewDate = null;
      doc.feasibilityReviewDate = null;     
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
  APPROVED: "Approved",
  REJECTED: "Rejected",
};

Proposal.schema = Joi.object({
  _id: Joi.object().required(), 
  fileName: Joi.string().required(), 
  userId: Joi.object().required(),
  feasibilityReviewerId: Joi.object().required(),
  reviewerId: Joi.object().required(),
  feasibilityStatus: Joi.string().required(),
  reviewStatus: Joi.string().required(),  
  createdAt: Joi.date().required(),
  feasibilityReviewDate: Joi.date().required(),
  reviewDate: Joi.date().required(),
});

Proposal.routes = Hoek.applyToDefaults(AnchorModel.routes, {
  create: {
    payload: Joi.object({
      userId: Joi.string().required(),
      fileName: Joi.string().required()      
    }),
  },  
  insertMany: {
    disabled: false,
    payload: Joi.object({
      userId: Joi.string().required(),
      fileName: Joi.string().required()           
    })
  },
});

Proposal.payload = Joi.object({
  feasibilityStatus: Joi.string()
    .valid(Proposal.status.APPROVED, Proposal.status.REJECTED)
    .required(),
});

Proposal.lookups = [
  {
    from: require('./user'),
    local: 'userId',
    foreign: '_id',
    as: 'user',
    one: true
  }  
];

module.exports = Proposal;
