import { createPublicKey, generateKeyPairSync, randomBytes, sign, timingSafeEqual, verify } from "node:crypto";
import { chmodSync, existsSync, lstatSync, readFileSync, realpathSync, rmSync } from "node:fs";
import { createConnection, createServer, type Server, type Socket } from "node:net";
import { dirname, relative, resolve, sep } from "node:path";
import { ArborError } from "../domain/errors.js";
import { parseCanonicalDecimal } from "../domain/decimal.js";
import { CanonicalEvaluatorReadOnlyMountGrant, computeCanonicalFilesystemDigest, type LinuxBubblewrapContainmentAdapter } from "../containment/BubblewrapContainmentAdapter.js";
import { assertPackagePrivateRepository } from "../git/PackageWorkspaceManager.js";
import { validateExactCommittedWorkspaceSync } from "../git/trusted-tree.js";
import { canonicalJson, digestCanonical, sha256 } from "../util/canonical.js";
import type { ResourceBudgetAuthorityV1 } from "../phase7/resources.js";

export interface HeldOutServiceCandidateV1 { candidateId: string; oid: string; workspace: string; resultPath: string }
export interface HeldOutEvaluatorServiceSealV1 {
  version: 1;
  serviceId: string;
  evaluatorId: string;
  sealedAt: string;
  heldOutInputDigest: string;
  candidates: Array<{ candidateId: string; oid: string; candidateManifestDigest: string; resultPath: string; resultDigest: string }>;
  evaluatorExecutableDigest: string;
  evaluatorAlgorithmDigest: string;
  evaluatorPolicyDigest: string;
  containmentCertificateDigest: string;
  thresholdSealDigest: string;
  capabilityDigest: string;
  sourceDigest: string;
  signerId: string;
  signingPublicKey: string;
  payloadDigest: string;
  signature: string;
  sealDigest: string;
}
export interface HeldOutEvaluationServiceReceiptV1 {
  version: 1;
  requestId: string;
  serviceId: string;
  evaluatorId: string;
  candidateId: string;
  oid: string;
  value: string;
  heldOutInputDigest: string;
  candidateResultDigest: string;
  candidateManifestDigest: string;
  containmentId: string;
  containmentCertificateDigest: string;
  outputDigest: string;
  stdoutDigest: string;
  stderrDigest: string;
  elapsedMs: number;
  outputBytes: number;
  peakProcesses: number;
  peakRssBytes: number;
  serviceSealDigest: string;
  evaluatorPolicyDigest: string;
  receiptDigest: string;
}
interface ServiceRequestV1 { version: 1; operation: "evaluate"; requestId: string; evaluatorId: string; candidateId: string; capability: string }
interface ServiceResponseV1 { version: 1; ok: boolean; receipt?: HeldOutEvaluationServiceReceiptV1; errorCode?: "DENIED" | "INVALID" | "FAILED" }

const ID = /^[a-z][a-z0-9_]{2,63}$/u;
const OID = /^(?:[0-9a-f]{40}|[0-9a-f]{64})$/u;
const MAX_FRAME = 65_536;
const EVALUATOR_SOURCE = `
const fs=require("node:fs");
const candidate=fs.readFileSync("/workspace/result.txt","utf8").trim();
const held=fs.readFileSync("/held-out","utf8").trim();
if(!/^-?(?:0|[1-9][0-9]{0,26})$/.test(candidate)||!/^-?(?:0|[1-9][0-9]{0,26})$/.test(held))process.exit(65);
const value=(BigInt(candidate)+BigInt(held)).toString();
process.stdout.write(JSON.stringify({version:1,value}));
`.trim();
export const HELD_OUT_EVALUATOR_ALGORITHM_DIGEST_V1 = sha256(EVALUATOR_SOURCE);

