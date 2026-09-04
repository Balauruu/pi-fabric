import { ArborError } from "../domain/errors.js";
import type { RunAggregateV1 } from "../domain/types.js";
import { digestCanonical } from "../util/canonical.js";

export type RetentionOutcomeV1 = "NO_PROMOTION" | "PROMOTED" | "ROLLED_BACK" | "CANCELLED" | "FAILED" | "INDETERMINATE" | "QUARANTINED" | "PENDING";

export interface RetentionRuleV1 {
  version: 1;
  outcome: RetentionOutcomeV1;
  minimumDays: number | "indefinite";
  legalHold: "retain-until-released";
  deletionRule: string;
  retainedEvidence: readonly string[];
}

export interface RetentionClassV1 {
  version: 1;
  retentionClassId: string;
  purpose: "production" | "fixture";
  rules: readonly RetentionRuleV1[];
}

const ALWAYS = Object.freeze(["authority journal", "published report manifest", "certificate digests", "authorization audit history"]);
const standardRules: readonly RetentionRuleV1[] = Object.freeze([
  { version: 1, outcome: "NO_PROMOTION", minimumDays: 365, legalHold: "retain-until-released", deletionRule: "After 365 days, delete only reconciled package-owned workspace and scratch entries named by a verified cleanup manifest after a complete report covers every dependency.", retainedEvidence: ALWAYS },
  { version: 1, outcome: "PROMOTED", minimumDays: 2555, legalHold: "retain-until-released", deletionRule: "After 2555 days, preserve winner/predecessor journals and authorization history; delete only manifest-listed non-evidence resources after ref observation and complete reporting.", retainedEvidence: ALWAYS },
  { version: 1, outcome: "ROLLED_BACK", minimumDays: 2555, legalHold: "retain-until-released", deletionRule: "After 2555 days, preserve promotion, rollback, and re-promotion lineage; delete only reconciled manifest-listed non-evidence resources.", retainedEvidence: ALWAYS },
  { version: 1, outcome: "CANCELLED", minimumDays: 90, legalHold: "retain-until-released", deletionRule: "After 90 days and descendant cancellation confirmation, delete only manifest-listed workspace and scratch resources covered by a complete partial/final report.", retainedEvidence: ALWAYS },
  { version: 1, outcome: "FAILED", minimumDays: 365, legalHold: "retain-until-released", deletionRule: "After 365 days and effect reconciliation, delete only manifest-listed non-evidence resources covered by a complete failure report.", retainedEvidence: ALWAYS },
  { version: 1, outcome: "INDETERMINATE", minimumDays: "indefinite", legalHold: "retain-until-released", deletionRule: "Deletion is prohibited while any effect or external identity is uncertain. An administrator must resolve uncertainty into a new certified outcome before cleanup eligibility is recalculated.", retainedEvidence: ALWAYS },
  { version: 1, outcome: "QUARANTINED", minimumDays: "indefinite", legalHold: "retain-until-released", deletionRule: "Deletion is prohibited. Preserve all evidence until an independent incident decision establishes a replacement retention disposition.", retainedEvidence: ALWAYS },
  { version: 1, outcome: "PENDING", minimumDays: "indefinite", legalHold: "retain-until-released", deletionRule: "Deletion is prohibited for active, report-pending, cleanup-pending, or otherwise unsettled runs.", retainedEvidence: ALWAYS },
]);
const fixtureRules: readonly RetentionRuleV1[] = Object.freeze([
  ...(["NO_PROMOTION", "PROMOTED", "ROLLED_BACK", "CANCELLED", "FAILED"] as const).map((outcome): RetentionRuleV1 => ({ version: 1, outcome, minimumDays: 0, legalHold: "retain-until-released", deletionRule: "Fixture-only resources may be deleted immediately after effects settle and a complete report covers every dependency; retained evidence remains protected.", retainedEvidence: ALWAYS })),
  { version: 1, outcome: "INDETERMINATE", minimumDays: "indefinite", legalHold: "retain-until-released", deletionRule: "Deletion is prohibited until uncertainty is resolved.", retainedEvidence: ALWAYS },
  { version: 1, outcome: "QUARANTINED", minimumDays: "indefinite", legalHold: "retain-until-released", deletionRule: "Deletion is prohibited for quarantined fixtures.", retainedEvidence: ALWAYS },
  { version: 1, outcome: "PENDING", minimumDays: "indefinite", legalHold: "retain-until-released", deletionRule: "Deletion is prohibited while the fixture is unsettled.", retainedEvidence: ALWAYS },
]);

