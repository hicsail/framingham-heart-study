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

function submitPopup(finalDecisionMode) {
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

  if (finalDecisionMode) {
    $("#submit-review-modal").modal("show");
  }
  else {
    $("#submit-feedback-modal").modal("show");
  }
  return;
}

function submitFeedback(proposalId, userId) {
  const doc = {
    proposalId,
    userId,    
    weakness: {
      significance: $("#feedback-significance-weakness")[0].value,
      innovation: $("#feedback-innovation-weakness")[0].value,
      approach: $("#feedback-approach-weakness")[0].value,
    },
    strength: {
      significance: $("#feedback-significance-strength")[0].value,
      innovation: $("#feedback-innovation-strength")[0].value,
      approach: $("#feedback-approach-strength")[0].value,
    },

    decisionComment: $("#feedback-decision-comment")[0].value,
  };

  for (const decision of $("input[name=decision]")) {
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
      location.reload();
    },
    error: function (result) {
      errorAlert(result.responseJSON.message);
    },
  });
}

function submitReview(proposalId) {
  const doc = { reviewComment: $("#final-decision-comment")[0].value };

  for (const decision of $("input[name=final-decision]")) {
    if (decision.checked) {
      doc.reviewStatus = decision.value;
      break;
    }
  }

  $.ajax({
    url: `/api/proposals/review/status/${proposalId}`,
    type: "PUT",
    data: JSON.stringify(doc),
    contentType: "application/json",
    success: function (result) {
      location.reload();
    },
    error: function (result) {
      errorAlert(result.responseJSON.message);
    },
  });
}
