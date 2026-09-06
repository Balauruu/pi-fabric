import { execFile } from "node:child_process";
import { readFile, realpath } from "node:fs/promises";
import { isAbsolute, join, relative } from "node:path";
import { promisify } from "node:util";
import { CONFIG_SCHEMA, canonical, digest, validate } from "./contracts.js";
import { validateDefinition, type EvaluationDefinition } from "../evaluators/contracts.js";
import { loadPreset } from "../presets/contract.js";
const exec = promisify(execFile);
export const COORDINATOR_INSTRUCTIONS = "You are Arbor's proposal-only coordinator. Choose a bounded observation hypothesis or stop from authoritative owner observations. Never approve, mutate Arbor, or dispatch. Return a silent directive with data matching the supplied closed contract. No scores are authoritative. This PR3 lane only inspects source; scored research and candidate editing are unavailable.";
export const EXECUTOR_INSTRUCTIONS = "Arbor bounded executor. Do not spawn or mutate shared Arbor state. No self-grading. Inspect only.";
export interface Config {
  material: { root: string; kind: string; mutablePaths: string[]; evaluationInputs: string[]; selectedUntracked: string[] };
  objective: { description: string; direction: "maximize" | "minimize"; unit: string; minimumGain: string; gainKind: "absolute" | "relative"; qualityVetoes: string[] };
  evaluator: { kind: string; identity: string; definition: string; heldOut: string | null; repeats: number; aggregation: string };
  roles: { coordinator: string | null; executor: string | null; subject: string | null };
  roleTools: { coordinator: string[]; executor: string[] };
  search: { maxDepth: number; maxChildren: number; concurrency: number; maxActorTurns: number; mode: string };
  limits: { attempts: number; evaluatorCalls: number; activeMs: number; artifactBytes: number; tokenCeiling: number | null; costCeiling: string | null };
  sourceRefs: string[]; preset: string | null; execution: "inspect" | "deferred" | "evaluate" | "material";
}
export interface ResolvedSpec {
  version: 2; config: Config; evaluation: EvaluationDefinition | null; origins: Record<string, string>; identity: string;
  source: { root: string; oid: string | null; materialId: string; capture: "source-reference-not-candidate-snapshot" | "owned-snapshot" };
  roles: Record<"coordinator" | "executor" | "subject", { model: string | null; origin: string; instructionsId: string | null; tools: string[]; requires: string[]; resultContract: string }>;
  enforcement: { attempts: "transactional"; evaluatorCalls: "transactional"; activeTime: "dispatch-admission"; tokens: "observational"; cost: "observational"; artifacts: "export-admission" };
}
function defaults(cwd: string): Config { return {
  material: { root: cwd, kind: "other", mutablePaths: [], evaluationInputs: [], selectedUntracked: [] },
  objective: { description: "Inspect material; choose an objective before scoring", direction: "maximize", unit: "unspecified", minimumGain: "0", gainKind: "absolute", qualityVetoes: [] },
  evaluator: { kind: "command", identity: "unconfigured", definition: "unconfigured", heldOut: null, repeats: 1, aggregation: "median" },
  roles: { coordinator: null, executor: null, subject: null },
  roleTools: { coordinator: ["fabric_exec"], executor: ["read", "grep", "find", "ls"] },
  search: { maxDepth: 3, maxChildren: 3, concurrency: 1, maxActorTurns: 8, mode: "auto" },
  limits: { attempts: 5, evaluatorCalls: 20, activeMs: 120000, artifactBytes: 16777216, tokenCeiling: null, costCeiling: null },
  sourceRefs: [], preset: null, execution: "inspect",
}; }
export async function configFile(path: string): Promise<Record<string, unknown>> {
  try { const text = await readFile(path, "utf8"); if (text.length > 65536) throw new Error(`Configuration too large: ${path}`); const value: unknown = JSON.parse(text); validate(CONFIG_SCHEMA, value); return value as Record<string, unknown>; }
  catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return {}; throw error; }
}
export async function resolveSpec(cwd: string, profile: Record<string, unknown>, project: Record<string, unknown>, overrides: Record<string, unknown>, activeModel?: string): Promise<ResolvedSpec> {
  const resolved: Record<string, any> = {}, origins: Record<string, string> = {};
  function merge(target: Record<string, any>, layer: Record<string, any>, origin: string, prefix = "") {
    for (const [key, value] of Object.entries(layer)) {
      const path = prefix ? `${prefix}.${key}` : key;
      if (value && typeof value === "object" && !Array.isArray(value)) { target[key] ??= {}; merge(target[key], value, origin, path); }
      else { target[key] = structuredClone(value); origins[path] = origin; }
    }
  }
  // Explicit null disables inheritance just like the later configuration merge.
  const presetPath = Object.hasOwn(overrides, "preset") ? overrides.preset : Object.hasOwn(project, "preset") ? project.preset : profile.preset;
  const preset = typeof presetPath === "string" ? await loadPreset(isAbsolute(presetPath) ? presetPath : join(cwd, presetPath)) : null;
  for (const [origin, layer] of [["built-in", defaults(cwd)], ...(preset ? [[`preset:${preset.id}`, preset.defaults]] as const : []), ["profile", profile], ["project", project], ["explicit", overrides]] as const) { validate(CONFIG_SCHEMA, layer); merge(resolved, layer, origin); }
  const config = resolved as Config;
  if (!isAbsolute(config.material.root)) config.material.root = join(cwd, config.material.root);
  config.material.root = await realpath(config.material.root);
  for (const field of ["mutablePaths", "evaluationInputs", "selectedUntracked"] as const) {
    for (const path of config.material[field]) if (isAbsolute(path) || path.split(/[\\/]/u).includes("..") || !relative(config.material.root, join(config.material.root, path))) throw new Error(`material.${field}: expected a relative child path`);
  }
  if (config.execution !== "material" && config.roleTools.executor.some(t => !["read", "grep", "find", "ls"].includes(t))) throw new Error("Writable executor tools require explicit material execution; inspect stays read-only");
  if (config.objective.minimumGain.startsWith("-") || config.limits.costCeiling?.startsWith("-")) throw new Error("Gain and cost ceiling must be nonnegative exact decimals");
  for (const role of ["coordinator", "executor"] as const) if (config.roles[role] === null) { config.roles[role] = activeModel ?? null; origins[`roles.${role}`] = activeModel ? "active-Pi-model" : "unknown"; }
  if (config.execution === "inspect" && (!config.roles.coordinator || !config.roles.executor)) throw new Error("Select exact available coordinator/executor models; unknown is not an executable identity");
  let oid: string | null = null;
  try { oid = (await exec("git", ["rev-parse", "HEAD"], { cwd: config.material.root, timeout: 10000, maxBuffer: 8192 })).stdout.trim(); } catch { /* non-Git configuration is supported; capture/native execution waits for PR5 */ }
  const source = { root: config.material.root, oid, materialId: `material-${digest({ root: config.material.root, oid, paths: config.material }).slice(0, 32)}`, capture: "source-reference-not-candidate-snapshot" as const };
  const roles: ResolvedSpec["roles"] = {
    coordinator: { model: config.roles.coordinator, origin: origins["roles.coordinator"]!, instructionsId: digest(COORDINATOR_INSTRUCTIONS), tools: config.roleTools.coordinator, requires: ["agents.self"], resultContract: "arbor.actor-proposal.v2" },
    executor: { model: config.roles.executor, origin: origins["roles.executor"]!, instructionsId: digest(EXECUTOR_INSTRUCTIONS), tools: config.roleTools.executor, requires: [], resultContract: "native-terminal-unscored-text" },
    subject: { model: config.roles.subject, origin: origins["roles.subject"]!, instructionsId: null, tools: [], requires: [], resultContract: "unavailable-PR4" },
  };
  let evaluation: EvaluationDefinition | null = null;
  if (config.execution === "evaluate" || config.execution === "material") {
    const path = isAbsolute(config.evaluator.definition) ? config.evaluator.definition : join(cwd, config.evaluator.definition);
    const bytes = await readFile(path, "utf8"); if (bytes.length > 65536) throw new Error("Evaluation definition exceeds bound");
    evaluation = validateDefinition(JSON.parse(bytes));
    if (config.objective.qualityVetoes.some(v => !["no-native-failures", "all-tasks-correct"].includes(v)) || (evaluation.kind !== "agent-suite" && config.objective.qualityVetoes.includes("all-tasks-correct"))) throw new Error("Unsupported selected quality veto for evaluator");
    const aggregation = evaluation.kind === "command" ? "median" : "paired-descriptive";
    if (origins["evaluator.aggregation"] !== "built-in" && config.evaluator.aggregation !== aggregation) throw new Error("Selected aggregation/analysis method is unsupported or contradicts frozen evaluation policy");
    if (origins["evaluator.repeats"] !== "built-in" && config.evaluator.repeats !== evaluation.repeats) throw new Error("Repeat policy contradicts frozen evaluation definition");
    if (origins["evaluator.identity"] !== "built-in" && config.evaluator.identity !== digest(evaluation)) throw new Error("Evaluation definition identity mismatch");
    config.evaluator.aggregation = aggregation; config.evaluator.repeats = evaluation.repeats; config.evaluator.identity = digest(evaluation);
    origins["evaluator.aggregation"] = "frozen-evaluation-definition"; origins["evaluator.repeats"] = "frozen-evaluation-definition"; origins["evaluator.identity"] = "frozen-evaluation-definition";
    if (evaluation.kind !== config.evaluator.kind || config.evaluator.heldOut !== null) throw new Error("Selected evaluator kind mismatch or held-out support not yet available (PR9)");
    if (evaluation.baseline.root !== config.material.root || evaluation.candidate.root !== config.material.root) throw new Error("PR4 exact-material pair must reference this canonical source root");
    roles.subject = { model: evaluation.subject.model, origin: "frozen-evaluation-definition", instructionsId: digest(evaluation.subject.promptFiles), tools: evaluation.subject.tools, requires: [], resultContract: "independently-graded-native-text" };
  }
  const body = { version: 2 as const, config, evaluation, origins, source, roles, enforcement: { attempts: "transactional" as const, evaluatorCalls: "transactional" as const, activeTime: "dispatch-admission" as const, tokens: "observational" as const, cost: "observational" as const, artifacts: "export-admission" as const } };
  return { ...body, identity: digest(body) };
}
export function unchangedSpec(a: ResolvedSpec, b: ResolvedSpec): boolean { return canonical(a) === canonical(b); }
