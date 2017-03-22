'use strict';

// Dependencies
const AWS = require('aws-sdk');
const _ = require('lodash');


// Export
module.exports = function(awsSettings, module_options) {

  var options;
  var defaultOptions = {
    useIniCredentials: false,
    defaultIniProfileAllowed: true,

    settingsMap: { //TODO transform awsSettings object according to map in module behavior options
      profile: "profile",
      region: "region",
      accessKeyId: "key_id",
      secretAccessKey: "key"
    },

    useProcessEnv: true,
    mapProcessEnv: false,
    processEnvMap: {
      accessKeyId: "AWS_ACCESS_KEY_ID",
      secretAccessKey: "AWS_SECRET_ACCESS_KEY",
      profile: "AWS_PROFILE",
      region: "AWS_REGION"
    },

    need: {
      dynamodb: true,
      lambda: true
    },

    dynamodbAgent: true,
    maxSockets: 50,
    sslEnabled: false
  };

  // configurable module behavior options
  if (module_options) options = _.merge(defaultOptions, module_options);

  // settings for AWS
  var settings;

  const transform = function (map, object) {
    // resolve a variable map into values
      return _.mapKeys(object, function (value, key) {
          return (map[key])? map[key] : key;
    })
  };

  if (awsSettings) {
    const map = _.invert(options.settingsMap);
    settings = transform(map, awsSettings);
  } else {
    settings = {};
  }

  if (options.useProcessEnv) {
    if (options.mapProcessEnv) {
      const map = _.invert(options.processEnvMap);
      // override settings from awsSettings object based on process env
      settings = _.merge(settings, _.pick(transform(map, process.env), Object.keys(options.processEnvMap)));
    }
    AWS.config.update(settings);
  } else if (!settings.accessKeyId && !settings.secretAccessKey) {
  // initialize AWS based on configurable module options
    if (options.useIniCredentials) {
      if (!options.defaultIniProfileAllowed && !settings.profile) throw new Error("Error initializing AWS: profile not specified");

      AWS.config.credentials = new AWS.SharedIniFileCredentials(settings);
    } else throw new Error("Error initializing AWS: unusable module configuration");
  }

  // Region update
  AWS.config.region = settings.region;

  // construct AWS object
  var result = {};

  if (options.need.dynamodb) {

    var dynamoAgent;
    if (options.dynamodbAgent)
      if (options.sslEnabled) {
        const https = require('https');
        // http agent for AWS services
        dynamoAgent = new https.Agent({
          maxSockets: options.maxSockets,
        });
      } else {
        const http = require('http');
      }

    const dynamodb = new AWS.DynamoDB({
      sslEnabled: options.sslEnabled,
      httpOptions: {
        agent: dynamoAgent,
      },
    });

    result.dynamodb = dynamodb;
  }

  if (options.need.lambda) {
    const lambda = new AWS.Lambda();
    result.lambda = lambda;
  }

  return result;
};
