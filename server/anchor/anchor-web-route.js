'use strict';
const Boom = require('boom');
const Config = require('../../config');
const IsAllowed = require('../helper/isAllowed');
const JoiToJson = require('../helper/joiToJson');

const register = function (server, serverOptions) {

  server.route({
    method: 'GET',
    path: '/{collectionName}',
    options: {
      auth: {
        strategies: ['session']
      },
      pre: [{
        assign: 'model',
        method: async function (request,h) {

          const model = server.plugins['hapi-anchor-model'].models[request.params.collectionName];

          if (!model) {
            throw Boom.notFound('Model not found');
          }

          return await model;
        }
      }, {
        assign: 'enabled',
        method: function (request,h) {

          const model = request.pre.model;          
          if (model.routes.tableView.disabled) {
            throw Boom.forbidden('Route Disabled');
          }
          return h.continue;
        }
      }, {
        assign: 'auth',
        method: function (request,h) {

          const model = request.pre.model;

          if (model.routes.tableView.scope.length === 0) {
            return h.continue;  
          }
          if (model.routes.tableView.auth) {
            if (!request.auth.isAuthenticated) {
              throw Boom.unauthorized('Authentication Required');
            }
          }
          return h.continue;
        }
      }, {
        assign: 'validateoutputDataFields',
        method: function (request,h) {

          const model = request.pre.model;
          const outputDataFields = model.routes.tableView.outputDataFields;
          const validationSchema = model.routes.tableView.validationSchema;
          //console.log(Object.keys(server.plugins['hapi-anchor-model'].models[request.params.collectionName]))

          if (outputDataFields !== null) {
            for (const field in outputDataFields) {

              const obj = validationSchema.validate(outputDataFields[field]);
              if (obj.error) {
                console.log(obj.error.details[0].message);
                throw Boom.badRequest('outputDataFields violates the validation schema, ' + obj.error.details[0].message);
              }
            }
          }
          return h.continue;
        }
      }, {
        assign: 'scopeCheck',
        method: function (request, h) {

          const scope = request.pre.model.routes.tableView.scope;

          if (scope === 0) {
            return h.continue;  
          }
          const userRoles = request.auth.credentials.scope;
          if (!IsAllowed(userRoles, scope)){
            throw Boom.unauthorized('Insufficient Scope salam');
          }
          return h.continue;
        }
      }
      ] },
    handler: async function (request, h) {

      const model = request.pre.model;
      let apiDataSource = model.routes.tableView.apiDataSourcePath;

      if (apiDataSource === '/api/table/{collectionName}') {
        apiDataSource = '/api/table/' + request.params.collectionName;
      }
      if (request.query) { //attaching query parameters to the api path 
        apiDataSource += '?';
        for (const key in request.query) {
          apiDataSource += key + '=' + request.query[key] + '&';
        }
      }
      apiDataSource = apiDataSource.substring(0, apiDataSource.length - 1); //removing the last '&' char
      
      const req = {
        method: 'GET',
        url: apiDataSource,
        credentials: request.auth.credentials        
      };

      const res = await server.inject(req);
      
      const outputCols = [];
      let outputData = res.result.data;

      if (model.routes.tableView.outputDataFields !== null) {

        const processedData = [];
        const fields = model.routes.tableView.outputDataFields;
        const unAddedKeys = new Set();

        for (const key of Object.keys(fields)){
          const userRoles = request.auth.credentials.scope;
          if (fields[key].accessRoles && !IsAllowed(userRoles, fields[key].accessRoles)){//Blocks column option if user role is too low
            unAddedKeys.add(key);
            continue;
          }

          const col = { 'label': fields[key].label };
          if (fields[key].invisible){
            col.invisible = true;
          }

          outputCols.push(col);
        }

        //modify fields to remove sensitive keys where user permission is too low.
        for (const key of Object.keys(fields)){
          if (unAddedKeys.has(key)){
            delete fields[key];
          }
        }
        
        for (const rec of outputData){
          const doc = {};
          for (const key of Object.keys(fields)) {
            //case when output is a function of a some of the fields (like a link)
            if ('function' in fields[key] && 'arguments' in fields[key]){
              let args = [];
              for (const arg of fields[key]['arguments']) {
                if ('from' in arg) { 
                  args.push(rec[arg['from']][arg['property']]);

                }
                else {
                  args.push(rec[arg['property']]);
                }
              } 
              if (args.includes(undefined)) {
                doc[key] = 'N/A';                
              }
              else {
                doc[key] = fields[key]['function'](...args);
              }                         
            }                      
            else if ('from' in fields[key]){ 
              let innerKey = key;              
              if ('property' in fields[key]) {
                innerKey = fields[key]['property'];// to handle multiple join on the same collection with same keys 
              }
              let val = rec[fields[key].from] ? rec[fields[key].from][innerKey] : 'N/A'; 
              if (innerKey.includes('.')) { //case when there are nested keys for nestes objects 
                let keys = innerKey.split('.');
                val = rec[fields[key].from] ? rec[fields[key].from][keys[0]] : null;              
                let sliced = keys.slice(1);
                for (const item of sliced) {
                  if (!val)  {
                    break;
                  }                
                  val = val[item];
                }                                
              }                       
              if (rec[fields[key].from] && val) {                
                doc[key] = val;                              
              }
              else {
                doc[key] = 'N/A';
              }
            }
            else {
              if (key.includes('.')) { //case when there are nested keys for nestes objects 
                let keys = key.split('.');
                let val = rec[keys[0]] ? rec[keys[0]]: null;              
                let sliced = keys.slice(1);
                for (const item of sliced) {
                  if (!val) {
                    break;
                  }                  
                  val = val[item];
                }
                doc[key] = val ? val : 'N/A';                
              }
              else if (rec[key] === null || typeof rec[key] === 'undefined' && !key.includes('.')){
                doc[key] = 'N/A';
              }
              else {
                doc[key] = rec[key];
              }
            }
          }
          processedData.push(doc);
        }
        
        outputData = processedData;
      }
      else {
        if (outputData.length !== 0 ) {
          //create the column headers for the database
          const modelsName = new Set(); //all the model names joined to this one
          model.lookups.forEach((lookup) => {//find all the secondary model joined.

            modelsName.add(lookup.as);
          });

          for (const key of Object.keys(outputData[0])) {
            if (!(modelsName.has(key))){//makes sure to not include secondary attached collection yet
              outputCols.push({ label: key });
            }
          }

          model.lookups.forEach((lookup) => {//for each model save the label, set invisible and assign where it came from

            recursiveFindJoiKeys(lookup.from.schema).forEach((key) => {

              if (!(key in outputData[0])) {//checks that the key is not already a header.
                outputCols.push({ label: key, invisible: true, from: lookup.as });
              }
            });
          });

          //process data coming from outputData based on the column headers given above.
          const processedData = [];
          outputData.forEach((data) => {

            const doc = {};
            outputCols.forEach((col) => {

              if ('from' in col){
                if (col.label in data[col.from]){
                  doc[col.label] = data[col.from][col.label];
                }
                else {
                  doc[col.label] = 'N/A';
                }
              }
              else {
                if (data[col.label] === null || typeof data[col.label] === 'undefined'){
                  doc[col.label] = 'N/A';
                }
                else {
                  doc[col.label] = data[col.label];
                }
              }
            });
            processedData.push(doc);
          });
          outputData = processedData;
        }
        else {
          for (const key of recursiveFindJoiKeys(model.schema)){
            outputCols.push({ 'label': key });
          }
        }
      }

      outputData.map((dataRow) => {//render function to change default string version of specified types.

        for (const key of Object.keys(dataRow)){
          if (dataRow[key] instanceof Date && !isNaN(dataRow[key])){ //check for JS Date Object.
            dataRow[key] = dataRow[key].toDateString() + ' ' + dataRow[key].toLocaleTimeString('en-us');//DOES NOT HAVE THE TIMEZONE...
          }
        }
      });      
      
      return h.view('anchor-default-templates/index', {
        user: request.auth.credentials.user,
        projectName: Config.get('/projectName'),
        baseUrl: Config.get('/baseUrl'),
        title:  capitalizeFirstLetter(request.params.collectionName),
        collectionName: request.params.collectionName,
        columns: outputCols,
        data: outputData,
        partials: model.routes.tableView.partials
      });
    }
  });

  server.route({//returns the edit view template
    method: 'GET',
    path: '/edit/{collectionName}/{id}',
    options: {
      auth: {
        strategies: ['session']
      },
      pre: [{
        assign: 'model',
        method: async function (request,h) {

          const model = server.plugins['hapi-anchor-model'].models[request.params.collectionName];

          if (!model) {
            throw Boom.notFound('Model not found');
          }

          return await model;
        }
      }, {
        assign: 'enabled',
        method: function (request,h) {

          const model = request.pre.model;
          if (model.routes.editView.disabled) {
            throw Boom.forbidden('Route Disabled');
          }
          return h.continue;
        }
      }, {
        assign: 'auth',
        method: function (request,h) {

          const model = request.pre.model;

          if (model.routes.editView.scope.length === 0) {
            return h.continue;  
          }
          if (model.routes.editView.auth) {
            if (!request.auth.isAuthenticated) {
              throw Boom.unauthorized('Authentication Required');
            }
          }
          return h.continue;
        }
      }, {
        assign: 'scopeCheck',
        method: function (request, h) {

          const model = request.pre.model;
          if (model.routes.editView.scope.length === 0) {
            return h.continue;  
          }
          const userRoles = request.auth.credentials.scope;
          if (!IsAllowed(userRoles, model)){
            throw Boom.unauthorized('Insufficient Scope');
          }
          return h.continue;
        }
      }
      ] },
    handler: async function (request, h) {

      const model = request.pre.model;
      const schema = JoiToJson(model.routes.editView.editSchema);

      const document = await model.findById(request.params.id);


      return h.view('anchor-default-templates/edit', {
        user: request.auth.credentials.user,
        projectName: Config.get('/projectName'),
        baseUrl: Config.get('/baseUrl'),
        title: capitalizeFirstLetter(request.params.collectionName),
        collectionName: request.params.collectionName,
        editSchema: schema,
        doc: document
      });
    }

  });

  server.route({
    method: 'GET',
    path: '/create/{collectionName}',
    options: {
      auth: {
        strategies: ['session']
      },
      pre: [{
        assign: 'model',
        method: async function (request,h) {

          const model = server.plugins['hapi-anchor-model'].models[request.params.collectionName];

          if (!model) {
            throw Boom.notFound('Model not found');
          }

          return await model;
        }
      }, {
        assign: 'enabled',
        method: function (request,h) {

          const model = request.pre.model;
          if (model.routes.createView.disabled) {
            throw Boom.forbidden('Route Disabled');
          }
          return h.continue;
        }
      }, {
        assign: 'auth',
        method: function (request,h) {

          const model = request.pre.model;

          if (model.routes.createView.scope.length === 0) {
            return h.continue;  
          }
          if (model.routes.createView.auth) {
            if (!request.auth.isAuthenticated) {
              throw Boom.unauthorized('Authentication Required');
            }
          }
          return h.continue;
        }
      }, {
        assign: 'scopeCheck',
        method: function (request, h) {

          const model = request.pre.model.routes.createView.scope;

          if (model.routes.createView.scope.length === 0) {
            return h.continue;  
          }
          const userRoles = request.auth.credentials.scope;
          if (!IsAllowed(userRoles, model)){
            throw Boom.unauthorized('Insufficient Scope');
          }
          return h.continue;
        }
      }
      ] },
    handler: function (request, h) {

      const model = request.pre.model;
      const createView = model.routes.createView;
      let schema;

      if (createView.createSchema){
        schema = JoiToJson(createView.createSchema);
      }
      else {
        if (!model.routes.create.payload){
          model.routes.create.payload = model.schema;
          schema = JoiToJson(model.schema);
          Object.entries(schema.properties).forEach( ([key, value]) => {

            if (!value || Object.keys(value).length === 0){
              delete schema.properties[key];
            }
          });
        }
        else {
          schema = JoiToJson(model.routes.create.payload);
        }

      }

      return h.view('anchor-default-templates/create', {
        user: request.auth.credentials.user,
        projectName: Config.get('/projectName'),
        baseUrl: Config.get('/baseUrl'),
        title: capitalizeFirstLetter(request.params.collectionName),
        collectionName: request.params.collectionName,
        createSchema: schema
      });
    }
  });
};

const recursiveFindJoiKeys = function (joi, prefix = '') {

  const keys = [];
  const children = joi && joi._inner && joi._inner.children;
  if (Array.isArray(children)) {
    children.forEach((child) => {

      keys.push(child.key);
      recursiveFindJoiKeys(child.schema, `${child.key}.`)
        .forEach((k) => keys.push(k));
    });
  }
  return keys;
};

const capitalizeFirstLetter = function (string) {

  return string.charAt(0).toUpperCase() + string.slice(1);
};

module.exports = {
  name: 'anchor-web-route',
  register
};
