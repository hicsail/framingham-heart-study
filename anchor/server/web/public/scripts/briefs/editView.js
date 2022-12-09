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
        $('#reviewerComment').val(result.comment);   
      }
    },
    error: function (result) {
      errorAlert(result.responseJSON.message);
    }
  }); 
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
        (question['id'] !== 24 || (question['id'] === 24 &&  $('#' + questions[14]['domId']).val() === 'yes'))) {
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

function submitForm() {   
  
  const submissionId = window.location.href.split('/').pop();

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
      type: 'PUT',
      url: '/api/briefSubmission/' + submissionId,
      contentType: 'application/json',
      data: JSON.stringify({'query': query}),
      success: function (result) {        
        const submissionId = result._id.toString();                
        window.location = '../../edit/briefSubmission/' + submissionId;        
      },
      error: function (result) {                               
        errorAlert(result.responseJSON.message);
      }
    });
  }  
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

$( document ).ready(function() {  
    displayFormFieldValues();   
});

