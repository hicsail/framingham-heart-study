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

      const proposal = await Proposal.updateFeasibilityStatus(
        proposalId,
        userId,
        status
      );

      return { message: "Success", submission: proposal };
    },
  });

  server.route({
    method: 'PUT',
    path: '/api/proposals/assign-reviewer/{proposalId}',
    options: {
      auth: {
        strategies: ["simple", "session"],
        scope: ['chair', 'root']
      },
      validate: {
        payload: Joi.object({
          reviewerIds: Joi.array()
        })
      }
    },
    handler: async function (request, h) {
      const proposalId = request.params.proposalId;
      const update = {
        $set:{
          reviewerIds: request.payload.reviewerIds
        }
      }
  
      const proposal = await Proposal.findByIdAndUpdate(proposalId, update);
      return 1;
    }
  });
};

module.exports = {
  name: "proposalsAPI",
  dependencies: ["hapi-anchor-model", "auth"],
  register,
};
