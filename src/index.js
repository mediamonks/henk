// const action = require("./action");
// const prepare = require("./prepare");
const targets = require('./target');
const conditionalPrompt = require('./util/conditionalPrompt');
const validateNotOutsideWorkingDir = require('./util/validate/validateNotOutsideWorkingDir');
const Filenames = require('./data/Filenames');
const fs = require('fs-extra');
const inquirer = require('inquirer');
const path = require('path');

module.exports = async (data = {}, cli) => {
  const filepathRc = `./${Filenames.RC}`;
  const filepathGitIgnore = `./${Filenames.GITIGNORE}`;

  // checking for a .henkrc
  let hasGitIgnore = await fs.pathExists(filepathGitIgnore);

  // checking if .gitignore is exists
  if (!hasGitIgnore) {
    const { shouldCreateGitIgnore } = await inquirer.prompt({
      type: 'confirm',
      name: 'shouldCreateGitIgnore',
      message: 'No .gitignore found should i create it?',
    });

    if (shouldCreateGitIgnore) {
      hasGitIgnore = true;
      await fs.outputFile(filepathGitIgnore, '');
    }
  }

  if (hasGitIgnore) {
    const gitIgnoreContent = await fs.readFile(filepathGitIgnore, 'utf8');

    const regEx = new RegExp(Filenames.RC, 'gm');

    if (!regEx.test(gitIgnoreContent)) {
      const { shouldAddIt } = await inquirer.prompt({
        type: 'confirm',
        name: 'shouldAddIt',
        message: `No ${Filenames.RC} was added to the ${Filenames.GITIGNORE}, should i add it?`,
      });

      if (shouldAddIt) {
        fs.outputFile(filepathGitIgnore, gitIgnoreContent.replace(/\n$/, '') + `\n${Filenames.RC}`);
      }
    }
  }

  if (await fs.pathExists(filepathRc)) {
    let rc = await fs.readJson(filepathRc);

    console.log(rc);

    // if type of provided argument is not the same ignore henkrc file.
    if (!data.type || rc.type === data.type) {
      console.log("type of provided argument is not the same ignore henkrc file")
      data = {
        ...rc,
        ...data,
      };
    }
  }

  const uploadTarget = await inquirer.prompt({
      type: 'list',
      name: 'type',
      message: 'Where do you want to upload?',
      choices: [
        { name: 'Mediamonks Preview', value: 'mm-preview' },
        { name: 'Amazon S3', value: 's3' },
        { name: 'SFTP (alpha)', value: 'sftp' },
        { name: 'Flashtalking', value: 'flashtalking' },
        { name: 'FTP', value: 'ftp', disabled: true },
        { name: 'Netflix Monet', value: 'monet', disabled: true },
        { name: 'Google DoubleClick Studio', value: 'doubleclick', disabled: true },
      ],
  });

  const target = targets[uploadTarget.type];

  if (!target) {
    throw new Error(`unknown target ${uploadTarget.type}`);
  }

  let [ targetData ] = data.uploadConfigs.filter( config => config.type === uploadTarget.type ) ;
  if (!targetData) targetData = { type: uploadTarget.type };

  targetData = await conditionalPrompt(targetData, {
    type: 'input',
    name: 'inputDir',
    message: 'What directory you want to upload?',
    validate: validateNotOutsideWorkingDir,
  });

  // force relative directories.
  targetData.inputDir = path.relative('./', targetData.inputDir);

  // checking if inputDir exist
  targetData = await conditionalPrompt(targetData, target.questions);

  // find and overwrite the correct object in the array data.uploadConfigs
  const overwriteIndex = data.uploadConfigs.findIndex((config => config.type === targetData.type));

  if (overwriteIndex === -1) {
    console.log("adding new object to data")
    data.uploadConfigs.push(targetData); //this config was not in the henkrc yet so adding a new object
  }
  else {
    data.uploadConfigs[overwriteIndex] = targetData; //found it, so overwriting the existing object
  }

  await fs.writeJson(filepathRc, data);

  await target.action(targetData);

  console.log(`Done, Have a nice day.`);
};