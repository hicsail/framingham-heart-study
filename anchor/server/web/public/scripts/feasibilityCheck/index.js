"use strict";

const APPROVED = "Approved";
const REJECTED = "Rejected";

function updateFeasibilityStatus(proposalId, approved) {
  console.log("Click event triggered");
  console.log(`Id: ${proposalId}, Status: ${approved}`);
  const status = approved ? APPROVED : REJECTED;
  $.ajax({
    type: "PUT",
    url: "/api/feasibility-check/status",
    contentType: "application/json",
    data: JSON.stringify({ id: proposalId, feasibilityStatus: status }),
    success: function (result) {
      location.reload();
      console.log(result);
    },
    error: function (result) {
      console.log("ERROR TRIGGERED");
      errorAlert(result.responseJSON.message);
    },
  });
}
