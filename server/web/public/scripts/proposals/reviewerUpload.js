'use strict'

async function uploadFile(elem, userId) {
    
    const files = $(elem).prop("files");
    let filesPayload = [];
    const ajaxCalls = [];

    for (const file of files) {        
        let formData = new FormData();
        formData.append('file', file);
        
        //creating the payloads to update the DB collection with files that were uploaded to S3
        let payload = {
            userId, //userId of the person who uploads the doc 
            fileName: file['name']                    
        };
        filesPayload.push(payload);
       
        //sends file with content to server so we can upload it to S3
        const call = $.ajax({
          type: 'POST',
          url: '/api/S3/saveFilesToBucket',
          data: formData,
          contentType: false,
          cache: false,
          processData: false,
          success: function (result) {
            console.log('save file to bucket');
          },
          error: function (result) {
            errorAlert(result.responseJSON.message);            
          }
        });
        ajaxCalls.push(call);
    }

    Promise.all(ajaxCalls).then(ajaxCallsResults => {
        const uploadedFiles = ajaxCallsResults.map(res => res.fileName);
        const failedUploads = filesPayload.filter(payload => !uploadedFiles.includes(payload.fileName)).map(payload => payload.fileName);
        filesPayload = filesPayload.filter(payload => uploadedFiles.includes(payload.fileName));

        if(failedUploads.length > 0){
            errorAlert('Unable to upload files: ' + failedUploads.join(', ') + '.');
        }

        if(filesPayload.length > 0){
            $.ajax({
                type:'POST',
                url: '/api/proposals/insertMany',
                contentType: 'application/json',
                data: JSON.stringify(filesPayload),
                success: function (result) {                                       
                    successAlert('Files uploaded');
                    //send another ajax call?
                    sendEmail(filesPayload);
                    location.reload();
                },
                error: function (result) {
                    errorAlert(result.responseJSON.message);
                }
            });
        }
    });    
}


function sendEmail(filesPayload){
  let fileNameArr = [];
  const proposalId = filesPayload[0]._id
  filesPayload.forEach(element => {
    fileNameArr.push(element.fileName)
  });
  const payload = {
    templateName: 'proposal-upload',
    fileNames: fileNameArr
  }
  
  $.ajax({
    type: 'POST',
    url: '/api/email/' + proposalId,
    contentType: 'application/json',
    data: JSON.stringify(payload),
    success: function (result) {
      successAlert('Emails sent');
    },
    error: function (result){
      errorAlert(result.responseJSON.message);
    }
  })
}

function onClickUploadFile() { 

    $("#proposal-file-input").click();
}

function deleteFile() {

  const fileName = $("#file-name").val();  
  const fileObjectId = $("#file-object-id").val();
  
  $.ajax({      
    type: 'DELETE',
    url: '/api/S3/deleteFile/' + fileName,                                 
    success: function (result) { 
      //Also delete from DB     
      $.ajax({      
        type: 'DELETE',
        url: '/api/proposals/' + fileObjectId,                                 
        success: function (result) {                     
          successAlert("Successfully deleted file.");
          location.reload();           
        },
        error: function (result) {
          errorAlert(result.responseJSON.message);
        }
      });          
    },
    error: function (result) {
      errorAlert(result.responseJSON.message);
    }
  });
}

function onClickDeleteFile(fileName, fileObjectId) {

  $("#modal-title").text('Delete file ' + fileName);
  $("#file-name").val(fileName);
  $("#file-object-id").val(fileObjectId);
}


const table = $('.table').DataTable({           
    scrollX: true,
    scrollY: '500px',
    scrollCollapse: true,
    lengthChange: false,          
    stateSave: true,
    dom: 'Bfrtip',
    columnDefs: [
      {
        type: 'size',
        "sType": "size",
        "bSortable": true,
        targets: 4,
      },
    ],
    buttons: [
      {
        extend: 'print',
        exportOptions: {
          columns: ':visible'
        },
        text: '<i class="fa fa-print"></i> Print',              
        footer: true,
        autoPrint: true,
        orientation : 'landscape',
        paperSize : 'A3',         
      },
      {
        extend: 'copyHtml5',
        exportOptions: {
          columns: ':visible'
        }
      },
      {
        extend: 'excelHtml5',
        exportOptions: {
          columns: ':visible'
        }
      },
      {
        extend: 'pdfHtml5',
        exportOptions: {
          columns: ':visible'
        },
        orientation : 'landscape',
        pageSize : 'A3',
        text : '<i class="fa fa-file-pdf-o"> PDF</i>',
        titleAttr : 'PDF'
      },            
      {
        extend: 'csvHtml5',
        exportOptions: {
          columns: ':visible'
        }
      },
      'colvis'
    ]          
  }); 
table.columns( '.hidden' ).visible( false );
