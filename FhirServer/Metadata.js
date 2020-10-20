import { get, has } from 'lodash';
import { Meteor } from 'meteor/meteor';

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
          "security": {
            "service": [],
            "extension": []
          },
          "resource": []
      }]
    };

    if(get(Meteor, 'settings.private.fhir.disableOauth') !== true){
      CapabilityStatement.rest[0].security.service.push({
        text: "OAuth"
      })
      CapabilityStatement.rest[0].security.extension.push({
        "url": "http://fhir-registry.smarthealthit.org/StructureDefinition/oauth-uris",
        "extension": [{
          "url": "token",
          "valueUri": Meteor.absoluteUrl() + "oauth/token"
        }, {
          "url": "authorize",
          "valueUri": Meteor.absoluteUrl() + "oauth"
        }]
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
});


Meteor.methods({
  getMetadata(){
    return Server.getCapabilityStatement();
  }
});
