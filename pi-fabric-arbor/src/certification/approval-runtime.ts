import { existsSync, readFileSync, readdirSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { ArborError } from "../domain/errors.js";
import { canonicalJson, digestCanonical, sha256 } from "../util/canonical.js";
import { projectRelativePathV1, readCertifiedPiFabricVersionV1, type CertifiedPiFabricVersionV1 } from "./pi-fabric-support.js";

export type ApprovalScenarioNameV1 = "allow" | "deny" | "once" | "session" | "auto";
export interface ApprovalRuntimeObservationV1 { version: 1; scenario: ApprovalScenarioNameV1; passed: boolean; approvalsRequested: number; classifierCalls: number; autoDecisions: string[]; outcome: "allowed" | "denied"; }
export interface ApprovalRuntimeCertificateV1 {
  version: 1; certificationId: string; createdAt: string; piFabricVersion: CertifiedPiFabricVersionV1; packageDigest: string; harnessDigest: string;
  exactCommand: string[]; observations: ApprovalRuntimeObservationV1[]; passed: boolean; signerId: string; certificateDigest: string;
}

type Controller = { approve(action: { ref: string; risk: string; description: string }, args?: Record<string, unknown>): Promise<void> };
type ApprovalModule = {
  ApprovalController: new (config: Record<string, unknown>, context: Record<string, unknown>, session?: object, classifier?: object, onDecision?: (decision: { decision: string }) => void) => Controller;
  FabricSessionApprovals: new () => object;
};

function approvalChunk(packageRoot: string): string {
  const directory = join(resolve(packageRoot), "dist", "chunks");
  const candidates = readdirSync(directory).filter((name) => name.endsWith(".js") && readFileSync(join(directory, name), "utf8").includes("var ApprovalController = class"));
  if (candidates.length !== 1) throw new ArborError("COMPATIBILITY_CERTIFICATION_REQUIRED", "The installed approval runtime could not be identified exactly", { candidates });
  return join(directory, candidates[0]!);
}

export async function runInstalledApprovalRuntimeMatrix(packageRoot: string): Promise<{ observations: ApprovalRuntimeObservationV1[]; packageDigest: string; piFabricVersion: CertifiedPiFabricVersionV1 }> {
  const root = resolve(packageRoot); const piFabricVersion = readCertifiedPiFabricVersionV1(root);
  const chunk = approvalChunk(root); const runtime = await import(pathToFileURL(chunk).href) as ApprovalModule;
  const action = { ref: "arbor.certification.write", risk: "write", description: "B9 approval semantics probe with no external side effect" };
  const execute = async (scenario: ApprovalScenarioNameV1): Promise<ApprovalRuntimeObservationV1> => {
    let approvalsRequested = 0; let classifierCalls = 0; const autoDecisions: string[] = [];
    const labels = scenario === "session" ? ["Allow write access for this session"] : scenario === "deny" ? ["Deny"] : ["Allow once"];
    const context = { hasUI: true, mode: "rpc", signal: new AbortController().signal, ui: { notify() {}, async select(_prompt: string, _options: string[]) { approvalsRequested += 1; return labels[0]; } } };
    const classifier = { async classify() { classifierCalls += 1; return { decision: "allow", reason: "deterministic certification classifier", model: "certification/local", usage: {} }; } };
    const config = { read: "deny", write: scenario === "once" || scenario === "session" ? "ask" : scenario, execute: "deny", network: "deny", agent: "deny" };
    const controller = new runtime.ApprovalController(config, context, new runtime.FabricSessionApprovals(), classifier, (decision) => autoDecisions.push(decision.decision));
    let outcome: "allowed" | "denied" = "allowed";
    const calls = scenario === "once" || scenario === "session" || scenario === "auto" ? 2 : 1;
    try { for (let index = 0; index < calls; index += 1) await controller.approve(action, { probe: index }); } catch { outcome = "denied"; }
    const passed = scenario === "allow" ? outcome === "allowed" && approvalsRequested === 0
      : scenario === "deny" ? outcome === "denied" && approvalsRequested === 0
      : scenario === "once" ? outcome === "allowed" && approvalsRequested === 2
      : scenario === "session" ? outcome === "allowed" && approvalsRequested === 1
      : outcome === "allowed" && approvalsRequested === 0 && classifierCalls === 2 && autoDecisions.length === 2 && autoDecisions.every((entry) => entry === "allow");
    return { version: 1, scenario, passed, approvalsRequested, classifierCalls, autoDecisions, outcome };
  };
  const observations: ApprovalRuntimeObservationV1[] = [];
  for (const scenario of ["allow", "deny", "once", "session", "auto"] as const) observations.push(await execute(scenario));
  return { observations, packageDigest: sha256(readFileSync(chunk)), piFabricVersion };
}

export async function generateApprovalRuntimeCertificate(input: { packageRoot: string; artifact: string; createdAt: string; signerId: string; projectRoot?: string }): Promise<ApprovalRuntimeCertificateV1> {
  const projectRoot = resolve(input.projectRoot ?? process.cwd()); const result = await runInstalledApprovalRuntimeMatrix(input.packageRoot);
  const exactCommand = [process.execPath, "dist/bin/pi-fabric-arbor-approval-runtime-certify.js", "verify", "--package-root", projectRelativePathV1(projectRoot, input.packageRoot), "--artifact", projectRelativePathV1(projectRoot, input.artifact)];
  const base = { version: 1 as const, certificationId: "approval_runtime_b9_v1", createdAt: input.createdAt, piFabricVersion: result.piFabricVersion, packageDigest: result.packageDigest, harnessDigest: sha256(readFileSync(join(projectRoot, "src/certification/approval-runtime.ts"))), exactCommand, observations: result.observations, passed: result.observations.every((entry) => entry.passed), signerId: input.signerId };
  return { ...base, certificateDigest: digestCanonical(base) };
}

export async function verifyApprovalRuntimeCertificate(input: { packageRoot: string; artifact: string; projectRoot?: string }): Promise<{ valid: boolean; certificate?: ApprovalRuntimeCertificateV1; errors: string[] }> {
  const errors: string[] = []; let certificate: ApprovalRuntimeCertificateV1;
  try { certificate = JSON.parse(readFileSync(input.artifact, "utf8")) as ApprovalRuntimeCertificateV1; } catch { return { valid: false, errors: ["approval runtime certificate is missing or invalid JSON"] }; }
  const projectRoot = resolve(input.projectRoot ?? process.cwd()); const { certificateDigest, ...unsigned } = certificate;
  if (certificateDigest !== digestCanonical(unsigned)) errors.push("certificate digest mismatch");
  if (certificate.harnessDigest !== sha256(readFileSync(join(projectRoot, "src/certification/approval-runtime.ts")))) errors.push("active harness digest mismatch");
  try { const current = await runInstalledApprovalRuntimeMatrix(input.packageRoot); if (current.piFabricVersion !== certificate.piFabricVersion) errors.push("installed approval runtime version mismatch"); if (current.packageDigest !== certificate.packageDigest) errors.push("installed approval runtime digest mismatch"); if (canonicalJson(current.observations) !== canonicalJson(certificate.observations)) errors.push("runtime observations are not reproducible"); } catch (error) { errors.push(error instanceof Error ? error.message : String(error)); }
  if (!certificate.passed || !certificate.observations.every((entry) => entry.passed)) errors.push("approval matrix did not pass");
  return { valid: errors.length === 0, certificate, errors };
}

export function writeApprovalRuntimeCertificate(path: string, certificate: ApprovalRuntimeCertificateV1): void { const target = resolve(path); mkdirSync(dirname(target), { recursive: true, mode: 0o700 }); writeFileSync(target, `${canonicalJson(certificate)}\n`, { mode: 0o600 }); }
export function approvalRuntimeArtifactExists(path: string): boolean { return existsSync(path); }
