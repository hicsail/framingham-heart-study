"user strict";
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
    },
    handler: async function (request, h) {
      // TODO: add handler body
    },
  });
};

module.exports = {
  name: "feasibilityCheck",
  dependencies: ["hapi-anchor-model", "auth"],
  register,
};
