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
    path: "/proposals/review/{proposalId}/{reviewerId?}",
    options: {
      auth: {
        strategies: ["session"],
        scope: ["reviewer", "root", "chair"],
      },
    },
    handler: async function (request, h) {
      const user = request.auth.credentials.user;
      const proposalId = request.params.proposalId;
      const reviewerId = request.params.reviewerId ? request.params.reviewerId : null;
      const proposal = await Proposal.lookupById(proposalId, Proposal.lookups);

      let feedback = null;
      let reviewers = [];

      if (user.roles.reviewer) {
        feedback = await Feedback.findOne({
          proposalId: proposalId.toString(),
          userId: user._id.toString(),
        });
      }

      const resultsDict = {};
      for (const decision of Object.keys(Feedback.status)) {
        resultsDict[Feedback.status[decision]] = 0;
      }

      if (user.roles.chair) {
        const feedbacks = await Feedback.find({ proposalId: proposalId.toString() });
        feedback = feedbacks[0];
        for (let idx = 0; idx < feedbacks.length; idx++) {
          if (feedbacks[idx].userId === reviewerId) {
            feedback = feedbacks[idx];
          }

          resultsDict[feedbacks[idx].decisionTag] += 1;
          const reviewer = await User.findById(feedbacks[idx].userId);
          reviewers.push(reviewer);
        }
      }
      const results = [];
      for (const result of Object.entries(resultsDict)) {
        results.push({ name: result[0], value: result[1] });
      }

      return h.view("proposals/review", {
        user: request.auth.credentials.user,
        projectName: Config.get("/projectName"),
        title: "Reviewer Upload",
        baseUrl: Config.get("/baseUrl"),
        proposal,
        feedback,
        reviewers,
        results,
        reviewedDateString: feedback ? feedback.createdAt.toString() : null,
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
          start = new Date(request.query["uploadedAt"].split(":")[0]).toISOString();
          end = new Date(request.query["uploadedAt"].split(":")[1]).toISOString();
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

      let reviewers;
      if (user.roles.reviewer) {
        //get proposals that are assigned to the reviwer
        request.query.reviewerIds = user._id.toString();
      }

      if (user.roles.chair) {
        //get proposals with feasibility status of approved when user is chair
        request.query.feasibilityStatus = "Feasibility Checked";
        //get list of all available reviewers to be assigned a proposal
        reviewers = await User.find({ roles: { reviewer: true } });
      }

      const result = await Proposal.pagedLookup(
        request.query,
        page,
        limit,
        options,
        Proposal.lookups
      );

      //attach list of full reviewers object to proposals
      for (const proposal of result.data) {
        proposal.assignedReviewers = [];
        for (const id of proposal.reviewerIds) {
          const reviewer = await User.findById(id);
          proposal.assignedReviewers.push(reviewer);
        }
      }

      //logic for hasfeeback need to change here
      for (const proposal of result.data) {
        const feedbacks = await Feedback.find({
          proposalId: proposal._id.toString(),
        });

        if (user.roles.chair) {
          proposal.hasFeedback = feedbacks.length === proposal.reviewerIds.length;
        } else if (user.roles.reviewer) {
          for (const feedback of feedbacks) {
            if (feedback.userId.toString() === user._id.toString()) {
              proposal.hasFeedback = true;
              break;
            }
          }
        } else {
          proposal.hasFeedback = false;
        }
      }

      return h.view("proposals/submissions-list", {
        user,
        projectName: Config.get("/projectName"),
        title: "Feasibility Check",
        proposals: result.data, // submissions
        hasNext: result.pages.hasNext,
        hasPrev: result.pages.hasPrev,
        next: result.pages.next,
        prev: result.pages.prev,
        currentPage: result.pages.current,
        totalNumPages: result.pages.total,
        total: result.items.total,
        notDatatableView: true,
        reviewers,
      });
    },
  });
};

module.exports = {
  name: "proposal",
  dependencies: ["auth", "hapi-anchor-model"],
  register,
};
