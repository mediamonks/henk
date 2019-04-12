#!/usr/bin/env node

const program = require('commander');
const chalk = require('chalk');
const package = require('../package.json');
const henk = require('../src/index');

console.log(`Welcome to ${chalk.green.bold(`HENK`)} (transport service)`);

program
	.version(package.version)
	.parse(process.argv);

// program

henk({}, true);