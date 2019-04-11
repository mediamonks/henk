const expect = require('chai').expect
const func = require('../src/index');
const path = require('path');



describe('test', () => {
	it('should return a string', () => {
		expect('ci with travis').to.equal('ci with travis');
	});
});

describe('test validateNotOutsideWorkingDir', () => {
	const validateNotOutsideWorkingDir = require('../src/util/validate/validateNotOutsideWorkingDir');
	it('expect outside working dir paths to return a string', () => {

		const absolutePath = path.resolve('../../');

		expect(validateNotOutsideWorkingDir('/')).to.equal("paths can not go outside working directory");
		expect(validateNotOutsideWorkingDir(absolutePath)).to.equal("paths can not go outside working directory");
		expect(validateNotOutsideWorkingDir('../')).to.equal("paths can not go outside working directory");
		expect(validateNotOutsideWorkingDir('../**/*')).to.equal("paths can not go outside working directory");
	});

	it('expect inside working dir paths to return a true', () => {

		const relativePath0 = path.resolve(__dirname,'../');
		const relativePath1 = path.resolve(__dirname,'../src/');
		const relativePath2 = path.resolve(__dirname,'../src/**/*');

		expect(validateNotOutsideWorkingDir(relativePath0)).to.equal(true);
		expect(validateNotOutsideWorkingDir(relativePath1)).to.equal(true);
		expect(validateNotOutsideWorkingDir(relativePath2)).to.equal(true);
	});
});