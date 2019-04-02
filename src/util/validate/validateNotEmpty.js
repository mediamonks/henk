module.exports = function validateNotEmpty(value) {
  if (!value || (typeof value === 'string' && value.trim() === '')) {
    return 'can not be empty';
  }
  return true;
};
