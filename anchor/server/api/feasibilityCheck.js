"user strict";
const Proposal = require("../models/proposal");

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
};

module.exports = {
  name: "feasibilityCheck",
  dependencies: ["hapi-anchor-model", "auth"],
  register,
};
