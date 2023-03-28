"use strict";

//Update filters selected option on UI using query params in the URL
function UpdateFiltersOnUI(url) {
  if (url.includes("?")) {
    let queries = url.split("?")[1].split("&");
    for (let query of queries) {
      const prop = query.split("=")[0];
      const val = query.split("=")[1];
      if (prop === "uploadedAt") {
        //special case for date filters, (handling both range and exact)
        if (val.includes(":")) {
          //range date filter is active
          $("#date option[value='range']").attr("selected", "selected");
          $("#startDate").val(val.split(":")[0]);
          $("#endDate").val(val.split(":")[1]);
        } else {
          //exact match date is active
          $("#date option[value='exact']").attr("selected", "selected");
          $("#startDate").val(val);
          $("#endDate").hide();
        }
      } else {
        $("#" + prop + " option[value='" + val + "']").attr("selected", "selected");
      }
    }
    $(".selectpicker").selectpicker("refresh");
  }
}

function searchProposals() {
  const searchInput = $("#search-input").val();
  $(".proposal").each(function (i, obj) {
    const proposalTitle = $(this).find('a[name="fileName"]').first().html();
    let display = obj.style.display;
    if (searchInput && !proposalTitle.toLowerCase().includes(searchInput.toLowerCase())) {
      display = "none";
    }
    if (!searchInput) {
      display = "block";
    }
    obj.style.display = display;
  });
}

function attachKeyValuesToURL(key, value, url) {
  const filterProperties = {};
  if (url.includes("?")) {
    // case when there are already some active filters
    let queries = url.split("?")[1].split("&");
    for (let query of queries) {
      const prop = query.split("=")[0];
      const val = query.split("=")[1];
      filterProperties[prop] = val;
    }
    filterProperties[key] = value; //override value of filter even if it already exists in query params
    // Attach the active filters to query string in url
    url = url.split("?")[0] + "?";
    for (const prop in filterProperties) {
      //add filter only if All is not selected
      if (!filterProperties[prop].includes("All")) {
        url += prop + "=" + filterProperties[prop] + "&";
      }
    }
    url = url.slice(0, -1); //remove the extra '&' at the end
  } else {
    //case when query params is null
    if (!value.includes("All")) {
      url += "?" + key + "=" + value;
    }
  }
  return url;
}

// once filters have been created, make each filter interdependent
function linkFilters() {
  $("#filters .selectpicker").each(function () {
    if ($(this).attr("id") !== "date") {
      $(this).on("change", function () {
        let url = window.location.href;
        const property = $(this).attr("id");
        const value = $(this).find("option:selected").attr("value");
        window.location = attachKeyValuesToURL(property, value, url);
      });
    }
  });
}

function goToPage(pageNo) {
  let url = window.location.href;
  window.location = attachKeyValuesToURL("page", pageNo, url);
}

$("select[id$=date]").on("change", function () {
  const value = $(this).find("option:selected").attr("value");
  const dateAttribute = $(this).attr("id").split("-")[0];
  const url = window.location.href;
  if (value === "exact") {
    $(`#${dateAttribute}-startDate`).show();
    $(`#${dateAttribute}-endDate`).hide();
    if ($(`#${dateAttribute}-startDate`).val()) {
      window.location = attachKeyValuesToURL(
        dateAttribute,
        $(`#${dateAttribute}-startDate`).val(),
        url
      );
    }
  } else if (value === "range") {
    $(`#${dateAttribute}-startDate`).show();
    $(`#${dateAttribute}-endDate`).show();
    if ($(`#${dateAttribute}-startDate`).val() && $(`#${dateAttribute}-endDate`).val()) {
      window.location = attachKeyValuesToURL(
        dateAttribute,
        $(`#${dateAttribute}-startDate`).val() + ":" + $(`#${dateAttribute}-endDate`).val(),
        url
      );
    }
  }
});

function pickDate(dateAttribute) {
  const filterType = $(`#${dateAttribute}-date`).val();
  const startDate = $(`#${dateAttribute}-startDate`).val();
  const endDate = $(`#${dateAttribute}-endDate`).val();
  const url = window.location.href;
  if (filterType === "range" && startDate && endDate) {
    window.location = attachKeyValuesToURL(dateAttribute, startDate + ":" + endDate, url);
  } else if (filterType === "exact" && startDate) {
    window.location = attachKeyValuesToURL(dateAttribute, startDate, url);
  }
  //case for resetting date filters
  else if (
    (filterType === "exact" && !startDate) ||
    (filterType === "range" && !startDate && !endDate)
  ) {
    window.location = attachKeyValuesToURL(dateAttribute, "All", url);
  }
}

$(document).ready(function () {
  linkFilters();
  UpdateFiltersOnUI(window.location.href);
});
