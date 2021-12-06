import { get, has } from 'lodash';
import moment from 'moment';

export const RestHelpers = {
    fhirVersion: 'fhir-3.0.0',
    disableOauth: true,
    isDebug: process.env.DEBUG || true,
    isTrace: process.env.TRACE,
    noAuth: process.env.NOAUTH,
    logging: function(req, route){
        if(this.isDebug){
            console.log(route + get(req, 'params.id'));
        }
        if(this.isTrace){
            console.log(req);
        }
    },
    setHeaders: function(res){
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader("content-type", "application/fhir+json; charset=utf-8");
    },  
    setAdditionalHeadersForResponses: function(res){
      res.setHeader("Last-Modified", new Date());
      res.setHeader("ETag", "3.0.0");
    },  
  // this is temporary fix until PR 132 can be merged in
    // https://github.com/stubailo/meteor-rest/pull/132
    sendResult: function (res, options) {
        options = options || {};
      
        // Set status code on response
        res.statusCode = options.code || 200;
      
        // Set response body
        if (options.data !== undefined) {
          var shouldPrettyPrint = (process.env.NODE_ENV === 'development');
          var spacer = shouldPrettyPrint ? 2 : null;
          res.setHeader('Content-type', 'application/fhir+json; charset=utf-8');
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
    },
    oauthServerCheck: function(req){
      if(typeof oAuth2Server !== 'object'){
        // no oAuth server installed; Not Implemented
        JsonRoutes.sendResult(res, {
          code: 501
        });  
      }
    },
    returnPostResponseAfterAccessCheck: function(req, res, callback){
      var accessTokenStr = get(req, 'params.access_token') || get(req, 'query.access_token');
      var accessToken = oAuth2Server.collections.accessToken.findOne({accessToken: accessTokenStr});
  
      if (accessToken || this.noAuth || this.disableOauth) {
  
        if (accessToken) {
          isTrace && console.log('accessToken', accessToken);
          isTrace && console.log('accessToken.userId', accessToken.userId);
        }
  
        let filter = RestHelpers.generateFilter(req);
        let pagination = RestHelpers.generatePagination(req);
      
        callback(req, res, filter, pagination);

      } else {
        // Unauthorized
        JsonRoutes.sendResult(res, {
          code: 401
        });
      }
    },
    returnGetResponseAfterAccessCheck: function(req, res, callback){
      var accessTokenStr = get(req, 'params.access_token') || get(req, 'query.access_token');
      var accessToken = oAuth2Server.collections.accessToken.findOne({accessToken: accessTokenStr});
  
      if (accessToken || this.noAuth || this.disableOauth) {
  
        if (accessToken) {
          isTrace && console.log('accessToken', accessToken);
          isTrace && console.log('accessToken.userId', accessToken.userId);
        }
      
        let dataPayload = callback(req, res);
  
        if (dataPayload) {
  
          // Success
          JsonRoutes.sendResult(res, {
            code: 200,
            data: dataPayload
          });
        } else {
          // Gone
          JsonRoutes.sendResult(res, {
            code: 204
          });
        }
      } else {
        // Unauthorized
        JsonRoutes.sendResult(res, {
          code: 401
        });
      }
    },
    generateFilter: function(req){
      let filter = {};
      if(get(req, 'query.filter')){
        filter = JSON.parse(get(req, 'query.filter'));
      } 
      return filter;
    },
    generatePagination: function(req){
      let sort = {};
      let page = 1;
      let items_per_page = 25;
  
      if(get(req, 'query.page')){
        page = get(req, 'query.page');
      } 
      
      if(get(req, 'query.items_per_page')){
        items_per_page = get(req, 'query.items_per_page');
      } 
    
      if(get(req, 'query.sort')){
        sort[get(req, 'query.sort')] = 1;
      } 
  
      return {
        limit: items_per_page,
        sort: sort,
        skip: (page > 0 ? (page - 1) * items_per_page : 0)
      }
    },
    toMongo: function(originalResource) {

      // when saving to Mongo

      // first we convert dates from on-the-wire HL7 dates to Mongo/Unix Date objects
      if (Array.isArray(originalResource.identifier)) {
        originalResource.identifier.forEach(function(identifier){
          if (identifier.period) {
            if (identifier.period.start) {
              identifier.period.start = new Date(moment(identifier.period.start));
            }
            if (identifier.period.end) {
              identifier.period.end = new Date(moment(identifier.period.end));
            }
          }
        });
      }

      if (get(originalResource, 'date')) {
        originalResource.date = new Date(moment(originalResource.date));
      }
      if (get(originalResource, 'period.start')) {
        originalResource.period.start = new Date(moment(get(originalResource, 'period.start')));
      }
      if (get(originalResource, 'period.end')) {
        originalResource.period.start = new Date(moment(get(originalResource, 'period.start')));
      }

      // // Then we make sure objects have appropriate data type elements attached
      // if (originalResource.telecom && originalResource.telecom[0]) {
      //   originalResource.telecom.forEach(function(telecom){
      //     telecom.resourceType = "ContactPoint";
      //   });
      // }
    
      // if (originalResource.address && !originalResource.address.resourceType) {
      //   originalResource.address.resourceType = "Address";
      // }

      // $near support
      // https://github.com/AudaciousInquiry/fhir-saner/issues/23#issuecomment-604809705
      // but https://covid19-under-fhir.smilecdr.com/baseR4/Location?_id=Loc-Org-7313&near=-66.85|18.03|5000|km doesn't find it.
      if (has(originalResource, 'position')) {

        if(!has(originalResource, '_location')){
          originalResource._location = {
            latitude: get(originalResource, 'position.latitude', null),
            longitude: get(originalResource, 'position.longitude', null)
          }
        }
      }
    
      return originalResource;
    },
    prepForUpdate: function (record) {
      process.env.TRACE && console.log("RestHelpers.prepForUpdate()");  
    
      // if (Array.isArray(record.name)) {
      //   //console.log("record.name", record.name);    
      //   record.name.forEach(function(name){
      //     name.resourceType = "HumanName";
      //   });
      // }
    
      // if (Array.isArray(record.telecom)) {
      //   //console.log("record.telecom", record.telecom);
      //   record.telecom.forEach(function(telecom){
      //     telecom.resourceType = "ContactPoint";
      //   });
      // }
    
      // if (Array.isArray(record.address)) {
      //   //console.log("record.address", record.address);
      //   record.address.forEach(function(address){
      //     address.resourceType = "Address";
      //   });
      // }
    
      // if (Array.isArray(record.contact)) {
      //   //console.log("record.contact", record.contact);
      //   record.contact.forEach(function(contact){
      //     if (contact.name) {
      //       contact.name.resourceType = "HumanName";
      //     }
    
      //     if (contact.telecom && contact.telecom[0]) {
      //       contact.telecom.forEach(function(telecom){
      //         telecom.resourceType = "ContactPoint";
      //       });
      //     }
    
      //   });
      // }

      if(get(record, 'meta')){
        record.meta.lastUpdated = new Date();
      } else {
        record.meta = {
          lastUpdated: new Date(),
          versionId: "1"
        }
      }
    
      return record;
    },
    
    prepForFhirTransfer: function (response) {
      process.env.TRACE && console.log("RestHelpers.prepForFhirTransfer()");  

      // Can't have undscores and internal references in resources that go over the wire
      // https://www.hl7.org/fhir/json.html#primitive

      if(has(response, '_id')){
        delete response._id;
      }
      if(has(response, '_document')){
        delete response._document;
      }
      if(has(response, '_location')){
        delete response._location;
      }
      if(has(response, 'meta._lastUpdated')){
        delete response.meta._lastUpdated;
      }
      
      // FHIR has complicated and unusual rules about dates in order
      // to support situations where a family member might report on a response's
      // date of birth, but not know the year of birth; and the other way around
      if (response.birthDate) {
        response.birthDate = moment(response.birthDate).format("YYYY-MM-DD");
      }

      if (Array.isArray(response.name)) {
        response.name.forEach(function(name){
          delete name.resourceType;
        });
      }

      if (Array.isArray(response.telecom)) {
        //console.log("response.telecom", response.telecom);
        response.telecom.forEach(function(telecom){
          delete telecom.resourceType;
        });
      }

      if (Array.isArray(response.address)) {
        //console.log("response.address", response.address);
        response.address.forEach(function(address){
          delete address.resourceType;
        });
      } else if(has(response, 'address')){        
        delete response.address.resourceType;
      }

      if (Array.isArray(response.contact)) {
        //console.log("response.contact", response.contact);

        response.contact.forEach(function(contact){

          console.log("contact", contact);


          if (contact.name && contact.name.resourceType) {
            //console.log("response.contact.name", contact.name);
            delete contact.name.resourceType;
          }

          if (Array.isArray(contact.telecom)) {
            contact.telecom.forEach(function(telecom){
              delete telecom.resourceType;
            });
          }

          if (Array.isArray(contact.address)) {
            contact.address.forEach(function(address){
              delete address.resourceType;
            });
          } else {
            delete contact.address.resourceType;
          }

        });
      }

      return response;
    },
    generateDatabaseQuery: function(query, resourceType){
      return RestHelpers.generateMongoSearchQuery(query, resourceType)
    },
    generateMongoSearchQuery: function(query, resourceType){
      process.env.DEBUG && console.log("RestHelpers.generateMongoSearchQuery.urlQueryString", query, resourceType);
    
      var databaseQuery = {};
    
      if (get(query, '_id')) {
        // databaseQuery['_id'] = get(query, '_id')

        // this is an idiosyncracy, but is correct to the FHIR spec
        // confirm: Y/n
        databaseQuery['id'] = get(query, '_id')
      }

      // $near support
      // https://github.com/AudaciousInquiry/fhir-saner/issues/23#issuecomment-604809705
      // but https://covid19-under-fhir.smilecdr.com/baseR4/Location?_id=Loc-Org-7313&near=-66.85|18.03|5000|km doesn't find it.
      if (get(query, 'near')) {
        // databaseQuery['_near'] = get(query, '_near')

        let nearParams = get(query, 'near');
        let nearParamsArray = nearParams.split("|");

        let metersMaxDistance = 0;
        if (nearParamsArray[3] === "m"){
          metersMaxDistance = Number(nearParamsArray[2]);
        } else if(nearParamsArray[3] === "km"){
          metersMaxDistance = Number(nearParamsArray[2]) * 1000;
        } else if (nearParamsArray[3] === "mi"){
          metersMaxDistance = Number(nearParamsArray[2]) * 1.60934 * 1000;
        }        

        databaseQuery['_location'] = { $near: {
          $geometry: {
            type: 'Point',
            coordinates: [Number(nearParamsArray[1]), Number(nearParamsArray[0])]
          },
          // Convert [mi] to [km] to [m]
          $maxDistance: metersMaxDistance
        }}
      }

      // underscores are important here! 
      // idiosyncracies in the spec and implementation.
      if (get(query, '_lastUpdated')) {
        let lastUpdatedSearchString = get(query, '_lastUpdated');
        // console.log('lastUpdatedSearchString.substring(0,2)', lastUpdatedSearchString.substring(0,2))
        // console.log('lastUpdatedSearchString.substring(2)', lastUpdatedSearchString.substring(2))

        // /Location?_lastUpdated=gt2018-04-20T00:00:00.000Z
        if(['gt'].includes(lastUpdatedSearchString.substring(0,2))){
          databaseQuery['meta.lastUpdated'] = {
            $gt: new Date(lastUpdatedSearchString.substring(2))
          };  

        // /Location?_lastUpdated=ge2018-04-20T00:00:00.000Z
        } else if(['ge'].includes(lastUpdatedSearchString.substring(0,2))){
          databaseQuery['meta.lastUpdated'] = {
            $gte: new Date(lastUpdatedSearchString.substring(2))
          };  
        } else {
        // /Location?_lastUpdated=2018-04-20T00:00:00.000Z
        databaseQuery['meta.lastUpdated'] = {
            $gte: new Date(get(query, '_lastUpdated'))
          };  
        }
      }

     
      if (get(query, 'name')) {
        databaseQuery['name'] = {
          $regex: get(query, 'name'),
          $options: 'i'
        };
      }

      if (get(query, 'code')) {
        databaseQuery['code'] = {
          $regex: get(query, 'code'),
          $options: 'i'
        };
      }
      if (get(query, 'url')) {
        databaseQuery['url'] = {
          $regex: get(query, 'url'),
          $options: 'i'
        };
      }

      if (get(query, 'measure')) {
        databaseQuery['measure'] = {
          $regex: get(query, 'measure'),
          $options: 'i'
        };
      }
      if (get(query, 'reporter')) {
        databaseQuery['reporter.reference'] = {
          $regex: get(query, 'reporter'),
          $options: 'i'
        };
      }
      if (get(query, 'subject')) {
        databaseQuery['subject.reference'] = {
          $regex: get(query, 'subject'),
          $options: 'i'
        };
      }

      if (get(query, 'identifier')) {
        databaseQuery['identifier'] = {
          $elemMatch: {
            'value': get(query, 'identifier')
          }
        };
      }

      if (get(query, 'address')) {
        databaseQuery['address.city'] = {
          $regex: get(query, 'address', '')
        };
      }
      if (get(query, 'address-city')) {
        databaseQuery['address.city'] = {
          $regex: get(query, 'address-city')
        };
      }
      if (get(query, 'address-state')) {
        databaseQuery['address.state'] = {
          $regex: get(query, 'address-state')
        };
      }
      if (get(query, 'address-country')) {
        databaseQuery['address.country'] = {
          $regex: get(query, 'address-country')
        };
      }
      if (get(query, 'address-postalcode')) {
        databaseQuery['address.postalCode'] = {
          $regex: get(query, 'address-postalcode')
        };
      }
      if (get(query, 'address-use')) {
        databaseQuery['address.use'] = {
          $regex: get(query, 'address-use')
        };
      }

      let resourceTimeIndex = 'date';

      if(resourceType){
        switch (resourceType) {
          case "Observation":
            resourceTimeIndex = 'effectiveDateTime'
            break;        
        }
      }
    
      if (get(query, 'date')) {
        console.log('date.slice(0,2)', query.date.slice(0, 2))
        console.log('get.date.slice(0,2)', get(query, 'date').slice(0, 2))
        console.log('date.slice(0,2)',get(query, 'date').substring(2))

        // greater than
        if(get(query, 'date').slice(0, 2) === "gt"){
          databaseQuery[resourceTimeIndex] = {
            $gt: new Date(get(query, 'date').substring(2))
          };  

        // greater than or equal
        } else if(get(query, 'date').slice(0, 2) === "ge"){
          databaseQuery[resourceTimeIndex] = {
            $gte: new Date(get(query, 'date').substring(2))
          };  

        // less than
        } else if(get(query, 'date').slice(0, 2) === "lt"){
          databaseQuery[resourceTimeIndex] = {
            $lt: new Date(get(query, 'date').substring(2))
          };  

        // less than or equal
        } else if(get(query, 'date').slice(0, 2) === "le"){
          databaseQuery[resourceTimeIndex] = {
            $lte: new Date(get(query, 'date').substring(2))
          };  
        } else {
          // exact date
          databaseQuery = {$and: [
            {date: {$gte: new Date(moment(get(query, 'date')).format("YYYY-MM-DD"))}},
            {date: {$lte: new Date(moment(get(query, 'date')).add(1, 'day').format("YYYY-MM-DD"))}}
          ]}
        }
      }

      if (get(query, 'period')) {
        console.log('parsing the period search parameter', get(query, 'period').substring(2))
        if(get(query, 'period').slice(0, 2) === "gt"){
          databaseQuery['period.start'] = {
            $gt: new Date(get(query, 'period').substring(2))
          };  
        } else if(get(query, 'period').slice(0, 2) === "ge"){
          databaseQuery['period.start'] = {
            $gte: new Date(get(query, 'period').substring(2))
          };  
        } else if(get(query, 'period').slice(0, 2) === "lt"){
          databaseQuery['period.end'] = {
            $lt: new Date(get(query, 'period.end').substring(2))
          };  
        } else if(get(query, 'period').slice(0, 2) === "le"){
          databaseQuery['period.end'] = {
            $lte: new Date(get(query, 'period.end').substring(2))
          };  
        } else {
          databaseQuery['period.start'] = new Date(get(query, 'period'))
        }
      } 
    
      process.env.DEBUG && console.log('RestHelpers.generateMongoSearchQuery.jsonQueryObject', databaseQuery);
      return databaseQuery;
    }
  
  }

  export default RestHelpers;