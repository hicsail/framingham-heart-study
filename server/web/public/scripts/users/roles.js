'use strict';

$(document).ready(() => {
  $('#userTable').DataTable({
    scrollX: true,
    scrollY: '500px',
    scrollCollapse: true,
    stateSave: true,
    lengthChange: false,
    dom: 'Bfrtip',
    buttons: [
      'copy', 'csv', 'excel', 'pdf', 'print','colvis'
    ]
  });
});

function onCheckboxClicked(elem, userId) {
  
  const groupName = $(elem).attr("name");  
  const role = $("input[name='" + groupName + "']").filter(":checked").val();
  promote(userId, role);  
}

function promote(id, role) {
  changeRole(id, role, 'PUT')
}

function demote(id, role) {
  changeRole(id, role, 'DELETE')
}

function changeRole(id, role, method) {  
  $.ajax({
    url: '/api/users/' + role + '/' + id,
    type: method,
    success: function (result) {
      successAlert('User Role Successfully Updated');
      location.reload();
    },
    error: function (result) {
      errorAlert(result.responseJSON.message);
    }
  });
}