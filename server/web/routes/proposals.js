"use strict";
const Boom = require("boom");
const Config = require("../../../config");
const Proposal = require("../../models/proposal");
const User = require("../../models/user");
const Feedback = require("../../models/feedback");
const ObjectId = require("mongodb").ObjectID;
const AWS = require('aws-sdk');
const PDFParse = require('pdf-parse');

const register = function (server, options) {
  server.route({
    method: "GET",
    path: "/proposals/review/{proposalId}/{reviewerId?}",
    options: {
      auth: {
        strategies: ["session"],
        scope: ["reviewer", "root", "chair"],
      },
    },
    handler: async function (request, h) {
      const user = request.auth.credentials.user;
      const proposalId = request.params.proposalId;
      const proposal = await Proposal.lookupById(proposalId, Proposal.lookups);
      let parsedInfo;
      let applicationId;
      let applicantName;
      let projectTitle;

      const feedback = await Feedback.findOne({
        proposalId: proposalId.toString(),
        userId: user._id.toString(),
      });

      try {
        const fileStream = await getObjectFromS3(proposal.fileName);        
        parsedInfo = await parseProposal(fileStream);        
        applicationId = parsedInfo['applicationId'];
        applicantName = parsedInfo['applicantName'];
        projectTitle = parsedInfo['projectTitle'];
      } 
      catch (err) {              
        throw Boom.badRequest('Unable to parse proposal file because ' + err.message);
      }

      const keysToRemove = ['applicationId', 'applicantName', 'projectTitle'];
      for (const key of keysToRemove) {
        delete parsedInfo[key];  
      }      
      for (const key in parsedInfo) {
        if (key === 'details' && parsedInfo[key]) {
          const subTitles = ['Background and Rationale', 'Specific Aims', 'Methods', 'Sample Size Calculations'];
          let text = parsedInfo[key];
          parsedInfo[key] = {};         
          for (let i=0; i<subTitles.length; ++i) {
            if (i !== subTitles.length-1) {
              parsedInfo[key][subTitles[i]] = (text.split(subTitles[i])[1]).split(subTitles[i+1])[0];  
            }
            else {
              parsedInfo[key][subTitles[i]] = text.split(subTitles[i])[1]; 
            }
          }          
        }
        else if (parsedInfo[key]) {
          parsedInfo[key] = parsedInfo[key].split('\n');           
        }       
      }
      
      return h.view("proposals/review", {
        user: request.auth.credentials.user,
        projectName: Config.get("/projectName"),
        title: "Reviewer Upload",
        baseUrl: Config.get("/baseUrl"),
        proposal,
        feedback,
        parsedInfo,
        applicationId,
        applicantName,
        projectTitle,
        reviewedDateString: feedback ? feedback.createdAt.toString() : null,
        isReviewed: feedback ? true : false,
      });
    },
  });

  server.route({
    method: "GET",
    path: "/proposals/upload",
    options: {
      auth: {
        strategies: ["session"],
        scope: ["coordinator", "root"],
      },
    },
    handler: async function (request, h) {
      const user = request.auth.credentials.user;
      const proposals = await Proposal.lookup({}, Proposal.lookups);

      return h.view("proposals/reviewer-upload", {
        user: request.auth.credentials.user,
        projectName: Config.get("/projectName"),
        title: "Reviewer Upload",
        baseUrl: Config.get("/baseUrl"),
        proposals,
      });
    },
  });

  server.route({
    method: "GET",
    path: "/proposals/submissions",
    options: {
      auth: {
        strategies: ["session"],
        scope: ["coordinator", "root", "reviewer", "chair"],
      },
    },
    handler: async function (request, h) {
      const user = request.auth.credentials.user;
      let sort = { createdAt: -1 };
      let limit = null;
      let page = 1;
      const pages = [];

      // if there is a date filter
      if ("uploadedAt" in request.query) {
        let start;
        let end;
        if (request.query["uploadedAt"].includes(":")) {
          start = new Date(
            request.query["uploadedAt"].split(":")[0]
          ).toISOString();
          end = new Date(
            request.query["uploadedAt"].split(":")[1]
          ).toISOString();
        } else {
          const date = new Date(request.query["uploadedAt"]);
          start = date.toISOString();
          end = new Date(date.setDate(date.getDate() + 1)).toISOString();
        }

        request.query["$and"] = [
          { createdAt: { $gte: new Date(start) } },
          { createdAt: { $lt: new Date(end) } },
        ];
        delete request.query.uploadedAt;
      }

      // if there is a sort filter
      if ("sort" in request.query) {
        sort = {};
        const sortKey = request.query["sort"].split(":")[0];
        const value = request.query["sort"].split(":")[1];
        sort[sortKey] = Number(value);
        delete request.query.sort;
      }

      // if there is page limit
      if ("limit" in request.query) {
        limit = Number(request.query["limit"]);
        delete request.query.limit;
      } else {
        limit = 50;
      }

      // if there is page num
      if ("page" in request.query) {
        page = Number(request.query["page"]);
        delete request.query.page;
      }

      const options = {
        collation: { locale: "en" },
        sort,
      };

      let reviewers;
      if (user.roles.reviewer) { //get proposals that are assigned to the reviwer        
        request.query.reviewerIds = user._id.toString(); 
      }

      if (user.roles.chair) { //get proposals with feasibility status of approved when user is chair        
        request.query.feasibilityStatus = 'Feasibility Checked'; 
        //get list of all available reviewers to be assigned a proposal
        reviewers = await User.find({roles : {reviewer: true}});
      }

      const result = await Proposal.pagedLookup(
        request.query,
        page,
        limit,
        options,
        Proposal.lookups
      );


      //attach list of full reviewers object to proposals 
      for (const proposal of result.data) {
        proposal.assignedReviewers = [];
        for (const id of proposal.reviewerIds) {
          const reviewer = await User.findById(id);
          proposal.assignedReviewers.push(reviewer);
        }
      }

      //logic for hasfeeback need to change here
      for (const proposal of result.data) {
        const feedbackCnt = await Feedback.count({
          proposalId: proposal._id.toString(),
          userId: user._id.toString(),
        });
        proposal.hasFeedback = feedbackCnt > 0;
      }

      return h.view("proposals/submissions-list", {
        user,
        projectName: Config.get("/projectName"),
        title: "Feasibility Check",
        proposals: result.data, // submissions
        hasNext: result.pages.hasNext,
        hasPrev: result.pages.hasPrev,
        next: result.pages.next,
        prev: result.pages.prev,
        currentPage: result.pages.current,
        totalNumPages: result.pages.total,
        total: result.items.total,
        notDatatableView: true,
        reviewers        
      });
    },
  });
};

async function parseProposal(fileStream) { 
  
  return new Promise((resolve, reject) => { 
    PDFParse(fileStream).then(function(data) {       
      const parsedInfo = Proposal.parse(data.text, data.numpages);     
      resolve(parsedInfo);               
    })
    .catch(function(error){
      reject(error);
    });     
  });
}

async function getObjectFromS3(fileName) {

  const s3 = new AWS.S3({
    accessKeyId: Config.get('/S3/accessKeyId'),
    secretAccessKey: Config.get('/S3/secretAccessKey')
  });
  
  const params = {
    Bucket: Config.get('/S3/bucketName'),
    Key: fileName
  };

  return new Promise((resolve, reject) => {    
    s3.getObject(params, (s3Err, data) => {          
      if (s3Err) {        
        reject(s3Err);      
      }
      else {        
        resolve(data.Body);  
      }   
    });  
  });  
}


module.exports = {
  name: "proposal",
  dependencies: ["auth", "hapi-anchor-model"],
  register,
};
