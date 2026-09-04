import { mkdirSync, mkdtempSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { CanonicalEvaluatorReadOnlyMountGrant, LinuxBubblewrapContainmentAdapter } from "../containment/BubblewrapContainmentAdapter.js";
import { createHeldOutIsolationCertificate, verifyHeldOutIsolationCertificate, type HeldOutIsolationCertificateV1, type HeldOutIsolationTestV1 } from "../evaluation/HeldOutIsolationAdapter.js";
import { canonicalJson, digestCanonical, sha256 } from "../util/canonical.js";

const FILE = "held-out-isolation-certificate.v1.json";
const SHELL = "/usr/bin/sh";

function request(containmentId: string, workspace: string, script: string, args: string[] = []) {
  return { version: 1 as const, containmentId, workspace, argv: [SHELL, "-c", script, "arbor-held-out-test", ...args], permissions: { network: false, packageInstallation: false, processExecution: true }, workspaceWritable: false, timeoutMs: 10_000, maxOutputBytes: 65_536 };
}

function result(name: HeldOutIsolationTestV1["name"], passed: boolean, evidence: unknown): HeldOutIsolationTestV1 {
  return { name, direct: true, passed, observationDigest: digestCanonical({ name, evidence }) };
}

export async function generateLocalHeldOutIsolationCertification(input: { projectRoot: string; outputRoot: string; createdAt: string; signerId: string }): Promise<HeldOutIsolationCertificateV1> {
  const projectRoot = resolve(input.projectRoot); const outputRoot = resolve(input.outputRoot);
  const fixture = mkdtempSync(join(tmpdir(), "arbor-b8-"));
  try {
    const stateRoot = join(fixture, "state"); const workspace = join(stateRoot, "workspace"); const heldOut = join(fixture, "sealed-held-out.v1");
    mkdirSync(workspace, { recursive: true, mode: 0o700 }); writeFileSync(heldOut, "held-out-fixture\n", { mode: 0o600 });
    const opaqueToken = sha256(`b8:${input.createdAt}:${process.pid}`);
    const containment = new LinuxBubblewrapContainmentAdapter({ stateRoot, allowedExecutables: [SHELL], forbiddenHostPaths: [heldOut] });
    const prerequisite = await containment.verifyPrerequisites();
    const grant = new CanonicalEvaluatorReadOnlyMountGrant(heldOut, opaqueToken);
    const tests: HeldOutIsolationTestV1[] = [];
    const workerMount = await containment.run(request("containment_b8_worker_mount", workspace, "[ ! -e /held-out ]"));
    tests.push(result("worker-mount-absent", workerMount.exitCode === 0, { exitCode: workerMount.exitCode, mountPolicyDigest: workerMount.identity.mountPolicyDigest }));
    const workerToken = await containment.run(request("containment_b8_worker_token", workspace, "[ -z \"${ARBOR_HELD_OUT_TOKEN+x}\" ] && [ -z \"${ARBOR_HELD_OUT_PATH+x}\" ]"));
    tests.push(result("worker-token-absent", workerToken.exitCode === 0, { exitCode: workerToken.exitCode, environmentDigest: workerToken.identity.environmentDigest }));
    const hostPath = await containment.run(request("containment_b8_worker_path", workspace, "[ ! -e \"$1\" ]", [heldOut]));
    tests.push(result("worker-host-path-denied", hostPath.exitCode === 0, { exitCode: hostPath.exitCode, stderrDigest: hostPath.stderrDigest }));
    let resolutionDenied = false;
    try { await containment.runCanonicalEvaluator(request("containment_b8_resolution", workspace, "true"), grant, sha256("wrong-token")); } catch { resolutionDenied = true; }
    tests.push(result("worker-resolution-denied", resolutionDenied, { denied: resolutionDenied }));
    const positive = await containment.runCanonicalEvaluator(request("containment_b8_evaluator_read", workspace, "read value < /held-out; [ \"$value\" = held-out-fixture ] && printf certified"), grant, opaqueToken);
    tests.push(result("evaluator-read-positive", positive.exitCode === 0 && positive.stdout === "certified", { exitCode: positive.exitCode, stdoutDigest: positive.stdoutDigest, mountPolicyDigest: positive.identity.mountPolicyDigest }));
    const deniedWrite = await containment.runCanonicalEvaluator(request("containment_b8_evaluator_write", workspace, "printf changed > /held-out"), grant, opaqueToken);
    tests.push(result("evaluator-write-denied", deniedWrite.exitCode !== 0 && readFileSync(heldOut, "utf8") === "held-out-fixture\n", { exitCode: deniedWrite.exitCode, stderrDigest: deniedWrite.stderrDigest, retainedDigest: sha256(readFileSync(heldOut)) }));
    let invalidToken = false;
    try { await containment.runCanonicalEvaluator(request("containment_b8_invalid_token", workspace, "true"), grant, `${opaqueToken}x`); } catch { invalidToken = true; }
    tests.push(result("invalid-token-denied", invalidToken, { denied: invalidToken }));
    const certificate = createHeldOutIsolationCertificate({ certificateId: "held_out_linux_bwrap_v1", createdAt: input.createdAt, signerId: input.signerId, containment, bwrapVersion: prerequisite.bwrapVersion, packageLockPath: join(projectRoot, "package-lock.json"), executablePath: SHELL, tests });
    mkdirSync(outputRoot, { recursive: true, mode: 0o700 });
    const raw = `${canonicalJson(certificate)}\n`; const temporary = join(outputRoot, `${FILE}.tmp`);
    writeFileSync(temporary, raw, { mode: 0o600 }); renameSync(temporary, join(outputRoot, FILE));
    writeFileSync(join(outputRoot, `${FILE}.sha256`), `${sha256(raw)}  ${FILE}\n`, { mode: 0o600 });
    return certificate;
  } finally { rmSync(fixture, { recursive: true, force: true }); }
}

export function verifyLocalHeldOutIsolationCertification(input: { projectRoot: string; artifactRoot: string }): { valid: boolean; certificate: HeldOutIsolationCertificateV1 } {
  const projectRoot = resolve(input.projectRoot); const artifactRoot = resolve(input.artifactRoot);
  const raw = readFileSync(join(artifactRoot, FILE), "utf8"); const certificate = JSON.parse(raw) as HeldOutIsolationCertificateV1;
  const scratch = mkdtempSync(join(tmpdir(), "arbor-b8-verify-"));
  try {
    const stateRoot = join(scratch, "state"); mkdirSync(stateRoot, { recursive: true, mode: 0o700 });
    const containment = new LinuxBubblewrapContainmentAdapter({ stateRoot, allowedExecutables: [SHELL] });
    const checksum = readFileSync(join(artifactRoot, `${FILE}.sha256`), "utf8").trim().split(/\s+/u)[0];
    const valid = checksum === sha256(raw) && verifyHeldOutIsolationCertificate(certificate, { containment, packageLockPath: join(projectRoot, "package-lock.json"), executablePath: SHELL });
    return { valid, certificate };
  } finally { rmSync(scratch, { recursive: true, force: true }); }
}
