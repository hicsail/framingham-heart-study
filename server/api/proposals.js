"user strict";
const Joi = require("joi");
const Proposal = require("../models/proposal");

const register = function (server, options) {
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
      return 1;
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

      return { message: "Success", submission: proposal };
    },
  });
};

module.exports = {
  name: "proposalsAPI",
  dependencies: ["hapi-anchor-model", "auth"],
  register,
};
