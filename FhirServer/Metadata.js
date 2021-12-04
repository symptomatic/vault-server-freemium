import { get, has } from 'lodash';
import { Meteor } from 'meteor/meteor';
import { MeRandomteor } from 'meteor/random';

let fhirPath = get(Meteor, 'settings.private.fhir.fhirPath');

let defaultInteractions = [{
  "code": "read"
}];

let defaultSearchParams = [
  {
    "name": "_id",
    "type": "token",
    "documentation": "_id parameter always supported."
  },
  {
    "name": "identifier",
    "type": "token",
    "documentation": "this should be the medical record number"
  }]

const Server = {
  getCapabilityStatement: function(){
    var CapabilityStatement = {
      "resourceType": "CapabilityStatement",
      "url": Meteor.absoluteUrl() + get(Meteor, 'settings.private.fhir.fhirPath'),
      "name": get(Meteor, 'settings.public.title'),
      "version": get(Meteor, 'settings.public.version'),
      "status": "draft",
      "experimental": true,
      "publisher": "Symptomatic, LLC",
      "kind": "capability",
      "date": new Date(),
      "contact": get(Meteor, 'settings.public.contact'),
      "software": {
        "version" : "6.1.0",
        "name" : "Vault Server",
        "releaseDate" : new Date()
      },
      "fhirVersion": get(Meteor, 'settings.public.fhirVersion'),
      "format": [
        "json"
      ],
      "rest": [{
          "mode": "server",
          "resource": []
      }]
    };

    // let oAuthServerRunning = false;
    // if(oAuthServerRunning){
    //   CapabilityStatement.security = {
    //     "service": [],
    //   };
    // }


    if(get(Meteor, 'settings.private.fhir.disableOauth') !== true){
      CapabilityStatement.rest[0].security = {
        "service": [],
        "extension": []
      };
      CapabilityStatement.rest[0].security.service.push({
        "coding": [
          {
            "system": "http://hl7.org/fhir/restful-security-service",
            "code": "SMART-on-FHIR"
          }
        ],
        "text": "OAuth2 using SMART-on-FHIR profile (see http://docs.smarthealthit.org)"
      })

      

      CapabilityStatement.rest[0].security.extension.push({
        "extension": [
          {
            "url": "token",
            "valueUri": Meteor.absoluteUrl() + get(Meteor, 'settings.private.fhir.security.tokenEndpoint', "oauth/token") 
          },
          {
            "url": "authorize",
            "valueUri": Meteor.absoluteUrl() + get(Meteor, 'settings.private.fhir.security.authorizationEndpoint', "oauth/authorize") 
          },
          {
            "url": "register",
            "valueUri": Meteor.absoluteUrl() + get(Meteor, 'settings.private.fhir.security.registrationEndpoint', "oauth/registration") 
          },
          {
            "url": "manage",
            "valueUri": Meteor.absoluteUrl() + get(Meteor, 'settings.private.fhir.security.manageEndpoint', "authorizations/manage")
          },
          {
            "url": "introspect",
            "valueUri": Meteor.absoluteUrl() + get(Meteor, 'settings.private.fhir.security.introspectEndpoint', "authorizations/introspect")
          },
          {
            "url": "revoke",
            "valueUri": Meteor.absoluteUrl() + get(Meteor, 'settings.private.fhir.security.revokeEndpoint', "authorizations/revoke")
          }
        ],
        "url": "http://fhir-registry.smarthealthit.org/StructureDefinition/oauth-uris"
      })
    }
    
    if (has(Meteor, 'settings.private.fhir.rest')) {
      Object.keys(Meteor.settings.private.fhir.rest).forEach(function(key){
        let newResourceStatement = {
          "type": key,
          "interaction": defaultInteractions,
          // "readHistory": false,
          // "updateCreate": false,
          // "conditionalCreate": false,
          // "conditionalUpdate": false,
          // "conditionalDelete": "not-supported"
          // "searchParam": defaultSearchParams
        }

        if (Array.isArray(Meteor.settings.private.fhir.rest[key].interactions)) {
          newResourceStatement.interaction = [];
          Meteor.settings.private.fhir.rest[key].interactions.forEach(function(item){
            newResourceStatement.interaction.push({
              "code": item
            })
          })
        }

        if (Array.isArray(Meteor.settings.private.fhir.rest[key].interactions)) {
          newResourceStatement.interaction = [];
          Meteor.settings.private.fhir.rest[key].interactions.forEach(function(item){
            newResourceStatement.interaction.push({
              "code": item
            })
          })
        }


        CapabilityStatement.rest[0].resource.push(newResourceStatement);
      })      
    }
    return CapabilityStatement;
  },
  getWellKnownSmartConfiguration: function(){
    let response = {
      "resourceType": "Basic",
      
      // required fields
      "authorization_endpoint": Meteor.absoluteUrl() + get(Meteor, 'settings.private.fhir.security.authorizationEndpoint', "oauth/authorize"),
      "token_endpoint":  Meteor.absoluteUrl() + get(Meteor, 'settings.private.fhir.security.tokenEndpoint', "oauth/token") ,
      "capabilities": "http://localhost:3000/",

      // optional fields
      "scopes_supported": "",
      "response_types_supported": "",
      "management_endpoint": Meteor.absoluteUrl() + get(Meteor, 'settings.private.fhir.security.revokeEndpoint', "authorizations/manage"),
      "introspection_endpoint": Meteor.absoluteUrl() + get(Meteor, 'settings.private.fhir.security.revokeEndpoint', "authorizations/introspect"),
      "registration_endpoint": Meteor.absoluteUrl() + get(Meteor, 'settings.private.fhir.security.registrationEndpoint', "oauth/registration"),
      "revocation_endpoint": Meteor.absoluteUrl() + get(Meteor, 'settings.private.fhir.security.revokeEndpoint', "authorizations/revoke"),

      // custom fields
      "message": "smart config!"
    }

    return response;
  }
}

