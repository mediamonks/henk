const inquirer = require("inquirer");

module.exports = async function conditionalPrompt(credentials, questions) {
  if (!(questions instanceof Array)) {
    questions = [questions];
  }

  for (let i = 0; i < questions.length; i++) {
    const question = questions[i];

    if (!credentials[question.name]) {
      credentials = {
        ...credentials,
        ...(await inquirer.prompt(question))
      };
    }
  }

  return credentials;
};
