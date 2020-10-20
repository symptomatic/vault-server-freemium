
import RestHelpers from './RestHelpers';

import { get, has } from 'lodash';
import moment from 'moment';
import { Meteor } from 'meteor/meteor';
import { Random } from 'meteor/random';

import { 
  AllergyIntolerances,
  AuditEvents,
  Bundles,
  CarePlans,
  Conditions,
  Devices,
  Immunizations,
  Measures,
  MeasureReports,
  Locations,
  Observations,
  Organizations,
  Patients,
  Practitioners,
  Procedures,
  FhirUtilities,
  Questionnaires,
  QuestionnaireResponses,
  ValueSets
} from 'meteor/clinical:hl7-fhir-data-infrastructure';


//==========================================================================================
// Collections Namespace  

// These data cursors 

let Collections = {};

if(Meteor.isClient){
  Collections = window;
}
if(Meteor.isServer){
  Collections.AllergyIntolerances = AllergyIntolerances;
  Collections.AuditEvents = AuditEvents;
  Collections.Bundles = Bundles;
  Collections.CarePlans = CarePlans;
  Collections.Conditions = Conditions;
  Collections.Devices = Devices;
  Collections.Immunizations = Immunizations;
  Collections.Locations = Locations;
  Collections.Observations = Observations;
  Collections.Organizations = Organizations;
  Collections.Measures = Measures;
  Collections.MeasureReports = MeasureReports;
  Collections.Patients = Patients;
  Collections.Practitioners = Practitioners;
  Collections.Procedures = Procedures;
  Collections.Questionnaires = Questionnaires;
  Collections.QuestionnaireResponses = QuestionnaireResponses;
  Collections.ValueSets = ValueSets;
}

//==========================================================================================
// Global Configs  

var fhirPath = get(Meteor, 'settings.private.fhir.fhirPath', 'baseR4');
var fhirVersion = get(Meteor, 'settings.private.fhir.fhirVersion', 'R4');
var containerAccessToken = get(Meteor, 'settings.private.fhir.accessToken', false);

if(typeof oAuth2Server === 'object'){
  // TODO:  double check that this is needed; and that the /api/ route is correct
  JsonRoutes.Middleware.use(
    // '/api/*',
    '/baseR4/*',
    oAuth2Server.oauthserver.authorise()   // OAUTH FLOW - A7.1
  );
}

JsonRoutes.setResponseHeaders({
  "content-type": "application/fhir+json"
});


//==========================================================================================
// Global Method Overrides

// this is temporary fix until PR 132 can be merged in
// https://github.com/stubailo/meteor-rest/pull/132

JsonRoutes.sendResult = function (res, options) {
  options = options || {};

  // Set status code on response
  res.statusCode = options.code || 200;

  // Set response body
  if (options.data !== undefined) {
    var shouldPrettyPrint = (process.env.NODE_ENV === 'development');
    var spacer = shouldPrettyPrint ? 2 : null;
    // res.setHeader('Access-Control-Allow-Headers', 'Origin, Content-Type, Accept, Authorization, Content-Length, X-Requested-With');
    res.setHeader('Content-type', 'application/fhir+json');
    // res.setHeader('Access-Control-Allow-Origin', "*");
    res.setHeader("Access-Control-Allow-Methods", "PUT, POST, GET, DELETE, PATCH, OPTIONS");
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Pragma', 'no-cache');

    // res.setHeader('Access-Control-Allow-Origin', Meteor.absoluteUrl());
    // res.setHeader("Access-Control-Allow-Credentials", "true");
    // res.setHeader("Access-Control-Max-Age", "1800");

    res.write(JSON.stringify(options.data, null, spacer));
  }

  // We've already set global headers on response, but if they
  // pass in more here, we set those.
  if (options.headers) {
    //setHeaders(res, options.headers);
    options.headers.forEach(function(value, key){
      res.setHeader(key, value);
    });
  }

  // Send the response
  res.end();
};

