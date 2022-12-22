"use strict";

function updateFeasibilityStatus(status) {
  $.ajax({
    type: "PUT",
    url: "/api/feasibility-check/status",
    contentType: "application/json",
    data: JSON.stringify({ feasibilityStatus: status }),
    success: function (proposal) {
      // TODO: update status
    },
  });
}
