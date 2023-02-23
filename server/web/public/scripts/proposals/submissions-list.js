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

 // When the user clicks on the button, open the modal
 function openModal(proposalId) {
  
  const modal = document.getElementById('modal-' + proposalId);
  modal.style.display = "block"; 
}

function assignReviewer(proposalId){
  const modalVal = document.getElementById('reviewerSelect');
  var options = document.getElementById('reviewerSelect').selectedOptions;
  var values = Array.from(options).map(({ value }) => value);
  console.log(values);
  //update Proposal's reviewerIds field with the chosen id from select
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


// When the user clicks on <span> (x), close the modal
function closeModal(id) {
  const modal = document.getElementById('modal-' + id);
  modal.style.display = "none";
}

