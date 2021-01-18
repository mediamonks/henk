const Flashtalking = require('../util/Flashtalking')
const validateActionInput = require('../util/validateActionInput');
const validateNotEmpty = require('../util/validate/validateNotEmpty');
const validateEmail = require('../util/validate/validateEmail');
const inquirer = require('inquirer');
const Filenames = require('../data/Filenames');
const fs = require('fs-extra');
const path = require('path');

const Uploader = require('s3-batch-upload').default;
const opener = require('opener');

module.exports = {
  questions: [
    {
      type: 'input',
      name: 'accountEmail',
      message: 'email',
      errorMessage: 'Missing email',
      validate: validateEmail,
      required: true,
    },
    {
      type: 'password',
      name: 'accountPassword',
      message: 'password',
      validate: validateNotEmpty,
      errorMessage: 'Missing password',
      required: true,
    },
    {
      type: 'input',
      name: 'libraryId',
      message: 'Library ID (find in creative manager). leave empty to create new',
      errorMessage: 'Missing Library ID',
      required: false,
    }
  ],

  async action(data) {
    validateActionInput(data, this.questions);
    console.log(data.inputDir)

    const auth = 'Basic ' + new Buffer(data.accountEmail+':'+data.accountPassword).toString('base64');
    const ft_api = new Flashtalking(auth);
    const filepathRc = `./${Filenames.RC}`;
    const inputDir = `./${data.inputDir}`;

    if (data.libraryId === '') {
      // make new library
      const { libraryName } = await inquirer.prompt({
        type: 'input',
        name: 'libraryName',
        message: 'Library name?'
      });
      const { advertiserName } = await inquirer.prompt({
        type: 'input',
        name: 'advertiserName',
        message: 'Advertiser name?'
      });


      const library = await ft_api.createLibrary({
        advertiserName: advertiserName,
        name: libraryName,
        email: data.accountEmail
      });

      console.log('Created new library with id ' + library.id);
      data.libraryId = library.id;

      await fs.writeJson(filepathRc, data);
    }

    const files = await fs.readdir(inputDir)
    const zipFiles = files.filter(filename => filename.substr(filename.length-4, filename.length) === '.zip');
    //console.log(zipFiles)

    for (const filename of zipFiles) {
      // const contents = await fs.readFile(file, 'utf8');
      // console.log(contents);

      const filepath = inputDir + '/' + filename;

      console.log('uploading ' + filepath)
      const uploadResult = await ft_api.uploadCreative(data.libraryId, filepath, {
        overwriteExistingImages: true
      });

      //console.log(uploadResult)

      if (uploadResult.status === 200 && uploadResult.data) {
        console.log('Success! creative ID = ' + uploadResult.data.id);
      }

      else {
        //console.log('Upload failed due to error.');

        if (uploadResult.response) {

          if (uploadResult.response.status === 400 && uploadResult.response.data) {

            if (uploadResult.response.data.error === 101) { // creative with filename already exists
              console.log(uploadResult.response.data.errorMessage);

              console.log('Overwriting creative...')
              const overwriteResult = await ft_api.overwriteCreative(uploadResult.response.data.item.id, filepath, {
                overwriteExistingImages: true
              })

              if (overwriteResult.status === 200 && overwriteResult.data) {
                console.log('Success! creative ID = ' + overwriteResult.data.id);
              }
            }
          }
        }
      }
    }

    // await new Uploader({
    //   config: './.henkrc', // can also use environment variables
    //   bucket: data.bucket,
    //   localPath: `${data.inputDir}`,
    //   remotePath: `${data.outputDir}`,
    //   glob: '*.*', // default is '*.*'
    //   concurrency: '200', // default is 100
    //   dryRun: false, // default is false
    //   // cacheControl: 'max-age=300', // can be a string, for all uploade resources
    //   cacheControl: {
    //     // or an object with globs as keys to match the input path
    //     // '**/settings.json': 'max-age=60', // 1 mins for settings, specific matches should go first
    //     // '**/*.json': 'max-age=300', // 5 mins for other jsons
    //     '**/*.*': 'max-age=60', // 1 hour for everthing else
    //   },
    // }).upload();

    //console.log(`go to http://${data.bucket}.s3.amazonaws.com/${data.outputDir}`);

    console.log("Finished uploading!")
  },
};
