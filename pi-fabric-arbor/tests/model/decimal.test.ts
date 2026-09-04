import assert from "node:assert/strict";
import test from "node:test";
import { aggregateTrials, compareAggregates, exactUnits, formatQuantumUnits, parseCanonicalDecimal, quantizeHalfEven } from "../../src/domain/decimal.js";
import { errorCode } from "../helpers.js";

const malformed = ["", "+1", "01", "-0", "-0.0", "1.", ".1", "1.0", "1e3", "NaN", "Infinity", "0.0000000001", "123456789012345678901234567.1"];
for (const value of malformed) test(`rejects non-canonical decimal ${JSON.stringify(value)}`, () => assert.throws(() => parseCanonicalDecimal(value), errorCode("VALIDATION_FAILED")));

test("parses zero, negative fractions, and 27 significant digits", () => {
  assert.deepEqual(parseCanonicalDecimal("0"), { coefficient: 0n, scale: 0 });
  assert.deepEqual(parseCanonicalDecimal("-0.5"), { coefficient: -5n, scale: 1 });
  assert.equal(parseCanonicalDecimal("123456789012345678901234567").coefficient, 123456789012345678901234567n);
});

test("round-half-to-even handles signs and parity", () => {
  assert.equal(quantizeHalfEven("1.25", "0.1"), 12n);
  assert.equal(quantizeHalfEven("1.35", "0.1"), 14n);
  assert.equal(quantizeHalfEven("-1.25", "0.1"), -12n);
  assert.equal(quantizeHalfEven("-1.35", "0.1"), -14n);
  assert.equal(quantizeHalfEven("0.05", "0.1"), 0n);
  assert.equal(quantizeHalfEven("0.15", "0.1"), 2n);
});

test("exact units reject unrepresentable thresholds", () => {
  assert.equal(exactUnits("1.2", "0.1"), 12n);
  assert.throws(() => exactUnits("1.25", "0.1"), errorCode("VALIDATION_FAILED"));
});

test("single and median aggregation are integer deterministic", () => {
  const single = aggregateTrials(["-0.05"], "0.1", "single", "0");
  assert.equal(single.aggregate, 0n);
  const median = aggregateTrials(["9", "1", "5", "3", "7"], "1", "median", "8");
  assert.equal(median.aggregate, 5n);
  assert.equal(median.spread, 8n);
  assert.equal(median.nondeterministic, false, "spread equality at tolerance passes");
  assert.equal(aggregateTrials(["1", "5", "9"], "1", "median", "7").nondeterministic, true);
  assert.throws(() => aggregateTrials(["1", "2"], "1", "median", "1"), errorCode("EVIDENCE_INVALID"));
  assert.throws(() => aggregateTrials(["1", "2"], "1", "single", "1"), errorCode("EVIDENCE_INVALID"));
});

test("maximize and minimize comparison include equality boundaries and ties", () => {
  assert.deepEqual(compareAggregates(11n, 10n, "maximize", "0.1", "0.1"), { normalizedImprovement: 1n, passes: true, tie: false });
  assert.deepEqual(compareAggregates(9n, 10n, "minimize", "0.1", "0.1"), { normalizedImprovement: 1n, passes: true, tie: false });
  assert.deepEqual(compareAggregates(10n, 10n, "maximize", "0", "0.1"), { normalizedImprovement: 0n, passes: true, tie: true });
  assert.equal(compareAggregates(9n, 10n, "maximize", "0", "0.1").passes, false);
});

test("rendering is unique and normalizes zero", () => {
  assert.equal(formatQuantumUnits(0n, "0.001"), "0");
  assert.equal(formatQuantumUnits(1230n, "0.001"), "1.23");
  assert.equal(formatQuantumUnits(-5n, "0.01"), "-0.05");
});

test("signed 128-bit comparison overflow fails", () => {
  assert.throws(() => compareAggregates((1n << 127n) - 1n, -1n, "maximize", "0", "1"), errorCode("VALIDATION_FAILED"));
});
