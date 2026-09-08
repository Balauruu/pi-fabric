import assert from "node:assert/strict";
import test from "node:test";
import { practicalGain } from "../../src/material/acceptance.js";
test("PR5 exact current-incumbent direction/threshold oracle: ties never win, zero requires absolute and negatives use magnitude", () => {
  const check = (baseline: string, candidate: string, direction: "maximize" | "minimize", threshold: string, kind: "absolute" | "relative") => practicalGain(baseline, candidate, { direction, minimumGain: threshold, gainKind: kind });
  assert.equal(check("1", "1", "maximize", "0", "absolute"), "no-gain");
  assert.equal(check("1", "2", "maximize", "1", "absolute"), "eligible");
  assert.equal(check("-10", "-9", "maximize", "0.1", "relative"), "eligible");
  assert.equal(check("-10", "-11", "minimize", "0.1", "relative"), "eligible");
  assert.equal(check("0", "1", "maximize", "0", "relative"), "inconclusive-zero-denominator");
  assert.equal(check("0", "0.000000001", "maximize", "0.000000001", "absolute"), "eligible");
  assert.equal(check("999999999999999999999999999", "-999999999999999999999999999", "minimize", "1", "absolute"), "eligible");
  assert.equal(check("20", "15", "maximize", "0", "absolute"), "no-gain");
  assert.throws(() => check("1", "2", "maximize", "-1", "absolute"), /nonnegative/);
});
