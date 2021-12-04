
import RestHelpers from './RestHelpers';
import MedicalRecordImporter from './MedicalRecordImporter';

import { get, has, set, unset, cloneDeep, isEmpty } from 'lodash';
import moment from 'moment';
import { Meteor } from 'meteor/meteor';
import { Random } from 'meteor/random';

import { 
  AllergyIntolerances,
  AuditEvents,
  Bundles,
  CarePlans,
  CareTeams,
  CodeSystems,
  Communications,
  CommunicationRequests,
  Compositions,
  Conditions,
  Consents,
  Devices,
  DiagnosticReports,
  DocumentReferences,
  Encounters,
  Endpoints,
  Goals,
  HealthcareServices,
  Immunizations,
  InsurancePlans,
  Lists,
  Locations,
  Medications,
  MedicationOrders,
  Measures,
  Networks,
  MeasureReports,
  Observations,
  Organizations,
  OrganizationAffiliations,
  Patients,
  Practitioners,
  PractitionerRoles,
  Procedures,
  Provenances,
  Questionnaires,
  QuestionnaireResponses,
  Restrictions,
  RiskAssessments,
  SearchParameters,
  ServiceRequests,
  StructureDefinitions,
  Tasks,
  ValueSets,
  VerificationResults,
  FhirUtilities
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
  Collections.CareTeams = CareTeams;
  Collections.CodeSystems = CodeSystems;
  Collections.Communications = Communications;
  Collections.CommunicationRequests = CommunicationRequests;
  Collections.Compositions = Compositions;
  Collections.Conditions = Conditions;
  Collections.Consents = Consents;
  Collections.Devices = Devices;
  Collections.DiagnosticReports = DiagnosticReports;
  Collections.DocumentReferences = DocumentReferences;
  Collections.Encounters = Encounters;
  Collections.Endpoints = Endpoints;
  Collections.Goals = Goals;
  Collections.HealthcareServices = HealthcareServices;
  Collections.Immunizations = Immunizations;
  Collections.InsurancePlans = InsurancePlans;
  Collections.Lists = Lists;
  Collections.Locations = Locations;
  Collections.Networks = Networks;
  Collections.Observations = Observations;
  Collections.Organizations = Organizations;
  Collections.OrganizationAffiliations = OrganizationAffiliations;
  Collections.Medications = Medications;
  Collections.MedicationOrders = MedicationOrders;
  Collections.Measures = Measures;
  Collections.MeasureReports = MeasureReports;
  Collections.Patients = Patients;
  Collections.Practitioners = Practitioners;
  Collections.PractitionerRoles = PractitionerRoles;
  Collections.Provenances = Provenances;
  Collections.Procedures = Procedures;
  Collections.Questionnaires = Questionnaires;
  Collections.QuestionnaireResponses = QuestionnaireResponses;
  Collections.Restrictions = Restrictions;
  Collections.RiskAssessments = RiskAssessments;
  Collections.SearchParameters = SearchParameters;
  Collections.ServiceRequests = ServiceRequests;
  Collections.StructureDefinitions = StructureDefinitions;
  Collections.Tasks = Tasks;
  Collections.ValueSets = ValueSets;
  Collections.VerificationResults = VerificationResults;
}

//==========================================================================================
// Global Configs  

let fhirPath = get(Meteor, 'settings.private.fhir.fhirPath', 'baseR4');
let fhirVersion = get(Meteor, 'settings.private.fhir.fhirVersion', 'R4');
let containerAccessToken = get(Meteor, 'settings.private.fhir.accessToken', false);

if(typeof oAuth2Server === 'object'){
  // TODO:  double check that this is needed; and that the /api/ route is correct
  JsonRoutes.Middleware.use(
    // '/api/*',
    '/baseR4/*',
    oAuth2Server.oauthserver.authorise()   // OAUTH FLOW - A7.1
  );
} else {
  console.log("Using the Freemium version of the Vault Server.  OAuth server not installed.  Please contact inquiries@symptomatic.io to purchase a license for our professional version.")
}

