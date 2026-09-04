import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { LinuxBubblewrapContainmentAdapter } from "../../src/containment/BubblewrapContainmentAdapter.js";
import { SealedHeldOutEvaluatorServiceV1, probeHeldOutServiceDeniedV1, verifyHeldOutEvaluatorServiceSealV1 } from "../../src/evaluation/SealedHeldOutEvaluatorService.js";
import { PackageWorkspaceManager } from "../../src/git/PackageWorkspaceManager.js";
import { PHASE7_RESOURCE_ENFORCEMENT_CAPABILITIES_V1, ResourceBudgetAuthorityV1 } from "../../src/phase7/resources.js";
import { createGraduationThresholdSealV1, verifyGraduationThresholdSealV1 } from "../../src/phase7/thresholds.js";
import { sha256 } from "../../src/util/canonical.js";

function seal() { const now = new Date().toISOString(); return createGraduationThresholdSealV1({ sealId: "seal_phase7_test", sealedAt: now, notAfter: new Date(Date.parse(now) + 60_000).toISOString(), executionNonce: "n".repeat(32), signerId: "signer_phase7_test" }); }
function git(cwd: string, ...args: string[]): string { return execFileSync("/usr/bin/git", ["-C", cwd, ...args], { encoding: "utf8" }).trim(); }

test("threshold signature, pre-execution window, stale mutation, and create-only binding fail closed", () => {
  const value = seal(); assert.equal(verifyGraduationThresholdSealV1(value, { executionStartedAt: value.sealedAt, expectedNonce: "n".repeat(32) }).valid, true);
  assert.equal(verifyGraduationThresholdSealV1(value, { executionStartedAt: new Date(Date.parse(value.sealedAt) - 1).toISOString() }).valid, false);
  const tampered = structuredClone(value); tampered.thresholds.latency.maximumP99Ms += 1; assert.equal(verifyGraduationThresholdSealV1(tampered).valid, false);
});

