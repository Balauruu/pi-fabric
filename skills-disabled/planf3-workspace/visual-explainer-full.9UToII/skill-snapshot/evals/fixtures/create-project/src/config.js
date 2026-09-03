function logLevel(env = process.env) {
  return env.LOG_LEVEL || 'info';
}

module.exports = { logLevel };
