"use strict";

const Config = require("../../../config");
const Proposal = require("../../models/proposal");

const register = function (server, options) {
  server.route({
    method: "GET",
    path: "/feasibility-check/{submissionId?}",
    options: {
      auth: {
        strategies: ["session"],
      },
    },
    handler: async function (request, h) {
      const user = request.auth.credentials.user;
      let sort = { uploadedAt: -1 };
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
          { uploadedAt: { $gte: new Date(start) } },
          { uploadedAt: { $lt: new Date(end) } },
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

      const mostRecentProposals = await Proposal.pagedLookup(
        request.query,
        page,
        limit,
        options,
        []
      );
      const proposals = mostRecentProposals.data.map((doc) => {
        return {
          id: doc._id,
          name: doc.name,
          submitter: doc.submitter,
          feasibilityStatus: doc.feasibilityStatus,
          feasibilityApproved: doc.feasibilityStatus === "Approved",
          feasibilityPending: doc.feasibilityStatus === "Pending",
          feasibilityRejected: doc.feasibilityStatus === "Rejected",
          url: doc.url,
          uploadedAt: doc.uploadedAt.toJSON(),
          uploadedAtString: doc.uploadedAt.toDateString(),
          createdAt: doc.createdAt.toJSON(),
          createdAtString: doc.createdAt.toDateString(),
        };
      });

      for (let idx = 1; idx <= mostRecentProposals.pages.total; idx++) {
        pages.push;
      }

      return h.view("feasibilityCheck/index", {
        user,
        projectName: Config.get("/projectName"),
        title: "Feasibility Check",
        proposals, // submissions
        pages,
        hasNext: mostRecentProposals.pages.hasNext,
        hasPrev: mostRecentProposals.pages.hasPrev,
        next: mostRecentProposals.pages.next,
        prev: mostRecentProposals.pages.prev,
        currentPage: mostRecentProposals.pages.current,
        totalNumPages: mostRecentProposals.pages.total,
        total: mostRecentProposals.items.total,
        notDatatableView: true,
      });
    },
  });
};

module.exports = {
  name: "feasibilityCheckList",
  dependencies: ["hapi-anchor-model", "auth"],
  register,
};
