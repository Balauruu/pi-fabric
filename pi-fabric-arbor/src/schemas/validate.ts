import { Buffer } from "node:buffer";
import { ArborError } from "../domain/errors.js";
import { assertNonnegativeExact, compareCanonicalDecimals, parseCanonicalDecimal } from "../domain/decimal.js";
import type { ArborContractV1, GateAnswerV1, GateV1 } from "../domain/types.js";
import type { JsonSchema } from "./catalog.js";

export interface ValidationIssue {
  path: string;
  message: string;
}

function same(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

export function validateJsonSchema(schema: JsonSchema, value: unknown): ValidationIssue[] {
  const root = schema;
  const issues: ValidationIssue[] = [];

  const visit = (current: JsonSchema, item: unknown, path: string): void => {
    if (typeof current.$ref === "string") {
      const match = /^#\/\$defs\/([^/]+)$/.exec(current.$ref);
      const defs = root.$defs as Record<string, JsonSchema> | undefined;
      const target = match?.[1] === undefined ? undefined : defs?.[match[1]];
      if (!target) {
        issues.push({ path, message: `Unresolved schema reference ${current.$ref}` });
        return;
      }
      visit(target, item, path);
      return;
    }
    if (Array.isArray(current.oneOf)) {
      const matches = (current.oneOf as JsonSchema[]).filter((candidate) => {
        const candidateIssues: ValidationIssue[] = [];
        const previous = issues.splice(0, issues.length);
        visit(candidate, item, path);
        candidateIssues.push(...issues.splice(0, issues.length));
        issues.push(...previous);
        return candidateIssues.length === 0;
      }).length;
      if (matches !== 1) issues.push({ path, message: `Expected exactly one matching variant, received ${matches}` });
      return;
    }
    if (Object.hasOwn(current, "const") && !same(item, current.const)) {
      issues.push({ path, message: `Expected constant ${JSON.stringify(current.const)}` });
      return;
    }
    if (Array.isArray(current.enum) && !(current.enum as unknown[]).some((entry) => same(entry, item))) {
      issues.push({ path, message: "Value is not in the closed enum" });
      return;
    }

    if (current.type === "object") {
      if (item === null || typeof item !== "object" || Array.isArray(item)) {
        issues.push({ path, message: "Expected object" });
        return;
      }
      const record = item as Record<string, unknown>;
      const properties = (current.properties ?? {}) as Record<string, JsonSchema>;
      const propertyCount = Object.keys(record).length;
      if (typeof current.minProperties === "number" && propertyCount < current.minProperties) issues.push({ path, message: `Expected at least ${current.minProperties} properties` });
      if (typeof current.maxProperties === "number" && propertyCount > current.maxProperties) issues.push({ path, message: `Expected at most ${current.maxProperties} properties` });
      for (const required of (current.required ?? []) as string[]) {
        if (!Object.hasOwn(record, required)) issues.push({ path: `${path}.${required}`, message: "Required property is missing" });
      }
      if (current.additionalProperties === false) {
        for (const key of Object.keys(record)) {
          if (!Object.hasOwn(properties, key)) issues.push({ path: `${path}.${key}`, message: "Unknown property" });
        }
      }
      for (const [key, child] of Object.entries(properties)) {
        if (Object.hasOwn(record, key)) visit(child, record[key], `${path}.${key}`);
      }
      return;
    }

    if (current.type === "array") {
      if (!Array.isArray(item)) {
        issues.push({ path, message: "Expected array" });
        return;
      }
      if (typeof current.minItems === "number" && item.length < current.minItems) issues.push({ path, message: `Expected at least ${current.minItems} items` });
      if (typeof current.maxItems === "number" && item.length > current.maxItems) issues.push({ path, message: `Expected at most ${current.maxItems} items` });
      if (current.uniqueItems === true && new Set(item.map((entry) => JSON.stringify(entry))).size !== item.length) issues.push({ path, message: "Expected unique items" });
      if (current.items && typeof current.items === "object") item.forEach((entry, index) => visit(current.items as JsonSchema, entry, `${path}[${index}]`));
      return;
    }

    if (current.type === "string") {
      if (typeof item !== "string") {
        issues.push({ path, message: "Expected string" });
        return;
      }
      const length = [...item].length;
      if (typeof current.minLength === "number" && length < current.minLength) issues.push({ path, message: `Expected at least ${current.minLength} code points` });
      if (typeof current.maxLength === "number" && length > current.maxLength) issues.push({ path, message: `Expected at most ${current.maxLength} code points` });
      if (typeof current.pattern === "string" && !new RegExp(current.pattern, "u").test(item)) issues.push({ path, message: "String does not match required format" });
      return;
    }

    if (current.type === "integer") {
      if (typeof item !== "number" || !Number.isSafeInteger(item)) {
        issues.push({ path, message: "Expected safe integer" });
        return;
      }
      if (typeof current.minimum === "number" && item < current.minimum) issues.push({ path, message: `Expected >= ${current.minimum}` });
      if (typeof current.maximum === "number" && item > current.maximum) issues.push({ path, message: `Expected <= ${current.maximum}` });
      return;
    }
    if (current.type === "boolean" && typeof item !== "boolean") issues.push({ path, message: "Expected boolean" });
  };

  visit(schema, value, "$");
  return issues;
}

export function assertJsonSchema(schema: JsonSchema, value: unknown, label = "value"): void {
  const issues = validateJsonSchema(schema, value);
  if (issues.length > 0) throw new ArborError("VALIDATION_FAILED", `${label} failed schema validation`, { issues: issues.slice(0, 32) });
}

function validateRelative(value: string, glob: boolean): void {
  if (Buffer.byteLength(value, "utf8") > 512) throw new ArborError("VALIDATION_FAILED", "Relative path exceeds 512 UTF-8 bytes");
  if (value.startsWith("/") || value.includes("\\") || value.includes("\0") || value.split("/").some((part) => part === "" || part === "." || part === "..")) {
    throw new ArborError("VALIDATION_FAILED", `Unsafe relative ${glob ? "glob" : "path"}`);
  }
  if (/^[A-Za-z]:/.test(value) || /^[A-Za-z][A-Za-z0-9+.-]*:/.test(value)) throw new ArborError("VALIDATION_FAILED", "Drive and URI prefixes are prohibited");
  if (glob) {
    if (/[{}!()[\]]/.test(value) || /[+*@?!]\(/.test(value)) throw new ArborError("VALIDATION_FAILED", "Glob uses an uncertified construct");
    const wildcardTokens = value.match(/\*+|\?/g)?.length ?? 0;
    if (wildcardTokens > 32) throw new ArborError("VALIDATION_FAILED", "Glob has more than 32 wildcard tokens");
  }
}

export function matchesRelativeGlob(path: string, glob: string): boolean {
  validateRelative(path, false);
  validateRelative(glob, true);
  let pattern = "^";
  for (let index = 0; index < glob.length; index += 1) {
    const character = glob[index]!;
    if (character === "*" && glob[index + 1] === "*") { pattern += ".*"; index += 1; }
    else if (character === "*") pattern += "[^/]*";
    else if (character === "?") pattern += "[^/]";
    else pattern += character.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }
  return new RegExp(`${pattern}$`, "u").test(path);
}

export interface AdministratorAdmissions {
  repositoryIds?: ReadonlySet<string>;
  evaluatorIds?: ReadonlySet<string>;
  parserVersions?: ReadonlySet<string>;
  retentionClasses?: ReadonlySet<string>;
  toolIds?: ReadonlySet<string>;
  credentialAliases?: ReadonlySet<string>;
}

function assertAdmitted(values: readonly string[], admitted: ReadonlySet<string> | undefined, label: string): void {
  if (!admitted) return;
  const unknown = values.filter((value) => !admitted.has(value));
  if (unknown.length > 0) throw new ArborError("VALIDATION_FAILED", `Unknown administrator-admitted ${label}`, { ids: unknown });
}

export function assertContractSemantics(contract: ArborContractV1, admissions: AdministratorAdmissions = {}): void {
  const metric = contract.metric;
  assertNonnegativeExact(metric.minimumImprovement, metric.quantum, "minimumImprovement");
  assertNonnegativeExact(metric.nondeterminismTolerance, metric.quantum, "nondeterminismTolerance");
  if (metric.aggregation === "single" && metric.trialCount !== 1) throw new ArborError("VALIDATION_FAILED", "single aggregation requires trialCount 1");
  if (metric.aggregation === "median" && (metric.trialCount < 3 || metric.trialCount > 99 || metric.trialCount % 2 !== 1)) {
    throw new ArborError("VALIDATION_FAILED", "median aggregation requires odd trialCount from 3 through 99");
  }
  const budget = contract.budgets;
  if (budget.maxConcurrentAttempts > budget.maxAttempts) throw new ArborError("VALIDATION_FAILED", "maxConcurrentAttempts exceeds maxAttempts");
  const reserve = budget.finalizationReserve;
  const pairs: Array<[number | undefined, number | undefined, string]> = [
    [reserve.attempts, budget.maxAttempts, "attempts"], [reserve.agentCalls, budget.maxAgentCalls, "agentCalls"],
    [reserve.evaluatorRuns, budget.evaluatorRuns, "evaluatorRuns"], [reserve.wallTimeMs, budget.wallTimeMs, "wallTimeMs"],
    [reserve.tokens, budget.tokenLimit, "tokens"],
  ];
  for (const [part, total, name] of pairs) if (part !== undefined && (total === undefined || part > total)) throw new ArborError("VALIDATION_FAILED", `Finalization reserve ${name} exceeds total`);
  if (budget.costLimit !== undefined && parseCanonicalDecimal(budget.costLimit).coefficient < 0n) throw new ArborError("VALIDATION_FAILED", "costLimit must be nonnegative");
  if (reserve.cost !== undefined) {
    if (budget.costLimit === undefined) throw new ArborError("VALIDATION_FAILED", "Finalization reserve cost requires costLimit");
    if (parseCanonicalDecimal(reserve.cost).coefficient < 0n || parseCanonicalDecimal(budget.costLimit).coefficient < 0n) throw new ArborError("VALIDATION_FAILED", "Cost limits must be nonnegative");
    if (compareCanonicalDecimals(reserve.cost, budget.costLimit) > 0) throw new ArborError("VALIDATION_FAILED", "Finalization reserve cost exceeds total");
  }
  for (const path of contract.paths.requiredOutputs) validateRelative(path, false);
  for (const pattern of [...contract.paths.editable, ...contract.paths.protected]) validateRelative(pattern, true);
  const uniqueLists: Array<[readonly string[], string]> = [
    [contract.paths.editable, "editable paths"], [contract.paths.protected, "protected paths"],
    [contract.paths.requiredOutputs, "required outputs"], [contract.permissions.tools, "tools"],
    [contract.permissions.credentialAliases, "credential aliases"],
  ];
  for (const [values, label] of uniqueLists) if (new Set(values).size !== values.length) throw new ArborError("VALIDATION_FAILED", `Duplicate ${label}`);
  assertAdmitted([contract.repository.repositoryId], admissions.repositoryIds, "repository ID");
  assertAdmitted([contract.evaluation.development, contract.evaluation.heldOut], admissions.evaluatorIds, "evaluator ID");
  assertAdmitted([contract.evaluation.parserVersion], admissions.parserVersions, "parser version");
  assertAdmitted([contract.retentionClass], admissions.retentionClasses, "retention class");
  assertAdmitted(contract.permissions.tools, admissions.toolIds, "tool ID");
  assertAdmitted(contract.permissions.credentialAliases, admissions.credentialAliases, "credential alias");
}

export function assertGateAnswer(gate: GateV1, answer: GateAnswerV1, now: string): void {
  if (gate.state !== "OPEN") throw new ArborError("ILLEGAL_TRANSITION", "Gate is not open");
  if (Date.parse(now) >= Date.parse(gate.expiresAt)) throw new ArborError("VALIDATION_FAILED", "Gate answer is expired");
  if (answer.gateId !== gate.gateId || answer.kind !== gate.answerKind) throw new ArborError("VALIDATION_FAILED", "Gate answer identity or kind mismatch");
  const values = answer.kind === "singleChoice" ? [answer.optionId] : answer.kind === "multiChoice" ? answer.optionIds : [];
  if (values.some((value) => !gate.optionIds.includes(value))) throw new ArborError("VALIDATION_FAILED", "Gate answer contains an unknown option");
  if (answer.kind === "boundedText" && /(?:path|command|score|ref|credential|policy)/iu.test(answer.value)) {
    throw new ArborError("VALIDATION_FAILED", "Bounded text cannot expand paths, commands, scores, refs, credentials, or policy");
  }
}