//==========================================================================================
// Route Manifest  

JsonRoutes.add("post", fhirPath + "/ping", function (req, res, next) {
  console.log('POST ' + fhirPath + '/ping');

  res.setHeader('Content-type', 'application/json');
  res.setHeader("Access-Control-Allow-Methods", "PUT, POST, GET, DELETE, PATCH, OPTIONS");

  let returnPayload = {
    code: 200,
    data: "PONG!!!"
  }
  if(process.env.TRACE){
    console.log('return payload', returnPayload);
  }
 
  JsonRoutes.sendResult(res, returnPayload);
});

//==========================================================================================
// Route Manifest  

// If no settings file is provided, we will default to a Public Health Server with no PHI
let serverRouteManifest = {
  "MeasureReport": {
    "interactions": ["read", "create", "update", "delete"]
  },
  "Measure": {
    "interactions": ["read", "create", "update", "delete"]
  },
  "Location": {
    "interactions": ["read", "create", "update", "delete"]
  },
  "Organization": {
    "interactions": ["read", "create", "update", "delete"]
  }
}

// Checking for a settings file
if(has(Meteor, 'settings.private.fhir.rest')){
  serverRouteManifest = get(Meteor, 'settings.private.fhir.rest');
}

// checking if we're in strict validation mode, or if we're promiscuous  
let schemaValidationConfig = get(Meteor, 'settings.private.fhir.schemaValidation', {});

