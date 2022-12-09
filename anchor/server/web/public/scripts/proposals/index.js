'use strict'; 

function postApprovalForm(elem) { 

  const btnText = $(elem).text();
  const domIds = ['investigator', 'analyst', 'DUADate', 'dataRequestDate', 
                  'preparationDate', 'DUAStatus', 'dataReqStatus', 'preparationStatus'];

  if (btnText === 'Edit') {
    $(elem).text('Save Changes'); 
    for (let id of domIds) { //enable form fields                  
      $('#' + id).prop( "disabled", false );     
    }
    return; 
  }
  else if (btnText === 'Save Changes') {
    $(elem).text('Edit');  
  }

  const proposalId = window.location.href.split('/').pop();  
  let postApprovalInfo = {};
  for (let id of domIds) {                    
    postApprovalInfo[id] = $('#' + id).val();     
  }
       
  $.ajax({
    type: 'PUT',
    url: '/api/conceptProposal/editPostApproval/' + proposalId,
    contentType: 'application/json',
    data: JSON.stringify({'postApprovalInfo': postApprovalInfo}),
    success: function (result) {     
      location.reload();               
    },
    error: function (result) {                       
      errorAlert(result.responseJSON.message);
    }
  });    
}

function onClickUploadFile(elem) {  

  $(elem).siblings("input").click();
}

function uploadFiles(elem) {
  
  const filesInfo = {};
  const files = $(elem).prop("files");
  const proposalId = window.location.href.split('/').pop();  

  for (let i=0; i<files.length; ++i) { 
    const file = files[i]; 
    const fileReader = new FileReader();   
    fileReader.readAsDataURL(file); 
    fileReader.onload = function (fileLoadedEvent) {    
      filesInfo[file['name']] = fileLoadedEvent.target.result;      
      $.ajax({
        type: 'PUT',
        url: '/api/conceptProposal/uploadFile/' + proposalId,
        contentType: 'application/json',
        data: JSON.stringify({'fileName': file['name'], 'content': fileLoadedEvent.target.result}),
        success: function (result) {          
          if (i === files.length -1) {
            location.reload();
          }                       
        },
        error: function (result) {                       
          errorAlert(result.responseJSON.message);
        }
      });       
    };
  }  
}

function submitForm() {
  
  let briefId;
  if (window.location.href.split('/').slice(-2)[0] === 'proposal') {
    briefId = window.location.href.split('/').pop(); 
  }
  else {
    briefId = window.location.href.split('/').slice(-2)[0];  
  }

  function notifyReviewers(briefSubId, proposalSubId) {
    
    $.ajax({
      type: 'POST',
      url: '/api/briefSubmission/sendEmailsToReviewers/' + briefSubId + '/' + proposalSubId,            
      success: function (result) {              
        window.location = '../../proposal/' + briefSubId + '/' + proposalSubId;        
      },
      error: function (result) {                       
        errorAlert(result.responseJSON.message);
      }
    });  
  } 

  if (validateFields()) {
    let query = {};
    for (let question of questions) {
      let key = question['id'].toString();                
      query[key] = $('#' + question['domId']).val();     
    }
    
    $.ajax({
      type: 'POST',
      url: '/api/conceptProposal',
      contentType: 'application/json',
      data: JSON.stringify({'query': query, 'briefSubmissionId': briefId}),
      success: function (result) {        
        const submissionId = result._id.toString();
        notifyReviewers(briefId, submissionId);                
      },
      error: function (result) {                       
        errorAlert(result.responseJSON.message);
      }
    });
  }  
}

function validateFields(id=null) {

  if (id){
    const q = questions[Number(id)-1]
    if (q['validationSchema']) {
      const schema = q['validationSchema'];
      const input = $('#' + q['domId']).val();
      const {error} = Joi.validate(input,schema);
      if (error) {
        $('#' + q['domId']).addClass('is-invalid').removeClass('is-valid');
        $('#' + q['domId']).parent().append('<small id="JoiFormHelp' + q['domId'] + '" class="form-text text-danger"></small>');
        $('#JoiFormHelp' + q['domId']).text(error.message.replace('"value"',camelCaseToWords(q['domId'])));
      }
      else {
        $('#' + q['domId']).addClass('is-valid').removeClass('is-invalid');
        $('#' + q['domId']).parent().append('<small id="JoiFormHelp' + q['domId'] + '" class="form-text text-danger"></small>');
        $('#JoiFormHelp' + q['domId']).text('');
      }
    }
  }
  else {
    let passValidation = true;
    for (let question of questions) {
      if (question['validationSchema']) {         
        const schema = question['validationSchema'];        
        const input = $('#' + question['domId']).val();
        const {error} = Joi.validate(input,schema);
        if (error) {
          $('#' + question['domId']).addClass('is-invalid').removeClass('is-valid');
          $('#' + question['domId']).parent().append('<small id="JoiFormHelp' + question['domId'] + '" class="form-text text-danger"></small>');
          $('#JoiFormHelp' + question['domId']).text(error.message.replace('"value"',camelCaseToWords(question['domId'])));
          passValidation = false;
        }
        else {
          $('#' + question['domId']).addClass('is-valid').removeClass('is-invalid');
          $('#' + question['domId']).parent().append('<small id="JoiFormHelp' + question['domId'] + '" class="form-text text-danger"></small>');
          $('#JoiFormHelp' + question['domId']).text('');
        }
      }
    }
    return passValidation;  
  }
}

