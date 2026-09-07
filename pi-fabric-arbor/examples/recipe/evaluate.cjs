const assert = require('node:assert/strict');
const recipe = require('./recipe.json');
assert.deepEqual(Object.keys(recipe), ['threshold']);
assert.ok(Number.isFinite(recipe.threshold) && recipe.threshold >= -20 && recipe.threshold <= 20);
const samples = require('./samples.json');
const correct = samples.filter(row => (row.x > recipe.threshold) === row.positive).length;
if (!process.argv.includes('--check')) console.log('ARBOR_METRIC ' + correct + ' correct');
