'use strict'; 

function submitForm() { 

  function notifyReviewers(submissionId) {
    $.ajax({
      type: 'POST',
      url: '/api/briefSubmission/sendEmailsToReviewers/' + submissionId,            
      success: function (result) {        
        window.location = '../../brief/' + submissionId;        
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

      if (question['type'] === 'multiCheck') {
        query[key] = [];
        for (let option of question['options']) {
          if ($('#' + option['domId']).prop('checked')) {
            query[key].push(option['domId']); 
          }          
        }
      }
      else {           
        query[key] = $('#' + question['domId']).val();  
      }
    }
    
    $.ajax({
      type: 'POST',
      url: '/api/briefSubmission',
      contentType: 'application/json',
      data: JSON.stringify({'query': query}),
      success: function (result) {        
        const submissionId = result._id.toString();
        notifyReviewers(submissionId);
        //window.location = '../../brief/' + submissionId;        
      },
      error: function (result) {                       
        errorAlert(result.responseJSON.message);
      }
    });
  }  
}

function displayFormFieldValues() {

  const submissionId = window.location.href.split('/').pop();
  $.ajax({
    type: 'GET',
    url: '/api/briefSubmission/' + submissionId,      
    success: function (result) {

      for (let id in result.query) {        
        const type = questions[Number(id)-1]['type'];              
        if (type === 'multiCheck') {
          for (let domId of result.query[id]) {       
            $('#' + domId).prop("checked", true);
          }
        }
        else {
          const domId = questions[Number(id)-1]['domId'];
          $('#' + domId).val(result.query[id]);
        }
        traineeTypeOnChange();
        requireFundingOnChange();
        requireBiospecimenOnChange();
        $('#reviewerComment').val(result.comment);   
      }
    },
    error: function (result) {
      errorAlert(result.responseJSON.message);
    }
  }); 
}

function traineeTypeOnChange() {  
  if ($('#traineeType').val() === 'other') {
    $('#traineeTypeOtherSection').show();
  }
  else {
    $('#traineeTypeOtherSection').hide();     
  }      
}

function requireFundingOnChange() {  
  if ($('#requireFunding').val() === 'yes') { 
    $('#deadlineSection').show();   
  }
  else {    
    $('#deadlineSection').hide();       
  }      
}

function requireBiospecimenOnChange() {
  if ($('#requireBiospecimens').val() === 'yes') { 
    $('#BiospecimensType').show(); 
    $('#analyteInterestSection').show();  
  }
  else {    
    $('#BiospecimensType').hide(); 
    $('#analyteInterestSection').hide();      
  }    
}

function disableInputs() {
  for (let question of questions) {
    if (question['type'] === 'multiCheck') {
      for (let option of question['options']) {       
        $('#' + option['domId']).attr('disabled', 'disabled'); 
      }
    }
    else {
      $('#' + question['domId']).attr('disabled', 'disabled'); 
    }    
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
    url: '/api/briefSubmission/submitReview/' + submissionId,
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

function biospecimensTypeIsSelected() {
    
  let ids = ['plasma', 'serum', 'RBC', 'germlineDNA', 'tumorTissue'];
  for (const id of ids) {
    if($('#' + id).is(':checked')) {
      return true;
    }
  }
  return false;
}

function validateBiospecimensTypeCheckBoxes() {
    
  if (!biospecimensTypeIsSelected()) {      
    $('#BiospecimensType').addClass('is-invalid').removeClass('is-valid');
    $('#BiospecimensType').append('<small id="JoiFormHelp' + 'BiospecimensType' + '" class="form-text text-danger"></small>');
    $('#JoiFormHelp' + 'BiospecimensType').text('Since your project requires biospecimens, you must specify the type(s)');
    return false;
  }
  else {        
    $('#BiospecimensType').addClass('is-valid').removeClass('is-invalid');
    $('#BiospecimensType').append('<small id="JoiFormHelp' + 'BiospecimensType' + '" class="form-text text-danger"></small>');
    $('#JoiFormHelp' + 'BiospecimensType').text('');
    return true;
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
      if (question['validationSchema'] && 
        (question['id'] !== 8 || (question['id'] === 8 && $('#' + questions[6]['domId']).val() === 'other')) && 
        (question['id'] !== 24 || (question['id'] === 24 &&  $('#' + questions[14]['domId']).val() === 'yes')) &&
        (question['id'] !== 14 || (question['id'] === 14 &&  $('#' + questions[24]['domId']).val() === 'yes'))) {
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
      //want to make sure a biospecimens type is checked, if user answered yes to project requires biospecimens 
      else if (question['id'] === 13 && $('#' + questions[24]['domId']).val() === 'yes') {
        passValidation = validateBiospecimensTypeCheckBoxes();        
      }
    }
    return passValidation;  
  }
}

function submitComment(userId, briefSubId) {

  function notifyReviewers(userId, briefSubId) {
    
    $.ajax({
      type: 'POST',
      url: '/api/comments/sendEmailsToReviewers/' + userId + '/' + briefSubId,            
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
    url: '/api/briefComments',
    contentType: 'application/json',    
    data: JSON.stringify({'text': comment, 'userId': userId, 'submissionId': briefSubId}),
    success: function (result) {                  
      notifyReviewers(userId, briefSubId);
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
    url: '/api/briefComments/' + commentId,
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
      url: '/api/briefComments/' + commentId,
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

  if (window.location.href.split('/').pop() !== 'brief'){    
    displayFormFieldValues();    
    disableInputs();
    $('#submit').hide();           
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