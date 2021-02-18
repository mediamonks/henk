const validateActionInput = require('../util/validateActionInput');
const validateNotEmpty = require('../util/validate/validateNotEmpty');
const validateEmail = require('../util/validate/validateEmail');
const DoubleClickStudio = require('../util/Doubleclick');
const inquirer = require('inquirer');
const Filenames = require('../data/Filenames');
const fs = require('fs-extra');
const path = require('path');
const Spinner = require('cli-spinner').Spinner;

module.exports = {

  questions: [
    {
      type: 'input',
      name: 'advertiserName',
      message: 'Advertiser name',
      required: true,
    },
    {
      type: 'input',
      name: 'campaignName',
      message: 'Campaign name',
      required: true,
    }
  ],

  async action(data) {
    //console.log(`go to https://www.google.com/doubleclick/studio/`);

    //console.log('logging in first if needed')

    if (!data.hasOwnProperty('cookies')) {

      const { proceedToLogin } = await inquirer.prompt({
        type: 'confirm',
        name: 'proceedToLogin',
        message: 'Looks like you\'re not logged in to Google yet. Would you like to log in now?'
      });

      if (proceedToLogin) {
        const dcLogin = new DoubleClickStudio({
          headless: false
        });
        await dcLogin.init();

        data.cookies = await dcLogin.login();
        await dcLogin.close();
      }

      else {
        return 'mahp mahp'
      }
    }

    else {
      console.log('Cookies found. Continuing to Studio.')
      // TODO: Should probably add validation for these cookies and check if not expired...
    }
    
    //logged in now presumably
    
    // see if advertiser exists
    const dc = new DoubleClickStudio({
      cookies: data.cookies,
      headless: true
    });

    await dc.init();

    const spinner = new Spinner('processing.. %s');
    spinner.setSpinnerString('/-\\|');


    // Find/Create advertiser
    console.log('Advertiser ' + data.advertiserName + ' - seeing if already stored in local henkrc file..')

    if (!data.advertiser) { // no advertiser object in henkrc file found
      console.log('Advertiser ' + data.advertiserName + ' - not in henkrc file, seeing if exists in Studio..')

      //spinner.start();
      data.advertiser = await dc.getAdvertiser(data.advertiserName);
      //spinner.stop();

      //if it doesn't exist on DC yet
      if (!data.advertiser) {
        const { createNewAdvertiser } = await inquirer.prompt({
          type: 'confirm',
          name: 'createNewAdvertiser',
          message: 'Advertiser ' + data.advertiserName + ' - doesn\'t exist yet. Should Henk create it now?'
        });

        if (!createNewAdvertiser) return ''

        console.log('Advertiser ' + data.advertiserName + ' - creating in Studio')
        data.advertiser = await dc.createAdvertiser(data.advertiserName);
        console.log('Advertiser ' + data.advertiserName + ' - created.')
      }
    }

    console.log('Advertiser ' + data.advertiserName + ' - selected. ID: ' + data.advertiser.advertiserId + ' & ownerId: ' + data.advertiser.ownerId)

    // Find/Create campaign
    console.log('Campaign ' + data.campaignName + ' - seeing if already stored in local henkrc file..')
    if (!data.campaign) {
      console.log('Campaign ' + data.campaignName + ' - not in henkrc file, seeing if exists in Studio..')
      data.campaign = await dc.getCampaign(data.advertiser, data.campaignName);

      if (!data.campaign) {
        const { createNewCampaign } = await inquirer.prompt({
          type: 'confirm',
          name: 'createNewCampaign',
          message: 'Campaign ' + data.campaignName + ' - doesn\'t exist yet. Should Henk create it now?'
        }); 
        
        if (!createNewCampaign) return ''

        console.log('Campaign ' + data.campaignName + ' - creating in Studio')
        data.campaign = await dc.createCampaign(data.advertiser, data.campaignName);
        console.log('Campaign ' + data.campaignName + ' - created.')
      }
    }
    console.log('Campaign ' + data.campaignName + ' - selected. ID: ' + data.campaign.campaignId)


    // Find/Create/Upload creatives
    const files = await fs.readdirSync(data.inputDir)
    const zipFiles = files.filter(filename => filename.substr(filename.length-4, filename.length) === '.zip');

    if (!data.creatives) data.creatives = [];

    for (const filename of zipFiles) {
      const creativeName = filename.substr(0, filename.indexOf('.html'))
      let creative;

      console.log('Creative ' + creativeName + ' - seeing if already stored in local henkrc file..')

      if (data.creatives) {

        const theIndex = data.creatives.findIndex(creative => creative.filename === filename);

        if (theIndex === -1) {
          console.log('Creative ' + creativeName + ' - not in henkrc file, seeing if exists in Studio..')
          creative = await dc.getCreative(data.campaign, creativeName);

          if (!creative) {
            console.log('Creative ' + creativeName + ' - doesn\'t exist yet. Henk will create one for you.')

            const { promptName } = await inquirer.prompt({
              type: 'input',
              name: 'promptName',
              message: 'Creative name?',
              default: creativeName
            });

            const { promptFormat } = await inquirer.prompt({
              type: 'list',
              name: 'promptFormat',
              message: 'Format?',
              choices: [
                { name: 'Inpage', value: 'INPAGE' },
                { name: 'Expanding', value: 'EXPANDING' },
              ]
            });

            const { promptWidth } = await inquirer.prompt({
              type: 'input',
              name: 'promptWidth',
              message: 'Width?'
            });

            const { promptHeight } = await inquirer.prompt({
              type: 'input',
              name: 'promptHeight',
              message: 'Height?'
            });

            creative = await dc.createCreative(data.advertiser, data.campaign, {
              name: promptName,
              width: promptWidth,
              height: promptHeight,
              format: promptFormat
            });

            // console.log('creative created.');
          }

          creative.format = 'INPAGE'; //need to sort this out
          creative.filename = filename;
          creative.path = filename;
          
          data.creatives.push(creative)
        }

        else {
          // console.log('Found a match in local henkrc.')
          creative = data.creatives[theIndex]
        }

        console.log('Creative ' + creative.name + ' - selected. Proceeding to upload.');


        //console.log('Uploading creative.')
        
        const upload = await dc.uploadCreative(data.advertiser, data.campaign, creative, data.inputDir);

        if (upload.data.sessionStatus) {
          // all good
          console.log('Creative ' + creative.name + ' - upload complete.');
        }

        else {
          if (upload.data.errorMessage) {
            console.log('Creative ' + creative.name + ' - Error uploading file: ' + upload.data.errorMessage.reason);
            console.log('Creative ' + creative.name + ' - Cancelling upload. Please check henkrc file for bad/old data or remove it and start over.');
          }
        }
      }

      else {
        
      }
    }
    
    
    console.log('Fetching preview url...');
    //spinner.start();
    const previewUrl = await dc.getPreviewUrl(data.advertiser, data.campaign);

    //spinner.stop();

    console.log(previewUrl)
    
    await dc.close();

    //write the new data object to the henkrc file
    let rcData = await fs.readJson(Filenames.RC); //read current data from file
    const overwriteIndex = rcData.uploadConfigs.findIndex(config => config.type === data.type); //figure our which object in the array to overwrite
    rcData.uploadConfigs[overwriteIndex] = data; //overwrite correct obj

    await fs.writeJson(Filenames.RC, rcData, {
      spaces: 2
    }); //write to file
  },
};