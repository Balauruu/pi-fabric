import { parseCanonicalDecimal } from "../domain/decimal.js";
import { ArborError } from "../domain/errors.js";
import type { ArborContractV1, CanonicalDecimal, GitOid, Sha256 } from "../domain/types.js";
import { FIXTURE_SCHEMAS_V1 } from "../schemas/catalog.js";
import { assertJsonSchema } from "../schemas/validate.js";

export interface EvaluatorRecordV1 {
  version: 1;
  runId: string;
  evaluationId: string;
  contractDigest: Sha256;
  epochDigest: Sha256;
  oid: GitOid;
  evaluatorId: string;
  parserVersion: string;
  split: "development" | "heldOut";
  metric: string;
  unit: string;
  value: CanonicalDecimal;
  seed: number;
  trialOrdinal: number;
  outputDigest: Sha256;
  artifacts: Array<{ artifactId: string; digest: Sha256 }>;
  requiredOutputs: Array<{ path: string; digest: Sha256 }>;
  containmentId: string;
  environmentDigest: Sha256;
}

export interface ExpectedEvaluatorIdentityV1 {
  runId: string;
  evaluationId: string;
  contractDigest: Sha256;
  epochDigest: Sha256;
  oid: GitOid;
  evaluatorId: string;
  parserVersion: string;
  split: "development" | "heldOut";
  contract: ArborContractV1;
}

export function parseStrictEvaluatorRecord(output: string, expected: ExpectedEvaluatorIdentityV1, gitOidLength: 40 | 64 = 40): EvaluatorRecordV1 {
  if (Buffer.byteLength(output, "utf8") > 1_048_576) throw new ArborError("EVIDENCE_INVALID", "Evaluator output exceeds 1 MiB");
  const trimmed = output.trim();
  if (trimmed.length === 0 || trimmed.split(/\r?\n/u).length !== 1) throw new ArborError("EVIDENCE_INVALID", "Evaluator must emit exactly one single-line structured record");
  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    throw new ArborError("EVIDENCE_INVALID", "Evaluator output is not strict JSON");
  }
  const catalog = gitOidLength === 40 ? FIXTURE_SCHEMAS_V1 : (awaitCatalog64());
  assertJsonSchema(catalog.schemas.evaluatorRecord!, parsed, "evaluator record");
  const record = parsed as EvaluatorRecordV1;
  try {
    parseCanonicalDecimal(record.value);
  } catch {
    throw new ArborError("EVIDENCE_INVALID", "Evaluator value is not a canonical decimal");
  }
  const checks: Array<[unknown, unknown, string]> = [
    [record.runId, expected.runId, "run"], [record.evaluationId, expected.evaluationId, "evaluation"],
    [record.contractDigest, expected.contractDigest, "contract"], [record.epochDigest, expected.epochDigest, "epoch"],
    [record.oid, expected.oid, "OID"], [record.evaluatorId, expected.evaluatorId, "evaluator"],
    [record.parserVersion, expected.parserVersion, "parser"], [record.split, expected.split, "split"],
    [record.metric, expected.contract.metric.name, "metric"], [record.unit, expected.contract.metric.unit, "unit"],
  ];
  for (const [actual, wanted, label] of checks) if (actual !== wanted) throw new ArborError("EVIDENCE_INVALID", `Evaluator ${label} mismatch`);
  return record;
}

function awaitCatalog64() {
  // Kept synchronous and local so strict parsing has no dynamic schema or network dependency.
  return FIXTURE_SCHEMAS_V1.gitOidLength === 64 ? FIXTURE_SCHEMAS_V1 : create64();
}

function create64() {
  // Dynamic import is intentionally unnecessary; this helper avoids a mutable singleton.
  const clone = structuredClone(FIXTURE_SCHEMAS_V1);
  const replace = (value: unknown): void => {
    if (!value || typeof value !== "object") return;
    const record = value as Record<string, unknown>;
    if (record.pattern === "^[0-9a-f]{40}$") {
      record.pattern = "^[0-9a-f]{64}$";
      record.minLength = 64;
      record.maxLength = 64;
    }
    Object.values(record).forEach(replace);
  };
  replace(clone);
  return clone;
}
