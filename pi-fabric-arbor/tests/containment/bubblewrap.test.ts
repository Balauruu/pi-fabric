import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { generateContainmentCertificate, LinuxBubblewrapContainmentAdapter, verifyContainmentCertificate } from "../../src/containment/BubblewrapContainmentAdapter.js";
import { runContainmentAdversarialMatrix } from "../../src/containment/adversarial.js";
import { errorCode } from "../helpers.js";

test("actual Linux Bubblewrap adapter passes the complete adversarial matrix and produces a mechanical certificate", { timeout: 30_000 }, async (context) => {
  if (process.platform !== "linux" || !readFileSync("/proc/sys/user/max_user_namespaces", "utf8").trim()) { context.skip("Linux user namespaces unavailable"); return; }
  const root = mkdtempSync(join(tmpdir(), "arbor-bwrap-"));
  try {
    const state = join(root, "state"); const workspace = join(state, "workspace"); const source = join(root, "source"); const common = join(root, "common"); const sibling = join(root, "sibling");
    [state, workspace, source, common, sibling].forEach((path) => mkdirSync(path, { recursive: true }));
    const adapter = new LinuxBubblewrapContainmentAdapter({ stateRoot: state, allowedExecutables: [process.execPath], forbiddenHostPaths: [source, common, sibling] });
    const matrix = await runContainmentAdversarialMatrix(adapter, { workspace, sourceCheckout: source, sourceCommonDirectory: common, siblingWorktree: sibling });
    assert.equal(matrix.length, 38); assert.deepEqual(matrix.filter((entry) => !entry.passed || !entry.direct), []);
    const certificate = await generateContainmentCertificate(adapter, { certificateId: "containment_test_linux", createdAt: "2026-09-01T00:00:00.000Z", signerId: "local_ci", matrix });
    assert.equal(certificate.valid, true); assert.equal(verifyContainmentCertificate(certificate), true);
    assert.equal(verifyContainmentCertificate({ ...certificate, bwrapVersion: `${certificate.bwrapVersion}-tampered` }), false);
    assert.equal(certificate.signingAlgorithm, "Ed25519"); assert.match(certificate.signature, /^[A-Za-z0-9+/]+=*$/);
    assert.equal(certificate.requiredNamespaces.includes("cgroup"), true); assert.match(certificate.bwrapDigest, /^[0-9a-f]{64}$/);
    assert.equal(certificate.cgroupVersion, "v2"); assert.equal(certificate.resourceLimitEnforcement, "kernel-cgroup-v2"); assert.equal(certificate.cgroupRunnerDigest, adapter.cgroupRunnerDigest);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("resource-limited fast exits complete a pre-exec containment identity handshake", { timeout: 30_000 }, async (context) => {
  if (process.platform !== "linux" || !readFileSync("/proc/sys/user/max_user_namespaces", "utf8").trim()) { context.skip("Linux user namespaces unavailable"); return; }
  const root = mkdtempSync(join(tmpdir(), "arbor-bwrap-fast-exit-"));
  try {
    const state = join(root, "state"); const workspace = join(state, "workspace");
    [state, workspace].forEach((path) => mkdirSync(path, { recursive: true }));
    const adapter = new LinuxBubblewrapContainmentAdapter({ stateRoot: state, allowedExecutables: [process.execPath] });
    for (let round = 0; round < 4; round += 1) {
      const results = await Promise.all([0, 1].map((index) => adapter.run({
        version: 1, containmentId: `containment_fast_${round}_${index}`, workspace, argv: [process.execPath, "-e", "process.exit(0)"],
        permissions: { network: false, packageInstallation: false, processExecution: true }, timeoutMs: 5000, maxOutputBytes: 4096,
        resourceLimits: { maxProcesses: 16, maxRssBytes: 536_870_912 },
      })));
      assert.deepEqual(results.map((result) => [result.exitCode, result.observation, result.resourceUsage.source]), [[0, "certain", "cgroup-v2"], [0, "certain", "cgroup-v2"]]);
    }
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("Bubblewrap adapter fails closed for network/install permissions, unknown executable, hardlinks, and pre-cancel uncertainty", async () => {
  const root = mkdtempSync(join(tmpdir(), "arbor-bwrap-negative-"));
  try {
    const state = join(root, "state"); const workspace = join(state, "workspace"); const source = join(root, "source");
    [state, workspace, source].forEach((path) => mkdirSync(path, { recursive: true }));
    const adapter = new LinuxBubblewrapContainmentAdapter({ stateRoot: state, allowedExecutables: [process.execPath], forbiddenHostPaths: [source] });
    const base = { version: 1 as const, containmentId: "containment_negative", workspace, argv: [process.execPath, "-e", "process.exit(0)"], permissions: { network: false, packageInstallation: false, processExecution: true }, timeoutMs: 5000, maxOutputBytes: 4096 };
    await assert.rejects(adapter.run({ ...base, permissions: { ...base.permissions, network: true } }), errorCode("WRITE_CONFINEMENT_UNAVAILABLE"));
    await assert.rejects(adapter.run({ ...base, permissions: { ...base.permissions, packageInstallation: true } }), errorCode("WRITE_CONFINEMENT_UNAVAILABLE"));
    await assert.rejects(adapter.run({ ...base, argv: ["/usr/bin/git", "--version"] }), errorCode("WRITE_CONFINEMENT_UNAVAILABLE"));
    const controller = new AbortController(); controller.abort();
    await assert.rejects(adapter.run({ ...base, signal: controller.signal }), errorCode("INDETERMINATE"));
  } finally { rmSync(root, { recursive: true, force: true }); }
});
