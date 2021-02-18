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
    // henkrc exists, reading data and validating
    let rc = {};

    try {
      rc = await fs.readJson(filepathRc);
    }

    catch (err) {
      throw new Error('cant read json from .henkrc, please delete it and try again');
    }

    if (rc.hasOwnProperty('uploadConfigs')) {
      data = {
        ...rc,
      };
    }

    else { // henkrc exists but not in correct new structure
      if (rc.hasOwnProperty('type')) { // looks like the object follows old structure
        data = {
          uploadConfigs: [ ...rc ]
        }
      }

      else { // no compatible structure found, creating new
        data = {
          uploadConfigs: []
        }
      }
    }
  }

  else {
    console.log('henkrc doesnt exist, creating creating new data obj')
    data = {
      uploadConfigs: []
    }
  }

  const choices = [
    { name: 'Mediamonks Preview', value: 'mm-preview' },
    { name: 'Workspace', value: 'workspace' },
    { name: 'Flashtalking', value: 'flashtalking' },
    { name: 'Google DoubleClick Studio', value: 'doubleclick'},
    { name: 'SFTP (alpha)', value: 'sftp' },
    // { name: 'Amazon S3', value: 's3', disabled: true },
    // { name: 'FTP', value: 'ftp', disabled: true },
    // { name: 'Netflix Monet', value: 'monet', disabled: true },

  ];

  data.uploadConfigs.forEach( config => {
    const configIndex = choices.findIndex(choice => config.type === choice.value);
    if (configIndex !== -1) choices[configIndex].name += ' (Config Found)';
  })

  const uploadTarget = await inquirer.prompt({
      type: 'list',
      name: 'type',
      message: 'Where do you want to upload?',
      choices: choices,
  });

  const target = targets[uploadTarget.type];

  if (!target) {
    throw new Error(`unknown target ${uploadTarget.type}`);
  }

  let [ targetData ] = data.uploadConfigs.filter( config => config.type === uploadTarget.type ) ;
  if (!targetData) targetData = { type: uploadTarget.type };

  //console.log(targetData);

  // let targetData = {};
  // if (data.uploadConfigs) [ targetData ] = data.uploadConfigs.filter( config => config.type === uploadTarget.type );
  // else targetData = { type: uploadTarget.type };
  // [ targetData ] = data.uploadConfigs.filter( config => config.type === uploadTarget.type );

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
    //console.log("adding new object to data")
    data.uploadConfigs.push(targetData); //this config was not in the henkrc yet so adding a new object
  }
  else {
    data.uploadConfigs[overwriteIndex] = targetData; //found it, so overwriting the existing object
  }

  await fs.writeJson(filepathRc, data);

  await target.action(targetData);

  console.log(`Done, Have a nice day.`);
};