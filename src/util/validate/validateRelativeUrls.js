const path = require('path');

module.exports = function validateRelativeUrls(value) {

  if (!/^\./.test(value)) {
    return "url can only be relative. No Absolute urls are allowed";
  }
  return true;
};
