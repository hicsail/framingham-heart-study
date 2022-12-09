'use strict';
const Assert = require('assert');
const Crypto = require('../crypto');
const GroupAdmin = require('./group-admin');
const Joi = require('joi');
const Hoek = require('hoek');
const AnchorModel = require('../anchor/anchor-model');
const Config = require('../../config');

const getRolesValidator = function () {

  const roles = {};

  Config.get('/roles').forEach((role) => {

    if (role.type === 'groupAdmin') {
      roles[role.name] = GroupAdmin.schema;
    }
    else {
      roles[role.name] = Joi.boolean();
    }
  });
  return roles;
};

class User extends AnchorModel {
  static async generatePasswordHash(password) {

    Assert.ok(password, 'Missing pasword arugment.');
    const salt = await Crypto.genSalt(10);
    const hash = await Crypto.hash(password,salt);

    return { password, hash };
  }

  static async create(name, email, password) {
    
    Assert.ok(password, 'Missing pasword arugment.');
    Assert.ok(email, 'Missing email arugment.');
    Assert.ok(name, 'Missing name arugment.');

    const self = this;

    const passwordHash = await this.generatePasswordHash(password);
    const document =  new this({           
      password: passwordHash.hash,
      email: email.toLowerCase(),
      name,
      roles: {},      
      timeCreated: new Date()
    });

    const users = await self.insertOne(document);

    users[0].password = passwordHash.password;

    return users[0];
  }

  static async findByCredentials(email, password) {

    const self = this;

    Assert.ok(email,'Missing email argument.');
    Assert.ok(password,'Missing password argument.');

    const query = {};

    if (email.indexOf('@') > -1) {
      query.email = email;
    }

    const user = await self.findOne(query);

    if (!user) {
      return;
    }

    const passwordMatch = await Crypto.compare(password,user.password);

    if (passwordMatch) {
      return user;
    }
  }  

  static async findByEmail(email) {

    Assert.ok(email, 'Misisng email argument.');

    const query = { email: email.toLowerCase() };

    return await this.findOne(query);
  }

  static highestRole(roles) {

    let maxAccessLevel = 0;
    const roleDict = {};

    Config.get('/roles').forEach((roleObj) => {

      roleDict[roleObj.name] = roleObj.accessLevel;
    });

    for (const role in roles) {

      if (roleDict[role] >= maxAccessLevel) {
        maxAccessLevel = roleDict[role];
      }
    }

    return maxAccessLevel;
  }

  constructor(attrs) {

    super(attrs);

    Object.defineProperty(this, '_roles', {
      writable: true,
      enumerable: false
    });
  }

  static PHI() {

    return ['username', 'password', 'name', 'email'];
  }
}


User.collectionName = 'users';


User.schema = Joi.object({
  _id: Joi.object(),  
  password: Joi.string(),
  name: Joi.string(),  
  email: Joi.string().email().lowercase().required(),
  roles: Joi.object(getRolesValidator()),
  resetPassword: Joi.object({
    token: Joi.string().required(),
    expires: Joi.date().required()
  }),
  timeCreated: Joi.date()
});

User.payload = Joi.object({  
  password: Joi.string().required(),
  email: Joi.string().email().lowercase().required(),
  name: Joi.string().required()
});

User.routes = Hoek.applyToDefaults(AnchorModel.routes, {  
  create: {
    disabled: true
  },
  update: {
    disabled: true
  },
  getMy: {
    disabled: true
  },
  delete:{
    disabled: true
  },
  insertMany: {
    payload: User.payload
  },
  tableView: {
    disabled: true
  },
  createView: {
    disabled: true
  },
  editView: {
    disabled: true
  }
});

User.indexes = [  
  { key: { email: 1, unique: 1 } }
];

module.exports = User;
