const action = require("./action");
const prepare = require("./prepare");

module.exports = async (data = {}) => action(await prepare(data));