if(typeof serverRouteManifest === "object"){
  console.log('==========================================================================================');
  console.log('Initializing FHIR Server.');
  Object.keys(serverRouteManifest).forEach(function(routeResourceType){

    let collectionName = FhirUtilities.pluralizeResourceName(routeResourceType);
    console.log('Setting up routes for the ' + collectionName + ' collection.');

    // Read Interaction
    // https://www.hl7.org/fhir/http.html#read
    if(serverRouteManifest[routeResourceType].interactions.includes('read')){

      JsonRoutes.add("get", "/" + fhirPath + "/" + routeResourceType, function (req, res, next) {
        process.env.DEBUG && console.log('-------------------------------------------------------');
        process.env.DEBUG && console.log('GET /' + fhirPath + '/' + routeResourceType, req.query);

        // res.setHeader("Access-Control-Allow-Origin", "*");

        var accessTokenStr = (req.params && req.params.access_token) || (req.query && req.query.access_token);
        if(typeof oAuth2Server === 'object'){
          let isAuthorized = false;
          let accessToken = oAuth2Server.collections.accessToken.findOne({accessToken: accessTokenStr})

          process.env.TRACE && console.log('accessToken', accessToken);
          //process.env.TRACE && console.log('accessToken.userId', accessToken.userId);

          if(accessToken){
            isAuthorized = true;
          } else if(accessTokenStr === containerAccessToken){
            isAuthorized = true;
          }

          if (isAuthorized || process.env.NOAUTH || get(Meteor, 'settings.private.fhir.disableOauth')) {

            var databaseQuery = RestHelpers.generateMongoSearchQuery(req.query, routeResourceType);

            process.env.TRACE && console.log('Collections[collectionName].databaseQuery', databaseQuery);

            var payload = [];

            if(Collections[collectionName]){
              var records = Collections[collectionName].find(databaseQuery).fetch();
              process.env.DEBUG && console.log('Found ' + records.length + ' records matching the query on the ' + routeResourceType + ' endpoint.');
  
              records.forEach(function(record){
                payload.push(RestHelpers.prepForFhirTransfer(record));
              });
              process.env.TRACE && console.log('payload', payload);
  
              // Success
              JsonRoutes.sendResult(res, {
                code: 200,
                data: Bundle.generate(payload)
              });
            } else {
              // Not Implemented
              JsonRoutes.sendResult(res, {
                code: 501
              });
            }            
          } else {
            // Unauthorized
            JsonRoutes.sendResult(res, {
              code: 401
            });
          }
        } else {
          // no oAuth server installed; Not Implemented
          JsonRoutes.sendResult(res, {
            code: 501
          });
        }
      });

      JsonRoutes.add("get", "/" + fhirPath + "/" + routeResourceType + "/:id", function (req, res, next) {
        process.env.DEBUG && console.log('GET /' + fhirPath + '/' + routeResourceType + '/' + req.params.id);

        // res.setHeader("Access-Control-Allow-Origin", "*");
        // res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length, X-Requested-With');
        // res.setHeader("content-type", "application/fhir+json, application/json");

        // res.setHeader('Access-Control-Allow-Origin', Meteor.absoluteUrl());

        // res.setHeader("Access-Control-Allow-Credentials", "true");
        // res.setHeader("Access-Control-Max-Age", "1800");
        // res.setHeader("Access-Control-Allow-Methods","PUT, POST, GET, DELETE, PATCH, OPTIONS");

        var accessTokenStr = (req.params && req.params.access_token) || (req.query && req.query.access_token);
        if(typeof oAuth2Server === 'object'){
          let isAuthorized = false;
          let accessToken = oAuth2Server.collections.accessToken.findOne({accessToken: accessTokenStr})

          process.env.TRACE && console.log('accessToken', accessToken);
          //process.env.TRACE && console.log('accessToken.userId', accessToken.userId);

          if(accessToken){
            isAuthorized = true;
          } else if(accessTokenStr === containerAccessToken){
            isAuthorized = true;
          }

          if (isAuthorized || process.env.NOAUTH || get(Meteor, 'settings.private.fhir.disableOauth')) {
            process.env.DEBUG && console.log('Security checks completed');
            var record = Collections[collectionName].findOne({id: req.params.id});
            
            if (record) {
              process.env.TRACE && console.log('record', record);

              // Success
              JsonRoutes.sendResult(res, {
                code: 200,
                data: RestHelpers.prepForFhirTransfer(record)
              });
            } else {
              // Gone
              JsonRoutes.sendResult(res, {
                code: 410
              });
            }
          } else {
            // Unauthorized
            JsonRoutes.sendResult(res, {
              code: 401
            });
          }
        } else {
          // no oAuth server installed; Not Implemented
          JsonRoutes.sendResult(res, {
            code: 501
          });
        }
      });
    }

    // Create Interaction
    // https://www.hl7.org/fhir/http.html#create
    if(serverRouteManifest[routeResourceType].interactions.includes('create')){
      JsonRoutes.add("post", "/" + fhirPath + "/" + routeResourceType, function (req, res, next) {
        process.env.DEBUG && console.log('================================================================');
        process.env.DEBUG && console.log('Post /' + fhirPath + '/' + routeResourceType);

        // res.setHeader("Access-Control-Allow-Origin", "*");
        // res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length, X-Requested-With');
        // // res.setHeader("content-type", "application/fhir+json");
        // res.setHeader('Content-type', 'application/json, application/fhir+json');
        // res.setHeader("Access-Control-Allow-Origin", "*");

        // // res.setHeader('Access-Control-Allow-Origin', Meteor.absoluteUrl());

        // res.setHeader("Access-Control-Allow-Credentials", "true");
        // res.setHeader("Access-Control-Max-Age", "1800");
        // res.setHeader("Access-Control-Allow-Methods","PUT, POST, GET, DELETE, PATCH, OPTIONS");

        var accessTokenStr = get(req, 'params.access_token') || get(req, 'params.access_token');

        if(typeof oAuth2Server === 'object'){

          //------------------------------------------------------------------------------------------------
          // the following can probably be extracted into a common function

          let isAuthorized = false;
          let accessToken = oAuth2Server.collections.accessToken.findOne({accessToken: accessTokenStr})

          process.env.TRACE && console.log('accessToken', accessToken);

          if(accessToken){
            isAuthorized = true;
          } else if(accessTokenStr === containerAccessToken){
            isAuthorized = true;
          }

          if (isAuthorized || process.env.NOAUTH || get(Meteor, 'settings.private.fhir.disableOauth')) {

          //------------------------------------------------------------------------------------------------

            if (req.body) {
              newRecord = req.body;
              process.env.TRACE && console.log('req.body', req.body);

              var newlyAssignedId = Random.id();

              // https://www.hl7.org/fhir/http.html#create
              delete newRecord.id;

              if(get(newRecord, 'meta.versionId')){
                delete newRecord.meta.versionId;
              }
              if(get(newRecord, 'meta.lastUpdated')){
                delete newRecord.meta.lastUpdated;
              }
              if(get(newRecord, 'meta')){
                newRecord.meta.lastUpdated = new Date();
              } else {
                newRecord.meta = {
                  lastUpdated: new Date()
                }
              }

              if(get(newRecord, 'resourceType')){
                if(get(newRecord, 'resourceType') !== routeResourceType){
                  // Unsupported Media Type
                  JsonRoutes.sendResult(res, {
                    code: 415,
                    data: 'Wrong FHIR Resource.  Please check your endpoint.'
                  });
                } else {
                  newRecord.resourceType = routeResourceType;
                  newRecord._id = newlyAssignedId;
                  newRecord.id = newlyAssignedId;
    
                  newRecord = RestHelpers.toMongo(newRecord);
                  newRecord = RestHelpers.prepForUpdate(newRecord);
    
                  process.env.DEBUG && console.log('newRecord', newRecord);
    
                  
                  if(!Collections[collectionName].findOne({id: newlyAssignedId})){
                    process.env.DEBUG && console.log('No ' + routeResourceType + ' found.  Creating one.');
    
                    Collections[collectionName].insert(newRecord, schemaValidationConfig, function(error, result){
                      if (error) {
                        process.env.TRACE && console.log('PUT /fhir/MeasureReport/' + req.params.id + "[error]", error);
    
                        // Bad Request
                        JsonRoutes.sendResult(res, {
                          code: 400,
                          data: error.message
                        });
                      }
                      if (result) {
                        process.env.TRACE && console.log('result', result);
                        res.setHeader("MeasureReport", fhirPath + "/MeasureReport/" + result);
                        res.setHeader("Last-Modified", new Date());
                        res.setHeader("ETag", fhirVersion);
                        res.setHeader("Location", "/MeasureReport/" + result);
    
                        var resourceRecords = Collections[collectionName].find({id: newlyAssignedId});
                        var payload = [];
    
                        resourceRecords.forEach(function(record){
                          payload.push(RestHelpers.prepForFhirTransfer(record));
                        });
                        
                        process.env.TRACE && console.log("payload", payload);
    
                        // success!
                        JsonRoutes.sendResult(res, {
                          code: 201,
                          data: Bundle.generate(payload)
                        });
                      }
                    }); 
                  } else {
                    // Already Exists
                    JsonRoutes.sendResult(res, {
                      code: 412                        
                    });
                  }
                }
              }
            } else {
              // No body; Unprocessable Entity
              JsonRoutes.sendResult(res, {
                code: 422
              });
            }
          } else {
            // Unauthorized
            JsonRoutes.sendResult(res, {
              code: 401
            });
          }
        } else {
          // no oAuth server installed; Not Implemented
          JsonRoutes.sendResult(res, {
            code: 501
          });
        }
      });
    }

    // Update Interaction
    // https://www.hl7.org/fhir/http.html#update
    if(serverRouteManifest[routeResourceType].interactions.includes('update')){
            
      JsonRoutes.add("put", "/" + fhirPath + "/" + routeResourceType + "/:id", function (req, res, next) {
        process.env.DEBUG && console.log('PUT /' + fhirPath + '/' + routeResourceType + '/' + req.params.id);
        //process.env.DEBUG && console.log('PUT /' + fhirPath + '/MeasureReport/' + req.query._count);
      
        // res.setHeader("Access-Control-Allow-Origin", "*");
        // res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length, X-Requested-With');
        // res.setHeader("content-type", "application/fhir+json");

        // res.setHeader('Access-Control-Allow-Origin', Meteor.absoluteUrl());

        // res.setHeader("Access-Control-Allow-Credentials", "true");
        // res.setHeader("Access-Control-Max-Age", "1800");
        // res.setHeader("Access-Control-Allow-Methods","PUT, POST, GET, DELETE, PATCH, OPTIONS");

      
        var accessTokenStr = (req.params && req.params.access_token) || (req.query && req.query.access_token);
      
        if(typeof oAuth2Server === 'object'){
          let isAuthorized = false;
          let accessToken = oAuth2Server.collections.accessToken.findOne({accessToken: accessTokenStr})
      
          process.env.TRACE && console.log('accessToken', accessToken);
      
          if(accessToken){
            isAuthorized = true;
          } else if(accessTokenStr === containerAccessToken){
            isAuthorized = true;
          }
      
          if (isAuthorized || process.env.NOAUTH || get(Meteor, 'settings.private.fhir.disableOauth')) {
      
            if (req.body) {
              let newRecord = req.body;
      
              process.env.TRACE && console.log('req.body', req.body);
      
              newRecord.resourceType = routeResourceType;
              newRecord = RestHelpers.toMongo(newRecord);
      
              process.env.TRACE && console.log('newRecord', newRecord);
      
              newRecord = RestHelpers.prepForUpdate(newRecord);
      
              process.env.DEBUG && console.log('-----------------------------------------------------------');
              process.env.DEBUG && console.log('newRecord', JSON.stringify(newRecord, null, 2));            
      
              var recordsToUpdate= Collections[collectionName].findOne(req.params.id);
              var newlyAssignedId;
      
              if(recordsToUpdate){
                process.env.DEBUG && console.log(routeResourceType + ' found...')

                
                newlyAssignedId = Collections[collectionName].update({_id: req.params.id}, {$set: newRecord },  schemaValidationConfig, function(error, result){
                  if (error) {
                    process.env.TRACE && console.log('PUT /fhir/' + routeResourceType + '/' + req.params.id + "[error]", error);
      
                    // Bad Request
                    JsonRoutes.sendResult(res, {
                      code: 400,
                      data: error.message
                    });
                  }
                  if (result) {
                    process.env.TRACE && console.log('result', result);
                    res.setHeader("MeasureReport", fhirPath + "/" + routeResourceType + "/" + result);
                    res.setHeader("Last-Modified", new Date());
                    res.setHeader("ETag", fhirVersion);
      
                    var recordsToUpdate = Collections[collectionName].find({_id: req.params.id});
                    var payload = [];
      
                    recordsToUpdate.forEach(function(record){
                      payload.push({
                        fullUrl: Meteor.absoluteUrl() + get(Meteor, 'settings.private.fhir.fhirPath', 'fhir-3.0.0/') + get(record, 'resourceType') + "/" + get(record, '_id'),
                        resource: RestHelpers.prepForFhirTransfer(record)
                      });
                    });
      
                    process.env.TRACE && console.log("payload", payload);
      
                    // success!
                    JsonRoutes.sendResult(res, {
                      code: 200,
                      data: Bundle.generate(payload)
                    });
                  }
                });
              } else {        
                process.env.DEBUG && console.log('No recordsToUpdate found.  Creating one.');
                newRecord._id = req.params.id;
                newlyAssignedId = Collections[collectionName].insert(newRecord, schemaValidationConfig, function(error, result){
                  if (error) {
                    process.env.TRACE && console.log('PUT /fhir/' + routeResourceType + '/' + req.params.id + "[error]", error);
      
                    // Bad Request
                    JsonRoutes.sendResult(res, {
                      code: 400,
                      data: error.message
                    });
                  }
                  if (result) {
                    process.env.TRACE && console.log('result', result);
                    res.setHeader("MeasureReport", fhirPath + "/" + routeResourceType + "/" + result);
                    res.setHeader("Last-Modified", new Date());
                    res.setHeader("ETag", fhirVersion);
      
                    var recordsToUpdate = Collections[collectionName].find({_id: req.params.id});
                    var payload = [];
      
                    recordsToUpdate.forEach(function(record){
                      payload.push(RestHelpers.prepForFhirTransfer(record));
                    });
      
                    process.env.TRACE && console.log("payload", payload);
      
                    // success!
                    JsonRoutes.sendResult(res, {
                      code: 200,
                      data: Bundle.generate(payload)
                    });
                  }
                });        
              }
            } else {
              // no body; Unprocessable Entity
              JsonRoutes.sendResult(res, {
                code: 422
              });
            }
          } else {
            // Unauthorized
            JsonRoutes.sendResult(res, {
              code: 401
            });
          }
        } else {
          // no oAuth server installed; Not Implemented
          JsonRoutes.sendResult(res, {
            code: 501
          });
        }
      });



    }

    // Delete Interaction
    // https://www.hl7.org/fhir/http.html#delete
    if(serverRouteManifest[routeResourceType].interactions.includes('delete')){
      JsonRoutes.add("delete", "/" + fhirPath + "/" + routeResourceType + "/:id", function (req, res, next) {
        process.env.DEBUG && console.log('DELETE /' + fhirPath + '/' + routeResourceType + '/' + req.params.id);

        // res.setHeader("Access-Control-Allow-Origin", "*");
        // res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length, X-Requested-With');

        // res.setHeader('Access-Control-Allow-Origin', Meteor.absoluteUrl());

        // res.setHeader("Access-Control-Allow-Credentials", "true");
        // res.setHeader("Access-Control-Max-Age", "1800");
        // res.setHeader("Access-Control-Allow-Methods","PUT, POST, GET, DELETE, PATCH, OPTIONS");


        var accessTokenStr = (req.params && req.params.access_token) || (req.query && req.query.access_token);
        if(typeof oAuth2Server === 'object'){
          let isAuthorized = false;
          let accessToken = oAuth2Server.collections.accessToken.findOne({accessToken: accessTokenStr})

          process.env.TRACE && console.log('accessToken', accessToken);
          //process.env.TRACE && console.log('accessToken.userId', accessToken.userId);

          if(accessToken){
            isAuthorized = true;
          } else if(accessTokenStr === containerAccessToken){
            isAuthorized = true;
          }

          if (isAuthorized || process.env.NOAUTH || get(Meteor, 'settings.private.fhir.disableOauth')) {


            if (Collections[collectionName].find({_id: req.params.id}).count() === 0) {
              // Gone
              JsonRoutes.sendResult(res, {
                code: 410
              });
            } else {
              Collections[collectionName].remove({_id: req.params.id}, function(error, result){
                if (result) {
                  // No Content
                  JsonRoutes.sendResult(res, {
                    code: 204
                  });
                }
                if (error) {
                  // Conflict
                  JsonRoutes.sendResult(res, {
                    code: 409
                  });
                }
              });
            }


          } else {
            // Unauthorized
            JsonRoutes.sendResult(res, {
              code: 401
            });
          }
        } else {
          // no oAuth server installed; Not Implemented
          JsonRoutes.sendResult(res, {
            code: 501
          });
        }
      });
    }


    // Search Interaction
    // https://www.hl7.org/fhir/http.html#search
    if(serverRouteManifest[routeResourceType].search){

      JsonRoutes.add("post", "/" + fhirPath + "/" + routeResourceType + "/:param", function (req, res, next) {
        process.env.DEBUG && console.log('POST /' + fhirPath + '/' + routeResourceType + '/' + JSON.stringify(req.query));

        // res.setHeader("Access-Control-Allow-Origin", "*");
        // res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length, X-Requested-With');
        // // res.setHeader("content-type", "application/fhir+json");
        // // res.setHeader('Access-Control-Allow-Origin', Meteor.absoluteUrl());

        // res.setHeader('Content-type', 'application/json, application/fhir+json');
        // res.setHeader("Access-Control-Allow-Origin", "*");

        // res.setHeader("Access-Control-Allow-Credentials", "true");
        // res.setHeader("Access-Control-Max-Age", "1800");
        // res.setHeader("Access-Control-Allow-Methods","PUT, POST, GET, DELETE, PATCH, OPTIONS");


        var accessTokenStr = (req.params && req.params.access_token) || (req.query && req.query.access_token);
        if(typeof oAuth2Server === 'object'){
          let isAuthorized = false;
          let accessToken = oAuth2Server.collections.accessToken.findOne({accessToken: accessTokenStr})

          process.env.TRACE && console.log('accessToken', accessToken);

          if(accessToken){
            isAuthorized = true;
          } else if(accessTokenStr === containerAccessToken){
            isAuthorized = true;
          }

          if (isAuthorized || process.env.NOAUTH || get(Meteor, 'settings.private.fhir.disableOauth')) {


            var resourceRecords = [];

            if (req.params.param.includes('_search')) {
              var searchLimit = 1;
              if (get(req, 'query._count')) {
                searchLimit = parseInt(get(req, 'query._count'));
              }

              var databaseQuery = RestHelpers.generateMongoSearchQuery(req.query, routeResourceType);
              process.env.DEBUG && console.log('Collections[collectionName].databaseQuery', databaseQuery);

              resourceRecords = Collections[collectionName].find(databaseQuery, {limit: searchLimit}).fetch();

              var payload = [];

              resourceRecords.forEach(function(record){
                payload.push(RestHelpers.prepForFhirTransfer(record));
              });
            }

            // Success
            JsonRoutes.sendResult(res, {
              code: 200,
              data: Bundle.generate(payload)
            });
          } else {
            // Unauthorized
            JsonRoutes.sendResult(res, {
              code: 401
            });
          }
        } else {
          // no oAuth server installed; Not Implemented
          JsonRoutes.sendResult(res, {
            code: 501
          });
        }
      });


      //==========================================================================================
      // Step 8 - Search   

      JsonRoutes.add("get", "/" + fhirPath + "/" + routeResourceType + ":param", function (req, res, next) {
        process.env.DEBUG && console.log('GET /' + fhirPath + '/' + routeResourceType + '?' + JSON.stringify(req.query));
        process.env.DEBUG && console.log('params', req.params);

        // res.setHeader("Access-Control-Allow-Origin", "*");
        // res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length, X-Requested-With');
        // res.setHeader("content-type", "application/fhir+json");

        // res.setHeader('Access-Control-Allow-Origin', Meteor.absoluteUrl());

        // res.setHeader("Access-Control-Allow-Credentials", "true");
        // res.setHeader("Access-Control-Max-Age", "1800");
        // res.setHeader("Access-Control-Allow-Methods","PUT, POST, GET, DELETE, PATCH, OPTIONS");


        var accessTokenStr = (req.params && req.params.access_token) || (req.query && req.query.access_token);
        if(typeof oAuth2Server === 'object'){
          let isAuthorized = false;
          let accessToken = oAuth2Server.collections.accessToken.findOne({accessToken: accessTokenStr})

          process.env.TRACE && console.log('accessToken', accessToken);

          if(accessToken){
            isAuthorized = true;
          } else if(accessTokenStr === containerAccessToken){
            isAuthorized = true;
          }

          if (isAuthorized || process.env.NOAUTH || get(Meteor, 'settings.private.fhir.disableOauth')) {

            var resourceRecords = [];

            if (req.params.param.includes('_search')) {
              var searchLimit = 1;
              if (get(req, 'query._count')) {
                searchLimit = parseInt(get(req, 'query._count'));
              }
              var databaseQuery = RestHelpers.generateMongoSearchQuery(req.query, routeResourceType);
              process.env.DEBUG && console.log('Generated the following query for the ' + routeResourceType + ' collection.', databaseQuery);

              resourceRecords = Collections[collectionName].find(databaseQuery, {limit: searchLimit}).fetch();

              var payload = [];

              resourceRecords.forEach(function(record){
                payload.push(RestHelpers.prepForFhirTransfer(record));
              });
            }

            // Success
            JsonRoutes.sendResult(res, {
              code: 200,
              data: Bundle.generate(payload)
            });
          } else {
            // Unauthorized
            JsonRoutes.sendResult(res, {
              code: 401
            });
          }
        } else {
          // no oAuth server installed; Not Implemented
          JsonRoutes.sendResult(res, {
            code: 501
          });
        }
      });
    }
  })

  console.log('FHIR Server is online.');
}











