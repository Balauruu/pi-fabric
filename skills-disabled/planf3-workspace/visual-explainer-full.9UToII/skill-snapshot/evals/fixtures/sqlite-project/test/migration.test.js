const test = require('node:test');
const assert = require('node:assert/strict');
const { stages, batchSize } = require('../src/migration');

test('keeps the staged migration order and bounded batch size', () => {
  assert.deepEqual(stages, ['add-nullable-columns', 'backfill-batches', 'enforce-constraints']);
  assert.equal(batchSize, 500);
});