function displayFormFieldValues() {

  const submissionId = window.location.href.split('/').pop();
  $.ajax({
    type: 'GET',
    url: '/api/conceptProposal/' + submissionId,      
    success: function (result) {

      for (let id in result.query) {        
        const domId = questions[Number(id)-1]['domId'];
        $('#' + domId).val(result.query[id]);        
        //$('#reviewerComment').val(result.comment);   
      }
      for (let id in result.postApprovalInfo) {
        $('#' + id).val(result.postApprovalInfo[id]);        
      }
      if ($('#upload-links') && result.files) {
        for (const name in result.files) {            
          $("#upload-links").append('<a id="downloadLink" href="' + result.files[name]['content'] + '" download="' + name + '">Download ' + name + '</a><br>');  
        }
        $('#upload-links').show(); 
      }
      else if (!result.files) {
        $('#upload-links').hide();  
      }      
    },
    error: function (result) {
      errorAlert(result.responseJSON.message);
    }
  }); 
}

function disableInputs() {
  for (let question of questions) {    
    $('#' + question['domId']).attr('disabled', 'disabled');        
  }  
}

function getReasonForRejection() {

  let reason = null;
  const numberToReason = {
    '1': 'the necessary data are not available to carry out the aims',
    '2': 'a similar project is already in progress',
    '3': 'the research was not deemed a sufficient priority for use of limited biospecimen samples'
  }; 

  const radioValue = $("input[name='reason']:checked").val();
  if (radioValue) {
    reason = numberToReason[radioValue];    
  }
  else {
    reason = $("#customReason").val();
  }  
  return reason;
}

function submitReview(reviewerId, status) {

  const submissionId = window.location.href.split('/').pop();
  const feedback = $('#reviewerComment').val();
  let payload = {'status': status, 'feedback': feedback};
  if (status === 'rejected') {
    payload['rejectionReason'] = getReasonForRejection();
  }
  $.ajax({
    type: 'PUT',
    url: '/api/conceptProposal/submitReview/' + submissionId,
    contentType: 'application/json',    
    data: JSON.stringify(payload),
    success: function (result) {      
      location.reload();
    },
    error: function (result) {
      errorAlert(result.responseJSON.message);
    }
  }); 
}

function submitComment(userId, proposalSubId, briefSubId) { 

  function notifyReviewers(userId, briefSubId, proposalSubId) {
    
    $.ajax({
      type: 'POST',
      url: '/api/comments/sendEmailsToReviewers/' + userId + '/' + briefSubId + '/' + proposalSubId,            
      success: function (result) { 
        location.reload();             
      },
      error: function (result) {                       
        errorAlert(result.responseJSON.message);
      }
    });  
  }  
  const comment = $('#reviewerComment').val();
  $.ajax({
    type: 'POST',
    url: '/api/proposalComments',
    contentType: 'application/json',    
    data: JSON.stringify({'text': comment, 'userId': userId, 'submissionId': proposalSubId}),
    success: function (result) { 
      notifyReviewers(userId, briefSubId, proposalSubId);  
    },
    error: function (result) {
      errorAlert(result.responseJSON.message);
    }
  }); 
}

function enableElem(elemId) {
  $("#" + elemId).removeAttr('disabled');
}

function disableElem(elemId) {
  $("#" + elemId).prop( "disabled", true );
}

function deleteComment(commentId) {  
  $.ajax({
    url: '/api/proposalComments/' + commentId,
    type: 'DELETE',
    success: function (result) {
      successAlert('Comment Deleted');
      location.reload();
    },
    error: function (result) {
      errorAlert(result.responseJSON.message);
    }
  });  
}

function editComment(commentId) {
  const elem = $('#editCm' + commentId);
  if (elem.text() === 'Edit') {
    enableElem('cmText' + commentId);//enable comments text area for updating 
    elem.text('Save');//change text of edit button
  } 
  else { // comment text area has already been enabled 
    const text = $('#cmText' + commentId).val();    
    $.ajax({
      url: '/api/proposalComments/' + commentId,
      type: 'PUT',
      data: {text: text},
      success: function (result) {
        successAlert('Comment Updated');
        disableElem('cmText' + commentId);//disable comment text area again 
        elem.text('Edit');
        //location.reload();
      },
      error: function (result) {
        errorAlert(result.responseJSON.message);
      }
    });
  }
}
//-------------------------------------------------------------------------------------------
$( document ).ready(function() {
  
  if (window.location.href.split('/').slice(-2)[0] !== 'proposal'){    
    displayFormFieldValues();
    if ($('#disableInputs').val() === 'true') {
      disableInputs();
      $('#submit').hide(); 
    }
    else {
      for (let question of questions) {
        $('#' + question['domId']).attr('onkeyup', 'validateFields("' + question['id'] + '")');
      }
    }                  
  }
  else {// attach onkeyup attribute to form fields for validation 
    for (let question of questions) {
      $('#' + question['domId']).attr('onkeyup', 'validateFields("' + question['id'] + '")');
    }
  }  
  $("#reviewerComment").keyup(function(){     
    if($("#reviewerComment").val().length !== 0) {
      enableElem('submitComment');
      $("#reject").html("Not approve and leave a feedback for requester"); 
      $("#approve").html("Approve and leave a feedback for requester"); 
    }
    else {
      disableElem('submitComment');
      $("#reject").html("Reject"); 
      $("#approve").html("Approve");   
    }
  });
  $("#customReason").keyup(function(){ //Uncheck radio boxes when user enters custom reason in the text area        
    $("input[name='reason']").each(function(){
      $(this).prop("checked" , false ); 
    });
  });    
});
