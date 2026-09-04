import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";
import type { FabricProvider } from "pi-fabric";
import {
  collectCompatibilityRuntimeEvidence,
  type CollectedCompatibilityRuntimeEvidenceV1,
  type CompatibilityRuntimeEvidenceBindingsV1,
  type CompatibilityRuntimeEvidenceLocationsV1,
} from "../certification/runtime-evidence.js";
import { ArborError } from "../domain/errors.js";
import { createActionDescriptors } from "../public/descriptors.js";
import { createCertificationBlockedProvider } from "../public/provider.js";
import { FIXTURE_SCHEMAS_V1 } from "../schemas/catalog.js";
import { validateJsonSchema } from "../schemas/validate.js";
import { canonicalJson, digestCanonical, sha256 } from "../util/canonical.js";
import { piFabricCertificationRootV1, readCertifiedPiFabricVersionV1, type CertifiedPiFabricVersionV1 } from "../certification/pi-fabric-support.js";

export type CompatibilityEvidenceModeV1 = "direct-runtime" | "direct-representation" | "contract-harness" | "not-tested";

export interface CompatibilityCheckV1 {
  name: string;
  requirement: string;
  passed: boolean;
  evidenceMode: CompatibilityEvidenceModeV1;
  observationDigest: string;
  details: string;
}

export interface FabricCompatibilityCertificateV1 {
  version: 1;
  certificationId: string;
  createdAt: string;
  piFabricVersion: CertifiedPiFabricVersionV1;
  packageDigest: string;
  exportMapDigest: string;
  publicSchemaDigest: string;
  descriptorDigest: string;
  childCorrelationContractDigest: string;
  runtimeEvidence: CompatibilityRuntimeEvidenceBindingsV1;
  checks: CompatibilityCheckV1[];
  agentActions: Array<{ action: "agents.run" | "agents.spawn" | "agents.wait" | "agents.status" | "agents.stop" | "agents.cleanup"; runtimeTested: boolean; passed: boolean; observationDigest: string }>;
  supported: boolean;
  limitations: string[];
  signerId: string;
  predecessorDigest?: string;
  certificateDigest: string;
}

const AGENT_ACTIONS = ["agents.run", "agents.spawn", "agents.wait", "agents.status", "agents.stop", "agents.cleanup"] as const;
const REQUIRED_CHECK_EVIDENCE_MODE = Object.freeze({
  "exact-version": "direct-representation",
  "export-map": "direct-representation",
  "public-runtime-exports": "direct-representation",
  "provider-registration": "contract-harness",
  "provider-discovery": "contract-harness",
  "provider-replacement": "contract-harness",
  "provider-deactivation": "contract-harness",
  "schema-digests": "direct-representation",
  "descriptor-digests": "direct-representation",
  "risk-effects": "direct-representation",
  "cancellation-signal-representation": "direct-representation",
  "cancellation-runtime": "direct-runtime",
  "approval-mode-representation": "direct-representation",
  "approval-allow-runtime": "direct-runtime",
  "approval-deny-runtime": "direct-runtime",
  "approval-once-runtime": "direct-runtime",
  "approval-session-runtime": "direct-runtime",
  "approval-auto-runtime": "direct-runtime",
  "package-boundary-lint": "direct-representation",
  "component-activation": "direct-runtime",
  "component-deactivation": "direct-runtime",
  "schema-enforce-rejection": "contract-harness",
  "child-lifecycle-correlation-contract": "direct-representation",
  "host-integration-runtime": "direct-runtime",
  "agents.run-runtime": "direct-runtime",
  "agents.spawn-runtime": "direct-runtime",
  "agents.wait-runtime": "direct-runtime",
  "agents.status-runtime": "direct-runtime",
  "agents.stop-runtime": "direct-runtime",
  "agents.cleanup-runtime": "direct-runtime",
} satisfies Record<string, CompatibilityEvidenceModeV1>);
const REQUIRED_CHECKS = Object.keys(REQUIRED_CHECK_EVIDENCE_MODE).sort();

export interface FabricCompatibilityEvidenceInputV1 {
  piFabricRoot: string;
  arborSourceRoot: string;
  projectRoot?: string;
  runtimeEvidence?: CompatibilityRuntimeEvidenceLocationsV1;
}

export interface VerifyFabricCompatibilityInputV1 extends FabricCompatibilityEvidenceInputV1 {
  expectedPackageDigest: string;
}

