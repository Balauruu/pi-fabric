import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { canonicalJson, digestCanonical, sha256 } from "../util/canonical.js";
import { runProcess } from "../system/process.js";
import {
  HOST_INTEGRATION_OBSERVATION_NAMES_V1,
  computeInstalledToolSourceDigests,
  computeRuntimePackageDigest,
  hostIntegrationLogDigest,
  loadApprovalRuntimeEvidence,
  loadHostAgentRuntimeEvidence,
  parseHostIntegrationSentinel,
  type HostIntegrationObservationsV1,
  type HostIntegrationRuntimeEvidenceV1,
} from "./runtime-evidence.js";
import { piFabricVersionIdV1 } from "./pi-fabric-support.js";

export const HOST_INTEGRATION_TIMEOUT_MS_V1 = 45_000;
export const HOST_INTEGRATION_MAX_OUTPUT_BYTES_V1 = 1_048_576;
export const HOST_INTEGRATION_TEST_PATH_V1 = "tests/integration/real-fabric.test.ts";
export const HOST_INTEGRATION_COMPILED_TEST_PATH_V1 = ".test-dist/tests/integration/real-fabric.test.js";

function processGroupIsEmpty(pid: number): boolean {
  try {
    process.kill(-pid, 0);
    try { process.kill(-pid, "SIGKILL"); } catch { /* best-effort cleanup before rejecting evidence */ }
    return false;
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === "ESRCH";
  }
}

function falseObservations(): HostIntegrationObservationsV1 {
  return Object.fromEntries(HOST_INTEGRATION_OBSERVATION_NAMES_V1.map((name) => [name, false])) as HostIntegrationObservationsV1;
}

export function assertHostIntegrationObservationsPassedV1(observations: HostIntegrationObservationsV1): void {
  const falseObservationNames = HOST_INTEGRATION_OBSERVATION_NAMES_V1.filter((name) => observations[name] !== true);
  if (falseObservationNames.length > 0) throw new Error(`host integration certifier rejected false observations: ${falseObservationNames.join(", ")}`);
}

export async function generateHostIntegrationRuntimeEvidence(input: {
  projectRoot: string;
  packageRoot: string;
  hostAgentArtifact: string;
  approvalArtifact: string;
  createdAt: string;
}): Promise<HostIntegrationRuntimeEvidenceV1> {
  if (!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/u.test(input.createdAt)) throw new Error("createdAt must use canonical RFC 3339 milliseconds");
  const projectRoot = resolve(input.projectRoot); const packageRoot = resolve(input.packageRoot); const packageSnapshot = computeRuntimePackageDigest(packageRoot);
  const hostAgent = loadHostAgentRuntimeEvidence(input.hostAgentArtifact); const approval = loadApprovalRuntimeEvidence(input.approvalArtifact);
  if (hostAgent.evidence.piFabricVersion !== packageSnapshot.version || approval.evidence.piFabricVersion !== packageSnapshot.version) throw new Error("host integration inputs do not match the exact pi-fabric package version");
  const sourceTest = readFileSync(join(projectRoot, HOST_INTEGRATION_TEST_PATH_V1));
  const compiledTest = readFileSync(join(projectRoot, HOST_INTEGRATION_COMPILED_TEST_PATH_V1));
  const command = [process.execPath, "--test", HOST_INTEGRATION_COMPILED_TEST_PATH_V1];
  const result = await runProcess(command, {
    cwd: projectRoot,
    env: { ...process.env, LANG: "C.UTF-8", LC_ALL: "C.UTF-8", TZ: "UTC", PI_FABRIC_CERT_PACKAGE_ROOT: packageRoot },
    timeoutMs: HOST_INTEGRATION_TIMEOUT_MS_V1,
    maxOutputBytes: HOST_INTEGRATION_MAX_OUTPUT_BYTES_V1,
    detached: true,
  });
  const processGroupEmpty = result.pid !== undefined && processGroupIsEmpty(result.pid);
  let observations = falseObservations();
  try { observations = parseHostIntegrationSentinel(result.stdout); } catch { /* failed/missing sentinel is rejected below */ }
  assertHostIntegrationObservationsPassedV1(observations);
  const complete = !result.timedOut && !result.cancelled && !result.oversized && processGroupEmpty;
  const observationsPassed = HOST_INTEGRATION_OBSERVATION_NAMES_V1.every((name) => observations[name]);
  const baseWithoutLog = {
    version: 1 as const,
    certificationId: `fabric_host_integration_runtime_pi_fabric_${piFabricVersionIdV1(packageSnapshot.version)}`,
    createdAt: input.createdAt,
    piFabricVersion: packageSnapshot.version,
    packageRuntimeDigest: packageSnapshot.digest,
    toolSourceDigests: computeInstalledToolSourceDigests(packageRoot),
    testPath: HOST_INTEGRATION_TEST_PATH_V1 as typeof HOST_INTEGRATION_TEST_PATH_V1,
    testDigest: sha256(sourceTest),
    compiledTestPath: HOST_INTEGRATION_COMPILED_TEST_PATH_V1 as typeof HOST_INTEGRATION_COMPILED_TEST_PATH_V1,
    compiledTestDigest: sha256(compiledTest),
    hostAgentArtifactDigest: hostAgent.artifactDigest,
    approvalArtifactDigest: approval.artifactDigest,
    command,
    timeoutMs: HOST_INTEGRATION_TIMEOUT_MS_V1 as 45_000,
    maxOutputBytes: HOST_INTEGRATION_MAX_OUTPUT_BYTES_V1 as 1_048_576,
    exitCode: result.exitCode,
    signal: result.signal,
    timedOut: result.timedOut,
    cancelled: result.cancelled,
    oversized: result.oversized,
    processGroupEmpty,
    complete,
    stdoutBytes: result.stdout.byteLength,
    stdoutBase64: result.stdout.toString("base64"),
    stdoutDigest: sha256(result.stdout),
    stderrBytes: result.stderr.byteLength,
    stderrBase64: result.stderr.toString("base64"),
    stderrDigest: sha256(result.stderr),
    observations,
    passed: complete && result.exitCode === 0 && result.signal === null && observationsPassed,
  };
  const logDigest = hostIntegrationLogDigest(baseWithoutLog);
  const unsigned = { ...baseWithoutLog, logDigest };
  return { ...unsigned, certificateDigest: digestCanonical(unsigned) };
}

export function writeHostIntegrationRuntimeEvidence(path: string, evidence: HostIntegrationRuntimeEvidenceV1): void {
  const target = resolve(path); mkdirSync(dirname(target), { recursive: true, mode: 0o700 });
  const temporary = `${target}.tmp-${process.pid}`;
  writeFileSync(temporary, `${canonicalJson(evidence)}\n`, { mode: 0o600 });
  renameSync(temporary, target);
}
