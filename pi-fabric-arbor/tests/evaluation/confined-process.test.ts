import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import type { EvaluationRequestV1 } from "../../src/adapters/interfaces.js";
import { CONTAINMENT_REQUIRED_MATRIX_V1, generateContainmentCertificate, LinuxBubblewrapContainmentAdapter, type ContainmentCertificateV1 } from "../../src/containment/BubblewrapContainmentAdapter.js";
import { ConfinedProcessEvaluator, type ProcessEvaluatorTrialSpecV1 } from "../../src/evaluation/ConfinedProcessEvaluator.js";
import { createFixtureContract } from "../../src/fixtures/driver.js";
import { PackageWorkspaceManager } from "../../src/git/PackageWorkspaceManager.js";
import { ArtifactStore } from "../../src/persistence/ArtifactStore.js";
import { digestCanonical, sha256 } from "../../src/util/canonical.js";

function git(cwd: string, ...args: string[]): string { return execFileSync("/usr/bin/git", ["-C", cwd, ...args], { encoding: "utf8" }).trim(); }

async function setup(root: string) {
  const state = join(root, "state"); const source = join(root, "source"); const forbidden = join(root, "forbidden");
  mkdirSync(source, { recursive: true }); mkdirSync(state); mkdirSync(forbidden);
  git(source, "init", "-q"); git(source, "config", "user.email", "eval@example.invalid"); git(source, "config", "user.name", "Evaluator");
  writeFileSync(join(source, "result.txt"), "required\n"); writeFileSync(join(source, "protected.txt"), "protected\n"); git(source, "add", "."); git(source, "commit", "-qm", "candidate");
  const oid = git(source, "rev-parse", "HEAD"); const manager = new PackageWorkspaceManager({ stateRoot: state, repositoryId: "repo_evaluator", sourceCheckout: source, expectedSourceOid: oid });
  await manager.materialize({ version: 1, runId: "run_evaluator", attemptId: "attempt_evaluator", workspaceId: "workspace_evaluator", baseOid: oid, idempotencyKey: "materialize_evaluator" });
  return { state, workspace: manager.workspacePath("run_evaluator", "workspace_evaluator"), forbidden, oid, privateGitDir: manager.privateGitDir };
}

async function testCertificate(adapter: LinuxBubblewrapContainmentAdapter): Promise<ContainmentCertificateV1> {
  return generateContainmentCertificate(adapter, { certificateId: "containment_evaluator_test", createdAt: "2026-09-01T00:00:00.000Z", signerId: "test_signer", matrix: CONTAINMENT_REQUIRED_MATRIX_V1.map((name) => ({ name, passed: true, direct: true, observationDigest: sha256(name) })) });
}

function request(oid: string): EvaluationRequestV1 {
  const base = createFixtureContract();
  const contract = { ...base, repository: { ...base.repository, initialOid: oid }, metric: { ...base.metric, trialCount: 1, aggregation: "single" as const }, evaluation: { ...base.evaluation, development: "evaluator_dev", parserVersion: "parser_v1" }, paths: { editable: ["**"], protected: ["protected.txt"], requiredOutputs: ["result.txt"] } };
  return { version: 1, evaluationId: "evaluation_process", effectId: "effect_process", certificateId: "certificate_process", runId: "run_process", epochDigest: digestCanonical(contract), contractDigest: digestCanonical(contract), role: "developmentCandidate", oid, contract };
}