test("resource authority advertises only cgroup-v2 process and memory enforcement and rejects ledger breaches", () => {
  assert.equal(PHASE7_RESOURCE_ENFORCEMENT_CAPABILITIES_V1.processes, "cgroup-v2-pids.max"); assert.equal(PHASE7_RESOURCE_ENFORCEMENT_CAPABILITIES_V1.rss, "cgroup-v2-memory.max");
  const root = mkdtempSync(join(tmpdir(), "arbor-p7-resource-")); try { const value = seal(); const authority = new ResourceBudgetAuthorityV1({ seal: value, journalPath: join(root, "journal.jsonl"), capabilities: PHASE7_RESOURCE_ENFORCEMENT_CAPABILITIES_V1 });
    authority.reserveAgent("reservation_agent_one", 100, "0.1"); authority.reserveAgent("reservation_agent_two", 100, "0.1"); authority.reserveAgent("reservation_agent_three", 100, "0.1"); assert.throws(() => authority.reserveAgent("reservation_agent_four", 100, "0.1"), /Concurrent-attempt/u);
    authority.settleAgent("reservation_agent_one", { actualTokens: 10, actualCostUsd: "0.01", observation: { metered: true } }); assert.throws(() => authority.settleAgent("reservation_agent_one", { actualTokens: 10, actualCostUsd: "0.01", observation: {} }), /missing, settled/u);
    assert.throws(() => authority.settleAgent("reservation_agent_two", { actualTokens: 101, actualCostUsd: "0.1", observation: { metered: true } }), /breached/u); assert.equal(authority.snapshot().breachCount, 1);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("sealed held-out Unix service evaluates exact committed OIDs and returns resource-bound canonical evidence", { timeout: 30_000 }, async () => {
  const root = mkdtempSync(join(tmpdir(), "arbor-p7-service-")); try {
    const state = join(root, "state"); const source = join(root, "source"); mkdirSync(state); mkdirSync(source); git(source, "init", "-q"); git(source, "config", "user.name", "test"); git(source, "config", "user.email", "test@invalid");
    writeFileSync(join(source, "result.txt"), "100\n"); git(source, "add", "."); git(source, "commit", "-qm", "baseline"); const baselineOid = git(source, "rev-parse", "HEAD");
    writeFileSync(join(source, "result.txt"), "112\n"); git(source, "commit", "-qam", "candidate"); const candidateOid = git(source, "rev-parse", "HEAD");
    const manager = new PackageWorkspaceManager({ stateRoot: state, repositoryId: "repo_service", sourceCheckout: source, expectedSourceOid: baselineOid }); await manager.importExactSource();
    const baseline = join(manager.repositoryRoot, "evaluations", "baseline"); const candidate = join(manager.repositoryRoot, "evaluations", "candidate"); await manager.exportCommittedOid(baselineOid, baseline); await manager.exportCommittedOid(candidateOid, candidate);
    const socketRoot = join(state, "s"); mkdirSync(socketRoot, { recursive: true, mode: 0o700 }); const held = join(root, "held"); writeFileSync(held, "0\n", { mode: 0o600 });
    const thresholds = seal(); const budgets = new ResourceBudgetAuthorityV1({ seal: thresholds, journalPath: join(state, "budgets.jsonl"), capabilities: PHASE7_RESOURCE_ENFORCEMENT_CAPABILITIES_V1 }); const containment = new LinuxBubblewrapContainmentAdapter({ stateRoot: state, allowedExecutables: [process.execPath], forbiddenHostPaths: [held] });
    const service = new SealedHeldOutEvaluatorServiceV1({ serviceId: "service_phase7_test", evaluatorId: "evaluator_phase7_test", socketPath: join(socketRoot, "service.sock"), stateRoot: state, privateGitDir: manager.privateGitDir, heldOutInput: held, expectedHeldOutInputDigest: sha256(readFileSync(held)), candidates: [{ candidateId: "candidate_baseline", oid: baselineOid, workspace: baseline, resultPath: "result.txt" }, { candidateId: "candidate_test", oid: candidateOid, workspace: candidate, resultPath: "result.txt" }], containment, containmentCertificateDigest: "c".repeat(64), thresholdSealDigest: thresholds.sealDigest, budgets, sealedAt: thresholds.sealedAt, signerId: "signer_service_test" }); assert.equal(verifyHeldOutEvaluatorServiceSealV1(service.seal), true); await service.start();
    assert.equal(await probeHeldOutServiceDeniedV1(service.socketPath, { requestId: "request_denied_test", evaluatorId: "evaluator_phase7_test", candidateId: "candidate_test" }), true); const receipt = await service.client().evaluate({ requestId: "request_allowed_test", evaluatorId: "evaluator_phase7_test", candidateId: "candidate_test" }); assert.equal(receipt.value, "112"); assert.equal(receipt.evaluatorPolicyDigest, service.seal.evaluatorPolicyDigest); assert.equal(receipt.candidateManifestDigest, service.seal.candidates.find((entry) => entry.candidateId === "candidate_test")?.candidateManifestDigest); assert.equal(receipt.peakProcesses <= thresholds.thresholds.resources.maximumProcesses, true); await service.close();
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("Bubblewrap kernel cgroups enforce output, wall, pids.max, and memory.max and are empty afterward", { timeout: 30_000 }, async () => {
  const root = mkdtempSync(join(tmpdir(), "arbor-p7-process-budget-")); try { const state = join(root, "state"); const workspace = join(state, "workspace"); mkdirSync(workspace, { recursive: true }); const containment = new LinuxBubblewrapContainmentAdapter({ stateRoot: state, allowedExecutables: [process.execPath] }); const base = { version: 1 as const, workspace, permissions: { network: false, packageInstallation: false, processExecution: true }, maxOutputBytes: 1024, timeoutMs: 2_000, resourceLimits: { maxProcesses: 16, maxRssBytes: 268_435_456 } };
    const output = await containment.run({ ...base, containmentId: "containment_output_breach", argv: [process.execPath, "-e", "process.stdout.write('x'.repeat(100000))"] }); assert.equal(output.oversized, true); assert.equal(output.resourceUsage.cgroupEmpty, true);
    const wall = await containment.run({ ...base, containmentId: "containment_wall_breach", timeoutMs: 50, argv: [process.execPath, "-e", "setInterval(()=>{},1000)"] }); assert.equal(wall.timedOut, true); assert.equal(wall.resourceUsage.source, "cgroup-v2");
    const processes = await containment.run({ ...base, containmentId: "containment_process_breach", resourceLimits: { maxProcesses: 12, maxRssBytes: 268_435_456 }, argv: [process.execPath, "-e", "const c=require('node:child_process');for(let i=0;i<20;i++){try{c.spawn(process.execPath,['-e','setInterval(()=>{},1000)'])}catch{}}setInterval(()=>{},1000)"] }); assert.equal(processes.identity.resourceControl?.pidsMax, 12); assert.equal(processes.resourceUsage.breach, "processes"); assert.equal(processes.resourceUsage.cgroupEmpty, true);
    const rss = await containment.run({ ...base, containmentId: "containment_rss_breach", resourceLimits: { maxProcesses: 16, maxRssBytes: 33_554_432 }, argv: [process.execPath, "-e", "Buffer.alloc(128*1024*1024,1);setInterval(()=>{},1000)"] }); assert.equal(rss.identity.resourceControl?.memoryMax, 33_554_432); assert.equal(rss.resourceUsage.breach, "rss"); assert.equal(rss.resourceUsage.cgroupEmpty, true);
  } finally { rmSync(root, { recursive: true, force: true }); }
});
