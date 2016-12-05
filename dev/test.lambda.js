var awshelper = require('../src/aws');

var aws = awshelper(
  {
    //profile: 'swift-smartline',
    region: 'eu-west-1'
  },
  {
    need: {
      dynamodb:true
    },
    useIniCredentials: false
  }
);

console.log(aws);