const validateActionInput = require('../util/validateActionInput');
const validateNotOutsideWorkingDir = require('../util/validate/validateNotOutsideWorkingDir');
const validateNotEmpty = require('../util/validate/validateNotEmpty');
const Client = require('ssh2-sftp-client');

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

      const fileList = await sftp.list('./');

      console.log(fileList);
    } catch (err) {
      console.log(err);
    }

    sftp.end();
  },
};
