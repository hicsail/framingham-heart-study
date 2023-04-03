'use strict';
const Confidence = require('confidence');
const Dotenv = require('dotenv');


Dotenv.config({ silent: true });

const criteria = {
  env: process.env.NODE_ENV
};


const config = {
  $meta: 'This file configures the plot device.',
  projectName: {
    $filter: 'env',
    production: process.env.PROJECT_NAME,
    test: 'Anchor-Test',
    local: process.env.PROJECT_NAME,
    $default: 'FHS'
  },
  baseUrl: {
    $filter: 'env',
    production: process.env.BASE_URL,
    test: 'localhost:9090',
    local: process.env.BASE_URL,
    $default: 'http://localhost:9000/'
  },
  port: {
    web: {
      $filter: 'env',
      test: 9090,
      production: process.env.PORT,
      local: process.env.PORT,
      $default: 9000
    }
  },
  authAttempts: {
    forIp: 200,
    forIpAndUser: 200
  },
  authSecret: {
    $filter: 'env',
    production: process.env.AUTH_SECRET,
    local: process.env.AUTH_SECRET,
    $default: '!k3yb04rdK4tz~4qu4~k3yb04rdd0gz!'
  },  
  hapiAnchorModel: {
    mongodb: {
      connection: {
        uri: {
          $filter: 'env',
          production: process.env.MONGODB_URI,
          $default: 'mongodb://localhost:27017/'
        },
        db: {
          $filter: 'env',
          production: process.env.MONGODB_DB_NAME,
          test: 'anchor-test',
          $default: 'fhs'
        }
      }
    },
    autoIndex: true
  },
  nodemailer: {
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
      user: process.env.SMTP_USERNAME,
      pass: process.env.SMTP_PASSWORD
    }
  },
  system: {
    fromAddress: {
      name: 'FHS',
      address: 'npdataau@bu.edu'//'bwhs2021@yahoo.com'
    },
    toAddress: {
      name: 'BWHS',
      address: 'jolij8147@gmail.com'
    }
  },  
  passwordComplexity: {
    min: 6,
    max: 32,
    lowerCase: 1,
    upperCase: 1,
    numeric: 1,
    symbol: 1,
    requirementCount: 3
  },
  roles:[    
    {
      name: 'coordinator',
      accessLevel: '2'
    },
    {
      name: 'root',
      accessLevel: '4'
    },
    {
      name: 'reviewer',
      accessLevel: '1'
    },
    {
      name: 'chair',
      accessLevel: '3'
    },
  ],
  S3: {
    bucketName: {
      $filter: 'env',
      production: process.env.BUCKET_NAME,
      local: process.env.BUCKET_NAME,     
      $default: 'fhs-broc'
    },
    accessKeyId: {
      $filter: 'env',
      production: process.env.S3_ACCESS_KEY_ID, 
      local: process.env.S3_ACCESS_KEY_ID,     
      $default: ''
    },
    secretAccessKey: {
      $filter: 'env',
      production: process.env.S3_SECRET_ACCESS_KEY, 
      local: process.env.S3_SECRET_ACCESS_KEY,     
      $default: ''
    }    
  },
  EmailList: {
    proposalUpload: ['tdstein@bu.edu','amckee@bu.edu'],
    relevantPeople: ['harruda@bu.edu'],
    ccAddress: ['npdataau@bu.edu']
  }
};



const store = new Confidence.Store(config);


exports.get = function (key) {

  return store.get(key, criteria);
};


exports.meta = function (key) {

  return store.meta(key, criteria);
};