function safeCandidate(candidate: HeldOutServiceCandidateV1, stateRoot: string, privateGitDir: string): { candidateId: string; oid: string; workspace: string; resultPath: string; resultDigest: string; candidateManifestDigest: string } {
  if (!ID.test(candidate.candidateId) || !OID.test(candidate.oid) || candidate.resultPath !== "result.txt") throw new ArborError("VALIDATION_FAILED", "Held-out candidate identity is invalid");
  const workspace = realpathSync(candidate.workspace); const rel = relative(realpathSync(stateRoot), workspace);
  if (rel === "" || rel === ".." || rel.startsWith(`..${sep}`)) throw new ArborError("WRITE_CONFINEMENT_UNAVAILABLE", "Held-out candidate workspace is outside package state");
  const manifest = validateExactCommittedWorkspaceSync({ workspace, privateGitDir, oid: candidate.oid, stateRoot });
  const resultEntry = manifest.entries.find((entry) => entry.path === candidate.resultPath);
  if (!resultEntry || resultEntry.type !== "file" || resultEntry.bytes > 4_096) throw new ArborError("EVIDENCE_INVALID", "Held-out candidate result is not a bounded committed regular file");
  return { ...candidate, workspace, resultDigest: resultEntry.contentDigest, candidateManifestDigest: manifest.manifestDigest };
}
function sealPayload(seal: HeldOutEvaluatorServiceSealV1): Omit<HeldOutEvaluatorServiceSealV1, "sealDigest" | "payloadDigest" | "signature"> { const { sealDigest: _, payloadDigest: _p, signature: _s, ...value } = seal; return value; }
export function verifyHeldOutEvaluatorServiceSealV1(seal: HeldOutEvaluatorServiceSealV1): boolean {
  try {
    const unsigned = sealPayload(seal); const payloadDigest = digestCanonical(unsigned);
    return seal.version === 1 && seal.payloadDigest === payloadDigest && seal.sealDigest === digestCanonical({ ...unsigned, payloadDigest, signature: seal.signature })
      && seal.evaluatorAlgorithmDigest === HELD_OUT_EVALUATOR_ALGORITHM_DIGEST_V1
      && verify(null, Buffer.from(payloadDigest, "hex"), createPublicKey({ key: Buffer.from(seal.signingPublicKey, "base64"), format: "der", type: "spki" }), Buffer.from(seal.signature, "base64"));
  } catch { return false; }
}

