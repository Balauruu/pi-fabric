import assert from "node:assert/strict";
import test from "node:test";
import type { GateV1 } from "../../src/domain/types.js";
import { createFixtureContract } from "../../src/fixtures/driver.js";
import { createArborSchemaCatalogV1 } from "../../src/schemas/catalog.js";
import { assertContractSemantics, assertGateAnswer, assertJsonSchema, matchesRelativeGlob, validateJsonSchema } from "../../src/schemas/validate.js";
import { errorCode } from "../helpers.js";

function assertClosedAndBounded(schema: unknown, seen = new Set<object>()): void {
  if (!schema || typeof schema !== "object" || seen.has(schema)) return;
  seen.add(schema);
  const record = schema as Record<string, unknown>;
  if (record.type === "object") assert.equal(record.additionalProperties, false, "every object schema must be closed");
  if (record.type === "array") assert.equal(typeof record.maxItems, "number", "every array schema must be bounded");
  for (const value of Object.values(record)) {
    if (Array.isArray(value)) value.forEach((entry) => assertClosedAndBounded(entry, seen));
    else assertClosedAndBounded(value, seen);
  }
}

test("all normalized and public action schemas are recursively closed and bounded", () => {
  const catalog = createArborSchemaCatalogV1(40);
  assert.equal(Object.keys(catalog.actionInputs).length, 30);
  for (const schema of [...Object.values(catalog.schemas), ...Object.values(catalog.actionInputs)]) assertClosedAndBounded(schema);
});

test("contract schema rejects unknown fields and honors exact OID length", () => {
  const catalog = createArborSchemaCatalogV1(40);
  const contract = createFixtureContract();
  assert.deepEqual(validateJsonSchema(catalog.schemas.contract!, contract), []);
  assertJsonSchema(catalog.schemas.contract!, contract);
  assert.notEqual(validateJsonSchema(catalog.schemas.contract!, { ...contract, surprise: true }).length, 0);
  assert.notEqual(validateJsonSchema(createArborSchemaCatalogV1(64).schemas.contract!, contract).length, 0);
});

test("contract semantic boundaries reject inconsistent aggregation, reserve, paths, and admissions", () => {
  const contract = createFixtureContract();
  assert.doesNotThrow(() => assertContractSemantics(contract, { repositoryIds: new Set(["repo_fixture"]) }));
  assert.throws(() => assertContractSemantics({ ...contract, metric: { ...contract.metric, aggregation: "median", trialCount: 2 } }), errorCode("VALIDATION_FAILED"));
  assert.throws(() => assertContractSemantics({ ...contract, budgets: { ...contract.budgets, finalizationReserve: { ...contract.budgets.finalizationReserve, attempts: 4 } } }), errorCode("VALIDATION_FAILED"));
  assert.throws(() => assertContractSemantics({ ...contract, paths: { ...contract.paths, requiredOutputs: ["../escape"] } }), errorCode("VALIDATION_FAILED"));
  assert.throws(() => assertContractSemantics(contract, { repositoryIds: new Set(["repo_other"]) }), errorCode("VALIDATION_FAILED"));
});

test("certified relative glob grammar matches without traversal or backtracking constructs", () => {
  assert.equal(matchesRelativeGlob("src/nested/file.ts", "src/**"), true);
  assert.equal(matchesRelativeGlob("src/file.ts", "src/*.ts"), true);
  assert.equal(matchesRelativeGlob("other/file.ts", "src/**"), false);
  assert.throws(() => matchesRelativeGlob("../escape", "src/**"), errorCode("VALIDATION_FAILED"));
  assert.throws(() => matchesRelativeGlob("src/file.ts", "src/{a,b}"), errorCode("VALIDATION_FAILED"));
});

test("gate answers are kind, option, expiry, and purpose constrained", () => {
  const gate: GateV1 = { version: 1, gateId: "gate_fixture", answerKind: "singleChoice", optionIds: ["option_yes"], state: "OPEN", expiresAt: "2026-01-01T00:01:00.000Z" };
  assert.doesNotThrow(() => assertGateAnswer(gate, { version: 1, kind: "singleChoice", gateId: gate.gateId, optionId: "option_yes" }, "2026-01-01T00:00:00.000Z"));
  assert.throws(() => assertGateAnswer(gate, { version: 1, kind: "singleChoice", gateId: gate.gateId, optionId: "option_no" }, "2026-01-01T00:00:00.000Z"), errorCode("VALIDATION_FAILED"));
  assert.throws(() => assertGateAnswer(gate, { version: 1, kind: "singleChoice", gateId: gate.gateId, optionId: "option_yes" }, gate.expiresAt), errorCode("VALIDATION_FAILED"));
  const textGate: GateV1 = { ...gate, answerKind: "boundedText", optionIds: [] };
  assert.throws(() => assertGateAnswer(textGate, { version: 1, kind: "boundedText", gateId: gate.gateId, value: "expand policy" }, "2026-01-01T00:00:00.000Z"), errorCode("VALIDATION_FAILED"));
});
