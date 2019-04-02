const inquirer = require("inquirer");
const fs = require("fs-extra");
const path = require("path");
const conditionalPrompt = require("./util/conditionalPrompt");
const validateRelativeUrls = require("./util/validate/validateRelativeUrls");
const targets = require("./target");

module.exports = async function prepare(answers = {}) {
  answers = await conditionalPrompt(answers, [
    {
      type: "list",
      name: "type",
      message: "Where do you want to upload?",
      choices: [
        { name: "Mediamonks Preview", value: "mm-preview" },
        { name: "Amazon S3", value: "s3" }
      ]
    }
  ]);

  answers = await conditionalPrompt(answers, {
    type: "input",
    name: "inputDir",
    message: "What directory you want to upload?",
    validate: validateRelativeUrls
  });

  if (targets[answers.type]) {
    answers = await conditionalPrompt(answers, targets[answers.type].questions);
  }

  return answers;
};