function validSpec(adapter: LinuxBubblewrapContainmentAdapter, value = "1.25", artifacts: Array<{ artifactId: string; digest: string }> = []): ProcessEvaluatorTrialSpecV1 {
  return {
    version: 1, evaluatorId: "evaluator_dev", evaluatorVersion: "evaluator_v1", parserVersion: "parser_v1", executableDigest: sha256(readFileSync(process.execPath)),
    configurationDigest: sha256("configuration"), environmentDigest: adapter.policyDigests().environmentPolicyDigest, timeoutMs: 5000, maxOutputBytes: 65_536,
    argv({ request: evaluation, seed, ordinal }) {
      const containmentId = `containment_${sha256(`${evaluation.evaluationId}:${ordinal}`).slice(0, 32)}`;
      const payload = { version: 1 as const, runId: evaluation.runId, evaluationId: evaluation.evaluationId, contractDigest: evaluation.contractDigest, epochDigest: evaluation.epochDigest, oid: evaluation.oid, evaluatorId: "evaluator_dev", parserVersion: "parser_v1", split: "development" as const, metric: evaluation.contract.metric.name, unit: evaluation.contract.metric.unit, value, seed, trialOrdinal: ordinal, artifacts, requiredOutputs: [{ path: "result.txt", digest: sha256("required\n") }], containmentId, environmentDigest: adapter.policyDigests().environmentPolicyDigest };
      const record = { ...payload, outputDigest: digestCanonical(payload) };
      return [process.execPath, "-e", `process.stdout.write(${JSON.stringify(JSON.stringify(record))})`];
    },
  };
}

function evaluator(paths: Awaited<ReturnType<typeof setup>>, adapter: LinuxBubblewrapContainmentAdapter, certificate: ContainmentCertificateV1, spec = validSpec(adapter), signalForEvaluation?: () => AbortSignal, artifactEvidenceVerifier?: ReturnType<ArtifactStore["createEvidenceVerifier"]>): ConfinedProcessEvaluator {
  return new ConfinedProcessEvaluator({ containment: adapter, containmentCertificate: certificate, workspaceForOid: () => paths.workspace, privateGitDirForOid: () => paths.privateGitDir, gitStateRoot: paths.state, development: spec, ...(signalForEvaluation ? { signalForEvaluation } : {}), ...(artifactEvidenceVerifier ? { artifactEvidenceVerifier } : {}) });
}