// JsonRoutes.setResponseHeaders({
//   "Content-Type": "application/fhir+json"
// });


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
    let shouldPrettyPrint = (process.env.NODE_ENV === 'development');
    let spacer = shouldPrettyPrint ? 2 : null;
    // res.setHeader('Access-Control-Allow-Headers', 'Origin, Content-Type, Accept, Authorization, Content-Length, X-Requested-With');
    // res.setHeader('Content-Type', 'application/fhir+json');
    // res.setHeader('Content-type', 'application/fhir+json');
    // res.setHeader('Access-Control-Allow-Origin', "*");
    res.setHeader("Access-Control-Allow-Methods", "PUT, POST, GET, DELETE, PATCH, OPTIONS");
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Expose-Headers', 'Location, Content-Location');
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
  res.setHeader('Content-Type', 'application/fhir+json');

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
let serverRouteManifest = {};

// Checking for a settings file
if(get(Meteor, 'settings.private.fhir.rest')){
  serverRouteManifest = Object.assign(serverRouteManifest,get(Meteor, 'settings.private.fhir.rest'));
} else {
  console.log('Meteor.settings.private.fhir.rest is not available.  No routes will be provided!  Ooops.  =(')
}
if(get(Meteor, 'settings.private.fhir.experimentalRest')){
  serverRouteManifest = Object.assign(serverRouteManifest, get(Meteor, 'settings.private.fhir.experimentalRest'));
}

// checking if we're in strict validation mode, or if we're promiscuous  
let schemaValidationConfig = get(Meteor, 'settings.private.fhir.schemaValidation', {});

