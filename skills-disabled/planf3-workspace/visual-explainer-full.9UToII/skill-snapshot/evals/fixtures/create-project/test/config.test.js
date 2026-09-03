const test = require('node:test');
const assert = require('node:assert/strict');
const { logLevel } = require('../src/config');

test('uses LOG_LEVEL with info fallback', () => {
  assert.equal(logLevel({ LOG_LEVEL: 'debug' }), 'debug');
  assert.equal(logLevel({}), 'info');
});
