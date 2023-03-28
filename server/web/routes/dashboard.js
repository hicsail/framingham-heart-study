"use strict";
const Config = require("../../../config");
const PermissionConfigTable = require("../../permission-config.json");
const DefaultScopes = require("../../helper/getRoleNames");
const Proposal = require("../../models/proposal");

const register = function (server, options) {
  server.route({
    method: "GET",
    path: "/dashboard",
    options: {
      auth: {
        strategies: ["session"],
        //scope: PermissionConfigTable.GET['/dashboard'] || DefaultScopes
      },
    },
    handler: async function (request, h) {
      const user = request.auth.credentials.user;
      const approvedProposals = await Proposal.find({ finalReviewStatus: "Approve" });

      return h.view("dashboard/index", {
        user,
        proposals: approvedProposals,
        projectName: Config.get("/projectName"),
        title: "Dashboard",
        baseUrl: Config.get("/baseUrl"),
      });
    },
  });
};

module.exports = {
  name: "dashboard",
  dependencies: ["hapi-anchor-model", "auth"],
  register,
};
