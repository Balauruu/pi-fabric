const assert = require('node:assert/strict');
const unique = require('./unique.cjs');
let reads = 0;
for (const data of [[], [3, 1, 3, 2, 1], Array.from({length: 400}, (_, i) => i % 37)]) {
  const input = new Proxy(Object.freeze(data), {get(target, key, receiver) { if (/^\d+$/.test(String(key))) reads++; return Reflect.get(target, key, receiver); }});
  assert.deepEqual(unique(input), [...new Set(data)]);
}
if (!process.argv.includes('--check')) console.log('ARBOR_METRIC ' + reads + ' reads');
