const fs = require('fs');
module.exports = function isFile(path) {
  return new Promise(resolve => {
    fs.lstat(path, (err, stats) => {
      resolve(stats.isFile());
    });
  });
};
