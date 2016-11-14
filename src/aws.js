'use strict';

// Dependencies
const AWS = require('aws-sdk');
const _ = require('lodash');
const merge = require('lodash/fp/merge');


// Export
module.exports = function(awsSettings, module_options) {

  var options;
  var defaultOptions = {
    useIniCredentials: false,
    defaultIniProfileAllowed: true,

    settingsMap: { //TODO transform awsSettings object according to map in module behavior options
      profile: "profile",
      region: "region",
      key_id: "key_id",
      key: "key"
    },

    useProcessEnv: true,
    mapProcessEnv: false,
    processEnvMap: {
      key_id: "AWS_ACCESS_KEY_ID",
      key: "AWS_SECRET_ACCESS_KEY",
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
  if (module_options) options = merge(defaultOptions, module_options);

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

  if (options.useProcessEnv && options.mapProcessEnv) {
    const map = _.invert(options.processEnvMap);

    // override settings from awsSettings object based on process env
    merge(settings,_.pick(
        transform(map, process.env),
        Object.keys(options.processEnvMap)
      )
    );
  }

  // initialize AWS based on configurable module options
  if (!settings.key_id && !settings.key) {
    if (options.useIniCredentials) {
      if (!options.defaultIniProfileAllowed && !settings.profile)
        throw new Error("Error initializing AWS: profile not specified");

      AWS.config.credentials = new AWS.SharedIniFileCredentials(settings);

    } else
      throw new Error("Error initializing AWS: unusable module configuration");
  } else if (options.mapProcessEnv) {
    AWS.config.update({
      accessKeyId: settings.key_id,
      secretAccessKey: settings.key
    });
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
