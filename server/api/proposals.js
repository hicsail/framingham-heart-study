"user strict";
const Joi = require("joi");
const Boom = require("boom");
const Proposal = require("../models/proposal");

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
          reviewerAssignmentDate: new Date(),
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
          finalReviewStatus: Joi.string()
            .valid(Proposal.decision.APPROVE, Proposal.decision.REJECT, Proposal.decision.REVISE)
            .required(),
          finalReviewComment: Joi.string().allow(""),
        }),
      },
    },
    handler: async function (request, h) {
      const proposalId = request.params.proposalId;
      const userId = request.auth.credentials.user._id.toString();
      const status = request.payload.finalReviewStatus;
      const comment = request.payload.finalReviewComment;

      const proposal = await Proposal.updateFinalReviewStatus(proposalId, userId, status, comment);

      return { message: "Success", submission: proposal };
    },
  });
};

module.exports = {
  name: "proposalsAPI",
  dependencies: ["hapi-anchor-model", "auth"],
  register,
};
