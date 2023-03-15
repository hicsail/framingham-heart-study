'use strict';

function onchangeClinicalData(elem, proposalId) {
  
  const payload = {clinicalDataTransfered: $(elem).is(":checked")};
  updatePostReviewInfo(proposalId, payload);
}

function onchangeBrainData(elem, proposalId) { 

  const payload = {brainDataReturned: $(elem).is(":checked")};
  updatePostReviewInfo(proposalId, payload);
}

function onchangeTissueShipment(elem, proposalId) { 

  const payload = {tissueShipped: $(elem).is(":checked")};
  updatePostReviewInfo(proposalId, payload);
}

function onchangeTissuePrep(elem, proposalId) { 

  const payload = {tissueInPreparation: $(elem).is(":checked")};
  updatePostReviewInfo(proposalId, payload);
}

function updatePostReviewInfo(proposalId, payload) {  
  
  $.ajax({      
    type: 'PUT',
    url: '/api/proposals/post-review-info/' + proposalId, 
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