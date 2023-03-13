'use strict';
const Boom = require('boom');
const Proposal = require('../models/proposal');
const Feedback = require('../models/feedback');
const User = require('../models/user');
const Mailer = require('../mailer');
const Config = require('../../config');
var addDays = require('date-fns/addDays')
var format = require('date-fns/format')

const register = function (server, options) {  

  server.route({
    method: 'POST',
    path: '/api/email/',
    options: {
      auth: {
        strategies: ['simple', 'session'],
        scope: ['reviewer', 'root', 'coordinator', 'chair']
      }      
    },      
    handler: async function (request, h) {
    
      let template = request.payload.templateName;
      let subject;  
      let emailOptions;         
      let emailTemplateData;
      
      /*
        Case for when Chair assigns reviewers to a proposal. Emails are sent to all selected reviewers
      */
        if(template === 'reviewers-to-review-proposal'){
            subject = 'You have been assigned to review a proposal';
            const proposalDoc = await Proposal.findById(request.payload.proposalId); 
            const reviewerIds = proposalDoc.reviewerIds;
            var reviewerEmails = [];
            for(let id in reviewerIds){
                const reviewer = await User.findById(reviewerIds[id]);
                reviewerEmails.push(reviewer.email);
            }
            const today = new Date();
            const laterDate = addDays(today, 28);
            const daysAfter = format(laterDate, 'MM/dd/yyyy');
            emailOptions = {
                subject: subject,
                to: {
                    address: reviewerEmails
                },
                cc: Config.get('/EmailList/ccAddress')
            };
            emailTemplateData = {
                fileName: proposalDoc.fileName, // only a single file name
                daysAfter: daysAfter.toString()
            };
        }
      
      /*
        Case for when Chair finalizes decision for a proposal. Not done. Feature not implemented yet
      */ 
        
        if(template === 'chair-finalized-decision'){
            subject = 'BROC Chair has finalized decision';
            emailOptions = {
                subject: subject,
                to: {
                    address: Config.get('/EmailList/relevantPeople')
                },
                cc: Config.get('/EmailList/ccAddress')
            };
            emailTemplateData = {
                fileName: request.payload.fileName, // only a single file name
                finalizedReviewStatus: request.payload.finalizedReviewStatus, // get from proposal model
                additionalComments: request.payload.additionalComments, // get from proposal model
            };
        }

      /*
        Case for when all reviewers has submit their reviews. Emails sent to BROC Chair
       */
        if(template === 'all-reviews-submitted'){
            const proposalId = request.payload.proposalId
            const feedbackDocs = await Feedback.find({proposalId: proposalId});
            const feedbackCount = feedbackDocs.length;
            const proposalDoc = await Proposal.findById(proposalId);
            const reviewerCount = proposalDoc.reviewerIds.length;
            let approveCount = 0;
            let revisionCount = 0;
            let rejectCount = 0;
            let abstentionCount = 0;
            let COICount = 0;
            
            //getting email of all BROC Chairs
            const chairEmail = [];
            const chairs = await User.find({'roles.chair': true});
            chairs.forEach(element => {
                const email = element.email;
                chairEmail.push(email);
            });
            // if both proposalDoc and reviewerCount are the same, then all reviewers has submitted a feedback. Send email
            if(feedbackCount === reviewerCount){
                subject = 'All Reviewers Submitted Their Reviews';
                emailOptions = {
                    subject: subject,
                    to: {
                        address: chairEmail
                    },
                    cc: Config.get('/EmailList/ccAddress')
                };

                for(let feedback in feedbackDocs){
                    switch(feedbackDocs[feedback].decisionTag){
                        case 'Approve':
                            approveCount++;
                            break;
                        case 'Revision':
                            revisionCount++;
                            break;
                        case 'Reject':
                            rejectCount++;
                            break;
                        case 'Abstention':
                            abstentionCount++;
                            break;
                        case 'Conflict of interest':
                            COICount++;
                            break;
                    }
                }

                emailTemplateData = {
                    fileName: proposalDoc.fileName, // only a single file name
                    approveCount,
                    revisionCount,
                    rejectCount,
                    abstentionCount,
                    COICount
                };
            }else{
                return 0; 
            }
            
        }
      
      /*
        Case for when a file is uploaded by coordinator
      */
        if(template === 'proposal-upload'){
            const filesNames = request.payload.fileNames;
            subject = 'New proposal has been uploaded';
            const fileNameStr = filesNames.join(', ');
            emailOptions = {
                subject: subject,
                to: {
                    address: Config.get('/EmailList/proposalUpload')
                },
                cc: Config.get('/EmailList/ccAddress')
            };
            emailTemplateData = {
                'fileNames': fileNameStr
            };
        }

        try{
            await Mailer.sendEmail(emailOptions, template, emailTemplateData);
        }catch (err) {
            request.log(['mailer', 'error'], err);
        }     

      return ({ message: 'Success'});      
    }
  });   
};

module.exports = {
  name: 'emailAPI',
  dependencies: [
    'hapi-anchor-model',
    'auth'
  ],
  register
};