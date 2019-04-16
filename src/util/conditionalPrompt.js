const inquirer = require('inquirer');
const chalk = require('chalk');

const error = chalk.bold.red;

module.exports = async function conditionalPrompt(data, questions) {
  if (!(questions instanceof Array)) {
    questions = [questions];
  }

  for (let i = 0; i < questions.length; i++) {
    const question = questions[i];

    // check if data is already there, or validate with validator if validate is there.
    if (
      data[question.name] === undefined ||
      (question.validate && question.validate(data[question.name]) !== true)
    ) {
      // show message
      if (
        data[question.name] !== undefined &&
        (question.validate && question.validate(data[question.name]) !== true)
      ) {
        console.log(error(question.validate(data[question.name])));
      }

      data = {
        ...data,
        ...(await inquirer.prompt(question)),
      };
    }
  }

  return data;
};
