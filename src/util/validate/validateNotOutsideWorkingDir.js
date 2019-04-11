const path = require('path');

module.exports = function validateNotOutsideWorkingDir(value) {
	const relative = path.relative('./', value)

  if (/^\.\./.test(relative)) {
    return "paths can not go outside working directory";
  }
  return true;
};
