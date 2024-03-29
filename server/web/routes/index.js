'use strict';
const Config = require('../../../config');
const PermissionConfigTable = require('../../permission-config.json');
const DefaultScopes = require('../../helper/getRoleNames');

const register = function (server, options) {

  server.route({
    method: 'GET',
    path: '/',
    options: {
      auth: {
        mode: 'try',
        strategies: ['session']        
        //scope: PermissionConfigTable.GET['/'] || DefaultScopes
      }      
    },
    handler: function (request, h) {      
      let user = null;
      if (request.auth.isAuthenticated) {
        user = request.auth.credentials.user;
      }
      return h.view('index/index', {
        user,
        projectName: Config.get('/projectName'),
        title: 'Home',
        baseUrl: Config.get('/baseUrl')
      });
    }
  });
};

module.exports = {
  name: 'home',
  dependencies: [
    'hapi-anchor-model',
    'auth'
  ],
  register
};
