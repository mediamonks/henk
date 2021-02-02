const validateActionInput = require('../util/validateActionInput');
const validateNotEmpty = require('../util/validate/validateNotEmpty');
const validateEmail = require('../util/validate/validateEmail');
const WorkspaceAPI = require('../util/Workspace');
const inquirer = require('inquirer');
const Filenames = require('../data/Filenames');
const fs = require('fs-extra');
const path = require('path');

module.exports = {
  questions: [
    {
      type: 'input',
      name: 'accountEmail',
      message: 'email',
      errorMessage: 'Missing email',
      validate: validateEmail,
      required: true,
    },
    {
      type: 'password',
      name: 'accountPassword',
      message: 'password',
      validate: validateNotEmpty,
      errorMessage: 'Missing password',
      required: true,
    },
    {
      type: 'input',
      name: 'libraryId',
      message: 'Library ID (find 4-digit id in URL: https://workspace.mediamonks.com/backend/project-folder/view?id=XXXX)',
      errorMessage: 'Missing Library ID',
      required: false,
    }
  ],

  async action(data) {
    validateActionInput(data, this.questions);
    
    const ws_api = new WorkspaceAPI();
    
    const cookies = await ws_api.login({
      username: data.accountEmail,
      password: data.accountPassword
    });
    
    const upload = await ws_api.upload({
      cookies: cookies,
      ...data
    })
    
    console.log("Finished uploading!")
  },
};
