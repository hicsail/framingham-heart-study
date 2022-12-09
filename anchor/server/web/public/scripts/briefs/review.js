'use strict';

function viewComments(submissionId) {
  $.ajax({
    type: 'GET',
    url: '/api/briefComments/' + submissionId,      
    success: function (result) {
      $('#comment' + submissionId).empty();
      for (const cm of result) {
        const html = '<div class="card"><h6 class="card-header bg-secondary text-white"><strong>'+ cm.user.name + '</strong>' +
        '(' + (new Date(cm.createdAt)).toDateString() + '):' + '</h6>' + '<textarea  class="bg-light form-control" disabled' + 
        'style="resize: none;" type="text" rows="2" cols="50">' +  cm.text + '</textarea></div><br>';
        $('#comment' + submissionId).append(html);
      } 
    },
    error: function (result) {
      errorAlert(result.responseJSON.message);
    }
  });
}