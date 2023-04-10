/*
  Plan to make it work:
  1 - Make the setInterval to run every 24 hours.
  2 - Everytime it triggers, make queries to find out which proposal/feedback needs a reminder
  3 - All information can be found within the models
  4 - Trigger the email API or use nodemailer from here 
*/

'use strict';
const Config = require('../config');
const Mailer = require('./mailer');
const Proposal = require('./models/proposal');
const User = require('./models/user');
const Feedback = require('./models/feedback');
var addDays = require('date-fns/addDays');
var format = require('date-fns/format');

const register = async function (server, options) { 

  const delay = 24 * 60 * 60 * 1000; //24 hours to miliseconds  
  setInterval(async () => {
    await sendEmailNotification(); 
  }, delay); 

};

async function sendEmailNotification(){
  const today = new Date();
  /*
    Coordinator to update feasibility status of a proposal
    Only proposal with feasibility status of 'Pending'
    Send to: Coordinators
  */
  let proposalReminderPayload = [];
  const pendingProposals = await Proposal.find({feasibilityStatus: 'Pending'});
  pendingProposals.forEach(proposal => {
    const uploadTime = new Date(proposal.createdAt);
    if(uploadTime.getDay() === today.getDay() && uploadTime.getDate() !== today.getDate()){ // 7 days has been added since the last email/proposal was uploaded
      const payload = {
        templateName: 'reminder-proposal-upload',
        fileName: proposal.fileName,
        proposalId: proposal._id
      }
      proposalReminderPayload.push(payload);
    }
  });
  
  
  /*
    BROC Chair reminded to assign reviewers for proposal with status of 'Feasibility Checked'
    Send to: Chairs
  */
  const doc = await Proposal.find({feasibilityStatus: 'Feasibility Checked', reviewerIds: []});
  doc.forEach(proposal => {
    const uploadTime = new Date(proposal.createdAt);
    if(uploadTime.getDay() === today.getDay() && uploadTime.getDate() !== today.getDate()){
      const payload = {
        templateName: 'reminder-assign-reviewer',
        fileName: proposal.fileName,
        proposalId: proposal._id
      }
      proposalReminderPayload.push(payload);
    }
  });

  /*
    Reviewers reminded to review the proposals they're assigned to
    Send to: Assigned Reviewers
  */
  const reviewerProposal = await Proposal.find({feasibilityStatus: 'Feasibility Checked', reviewerIds: { $ne: [] }}); // get proposal that needs feedback from reviewer
  for(const proposal of reviewerProposal){
    const feedbackCount = await Feedback.count({proposalId: String(proposal._id)});
    const uploadTime = new Date(proposal.createdAt);
    const dueDate = format(addDays(uploadTime, 7), 'MM/dd/yyyy');
    if((proposal.reviewerIds.length !== feedbackCount) && (uploadTime.getDay() === today.getDay() && uploadTime.getDate() !== today.getDate())){ // some reviewers hasn't submitted a review
      const payload = {
        templateName: 'reminder-reviewers-review-proposals',
        fileName: proposal.fileName,
        proposalId: proposal._id,
        reviewDueDate: dueDate
      }
      proposalReminderPayload.push(payload);
    }
  }
  
  /*
    BROC Chair to finalize a decision for a proposal
    Send to: BROC Chair
  */
    const proposalDoc = await Proposal.find({reviewStatus: null, feasibilityStatus: 'Feasibility Checked', reviewerIds: { $ne: [] }}); 
      for(const proposal of proposalDoc){
        // email only sent out if the proposal has feedback from all reviewers
        const feedbackCount = await Feedback.count({proposalId: String(proposal._id)});
        const numOfReviewers = proposal.reviewerIds.length;
        const uploadTime = new Date(proposal.createdAt);
        if(feedbackCount === numOfReviewers && uploadTime.getDay() === today.getDay() && uploadTime.getDate() !== today.getDate()){
          const payload = {
            templateName: 'reminder-chair-make-final-decision',
            fileName: proposal.fileName,
            proposalId: proposal._id
          }
          proposalReminderPayload.push(payload);
        }
    }  

    for(const payload of proposalReminderPayload){
      sendMail(payload);     
      await new Promise(r => setTimeout(r, 1000)); //1 second sleep between sending files to avoid SMTP temporary block error
    }
    
}



