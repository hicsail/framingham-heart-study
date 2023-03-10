const textareas = document.querySelectorAll("textarea");
// if (!localStorage.location)
//   localStorage.setItem("location", window.location.href);

for (const textarea of textareas) {
  textarea.addEventListener("input", () => {
    // localStorage.setItem(textarea.id, textarea.value);

    if (textarea.value.trim()) {
      textarea.classList.remove("border-danger");
    } else {
      textarea.classList.add("border-danger");
    }
  });
}

for (const decision of document.getElementsByName("decision")) {
  decision.addEventListener("change", () => {
    document.querySelector("form").classList.remove("input-validation-error");
  });
}

// window.addEventListener("DOMContentLoaded", () => {
//   if (localStorage.getItem("location") !== window.location.href) {
//     localStorage.clear();
//     return;
//   }

//   for (const textarea of textareas) {
//     textarea.value = localStorage.getItem(textarea.id);
//   }
// });

function submitPopup() {
  const textarea = document.querySelectorAll("textarea");

  for (const element of textarea) {
    if (!element.value.trim()) {
      element.classList.add("border-danger");
      element.focus();
      alert("Please fill all the fields");
      return;
    }
  }

  if (!document.querySelector("input[name=decision]:checked")) {
    document.querySelector("form").classList.add("input-validation-error");
    alert("Please select a decision");
    return;
  }

  $("#submit-review-modal").modal("show");

  return;
}

function submitFeedback(proposalId, userId) {
  const doc = {
    proposalId,
    userId,
    funding: document.getElementById("feedback-funding").value,
    conflict: document.getElementById("feedback-conflict").value,
    details: document.getElementById("feedback-details").value,
    weakness: {
      significance: document.getElementById("feedback-significance-weakness")
        .value,
      innovation: document.getElementById("feedback-innovation-weakness").value,
      approach: document.getElementById("feedback-approach-weakness").value,
    },
    strength: {
      significance: document.getElementById("feedback-significance-strength")
        .value,
      innovation: document.getElementById("feedback-innovation-strength").value,
      approach: document.getElementById("feedback-approach-strength").value,
    },

    decisionComment: document.getElementById("feedback-decision-comment").value,
  };

  for (const decision of document.getElementsByName("decision")) {
    if (decision.checked) {
      doc.decisionTag = decision.value;
      break;
    }
  }
  
  $.ajax({
    url: `/api/feedbacks`,
    type: "POST",
    data: JSON.stringify(doc),
    contentType: "application/json",
    success: function (result) {
      sendEmail(proposalId);
      location.reload();
    },
    error: function (result) {
      errorAlert(result.responseJSON.message);
    },
  });
}

function sendEmail(proposalId){
  const payload = {
    templateName: 'all-reviews-submitted',
    proposalId,
  }
  $.ajax({
    type: 'POST',
    url: '/api/email/',
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