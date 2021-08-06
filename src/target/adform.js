const validateActionInput = require('../util/validateActionInput');
const validateNotEmpty = require('../util/validate/validateNotEmpty');
const validateEmail = require('../util/validate/validateEmail');
const AdformUploadTool = require('adform-upload-tool');
const inquirer = require('inquirer');
const Filenames = require('../data/Filenames');
const fs = require('fs-extra');
const path = require('path');

module.exports = {
  questions: [
    {
      type: 'input',
      name: 'client',
      message: 'Client',
      errorMessage: 'Missing client',
      validate: validateNotEmpty,
      required: true,
    },
    {
      type: 'input',
      name: 'secret',
      message: 'Secret',
      validate: validateNotEmpty,
      errorMessage: 'Missing secret',
      required: true,
    }
  ],

  async action(data) {
    validateActionInput(data, this.questions);

    const filepathRc = `./${Filenames.RC}`;
    const inputDir = `./${data.inputDir}`;

    const adformApi = new AdformUploadTool();
    const loginResult = await adformApi.login({
      client_id: data.client,
      client_secret: data.secret
    });

    if (!data.advertiserId) {
      const advertisers = await adformApi.getClients();
      const targetAdvertiser = await inquirer.prompt({
        type: 'list',
        name: 'type',
        message: 'Which advertiser?',
        choices: advertisers.data.map(advertiser => {
          return {
            name: advertiser.name,
            value: advertiser.id
          }
        })
      });

      data.advertiserId = targetAdvertiser.type;
    }

    if (!data.campaignId) {
      const campaigns = await adformApi.getCampaigns();
      const campaignsByClient = campaigns.data.filter( (campaign) => campaign.advertiserId === data.advertiserId);

      const targetCampaign = await inquirer.prompt({
        type: 'list',
        name: 'type',
        message: 'Which campaign?',
        choices: campaignsByClient.map(campaign => {
          return {
            name: campaign.name,
            value: campaign.id
          }
        })
      });

      data.campaignId = targetCampaign.type;
    }

    //write new values to henkrc so it's saved for later
    let rcData = await fs.readJson(filepathRc);
    const overwriteIndex = rcData.uploadConfigs.findIndex(config => config.type === data.type);
    rcData.uploadConfigs[overwriteIndex] = data;
    await fs.writeJson(filepathRc, rcData);

    //get all zip files in inputDir
    const files = await fs.readdir(inputDir)
    const zipFiles = files.filter(filename => filename.substr(filename.length-4, filename.length) === '.zip');

    for (const filename of zipFiles) {
      // console.log('uploading ' + filename)
      const filePath = inputDir + '/' + filename;
      const title = filename.substr(0, filename.length-4);

      // Get all creatives in a certain campaign
      const campaignBanners = await adformApi.getHtmlBanners(data.campaignId);

      // See if creative already exists with name of asset we're going to upload
      const matches = campaignBanners.data.filter(creative => creative.name === title && !creative.deleted);

      if (matches.length > 0) { // update the matched creative's asset
        // console.log('updating existing asset')

        console.log(filename + "      : updating asset")

        const existingHtmlBanner = await adformApi.getHtmlBanner(matches[0].id.uuid);
        const existingAsset = existingHtmlBanner.data.Value.Asset.Uuid;

        const updatedAsset = await adformApi.updateHtmlAsset({
          uuid: existingHtmlBanner.data.Value.Asset.Uuid,
          filePath: filePath
        })

        // console.log('updated asset')
        // console.log(updatedAsset.data)

      } else {

        console.log(filename + "      : creating new asset")

        // Upload the asset first to the advertiser
        const htmlAsset = await adformApi.uploadHtmlAsset({
          advertiser: data.advertiserId,
          filePath: filePath,
        });

        // console.log('html asset uploaded with uuid ' + htmlAsset.data.Value.Uuid)
        // console.log('html asset uploaded with name ' + htmlAsset.data.Value.Title)

        // Then create a new HTML unit in the campaign and assign the asset to it
        console.log(filename + "      : assigning asset to new html banner")

        const htmlBanner = await adformApi.createHtmlBanner({
          campaignId: data.campaignId,
          asset: htmlAsset.data,
          clickTagUrl: 'https://www.adform.com', // somehow it doesn't grab this automatically from the manifest.json.
        })

        // console.log('html banner created with uuid ' + htmlBanner.data.Value.Uuid)
        // console.log('html banner created with title ' + htmlBanner.data.Value.Title)
      }
    }

    console.log("Finished uploading!")
  },
};


