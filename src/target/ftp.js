const validateActionInput = require('../util/validateActionInput');
const validateNotOutsideWorkingDir = require('../util/validate/validateNotOutsideWorkingDir');
const validateNotEmpty = require('../util/validate/validateNotEmpty');
const ftp = require("basic-ftp");

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
			default: 21,
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
			type: 'confirm',
			name: 'secure',
			description: 'Should i use explicit FTPS over TLS',
			validate: validateNotEmpty,
			default: false,
		},
	],
	async action (data)
	{
		validateActionInput(data, this.questions);

		const client = new ftp.Client();

		try
		{
			console.log(data);
			await client.access({
				host: data.host,
				user: data.username,
				password: data.password,
				secure: data.secure
			});

			console.log(await client.list())
		} catch (err)
		{
			console.log(err)
		}

		client.close();
	},
};
