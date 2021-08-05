const Flashtalking = require('../util/Flashtalking')
const validateActionInput = require('../util/validateActionInput');
const validateNotEmpty = require('../util/validate/validateNotEmpty');
const validateEmail = require('../util/validate/validateEmail');
const inquirer = require('inquirer');
const Filenames = require('../data/Filenames');
const fs = require('fs-extra');
const path = require('path');

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

    //const auth = 'Basic ' + new Buffer(data.accountEmail+':'+data.accountPassword).toString('base64');
    const auth = 'Basic ' + new Buffer.from(data.accountEmail+':'+data.accountPassword).toString('base64');

    const ft_api = new Flashtalking(auth);
    const filepathRc = `./${Filenames.RC}`;
    const inputDir = `./${data.inputDir}`;

    // TO DO: Validate login with API?

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


      let rcData = await fs.readJson(filepathRc);
      const overwriteIndex = rcData.uploadConfigs.findIndex(config => config.type === data.type);
      rcData.uploadConfigs[overwriteIndex] = data;
      await fs.writeJson(filepathRc, rcData);
    }

    const files = await fs.readdir(inputDir)
    const zipFiles = files.filter(filename => filename.substr(filename.length-4, filename.length) === '.zip');

    //console.log(zipFiles)

    for (const filename of zipFiles) {
      const filepath = inputDir + '/' + filename;

      console.log('uploading ' + filepath)
      const uploadResult = await ft_api.uploadCreative(data.libraryId, filepath, {
        overwriteExistingImages: true
      });

      if (uploadResult.status === 200 && uploadResult.data) {
        console.log('Success! creative ID = ' + uploadResult.data.id);
      }

      else {
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

    console.log("Finished uploading!")
  },
};
