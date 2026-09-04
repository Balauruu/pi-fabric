import assert from "node:assert/strict";
import test from "node:test";
import {
  ATTEMPT_TRANSITIONS, AUTHORIZATION_TRANSITIONS, CLEANUP_TRANSITIONS, EFFECT_TRANSITIONS,
  EXPLORATION_TRANSITIONS, GATE_TRANSITIONS, HYPOTHESIS_TRANSITIONS, PROMOTION_TRANSITIONS, REPORT_TRANSITIONS,
  RUN_TRANSITIONS, assertTransition, canTransition, type TransitionTable,
} from "../../src/domain/state-machines.js";
import { errorCode } from "../helpers.js";

const machines: Array<[string, TransitionTable<string>]> = [
  ["run", RUN_TRANSITIONS], ["exploration", EXPLORATION_TRANSITIONS], ["hypothesis", HYPOTHESIS_TRANSITIONS],
  ["attempt", ATTEMPT_TRANSITIONS], ["effect", EFFECT_TRANSITIONS], ["gate", GATE_TRANSITIONS], ["promotion", PROMOTION_TRANSITIONS],
  ["authorization", AUTHORIZATION_TRANSITIONS], ["report", REPORT_TRANSITIONS], ["cleanup", CLEANUP_TRANSITIONS],
];

for (const [name, table] of machines) {
  test(`${name} machine admits every declared edge and rejects every undeclared pair`, () => {
    const states = Object.keys(table);
    assert.ok(states.length > 0);
    for (const from of states) {
      for (const to of states) {
        const declared = table[from]!.has(to);
        assert.equal(canTransition(table, from, to), declared);
        if (declared) assert.doesNotThrow(() => assertTransition(table, from, to, name));
        else assert.throws(() => assertTransition(table, from, to, name), errorCode("ILLEGAL_TRANSITION"));
      }
    }
  });
}

test("post-completion rollback, reports, cleanup, and re-promotion remain legal", () => {
  for (const target of ["REPORT_PENDING", "CLEANUP_PENDING", "ROLLBACK_REQUESTED"] as const) assert.equal(RUN_TRANSITIONS.COMPLETED.has(target), true);
  assert.equal(RUN_TRANSITIONS.ROLLED_BACK.has("AWAITING_PROMOTION"), true);
  assert.equal(HYPOTHESIS_TRANSITIONS.PROMOTED.has("ROLLED_BACK"), true);
  assert.equal(HYPOTHESIS_TRANSITIONS.ROLLED_BACK.has("PROMOTABLE"), true);
});

test("retry closes an old attempt and cannot reopen it", () => {
  assert.equal(ATTEMPT_TRANSITIONS.RETRYABLE.has("RETRIED"), true);
  assert.equal(ATTEMPT_TRANSITIONS.RETRIED.size, 0);
});
