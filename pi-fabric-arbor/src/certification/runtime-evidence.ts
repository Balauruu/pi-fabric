import { lstatSync, readFileSync, readlinkSync, readdirSync, realpathSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";
import { ArborError } from "../domain/errors.js";
import type { JsonSchema } from "../schemas/catalog.js";
import { validateJsonSchema } from "../schemas/validate.js";
import { canonicalJson, digestCanonical, sha256 } from "../util/canonical.js";
import { CERTIFIED_PI_FABRIC_VERSIONS_V1, assertCertifiedPiFabricVersionV1, piFabricVersionIdV1, projectRelativePathV1, type CertifiedPiFabricVersionV1 } from "./pi-fabric-support.js";

const SHA256_SCHEMA = { type: "string", pattern: "^[0-9a-f]{64}$", minLength: 64, maxLength: 64 } as const;
const TIMESTAMP_SCHEMA = { type: "string", pattern: "^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\\.[0-9]{3}Z$", minLength: 24, maxLength: 24 } as const;
const CHILD_ID_SCHEMA = { type: "string", pattern: "^[0-9a-f]{32}$", minLength: 32, maxLength: 32 } as const;
const SAFE_INTEGER_SCHEMA = { type: "integer", minimum: 0, maximum: Number.MAX_SAFE_INTEGER } as const;
const BASE64_SCHEMA = { type: "string", pattern: "^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$", maxLength: 1_398_104 } as const;
const SUPPORTED_VERSION_SCHEMA = { enum: [...CERTIFIED_PI_FABRIC_VERSIONS_V1] } as const;
const HOST_RUNTIME_ID_SCHEMA = { type: "string", pattern: "^fabric_host_runtime_pi_fabric_0_(?:76_2|77_0)$" } as const;
const HOST_INTEGRATION_ID_SCHEMA = { type: "string", pattern: "^fabric_host_integration_runtime_pi_fabric_0_(?:76_2|77_0)$" } as const;

function object(properties: Record<string, JsonSchema>, required: readonly string[] = Object.keys(properties)): JsonSchema {
  return { type: "object", properties, required, additionalProperties: false };
}
function array(items: JsonSchema, maxItems: number, minItems = 0): JsonSchema {
  return { type: "array", items, minItems, maxItems };
}

const completedObservation = object({
  id: CHILD_ID_SCHEMA, status: { const: "completed" }, runner: { const: "pi" }, turns: SAFE_INTEGER_SCHEMA,
  toolCalls: SAFE_INTEGER_SCHEMA, exitCode: { const: 0 }, hasUsage: { type: "boolean" }, finishedAt: SAFE_INTEGER_SCHEMA,
});
const stoppedObservation = object({
  id: CHILD_ID_SCHEMA, status: { const: "stopped" }, runner: { const: "pi" }, turns: SAFE_INTEGER_SCHEMA,
  toolCalls: SAFE_INTEGER_SCHEMA, exitCode: { const: 143 }, hasUsage: { type: "boolean" }, finishedAt: SAFE_INTEGER_SCHEMA,
});
const runningStatusObservation = object({
  id: CHILD_ID_SCHEMA, status: { const: "running" }, runner: { const: "pi" }, exitCode: { const: null },
  hasUsage: { type: "boolean" }, finishedAt: { const: null },
});
const runningCancellationObservation = object({
  id: CHILD_ID_SCHEMA, status: { const: "running" }, runner: { const: "pi" }, turns: SAFE_INTEGER_SCHEMA,
  toolCalls: SAFE_INTEGER_SCHEMA, exitCode: { const: null }, hasUsage: { type: "boolean" }, finishedAt: { const: null },
});

export const HOST_AGENT_RUNTIME_EVIDENCE_SCHEMA_V1: JsonSchema = object({
  version: { const: 1 }, certificationId: HOST_RUNTIME_ID_SCHEMA, createdAt: TIMESTAMP_SCHEMA,
  piFabricVersion: SUPPORTED_VERSION_SCHEMA, runner: { const: "pi" },
  actions: object({
    run: object({ passed: { type: "boolean" }, observation: completedObservation }),
    spawn: object({ passed: { type: "boolean" }, observation: object({ id: CHILD_ID_SCHEMA }) }),
    status: object({ passed: { type: "boolean" }, observation: runningStatusObservation }),
    wait: object({ passed: { type: "boolean" }, observation: completedObservation }),
    cleanup: object({ passed: { type: "boolean" }, observation: object({ cleaned: { type: "boolean" } }) }),
    stop: object({ passed: { type: "boolean" }, observation: stoppedObservation }),
  }),
  cancellation: object({ markerObserved: { type: "boolean" }, before: runningCancellationObservation, stop: stoppedObservation, after: stoppedObservation, passed: { type: "boolean" } }),
  outputValidation: object({ runSentinel: { type: "boolean" }, waitSentinel: { type: "boolean" } }),
  passed: { type: "boolean" },
});

const approvalObservationSchema = object({
  version: { const: 1 }, scenario: { enum: ["allow", "deny", "once", "session", "auto"] }, passed: { type: "boolean" },
  approvalsRequested: SAFE_INTEGER_SCHEMA, classifierCalls: SAFE_INTEGER_SCHEMA,
  autoDecisions: array({ enum: ["allow", "deny"] }, 8), outcome: { enum: ["allowed", "denied"] },
});

export const APPROVAL_RUNTIME_EVIDENCE_SCHEMA_V1: JsonSchema = object({
  version: { const: 1 }, certificationId: { const: "approval_runtime_b9_v1" }, createdAt: TIMESTAMP_SCHEMA,
  piFabricVersion: SUPPORTED_VERSION_SCHEMA, packageDigest: SHA256_SCHEMA, harnessDigest: SHA256_SCHEMA,
  exactCommand: array({ type: "string", minLength: 1, maxLength: 4096 }, 16, 1), observations: array(approvalObservationSchema, 5, 5),
  passed: { type: "boolean" }, signerId: { type: "string", pattern: "^[a-z][a-z0-9_]{2,63}$", minLength: 3, maxLength: 64 }, certificateDigest: SHA256_SCHEMA,
});

export const HOST_INTEGRATION_OBSERVATION_NAMES_V1 = [
  "providerActivated", "providerDiscovered", "componentShutdown", "schemaEnforceRejected", "nestedSchemaRejected",
  "arborCancellation", "boundedFanOut", "childCorrelation", "cleanupCompleted",
] as const;
export type HostIntegrationObservationNameV1 = typeof HOST_INTEGRATION_OBSERVATION_NAMES_V1[number];
export type HostIntegrationObservationsV1 = Record<HostIntegrationObservationNameV1, boolean>;

const digestEntrySchema = object({ path: { type: "string", minLength: 1, maxLength: 512 }, bytes: SAFE_INTEGER_SCHEMA, digest: SHA256_SCHEMA });
const integrationObservationsSchema = object(Object.fromEntries(HOST_INTEGRATION_OBSERVATION_NAMES_V1.map((name) => [name, { type: "boolean" }])));

export const HOST_INTEGRATION_RUNTIME_EVIDENCE_SCHEMA_V1: JsonSchema = object({
  version: { const: 1 }, certificationId: HOST_INTEGRATION_ID_SCHEMA, createdAt: TIMESTAMP_SCHEMA,
  piFabricVersion: SUPPORTED_VERSION_SCHEMA, packageRuntimeDigest: SHA256_SCHEMA, toolSourceDigests: array(digestEntrySchema, 32, 1),
  testPath: { const: "tests/integration/real-fabric.test.ts" }, testDigest: SHA256_SCHEMA,
  compiledTestPath: { const: ".test-dist/tests/integration/real-fabric.test.js" }, compiledTestDigest: SHA256_SCHEMA,
  hostAgentArtifactDigest: SHA256_SCHEMA, approvalArtifactDigest: SHA256_SCHEMA,
  command: array({ type: "string", minLength: 1, maxLength: 4096 }, 8, 1), timeoutMs: { const: 45_000 }, maxOutputBytes: { const: 1_048_576 },
  exitCode: { type: "integer", minimum: 0, maximum: 255 }, signal: { enum: [null, "SIGABRT", "SIGALRM", "SIGHUP", "SIGINT", "SIGKILL", "SIGPIPE", "SIGQUIT", "SIGSEGV", "SIGTERM", "SIGUSR1", "SIGUSR2"] },
  timedOut: { type: "boolean" }, cancelled: { type: "boolean" }, oversized: { type: "boolean" }, processGroupEmpty: { type: "boolean" }, complete: { type: "boolean" },
  stdoutBytes: SAFE_INTEGER_SCHEMA, stdoutBase64: BASE64_SCHEMA, stdoutDigest: SHA256_SCHEMA,
  stderrBytes: SAFE_INTEGER_SCHEMA, stderrBase64: BASE64_SCHEMA, stderrDigest: SHA256_SCHEMA,
  logDigest: SHA256_SCHEMA, observations: integrationObservationsSchema, passed: { type: "boolean" }, certificateDigest: SHA256_SCHEMA,
});

export interface DigestEntryV1 { path: string; bytes: number; digest: string }

export interface HostAgentRuntimeObservationV1 {
  id: string; status: "completed" | "running" | "stopped"; runner: "pi"; turns?: number; toolCalls?: number;
  exitCode: number | null; hasUsage: boolean; finishedAt: number | null;
}
export interface HostAgentRuntimeEvidenceV1 {
  version: 1; certificationId: string; createdAt: string; piFabricVersion: CertifiedPiFabricVersionV1; runner: "pi";
  actions: {
    run: { passed: boolean; observation: HostAgentRuntimeObservationV1 };
    spawn: { passed: boolean; observation: { id: string } };
    status: { passed: boolean; observation: HostAgentRuntimeObservationV1 };
    wait: { passed: boolean; observation: HostAgentRuntimeObservationV1 };
    cleanup: { passed: boolean; observation: { cleaned: boolean } };
    stop: { passed: boolean; observation: HostAgentRuntimeObservationV1 };
  };
  cancellation: { markerObserved: boolean; before: HostAgentRuntimeObservationV1; stop: HostAgentRuntimeObservationV1; after: HostAgentRuntimeObservationV1; passed: boolean };
  outputValidation: { runSentinel: boolean; waitSentinel: boolean }; passed: boolean;
}

export interface ApprovalRuntimeEvidenceV1 {
  version: 1; certificationId: "approval_runtime_b9_v1"; createdAt: string; piFabricVersion: CertifiedPiFabricVersionV1; packageDigest: string; harnessDigest: string;
  exactCommand: string[]; observations: Array<{ version: 1; scenario: "allow" | "deny" | "once" | "session" | "auto"; passed: boolean; approvalsRequested: number; classifierCalls: number; autoDecisions: string[]; outcome: "allowed" | "denied" }>;
  passed: boolean; signerId: string; certificateDigest: string;
}

export interface HostIntegrationRuntimeEvidenceV1 {
  version: 1; certificationId: string; createdAt: string; piFabricVersion: CertifiedPiFabricVersionV1;
  packageRuntimeDigest: string; toolSourceDigests: DigestEntryV1[]; testPath: "tests/integration/real-fabric.test.ts"; testDigest: string;
  compiledTestPath: ".test-dist/tests/integration/real-fabric.test.js"; compiledTestDigest: string; hostAgentArtifactDigest: string; approvalArtifactDigest: string;
  command: string[]; timeoutMs: 45_000; maxOutputBytes: 1_048_576; exitCode: number; signal: NodeJS.Signals | null;
  timedOut: boolean; cancelled: boolean; oversized: boolean; processGroupEmpty: boolean; complete: boolean;
  stdoutBytes: number; stdoutBase64: string; stdoutDigest: string; stderrBytes: number; stderrBase64: string; stderrDigest: string;
  logDigest: string; observations: HostIntegrationObservationsV1; passed: boolean; certificateDigest: string;
}

interface LoadedEvidenceV1<T> { evidence: T; bytes: Buffer; artifactDigest: string }

function evidenceError(message: string, details?: Record<string, unknown>): never {
  throw new ArborError("EVIDENCE_INVALID", message, details);
}

function readEvidence<T>(path: string, schema: JsonSchema, label: string): LoadedEvidenceV1<T> {
  const target = resolve(path);
  const stat = lstatSync(target);
  if (!stat.isFile() || stat.size < 2 || stat.size > 1_500_000) evidenceError(`${label} is not a bounded regular file`, { path: target, bytes: stat.size });
  const bytes = readFileSync(target);
  let value: unknown;
  try { value = JSON.parse(bytes.toString("utf8")); } catch { evidenceError(`${label} is not valid JSON`, { path: target }); }
  const issues = validateJsonSchema(schema, value);
  if (issues.length > 0) evidenceError(`${label} does not match its closed schema`, { issues: issues.slice(0, 32) });
  return { evidence: value as T, bytes, artifactDigest: sha256(bytes) };
}

function assertCanonicalBase64(value: string, expectedBytes: number, expectedDigest: string, label: string): Buffer {
  const bytes = Buffer.from(value, "base64");
  if (bytes.toString("base64") !== value || bytes.byteLength !== expectedBytes || sha256(bytes) !== expectedDigest) evidenceError(`${label} base64 bytes or digest mismatch`);
  return bytes;
}

export function loadHostAgentRuntimeEvidence(path: string): LoadedEvidenceV1<HostAgentRuntimeEvidenceV1> {
  const loaded = readEvidence<HostAgentRuntimeEvidenceV1>(path, HOST_AGENT_RUNTIME_EVIDENCE_SCHEMA_V1, "host agent runtime evidence");
  const evidence = loaded.evidence;
  const hostVersion = assertCertifiedPiFabricVersionV1(evidence.piFabricVersion);
  if (evidence.certificationId !== `fabric_host_runtime_pi_fabric_${piFabricVersionIdV1(hostVersion)}`) evidenceError("host agent certification ID does not match its exact pi-fabric version");
  if (!evidence.passed || Object.values(evidence.actions).some((entry) => !entry.passed)) evidenceError("host agent action matrix did not pass");
  if (!evidence.outputValidation.runSentinel || !evidence.outputValidation.waitSentinel) evidenceError("host agent output sentinels were not validated");
  const spawnedId = evidence.actions.spawn.observation.id;
  if (evidence.actions.status.observation.id !== spawnedId || evidence.actions.wait.observation.id !== spawnedId) evidenceError("spawn/status/wait child correlation is contradictory");
  if (evidence.actions.run.observation.status !== "completed" || evidence.actions.run.observation.exitCode !== 0 || evidence.actions.run.observation.finishedAt === null || !evidence.actions.run.observation.hasUsage) evidenceError("agents.run lacks a successful terminal observation");
  if (evidence.actions.status.observation.status !== "running" || evidence.actions.status.observation.exitCode !== null || evidence.actions.status.observation.finishedAt !== null || evidence.actions.status.observation.hasUsage) evidenceError("agents.status lacks the observed running state");
  if (evidence.actions.wait.observation.status !== "completed" || evidence.actions.wait.observation.exitCode !== 0 || evidence.actions.wait.observation.finishedAt === null || !evidence.actions.wait.observation.hasUsage) evidenceError("agents.wait lacks a successful terminal observation");
  if (new Set([evidence.actions.run.observation.id, spawnedId, evidence.actions.stop.observation.id]).size !== 3) evidenceError("independent run, spawn, and cancellation child IDs are contradictory");
  if (!evidence.actions.cleanup.observation.cleaned) evidenceError("agents.cleanup did not confirm cleanup");
  const cancellation = evidence.cancellation;
  if (!cancellation.passed || !cancellation.markerObserved) evidenceError("host cancellation marker or outcome is missing");
  if (cancellation.before.id !== evidence.actions.stop.observation.id || cancellation.stop.id !== cancellation.before.id || cancellation.after.id !== cancellation.before.id) evidenceError("cancellation child IDs are contradictory");
  if (cancellation.before.status !== "running" || cancellation.before.exitCode !== null || cancellation.before.finishedAt !== null || !cancellation.before.hasUsage) evidenceError("cancellation did not observe a running child before stop");
  if (canonicalJson(cancellation.stop) !== canonicalJson(evidence.actions.stop.observation) || canonicalJson(cancellation.after) !== canonicalJson(cancellation.stop)) evidenceError("agents.stop and cancellation terminal observations disagree");
  if (cancellation.stop.status !== "stopped" || cancellation.stop.exitCode !== 143 || cancellation.stop.finishedAt === null || !cancellation.stop.hasUsage) evidenceError("cancellation did not terminate the child with exit 143");
  const createdAt = Date.parse(evidence.createdAt);
  const terminalTimes = [evidence.actions.run.observation.finishedAt, evidence.actions.wait.observation.finishedAt, cancellation.stop.finishedAt].filter((value): value is number => value !== null);
  const latest = Math.max(...terminalTimes);
  if (terminalTimes[0]! > terminalTimes[1]! || terminalTimes[1]! > terminalTimes[2]!) evidenceError("host agent terminal timestamps are contradictory");
  if (!Number.isFinite(createdAt) || latest > createdAt || createdAt - latest > 300_000) evidenceError("host agent evidence timestamp is stale or predates its terminal observations");
  return loaded;
}

const EXPECTED_APPROVALS = Object.freeze({
  allow: { approvalsRequested: 0, classifierCalls: 0, autoDecisions: [] as string[], outcome: "allowed" },
  deny: { approvalsRequested: 0, classifierCalls: 0, autoDecisions: [] as string[], outcome: "denied" },
  once: { approvalsRequested: 2, classifierCalls: 0, autoDecisions: [] as string[], outcome: "allowed" },
  session: { approvalsRequested: 1, classifierCalls: 0, autoDecisions: [] as string[], outcome: "allowed" },
  auto: { approvalsRequested: 0, classifierCalls: 2, autoDecisions: ["allow", "allow"], outcome: "allowed" },
});

export function loadApprovalRuntimeEvidence(path: string): LoadedEvidenceV1<ApprovalRuntimeEvidenceV1> {
  const loaded = readEvidence<ApprovalRuntimeEvidenceV1>(path, APPROVAL_RUNTIME_EVIDENCE_SCHEMA_V1, "approval runtime evidence");
  const evidence = loaded.evidence;
  assertCertifiedPiFabricVersionV1(evidence.piFabricVersion);
  const { certificateDigest, ...unsigned } = evidence;
  if (certificateDigest !== digestCanonical(unsigned)) evidenceError("approval runtime certificate digest mismatch");
  const names = evidence.observations.map((entry) => entry.scenario);
  if (canonicalJson(names) !== canonicalJson(["allow", "deny", "once", "session", "auto"])) evidenceError("approval runtime scenarios are missing, duplicated, or out of order");
  for (const observation of evidence.observations) {
    const expected = EXPECTED_APPROVALS[observation.scenario];
    if (!observation.passed || observation.version !== 1 || observation.approvalsRequested !== expected.approvalsRequested || observation.classifierCalls !== expected.classifierCalls || canonicalJson(observation.autoDecisions) !== canonicalJson(expected.autoDecisions) || observation.outcome !== expected.outcome) evidenceError(`approval runtime scenario is contradictory: ${observation.scenario}`);
  }
  if (!evidence.passed) evidenceError("approval runtime matrix did not pass");
  return loaded;
}

export function parseHostIntegrationSentinel(stdout: Buffer): HostIntegrationObservationsV1 {
  const matches = [...stdout.toString("utf8").matchAll(/ARBOR_HOST_INTEGRATION_RESULT_V1 (\{[^\n]+\})/gu)];
  if (matches.length !== 1 || !matches[0]?.[1]) evidenceError("host integration output sentinel is missing or duplicated");
  let parsed: unknown;
  try { parsed = JSON.parse(matches[0][1]); } catch { evidenceError("host integration output sentinel is invalid JSON"); }
  const issues = validateJsonSchema(integrationObservationsSchema, parsed);
  if (issues.length > 0) evidenceError("host integration output sentinel is not closed", { issues });
  return parsed as HostIntegrationObservationsV1;
}

export function hostIntegrationLogDigest(evidence: Pick<HostIntegrationRuntimeEvidenceV1, "command" | "exitCode" | "signal" | "timedOut" | "cancelled" | "oversized" | "processGroupEmpty" | "stdoutBytes" | "stdoutDigest" | "stderrBytes" | "stderrDigest">): string {
  return digestCanonical({
    command: evidence.command, exitCode: evidence.exitCode, signal: evidence.signal, timedOut: evidence.timedOut,
    cancelled: evidence.cancelled, oversized: evidence.oversized, processGroupEmpty: evidence.processGroupEmpty,
    stdoutBytes: evidence.stdoutBytes, stdoutDigest: evidence.stdoutDigest, stderrBytes: evidence.stderrBytes, stderrDigest: evidence.stderrDigest,
  });
}

export function loadHostIntegrationRuntimeEvidence(path: string): LoadedEvidenceV1<HostIntegrationRuntimeEvidenceV1> {
  const loaded = readEvidence<HostIntegrationRuntimeEvidenceV1>(path, HOST_INTEGRATION_RUNTIME_EVIDENCE_SCHEMA_V1, "host integration runtime evidence");
  const evidence = loaded.evidence;
  const hostVersion = assertCertifiedPiFabricVersionV1(evidence.piFabricVersion);
  if (evidence.certificationId !== `fabric_host_integration_runtime_pi_fabric_${piFabricVersionIdV1(hostVersion)}`) evidenceError("host integration certification ID does not match its exact pi-fabric version");
  const { certificateDigest, ...unsigned } = evidence;
  if (certificateDigest !== digestCanonical(unsigned)) evidenceError("host integration certificate digest mismatch");
  const stdout = assertCanonicalBase64(evidence.stdoutBase64, evidence.stdoutBytes, evidence.stdoutDigest, "host integration stdout");
  assertCanonicalBase64(evidence.stderrBase64, evidence.stderrBytes, evidence.stderrDigest, "host integration stderr");
  if (evidence.stdoutBytes + evidence.stderrBytes > evidence.maxOutputBytes) evidenceError("host integration output exceeded its retained bound");
  if (evidence.logDigest !== hostIntegrationLogDigest(evidence)) evidenceError("host integration log digest mismatch");
  const sentinel = parseHostIntegrationSentinel(stdout);
  if (canonicalJson(sentinel) !== canonicalJson(evidence.observations)) evidenceError("host integration retained observations disagree with the output sentinel");
  const observationsPassed = HOST_INTEGRATION_OBSERVATION_NAMES_V1.every((name) => evidence.observations[name]);
  const expectedComplete = !evidence.timedOut && !evidence.cancelled && !evidence.oversized && evidence.processGroupEmpty;
  const expectedPassed = expectedComplete && evidence.exitCode === 0 && evidence.signal === null && observationsPassed;
  if (evidence.complete !== expectedComplete || evidence.passed !== expectedPassed || !expectedPassed) evidenceError("host integration runtime result is incomplete, leaking, or failed");
  return loaded;
}

interface RuntimePackageSnapshotV1 { version: CertifiedPiFabricVersionV1; digest: string }

export function computeRuntimePackageDigest(packageRoot: string): RuntimePackageSnapshotV1 {
  const root = realpathSync(packageRoot);
  const manifest = JSON.parse(readFileSync(join(root, "package.json"), "utf8")) as { name?: string; version?: string };
  if (manifest.name !== "pi-fabric") evidenceError("runtime evidence requires the pi-fabric package", { name: manifest.name, version: manifest.version });
  const version = assertCertifiedPiFabricVersionV1(manifest.version);
  const files: Array<{ path: string; type: "file" | "symlink"; bytes: number; mode: number; digest: string }> = [];
  let totalBytes = 0;
  const visit = (directory: string): void => {
    for (const name of readdirSync(directory).sort()) {
      if (name === ".git" || name === "node_modules") continue;
      const path = join(directory, name); const stat = lstatSync(path);
      if (stat.isDirectory()) { visit(path); continue; }
      if (!stat.isFile() && !stat.isSymbolicLink()) evidenceError("pi-fabric runtime package contains an unsupported filesystem entry", { path });
      const bytes = stat.isSymbolicLink() ? Buffer.from(readlinkSync(path, "utf8")) : readFileSync(path);
      totalBytes += bytes.byteLength;
      if (files.length >= 10_000 || bytes.byteLength > 268_435_456 || totalBytes > 2_147_483_648) evidenceError("pi-fabric runtime package exceeds evidence bounds");
      files.push({ path: relative(root, path).split(sep).join("/"), type: stat.isSymbolicLink() ? "symlink" : "file", bytes: bytes.byteLength, mode: stat.mode & 0o7777, digest: sha256(bytes) });
    }
  };
  visit(root);
  return { version, digest: digestCanonical(files) };
}

function uniqueRuntimeChunk(packageRoot: string, marker: string, label: string): string {
  const root = realpathSync(packageRoot); const directory = join(root, "dist", "chunks");
  const matches = readdirSync(directory).filter((name) => name.endsWith(".js") && readFileSync(join(directory, name), "utf8").includes(marker));
  if (matches.length !== 1) evidenceError(`installed ${label} source could not be identified exactly`, { matches });
  return `dist/chunks/${matches[0]!}`;
}

export function approvalRuntimeSourcePath(packageRoot: string): string {
  return uniqueRuntimeChunk(packageRoot, "var ApprovalController = class", "approval runtime");
}

export function computeInstalledToolSourceDigests(packageRoot: string): DigestEntryV1[] {
  const root = realpathSync(packageRoot);
  const paths = [
    "dist/index.js", "dist/protocol.js", "dist/agents/types.d.ts", "dist/agents/manager.d.ts",
    "dist/providers/agents-actions.d.ts", "dist/providers/agents-provider.d.ts",
    uniqueRuntimeChunk(root, "var AgentsProvider = class", "agents provider runtime"), approvalRuntimeSourcePath(root),
  ];
  return [...new Set(paths)].sort().map((path) => { const bytes = readFileSync(join(root, path)); return { path, bytes: bytes.byteLength, digest: sha256(bytes) }; });
}

export const COMPATIBILITY_SOURCE_PATHS_V1 = Object.freeze([
  "bin/pi-fabric-arbor-host-integration-certify.ts",
  "src/application/ArborApplication.ts",
  "src/certification/approval-runtime.ts",
  "src/certification/host-integration-runtime.ts",
  "src/certification/runtime-evidence.ts",
  "src/certification/pi-fabric-support.ts",
  "src/certification/startup.ts",
  "src/compatibility/certification.ts",
  "src/component/definitions.ts",
  "src/fixtures/adapters.ts",
  "src/fixtures/driver.ts",
  "src/persistence/InMemoryRunStore.ts",
  "src/public/descriptors.ts",
  "src/public/provider.ts",
  "src/reports/FileReportPublisher.ts",
  "src/schemas/catalog.ts",
  "src/schemas/validate.ts",
  "src/util/clock.ts",
  "tests/helpers.ts",
  "tests/integration/real-fabric.test.ts",
]);

export function computeCompatibilitySourceDigests(projectRoot: string): DigestEntryV1[] {
  const root = realpathSync(projectRoot);
  return COMPATIBILITY_SOURCE_PATHS_V1.map((path) => { const bytes = readFileSync(join(root, path)); return { path, bytes: bytes.byteLength, digest: sha256(bytes) }; });
}

export interface CompatibilityRuntimeEvidenceBindingsV1 {
  hostAgentArtifactDigest: string;
  hostAgentCertificationId: string;
  hostAgentCreatedAt: string;
  approvalArtifactDigest: string;
  approvalCertificateDigest: string;
  approvalHarnessDigest: string;
  hostIntegrationArtifactDigest: string;
  hostIntegrationCertificateDigest: string;
  integrationTestDigest: string;
  integrationLogDigest: string;
  activePackageRuntimeDigest: string;
  hostPackageRuntimeDigest: string;
  toolSourceDigests: DigestEntryV1[];
  hostToolSourceDigests: DigestEntryV1[];
  arborSourceDigests: DigestEntryV1[];
}

export interface CompatibilityRuntimeEvidenceLocationsV1 {
  projectRoot: string;
  packageRoot: string;
  hostPackageRoot: string;
  hostAgentArtifact: string;
  approvalArtifact: string;
  hostIntegrationArtifact: string;
}

export interface CollectedCompatibilityRuntimeEvidenceV1 {
  bindings: CompatibilityRuntimeEvidenceBindingsV1;
  hostAgent: HostAgentRuntimeEvidenceV1;
  approval: ApprovalRuntimeEvidenceV1;
  hostIntegration: HostIntegrationRuntimeEvidenceV1;
}

export function collectCompatibilityRuntimeEvidence(input: CompatibilityRuntimeEvidenceLocationsV1): CollectedCompatibilityRuntimeEvidenceV1 {
  const projectRoot = realpathSync(input.projectRoot);
  const activePackage = computeRuntimePackageDigest(input.packageRoot); const hostPackage = computeRuntimePackageDigest(input.hostPackageRoot);
  if (activePackage.version !== hostPackage.version || activePackage.digest !== hostPackage.digest) evidenceError("current host pi-fabric version or payload differs from the certified package");
  const toolSourceDigests = computeInstalledToolSourceDigests(input.packageRoot); const hostToolSourceDigests = computeInstalledToolSourceDigests(input.hostPackageRoot);
  if (canonicalJson(toolSourceDigests) !== canonicalJson(hostToolSourceDigests)) evidenceError("current host pi-fabric tool sources differ from the certified project package");
  const hostAgent = loadHostAgentRuntimeEvidence(input.hostAgentArtifact);
  const approval = loadApprovalRuntimeEvidence(input.approvalArtifact);
  const integration = loadHostIntegrationRuntimeEvidence(input.hostIntegrationArtifact);
  if (hostAgent.evidence.piFabricVersion !== activePackage.version || approval.evidence.piFabricVersion !== activePackage.version || integration.evidence.piFabricVersion !== activePackage.version) evidenceError("runtime evidence versions do not match the exact certified package");
  const expectedApprovalPrefix = [process.execPath, "dist/bin/pi-fabric-arbor-approval-runtime-certify.js", "verify", "--package-root", projectRelativePathV1(projectRoot, input.packageRoot), "--artifact"];
  const approvalCommand = approval.evidence.exactCommand; const commandArtifact = approvalCommand[6];
  if (canonicalJson(approvalCommand.slice(0, 6)) !== canonicalJson(expectedApprovalPrefix) || typeof commandArtifact !== "string") evidenceError("approval runtime exact command is stale");
  try { if (sha256(readFileSync(resolve(projectRoot, commandArtifact))) !== approval.artifactDigest) evidenceError("approval runtime command artifact differs from retained evidence"); } catch (error) { if (error instanceof ArborError) throw error; evidenceError("approval runtime command artifact is missing"); }
  const approvalSource = readFileSync(join(realpathSync(input.packageRoot), approvalRuntimeSourcePath(input.packageRoot)));
  if (approval.evidence.packageDigest !== sha256(approvalSource)) evidenceError("approval runtime package source digest is stale");
  if (approval.evidence.harnessDigest !== sha256(readFileSync(join(projectRoot, "src/certification/approval-runtime.ts")))) evidenceError("approval runtime harness digest is stale");
  const sourceTest = readFileSync(join(projectRoot, integration.evidence.testPath));
  const compiledTest = readFileSync(join(projectRoot, integration.evidence.compiledTestPath));
  const expectedIntegrationCommand = [process.execPath, "--test", integration.evidence.compiledTestPath];
  if (integration.evidence.packageRuntimeDigest !== activePackage.digest || canonicalJson(integration.evidence.toolSourceDigests) !== canonicalJson(toolSourceDigests)) evidenceError("host integration package or tool source binding is stale");
  if (integration.evidence.testDigest !== sha256(sourceTest) || integration.evidence.compiledTestDigest !== sha256(compiledTest)) evidenceError("host integration test digest is stale");
  if (integration.evidence.hostAgentArtifactDigest !== hostAgent.artifactDigest || integration.evidence.approvalArtifactDigest !== approval.artifactDigest) evidenceError("host integration input artifact binding is stale");
  if (canonicalJson(integration.evidence.command) !== canonicalJson(expectedIntegrationCommand)) evidenceError("host integration exact command is stale");
  const arborSourceDigests = computeCompatibilitySourceDigests(projectRoot);
  return {
    bindings: {
      hostAgentArtifactDigest: hostAgent.artifactDigest, hostAgentCertificationId: hostAgent.evidence.certificationId, hostAgentCreatedAt: hostAgent.evidence.createdAt,
      approvalArtifactDigest: approval.artifactDigest, approvalCertificateDigest: approval.evidence.certificateDigest, approvalHarnessDigest: approval.evidence.harnessDigest,
      hostIntegrationArtifactDigest: integration.artifactDigest, hostIntegrationCertificateDigest: integration.evidence.certificateDigest,
      integrationTestDigest: integration.evidence.testDigest, integrationLogDigest: integration.evidence.logDigest,
      activePackageRuntimeDigest: activePackage.digest, hostPackageRuntimeDigest: hostPackage.digest,
      toolSourceDigests, hostToolSourceDigests, arborSourceDigests,
    },
    hostAgent: hostAgent.evidence, approval: approval.evidence, hostIntegration: integration.evidence,
  };
}
