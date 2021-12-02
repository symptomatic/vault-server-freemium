Package.describe({
    name: 'symptomatic:vault-server-freemium',
    version: '6.4.7',
    summary: 'Add oauth2 server support to your Meteor on FHIR application.',
    git: 'https://github.com/clinical-meteor/fhir-vault-server'
});

Package.onUse(function(api) {
    api.versionsFrom('1.0');

    // core build
    api.use('meteor@1.9.3');
    api.use('webapp@1.10.0');
    api.use('ddp@1.4.0');
    api.use('livedata@1.0.18');
    api.use('es5-shim@4.8.0');
    api.use('ecmascript@0.15.0');

    api.use('check', 'server');
    api.use('meteorhacks:async@1.0.0', 'server');

    // database drivers, data cursors
    api.use('mongo');
    api.use('aldeed:collection2@3.0.0');
    api.use('matb33:collection-hooks@1.0.1');
    api.use('clinical:extended-api@2.5.0');

    // FHIR data layer
    api.use('simple:json-routes@2.1.0');
    api.use('clinical:hl7-resource-datatypes@4.0.5');
    api.use('clinical:hl7-fhir-data-infrastructure');

    // REST Endpoints
    api.addFiles('FhirServer/Core.js', 'server');
    api.addFiles('FhirServer/Metadata.js', 'server');    

    // DDP autopublish 
    api.addFiles('lib/Collections.js');
});

Npm.depends({
    "faker": "5.1.0",
    "express": "4.13.4",
    "body-parser": "1.14.2",
});
