import assert from "node:assert/strict";
import test from "node:test";
import type { RunAggregateV1 } from "../../src/domain/types.js";
import { RETENTION_CLASSES_V1, RETENTION_POLICY_DIGEST_V1, retentionDecision, validateRetentionClasses } from "../../src/retention/policy.js";

function run(retentionClass: string, outcome?: RunAggregateV1["outcome"], updatedAt = "2026-01-01T00:00:00.000Z"): Pick<RunAggregateV1, "contract" | "outcome" | "updatedAt"> {
  return { contract: { retentionClass } as RunAggregateV1["contract"], ...(outcome ? { outcome } : {}), updatedAt };
}

test("B12 policy has one explicit duration, legal-hold rule, deletion rule, and retained-evidence set for every outcome", () => {
  assert.deepEqual(validateRetentionClasses(), []); assert.match(RETENTION_POLICY_DIGEST_V1, /^[0-9a-f]{64}$/u);
  const outcomes = ["NO_PROMOTION", "PROMOTED", "ROLLED_BACK", "CANCELLED", "FAILED", "INDETERMINATE", "QUARANTINED", "PENDING"];
  for (const policy of RETENTION_CLASSES_V1) {
    assert.equal(policy.rules.length, outcomes.length); assert.deepEqual(policy.rules.map((entry) => entry.outcome).sort(), [...outcomes].sort());
    for (const rule of policy.rules) { assert.equal(rule.legalHold, "retain-until-released"); assert.ok(rule.deletionRule.length >= 40); assert.ok(rule.retainedEvidence.length >= 4); }
  }
});

test("elapsed durations enable only eligible outcomes while holds and uncertainty always prohibit deletion", () => {
  const standard = RETENTION_CLASSES_V1.find((entry) => entry.retentionClassId === "retain_standard_v1")!;
  for (const rule of standard.rules) {
    const value = run(standard.retentionClassId, rule.outcome === "PENDING" ? undefined : rule.outcome);
    assert.equal(retentionDecision(value, "2126-01-01T00:00:00.000Z", true).eligible, false, `${rule.outcome} legal hold`);
    if (rule.minimumDays === "indefinite") assert.equal(retentionDecision(value, "2126-01-01T00:00:00.000Z").eligible, false, rule.outcome);
    else {
      const boundary = Date.parse(value.updatedAt) + rule.minimumDays * 86_400_000;
      assert.equal(retentionDecision(value, new Date(boundary - 1).toISOString()).eligible, false, `${rule.outcome} before boundary`);
      const decision = retentionDecision(value, new Date(boundary).toISOString()); assert.equal(decision.eligible, true, `${rule.outcome} at boundary`); assert.equal(decision.eligibleAt, new Date(boundary).toISOString());
    }
  }
});

test("fixture retention is immediate only after settlement and complete reporting remains a separate cleanup guard", () => {
  assert.equal(retentionDecision(run("retain_fixture", "NO_PROMOTION"), "2026-01-01T00:00:00.000Z").eligible, true);
  assert.equal(retentionDecision(run("retain_fixture"), "2126-01-01T00:00:00.000Z").eligible, false);
  assert.throws(() => retentionDecision(run("unknown_class", "NO_PROMOTION"), "2126-01-01T00:00:00.000Z"), /No release retention policy/u);
});
