
import { Mongo } from 'meteor/mongo';
import { Meteor } from 'meteor/meteor';

import moment from 'moment';
import { get } from 'lodash';

import { FhirUtilities, AllergyIntolerances, AuditEvents, Bundles, Conditions, CarePlans, Devices, Immunizations, Medications, Observations, Organizations, Patients, Practitioners, Procedures, Questionnaires, QuestionnaireResponses, Tasks, ValueSets } from 'meteor/clinical:hl7-fhir-data-infrastructure';

if(Meteor.isClient){

  let defaultDate = get(Meteor, 'settings.public.bloomer.defaultDate', moment().format("YYYY-MM-DD"));

  if(get(Meteor, 'settings.public.fhirAutoSubscribe')){
    Meteor.subscribe('AllergyIntolerances');
    Meteor.subscribe('AuditEvents');
    Meteor.subscribe('Bundles');
    Meteor.subscribe('Conditions');
    Meteor.subscribe('Devices');
    Meteor.subscribe('CarePlans');
    Meteor.subscribe('Immunizations');
    Meteor.subscribe('Medications');
    Meteor.subscribe('Observations');
    Meteor.subscribe('Organizations');
    Meteor.subscribe('Patients');
    Meteor.subscribe('Practitioners');
    Meteor.subscribe('Procedures');
    Meteor.subscribe('Tasks');
    Meteor.subscribe('ValueSets');      
  }
}

if(Meteor.isServer){  
  if(get(Meteor, 'settings.private.fhir.autopublishSubscriptions')){
    Meteor.publish('AllergyIntolerances', function(){
        return AllergyIntolerances.find();
    });  
    Meteor.publish('AuditEvents', function(){
        return AuditEvents.find();
    });  
    Meteor.publish('Bundles', function(){
        return Bundles.find();
    });  
    Meteor.publish('CarePlans', function(){
        return CarePlans.find();
    });    
    Meteor.publish('Conditions', function(){
        return Conditions.find();
    });  
    Meteor.publish('Devices', function(){
        return Devices.find();
    });    
    Meteor.publish('Immunizations', function(){
        return Immunizations.find();
    });    
    Meteor.publish('Medications', function(){
        return Medications.find();
    }); 
    Meteor.publish('Observations', function(){
        return Observations.find();
    });    
    Meteor.publish('Organizations', function(){
        return Organizations.find();
    });    
    Meteor.publish('Patients', function(){
        return Patients.find();
    });   
    Meteor.publish('Practitioners', function(){
        return Practitioners.find();
    });    
    Meteor.publish('Procedures', function(){
        return Procedures.find();
    });   
    Meteor.publish('Tasks', function(){
        return Tasks.find();
    });   
    Meteor.publish('ValueSets', function(){
        return ValueSets.find();
    });    
  };
}