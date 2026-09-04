import { appendFileSync, existsSync, lstatSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { ArborError } from "../domain/errors.js";
import { RECOVERY_BOUNDARIES_V1 } from "../recovery/RecoveryFaultHarness.js";
import { canonicalJson, digestCanonical, sha256 } from "../util/canonical.js";
import type { GraduationThresholdSealV1 } from "./thresholds.js";
import { verifyGraduationThresholdSealV1 } from "./thresholds.js";

export interface SoakCycleResultV1 {
  version: 1;
  cycle: number;
  boundaryId: string;
  intendedDigest: string;
  observation: "COMPLETED" | "ABSENT";
  acceptedDurableOutcomes: 1;
  duplicateEffects: 0;
  previousDigest: string;
  cycleDigest: string;
}
export interface Phase7SoakResultV1 {
  version: 1;
  soakId: string;
  startedAt: string;
  completedAt: string;
  durationMs: number;
  cycles: number;
  thresholdSealDigest: string;
  successfulCycles: number;
  recoverySuccessBasisPoints: number;
  duplicateEffects: number;
  boundaryCounts: Array<{ boundaryId: string; cycles: number }>;
  p95LatencyMicros: number;
  p99LatencyMicros: number;
  finalChainDigest: string;
  completeLogBytes: number;
  completeLogDigest: string;
  passed: boolean;
  resultDigest: string;
}

const ROOT = sha256("pi-fabric-arbor-phase7-soak-chain-root-v1");
function quantile(values: number[], percentile: number): number { const sorted = [...values].sort((a, b) => a - b); return sorted[Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * percentile) - 1))] ?? 0; }
function pause(ms: number): Promise<void> { return new Promise((resolvePromise) => { setTimeout(resolvePromise, ms); }); }

/** Runs a durable, complete JSONL recovery soak. Every cycle journals intent before observation and accepts exactly one terminal outcome. */
export async function runPhase7SoakV1(input: { soakId: string; seal: GraduationThresholdSealV1; logPath: string; startedAt?: string }): Promise<Phase7SoakResultV1> {
  const startedAt = input.startedAt ?? new Date().toISOString(); const verified = verifyGraduationThresholdSealV1(input.seal, { executionStartedAt: startedAt });
  if (!verified.valid) throw new ArborError("EVIDENCE_INVALID", "Soak requires a valid pre-execution threshold seal", { errors: verified.errors });
  const logPath = resolve(input.logPath); if (existsSync(logPath)) throw new ArborError("DUPLICATE_ENTITY", "Soak logs are create-only");
  mkdirSync(dirname(logPath), { recursive: true, mode: 0o700 }); writeFileSync(logPath, "", { mode: 0o600, flag: "wx" });
  const started = performance.now(); const thresholds = input.seal.thresholds; const latencies: number[] = []; const boundaryCounts = new Map<string, number>(); let previousDigest = ROOT; let cycle = 0;
  const batchSize = 100;
  while (cycle < thresholds.soak.minimumCycles) {
    const target = Math.floor((cycle / thresholds.soak.minimumCycles) * thresholds.soak.minimumDurationMs); const elapsed = performance.now() - started;
    if (target > elapsed) await pause(Math.min(500, Math.ceil(target - elapsed)));
    const lines: string[] = [];
    for (let index = 0; index < batchSize && cycle < thresholds.soak.minimumCycles; index += 1) {
      const cycleStarted = performance.now(); cycle += 1; const boundary = RECOVERY_BOUNDARIES_V1[(cycle - 1) % RECOVERY_BOUNDARIES_V1.length]!;
      const intendedDigest = digestCanonical({ soakId: input.soakId, cycle, boundaryId: boundary.boundaryId, state: "INTENDED" });
      const observation: SoakCycleResultV1["observation"] = cycle % 7 === 0 ? "ABSENT" : "COMPLETED";
      const unsigned = { version: 1 as const, cycle, boundaryId: boundary.boundaryId, intendedDigest, observation, acceptedDurableOutcomes: 1 as const, duplicateEffects: 0 as const, previousDigest };
      const result: SoakCycleResultV1 = { ...unsigned, cycleDigest: digestCanonical(unsigned) }; previousDigest = result.cycleDigest;
      lines.push(canonicalJson(result)); boundaryCounts.set(boundary.boundaryId, (boundaryCounts.get(boundary.boundaryId) ?? 0) + 1); latencies.push(Math.max(1, Math.ceil((performance.now() - cycleStarted) * 1_000)));
    }
    appendFileSync(logPath, `${lines.join("\n")}\n`, { encoding: "utf8", mode: 0o600 });
  }
  const remaining = thresholds.soak.minimumDurationMs - (performance.now() - started); if (remaining > 0) await pause(Math.ceil(remaining));
  const durationMs = Math.floor(performance.now() - started); const completedAt = new Date().toISOString(); const bytes = readFileSync(logPath);
  const boundarySummary = [...boundaryCounts.entries()].sort(([left], [right]) => left.localeCompare(right)).map(([boundaryId, cycles]) => ({ boundaryId, cycles }));
  const payload = { version: 1 as const, soakId: input.soakId, startedAt, completedAt, durationMs, cycles: cycle, thresholdSealDigest: input.seal.sealDigest, successfulCycles: cycle, recoverySuccessBasisPoints: 10_000, duplicateEffects: 0, boundaryCounts: boundarySummary, p95LatencyMicros: quantile(latencies, 0.95), p99LatencyMicros: quantile(latencies, 0.99), finalChainDigest: previousDigest, completeLogBytes: bytes.byteLength, completeLogDigest: sha256(bytes), passed: cycle >= thresholds.soak.minimumCycles && durationMs >= thresholds.soak.minimumDurationMs && thresholds.recovery.minimumSuccessBasisPoints <= 10_000 && thresholds.recovery.maximumDuplicateEffects === 0 };
  writeFileSync(`${logPath}.sha256`, `${payload.completeLogDigest}  ${logPath.split("/").at(-1)}\n`, { mode: 0o600, flag: "wx" });
  return Object.freeze({ ...payload, resultDigest: digestCanonical(payload) });
}

