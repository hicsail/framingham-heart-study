'use strict';

function badgeType(status) {
  if (status === 'approved') 
    return 'badge-success';
  else if (status === 'rejected')
    return 'badge-danger';
  else if (status === 'pending')
    return 'badge-info';
}

function status(status) {
  if (status === 'rejected')
    return 'not approved';
  else 
    return status;  
}

function viewHistory(briefSubmissionId, submissionId) {

  $.ajax({
    type: 'GET',
    url: '/api/conceptProposal/history/' + briefSubmissionId + '/' + submissionId,   
    success: function (result) { 

      $('#history' + briefSubmissionId).empty()
      for (let i = 0; i < result.length; ++i) {
        const doc = result[i];        
        $('#history' + briefSubmissionId).append('<a class="dropdown-item" href="proposal/' + 
          doc.briefSubmissionId + '/' + doc._id.toString() + '">' + (new Date(result[i].createdAt)).toDateString() + ' ' + '<span class="badge badge-pill ' + badgeType(result[i].status) + '">' + status(result[i].status) + '</span></a>');
      }
    },
    error: function (result) {
      errorAlert(result.responseJSON.message);
    }
  }); 
}