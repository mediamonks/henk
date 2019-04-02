const validateActionInput = require('../util/validateActionInput');
const validateRelativeUrls = require('../util/validate/validateRelativeUrls');
const uuid = require('uuid/v4');
const opener = require('opener');
const Uploader = require('s3-batch-upload').default;
const fs = require('fs-extra');

const s3 = require('./s3');

const preview = {
  questions: [...s3.questions.filter(question => question.name !== 'outputDir')],
  async action(data) {
    if (!data.outputDir) {
      data.outputDir = `${uuid()}/`;
    }

    await fs.writeJson('./.henkrc', data);

    validateActionInput(data, this.questions);

    await new Uploader({
      config: './.henkrc', // can also use environment variables
      bucket: data.bucket,
      localPath: `${data.inputDir}`,
      remotePath: `${data.outputDir}/`,
      glob: '*.*', // default is '*.*'
      concurrency: '200', // default is 100
      dryRun: false, // default is false
      // cacheControl: 'max-age=300', // can be a string, for all uploade resources
      cacheControl: {
        // or an object with globs as keys to match the input path
        // '**/settings.json': 'max-age=60', // 1 mins for settings, specific matches should go first
        // '**/*.json': 'max-age=300', // 5 mins for other jsons
        '**/*.*': 'max-age=60', // 1 hour for everthing else
      },
    }).upload();

    console.log(`go to http://${data.bucket}.s3.amazonaws.com/${data.outputDir}index.html`);

    opener(`http://${data.bucket}.s3.amazonaws.com/${data.outputDir}index.html`);
  },
};

module.exports = preview;
