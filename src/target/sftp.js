const validateActionInput = require('../util/validateActionInput');
const validateNotOutsideWorkingDir = require('../util/validate/validateNotOutsideWorkingDir');
const validateNotEmpty = require('../util/validate/validateNotEmpty');
const Client = require('ssh2-sftp-client');
const glob = require('glob-promise');
const path = require('path');
const isFile = require('../util/isFile');
const ProgressBar = require('progress');

module.exports = {
  questions: [
    {
      type: 'input',
      name: 'host',
      message: 'Please fill in the hostname:',
      validate: validateNotEmpty,
      required: true,
    },
    {
      type: 'number',
      name: 'port',
      message: 'Please fill in the port number:',
      default: 22,
      validate: validateNotEmpty,
      required: true,
    },
    {
      type: 'input',
      name: 'username',
      message: 'Please fill in the username:',
      validate: validateNotEmpty,
      required: true,
    },
    {
      type: 'input',
      name: 'password',
      message: 'Please fill in the password:',
      validate: validateNotEmpty,
      required: true,
    },
    {
      type: 'input',
      name: 'outputDir',
      message: 'Please fill the directory you want to put everything:',
      validate: validateNotEmpty,
      required: true,
    },
  ],
  async action(data) {
    validateActionInput(data, this.questions);

    let sftp = new Client();

    try {
      await sftp.connect({
        host: data.host,
        user: data.username,
        password: data.password,
        secure: data.secure,
      });

      try {
        await sftp.mkdir(data.outputDir, true);
      } catch (e) {}

      if (/\*/.test(data.inputDir)) {
        throw new Error('Globbing pattern is not allowed');
      }

      const inputDir = path.join(data.inputDir, '**/*');
      const files = await glob(inputDir);

      const bar = new ProgressBar('[:bar] :percent | :etas | :current / :total | :rate/fps ', {
        total: files.length,
        complete: '=',
        incomplete: ' ',
        width: 20,
      });

      const relativeFiles = files.map(file => path.relative(data.inputDir, file));
      for (let i = 0; i < relativeFiles.length; i++) {
        const inputFilePath = files[i];
        const outputFilePath = path.join(data.outputDir, relativeFiles[i]);

        if (!(await isFile(inputFilePath))) {
          try {
            await sftp.mkdir(outputFilePath, true);
          } catch (e) {}
        } else {
          await sftp.fastPut(inputFilePath, outputFilePath);
        }

        bar.tick();
      }
    } catch (err) {
      console.log(err);
    }

    sftp.end();
  },
};
