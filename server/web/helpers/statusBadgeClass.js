"use strict";

module.exports = (status, prefix) => {
  if (status === "Revise Requested" || status === "Reject") {
    return prefix + "-danger";
  } else if (status === "Feasibility Checked" || status === "Approve") {
    return prefix + "-success";
  } else if (status === "Revise") {
    return prefix + "-warning";
  }
  return prefix + "-info";
};