function check(name: string, requirement: string, passed: boolean, evidenceMode: CompatibilityEvidenceModeV1, details: string, observation: unknown): CompatibilityCheckV1 {
  return { name, requirement, passed, evidenceMode, details, observationDigest: digestCanonical(observation) };
}

function readJson(path: string): Record<string, unknown> { return JSON.parse(readFileSync(path, "utf8")) as Record<string, unknown>; }

function walkTs(root: string): string[] {
  const output: string[] = [];
  const visit = (directory: string): void => {
    for (const name of readdirSync(directory).sort()) {
      const path = join(directory, name);
      if (statSync(path).isDirectory()) visit(path);
      else if (path.endsWith(".ts")) output.push(path);
    }
  };
  visit(root);
  return output;
}

export function lintPiFabricPackageBoundary(sourceRoot: string): { passed: boolean; violations: Array<{ path: string; specifier: string }> } {
  const violations: Array<{ path: string; specifier: string }> = [];
  const importPattern = /(?:from\s+|import\s*\(\s*|import\s+)(["'])(pi-fabric(?:\/[^"']+)?)\1/gu;
  for (const path of walkTs(sourceRoot)) {
    const text = readFileSync(path, "utf8");
    for (const match of text.matchAll(importPattern)) {
      const specifier = match[2]!;
      if (specifier !== "pi-fabric" && specifier !== "pi-fabric/protocol") violations.push({ path: relative(sourceRoot, path).split(sep).join("/"), specifier });
    }
  }
  return { passed: violations.length === 0, violations };
}

class ProviderProtocolHarness {
  readonly providers = new Map<string, FabricProvider>();
  register(provider: FabricProvider, overwrite = false): void {
    if (this.providers.has(provider.name) && !overwrite) throw new Error("provider already registered");
    this.providers.set(provider.name, provider);
  }
  discover(name: string): FabricProvider | undefined { return this.providers.get(name); }
  async replace(provider: FabricProvider): Promise<void> {
    const previous = this.providers.get(provider.name);
    this.providers.set(provider.name, provider);
    await previous?.close?.();
  }
  async deactivate(name: string): Promise<void> {
    const provider = this.providers.get(name);
    this.providers.delete(name);
    await provider?.close?.();
  }
}

export function rejectSchemaEnforceForExternalAgents(schemaMode: "off" | "audit" | "enforce"): void {
  if (schemaMode === "enforce") throw new ArborError("COMPATIBILITY_CERTIFICATION_REQUIRED", "Arbor real agents are unavailable in pi-fabric Schema enforce sessions");
}

function defaultRuntimeEvidence(input: FabricCompatibilityEvidenceInputV1): CompatibilityRuntimeEvidenceLocationsV1 {
  const projectRoot = resolve(input.projectRoot ?? dirname(resolve(input.arborSourceRoot))); const packageRoot = resolve(input.piFabricRoot);
  const piFabricVersion = readCertifiedPiFabricVersionV1(packageRoot); const artifactRoot = piFabricCertificationRootV1(join(projectRoot, "certification"), piFabricVersion);
  return {
    projectRoot,
    packageRoot,
    hostPackageRoot: packageRoot,
    hostAgentArtifact: join(artifactRoot, "artifacts/host-runtime-evidence.v1.json"),
    approvalArtifact: join(artifactRoot, "artifacts/approval-runtime-evidence.v1.json"),
    hostIntegrationArtifact: join(artifactRoot, "artifacts/host-integration-runtime.v1.json"),
  };
}

function agentActionObservation(runtime: CollectedCompatibilityRuntimeEvidenceV1, action: typeof AGENT_ACTIONS[number]): unknown {
  const name = action.slice("agents.".length) as keyof HostAgentActionMap;
  return { artifactDigest: runtime.bindings.hostAgentArtifactDigest, action, result: runtime.hostAgent.actions[name] };
}
type HostAgentActionMap = CollectedCompatibilityRuntimeEvidenceV1["hostAgent"]["actions"];

function cancellationObservation(runtime: CollectedCompatibilityRuntimeEvidenceV1): unknown {
  return { artifactDigest: runtime.bindings.hostAgentArtifactDigest, cancellation: runtime.hostAgent.cancellation };
}
function approvalObservation(runtime: CollectedCompatibilityRuntimeEvidenceV1, mode: "allow" | "deny" | "once" | "session" | "auto"): unknown {
  return { artifactDigest: runtime.bindings.approvalArtifactDigest, certificateDigest: runtime.bindings.approvalCertificateDigest, observation: runtime.approval.observations.find((entry) => entry.scenario === mode) };
}
function integrationObservation(runtime: CollectedCompatibilityRuntimeEvidenceV1): unknown {
  return {
    artifactDigest: runtime.bindings.hostIntegrationArtifactDigest,
    certificateDigest: runtime.bindings.hostIntegrationCertificateDigest,
    logDigest: runtime.hostIntegration.logDigest,
    exitCode: runtime.hostIntegration.exitCode,
    complete: runtime.hostIntegration.complete,
    observations: runtime.hostIntegration.observations,
  };
}

export async function runInstalledCompatibilityChecks(input: FabricCompatibilityEvidenceInputV1): Promise<{ checks: CompatibilityCheckV1[]; exportMapDigest: string; descriptorDigest: string; publicSchemaDigest: string; runtimeEvidence: CompatibilityRuntimeEvidenceBindingsV1 }> {
  const root = realpathPackage(input.piFabricRoot); const projectRoot = resolve(input.projectRoot ?? dirname(resolve(input.arborSourceRoot))); const piFabricVersion = readCertifiedPiFabricVersionV1(root);
  const runtime = collectCompatibilityRuntimeEvidence(input.runtimeEvidence ?? defaultRuntimeEvidence({ ...input, projectRoot }));
  const manifestPath = join(root, "package.json"); const manifest = readJson(manifestPath); const checks: CompatibilityCheckV1[] = [];
  checks.push(check("exact-version", `Installed package version is the separately certified ${piFabricVersion} release`, manifest.version === piFabricVersion && manifest.name === "pi-fabric", "direct-representation", String(manifest.version), { name: manifest.name, version: manifest.version, certifiedVersion: piFabricVersion }));
  const exportsMap = manifest.exports;
  const expectedExports = { ".": { types: "./dist/index.d.ts", import: "./dist/index.js" }, "./protocol": { types: "./dist/protocol.d.ts", import: "./dist/protocol.js" } };
  const exportPass = canonicalJson(exportsMap) === canonicalJson(expectedExports) && ["dist/index.d.ts", "dist/index.js", "dist/protocol.d.ts", "dist/protocol.js"].every((path) => existsSync(join(root, path)));
  checks.push(check("export-map", "Public export map and targets match the certified exact version", exportPass, "direct-representation", exportPass ? "exact" : "drift", exportsMap));
  const publicModule = await import(pathToFileURL(join(root, "dist", "index.js")).href); const publicKeys = Object.keys(publicModule).sort();
  const requiredRuntimeExports = ["default", "FABRIC_PROVIDER_REGISTER_EVENT", "FABRIC_PROVIDER_DISCOVER_EVENT", "FABRIC_COMPONENT_REGISTER_EVENT", "FABRIC_COMPONENT_DISCOVER_EVENT"];
  checks.push(check("public-runtime-exports", "Required protocol values are present through the package root export", requiredRuntimeExports.every((key) => publicKeys.includes(key)), "direct-representation", "installed public module export keys inspected", publicKeys));

  const descriptors = createActionDescriptors(FIXTURE_SCHEMAS_V1); let closeCount = 0;
  const original = createCertificationBlockedProvider({ descriptors });
  const wrapped = { ...original, async close(): Promise<void> { closeCount += 1; } } satisfies FabricProvider;
  const replacement = { ...original, async close(): Promise<void> { closeCount += 1; } } satisfies FabricProvider;
  const harness = new ProviderProtocolHarness(); harness.register(wrapped);
  checks.push(check("provider-registration", "Provider registration protocol accepts Arbor", harness.discover("arbor") === wrapped, "contract-harness", "public FabricProvider contract harness", { registered: [...harness.providers.keys()] }));
  checks.push(check("provider-discovery", "Provider discovery returns Arbor descriptors", (await harness.discover("arbor")!.list({}, {} as never)).length === descriptors.length, "contract-harness", "public FabricProvider list contract", descriptors.map((entry) => entry.name)));
  await harness.replace(replacement);
  checks.push(check("provider-replacement", "Overwrite retires the prior provider", harness.discover("arbor") === replacement && closeCount === 1, "contract-harness", "public FabricProvider replacement contract", { closeCount }));
  await harness.deactivate("arbor");
  checks.push(check("provider-deactivation", "Deactivation closes and removes the provider", !harness.discover("arbor") && closeCount === 2, "contract-harness", "public FabricProvider close contract", { closeCount }));

  const schemaDigests = Object.fromEntries(Object.entries(FIXTURE_SCHEMAS_V1.actionInputs).map(([name, schema]) => [name, digestCanonical(schema)]));
  const descriptorSnapshot = descriptors.map((entry) => ({ name: entry.name, risk: entry.risk, effect: entry.effect, input: digestCanonical(entry.inputSchema), output: digestCanonical(entry.outputSchema ?? null) }));
  checks.push(check("schema-digests", "Arbor request and response schemas have canonical digests", Object.keys(schemaDigests).length === descriptors.length, "direct-representation", "canonical schema snapshot", schemaDigests));
  checks.push(check("descriptor-digests", "Arbor descriptors have canonical digests", descriptorSnapshot.length === descriptors.length, "direct-representation", "canonical descriptor snapshot", descriptorSnapshot));
  const risks = new Set(["read", "write", "execute", "network", "agent"]); const effects = new Set(["none", "scoped", "transactional", "emission"]);
  checks.push(check("risk-effects", "Every descriptor uses a public risk and effect representation", descriptors.every((entry) => risks.has(entry.risk) && effects.has(entry.effect?.kind ?? "none")), "direct-representation", "descriptor fields inspected", descriptorSnapshot));

  const protocolText = readFileSync(join(root, "dist", "protocol.d.ts"), "utf8"); const componentText = readFileSync(join(root, "dist", "components", "types.d.ts"), "utf8");
  const configText = readFileSync(join(root, "dist", "config.d.ts"), "utf8"); const schemaDoc = readFileSync(join(root, "docs", "schema-enforcement.md"), "utf8");
  checks.push(check("cancellation-signal-representation", "Public invocation and component contracts represent AbortSignal", protocolText.includes("signal: AbortSignal") && componentText.includes("readonly signal: AbortSignal"), "direct-representation", "declaration text inspected; propagation runtime is separately required", { protocol: sha256(protocolText), components: sha256(componentText) }));
  checks.push(check("cancellation-runtime", "AbortSignal cancellation reaches a running installed Fabric child and terminates its process", runtime.hostAgent.cancellation.passed, "direct-runtime", "Retained current-host marker, running-state, stop, and exit-143 observations", cancellationObservation(runtime)));
  const approvalValues = ["allow", "ask", "auto", "deny"].every((value) => configText.includes(`\"${value}\"`));
  checks.push(check("approval-mode-representation", "Installed approval configuration represents allow, ask, auto, and deny", approvalValues, "direct-representation", "configuration declaration inspected; once/session behavior is separately runtime-certified", sha256(configText)));
  for (const mode of ["allow", "deny", "once", "session", "auto"] as const) {
    const observation = runtime.approval.observations.find((entry) => entry.scenario === mode)!;
    checks.push(check(`approval-${mode}-runtime`, `Direct installed-runtime approval behavior for ${mode}`, observation.passed, "direct-runtime", `Retained installed pi-fabric ApprovalController ${mode} observation bound to the active harness and runtime source`, approvalObservation(runtime, mode)));
  }
  const boundary = lintPiFabricPackageBoundary(input.arborSourceRoot);
  checks.push(check("package-boundary-lint", "Production imports use only public pi-fabric exports", boundary.passed, "direct-representation", boundary.passed ? "no violations" : canonicalJson(boundary.violations), boundary));
  checks.push(check("component-activation", "The installed Fabric supervisor activates the Arbor component and publishes its provider", runtime.hostIntegration.observations.providerActivated && runtime.hostIntegration.observations.providerDiscovered, "direct-runtime", "Retained real installed Fabric integration subprocess", integrationObservation(runtime)));
  checks.push(check("component-deactivation", "The installed Fabric session shuts down the Arbor component without a retained runtime leak", runtime.hostIntegration.observations.componentShutdown && runtime.hostIntegration.processGroupEmpty, "direct-runtime", "Retained real installed Fabric integration subprocess and empty process group", integrationObservation(runtime)));
  let rejected = false;
  try { rejectSchemaEnforceForExternalAgents("enforce"); } catch (error) { rejected = error instanceof ArborError && error.code === "COMPATIBILITY_CERTIFICATION_REQUIRED"; }
  checks.push(check("schema-enforce-rejection", "Arbor rejects real-agent execution in Schema enforce mode", rejected && schemaDoc.includes("blocks every") && schemaDoc.includes("all agent/actor actions"), "contract-harness", "Arbor rejection executed and installed package documentation inspected", { rejected, schemaDocDigest: sha256(schemaDoc) }));
  const childContractFiles = ["dist/agents/types.d.ts", "dist/providers/agents-provider.d.ts", "dist/agents/manager.d.ts"];
  const childDigest = digestCanonical(childContractFiles.map((path) => ({ path, digest: sha256(readFileSync(join(root, path))) })));
  const childText = childContractFiles.map((path) => readFileSync(join(root, path), "utf8")).join("\n");
  checks.push(check("child-lifecycle-correlation-contract", "Installed declarations represent child id, status, start time, wait/status/stop/cleanup provider behavior", ["id: string", "status: AgentRunStatus", "startedAt: number", "close(): Promise<void>"].every((text) => childText.includes(text)), "direct-representation", "declarations inspected and integration child correlation separately asserted", childDigest));
  checks.push(check("host-integration-runtime", "Real installed Fabric activates Arbor and executes nested actions with bounded output, schema rejection, recovery, cancellation, child correlation, cleanup, and shutdown", runtime.hostIntegration.passed, "direct-runtime", "Bounded retained subprocess log and exact current test digest", integrationObservation(runtime)));
  for (const action of AGENT_ACTIONS) {
    const result = runtime.hostAgent.actions[action.slice("agents.".length) as keyof HostAgentActionMap];
    checks.push(check(`${action}-runtime`, `Direct current-host runtime behavior for ${action}`, result.passed, "direct-runtime", "Retained live pi runner observation bound to exact host and project tool bytes", agentActionObservation(runtime, action)));
  }

  return { checks, exportMapDigest: digestCanonical(exportsMap), descriptorDigest: digestCanonical(descriptorSnapshot), publicSchemaDigest: digestCanonical(schemaDigests), runtimeEvidence: runtime.bindings };
}

function realpathPackage(path: string): string {
  const root = resolve(path);
  if (!existsSync(join(root, "package.json"))) throw new ArborError("VALIDATION_FAILED", "pi-fabric package root is missing");
  return root;
}

function checksSupport(checks: readonly CompatibilityCheckV1[]): boolean {
  const byName = new Map(checks.map((entry) => [entry.name, entry]));
  return REQUIRED_CHECKS.every((name) => {
    const result = byName.get(name); return result?.passed === true && result.evidenceMode === REQUIRED_CHECK_EVIDENCE_MODE[name as keyof typeof REQUIRED_CHECK_EVIDENCE_MODE];
  });
}

export async function generateFabricCompatibilityCertificate(input: {
  certificationId: string; createdAt: string; piFabricRoot: string; arborSourceRoot: string; projectRoot?: string; runtimeEvidence?: CompatibilityRuntimeEvidenceLocationsV1;
  packageDigest: string; signerId: string; predecessorDigest?: string;
}): Promise<FabricCompatibilityCertificateV1> {
  const piFabricVersion = readCertifiedPiFabricVersionV1(input.piFabricRoot); const results = await runInstalledCompatibilityChecks(input); const checks = [...results.checks].sort((left, right) => left.name.localeCompare(right.name));
  const byName = new Map(checks.map((entry) => [entry.name, entry])); const supported = checksSupport(checks);
  const agentActions = AGENT_ACTIONS.map((action) => {
    const result = byName.get(`${action}-runtime`)!;
    return { action, runtimeTested: result.evidenceMode === "direct-runtime", passed: result.passed, observationDigest: result.observationDigest };
  });
  const unsigned = {
    version: 1 as const, certificationId: input.certificationId, createdAt: input.createdAt, piFabricVersion,
    packageDigest: input.packageDigest, exportMapDigest: results.exportMapDigest, publicSchemaDigest: results.publicSchemaDigest,
    descriptorDigest: results.descriptorDigest, childCorrelationContractDigest: byName.get("child-lifecycle-correlation-contract")!.observationDigest,
    runtimeEvidence: results.runtimeEvidence, checks, agentActions, supported,
    limitations: [
      "The six model-backed agent actions and process cancellation are certified only for the retained current-host pi runner and exact tool bytes.",
      "Provider replacement and deactivation use the public FabricProvider contract harness; installed supervisor activation and shutdown are covered separately by host-integration-runtime.",
      "The installed Fabric integration lane uses deterministic Arbor fixture adapters; it certifies the host component/provider/fabric_exec path, not an additional model run.",
    ],
    signerId: input.signerId, ...(input.predecessorDigest ? { predecessorDigest: input.predecessorDigest } : {}),
  };
  return { ...unsigned, certificateDigest: digestCanonical(unsigned) };
}

export function verifyFabricCompatibilityCertificate(certificate: FabricCompatibilityCertificateV1, input: VerifyFabricCompatibilityInputV1): boolean {
  try {
    if (validateJsonSchema(FIXTURE_SCHEMAS_V1.schemas.fabricCompatibilityCertificate!, certificate).length > 0) return false;
    const { certificateDigest, ...unsigned } = certificate;
    const piFabricVersion = readCertifiedPiFabricVersionV1(input.piFabricRoot);
    if (certificateDigest !== digestCanonical(unsigned) || certificate.piFabricVersion !== piFabricVersion || certificate.packageDigest !== input.expectedPackageDigest) return false;
    const checkNames = certificate.checks.map((entry) => entry.name);
    if (new Set(checkNames).size !== checkNames.length || canonicalJson([...checkNames].sort()) !== canonicalJson(REQUIRED_CHECKS)) return false;
    const runtime = collectCompatibilityRuntimeEvidence(input.runtimeEvidence ?? defaultRuntimeEvidence(input));
    if (canonicalJson(certificate.runtimeEvidence) !== canonicalJson(runtime.bindings)) return false;
    const byName = new Map(certificate.checks.map((entry) => [entry.name, entry]));
    const expectedRuntimeObservations = new Map<string, unknown>([
      ["cancellation-runtime", cancellationObservation(runtime)],
      ["component-activation", integrationObservation(runtime)],
      ["component-deactivation", integrationObservation(runtime)],
      ["host-integration-runtime", integrationObservation(runtime)],
      ...(["allow", "deny", "once", "session", "auto"] as const).map((mode) => [`approval-${mode}-runtime`, approvalObservation(runtime, mode)] as const),
      ...AGENT_ACTIONS.map((action) => [`${action}-runtime`, agentActionObservation(runtime, action)] as const),
    ]);
    for (const [name, observation] of expectedRuntimeObservations) if (byName.get(name)?.observationDigest !== digestCanonical(observation)) return false;
    const descriptors = createActionDescriptors(FIXTURE_SCHEMAS_V1);
    const schemaDigests = Object.fromEntries(Object.entries(FIXTURE_SCHEMAS_V1.actionInputs).map(([name, schema]) => [name, digestCanonical(schema)]));
    const descriptorSnapshot = descriptors.map((entry) => ({ name: entry.name, risk: entry.risk, effect: entry.effect, input: digestCanonical(entry.inputSchema), output: digestCanonical(entry.outputSchema ?? null) }));
    const manifest = readJson(join(realpathPackage(input.piFabricRoot), "package.json"));
    if (manifest.name !== "pi-fabric" || manifest.version !== piFabricVersion || certificate.exportMapDigest !== digestCanonical(manifest.exports) || certificate.publicSchemaDigest !== digestCanonical(schemaDigests) || certificate.descriptorDigest !== digestCanonical(descriptorSnapshot)) return false;
    if (!lintPiFabricPackageBoundary(input.arborSourceRoot).passed) return false;
    const expectedSupported = checksSupport(certificate.checks);
    if (certificate.supported !== expectedSupported) return false;
    if (certificate.agentActions.length !== AGENT_ACTIONS.length) return false;
    for (let index = 0; index < AGENT_ACTIONS.length; index += 1) {
      const action = AGENT_ACTIONS[index]!; const entry = certificate.agentActions[index]; const actionCheck = byName.get(`${action}-runtime`);
      if (!entry || entry.action !== action || !entry.runtimeTested || entry.passed !== actionCheck?.passed || entry.observationDigest !== actionCheck.observationDigest) return false;
    }
    return true;
  } catch { return false; }
}

export const FABRIC_COMPATIBILITY_REQUIRED_CHECKS_V1 = REQUIRED_CHECKS;
export const FABRIC_COMPATIBILITY_REQUIRED_EVIDENCE_MODES_V1 = REQUIRED_CHECK_EVIDENCE_MODE;
