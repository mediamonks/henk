/**
 *
 * @param input
 * @param questions
 * @return {Promise<void>}
 */
module.exports = async function validateActionInput(input, questions) {

  questions = questions.filter(question => question.required);

  for (let i = 0; i < questions.length; i++) {
    const question = questions[i];
    const value = input[question.name];

    if (value === undefined) {
      throwError(question);
    }

    if (question.type) {
      switch (question.type) {
        case 'number': {
          if (typeof value !== 'number') {
            throwErrorNotCorrectType(question);
          }
          break;
        }

        case 'confirm': {
          if (typeof value !== 'boolean') {
            throwErrorNotCorrectType(question);
          }

          break;
        }
        case 'input': {
          if (typeof value !== 'string') {
            throwErrorNotCorrectType(question);
          }

          if (value.trim() === '') {
            throwError(question);
          }

          break;
        }
      }
    }
  }
};

/**
 *
 * @param question
 */
function throwError(question) {
  let errorMessage = `${question.name} is required, but undefined`;
  if (question.errorMessage) {
    ({ errorMessage } = question);
  }

  throw new Error(errorMessage);
}

function throwErrorNotCorrectType(question) {
  let errorMessage = `${question.name} is required, but of wrong type`;
  throw new Error(errorMessage);
}
