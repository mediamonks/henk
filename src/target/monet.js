const validateActionInput = require('../util/validateActionInput');
const validateRelativeUrls = require('../util/validate/validateRelativeUrls');
const validateNotEmpty = require('../util/validate/validateNotEmpty');
const Uploader = require('s3-batch-upload').default;
const opener = require('opener');

module.exports = {
  questions: [],
  async action(data) {
    console.log(`go to https://monet.netflix.com`);

    opener(`https://monet.netflix.com`);
  },
};
