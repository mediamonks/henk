// const action = require("./action");
// const prepare = require("./prepare");
const targets = require('./target');
const conditionalPrompt = require('./util/conditionalPrompt');
const validateRelativeUrls = require('./util/validate/validateRelativeUrls');
const fs = require('fs-extra');

module.exports = async (data = {}) => {
  // checking for a .henkrc

  if (await fs.pathExists('./.henkrc')) {
    data = {
      ...(await fs.readJson('./.henkrc')),
      ...data,
    };
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

  target.action(data);

  const validKeys = [...target.questions.map(val => val.name), 'inputDir', 'type'];

  fs.writeJson(
    './.henkrc',
    Object.keys(data).reduce((prev, name) => {
      if (validKeys.some(val => val === name)) {
        prev[name] = data[name];
      }
      return prev;
    }, {}),
  );
};
