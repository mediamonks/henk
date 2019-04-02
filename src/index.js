// const action = require("./action");
// const prepare = require("./prepare");
const targets = require('./target');
const conditionalPrompt = require('./util/conditionalPrompt');
const validateRelativeUrls = require('./util/validate/validateRelativeUrls');
const fs = require('fs-extra');
const inquirer = require('inquirer');

module.exports = async (data = {}) => {
  // checking for a .henkrc
  const hasGitIgnore = await fs.pathExists('./.gitignore');

  // checking if .gitignore is exists
  if ((await fs.pathExists('./.git')) && !hasGitIgnore) {
    const { shouldCreateGitIgnore } = await inquirer.prompt({
      type: 'confirm',
      name: 'shouldCreateGitIgnore',
      message: 'No .gitignore found should i create it?',
    });

    if (shouldCreateGitIgnore) {
      fs.outputFile('./.gitignore', '.henkrc');
    }
  }

  const gitIgnoreContent = await fs.readFile('./.gitignore', 'utf8');

  const regEx = /\.henkrc/gm;

  if (!regEx.test(gitIgnoreContent)) {
    const { shouldAddIt } = await inquirer.prompt({
      type: 'confirm',
      name: 'shouldAddIt',
      message: 'No .henkrc was added to the .gitignore, should i add it?',
    });

    if (shouldAddIt) {
      fs.outputFile('./.gitignore', gitIgnoreContent.replace(/\n$/, '') + '\n.henkrc');
    }
  }

  if (await fs.pathExists('./.henkrc')) {
    const henkrc = await fs.readJson('./.henkrc');

    // if type of provided argument is not the same ignore henkrc file.
    if (!data.type || henkrc.type === data.type) {
      data = {
        ...henkrc,
        ...data,
      };
    }
  }

  data = await conditionalPrompt(data, [
    {
      type: 'list',
      name: 'type',
      message: 'Where do you want to upload?',
      choices: [
        { name: 'Mediamonks Preview', value: 'mm-preview' },
        { name: 'Amazon S3', value: 's3' },
        { name: 'Netflix Monet', value: 'monet' },
        { name: 'Google DoubleClick Studio', value: 'doubleclick' },
      ],
    },
  ]);

  const target = targets[data.type];

  if (!target) {
    throw new Error(`inknown target ${data.type}`);
  }

  data = await conditionalPrompt(data, {
    type: 'input',
    name: 'inputDir',
    message: 'What directory you want to upload?',
    validate: validateRelativeUrls,
  });

  // checking if inputDir exist
  //

  data = await conditionalPrompt(data, target.questions);

  await fs.writeJson('./.henkrc', data);

  target.action(data);
};
