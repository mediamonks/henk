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
    const rc = await fs.readJson(filepathRc);

    // if type of provided argument is not the same ignore henkrc file.
    if (!data.type || rc.type === data.type) {
      data = {
        ...rc,
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
        { name: 'SFTP (alpha)', value: 'sftp' },
        { name: 'FTP', value: 'ftp', disabled: true },
        { name: 'Netflix Monet', value: 'monet', disabled: true },
        { name: 'Google DoubleClick Studio', value: 'doubleclick', disabled: true },
      ],
    },
  ]);

  const target = targets[data.type];

  if (!target) {
    throw new Error(`unknown target ${data.type}`);
  }

  data = await conditionalPrompt(data, {
    type: 'input',
    name: 'inputDir',
    message: 'What directory you want to upload?',
    validate: validateNotOutsideWorkingDir,
  });

  // force relative directories.
  data.inputDir = path.relative('./', data.inputDir);

  // checking if inputDir exist
  data = await conditionalPrompt(data, target.questions);

  await fs.writeJson(filepathRc, data);
  await target.action(data);

  console.log(`Done, Have a nice day.`);
};
