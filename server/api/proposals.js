"user strict";
const Joi = require("joi");
const Boom = require("boom");
const Proposal = require("../models/proposal");
const AWS = require("aws-sdk");
const PDFParse = require("pdf-parse");
const Config = require("../../config");

const register = function (server, options) {
  server.route({
    method: "PUT",
    path: "/api/proposals/post-review-info/{proposalId}",
    options: {
      auth: {
        strategies: ["simple", "session"],
        scope: ["coordinator", "root"],
      },
      validate: {
        payload: Proposal.postReviewInfoPayload,
      },
    },
    handler: async function (request, h) {
      const proposalId = request.params.proposalId;
      const userId = request.auth.credentials.user._id.toString();
      const payload = request.payload;

      let proposal = await Proposal.findById(proposalId);
      if (!proposal) {
        throw Boom.notFound("Proposal not found!");
      }

      let update;
      if (proposal.postReviewInfo) {
        for (const key in payload) {
          proposal.postReviewInfo[key] = payload[key];
        }
        update = {
          $set: {
            postReviewInfo: proposal.postReviewInfo,
          },
        };
      } else {
        update = {
          $set: {
            postReviewInfo: payload,
          },
        };
      }
      proposal = await Proposal.findByIdAndUpdate(proposalId, update);
      return { message: "Success", submission: proposal };
    },
  });

  server.route({
    method: "PUT",
    path: "/api/proposals/feasibility-check/status/{proposalId}",
    options: {
      auth: {
        strategies: ["simple", "session"],
        scope: ["coordinator", "root"],
      },
      validate: {
        payload: Proposal.payload,
      },
    },
    handler: async function (request, h) {
      const proposalId = request.params.proposalId;
      const userId = request.auth.credentials.user._id.toString();
      const status = request.payload.feasibilityStatus;

      const proposal = await Proposal.updateFeasibilityStatus(proposalId, userId, status);

      if (!proposal) {
        throw Boom.notFound("Proposal not found!");
      }

      return { message: "Success", submission: proposal };
    },
  });

  server.route({
    method: "PUT",
    path: "/api/proposals/assign-reviewer/{proposalId}",
    options: {
      auth: {
        strategies: ["simple", "session"],
        scope: ["chair", "root"],
      },
      validate: {
        payload: Joi.object({
          reviewerIds: Joi.array(),
        }),
      },
    },
    handler: async function (request, h) {
      const proposalId = request.params.proposalId;
      const update = {
        $set: {
          reviewerIds: request.payload.reviewerIds,
        },
      };

      const proposal = await Proposal.findByIdAndUpdate(proposalId, update);
      if (!proposal) {
        throw Boom.notFound("Proposal not found!");
      }
      return { message: "Success" };
    },
  });

  server.route({
    method: "PUT",
    path: "/api/proposals/review/status/{proposalId}",
    options: {
      auth: {
        strategies: ["simple", "session"],
        scope: ["chair", "root"],
      },
      validate: {
        payload: Joi.object({
          reviewStatus: Joi.string(),
          reviewComment: Joi.string(),
        }),
      },
    },
    handler: async function (request, h) {
      const proposalId = request.params.proposalId;
      const status = request.payload.reviewStatus;
      const comment = request.payload.reviewComment;

      const proposal = await Proposal.updateReviewStatus(proposalId, status, comment);

      return { message: "Success", proposal: proposal };
    },
  });

  server.route({
    method: "PUT",
    path: "/api/proposals/parsing-results/{proposalId}",
    options: {
      auth: {
        strategies: ["simple", "session"],
        scope: ["coordinator", "root"],
      },
      validate: {
        payload: Proposal.parsingResultsPayload,
      },
    },
    handler: async function (request, h) {
      const proposalId = request.params.proposalId;
      update = {
        $set: {
          parsingResults: request.payload,
        },
      };

      const proposal = await Proposal.findByIdAndUpdate(proposalId, update);
      if (!proposal) {
        throw Boom.notFound("Proposal not found!");
      }
      return { message: "Success", submission: proposal };
    },
  });

  server.route({
    method: "GET",
    path: "/api/proposals/parsing-results/{proposalId}",
    options: {
      auth: {
        strategies: ["simple", "session"],
        scope: ["coordinator", "root"],
      },
    },
    handler: async function (request, h) {
      const proposalId = request.params.proposalId;
      const proposal = await Proposal.findById(proposalId);

      if (!proposal) {
        throw Boom.notFound("Proposal not found!");
      }

      let parsingResults = {};

      try {
        const fileStream = await getObjectFromS3(proposal.fileName);
        parsingResults = await parseProposal(fileStream);
      } catch (err) {
        throw Boom.badRequest("Unable to parse proposal file because " + err.message);
      }

      return { message: "Success", proposal: proposal, parsingResults: parsingResults };
    },
  });
};

async function parseProposal(fileStream) {
  return new Promise((resolve, reject) => {
    PDFParse(fileStream)
      .then(function (data) {
        const parsedInfo = Proposal.parse(data.text, data.numpages);
        resolve(parsedInfo);
      })
      .catch(function (error) {
        reject(error);
      });
  });
}

async function getObjectFromS3(fileName) {
  const s3 = new AWS.S3({
    accessKeyId: Config.get("/S3/accessKeyId"),
    secretAccessKey: Config.get("/S3/secretAccessKey"),
  });

  const params = {
    Bucket: Config.get("/S3/bucketName"),
    Key: fileName,
  };

  return new Promise((resolve, reject) => {
    s3.getObject(params, (s3Err, data) => {
      if (s3Err) {
        reject(s3Err);
      } else {
        resolve(data.Body);
      }
    });
  });
}

module.exports = {
  name: "proposalsAPI",
  dependencies: ["hapi-anchor-model", "auth"],
  register,
};