test("confined evaluator creates an exact committed-OID certified single-record result without persisting process text", async () => {
  const root = mkdtempSync(join(tmpdir(), "arbor-process-evaluator-"));
  try {
    const paths = await setup(root); const adapter = new LinuxBubblewrapContainmentAdapter({ stateRoot: paths.state, allowedExecutables: [process.execPath], forbiddenHostPaths: [paths.forbidden] });
    const containmentCertificate = await testCertificate(adapter); const certificate = await evaluator(paths, adapter, containmentCertificate).evaluate(request(paths.oid));
    assert.equal(certificate.valid, true); assert.equal(certificate.trust, "certified"); assert.deepEqual(certificate.rawTrials, ["1.25"]);
    assert.equal(certificate.protectedManifest.length, 1); assert.equal(certificate.requiredOutputs[0]?.path, "result.txt");
    assert.equal(certificate.containmentCertificateDigest, containmentCertificate.certificateDigest); assert.match(certificate.exactBindingsDigest, /^[0-9a-f]{64}$/);
    assert.deepEqual(Object.keys(certificate.logs[0]!).sort(), ["stderrBytes", "stderrDigest", "stdoutBytes", "stdoutDigest"]);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("evaluator artifacts are accepted only through exact principal/run/effect/digest capabilities", async () => {
  const root = mkdtempSync(join(tmpdir(), "arbor-process-artifact-"));
  try {
    const paths = await setup(root); const adapter = new LinuxBubblewrapContainmentAdapter({ stateRoot: paths.state, allowedExecutables: [process.execPath], forbiddenHostPaths: [paths.forbidden] }); const containmentCertificate = await testCertificate(adapter);
    const store = await ArtifactStore.open(join(paths.state, "artifacts")); const artifact = await store.putText("bounded evidence"); const spec = validSpec(adapter, "1.25", [{ artifactId: artifact.artifactId, digest: artifact.digest }]);
    const accepted = await evaluator(paths, adapter, containmentCertificate, spec, undefined, store.createEvidenceVerifier()).evaluate(request(paths.oid)); assert.equal(accepted.valid, true);
    assert.equal(store.auditRecords().some((entry) => entry.action === "read" && entry.principalId === "evaluator_dev" && entry.runId === "run_process" && entry.effectId === "effect_process" && entry.expectedDigest === artifact.digest), true);
    const denied = await evaluator(paths, adapter, containmentCertificate, spec).evaluate(request(paths.oid)); assert.equal(denied.valid, false); assert.match(denied.rejectionReason ?? "", /capability verifier/u);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

for (const mode of ["multiple", "malformed", "oversize", "timeout"] as const) test(`confined evaluator rejects ${mode} output without a valid certificate`, { timeout: 15_000 }, async () => {
  const root = mkdtempSync(join(tmpdir(), `arbor-process-${mode}-`));
  try {
    const paths = await setup(root); const adapter = new LinuxBubblewrapContainmentAdapter({ stateRoot: paths.state, allowedExecutables: [process.execPath], forbiddenHostPaths: [paths.forbidden] });
    const containmentCertificate = await testCertificate(adapter); const spec = validSpec(adapter); spec.maxOutputBytes = mode === "oversize" ? 1024 : 65_536; spec.timeoutMs = mode === "timeout" ? 100 : 5000;
    spec.argv = () => [process.execPath, "-e", mode === "multiple" ? "console.log('{}');console.log('{}')" : mode === "malformed" ? "process.stdout.write('{')" : mode === "oversize" ? "process.stdout.write('x'.repeat(100000))" : "setInterval(()=>{},1000)"];
    const certificate = await evaluator(paths, adapter, containmentCertificate, spec).evaluate(request(paths.oid)); assert.equal(certificate.valid, false); assert.equal(typeof certificate.rejectionReason, "string");
    if (mode === "timeout") assert.equal(certificate.exitStatuses[0]?.timedOut, true); if (mode === "oversize") assert.equal(certificate.exitStatuses[0]?.oversized, true);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("confined evaluator rejects dirty, untracked, and symlink-substituted workspace bytes before execution", async () => {
  for (const mutation of ["dirty", "untracked", "symlink"] as const) {
    const root = mkdtempSync(join(tmpdir(), `arbor-process-mutation-${mutation}-`));
    try {
      const paths = await setup(root); const adapter = new LinuxBubblewrapContainmentAdapter({ stateRoot: paths.state, allowedExecutables: [process.execPath], forbiddenHostPaths: [paths.forbidden] });
      if (mutation === "dirty") writeFileSync(join(paths.workspace, "result.txt"), "changed\n");
      else if (mutation === "untracked") writeFileSync(join(paths.workspace, "extra.txt"), "extra\n");
      else { rmSync(join(paths.workspace, "result.txt")); symlinkSync("protected.txt", join(paths.workspace, "result.txt")); }
      const containmentCertificate = await testCertificate(adapter); await assert.rejects(evaluator(paths, adapter, containmentCertificate).evaluate(request(paths.oid)), /workspace bytes do not exactly equal|symlink/u);
    } finally { rmSync(root, { recursive: true, force: true }); }
  }
});

test("confined evaluator cancellation terminates the complete namespace tree and held-out stays inaccessible", { timeout: 15_000 }, async () => {
  const root = mkdtempSync(join(tmpdir(), "arbor-process-cancel-"));
  try {
    const paths = await setup(root); const adapter = new LinuxBubblewrapContainmentAdapter({ stateRoot: paths.state, allowedExecutables: [process.execPath], forbiddenHostPaths: [paths.forbidden] });
    const containmentCertificate = await testCertificate(adapter); const spec = validSpec(adapter); spec.argv = () => [process.execPath, "-e", "setInterval(()=>{},1000)"]; spec.timeoutMs = 5000;
    const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), 300); timer.unref();
    const instance = evaluator(paths, adapter, containmentCertificate, spec, () => controller.signal); const certificate = await instance.evaluate(request(paths.oid));
    assert.equal(certificate.valid, false); assert.equal(certificate.rejectionReason, "CANCELLED"); assert.equal(certificate.descendantTerminationObserved, true);
    await assert.rejects(instance.evaluate({ ...request(paths.oid), evaluationId: "evaluation_heldout", certificateId: "certificate_heldout", role: "heldOutCandidate" }), (error: unknown) => Boolean(error && typeof error === "object" && "code" in error && error.code === "HELD_OUT_ISOLATION_REQUIRED"));
  } finally { rmSync(root, { recursive: true, force: true }); }
});
