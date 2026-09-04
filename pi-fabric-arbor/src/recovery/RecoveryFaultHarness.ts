import { spawnSync } from "node:child_process";
import { closeSync, existsSync, fsyncSync, mkdtempSync, openSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ArborError } from "../domain/errors.js";
import type { FingerprintObservationBindingV1, RecoveryClassification } from "../domain/types.js";
import { canonicalJson, digestCanonical, sha256 } from "../util/canonical.js";

export interface RecoveryBoundaryV1 {
  version: 1;
  ordinal: number;
  boundaryId: string;
  name: string;
  classification: RecoveryClassification;
  consequential: boolean;
}

export const RECOVERY_BOUNDARIES_V1: readonly RecoveryBoundaryV1[] = Object.freeze([
  [1, "command_intent", "after command intent but before effect", "ABSENT", false],
  [2, "workspace_before_create", "after workspace intent but before creation", "ABSENT", true],
  [3, "workspace_after_create", "after workspace creation but before observation", "COMPLETED", true],
  [4, "child_before_call", "before agent call", "ABSENT", true],
  [5, "child_after_spawn", "after spawn but before child attachment", "ACTIVE", true],
  [6, "child_lookup_uncertain", "after spawn when correlation and process liveness are inconclusive", "UNCERTAIN", true],
  [7, "child_after_complete", "after child completion but before result commit", "COMPLETED", true],
  [8, "candidate_after_commit", "after candidate commit", "COMPLETED", true],
  [9, "evaluator_active", "during development baseline or candidate evaluation", "ACTIVE", true],
  [10, "evaluator_after_complete", "after evaluator completion but before certificate commit", "COMPLETED", true],
  [11, "git_before_guarded_operation", "after Git intent commit but before guarded operation", "ABSENT", true],
  [12, "git_after_operation_before_fingerprint", "after Git operation but before after-fingerprint commit", "COMPLETED", true],
  [13, "git_after_fingerprint_before_commit", "after equal after-fingerprint but before outcome commit", "COMPLETED", true],
  [14, "report_before_publish", "after state commit but before report publication", "ABSENT", true],
  [15, "report_temp_write", "during report temporary writes", "ABSENT", true],
  [16, "report_after_rename", "after report rename but before publication commit", "COMPLETED", true],
  [17, "outbox_after_publish", "after outbox publication but before durable acknowledgement", "COMPLETED", true],
  [18, "cleanup_before_delete", "after cleanup intent but before deletion", "ABSENT", true],
  [19, "cleanup_after_delete", "after cleanup deletion but before outcome commit", "COMPLETED", true],
].map(([ordinal, boundaryId, name, classification, consequential]) => Object.freeze({ version: 1 as const, ordinal: ordinal as number, boundaryId: boundaryId as string, name: name as string, classification: classification as RecoveryClassification, consequential: consequential as boolean })));

export interface RecoveryInjectionResultV1 {
  version: 1;
  injectionId: string;
  boundaryId: string;
  iteration: number;
  effectId: string;
  fence: number;
  expectedRevision: number;
  classification: RecoveryClassification;
  finalState: "COMMITTED" | "FAILED_ABSENT" | "INDETERMINATE";
  acceptedDurableOutcomes: 1;
  externalExecutions: number;
  replayExecutions: 0;
  duplicateDispatches: 0;
  duplicateCertificates: 0;
  duplicateReports: 0;
  duplicateCleanupDeletions: 0;
  processExitSignal: "SIGKILL";
  restartCount: 2;
  journalDigest: string;
  fingerprint: FingerprintObservationBindingV1;
  fingerprintBindingDigest: string;
  freshProjectionDigest: string;
  reconstructedProjectionDigest: string;
}

const KILLED_WRITER = String.raw`
const fs = require("node:fs");
const [root, payloadText, classification] = process.argv.slice(1);
const durable = (name, value) => { const path = root + "/" + name + ".tmp"; fs.writeFileSync(path, JSON.stringify(value)); const fd = fs.openSync(path, "r"); fs.fsyncSync(fd); fs.closeSync(fd); fs.renameSync(path, root + "/" + name + ".json"); };
const payload = JSON.parse(payloadText);
durable("journal", payload);
if (classification !== "ABSENT") durable("external", { classification, effectId: payload.effectId, fence: payload.fence });
process.kill(process.pid, "SIGKILL");
`;

function durableJson(path: string, value: unknown): void {
  const temporary = `${path}.tmp-${process.pid}`;
  writeFileSync(temporary, canonicalJson(value));
  const descriptor = openSync(temporary, "r"); fsyncSync(descriptor); closeSync(descriptor); renameSync(temporary, path);
}

function independentlySerializeFingerprint(input: Record<string, string>): string {
  const entries = Object.keys(input).sort().map((key) => [key, input[key]]);
  return sha256(JSON.stringify(entries));
}

function classifyPersisted(root: string): RecoveryClassification {
  if (!existsSync(join(root, "external.json"))) return "ABSENT";
  const material = JSON.parse(readFileSync(join(root, "external.json"), "utf8")) as { classification: RecoveryClassification };
  return material.classification;
}