if(typeof serverRouteManifest === "object"){
  console.log('==========================================================================================');
  console.log('Initializing FHIR Server.');
  Object.keys(serverRouteManifest).forEach(function(routeResourceType){

    let collectionName = FhirUtilities.pluralizeResourceName(routeResourceType);
    console.log('Setting up routes for the ' + collectionName + ' collection.');


    if(Array.isArray(serverRouteManifest[routeResourceType].interactions)){
      
      // Read Interaction
      // https://www.hl7.org/fhir/http.html#read
      if(serverRouteManifest[routeResourceType].interactions.includes('read')){

        JsonRoutes.add("get", "/" + fhirPath + "/" + routeResourceType, function (req, res, next) {
          if(get(Meteor, 'settings.private.debug') === true) { console.log('-------------------------------------------------------'); }
          if(get(Meteor, 'settings.private.debug') === true) { console.log('GET /' + fhirPath + '/' + routeResourceType, req.query); }
  
          // res.setHeader("Access-Control-Allow-Origin", "*");          
          // res.setHeader("Access-Control-Allow-Origin", "*");
          res.setHeader('Content-Type', 'application/fhir+json');

          let isAuthorized = false;

          let accessTokenStr = (req.params && req.params.access_token) || (req.query && req.query.access_token);
          if(typeof oAuth2Server === 'object'){
            let accessToken = oAuth2Server.collections.accessToken.findOne({accessToken: accessTokenStr})

            if(get(Meteor, 'settings.private.trace') === true) { console.log('accessToken', accessToken); }
            //if(get(Meteor, 'settings.privattraceug') === true) { console.log('accessToken.userId', accessToken.userId); }

            if(accessToken){
              isAuthorized = true;
            } else if(accessTokenStr === containerAccessToken){
              isAuthorized = true;
            }
          } 

          if (isAuthorized || process.env.NOAUTH || get(Meteor, 'settings.private.fhir.disableOauth') || get(Meteor, 'settings.private.fhir.rest.' + routeResourceType + '.disableOauth')) {

            let databaseQuery = RestHelpers.generateMongoSearchQuery(req.query, routeResourceType);

            if(get(Meteor, 'settings.private.trace') === true) { console.log('Collections[collectionName].databaseQuery', databaseQuery); }

            let payload = [];

            if(Collections[collectionName]){
              let records = Collections[collectionName].find(databaseQuery).fetch();
              if(get(Meteor, 'settings.private.debug') === true) { console.log('Found ' + records.length + ' records matching the query on the ' + routeResourceType + ' endpoint.'); }

              records.forEach(function(record){
                payload.push(RestHelpers.prepForFhirTransfer(record));
              });
              if(get(Meteor, 'settings.private.trace') === true) { console.log('payload', payload); }

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
        });

        JsonRoutes.add("get", "/" + fhirPath + "/" + routeResourceType + "/:id", function (req, res, next) {
          if(get(Meteor, 'settings.private.debug') === true) { console.log('GET /' + fhirPath + '/' + routeResourceType + '/' + req.params.id); }
  
          // res.setHeader("Access-Control-Allow-Origin", "*");
          // res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length, X-Requested-With');
          // res.setHeader("content-type", "application/fhir+json, application/json");
  
          // res.setHeader('Access-Control-Allow-Origin', Meteor.absoluteUrl());
  
          // res.setHeader("Access-Control-Allow-Credentials", "true");
          // res.setHeader("Access-Control-Max-Age", "1800");
          // res.setHeader("Access-Control-Allow-Methods","PUT, POST, GET, DELETE, PATCH, OPTIONS");
  
          res.setHeader('Content-Type', 'application/fhir+json');

          let isAuthorized = false;
          let accessTokenStr = (req.params && req.params.access_token) || (req.query && req.query.access_token);
          if(typeof oAuth2Server === 'object'){
            let accessToken = oAuth2Server.collections.accessToken.findOne({accessToken: accessTokenStr})
  
            if(get(Meteor, 'settings.private.trace') === true) { console.log('accessToken', accessToken); }
            //if(get(Meteor, 'settings.privattraceug') === true) { console.log('accessToken.userId', accessToken.userId); }
  
            if(accessToken){
              isAuthorized = true;
            } else if(accessTokenStr === containerAccessToken){
              isAuthorized = true;
            }
          }
  
          if (isAuthorized || process.env.NOAUTH || get(Meteor, 'settings.private.fhir.disableOauth') || get(Meteor, 'settings.private.fhir.rest.' + routeResourceType + '.disableOauth')) {
            if(get(Meteor, 'settings.private.debug') === true) { console.log('Security checks completed'); }

            let record;

            console.log('req.query', req.query)
            console.log('req.params', req.params)

            if (req.query.hasOwnProperty('_history')) {
              console.log('Found a _history')
              let records = Collections[collectionName].find({id: req.params.id});
              if(get(Meteor, 'settings.private.trace') === true) { console.log('records', records); }

              payload = [];
              records.forEach(function(recordVersion){
                payload.push(RestHelpers.prepForFhirTransfer(recordVersion));
              });  
  
              // Success
              JsonRoutes.sendResult(res, {
                code: 200,
                data: Bundle.generate(payload)
              });
            } else {
              record = Collections[collectionName].findOne({id: req.params.id});
              if(get(Meteor, 'settings.private.trace') === true) { console.log('record', record); }

              if(record){
                // Success
                JsonRoutes.sendResult(res, {
                  code: 200,
                  data: RestHelpers.prepForFhirTransfer(record)
                });
              } else {
                // Not Found
                JsonRoutes.sendResult(res, {
                  code: 404
                });
              }  
            }
          } else {
            // Unauthorized
            JsonRoutes.sendResult(res, {
              code: 401
            });
          }
        });
      }

      // Create Interaction
      // https://www.hl7.org/fhir/http.html#create
      if(serverRouteManifest[routeResourceType].interactions.includes('create')){
        JsonRoutes.add("post", "/" + fhirPath + "/" + routeResourceType, function (req, res, next) {
          if(get(Meteor, 'settings.private.debug') === true) { console.log('================================================================'); }
          if(get(Meteor, 'settings.private.debug') === true) { console.log('POST /' + fhirPath + '/' + routeResourceType); }

          // res.setHeader("Access-Control-Allow-Origin", "*");
          // res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length, X-Requested-With');
          // // res.setHeader("content-type", "application/fhir+json");
          // res.setHeader('Content-type', 'application/json, application/fhir+json');
          // res.setHeader("Access-Control-Allow-Origin", "*");

          // // res.setHeader('Access-Control-Allow-Origin', Meteor.absoluteUrl());

          // res.setHeader("Access-Control-Allow-Credentials", "true");
          // res.setHeader("Access-Control-Max-Age", "1800");
          // res.setHeader("Access-Control-Allow-Methods","PUT, POST, GET, DELETE, PATCH, OPTIONS");

        res.setHeader('Content-Type', 'application/fhir+json');

        let accessTokenStr = get(req, 'params.access_token') || get(req, 'params.access_token');

        let isAuthorized = false;
        if(typeof oAuth2Server === 'object'){
          let accessToken = oAuth2Server.collections.accessToken.findOne({accessToken: accessTokenStr})

          if(accessToken){
            isAuthorized = true;
          } else if(accessTokenStr === containerAccessToken){
            isAuthorized = true;
          }
        }

        if (isAuthorized || process.env.NOAUTH || get(Meteor, 'settings.private.fhir.disableOauth') || get(Meteor, 'settings.private.fhir.rest.' + routeResourceType + '.disableOauth')) {

        //------------------------------------------------------------------------------------------------

          if (req.body) {
            newRecord = req.body;
            if(get(Meteor, 'settings.private.trace') === true) { console.log('req.body', req.body); }
            

            let newlyAssignedId = Random.id();

            // https://www.hl7.org/fhir/http.html#create            

            if(get(newRecord, 'meta.versionId')){
              set(newRecord, 'meta.versionId', newRecord.meta.versionId + 1);
            }
            if(get(newRecord, 'meta.lastUpdated')){
              set(newRecord, 'meta.lastUpdated', new Date());
            }


            if(get(newRecord, 'resourceType')){
              if(get(newRecord, 'resourceType') !== routeResourceType){
                // Unsupported Media Type
                JsonRoutes.sendResult(res, {
                  code: 415,
                  data: 'Wrong FHIR Resource.  Please check your endpoint.'
                });
              } else if(get(newRecord, 'resourceType') === "Bundle"){
                MedicalRecordImporter.importBundle(newRecord);  
                // success!
                JsonRoutes.sendResult(res, {
                  code: 201,
                  data: Bundle.generate(payload)
                });              
              } else {
                newRecord.resourceType = routeResourceType;
                newRecord._id = newlyAssignedId;

                if(!get(newRecord, 'id')){
                  newRecord.id = newlyAssignedId;
                }                
  
                newRecord = RestHelpers.toMongo(newRecord);
                newRecord = RestHelpers.prepForUpdate(newRecord);
  
                if(get(Meteor, 'settings.private.debug') === true) { console.log('newRecord', newRecord); }
  
                
                if(!Collections[collectionName].findOne({id: newlyAssignedId})){
                  if(get(Meteor, 'settings.private.debug') === true) { console.log('No ' + routeResourceType + ' found.  Creating one.'); }
  
                  Collections[collectionName].insert(newRecord, schemaValidationConfig, function(error, result){
                    if (error) {
                      if(get(Meteor, 'settings.private.trace') === true) { console.log('PUT /fhir/MeasureReport/' + req.params.id + "[error]", error); }
  
                      // Bad Request
                      JsonRoutes.sendResult(res, {
                        code: 400,
                        data: error.message
                      });
                    }
                    if (result) {
                      if(get(Meteor, 'settings.private.trace') === true) { console.log('result', result); }
                      // res.setHeader("MeasureReport", fhirPath + "/MeasureReport/" + result);
                      res.setHeader("Last-Modified", new Date());
                      res.setHeader("ETag", fhirVersion);
                      res.setHeader("Location", "/MeasureReport/" + result);
                      res.setHeader('Content-Type', 'application/fhir+json');

                      let resourceRecords = Collections[collectionName].find({id: newlyAssignedId});
                      let payload = [];
  
                      resourceRecords.forEach(function(record){
                        payload.push(RestHelpers.prepForFhirTransfer(record));
                      });
                      
                      if(get(Meteor, 'settings.private.trace') === true) { console.log("payload", payload); }
  
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

        });
      }

      // Update Interaction
      // https://www.hl7.org/fhir/http.html#update
      if(serverRouteManifest[routeResourceType].interactions.includes('update')){
        JsonRoutes.add("put", "/" + fhirPath + "/" + routeResourceType + "/:id", function (req, res, next) {
          if(get(Meteor, 'settings.private.debug') === true) { console.log('================================================================'); }
          if(get(Meteor, 'settings.private.debug') === true) { console.log('PUT /' + fhirPath + '/' + routeResourceType + '/' + req.params.id); }
        
          let accessTokenStr = (req.params && req.params.access_token) || (req.query && req.query.access_token);
        
          let isAuthorized = false;
          if(typeof oAuth2Server === 'object'){
            let accessToken = oAuth2Server.collections.accessToken.findOne({accessToken: accessTokenStr})
        
            if(get(Meteor, 'settings.private.trace') === true) { console.log('accessToken', accessToken); }
        
            if(accessToken){
              isAuthorized = true;
            } else if(accessTokenStr === containerAccessToken){
              isAuthorized = true;
            }
          }
        
          if (isAuthorized || process.env.NOAUTH || get(Meteor, 'settings.private.fhir.disableOauth') || get(Meteor, 'settings.private.fhir.rest.' + routeResourceType + '.disableOauth')) {

            let newRecord;
            
            if(req.body){
              newRecord = cloneDeep(req.body);      
            } else if (isEmpty(req.body)){
              newRecord = JSON.parse(req._readableState.buffer.toString('utf8'));
            }
            
            if (newRecord) {
              if(get(Meteor, 'settings.private.debug') === true) { console.log('req.body', req.body); }
              if(get(Meteor, 'settings.private.debug') === true) { console.log('newRecord', newRecord); }

      
              newRecord.resourceType = routeResourceType;
              newRecord = RestHelpers.toMongo(newRecord);
      
      
              newRecord = RestHelpers.prepForUpdate(newRecord);
      
              if(get(Meteor, 'settings.private.debug') === true) { console.log('-----------------------------------------------------------'); }
              if(get(Meteor, 'settings.private.debug') === true) { console.log('Core.put().newRecord', JSON.stringify(newRecord, null, 2));             }
      

              if(typeof Collections[collectionName] === "object"){
                let recordsToUpdate = Collections[collectionName].find({id: req.params.id}).count();

                if(get(Meteor, 'settings.private.debug') === true) { console.log('Core.put().recordsToUpdate', JSON.stringify(recordsToUpdate, null, 2));             }
                
                let newlyAssignedId;
        
                if(recordsToUpdate > 0){
                  if(get(Meteor, 'settings.private.debug') === true) { console.log(recordsToUpdate + ' records found...') }
  
  
                  if(get(Meteor, 'settings.private.recordVersioningEnabled')){
                    if(get(Meteor, 'settings.private.debug') === true) { console.log('Versioned Collection: Trying to add another versioned record to the main Task collection.') }
  
                    set(newRecord, 'meta.versionId', recordsToUpdate + 1)
                    unset(newRecord, '_id')
      
                    newlyAssignedId = Collections[collectionName].insert(newRecord, schemaValidationConfig, function(error, result){
                      if (error) {
                        if(get(Meteor, 'settings.private.trace') === true) { console.log('PUT /fhir/' + routeResourceType + '/' + req.params.id + "[error]", error); }
          
                        // Bad Request
                        JsonRoutes.sendResult(res, {
                          code: 400,
                          data: error.message
                        });
                      }
                      if (result) {
                        if(get(Meteor, 'settings.private.trace') === true) { console.log('result', result); }
                        // res.setHeader("MeasureReport", fhirPath + "/" + routeResourceType + "/" + result);
                        res.setHeader("Last-Modified", new Date());
                        res.setHeader("ETag", fhirVersion);
                        res.setHeader('Content-Type', 'application/fhir+json');
          
                        let recordsToUpdate = Collections[collectionName].find({_id: req.params.id});
                        let payload = [];
          
                        recordsToUpdate.forEach(function(record){
                          payload.push(RestHelpers.prepForFhirTransfer(record));
                        });
          
                        if(get(Meteor, 'settings.private.trace') === true) { console.log("payload", payload); }
            
                        // success!
                        JsonRoutes.sendResult(res, {
                          code: 200,
                          data: Bundle.generate(payload)
                        });
                      }
                    });    
                  } else {
                    if(get(Meteor, 'settings.private.debug') === true) { console.log('Nonversioned Collection: Trying to update the existing record.') }
                    newlyAssignedId = Collections[collectionName].update({_id: req.params.id}, {$set: newRecord },  schemaValidationConfig, function(error, result){
                      if (error) {
                        if(get(Meteor, 'settings.private.trace') === true) { console.log('PUT /fhir/' + routeResourceType + '/' + req.params.id + "[error]", error); }
          
                        // Bad Request
                        JsonRoutes.sendResult(res, {
                          code: 400,
                          data: error.message
                        });
                      }
                      if (result) {
                        if(get(Meteor, 'settings.private.trace') === true) { console.log('result', result); }
                        // res.setHeader("MeasureReport", fhirPath + "/" + routeResourceType + "/" + result);
                        res.setHeader("Last-Modified", new Date());
                        res.setHeader("ETag", fhirVersion);
                        res.setHeader('Content-Type', 'application/fhir+json');
          
                        let recordsToUpdate = Collections[collectionName].find({_id: req.params.id});
                        let payload = [];
          
                        recordsToUpdate.forEach(function(record){
                          payload.push({
                            fullUrl: Meteor.absoluteUrl() + get(Meteor, 'settings.private.fhir.fhirPath', 'fhir-3.0.0/') + get(record, 'resourceType') + "/" + get(record, '_id'),
                            resource: RestHelpers.prepForFhirTransfer(record)
                          });
                        });
          
                        if(get(Meteor, 'settings.private.trace') === true) { console.log("payload", payload); }
          
                        // Created!
                        JsonRoutes.sendResult(res, {
                          code: 201,
                          data: Bundle.generate(payload)
                        });

                        // My reading of the FHIR spec calls for a 200 response here
                        // but Touchstone wants a 201 response.
                        // If this is revisted and needs the original  200 response, then we may need to 
                        // file an issue ticket with Touchstone to update their script
            
                        // // success!
                        // JsonRoutes.sendResult(res, {
                        //   code: 200,
                        //   data: Bundle.generate(payload)
                        // });
                      }
                    });
                  }
                  
                  
                } else {        
                  if(get(Meteor, 'settings.private.debug') === true) { console.log('No recordsToUpdate found.  Creating one.'); }
  
                  //newRecord._id = req.params.id;
                  if(get(Meteor, 'settings.private.recordVersioningEnabled')){
                    set(newRecord, 'meta.versionId', 1)
                  }
  
                  if(get(Meteor, 'settings.private.debug') === true) { console.log('Core.put().Collections.findOne()', Collections[collectionName].findOne({id: req.params.id}));             }
  
                  if(!Collections[collectionName].findOne({id: req.params.id})){
                    if(newRecord){
                      newlyAssignedId = Collections[collectionName].insert(newRecord, schemaValidationConfig, function(error, result){
                        if (error) {
                          if(get(Meteor, 'settings.private.trace') === true) { console.log('PUT /fhir/' + routeResourceType + '/' + req.params.id + "[error]", error); }
            
                          // Bad Request
                          JsonRoutes.sendResult(res, {
                            code: 400,
                            data: error.message
                          });
                        }
                        if (result) {
                          if(get(Meteor, 'settings.private.trace') === true) { console.log('result', result); }
                          // res.setHeader("MeasureReport", fhirPath + "/" + routeResourceType + "/" + result);
                          res.setHeader("Last-Modified", new Date());
                          res.setHeader("ETag", fhirVersion);
                          res.setHeader("Content-Type", "application/fhir+json;charset=utf-8");
            
                          let record = Collections[collectionName].findOne({id: req.params.id});
                          let payload = [];
           
                          if(record){
                            delete record._document;
                            if(get(Meteor, 'settings.private.trace') === true) { console.log("record", record); }
              
                            // Created!
                            JsonRoutes.sendResult(res, {
                              code: 201,
                              data: record
                            });
                          } else {
                            // no body; Unprocessable Entity
                            JsonRoutes.sendResult(res, {
                              code: 422
                            });
                          }                        
                        }
                      });      
                    }
                  } else {
                    
                    Collections[collectionName].update({id: newRecord.id}, {$set: newRecord}, schemaValidationConfig, function(error, result){
                      if (error) {
                        if(get(Meteor, 'settings.private.trace') === true) { console.log('PUT /fhir/' + routeResourceType + '/' + req.params.id + "[error]", error); }
          
                        // Bad Request
                        JsonRoutes.sendResult(res, {
                          code: 400,
                          data: error.message
                        });
                      }
                      if (result) {
                        if(get(Meteor, 'settings.private.trace') === true) { console.log('result', result); }
                        // res.setHeader("MeasureReport", fhirPath + "/" + routeResourceType + "/" + result);
                        res.setHeader("Last-Modified", new Date());
                        res.setHeader("ETag", fhirVersion);
                        res.setHeader('Content-Type', 'application/fhir+json');
          
                        let recordsToUpdate = Collections[collectionName].find({id: req.params.id});
                        let payload = [];
          
                        recordsToUpdate.forEach(function(record){
                          payload.push(RestHelpers.prepForFhirTransfer(record));
                        });
          
                        if(get(Meteor, 'settings.private.trace') === true) { console.log("payload", payload); }
          
                        // success!
                        JsonRoutes.sendResult(res, {
                          code: 200,
                          data: Bundle.generate(payload)
                        });
                      }
                    });    
                  }                    
                }  
              } else {
                console.log(collectionName + ' collection not found.')
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

        });
      }

      // Delete Interaction
      // https://www.hl7.org/fhir/http.html#delete
      if(serverRouteManifest[routeResourceType].interactions.includes('delete')){
        JsonRoutes.add("delete", "/" + fhirPath + "/" + routeResourceType + "/:id", function (req, res, next) {
          if(get(Meteor, 'settings.private.debug') === true) { console.log('================================================================'); }
          if(get(Meteor, 'settings.private.debug') === true) { console.log('DELETE /' + fhirPath + '/' + routeResourceType + '/' + req.params.id); }

          // res.setHeader("Access-Control-Allow-Origin", "*");
          // res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length, X-Requested-With');

          // res.setHeader('Access-Control-Allow-Origin', Meteor.absoluteUrl());

          // res.setHeader("Access-Control-Allow-Credentials", "true");
          // res.setHeader("Access-Control-Max-Age", "1800");
          // res.setHeader("Access-Control-Allow-Methods","PUT, POST, GET, DELETE, PATCH, OPTIONS");


          let isAuthorized = false;
          let accessTokenStr = (req.params && req.params.access_token) || (req.query && req.query.access_token);
          if(typeof oAuth2Server === 'object'){
            
            let accessToken = oAuth2Server.collections.accessToken.findOne({accessToken: accessTokenStr})

            if(get(Meteor, 'settings.private.trace') === true) { console.log('accessToken', accessToken); }
            //if(get(Meteor, 'settings.privattraceug') === true) { console.log('accessToken.userId', accessToken.userId); }

            if(accessToken){
              isAuthorized = true;
            } else if(accessTokenStr === containerAccessToken){
              isAuthorized = true;
            }
          }

          if (isAuthorized || process.env.NOAUTH || get(Meteor, 'settings.private.fhir.disableOauth') || get(Meteor, 'settings.private.fhir.rest.' + routeResourceType + '.disableOauth')) {
            if (Collections[collectionName].find({id: req.params.id}).count() === 0) {
              // Not Found
              JsonRoutes.sendResult(res, {
                code: 404
              });

              // My reading of the FHIR spec calls for a 410 response here
              // but Touchstone wants a 404 response.
              // If this is revisted and needs a 410, then we may need to 
              // file an issue ticket with Touchstone to update their script

              // // Gone
              // JsonRoutes.sendResult(res, {
              //   code: 410
              // });
            } else {
              Collections[collectionName].remove({id: req.params.id}, function(error, result){
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
        });
      }

      // Search Interaction
      // https://www.hl7.org/fhir/http.html#search
      if(serverRouteManifest[routeResourceType].search){
        JsonRoutes.add("post", "/" + fhirPath + "/" + routeResourceType + "/:param", function (req, res, next) {
          if(get(Meteor, 'settings.private.debug') === true) { console.log('================================================================'); }
          if(get(Meteor, 'settings.private.debug') === true) { console.log('POST /' + fhirPath + '/' + routeResourceType + '/' + JSON.stringify(req.query)); }

          // res.setHeader("Access-Control-Allow-Origin", "*");
          // res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length, X-Requested-With');
          // // res.setHeader("content-type", "application/fhir+json");
          // // res.setHeader('Access-Control-Allow-Origin', Meteor.absoluteUrl());

          // res.setHeader('Content-type', 'application/json, application/fhir+json');
          // res.setHeader("Access-Control-Allow-Origin", "*");

          // res.setHeader("Access-Control-Allow-Credentials", "true");
          // res.setHeader("Access-Control-Max-Age", "1800");
          // res.setHeader("Access-Control-Allow-Methods","PUT, POST, GET, DELETE, PATCH, OPTIONS");

          let isAuthorized = false;
          let accessTokenStr = (req.params && req.params.access_token) || (req.query && req.query.access_token);
          if(typeof oAuth2Server === 'object'){          
            let accessToken = oAuth2Server.collections.accessToken.findOne({accessToken: accessTokenStr})

            if(get(Meteor, 'settings.private.trace') === true) { console.log('accessToken', accessToken); }

            if(accessToken){
              isAuthorized = true;
            } else if(accessTokenStr === containerAccessToken){
              isAuthorized = true;
            }
          }

          if (isAuthorized || process.env.NOAUTH || get(Meteor, 'settings.private.fhir.disableOauth') || get(Meteor, 'settings.private.fhir.rest.' + routeResourceType + '.disableOauth')) {
            let resourceRecords = [];

            if (req.params.param.includes('_search')) {
              let searchLimit = 1;
              if (get(req, 'query._count')) {
                searchLimit = parseInt(get(req, 'query._count'));
              }

              let databaseQuery = RestHelpers.generateMongoSearchQuery(req.query, routeResourceType);
              if(get(Meteor, 'settings.private.debug') === true) { console.log('Collections[collectionName].databaseQuery', databaseQuery); }

              resourceRecords = Collections[collectionName].find(databaseQuery, {limit: searchLimit}).fetch();

              let payload = [];

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
          // } else {
          //   // no oAuth server installed; Not Implemented
          //   JsonRoutes.sendResult(res, {
          //     code: 501
          //   });
          // }
        });

        JsonRoutes.add("get", "/" + fhirPath + "/" + routeResourceType + ":param", function (req, res, next) {
          if(get(Meteor, 'settings.private.debug') === true) { console.log('-----------------------------------------------------------------------------'); }
          if(get(Meteor, 'settings.private.debug') === true) { console.log('GET /' + fhirPath + '/' + routeResourceType + '?' + JSON.stringify(req.query)); }
          if(get(Meteor, 'settings.private.debug') === true) { console.log('params', req.params); }

          let isAuthorized = false;
          let accessTokenStr = (req.params && req.params.access_token) || (req.query && req.query.access_token);
          if(typeof oAuth2Server === 'object'){
            let accessToken = oAuth2Server.collections.accessToken.findOne({accessToken: accessTokenStr})

            if(get(Meteor, 'settings.private.trace') === true) { console.log('accessToken', accessToken); }

            if(accessToken){
              isAuthorized = true;
            } else if(accessTokenStr === containerAccessToken){
              isAuthorized = true;
            }
          }

          if (isAuthorized || process.env.NOAUTH || get(Meteor, 'settings.private.fhir.disableOauth') || get(Meteor, 'settings.private.fhir.rest.' + routeResourceType + '.disableOauth')) {

            let resourceRecords = [];

            if (req.params.param.includes('_search')) {
              let searchLimit = 1;
              if (get(req, 'query._count')) {
                searchLimit = parseInt(get(req, 'query._count'));
              }
              let databaseQuery = RestHelpers.generateMongoSearchQuery(req.query, routeResourceType);
              if(get(Meteor, 'settings.private.debug') === true) { console.log('Generated the following query for the ' + routeResourceType + ' collection.', databaseQuery); }

              resourceRecords = Collections[collectionName].find(databaseQuery, {limit: searchLimit}).fetch();

              let payload = [];

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
          // } else {
          //   // no oAuth server installed; Not Implemented
          //   JsonRoutes.sendResult(res, {
          //     code: 501
          //   });
          // }
        });
      }
    }
  });

  console.log('FHIR Server is online.');
}