'use strict';
const Boom = require('boom');
const Proposal = require('../models/proposal')
const AWS = require('aws-sdk');
const Config = require('../../config');

const register = function (server, options) {
    server.route({
        method: 'POST',
        path: '/api/S3/saveFilesToBucket',
        options: {
            auth: {
                strategies: ['simple', 'session']        
            },
            payload: {
                output: 'stream',
                parse: true,
                maxBytes: 1000000*1024*1024
            },
            pre: [
              {
                assign: 'fileNameIsUnique',
                method: async function (request, h) {
      
                  const fileName = request.payload.file.hapi.filename;
                  const files = await Proposal.find({name: fileName});
                  console.log('name of file is: ', fileName);
                  if (files.length > 0) {  
                    return false; //since this api is supposed to be followed by another ajax api call, we return any way
                  }
                  else {
                    return true;
                  }      
                }
              }
            ]
        },
        handler: async function (request, h) {
         
          if (!request.pre.fileNameIsUnique) {
            return {'success': false, 'fileName': ''};
          }  
            const fileStream = request.payload.file;
            const fileName = fileStream.hapi.filename;
            const bucketName = Config.get('/S3/bucketName');
            try {
                await uploadToS3(fileStream, fileName, bucketName);        
              } 
              catch (err) {       
                throw Boom.badRequest('Unable to upload file because ' + err.message);
              }
              return {'success': true, 'fileName': fileName};
        }
    });

    server.route({
      method: 'GET',
      path: '/api/S3/getObject/{fileName}',
      options: {
        auth: {
          strategies: ['simple', 'session']        
        }             
      },      
      handler: async function (request, h) {      
  
        let fileStream;
        const fileName = request.params.fileName;
        const bucketName = Config.get('/S3/bucketName'); 
        
        try {
          fileStream = await getObjectFromS3(fileName, bucketName);             
        } 
        catch (err) {        
          throw Boom.badRequest('Unable to download file because ' + err.message);
        }
        
        return h.response(fileStream)
          .header('Content-Type', 'application/json')
          .header('Content-Disposition', 'attachment;');   
      }
    }); 
}

async function getObjectFromS3(fileName, bucketName) {

  const s3 = new AWS.S3({
    accessKeyId: Config.get('/S3/accessKeyId'),
    secretAccessKey: Config.get('/S3/secretAccessKey')
  });
  
  const params = {
    Bucket: bucketName,
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

async function uploadToS3(fileStream, fileName, bucketName) {

    const s3 = new AWS.S3({
      accessKeyId: Config.get('/S3/accessKeyId'),
      secretAccessKey: Config.get('/S3/secretAccessKey')
    });
    
    const params = {
      Bucket: bucketName,
      Key: fileName, 
      Body: fileStream
    };
  
    return new Promise((resolve, reject) => {    
      s3.upload(params, (s3Err, data) => {      
        if (s3Err) {        
          reject(s3Err);      
        }
        else {      
          console.log(`File uploaded successfully at ${data.Location}`);
          resolve(`${data.Location}`);  
        }   
      });  
    });  
  }

  module.exports = {
    name: 'proposalFileUpload',
    dependencies: [
      'hapi-anchor-model',
      'auth'
    ],
    register
  };