// //==========================================================================================
// // Step 4 - MeasureReportHistoryInstance

// JsonRoutes.add("get", "/" + fhirPath + "/MeasureReport/:id/_history", function (req, res, next) {
//   process.env.DEBUG && console.log('GET /' + fhirPath + '/MeasureReport/', req.params);
//   process.env.DEBUG && console.log('GET /' + fhirPath + '/MeasureReport/', req.query._count);

//   res.setHeader("Access-Control-Allow-Origin", "*");
//   res.setHeader("content-type", "application/fhir+json");

//   var accessTokenStr = (req.params && req.params.access_token) || (req.query && req.query.access_token);
//   if(typeof oAuth2Server === 'object'){
//     let isAuthorized = false;
//     let accessToken = oAuth2Server.collections.accessToken.findOne({accessToken: accessTokenStr})

//     process.env.TRACE && console.log('accessToken', accessToken);
//     //process.env.TRACE && console.log('accessToken.userId', accessToken.userId);

//     if(accessToken){
//       isAuthorized = true;
//     } else if(accessTokenStr === containerAccessToken){
//       isAuthorized = true;
//     }

//     if (isAuthorized || process.env.NOAUTH || get(Meteor, 'settings.private.fhir.disableOauth')) {


//       var resourceRecords = Collections[collectionName].find({_id: req.params.id});
//       var payload = [];

