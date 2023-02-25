"use strict";

const APPROVED = "Feasibility Checked";
const REJECTED = "Revise Requested";

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

function openFeasibilityModal(proposalId){
  const modal = document.getElementById('feasibility-modal-' + proposalId);
  modal.style.display = "block"; 
}

function closeFeasibilityModal(proposalId) {
  const modal = document.getElementById('feasibility-modal-' + proposalId);
  modal.style.display = "none";
}

 

function assignReviewer(proposalId){

  const values = $("#reviewerSelect").val();

  $.ajax({
      type: 'PUT',
      url: '/api/proposals/assign-reviewer/' + proposalId,
      contentType: "application/json",
      data: JSON.stringify({ reviewerIds: values }),
      success: function (result) {
          successAlert('Successfully assigned a reviewer');
          location.reload();
      },
      error: function (result) {
          errorAlert(result.responseJSON.message);
      }
  }); 
}