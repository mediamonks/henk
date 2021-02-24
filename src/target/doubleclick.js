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
        console.log('Advertiser ' + data.advertiserName + ' - Multiple records found. Please choose one.')
        // advertiser = ;
        return;
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
        console.log('Advertiser ' + data.advertiserName + ' - created.')
        advertiser = createAdvertiserRequest.data;
      }

      if (advertisers.length === 1) {
        [ advertiser ] = advertisers;
      }

      data.advertiser = advertiser;
    }

    console.log('Advertiser ' + data.advertiserName + ' - selected. ID: ' + data.advertiser.id)


    // Find/create campaign
    let campaign;
    console.log('Campaign ' + data.campaignName + ' - seeing if already stored in local henkrc file..')

    if (!data.campaign) {
      console.log('Campaign ' + data.campaignName + ' - not in henkrc file, seeing if exists in Studio..')
      let campaigns = await dc.getCampaign(data.advertiser, data.campaignName);
      campaigns = campaigns.data.records;

      if (campaigns.length > 1) {
        console.log('Campaign ' + data.campaignName + ' - Multiple records found. Please choose one.')
        // campaigns = ;
        return;
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
        console.log('Campaign ' + data.campaignName + ' - created.')
        campaign = createCampaignRequest.data;
      }

      if (campaigns.length === 1) {
        [ campaign ] = campaigns;
      }

      data.campaign = campaign;
    }

    console.log('Campaign ' + data.campaignName + ' - selected. ID: ' + data.campaign.id)



    // Find/Create creatives
    if (!data.creatives) data.creatives = []; // if the creatives array isn't yet in henkrc

    let creative;
    const files = await fs.readdirSync(data.inputDir)
    const zipFiles = files.filter(filename => filename.substr(filename.length-4, filename.length) === '.zip');

    for (const filename of zipFiles) {
      const creativeName = filename.substr(0, filename.indexOf('.html'))
      //let creativeSearchResult;

      console.log('Creative ' + creativeName + ' - seeing if already stored in local henkrc file..')
      const theIndex = data.creatives.findIndex(creative => creative.filename === filename);

      if (theIndex === -1) {
        console.log('Creative ' + creativeName + ' - not in henkrc file, seeing if exists in Studio..')

        let searchResult = await dc.getCreative(data.campaign, creativeName);
        searchResult = searchResult.data.records;

        if (searchResult.length === 0) { // creative doesn't exist on studio yet
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

          const createCreativeResult = await dc.createCreative(data.campaign, {
            name: promptName,
            width: promptWidth,
            height: promptHeight,
            format: promptFormat
          });

          creative = createCreativeResult.data;

          // console.log('creative created.');
        }

        if (searchResult.length > 1) { // multiple creatives found
          console.log('multiple creatives found, please select one')
          //return
        }

        if (searchResult.length === 1) {
          [ creative ] = searchResult;
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
      const uploadResult = await dc.uploadCreative(creative)
      console.log('Creative ' + creative.name + ' - upload complete.');
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