export class SealedHeldOutEvaluatorClientV1 {
  readonly #socketPath: string; readonly #capability: string; readonly serviceSeal: HeldOutEvaluatorServiceSealV1;
  constructor(socketPath: string, capability: string, serviceSeal: HeldOutEvaluatorServiceSealV1) { this.#socketPath = socketPath; this.#capability = capability; this.serviceSeal = serviceSeal; }
  evaluate(input: { requestId: string; evaluatorId: string; candidateId: string }): Promise<HeldOutEvaluationServiceReceiptV1> { return sendRequest(this.#socketPath, { version: 1, operation: "evaluate", ...input, capability: this.#capability }).then((response) => { if (!response.ok || !response.receipt) throw new ArborError("HELD_OUT_ISOLATION_REQUIRED", `Held-out service denied or failed: ${response.errorCode ?? "FAILED"}`); return response.receipt; }); }
}

export class SealedHeldOutEvaluatorServiceV1 {
  readonly socketPath: string;
  readonly seal: HeldOutEvaluatorServiceSealV1;
  readonly #capability: string;
  readonly #capabilityBytes: Buffer;
  readonly #containment: LinuxBubblewrapContainmentAdapter;
  readonly #grant: CanonicalEvaluatorReadOnlyMountGrant;
  readonly #mountToken: string;
  readonly #candidates: Map<string, ReturnType<typeof safeCandidate>>;
  readonly #budgets: ResourceBudgetAuthorityV1;
  readonly #stateRoot: string;
  readonly #privateGitDir: string;
  #server: Server | undefined;

  constructor(input: { serviceId: string; evaluatorId: string; socketPath: string; stateRoot: string; privateGitDir: string; heldOutInput: string; expectedHeldOutInputDigest: string; candidates: HeldOutServiceCandidateV1[]; containment: LinuxBubblewrapContainmentAdapter; containmentCertificateDigest: string; thresholdSealDigest: string; budgets: ResourceBudgetAuthorityV1; sealedAt: string; signerId: string }) {
    if (!ID.test(input.serviceId) || !ID.test(input.evaluatorId) || !ID.test(input.signerId) || input.candidates.length < 1 || input.candidates.length > 128) throw new ArborError("VALIDATION_FAILED", "Held-out service configuration is invalid");
    const heldOut = realpathSync(input.heldOutInput); const heldStat = lstatSync(heldOut);
    if (!heldStat.isFile() || heldStat.isSymbolicLink() || heldStat.size > 16_777_216 || computeCanonicalFilesystemDigest(heldOut) !== input.expectedHeldOutInputDigest) throw new ArborError("HELD_OUT_ISOLATION_REQUIRED", "Held-out input does not match its sealed digest");
    const socketPath = resolve(input.socketPath); const socketParent = realpathSync(dirname(socketPath)); const state = realpathSync(input.stateRoot); const rel = relative(state, socketParent);
    if (rel === "" || rel === ".." || rel.startsWith(`..${sep}`)) throw new ArborError("WRITE_CONFINEMENT_UNAVAILABLE", "Held-out service socket is outside package state");
    if ((lstatSync(socketParent).mode & 0o077) !== 0) throw new ArborError("HELD_OUT_ISOLATION_REQUIRED", "Held-out service directory must be owner-only");
    const privateIdentity = assertPackagePrivateRepository({ privateGitDir: input.privateGitDir, stateRoot: state });
    const candidates = input.candidates.map((candidate) => safeCandidate(candidate, state, privateIdentity.privateGitDir));
    if (new Set(candidates.map((candidate) => candidate.candidateId)).size !== candidates.length) throw new ArborError("VALIDATION_FAILED", "Held-out candidate IDs must be unique");
    this.socketPath = socketPath; this.#candidates = new Map(candidates.map((candidate) => [candidate.candidateId, candidate])); this.#containment = input.containment; this.#budgets = input.budgets; this.#stateRoot = state; this.#privateGitDir = privateIdentity.privateGitDir;
    this.#capability = randomBytes(32).toString("base64url"); this.#capabilityBytes = Buffer.from(sha256(this.#capability), "hex"); this.#mountToken = randomBytes(32).toString("base64url"); this.#grant = new CanonicalEvaluatorReadOnlyMountGrant(heldOut, this.#mountToken);
    const pair = generateKeyPairSync("ed25519"); const evaluatorExecutableDigest = sha256(readFileSync(process.execPath));
    const evaluatorPolicyDigest = digestCanonical({ version: 1, evaluatorId: input.evaluatorId, heldOutInputDigest: input.expectedHeldOutInputDigest, evaluatorExecutableDigest, evaluatorAlgorithmDigest: HELD_OUT_EVALUATOR_ALGORITHM_DIGEST_V1, containmentCertificateDigest: input.containmentCertificateDigest, thresholdSealDigest: input.thresholdSealDigest });
    const unsigned = {
      version: 1 as const, serviceId: input.serviceId, evaluatorId: input.evaluatorId, sealedAt: input.sealedAt, heldOutInputDigest: input.expectedHeldOutInputDigest,
      candidates: candidates.map(({ workspace, candidateManifestDigest, ...candidate }) => ({ ...candidate, candidateManifestDigest })).sort((left, right) => left.candidateId.localeCompare(right.candidateId)),
      evaluatorExecutableDigest, evaluatorAlgorithmDigest: HELD_OUT_EVALUATOR_ALGORITHM_DIGEST_V1, evaluatorPolicyDigest,
      containmentCertificateDigest: input.containmentCertificateDigest, thresholdSealDigest: input.thresholdSealDigest, capabilityDigest: sha256(this.#capability),
      sourceDigest: sha256(readFileSync(new URL(import.meta.url))), signerId: input.signerId,
      signingPublicKey: pair.publicKey.export({ format: "der", type: "spki" }).toString("base64"),
    };
    const payloadDigest = digestCanonical(unsigned); const signature = sign(null, Buffer.from(payloadDigest, "hex"), pair.privateKey).toString("base64");
    this.seal = Object.freeze({ ...unsigned, payloadDigest, signature, sealDigest: digestCanonical({ ...unsigned, payloadDigest, signature }) });
  }

  client(): SealedHeldOutEvaluatorClientV1 { return new SealedHeldOutEvaluatorClientV1(this.socketPath, this.#capability, this.seal); }

  async start(): Promise<void> {
    if (this.#server) throw new ArborError("DUPLICATE_ENTITY", "Held-out evaluator service is already running");
    if (existsSync(this.socketPath)) rmSync(this.socketPath);
    this.#server = createServer((socket) => this.#handle(socket));
    await new Promise<void>((resolvePromise, reject) => { this.#server!.once("error", reject); this.#server!.listen(this.socketPath, () => { this.#server!.off("error", reject); resolvePromise(); }); });
    chmodSync(this.socketPath, 0o600);
  }

  async close(): Promise<void> { const server = this.#server; this.#server = undefined; if (server) await new Promise<void>((resolvePromise) => server.close(() => resolvePromise())); if (existsSync(this.socketPath)) rmSync(this.socketPath); }

  #handle(socket: Socket): void {
    let bytes = 0; let text = ""; let handled = false;
    const respond = (response: ServiceResponseV1): void => { if (handled) return; handled = true; socket.end(`${canonicalJson(response)}\n`); };
    socket.on("data", (chunk: Buffer) => {
      bytes += chunk.byteLength; if (bytes > MAX_FRAME) { respond({ version: 1, ok: false, errorCode: "INVALID" }); return; }
      text += chunk.toString("utf8"); const newline = text.indexOf("\n"); if (newline < 0) return;
      const frame = text.slice(0, newline); if (text.slice(newline + 1).length > 0) { respond({ version: 1, ok: false, errorCode: "INVALID" }); return; }
      void this.#evaluateFrame(frame).then((receipt) => respond({ version: 1, ok: true, receipt }), (error) => respond({ version: 1, ok: false, errorCode: error instanceof ArborError && error.code === "HELD_OUT_ISOLATION_REQUIRED" ? "DENIED" : error instanceof ArborError && error.code === "VALIDATION_FAILED" ? "INVALID" : "FAILED" }));
    });
    socket.on("error", () => undefined);
  }

  async #evaluateFrame(frame: string): Promise<HeldOutEvaluationServiceReceiptV1> {
    let value: unknown; try { value = JSON.parse(frame); } catch { throw new ArborError("VALIDATION_FAILED", "Held-out service frame is not JSON"); }
    if (!value || typeof value !== "object" || Array.isArray(value) || canonicalJson(Object.keys(value).sort()) !== canonicalJson(["candidateId", "capability", "evaluatorId", "operation", "requestId", "version"].sort())) throw new ArborError("VALIDATION_FAILED", "Held-out service frame is not closed");
    const request = value as ServiceRequestV1;
    const actualCapability = Buffer.from(sha256(typeof request.capability === "string" ? request.capability : ""), "hex");
    if (actualCapability.byteLength !== this.#capabilityBytes.byteLength || !timingSafeEqual(actualCapability, this.#capabilityBytes)) throw new ArborError("HELD_OUT_ISOLATION_REQUIRED", "Evaluator-only opaque capability was denied");
    if (request.version !== 1 || request.operation !== "evaluate" || request.evaluatorId !== this.seal.evaluatorId || !ID.test(request.requestId) || !ID.test(request.candidateId)) throw new ArborError("VALIDATION_FAILED", "Held-out service request identity is invalid");
    const candidate = this.#candidates.get(request.candidateId); if (!candidate) throw new ArborError("VALIDATION_FAILED", "Unknown sealed held-out candidate");
    const immediatelyBefore = safeCandidate(candidate, this.#stateRoot, this.#privateGitDir); this.#grant.verifyCurrent();
    if (immediatelyBefore.candidateManifestDigest !== candidate.candidateManifestDigest || immediatelyBefore.resultDigest !== candidate.resultDigest) throw new ArborError("EVIDENCE_INVALID", "Sealed candidate bytes changed immediately before held-out execution");
    const reservation = this.#budgets.reserveEvaluator(`reservation_${request.requestId}`); const started = performance.now();
    const limits = this.#budgets.processLimits(); const containmentId = `containment_${sha256(request.requestId).slice(0, 32)}`;
    const result = await this.#containment.runCanonicalEvaluator({ version: 1, containmentId, workspace: candidate.workspace, argv: [process.execPath, "-e", EVALUATOR_SOURCE], permissions: { network: false, packageInstallation: false, processExecution: true }, workspaceWritable: false, ...limits }, this.#grant, this.#mountToken);
    const elapsedMs = Math.ceil(performance.now() - started); const outputBytes = Buffer.byteLength(result.stdout) + Buffer.byteLength(result.stderr);
    const atReceipt = safeCandidate(candidate, this.#stateRoot, this.#privateGitDir); this.#grant.verifyCurrent();
    if (atReceipt.candidateManifestDigest !== candidate.candidateManifestDigest || atReceipt.resultDigest !== candidate.resultDigest) throw new ArborError("EVIDENCE_INVALID", "Sealed candidate bytes changed before held-out receipt");
    this.#budgets.settleEvaluator(reservation.reservationId, { elapsedMs, outputBytes, peakProcesses: result.resourceUsage.peakProcesses, peakRssBytes: result.resourceUsage.peakRssBytes, processBreach: result.resourceUsage.breach, observation: { exitCode: result.exitCode, stdoutDigest: result.stdoutDigest, stderrDigest: result.stderrDigest, containmentId } });
    if (result.exitCode !== 0 || result.timedOut || result.cancelled || result.oversized || result.resourceUsage.breach) throw new ArborError("EVIDENCE_INVALID", "Held-out evaluator process failed or breached a resource limit");
    let output: unknown; try { output = JSON.parse(result.stdout); } catch { throw new ArborError("EVIDENCE_INVALID", "Held-out evaluator emitted malformed output"); }
    if (!output || typeof output !== "object" || Array.isArray(output) || canonicalJson(Object.keys(output).sort()) !== canonicalJson(["value", "version"]) || (output as { version?: unknown }).version !== 1 || typeof (output as { value?: unknown }).value !== "string") throw new ArborError("EVIDENCE_INVALID", "Held-out evaluator output is not one closed record");
    const score = (output as { value: string }).value; parseCanonicalDecimal(score);
    const payload = { version: 1 as const, requestId: request.requestId, serviceId: this.seal.serviceId, evaluatorId: this.seal.evaluatorId, candidateId: candidate.candidateId, oid: candidate.oid, value: score, heldOutInputDigest: this.seal.heldOutInputDigest, candidateResultDigest: candidate.resultDigest, candidateManifestDigest: candidate.candidateManifestDigest, containmentId, containmentCertificateDigest: this.seal.containmentCertificateDigest, outputDigest: sha256(result.stdout), stdoutDigest: result.stdoutDigest, stderrDigest: result.stderrDigest, elapsedMs, outputBytes, peakProcesses: result.resourceUsage.peakProcesses, peakRssBytes: result.resourceUsage.peakRssBytes, serviceSealDigest: this.seal.sealDigest, evaluatorPolicyDigest: this.seal.evaluatorPolicyDigest };
    return Object.freeze({ ...payload, receiptDigest: digestCanonical(payload) });
  }
}

export async function probeHeldOutServiceDeniedV1(socketPath: string, input: { requestId: string; evaluatorId: string; candidateId: string }): Promise<boolean> {
  const response = await sendRequest(socketPath, { version: 1, operation: "evaluate", ...input, capability: randomBytes(32).toString("base64url") });
  return !response.ok && response.errorCode === "DENIED";
}

function sendRequest(socketPath: string, request: ServiceRequestV1): Promise<ServiceResponseV1> {
  return new Promise<ServiceResponseV1>((resolvePromise, reject) => {
    const socket = createConnection(socketPath); let bytes = 0; let text = "";
    socket.once("connect", () => socket.write(`${canonicalJson(request)}\n`));
    socket.on("data", (chunk: Buffer) => { bytes += chunk.byteLength; if (bytes > MAX_FRAME) { socket.destroy(); reject(new ArborError("EVIDENCE_INVALID", "Held-out service response exceeded its bound")); return; } text += chunk.toString("utf8"); });
    socket.once("error", reject);
    socket.once("end", () => { try { const response = JSON.parse(text.trim()) as ServiceResponseV1; resolvePromise(response); } catch { reject(new ArborError("EVIDENCE_INVALID", "Held-out service response was malformed")); } });
  });
}
