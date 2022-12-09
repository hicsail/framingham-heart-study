'use strict';
const Assert = require('assert');
const Config = require('../../config');
const Joi = require('joi');
const AnchorModel = require('../anchor/anchor-model');
const UserAgent = require('useragent');
const Hoek = require('hoek');

class AuthAttempt extends AnchorModel {

  static async create(ip, email, userAgent) {

    Assert.ok(ip, 'Missing ip argument.');
    Assert.ok(email, 'Missing email argument.');
    Assert.ok(userAgent, 'Missing userAgent argument.');

    const agentInfo = UserAgent.lookup(userAgent);
    const browser = agentInfo.family;

    const document = new this({
      browser,
      ip,
      os: agentInfo.os.toString(),
      email
    });

    const authAttempts = await this.insertOne(document);

    return authAttempts[0];
  }

  static async abuseDetected(ip, email) {

    Assert.ok(ip, 'Missing ip argument.');
    Assert.ok(email, 'Missing email argument.');

    const [countByIp, countByIpAndUser] = await Promise.all([
      this.count({ ip }),
      this.count({ ip, email })
    ]);

    const config = Config.get('/authAttempts');
    const ipLimitReached = countByIp >= config.forIp;
    const ipUserLimitReached = countByIpAndUser >= config.forIpAndUser;

    return ipLimitReached || ipUserLimitReached;
  }
}


AuthAttempt.collectionName = 'authAttempts';

AuthAttempt.schema = Joi.object({
  _id: Joi.object(),
  browser: Joi.string(),
  ip: Joi.string().required(),
  os: Joi.string().required(),
  email: Joi.string().email().required(),
  createdAt: Joi.date().default(new Date(), 'time of creation')
});

AuthAttempt.routes = Hoek.applyToDefaults(AnchorModel.routes, {
  create: {
    disabled: true
  },
  update: Joi.object({
    username: Joi.string().lowercase().required()
  }),
  tableView: {
    outputDataFields: {
      email: { label: 'Email' },
      ip: { label: 'IP' },
      createdAt: { label: 'Time' },
      _id: { label: 'ID', accessRoles: ['admin', 'researcher','root'], invisible: true },
      os: { label: 'OS', invisible: true },
      browser: { label: 'browser', invisible: true }

    }
  },
  createView: {
    disabled: true
  },
  editView: {
    editSchema: Joi.object({
      username: Joi.string().lowercase().required()
    })
  }
});

AuthAttempt.lookups = [];

AuthAttempt.indexes = [
  { key: { ip: 1, email: 1 } },
  { key: { email: 1 } }
];

module.exports = AuthAttempt;