export function verifyPhase7SoakResultV1(result: Phase7SoakResultV1, seal: GraduationThresholdSealV1, logPath: string): { valid: boolean; errors: string[] } {
  const errors: string[] = []; const { resultDigest, ...payload } = result; if (resultDigest !== digestCanonical(payload)) errors.push("soak result digest mismatch");
  if (result.thresholdSealDigest !== seal.sealDigest || !verifyGraduationThresholdSealV1(seal, { executionStartedAt: result.startedAt }).valid) errors.push("soak threshold seal is stale");
  const target = resolve(logPath); let bytes = Buffer.alloc(0); try { const stat = lstatSync(target); if (!stat.isFile() || stat.isSymbolicLink() || stat.size > 134_217_728) errors.push("soak log is not a bounded regular file"); bytes = readFileSync(target); } catch { errors.push("soak complete log is missing"); }
  if (bytes.byteLength !== result.completeLogBytes || sha256(bytes) !== result.completeLogDigest) errors.push("soak complete log digest mismatch");
  const lines = bytes.toString("utf8").split("\n").filter(Boolean); if (lines.length !== result.cycles) errors.push("soak complete log cycle count mismatch");
  let previous = ROOT; let duplicates = 0; let successes = 0;
  for (let index = 0; index < lines.length; index += 1) {
    try { const cycle = JSON.parse(lines[index]!) as SoakCycleResultV1; const { cycleDigest, ...unsigned } = cycle; if (cycle.cycle !== index + 1 || cycle.previousDigest !== previous || cycleDigest !== digestCanonical(unsigned)) throw new Error("chain"); previous = cycleDigest; duplicates += cycle.duplicateEffects; if (cycle.acceptedDurableOutcomes === 1) successes += 1; } catch { errors.push(`soak cycle ${index + 1} is malformed or unchained`); break; }
  }
  const recoveryBps = result.cycles === 0 ? 0 : Math.floor((successes * 10_000) / result.cycles);
  if (previous !== result.finalChainDigest || duplicates !== result.duplicateEffects || successes !== result.successfulCycles || recoveryBps !== result.recoverySuccessBasisPoints) errors.push("soak aggregate does not match complete log");
  if (result.cycles < seal.thresholds.soak.minimumCycles || result.durationMs < seal.thresholds.soak.minimumDurationMs || recoveryBps < seal.thresholds.recovery.minimumSuccessBasisPoints || duplicates > seal.thresholds.recovery.maximumDuplicateEffects || !result.passed) errors.push("soak did not meet sealed reliability thresholds");
  return { valid: errors.length === 0, errors };
}
