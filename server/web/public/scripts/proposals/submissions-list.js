"use strict";

const APPROVED = "Feasibility Checked";
const REJECTED = "Revise Requested";

function onclickParsingResultsModal(proposalId) {  

  $.ajax({
    type: "GET",
    url: "/api/proposals/parsing-results/" + proposalId,    
    success: function (result) {
      $("#proposalId").val(proposalId);
      for (const key in result['parsingResults']) {
        let value;
        if (result['proposal']['parsingResults'] && result['proposal']['parsingResults'][key]) {
          value = result['proposal']['parsingResults'][key];
        }
        else {
          value = result['parsingResults'][key]; 
        }            
        $("#" + key).val(value);        
      }    
    },
    error: function (result) {
      errorAlert(result.responseJSON.message);
    },
  });
}

function saveParsingResults() {

  const proposalId = $("#proposalId").val();
  let payload = {};
  const ids = ['applicantName', 'applicationId', 'projectTitle', 'details', 'conflict', 'funding'];
  for (const id of ids) {
    payload[id] = $("#" + id).val();
  }
  $.ajax({
    type: "PUT",
    url: "/api/proposals/parsing-results/" + proposalId,
    contentType: "application/json",
    data: JSON.stringify(payload),
    success: function (result) {      
      location.reload();      
    },
    error: function (result) {
      errorAlert(result.responseJSON.message);
    },
  });
}

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

function assignReviewer(proposalId) {
  const values = $("#reviewerSelect-" + proposalId).val();
  $.ajax({
    type: "PUT",
    url: "/api/proposals/assign-reviewer/" + proposalId,
    contentType: "application/json",
    data: JSON.stringify({ reviewerIds: values }),
    success: function (result) {
      successAlert("Successfully assigned a reviewer");
      location.reload();
    },
    error: function (result) {
      errorAlert(result.responseJSON.message);
    },
  });
}
