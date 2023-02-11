'use strict';
const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required()
});
joiToForm('loginFormFields',loginSchema);

$('#login').click((event) => {
  event.preventDefault();
  const values = {};
  $.each($('#loginForm').serializeArray(), (i, field) => {
    values[field.name] = field.value;
  });
  $.ajax({
    type: 'POST',
    url: '/api/login',
    data: values,
    success: function (result) {           
      location.reload();
    },
    error: function (result) {      
      errorAlert(result.responseJSON.message);
      if (result.responseJSON.message === 'Credentials are invalid or account is inactive.') {
        $("#forgot-password").css("display", "inline");  
      }   
    }
  });
});
