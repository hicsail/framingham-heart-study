"use strict";

const register = function (server, options) {
  server.route({
    method: "GET",
    path: "/feasibility-check",
    options: {
      auth: {
        strategies: ["session"],
      },
    },
    handler: async function (request, h) {
      // TODO: Add handler body here
    },
  });
};
