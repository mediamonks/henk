const validateActionInput = require('../util/validateActionInput');
const validateNotEmpty = require('../util/validate/validateNotEmpty');
const validateEmail = require('../util/validate/validateEmail');
const DoubleClickStudio = require('../util/Doubleclick');
const inquirer = require('inquirer');
const Filenames = require('../data/Filenames');
const fs = require('fs-extra');
const path = require('path');
const Spinner = require('cli-spinner').Spinner;
const chalk = require('chalk')


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

    const dc = new DoubleClickStudio();

    if (!data.hasOwnProperty('cookies')) {
      const { proceedToLogin } = await inquirer.prompt({
        type: 'confirm',
        name: 'proceedToLogin',
        message: 'Looks like you\'re not logged in to Google yet. Would you like to log in now?'
      });

      if (proceedToLogin) {
        data.cookies = await dc.login();
        //await dc.close();
      }

      else {
        return;
      }
    }

    else {
      console.log('User already logged in.')
      // TODO: Should probably add validation for these cookies and check if not expired...
    }

    dc.cookies = data.cookies;

    await writeToHenkrc(data);
    
    //logged in now presumably
    

    // Find/create advertiser
    let advertiser;
    console.log('Advertiser ' + data.advertiserName + ' - seeing if already stored in local henkrc file..')

    if (!data.advertiser) {
      console.log('Advertiser ' + data.advertiserName + ' - not in henkrc file, seeing if exists in Studio..')
      let advertisers = await dc.getAdvertiser(data.advertiserName);
      advertisers = advertisers.data.records;

      if (advertisers.length > 1) {
        const choices = advertisers.reduce(function(accumulator, currentValue) {
          return [...accumulator, {
            name: currentValue.name,
            value: currentValue
          }]
        }, []);

        const { advertiserSelect } = await inquirer.prompt({
          type: 'list',
          name: 'advertiserSelect',
          message: 'Advertiser ' + data.advertiserName + ' - Multiple records found. Please choose one.',
          choices: choices,
        });

        advertiser = advertiserSelect;
      }

      if (advertisers.length === 0) {
        const { createNewAdvertiser } = await inquirer.prompt({
          type: 'confirm',
          name: 'createNewAdvertiser',
          message: 'Advertiser ' + data.advertiserName + ' - doesn\'t exist yet. Should Henk create it now?'
        });
        if (!createNewAdvertiser) return ''

        console.log('Advertiser ' + data.advertiserName + ' - creating in Studio')
        const createAdvertiserRequest = await dc.createAdvertiser(data.advertiserName);


        advertiser = createAdvertiserRequest.data;
        console.log('Advertiser ' + advertiser.name + ' - created.')
      }

      if (advertisers.length === 1) {
        [ advertiser ] = advertisers;
      }

      data.advertiser = advertiser;
    }

    console.log('Advertiser ' + data.advertiser.name + ' - selected. ID: ' + data.advertiser.id)


    // Find/create campaign
    let campaign;
    console.log('Campaign ' + data.campaignName + ' - seeing if already stored in local henkrc file..')

    if (!data.campaign) {
      console.log('Campaign ' + data.campaignName + ' - not in henkrc file, seeing if exists in Studio..')
      let campaigns = await dc.getCampaign(data.advertiser, data.campaignName);
      campaigns = campaigns.data.records;

      if (campaigns.length > 1) {
        const choices = campaigns.reduce(function(accumulator, currentValue) {
          return [...accumulator, {
            name: currentValue.name,
            value: currentValue
          }]
        }, []);

        const { campaignSelect } = await inquirer.prompt({
          type: 'list',
          name: 'campaignSelect',
          message: 'Campaign ' + data.campaignName + ' - Multiple records found. Please choose one.',
          choices: choices,
        });

        campaign = campaignSelect;
      }

      if (campaigns.length === 0) {
        const { createNewCampaign } = await inquirer.prompt({
          type: 'confirm',
          name: 'createNewCampaign',
          message: 'Campaign ' + data.campaignName + ' - doesn\'t exist yet. Should Henk create it now?'
        });
        if (!createNewCampaign) return ''
        console.log('Campaign ' + data.campaignName + ' - creating in Studio')
        const createCampaignRequest = await dc.createCampaign(data.advertiser, data.campaignName);

        campaign = createCampaignRequest.data;
        console.log('Campaign ' + data.campaignName + ' - created.')
      }

      if (campaigns.length === 1) {
        [ campaign ] = campaigns;
      }

      data.campaign = campaign;
    }

    console.log('Campaign ' + data.campaign.name + ' - selected. ID: ' + data.campaign.id)


    // Find/Create creatives
    if (!data.creatives) data.creatives = []; // if the creatives array isn't yet in henkrc

    let creative;
    const files = await fs.readdirSync(data.inputDir)
    const zipFiles = files.filter(filename => filename.substr(filename.length-4, filename.length) === '.zip');

    for (const filename of zipFiles) {
      let creativeName = filename.substr(0, filename.indexOf('.zip')) // creative name is the filename without the .zip
      if (filename.indexOf('.html')) creativeName = creativeName.substr(0, creativeName.indexOf('.html')); // remove the .html part from the name if it's also there

      console.log('Filename ' + filename + ' - seeing if already stored in local henkrc file..')
      const theIndex = data.creatives.findIndex(creative => creative.filename === filename);

      if (theIndex === -1) {
        console.log('Filename ' + filename + ' - not in henkrc file, seeing if exists in Studio..')

        let searchResult = await dc.getCreative(data.campaign, creativeName);
        searchResult = searchResult.data.records;

        if (searchResult.length === 1) {
          [searchResult] = searchResult;

          if (searchResult.name.toLowerCase() === creativeName.toLowerCase()) {
            creative = searchResult; //exact match found
          }

          else {
            console.log('Creative ' + creativeName + ' - doesn\'t exist yet. Henk will create one for you.')

            // make new creative
            const creativeData = await promptNewCreative(creativeName);
            const createCreativeResult = await dc.createCreative(data.campaign, creativeData);
            creative = createCreativeResult.data;

          }
        }

        if (searchResult.length > 1) { // multiple creatives found

          const choices = searchResult.reduce(function(accumulator, currentValue) {
              return [...accumulator, {
                name: currentValue.name,
                value: currentValue
              }]
          }, []);

          const { creativeSelect } = await inquirer.prompt({
            type: 'list',
            name: 'creativeSelect',
            message: 'Creative ' + creativeName + ' - multiple creatives found. please the correct one..',
            choices: choices,
          });

          creative = creativeSelect;

        }

        if (searchResult.length === 0) { // creative doesn't exist on studio yet
          console.log('Creative ' + creativeName + ' - doesn\'t exist yet. Henk will create one for you.')

          // make new creative
          const creativeData = await promptNewCreative(creativeName);
          const createCreativeResult = await dc.createCreative(data.campaign, creativeData);
          creative = createCreativeResult.data;
        }

        creative.filename = filename;
        creative.path = data.inputDir + '/' + filename;

        data.creatives.push(creative)
      }

      else {
        // console.log('Found a match in local henkrc.')
        creative = data.creatives[theIndex]
      }

      console.log('Creative ' + creative.name + ' - selected. Proceeding to upload.');

      try {
        const uploadResult = await dc.uploadCreative(creative)

        if (uploadResult.data.length === 0) {
          console.log(chalk.yellow('Creative ' + creative.name + ' - upload complete but with incompatible assets. Did you add the enabler?'));
        }

        else if (uploadResult.data.length > 0) {
          console.log(chalk.green('Creative ' + creative.name + ' - upload complete.'));
        }
      }

      catch (err) {
        console.log(chalk.red('Creative ' + creative.name + ' - upload failed: ' + err.response.data[0].errorMessage))
      }
    }

    const previewUrl = await dc.getPreviewUrl(data.campaign);
    console.log(previewUrl.data[0].previewUrl)

    await writeToHenkrc(data);
  },
};

async function writeToHenkrc(data) {
  //write the new data object to the henkrc file
  let rcData = await fs.readJson(Filenames.RC); //read current data from file
  const overwriteIndex = rcData.uploadConfigs.findIndex(config => config.type === data.type); //figure our which object in the array to overwrite
  rcData.uploadConfigs[overwriteIndex] = data; //overwrite correct obj

  await fs.writeJson(Filenames.RC, rcData, {
    spaces: 2
  }); //write to file
}

async function promptNewCreative(creativeName) {

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

  return {
    name: promptName,
    format: promptFormat,
    width: promptWidth,
    height: promptHeight
  }
}