export const RETENTION_CLASSES_V1: readonly RetentionClassV1[] = Object.freeze([
  Object.freeze({ version: 1, retentionClassId: "retain_standard_v1", purpose: "production", rules: standardRules }),
  Object.freeze({ version: 1, retentionClassId: "retain_fixture", purpose: "fixture", rules: fixtureRules }),
]);

export interface RetentionDecisionV1 {
  version: 1;
  retentionClassId: string;
  outcome: RetentionOutcomeV1;
  legalHold: boolean;
  eligible: boolean;
  eligibleAt?: string;
  reason: string;
  ruleDigest: string;
}

export function validateRetentionClasses(classes: readonly RetentionClassV1[] = RETENTION_CLASSES_V1): string[] {
  const errors: string[] = []; const outcomes: RetentionOutcomeV1[] = ["NO_PROMOTION", "PROMOTED", "ROLLED_BACK", "CANCELLED", "FAILED", "INDETERMINATE", "QUARANTINED", "PENDING"];
  for (const policy of classes) {
    if (!/^[a-z][a-z0-9_]{2,63}$/u.test(policy.retentionClassId)) errors.push(`invalid retention class ${policy.retentionClassId}`);
    for (const outcome of outcomes) {
      const rules = policy.rules.filter((entry) => entry.outcome === outcome);
      if (rules.length !== 1) errors.push(`${policy.retentionClassId} must define exactly one ${outcome} rule`);
      const rule = rules[0];
      if (rule && rule.minimumDays !== "indefinite" && (!Number.isSafeInteger(rule.minimumDays) || rule.minimumDays < 0 || rule.minimumDays > 36_500)) errors.push(`${policy.retentionClassId}/${outcome} has an invalid duration`);
      if (!rule?.deletionRule || rule.retainedEvidence.length === 0) errors.push(`${policy.retentionClassId}/${outcome} has an incomplete deletion rule`);
    }
  }
  return errors;
}

export function retentionDecision(run: Pick<RunAggregateV1, "contract" | "outcome" | "updatedAt">, now: string, legalHold = false): RetentionDecisionV1 {
  const retentionClassId = run.contract.retentionClass;
  const policy = RETENTION_CLASSES_V1.find((entry) => entry.retentionClassId === retentionClassId);
  if (!policy) throw new ArborError("VALIDATION_FAILED", "No release retention policy exists for the admitted retention class");
  const outcome: RetentionOutcomeV1 = run.outcome ?? "PENDING";
  const rule = policy.rules.find((entry) => entry.outcome === outcome)!;
  const ruleDigest = digestCanonical(rule);
  if (legalHold) return { version: 1, retentionClassId, outcome, legalHold: true, eligible: false, reason: "Legal hold overrides every duration and deletion rule.", ruleDigest };
  if (rule.minimumDays === "indefinite") return { version: 1, retentionClassId, outcome, legalHold: false, eligible: false, reason: rule.deletionRule, ruleDigest };
  const eligibleAt = new Date(Date.parse(run.updatedAt) + rule.minimumDays * 86_400_000).toISOString();
  const eligible = Date.parse(now) >= Date.parse(eligibleAt);
  return { version: 1, retentionClassId, outcome, legalHold: false, eligible, eligibleAt, reason: eligible ? rule.deletionRule : `Minimum retention remains in force until ${eligibleAt}.`, ruleDigest };
}

export const RETENTION_POLICY_DIGEST_V1 = digestCanonical(RETENTION_CLASSES_V1);
