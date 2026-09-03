const test = require('node:test');
const assert = require('node:assert/strict');
const { slugify } = require('./build-target');

test('slugifies text', () => {
  assert.equal(slugify('  Plan F3: Visual Patch  '), 'plan-f3-visual-patch');
  assert.equal(slugify('already---spaced'), 'already-spaced');
});
