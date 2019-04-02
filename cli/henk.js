#!/usr/bin/env node

const program = require('commander');
const package = require('../package.json');
const henk = require('../src/index');

program
	.version(package.version)
	.parse(process.argv);

henk(program);