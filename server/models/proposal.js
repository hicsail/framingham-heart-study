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
      parentId: doc.parentId ? doc.parentId : null, // it will tell you which proposal this is revised from within the same group
      reviewerIds: [], // list of assigned reviwers
      reviewerAssignmentDate: null,
      feasibilityStatus: this.status.PENDING,
      feasibilityReviewDate: null,      
      feasibilityReviewerId: null,
      reviewStatus: null,
      reviewComment: null,
      reviewDate: null,
      finalReviewerId: null,
      postReviewInfo: {
        tissueInPreparation: false,
        tissueShipped: false,
        brainDataReturned: false,
        clinicalDataTransfered: false,
      },
      parsingResults: {
        applicantName: null,
        applicationId: null,
        projectTitle: null,
        details: null,
        conflict: null,
        funding: null  
      },
      parsingResultsUpdatedAt: null,
      parsingResultsUpdatedBy: null
    });

    return this.insertOne(document);
  }

  static async createMany(docs) {
    for (const doc of docs) {
      Assert.ok(doc.userId, "Missing userId argument.");
      Assert.ok(doc.fileName, "Missing file name argument.");

      const postReviewInfo = {
        tissueInPreparation: false,
        tissueShipped: false,
        brainDataReturned: false,
        clinicalDataTransfered: false,
      };

      const parsingResults = {
        applicantName: null,
        applicationId: null,
        projectTitle: null,
        details: null,
        conflict: null,
        funding: null,
      };

      doc.reviewerIds = [];
      doc.reviewerAssignmentDate = null;
      doc.feasibilityStatus = this.status.PENDING;
      doc.feasibilityReviewerId = null;
      doc.feasibilityReviewDate = null;
      doc.reviewStatus = null;
      doc.reviewComment = null;
      doc.reviewDate = null;
      doc.finalReviewerId = null;
      doc.groupId = doc.groupId ? doc.groupId : null;
      doc.parentId = doc.parentId ? doc.parentId : null;
      doc.postReviewInfo = postReviewInfo;
      doc.parsingResults = parsingResults;
      doc.parsingResultsUpdatedAt = null;
      doc.parsingResultsUpdatedBy = null;
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

  static async updateReviewStatus(docId, userId, reviewStatus, reviewComment) {
    const update = {
      $set: {
        reviewStatus,
        reviewComment,
        finalReviewerId: userId,
        reviewDate: new Date(),
      },
    };

    return this.findByIdAndUpdate(docId, update);
  }

  static parse(content, numPages) {
  
    let result = {'details': null, 
                  'funding': null, 
                  'conflict': null, 
                  'applicantName':null,
                  'applicationId': null,
                  'projectTitle': null};

    const textBlockAnchorDict = {
      details: {
        separator1: "General Research Proposal",
        separator2: "Literature References",
      },
      funding: {
        separator1: "Executive Committee Review",
        separator2: "Participant Burden",
      },
      conflict: {
        separator1: "Third-party involvement",
        separator2: "Title and Abstract",
      },
      applicantName: {
        separator1: "Principal Investigator\nName:",
        separator2: "Institution",
      },
      applicationId: {
        separator1: "Application ID",
        separator2: "Date Submitted",
      },
      projectTitle: {
        separator1: "Application ID",
        separator2: "Date Submitted",
      },
    };

    //remove footer from text
    let footers = [];
    for (let i = 1; i <= numPages; ++i) {
      footers.push("Page " + i + "/" + numPages);
    }
    for (const footer of footers) {
      content = content.replace(footer, "");
    }

    //remove header from text
    const separator1 = textBlockAnchorDict["applicationId"]["separator1"];
    const separator2 = textBlockAnchorDict["applicationId"]["separator2"];
    try {
      const applicationId = content
        .split(separator1)[1]
        .split(separator2)[0]
        .split("\n")[0]
        .replace(": ", "");
      const header = "FHS Data Application Proposal - ID: " + applicationId;
      content = content.replace(new RegExp(header, "g"), "");
    } catch (e) {
      console.log("ApplicationId not found.");
    }

    //parse for relevant sections
    for (const key in textBlockAnchorDict) {
      const separator1 = textBlockAnchorDict[key]["separator1"];
      const separator2 = textBlockAnchorDict[key]["separator2"];
      if (separator1 && separator2) {
        try {
          const textBlock = (content.split(separator1)[1]).split(separator2)[0].trim();          
          if (key === 'applicationId') {
            result[key] = textBlock.split('\n')[0] ? textBlock.split('\n')[0] : null;            
          }
          else if (key === 'projectTitle') {
            result[key] = textBlock.split('\n')[1] ? textBlock.split('\n')[1] : null;
          }
          else {
            result[key] = textBlock;
          }
        } catch (e) {
          result[key] = null;
        }
      } else {
        result[key] = null;
      }
    }
    return result;
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
  parentId: Joi.string().required(),
  fileName: Joi.string().required(),
  userId: Joi.object().required(),
  feasibilityReviewerId: Joi.object().required(),
  reviewerIds: Joi.array().required(),
  reviewStatus: Joi.string().required(),
  reviewComment: Joi.string().required(),
  feasibilityStatus: Joi.string().required(),
  createdAt: Joi.date().required(),
  feasibilityReviewDate: Joi.date().required(),
  reviewDate: Joi.date().required(),
  finalReviewerId: Joi.object().required(),
  postReviewInfo: Joi.object({
    tissueInPreparation: Joi.boolean().required(),
    tissueShipped: Joi.boolean().required(),
    brainDataReturned: Joi.boolean().required(),
    clinicalDataTransfered: Joi.boolean().required(),
  }).required(),
  parsingResults: Joi.object({
    applicantName: Joi.string().required(),
    applicationId: Joi.string().required(),
    projectTitle: Joi.string().required(),
    details: Joi.string().required(),
    conflict: Joi.string().required(),
    funding: Joi.string().optional().allow(null).allow(""),
  }).required(),
  parsingResultsUpdatedAt:Joi.date().optional(),
  parsingResultsUpdatedBy: Joi.string().optional()
});

Proposal.routes = Hoek.applyToDefaults(AnchorModel.routes, {
  create: {
    scope: ["coordinator", "root"],
    payload: Joi.object({
      userId: Joi.string().required(),
      fileName: Joi.string().required(),
      groupId: Joi.string().optional().allow(null).allow(""),
      parentId: Joi.string().optional().allow(null).allow(""),
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

Proposal.postReviewInfoPayload = Joi.object({
  tissueInPreparation: Joi.boolean().optional(),
  tissueShipped: Joi.boolean().optional(),
  brainDataReturned: Joi.boolean().optional(),
  clinicalDataTransfered: Joi.boolean().optional(),
});

Proposal.parsingResultsPayload = Joi.object({
  applicantName: Joi.string().required(),
  applicationId: Joi.string().required(),
  projectTitle: Joi.string().required(),
  details: Joi.string().required(),
  conflict: Joi.string().optional().allow(null).allow(''),
  funding: Joi.string().optional().allow(null).allow(''),
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
  {
    from: require("./user"),
    local: "finalReviewerId",
    foreign: "_id",
    as: "finalReviewer",
    one: true,
  }
];

module.exports = Proposal;
