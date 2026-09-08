import assert from 'node:assert/strict';
import test from 'node:test';
import {units,decimal,parseMetric} from '../../src/evaluators/measurement.js';
test('PR13 exact fixed-scale arithmetic preserves sign, zero and large round trips',()=>{
 for(const text of ['0','-0','-0.000000000','1','-2.50','0.000000001','999999999999999999999999999.999999999','-999999999999999999999999999.999999999'])assert.equal(units(decimal(units(text))),units(text));
 assert.equal(decimal(units('-0.000000000')),'0');assert.equal(decimal(units('-2.50')),'-2.5');assert.equal(units('0.1')+units('0.2'),units('0.3'));
});
test('PR13 malformed and overprecision decimals are rejected without rounding',()=>{
 for(const text of ['',' 1','1 ','+1','01','.5','1.','1e2','NaN','Infinity','1.0000000001','1000000000000000000000000000'])assert.throws(()=>units(text),/bounded exact decimal/);
});
test('PR13 metric parser preserves exact values and refuses ambiguous/unit-mismatched evidence',()=>{
 assert.equal(parseMetric('diagnostic\nARBOR_METRIC -2.50 points\n','points'),'-2.5');
 for(const text of ['ARBOR_METRIC 1 other','ARBOR_METRIC 1 points\nARBOR_METRIC 2 points','ARBOR_METRIC 0.0000000001 points','diagnostic only'])assert.throws(()=>parseMetric(text,'points'));
});
