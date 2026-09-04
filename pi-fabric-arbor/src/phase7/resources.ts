import { appendFileSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { exactUnits, formatQuantumUnits } from "../domain/decimal.js";
import { ArborError } from "../domain/errors.js";
import type { CanonicalDecimal } from "../domain/types.js";
import { canonicalJson, digestCanonical, sha256 } from "../util/canonical.js";
import type { GraduationThresholdSealV1 } from "./thresholds.js";
import { verifyGraduationThresholdSealV1 } from "./thresholds.js";

export interface ResourceEnforcementCapabilitiesV1 {
  version: 1;
  wallTime: "hard-process-termination";
  output: "hard-stream-termination";
  processes: "cgroup-v2-pids.max";
  rss: "cgroup-v2-memory.max";
  concurrency: "atomic-reservation";
  tokens: "per-child-hard-limit-and-atomic-reservation";
  cost: "pre-call-maximum-reservation-and-post-call-meter";
  evaluatorRuns: "atomic-reservation";
}

export interface ResourceReservationV1 {
  version: 1;
  reservationId: string;
  kind: "agent" | "evaluator";
  createdAt: string;
  state: "ACTIVE" | "SETTLED" | "BREACHED";
  maximumTokens: number;
  maximumCostUsd: string;
  actualTokens?: number;
  actualCostUsd?: string;
  evaluatorRuns: number;
  observationDigest?: string;
}

export interface ResourceBudgetSnapshotV1 {
  version: 1;
  thresholdSealDigest: string;
  capabilities: ResourceEnforcementCapabilitiesV1;
  activeConcurrency: number;
  agentReservations: number;
  evaluatorRuns: number;
  reservedTokens: number;
  actualTokens: number;
  reservedCostUsd: string;
  actualCostUsd: string;
  breachCount: number;
  reservationsDigest: string;
  journalDigest: string;
}

const ID = /^[a-z][a-z0-9_]{2,63}$/u;
const COST_QUANTUM = "0.000000001" as const;

function costUnits(value: string): bigint { return exactUnits(value, COST_QUANTUM); }
function costString(value: bigint): CanonicalDecimal { return formatQuantumUnits(value, COST_QUANTUM); }

/**
 * Synchronous reservation is the admission boundary. JavaScript run-to-completion
 * makes each reserve operation atomic within the owning Arbor runtime; the durable
 * journal permits recovery to conservatively retain every unsettled reservation.
 */
export class ResourceBudgetAuthorityV1 {
  readonly #seal: GraduationThresholdSealV1;
  readonly #journalPath: string;
  readonly #capabilities: ResourceEnforcementCapabilitiesV1;
  readonly #reservations = new Map<string, ResourceReservationV1>();
  #evaluatorRuns = 0;

  constructor(input: { seal: GraduationThresholdSealV1; journalPath: string; capabilities: ResourceEnforcementCapabilitiesV1 }) {
    const verified = verifyGraduationThresholdSealV1(input.seal);
    if (!verified.valid) throw new ArborError("EVIDENCE_INVALID", "Resource authority requires a valid pre-execution threshold seal", { errors: verified.errors });
    if (process.platform !== "linux") throw new ArborError("WRITE_CONFINEMENT_UNAVAILABLE", "Process and RSS enforcement is certified only on Linux");
    const required: ResourceEnforcementCapabilitiesV1 = {
      version: 1, wallTime: "hard-process-termination", output: "hard-stream-termination", processes: "cgroup-v2-pids.max",
      rss: "cgroup-v2-memory.max", concurrency: "atomic-reservation", tokens: "per-child-hard-limit-and-atomic-reservation",
      cost: "pre-call-maximum-reservation-and-post-call-meter", evaluatorRuns: "atomic-reservation",
    };
    if (canonicalJson(input.capabilities) !== canonicalJson(required)) throw new ArborError("COMPATIBILITY_CERTIFICATION_REQUIRED", "A requested Phase 7 resource limit is not enforceable by the active runtime");
    this.#seal = input.seal; this.#journalPath = resolve(input.journalPath); this.#capabilities = Object.freeze(structuredClone(input.capabilities));
    mkdirSync(dirname(this.#journalPath), { recursive: true, mode: 0o700 });
  }

  processLimits(): { timeoutMs: number; maxOutputBytes: number; resourceLimits: { maxProcesses: number; maxRssBytes: number } } {
    const limits = this.#seal.thresholds.resources;
    return { timeoutMs: limits.evaluatorWallTimeMs, maxOutputBytes: limits.evaluatorOutputBytes, resourceLimits: { maxProcesses: limits.maximumProcesses, maxRssBytes: limits.maximumRssBytes } };
  }

  reserveAgent(reservationId: string, maximumTokens: number, maximumCostUsd: string, createdAt = new Date().toISOString()): ResourceReservationV1 {
    this.#assertNew(reservationId);
    const limits = this.#seal.thresholds.resources;
    if (!Number.isSafeInteger(maximumTokens) || maximumTokens < 1 || maximumTokens > limits.maximumTokensPerAgent) throw new ArborError("BUDGET_EXHAUSTED", "Per-agent token reservation exceeds the sealed hard limit");
    const cost = costUnits(maximumCostUsd); if (cost <= 0n || cost > costUnits(limits.maximumCostPerAgentUsd)) throw new ArborError("BUDGET_EXHAUSTED", "Per-agent cost reservation exceeds the sealed limit");
    this.#requireConcurrency();
    const reservedTokens = [...this.#reservations.values()].filter((entry) => entry.kind === "agent").reduce((sum, entry) => sum + entry.maximumTokens, 0);
    const reservedCost = [...this.#reservations.values()].filter((entry) => entry.kind === "agent").reduce((sum, entry) => sum + costUnits(entry.maximumCostUsd), 0n);
    if (reservedTokens + maximumTokens > limits.maximumTotalTokens || reservedCost + cost > costUnits(limits.maximumTotalCostUsd)) throw new ArborError("BUDGET_EXHAUSTED", "Global token or cost reservation is exhausted");
    return this.#record({ version: 1, reservationId, kind: "agent", createdAt, state: "ACTIVE", maximumTokens, maximumCostUsd, evaluatorRuns: 0 });
  }

  reserveEvaluator(reservationId: string, createdAt = new Date().toISOString()): ResourceReservationV1 {
    this.#assertNew(reservationId); this.#requireConcurrency();
    if (this.#evaluatorRuns >= this.#seal.thresholds.resources.maximumEvaluatorRuns) throw new ArborError("BUDGET_EXHAUSTED", "Evaluator-run budget is exhausted");
    this.#evaluatorRuns += 1;
    return this.#record({ version: 1, reservationId, kind: "evaluator", createdAt, state: "ACTIVE", maximumTokens: 0, maximumCostUsd: "0", evaluatorRuns: 1 });
  }

  settleAgent(reservationId: string, input: { actualTokens: number; actualCostUsd: string; observation: unknown }): ResourceReservationV1 {
    const current = this.#active(reservationId, "agent");
    if (!Number.isSafeInteger(input.actualTokens) || input.actualTokens < 0) throw new ArborError("EVIDENCE_INVALID", "Agent token usage is unavailable or malformed");
    const actualCost = costUnits(input.actualCostUsd);
    const breached = input.actualTokens > current.maximumTokens || actualCost > costUnits(current.maximumCostUsd);
    const settled: ResourceReservationV1 = { ...current, state: breached ? "BREACHED" : "SETTLED", actualTokens: input.actualTokens, actualCostUsd: input.actualCostUsd, observationDigest: digestCanonical(input.observation) };
    this.#reservations.set(reservationId, settled); this.#append(settled);
    if (breached) throw new ArborError("BUDGET_EXHAUSTED", "Measured agent usage breached its pre-call reservation", { reservationId });
    return Object.freeze(structuredClone(settled));
  }

  settleEvaluator(reservationId: string, input: { elapsedMs: number; outputBytes: number; peakProcesses: number; peakRssBytes: number; processBreach: string | null; observation: unknown }): ResourceReservationV1 {
    const current = this.#active(reservationId, "evaluator"); const limits = this.#seal.thresholds.resources;
    const breached = !Number.isFinite(input.elapsedMs) || input.elapsedMs > limits.evaluatorWallTimeMs || input.outputBytes > limits.evaluatorOutputBytes || input.peakProcesses > limits.maximumProcesses || input.peakRssBytes > limits.maximumRssBytes || input.processBreach !== null;
    const settled: ResourceReservationV1 = { ...current, state: breached ? "BREACHED" : "SETTLED", observationDigest: digestCanonical(input.observation) };
    this.#reservations.set(reservationId, settled); this.#append(settled);
    if (breached) throw new ArborError("BUDGET_EXHAUSTED", "Evaluator breached a sealed wall/output/process/RSS limit", { reservationId });
    return Object.freeze(structuredClone(settled));
  }

  snapshot(): ResourceBudgetSnapshotV1 {
    const values = [...this.#reservations.values()].sort((left, right) => left.reservationId.localeCompare(right.reservationId));
    const agents = values.filter((entry) => entry.kind === "agent");
    let journal = Buffer.alloc(0); try { journal = readFileSync(this.#journalPath); } catch { /* empty before first reservation */ }
    return Object.freeze({
      version: 1, thresholdSealDigest: this.#seal.sealDigest, capabilities: this.#capabilities,
      activeConcurrency: values.filter((entry) => entry.state === "ACTIVE").length, agentReservations: agents.length, evaluatorRuns: this.#evaluatorRuns,
      reservedTokens: agents.reduce((sum, entry) => sum + entry.maximumTokens, 0), actualTokens: agents.reduce((sum, entry) => sum + (entry.actualTokens ?? 0), 0),
      reservedCostUsd: costString(agents.reduce((sum, entry) => sum + costUnits(entry.maximumCostUsd), 0n)),
      actualCostUsd: costString(agents.reduce((sum, entry) => sum + costUnits(entry.actualCostUsd ?? "0"), 0n)),
      breachCount: values.filter((entry) => entry.state === "BREACHED").length, reservationsDigest: digestCanonical(values), journalDigest: sha256(journal),
    });
  }

  #assertNew(reservationId: string): void { if (!ID.test(reservationId) || this.#reservations.has(reservationId)) throw new ArborError("IDEMPOTENCY_KEY_REUSED", "Resource reservation ID is invalid or already used"); }
  #requireConcurrency(): void { if ([...this.#reservations.values()].filter((entry) => entry.state === "ACTIVE").length >= this.#seal.thresholds.resources.maximumConcurrentAttempts) throw new ArborError("BUDGET_EXHAUSTED", "Concurrent-attempt limit is exhausted"); }
  #active(reservationId: string, kind: ResourceReservationV1["kind"]): ResourceReservationV1 { const value = this.#reservations.get(reservationId); if (!value || value.kind !== kind || value.state !== "ACTIVE") throw new ArborError("IDEMPOTENCY_KEY_REUSED", "Resource reservation is missing, settled, or has the wrong class"); return value; }
  #record(value: ResourceReservationV1): ResourceReservationV1 { this.#reservations.set(value.reservationId, value); this.#append(value); return Object.freeze(structuredClone(value)); }
  #append(value: ResourceReservationV1): void { appendFileSync(this.#journalPath, `${canonicalJson(value)}\n`, { encoding: "utf8", mode: 0o600, flag: "a" }); }
}

export const PHASE7_RESOURCE_ENFORCEMENT_CAPABILITIES_V1: ResourceEnforcementCapabilitiesV1 = Object.freeze({
  version: 1, wallTime: "hard-process-termination", output: "hard-stream-termination", processes: "cgroup-v2-pids.max", rss: "cgroup-v2-memory.max",
  concurrency: "atomic-reservation", tokens: "per-child-hard-limit-and-atomic-reservation", cost: "pre-call-maximum-reservation-and-post-call-meter", evaluatorRuns: "atomic-reservation",
});
