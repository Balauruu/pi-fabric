import { splitDefinition, splitOf, validationEvidence } from "../evaluators/validation.js";
import { canonical, digest } from "../research/contracts.js";
import { parseMetric, units } from "../evaluators/measurement.js";
import { nativeSuccess, type EvaluationRecord } from "../evaluators/contracts.js";
import type { ResearchRun } from "../research/ResearchStore.js";
export interface GainPolicy { direction: "maximize" | "minimize"; minimumGain: string; gainKind: "absolute" | "relative" }
export function practicalGain(incumbent: string, candidate: string, policy: GainPolicy): string {
  return rationalGain(units(incumbent), units(candidate), 1n, policy);
}
function rationalGain(a: bigint, b: bigint, count: bigint, policy: GainPolicy): string {
  const threshold = units(policy.minimumGain);
  if (threshold < 0n) throw new Error("Practical threshold must be nonnegative");
  const gain = (b - a) * (policy.direction === "maximize" ? 1n : -1n);
  if (gain <= 0n) return "no-gain";
  if (policy.gainKind === "absolute") return gain >= threshold * count ? "eligible" : "below-practical-threshold";
  if (a === 0n) return "inconclusive-zero-denominator";
  return gain * 1000000000n >= (a < 0n ? -a : a) * threshold ? "eligible" : "below-practical-threshold";
}
/** Deterministic descriptive policy, not statistical superiority. Recheck via a new accounted evaluation; no scalar can override inconclusive. */
export function acceptance(run: ResearchRun, e: EvaluationRecord, candidateOid: string, verification = false): string {
  const m = run.material; const { identity, ...body } = run.spec;
  if (identity !== digest(body)) return "changed-resolved-spec";
  if (!m || e.state !== "completed" || e.validity !== "valid" || !e.quality.passed || e.epoch !== run.epoch || e.specId !== run.spec.identity || e.ownerBinding !== digest(run.owner) || e.definitionId !== digest(e.definition)) return "invalid-exact-evidence";
  for (const condition of ["baseline", "candidate"] as const) { const s = e.snapshots[condition], d = e.definition[condition]; if (s.root !== d.root || s.oid !== d.oid || s.format !== d.format || canonical(s.files) !== canonical(d.files)) return "snapshot-definition-mismatch"; }
  if (e.snapshots.baseline.oid !== m.incumbent || e.snapshots.candidate.oid !== candidateOid || e.snapshots.baseline.root !== m.capture.repository || e.snapshots.candidate.root !== m.capture.repository) return "stale-incumbent-or-candidate-remeasure";
  const expected = splitDefinition(run.spec, splitOf(e));
  if ((!verification && splitOf(e) !== "development") || !expected) return "wrong-evidence-split";
  if (canonical({ ...e.definition, baseline: expected.baseline, candidate: expected.candidate }) !== canonical(expected)) return "changed-evaluation-policy";
  if (e.invocations.length === 0 || e.invocations.some(i => i.state !== "ingested" || !i.valid || i.score === null || !i.native || i.native.id !== i.nativeId || i.native.cwd !== e.snapshots[i.condition].directory || !nativeSuccess(i.native, e.definition.kind === "command" ? e.definition.command!.checks.length : undefined) || i.snapshotId !== e.snapshots[i.condition].id)) return "invalid-native-execution";
  if (e.definition.kind === "command") for (const i of e.invocations) if (i.score !== parseMetric(i.native!.text, e.definition.command!.unit) || e.definition.command!.unit !== run.spec.config.objective.unit) return "metric-unit-or-parser-mismatch";
  // analyze() is presentation only. Never round repeat/task means for decisions.
  let a = 0n, b = 0n, count = 0n, losses = 0;
  for (const task of e.definition.tasks) {
    const pair: bigint[] = [];
    for (const condition of ["baseline", "candidate"] as const) {
      const values: bigint[] = [];
      for (let repeat = 0; repeat < e.definition.repeats; repeat++) {
        const last = e.invocations.filter(i => i.condition === condition && i.taskId === task.id && i.repeat === repeat && i.purpose !== "judge").at(-1);
        if (!last?.valid || last.score === null) return "invalid-task-outcomes";
        values.push(units(last.score));
      }
      if (!values.length) return "invalid-task-outcomes";
      // Preserve declared command medians; suite repeats form exact task means.
      values.sort((a, b) => a < b ? -1 : a > b ? 1 : 0);
      pair.push(e.definition.kind === "command" ? values[Math.floor(values.length / 2)]! : values.reduce((sum, n) => sum + n, 0n));
    }
    a += pair[0]!; b += pair[1]!; count += e.definition.kind === "command" ? 1n : BigInt(e.definition.repeats);
    if ((pair[1]! - pair[0]!) * (run.spec.config.objective.direction === "maximize" ? 1n : -1n) < 0n) losses++;
  }
  if (!count) return "invalid-task-outcomes";
  const practical = rationalGain(a, b, count, run.spec.config.objective);
  const nonRegression = verification && run.spec.validation?.criterion === "non-regression";
  if (nonRegression ? (b-a)*(run.spec.config.objective.direction === "maximize" ? 1n : -1n)<0n : practical !== "eligible") return practical;
  const gain = (b - a) * (run.spec.config.objective.direction === "maximize" ? 1n : -1n);
  if (e.definition.kind === "command") {
    for (const condition of ["baseline", "candidate"] as const) {
      const scores = e.invocations.filter(i => i.condition === condition).map(i => units(i.score!)).sort((a, b) => a < b ? -1 : a > b ? 1 : 0);
      if ((scores.at(-1)! - scores[0]!) > 0n && (scores.at(-1)! - scores[0]!) * count >= gain) return "inconclusive-noise-recheck-required";
    }
  } else if (losses > 0) return "inconclusive-mixed-paired-tasks";
  return "eligible";
}
export function promotionGate(run:ResearchRun,e:EvaluationRecord,target:string,records:EvaluationRecord[]):string {
 const dev=acceptance(run,e,target);if(dev!=='eligible')return dev;
 const v=run.spec.validation;if(!v)return 'eligible';
 const required=v.policy==='final'?'final':'held-out';
 const check=(split:'held-out'|'final')=>{const held=validationEvidence(records,e,split);return held?acceptance(run,held,target,true):'missing-evidence';};
 const result=check(required);if(result!=='eligible')return `${required}-veto:${result}`;
 if(records.some(r=>splitOf(r)==='final')){const final=check('final');if(final!=='eligible')return `final-veto:${final}`;}
 return 'eligible';
}
