const inquirer = require("inquirer");
const fs = require("fs-extra");
const path = require("path");
const conditionalPrompt = require("./util/conditionalPrompt");
const targets = require("./target");

module.exports = function action(data) {
  if (!targets[data.type]) {
    throw new Error(`inknown target ${data.type}`);
  }

	targets[data.type].action(data);
};