//       resourceRecords.forEach(function(record){
//         payload.push(RestHelpers.prepForFhirTransfer(record));

//         // the following is a hack, to conform to the Touchstone MeasureReport testscript
//         // https://touchstone.aegis.net/touchstone/testscript?id=06313571dea23007a12ec7750a80d98ca91680eca400b5215196cd4ae4dcd6da&name=%2fFHIR1-6-0-Basic%2fP-R%2fMeasureReport%2fClient+Assigned+Id%2fMeasureReport-client-id-json&version=1&latestVersion=1&itemId=&spec=HL7_FHIR_STU3_C2
//         // the _history query expects a different resource in the Bundle for each version of the file in the system
//         // since we don't implement record versioning in Meteor on FHIR yet
//         // we are simply adding two instances of the record to the payload 
//         payload.push(RestHelpers.prepForFhirTransfer(record));
//       });
//       // Success
//       JsonRoutes.sendResult(res, {
//         code: 200,
//         data: Bundle.generate(payload, 'history')
//       });
//     } else {
//       // Unauthorized
//       JsonRoutes.sendResult(res, {
//         code: 401
//       });
//     }
//   } else {
//     // no oAuth server installed; Not Implemented
//     JsonRoutes.sendResult(res, {
//       code: 501
//     });
//   }
// });






// WebApp.connectHandlers.use("/fhir/MeasureReport", function(req, res, next) {
//   res.setHeader("Access-Control-Allow-Origin", "*");
//   return next();
// });
