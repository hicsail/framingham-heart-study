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
                    console.log(result)                   
                    successAlert('Files uploaded');
                    location.reload();
                },
                error: function (result) {
                    errorAlert(result.responseJSON.message);
                }
            });
        }
    });    
}

function onClickUploadFile() { 

    $("#proposal-file-input").click();
  }
