import assert from "node:assert/strict";
import test from "node:test";
import { parseStrictEvaluatorRecord } from "../../src/evaluation/protocol.js";
import { FixtureWorkspaceManager } from "../../src/fixtures/adapters.js";
import { createFixtureContract } from "../../src/fixtures/driver.js";
import { digestCanonical } from "../../src/util/canonical.js";
import { errorCode } from "../helpers.js";

const contract = createFixtureContract();
const digest = digestCanonical(contract);
const expected = {
  runId: "run_fixture", evaluationId: "evaluation_fixture", contractDigest: digest, epochDigest: digest,
  oid: contract.repository.initialOid, evaluatorId: contract.evaluation.development,
  parserVersion: contract.evaluation.parserVersion, split: "development" as const, contract,
};
const record = {
  version: 1, ...expected, contract: undefined, metric: contract.metric.name, unit: contract.metric.unit,
  value: "1.2", seed: 1, trialOrdinal: 1, outputDigest: "a".repeat(64), artifacts: [],
  requiredOutputs: [{ path: "src/solution.ts", digest: "b".repeat(64) }], containmentId: "containment_fixture", environmentDigest: "c".repeat(64),
};
const cleanRecord = Object.fromEntries(Object.entries(record).filter(([, value]) => value !== undefined));

test("strict evaluator accepts exactly one identity-bound canonical record", () => {
  assert.equal(parseStrictEvaluatorRecord(JSON.stringify(cleanRecord), expected).value, "1.2");
});

for (const output of ["", "not json", "{}\n{}", JSON.stringify({ ...cleanRecord, value: 1.2 }), JSON.stringify({ ...cleanRecord, value: "1e2" })]) {
  test("strict evaluator rejects malformed, multiple, float, or exponent output", () => assert.throws(() => parseStrictEvaluatorRecord(output, expected), errorCode(output.startsWith("{") && !output.includes("\n") ? "VALIDATION_FAILED" : "EVIDENCE_INVALID")));
}

test("fixture finalization rejects protected, outside-editable, and missing required outputs", async () => {
  const workspace = new FixtureWorkspaceManager();
  const base = { version: 1 as const, runId: "run_fixture", attemptId: "attempt_fixture", hypothesisId: "hypothesis_fixture", candidateId: "candidate_fixture", baseOid: contract.repository.initialOid, contract };
  await assert.rejects(workspace.finalize({ ...base, changedPaths: ["protected/secret.ts", "src/solution.ts"] }), errorCode("EVIDENCE_INVALID"));
  await assert.rejects(workspace.finalize({ ...base, changedPaths: ["docs/readme.md", "src/solution.ts"] }), errorCode("EVIDENCE_INVALID"));
  await assert.rejects(workspace.finalize({ ...base, changedPaths: ["src/other.ts"] }), errorCode("EVIDENCE_INVALID"));
});

test("strict evaluator rejects stale identity and unknown fields", () => {
  assert.throws(() => parseStrictEvaluatorRecord(JSON.stringify({ ...cleanRecord, oid: "2".repeat(40) }), expected), errorCode("EVIDENCE_INVALID"));
  assert.throws(() => parseStrictEvaluatorRecord(JSON.stringify({ ...cleanRecord, score: "1.2" }), expected), errorCode("VALIDATION_FAILED"));
});
