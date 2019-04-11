const path = require('path');

module.exports = function validateNotOutsideWorkingDir(value) {
	const relative = path.relative('./', value)

  if (/^\.\./.test(relative)) {
    return "url can go outside working directory";
  }
  return true;
};