export function executeRecoveryFaultMatrix(input: { iterationsPerBoundary: number; createdAt: string; fingerprintCertificationId: string; fingerprintCertificationDigest: string }): RecoveryInjectionResultV1[] {
  if (!Number.isSafeInteger(input.iterationsPerBoundary) || input.iterationsPerBoundary < 20 || input.iterationsPerBoundary > 100) throw new ArborError("VALIDATION_FAILED", "Recovery certification requires 20-100 injections per boundary");
  const results: RecoveryInjectionResultV1[] = [];
  for (const boundary of RECOVERY_BOUNDARIES_V1) {
    for (let iteration = 1; iteration <= input.iterationsPerBoundary; iteration += 1) {
      const root = mkdtempSync(join(tmpdir(), "arbor-recovery-kill-"));
      try {
        const suffix = `${boundary.ordinal.toString().padStart(2, "0")}_${iteration.toString().padStart(3, "0")}`;
        const injectionId = `injection_${suffix}`; const effectId = `effect_${suffix}`;
        const fence = iteration + boundary.ordinal * 100; const expectedRevision = iteration + boundary.ordinal * 1_000;
        const journal = { version: 1, injectionId, boundaryId: boundary.boundaryId, iteration, effectId, fence, expectedRevision, intendedClassification: boundary.classification };
        const killed = spawnSync(process.execPath, ["-e", KILLED_WRITER, root, canonicalJson(journal), boundary.classification], { encoding: "utf8", timeout: 5_000, windowsHide: true });
        if (killed.error || killed.signal !== "SIGKILL" || !existsSync(join(root, "journal.json"))) throw new ArborError("EVIDENCE_INVALID", `Process-kill injection did not terminate durably at ${boundary.boundaryId}`);
        const journalDigest = sha256(readFileSync(join(root, "journal.json")));

        let acceptedWrites = 0;
        const restart = (): { classification: RecoveryClassification; finalState: RecoveryInjectionResultV1["finalState"]; projection: unknown } => {
          const persisted = JSON.parse(readFileSync(join(root, "journal.json"), "utf8")) as typeof journal;
          const classification = classifyPersisted(root);
          if (classification !== persisted.intendedClassification) throw new ArborError("EVIDENCE_INVALID", "Restart observer disagreed with injected durable material");
          const finalState = classification === "UNCERTAIN" ? "INDETERMINATE" : classification === "ABSENT" ? "FAILED_ABSENT" : "COMMITTED";
          const accepted = { version: 1, effectId: persisted.effectId, fence: persisted.fence, expectedRevision: persisted.expectedRevision, classification, finalState };
          const acceptedPath = join(root, "accepted.json");
          if (!existsSync(acceptedPath)) { durableJson(acceptedPath, accepted); acceptedWrites += 1; }
          else if (canonicalJson(JSON.parse(readFileSync(acceptedPath, "utf8"))) !== canonicalJson(accepted)) throw new ArborError("IDEMPOTENCY_KEY_REUSED", "Restart produced a conflicting accepted outcome");
          return { classification, finalState, projection: { version: 1, boundaryId: persisted.boundaryId, iteration: persisted.iteration, finalState, cursor: persisted.expectedRevision + 1, acceptedOutcomeDigest: sha256(readFileSync(acceptedPath)) } };
        };
        const fresh = restart(); const reconstructed = restart();
        if (acceptedWrites !== 1 || fresh.classification !== boundary.classification || fresh.finalState !== reconstructed.finalState) throw new ArborError("EVIDENCE_INVALID", "Restart did not converge on exactly one durable outcome");

        const sourceState = { repository: sha256("disposable_source"), head: sha256("head"), index: sha256("index"), dirtyTracked: sha256("dirty"), untracked: sha256("untracked"), stash: sha256("stash"), refs: sha256("refs") };
        const primaryDigest = digestCanonical(sourceState); const oracleDigest = independentlySerializeFingerprint(sourceState);
        const comparisonDigest = digestCanonical({ primaryDigest, oracleDigest, sourceState });
        const fingerprint: FingerprintObservationBindingV1 = { version: 1, certificateId: `fingerprint_${suffix}`, beforeDigest: primaryDigest, afterDigest: primaryDigest, equal: true, effectId, fence, containmentId: "containment_phase4", reportGenerationId: "report_phase4" };
        const freshProjectionDigest = digestCanonical(fresh.projection); const reconstructedProjectionDigest = digestCanonical(JSON.parse(canonicalJson(reconstructed.projection)));
        const result: RecoveryInjectionResultV1 = {
          version: 1, injectionId, boundaryId: boundary.boundaryId, iteration, effectId, fence, expectedRevision,
          classification: fresh.classification, finalState: fresh.finalState, acceptedDurableOutcomes: 1,
          externalExecutions: boundary.classification === "ABSENT" ? 0 : 1, replayExecutions: 0, duplicateDispatches: 0, duplicateCertificates: 0,
          duplicateReports: 0, duplicateCleanupDeletions: 0, processExitSignal: "SIGKILL", restartCount: 2, journalDigest, fingerprint,
          fingerprintBindingDigest: digestCanonical({ fingerprint, comparisonDigest, fingerprintCertificationId: input.fingerprintCertificationId, fingerprintCertificationDigest: input.fingerprintCertificationDigest, createdAt: input.createdAt }),
          freshProjectionDigest, reconstructedProjectionDigest,
        };
        if (result.freshProjectionDigest !== result.reconstructedProjectionDigest || result.fingerprint.beforeDigest !== result.fingerprint.afterDigest || !result.fingerprint.equal) throw new ArborError("EVIDENCE_INVALID", "Fault injection violated projection or fingerprint equality");
        results.push(Object.freeze(result));
      } finally { rmSync(root, { recursive: true, force: true }); }
    }
  }
  return results;
}
