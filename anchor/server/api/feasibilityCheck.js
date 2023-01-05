"user strict";
const Joi = require("joi");
const Proposal = require("../models/proposal");

const APPROVED = "Approved";
const REJECTED = "Rejected";

const register = function (server, options) {
  server.route({
    method: "POST",
    path: "/api/feasibility-check/populate",
    options: {
      auth: false,
    },
    handler: async function (request, h) {
      const proposals = await Proposal.populate();

      return proposals;
    },
  });

  server.route({
    method: "PUT",
    path: "/api/feasibility-check/status",
    options: {
      auth: {
        strategies: ["simple", "session"],
        scope: ["reviewer", "root"],
      },
      validate: {
        payload: {
          id: Joi.string().required(),
          feasibilityStatus: Joi.string().required(),
        },
      },
    },
    handler: async function (request, h) {
      const id = request.payload.id;
      const status = request.payload.feasibilityStatus;

      const proposal = await Proposal.updateFeasibilityStatus(id, status);

      return { message: "Success", submission: proposal };
    },
  });
};

module.exports = {
  name: "feasibilityCheck",
  dependencies: ["hapi-anchor-model", "auth"],
  register,
};