Meteor.startup(function() {
  console.log('========================================================================');
  console.log('Generating CapabilityStatement of current configuration...');
  console.log(Server.getCapabilityStatement());
  console.log('========================================================================');

  JsonRoutes.add("get", fhirPath + "/metadata", function (req, res, next) {
    console.log('GET ' + fhirPath + '/metadata');

    res.setHeader('Content-type', 'application/json');
    res.setHeader("Access-Control-Allow-Origin", "*");

    let returnPayload = {
      code: 200,
      data: Server.getCapabilityStatement()
    }
    if(process.env.TRACE){
      console.log('return payload', returnPayload);
    }
   
    JsonRoutes.sendResult(res, returnPayload);
  });

  JsonRoutes.add("get", "/metadata", function (req, res, next) {
    console.log('GET ' + '/metadata');

    res.setHeader('Content-type', 'application/json');
    res.setHeader("Access-Control-Allow-Origin", "*");

    let returnPayload = {
      code: 200,
      data: Server.getCapabilityStatement()
    }
    if(process.env.TRACE){
      console.log('return payload', returnPayload);
    }
   
    JsonRoutes.sendResult(res, returnPayload);
  });


  JsonRoutes.add("get", "/.well-known/smart-configuration", function (req, res, next) {
    console.log('GET ' + '/.well-known/smart-configuration');

    res.setHeader('Content-type', 'application/json');
    res.setHeader("Access-Control-Allow-Origin", "*");

    let returnPayload = {
      code: 200,
      data: Server.getWellKnownSmartConfiguration()
    }
    if(process.env.TRACE){
      console.log('return payload', returnPayload);
    }
   
    JsonRoutes.sendResult(res, returnPayload);
  });

  JsonRoutes.add("post", "/oauth/registration", function (req, res, next) {
    console.log('POST ' + '/oauth/registration');

    res.setHeader('Content-type', 'application/json');
    res.setHeader("Access-Control-Allow-Origin", "*");

    let returnPayload = {
      code: 201,
      data: {
        "message": 'registration',
        "client_id": Random.id(),
        "scope": "launch%2Fpatient%20patient%2FObservation.rs%20patient%2FPatient.rs%20offline_access&"
      }
    }
    if(process.env.TRACE){
      console.log('return payload', returnPayload);
    }
   
    JsonRoutes.sendResult(res, returnPayload);
  });
  JsonRoutes.add("get", "/oauth/token", function (req, res, next) {
    console.log('GET ' + '/oauth/token');

    res.setHeader('Content-type', 'application/json');
    res.setHeader("Access-Control-Allow-Origin", "*");

    let returnPayload = {
      code: 200,
      data: {
        "message": 'token'
      }
    }
    if(process.env.TRACE){
      console.log('return payload', returnPayload);
    }
   
    JsonRoutes.sendResult(res, returnPayload);
  });
  JsonRoutes.add("get", "/oauth/authenticate", function (req, res, next) {
    console.log('GET ' + '/oauth/authenticate');

    res.setHeader('Content-type', 'application/json');
    res.setHeader("Access-Control-Allow-Origin", "*");

    let returnPayload = {
      code: 200,
      data: {
        "message": 'authenticate'
      }
    }
    if(process.env.TRACE){
      console.log('return payload', returnPayload);
    }
   
    JsonRoutes.sendResult(res, returnPayload);
  });
});




Meteor.methods({
  getMetadata(){
    return Server.getCapabilityStatement();
  }
});
