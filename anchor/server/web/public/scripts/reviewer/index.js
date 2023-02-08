'use strict'

function updateLabel() {
    var input = document.getElementById("proposal-file");
    var label = document.getElementById("fileName");
   
    var fileTitles = ''
    for(let i = 0; i < input.files.length; i++){
        fileTitles = fileTitles + input.files[i].name + '<br> <hr>';
    }
    
    label.innerHTML = fileTitles;
    
}

async function uploadFile(elem,name,email,userId) {
    updateLabel();
    const files = $(elem).prop("files");
    let filesPayload = [];
    const ajaxCalls = [];
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        let formData = new FormData();
        formData.append('file', file);
        
        //creating the payloads to update the DB collection with files that were uploaded to S3
        let payload = {
            reviewerId: userId,
            reviewerName: name,
            reviewerEmail: email,
            name: file.name,
        }
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
            console.log('save file to bucket error');
          }
        });
        ajaxCalls.push(call);
    }

    Promise.all(ajaxCalls).then(ajaxCallsResults => {
        const uploadedFiles = ajaxCallsResults.map(res => res.fileName);
        const failedUploads = filesPayload.filter(file => !uploadedFiles.includes(file.name)).map(file => file.name);
        filesPayload = filesPayload.filter(file => uploadedFiles.includes(file.name));

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
                    console.log('upload success');
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
