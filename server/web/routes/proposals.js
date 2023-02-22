"use strict";
const Boom = require("boom");
const Config = require("../../../config");
const Proposal = require("../../models/proposal");
const User = require("../../models/user");
const Feedback = require("../../models/feedback");
const ObjectId = require("mongodb").ObjectID;

const register = function (server, options) {
  server.route({
    method: "GET",
    path: "/proposals/review/{proposalId}",
    options: {
      auth: {
        strategies: ["session"],
        scope: ["reviewer", "root", "chair"],
      },
    },
    handler: async function (request, h) {
      const user = request.auth.credentials.user;
      const proposalId = request.params.proposalId;
      const proposal = await Proposal.lookupById(proposalId, Proposal.lookups);

      const feedback = await Feedback.findOne({
        proposalId: proposalId.toString(),
        userId: user._id.toString(),
      });

      return h.view("proposals/review", {
        user: request.auth.credentials.user,
        projectName: Config.get("/projectName"),
        title: "Reviewer Upload",
        baseUrl: Config.get("/baseUrl"),
        proposal,
        feedback,
        reviewedDateString: feedback ? feedback.createdAt.toISOString() : null,
        isReviewed: feedback ? true : false,
      });
    },
  });

  server.route({
    method: "GET",
    path: "/proposals/upload",
    options: {
      auth: {
        strategies: ["session"],
        scope: ["coordinator", "root"],
      },
    },
    handler: async function (request, h) {
      const user = request.auth.credentials.user;
      const proposals = await Proposal.lookup({}, Proposal.lookups);

      return h.view("proposals/reviewer-upload", {
        user: request.auth.credentials.user,
        projectName: Config.get("/projectName"),
        title: "Reviewer Upload",
        baseUrl: Config.get("/baseUrl"),
        proposals,
      });
    },
  });

  server.route({
    method: "GET",
    path: "/proposals/submissions",
    options: {
      auth: {
        strategies: ["session"],
        scope: ["coordinator", "root", "reviewer", "chair"],
      },
    },
    handler: async function (request, h) {
      const user = request.auth.credentials.user;
      let sort = { createdAt: -1 };
      let limit = null;
      let page = 1;
      const pages = [];

      // if there is a date filter
      if ("uploadedAt" in request.query) {
        let start;
        let end;
        if (request.query["uploadedAt"].includes(":")) {
          start = new Date(
            request.query["uploadedAt"].split(":")[0]
          ).toISOString();
          end = new Date(
            request.query["uploadedAt"].split(":")[1]
          ).toISOString();
        } else {
          const date = new Date(request.query["uploadedAt"]);
          start = date.toISOString();
          end = new Date(date.setDate(date.getDate() + 1)).toISOString();
        }

        request.query["$and"] = [
          { createdAt: { $gte: new Date(start) } },
          { createdAt: { $lt: new Date(end) } },
        ];
        delete request.query.uploadedAt;
      }

      // if there is a sort filter
      if ("sort" in request.query) {
        sort = {};
        const sortKey = request.query["sort"].split(":")[0];
        const value = request.query["sort"].split(":")[1];
        sort[sortKey] = Number(value);
        delete request.query.sort;
      }

      // if there is page limit
      if ("limit" in request.query) {
        limit = Number(request.query["limit"]);
        delete request.query.limit;
      } else {
        limit = 50;
      }

      // if there is page num
      if ("page" in request.query) {
        page = Number(request.query["page"]);
        delete request.query.page;
      }

      const options = {
        collation: { locale: "en" },
        sort,
      };

      if (user.roles.reviewer) {
        //get proposals that are assigned to the reviwer
        request.query.reviewerIds = user._id.toString();
      }

      if (user.roles.chair) {
        //get proposals with feasibility status of approved when user is chair
        request.query.feasibilityStatus = "Approved";
      }

      const proposals = await Proposal.pagedLookup(
        request.query,
        page,
        limit,
        options,
        Proposal.lookups
      );

      for (const proposal of proposals.data) {
        const feedbackCnt = await Feedback.count({
          proposalId: proposal._id.toString(),
          userId: user._id.toString(),
        });
        proposal.hasFeedback = feedbackCnt > 0;
      }

      return h.view("proposals/submissions-list", {
        user,
        projectName: Config.get("/projectName"),
        title: "Feasibility Check",
        proposals: proposals.data, // submissions
        hasNext: proposals.pages.hasNext,
        hasPrev: proposals.pages.hasPrev,
        next: proposals.pages.next,
        prev: proposals.pages.prev,
        currentPage: proposals.pages.current,
        totalNumPages: proposals.pages.total,
        total: proposals.items.total,
        notDatatableView: true,
      });
    },
  });
};

module.exports = {
  name: "proposal",
  dependencies: ["auth", "hapi-anchor-model"],
  register,
};
