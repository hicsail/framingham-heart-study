"use strict";

const APPROVED = "Approved";
const REJECTED = "Rejected";

function updateFeasibilityStatus(proposalId, approved) {
  
  const status = approved ? APPROVED : REJECTED;
  $.ajax({
    type: "PUT",
    url: "/api/proposals/feasibility-check/status/" + proposalId,
    contentType: "application/json",
    data: JSON.stringify({ feasibilityStatus: status }),
    success: function (result) {
      location.reload();      
    },
    error: function (result) {
      errorAlert(result.responseJSON.message);
    },
  });
}