async function sendMail(data){
  const template = data.templateName;
  let subject;  
  let emailOptions;         
  let emailTemplateData;
  /*
    Reminder email for BROC Chair to make final decision
  */
    if(template === 'reminder-chair-make-final-decision'){
      const fileName =  data.fileName;
      subject = 'Reminder to finalize a decision for a proposal';
      const chairEmail = [];
      const chairs = await User.find({'roles.chair': true});
      chairs.forEach(element => {
          const email = element.email;
          chairEmail.push(email);
      });
      emailOptions = {
          subject: subject,
          to: {
              address: chairEmail
          },
          cc: Config.get('/EmailList/ccAddress')
      };
      emailTemplateData = {
        fileName,
        loginURL: Config.get('/baseUrl') + 'login'
      }
    }

  /*
    Reminder for BROC Chair to assign reviewers to proposal with status 'Feasibility Checked' 
  */
    if(template === 'reminder-assign-reviewer'){
      const fileName =  data.fileName;
      subject = 'Reminder to assign reviewers to a propsal'
      const chairEmail = [];
      const chairs = await User.find({'roles.chair': true});
      chairs.forEach(element => {
          const email = element.email;
          chairEmail.push(email);
      });
      emailOptions = {
          subject: subject,
          to: {
              address: chairEmail
          },
          cc: Config.get('/EmailList/ccAddress')
      };
      emailTemplateData = {
        fileName,
        loginURL: Config.get('/baseUrl') + 'login'
      }
    }


  /*
    Reminder to Coordinator to update feasibility status of a proposal
  */
    if(template === 'reminder-proposal-upload'){
      const fileName =  data.fileName;
      subject = 'Reminder to update feasibility status for a proposal';
      const coordinatorEmail = [];
      const coordinators = await User.find({'roles.coordinator': true});
      coordinators.forEach(element => {
          const email = element.email;
          coordinatorEmail.push(email);
      });
      emailOptions = {
          subject: subject,
          to: {
              address: coordinatorEmail
          },
          cc: Config.get('/EmailList/ccAddress')
      };
      emailTemplateData = {
        fileName
      }
    }

  /*
    Reminder to Reviewers to submit a review of a proposal that they're assigned to
  */
    if(template === 'reminder-reviewers-review-proposals'){
      
      const fileName = data.fileName;
      const proposalId = data.proposalId;
      subject = 'Reminder to submit feedback to a proposal';
      const proposal = await Proposal.findById(proposalId);
      const reviewerIds = proposal.reviewerIds;
      let reviewerEmail = [];
      // get reviewerIds. For each of the Id, check if their feedback is there if not send email
      for(const reviewerId of reviewerIds){
        const query = {proposalId: proposalId, userId: reviewerId}
        const feedback = await Feedback.find(query);
        
        if(feedback.length === 0){ // no feedback. send email to reviewer
          const user = await User.findById(reviewerId);
          reviewerEmail.push(user.email);
        }
        
      }
      emailOptions = {
        subject: subject,
        to: {
            address: reviewerEmail
        },
        cc: Config.get('/EmailList/ccAddress')
      };
      emailTemplateData = {
        fileName,
        dueDate: data.reviewDueDate,
        loginURL: Config.get('/baseUrl') + 'login'
      }
    }




  try{
      await Mailer.sendEmail(emailOptions, template, emailTemplateData);
  }catch (err) {
      console.log(['mailer', 'error'], err);
  }
}
  
module.exports = {
  name: 'weekly-email-notification',  
  register
};

exports.register = register;