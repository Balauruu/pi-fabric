/*
 * Capability-bound Pi Fabric guest runner for one fabric_exec stage invocation.
 *
 * Pass exactly one named string: strings.request = JSON matching
 * schemas/workflow-request.schema.json. Direct agents.run calls are bounded
 * below because workflow token budgets do not account for them. Fabric's
 * configured call ceiling remains an independent fail-closed limit. The bound
 * runtime receipt and call plan must never exceed the effective 100-call cap.
 *
 * Packet records and schemas remain authoritative. Benchmark inputs and agent
 * request settings are never discovered dynamically; a returned Fabric logFile
 * is read only as bounded runtime evidence. Audit with dry_run=true performs no
 * agent call and writes only temporary validation input under /tmp.
 */

type JsonObject = { [key: string]: any };
type Route = "Design" | "Execute" | "Audit" | "Analyze";
type Stage = "design" | "execute" | "prepare" | "judge" | "adjudicate" | "finalize" | "audit";
type TypedStatus = { status: string; qualifiers: string[] };
type Runner = "pi" | "claude" | "veda";
type Transport = "auto" | "process" | "tmux" | "screen" | "localterm" | "herdr";
type Thinking = "off" | "minimal" | "low" | "medium" | "high" | "xhigh" | "max";
type AgentRunRequest = {
  task: string;
  name?: string;
  runner?: Runner;
  transport?: Transport;
  model?: string;
  thinking?: Thinking;
  tools?: string[];
  timeoutMs?: number;
  extensions?: boolean;
  recursive?: boolean;
  cwd?: string;
  worktree?: boolean;
  schema?: JsonObject;
};

type ArtifactBinding = { path: string; sha256: string };
type DeltaSealReference = {
  seal_type: "design" | "execution" | "raw-freeze" | "postscore" | "analysis";
  revision: string;
  manifest_path: string;
  manifest_sha256: string;
};
type WorkflowRequest = {
  schema_version: 1;
  request_id: string;
  benchmark_id: string;
  route: Route;
  stage: Stage;
  packet_path: string;
  design_revision: string | null;
  execution_revision: string | null;
  analysis_revision: string | null;
  wave_id: string | null;
  requested_runtime: string | null;
  requested_model: string | null;
  runtime_capability_binding: ArtifactBinding | null;
  protected_state_binding: ArtifactBinding | null;
  budget_ledger_binding: ArtifactBinding | null;
  call_plan_binding: ArtifactBinding | null;
  delta_seal_references: DeltaSealReference[];
  dry_run: boolean;
  max_agents: number;
  max_concurrency: number;
};

type RuntimeCapabilities = {
  schema_version: number;
  mechanics_version: string;
  status: "passed";
  capability_id: string;
  pi_version: string;
  fabric_version: string;
  effective_max_calls: number;
  max_concurrency: number;
  recursive_agents: boolean;
  recursive_custom_cwd: boolean;
  absolute_log_roots: string[];
  telemetry_projection_version: string;
  actor_mesh_default_root: string;
  actor_mesh_root_env: string;
  temporary_log_pattern: string;
  output_bounds: {
    max_output_chars: number;
    max_nested_result_chars: number;
    max_failure_model_output_chars: number;
    execution_details_max_bytes: number;
    execution_trace_max_bytes: number;
  };
  event_log_bounds: { max_event_line_chars: number; max_stderr_chars: number };
  supported_agent_request_fields: string[];
  supported_agent_result_fields: string[];
};

type CallPlan = {
  schema_version: number;
  plan_id: string;
  benchmark_id: string;
  stage: Stage;
  call_ids: string[];
  max_calls: number;
  max_concurrency: number;
  reserved_descendant_calls: number;
  reserved_calls: number;
  predecessor_checkpoint_path: string | null;
};

type ScheduleRow = {
  schema_version: 1;
  benchmark_id: string;
  schedule_revision: string;
  attempt_id: string;
  task_id: string;
  condition_id: string;
  repetition: number;
  block: number;
  order_position: number;
  wave: number;
  worker_slot: number;
  retry_of: string | null;
};

type AttemptOutcome = {
  attempt_id: string;
  status: "terminal" | "not-assigned" | "ambiguous";
  terminal_path?: string;
  error?: string;
};

type GateResult = {
  command: string;
  ok: boolean;
  exit_code: number | null;
  output: string;
  error: string | null;
};

type SealBinding = {
  type: "design" | "execution" | "raw-freeze";
  revision: string;
  manifest_path: string;
  manifest_sha256: string;
  verification: JsonObject;
};

type PreparedAttempt = {
  row: ScheduleRow;
  task: JsonObject;
  condition: JsonObject;
  request: AgentRunRequest;
  design: SealBinding;
  execution: SealBinding;
};

type GradingJob = {
  blind: JsonObject;
  grader: JsonObject;
  item: JsonObject;
  itemPath: string;
  targetStage: "judge" | "adjudicate";
  adjudication: {
    planRevision: string;
    attemptId: string;
    taskId: string;
  } | null;
  request: AgentRunRequest;
  base: string;
  design: SealBinding;
  execution: SealBinding;
};

const SKILL_ROOT = "/home/balauru/.pi-profiles/fabric/skills/agent-benchmarking";
const FABRIC_ROOT = "/home/balauru/.pi-profiles/fabric/npm/node_modules/pi-fabric";
const PI_ROOT = "/home/balauru/.local/share/pi-node/node-v22.23.1-linux-x64/lib/node_modules/@earendil-works/pi-coding-agent";
const VALIDATED_PI_VERSION = "0.84.4";
const VALIDATED_FABRIC_VERSION = "0.77.0";
const EXPECTED_OUTPUT_BOUNDS = {
  execution_details_max_bytes: 524288,
  execution_trace_max_bytes: 524288,
  max_failure_model_output_chars: 20000,
  max_nested_result_chars: 2000000,
  max_output_chars: 50000,
};
const EXPECTED_EVENT_LOG_BOUNDS = { max_event_line_chars: 4194304, max_stderr_chars: 20000 };
const EXPECTED_AGENT_REQUEST_FIELDS = [
  "task", "name", "runner", "transport", "model", "persona", "thinking", "tools", "timeoutMs",
  "extensions", "recursive", "cwd", "worktree", "schema", "prompt", "instructions", "timeout_ms", "residency",
];
const EXPECTED_AGENT_RESULT_FIELDS = [
  "id", "name", "status", "runner", "transport", "cwd", "model", "thinking", "actorId", "actorName",
  "sessionId", "runnerSessionId", "attachCommand", "branch", "worktree", "text", "value", "error", "logFile",
  "residency", "task", "startedAt", "finishedAt", "turns", "toolCalls", "usage", "pendingMessages",
];
// The pinned runtime enforces an effective per-execution ceiling of 100.
// Keep the coordinator ceiling at or below it even if a caller/runtime advertises more.
const EFFECTIVE_MAX_AGENT_CALLS = 100;
const HARD_MAX_CONCURRENCY = 32;
const HARD_MAX_SCHEDULE_ROWS = 10000;
const HARD_MAX_TEXT_CHARS = 500000;
const MAX_READ_PAGES = 512;
const READ_LINES_PER_PAGE = 200;
const ID = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;
const SAFE_PATH = /^(?!\/)(?!.*(?:^|\/)\.\.(?:\/|$))(?!.*(?:^|\/)\.(?:\/|$))[A-Za-z0-9._\/-]+$/;
const STATUS_TOKEN = /^[a-z][a-z0-9-]{0,63}$/;
const STAGE_RECEIPT_STATUSES = ["complete", "checkpoint", "blocked", "failed", "unsupported"] as const;

let scratchPath: string | null = null;
let scratchCleaned = false;
let request: WorkflowRequest | null = null;
let agentCalls = 0;
let measuredAgentCalls = 0;
let graderAgentCalls = 0;
let supportAgentCalls = 0;
let stageSequence = 0;
let installedRuntimeCapabilities: RuntimeCapabilities | null = null;
let runtimeCapabilities: RuntimeCapabilities | null = null;
let protectedState: JsonObject | null = null;
let budgetLedger: JsonObject | null = null;
let budgetReservations = new Map<string, JsonObject>();
let callPlan: CallPlan | null = null;
let plannedCallIds = new Set<string>();
let assignedWorkIds = new Set<string>();
let completedWorkIds = new Set<string>();
function initialReceipt(): JsonObject {
  return {
    schema_version: 1,
    ...typedStatus("failed"),
    route: null,
    stage: null,
    request_id: null,
    agent_calls: 0,
    measured_agent_calls: 0,
    grader_agent_calls: 0,
    support_agent_calls: 0,
    evidence: [],
    completed_work_ids: [],
    unstarted_work_ids: [],
    ambiguous_work_ids: [],
    safe_next_action: null,
    blockers: [],
  };
}

let receipt: JsonObject = initialReceipt();

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function now(): string {
  return new Date().toISOString();
}

function shell(value: string): string {
  return `'${value.replace(/'/g, `'"'"'`)}'`;
}

function assert(condition: unknown, text: string): asserts condition {
  if (!condition) throw new Error(text);
}

function typedStatus(status: string, qualifiers: readonly string[] = []): TypedStatus {
  assert(typeof status === "string" && STATUS_TOKEN.test(status), `invalid typed status: ${String(status)}`);
  assert(Array.isArray(qualifiers) && qualifiers.every((value) => typeof value === "string" && STATUS_TOKEN.test(value)),
    `invalid qualifiers for status ${status}`);
  assert(new Set(qualifiers).size === qualifiers.length, `duplicate qualifiers for status ${status}`);
  return { status, qualifiers: [...qualifiers] };
}

function parseTypedStatus(value: unknown, label: string, allowed: readonly string[]): TypedStatus {
  assert(value !== null && typeof value === "object" && !Array.isArray(value), `${label} must be an object`);
  const record = value as JsonObject;
  const parsed = typedStatus(record.status, record.qualifiers);
  assert(allowed.includes(parsed.status), `${label} has unsupported status ${parsed.status}`);
  return parsed;
}

function unsupported(condition: unknown, text: string): asserts condition {
  if (!condition) throw new Error(`UNSUPPORTED: ${text}`);
}

function assertSafePath(value: unknown, label: string): asserts value is string {
  assert(typeof value === "string" && value.length > 0, `${label} must be a non-empty string`);
  assert(value.length <= 512 && SAFE_PATH.test(value), `${label} is not a safe relative path`);
  assert(!value.includes("//") && !value.endsWith("/"), `${label} is not canonical`);
}

function assertId(value: unknown, label: string): asserts value is string {
  assert(typeof value === "string" && ID.test(value), `${label} is not a valid ID`);
}

function parseRunner(value: unknown, label: string): Runner {
  assert(value === "pi" || value === "claude" || value === "veda", `${label} is not a supported runner`);
  return value;
}

function parseTransport(value: unknown, label: string): Transport {
  assert(value === "auto" || value === "process" || value === "tmux" || value === "screen" ||
    value === "localterm" || value === "herdr", `${label} is not a supported transport`);
  return value;
}

function parseThinking(value: unknown, label: string): Thinking | undefined {
  if (value === undefined || value === null) return undefined;
  assert(value === "off" || value === "minimal" || value === "low" || value === "medium" ||
    value === "high" || value === "xhigh" || value === "max", `${label} is not a supported thinking level`);
  return value;
}

function parseTools(value: unknown, label: string): string[] {
  assert(Array.isArray(value) && value.length <= 32 && value.every((tool) => typeof tool === "string" && tool.length > 0),
    `${label} must be at most 32 non-empty tool names`);
  return [...value];
}

function fabricTimestamp(value: unknown): string | null {
  if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
    const converted = new Date(value);
    return Number.isFinite(converted.getTime()) ? converted.toISOString() : null;
  }
  if (typeof value === "string" && value.length > 0) {
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? new Date(parsed).toISOString() : null;
  }
  return null;
}

function join(root: string, relative: string): string {
  assertSafePath(relative, "relative path");
  return `${root}/${relative}`;
}

function parseRequest(raw: string): WorkflowRequest {
  assert(typeof raw === "string" && raw.length > 0, "π.request is required");
  assert(raw.length <= 100000, "π.request exceeds 100000 characters");
  const value = JSON.parse(raw) as JsonObject;
  assert(value && typeof value === "object" && !Array.isArray(value), "request must be an object");
  assert(value.schema_version === 1, "request schema_version must be 1");
  assertId(value.request_id, "request_id");
  assertId(value.benchmark_id, "benchmark_id");
  assert(["Design", "Execute", "Audit", "Analyze"].includes(value.route), "route is invalid");
  assert(["design", "execute", "prepare", "judge", "adjudicate", "finalize", "audit"].includes(value.stage), "stage is invalid");
  const routeStages: { [key: string]: Stage[] } = {
    Design: ["design"], Execute: ["execute"], Audit: ["audit"], Analyze: ["prepare", "judge", "adjudicate", "finalize"],
  };
  assert(routeStages[String(value.route)].includes(value.stage), `stage ${String(value.stage)} is invalid for route ${String(value.route)}`);
  assertSafePath(value.packet_path, "packet_path");
  assert(typeof value.dry_run === "boolean", "dry_run must be boolean");
  assert(Number.isInteger(value.max_agents) && value.max_agents >= 1 && value.max_agents <= EFFECTIVE_MAX_AGENT_CALLS,
    `max_agents must be from 1 through ${EFFECTIVE_MAX_AGENT_CALLS}`);
  assert(Number.isInteger(value.max_concurrency) && value.max_concurrency >= 1 && value.max_concurrency <= HARD_MAX_CONCURRENCY,
    `max_concurrency must be from 1 through ${HARD_MAX_CONCURRENCY}`);
  assert(value.max_concurrency <= value.max_agents, "max_concurrency cannot exceed max_agents");
  for (const key of ["design_revision", "execution_revision", "analysis_revision", "wave_id", "requested_runtime", "requested_model"]) {
    assert(value[key] === null || (typeof value[key] === "string" && value[key].length > 0), `${key} is invalid`);
  }
  for (const key of ["runtime_capability_binding", "protected_state_binding", "budget_ledger_binding", "call_plan_binding"]) {
    const binding = value[key];
    assert(binding === null || (binding && typeof binding === "object" && !Array.isArray(binding)), `${key} is invalid`);
    if (binding !== null) {
      assertSafePath(binding.path, `${key}.path`);
      assert(typeof binding.sha256 === "string" && /^[0-9a-f]{64}$/.test(binding.sha256), `${key}.sha256 is invalid`);
    }
  }
  assert(Array.isArray(value.delta_seal_references), "delta_seal_references must be an array");
  for (const [index, reference] of value.delta_seal_references.entries()) {
    assert(reference && typeof reference === "object" && !Array.isArray(reference), `delta_seal_references[${index}] is invalid`);
    assert(["design", "execution", "raw-freeze", "postscore", "analysis"].includes(reference.seal_type),
      `delta_seal_references[${index}].seal_type is invalid`);
    assertSafePath(reference.manifest_path, `delta_seal_references[${index}].manifest_path`);
    assert(typeof reference.manifest_sha256 === "string" && /^[0-9a-f]{64}$/.test(reference.manifest_sha256),
      `delta_seal_references[${index}].manifest_sha256 is invalid`);
  }
  if (value.design_revision !== null) assert(/^design-v[1-9][0-9]*$/.test(value.design_revision), "design_revision is invalid");
  if (value.execution_revision !== null) assert(/^execution-v[1-9][0-9]*$/.test(value.execution_revision), "execution_revision is invalid");
  if (value.analysis_revision !== null) assert(/^analysis-v[1-9][0-9]*$/.test(value.analysis_revision), "analysis_revision is invalid");
  if (value.route === "Analyze") assert(value.analysis_revision !== null, "Analyze requires analysis_revision");
  return value as WorkflowRequest;
}

async function bash(command: string): Promise<GateResult> {
  const result = await pi.bash({ command, settle: true });
  return {
    command,
    ok: result.ok,
    exit_code: result.ok ? 0 : (typeof result.exitCode === "number" ? result.exitCode : null),
    output: typeof result.output === "string" ? result.output : "",
    error: result.ok ? null : (typeof result.error === "string" ? result.error : "command failed"),
  };
}

async function requireGate(command: string, label: string): Promise<GateResult> {
  const result = await bash(command);
  if (!result.ok) throw new Error(`${label} failed: ${result.error ?? result.output}`);
  return result;
}

async function rejectSymlinkComponents(path: string): Promise<void> {
  const probe = await bash(
    `p=${shell(path)}; case "$p" in /*) ;; *) p="$PWD/$p" ;; esac; ` +
    `while [ "$p" != / ]; do if [ -L "$p" ]; then exit 3; fi; ` +
    `p=\${p%/*}; [ -n "$p" ] || p=/; done`,
  );
  if (!probe.ok) throw new Error(`${path} has a symlink path component`);
}

async function fileState(path: string): Promise<"file" | "missing"> {
  await rejectSymlinkComponents(path);
  const result = await bash(
    `if [ -f ${shell(path)} ]; then exit 0; elif [ -e ${shell(path)} ]; then exit 4; else exit 1; fi`,
  );
  if (result.ok) return "file";
  if (result.exit_code === 1) return "missing";
  throw new Error(`${path} is not a regular file`);
}

async function directoryRequired(path: string): Promise<void> {
  await rejectSymlinkComponents(path);
  await requireGate(`test -d ${shell(path)}`, `safe directory ${path}`);
}

async function readRequired(path: string): Promise<string> {
  assert(await fileState(path) === "file", `required file is missing: ${path}`);
  const metadata = await requireGate(
    `python -B -c ${shell("import json,sys; p=sys.argv[1]; b=open(p,'rb').read(500001); " +
      "assert len(b)<=500000, 'file exceeds byte bound'; s=b.decode('utf-8'); " +
      "print(json.dumps({'bytes':len(b),'lines':(0 if not s else s.count('\\n') + (0 if s.endswith('\\n') else 1))}))")} ${shell(path)}`,
    `bounded UTF-8 probe ${path}`,
  );
  const info = JSON.parse(metadata.output) as JsonObject;
  assert(Number.isInteger(info.bytes) && info.bytes >= 0 && info.bytes <= HARD_MAX_TEXT_CHARS, `invalid byte count for ${path}`);
  assert(Number.isInteger(info.lines) && info.lines >= 0 && info.lines <= MAX_READ_PAGES * READ_LINES_PER_PAGE,
    `file exceeds paged line bound: ${path}`);
  let text = "";
  let offset = 1;
  for (let page = 0; page < Math.ceil(info.lines / READ_LINES_PER_PAGE); page += 1) {
    const chunk = await pi.read({ path, offset, limit: READ_LINES_PER_PAGE });
    text += chunk;
    offset += READ_LINES_PER_PAGE;
    assert(text.length <= HARD_MAX_TEXT_CHARS, `file exceeds guest character bound: ${path}`);
  }
  assert(scratchPath !== null, "scratch directory is unavailable for exact-read verification");
  const copy = await stage(`read-${String(Math.abs(hashCode(path)))}.txt`, text);
  await requireGate(`cmp -s -- ${shell(path)} ${shell(copy)}`, `verify exact paged read ${path}`);
  return text;
}

async function readJson(path: string): Promise<JsonObject> {
  const text = await readRequired(path);
  const value = JSON.parse(text) as JsonObject;
  assert(value && typeof value === "object" && !Array.isArray(value), `${path} must contain one JSON object`);
  return value;
}

async function readJsonl(path: string): Promise<JsonObject[]> {
  const text = await readRequired(path);
  const lines = text.split("\n").filter((line) => line.trim().length > 0);
  assert(lines.length > 0, `${path} is empty`);
  assert(lines.length <= HARD_MAX_SCHEDULE_ROWS, `${path} exceeds ${HARD_MAX_SCHEDULE_ROWS} rows`);
  return lines.map((line, index) => {
    try {
      const value = JSON.parse(line) as JsonObject;
      assert(value && typeof value === "object" && !Array.isArray(value), `row ${index + 1} is not an object`);
      return value;
    } catch (error) {
      throw new Error(`${path}:${index + 1}: ${message(error)}`);
    }
  });
}

function sortedJsonValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map((item) => sortedJsonValue(item));
  if (value && typeof value === "object") {
    const source = value as JsonObject;
    const target: JsonObject = {};
    for (const key of Object.keys(source).sort()) {
      if (source[key] !== undefined) target[key] = sortedJsonValue(source[key]);
    }
    return target;
  }
  assert(typeof value !== "number" || Number.isFinite(value), "JSON contains a non-finite number");
  return value;
}

function json(value: unknown): string {
  return `${JSON.stringify(sortedJsonValue(value))}\n`;
}

function jsonl(values: unknown[]): string {
  if (values.length === 0) return "";
  return values.map((value) => JSON.stringify(sortedJsonValue(value))).join("\n") + "\n";
}

function serialized(value: unknown, mode: "json" | "jsonl" | "bytes"): string {
  if (mode === "bytes") return String(value);
  if (mode === "jsonl") {
    assert(Array.isArray(value), "JSONL publication requires an array of rows");
    return jsonl(value);
  }
  return json(value);
}

async function ensureParent(root: string, relative: string): Promise<void> {
  assertSafePath(relative, "output path");
  const slash = relative.lastIndexOf("/");
  if (slash < 0) return;
  const parent = relative.slice(0, slash);
  const parts = parent.split("/");
  const commands: string[] = [];
  for (let index = 0; index < parts.length; index += 1) {
    const current = join(root, parts.slice(0, index + 1).join("/"));
    commands.push(
      `if [ -L ${shell(current)} ]; then exit 3; ` +
      `elif [ -d ${shell(current)} ]; then :; ` +
      `elif [ -e ${shell(current)} ]; then exit 4; ` +
      `else mkdir -- ${shell(current)}; fi`,
    );
  }
  await requireGate(commands.join(" && "), `create safe output parent ${parent}`);
}

async function stage(name: string, content: string): Promise<string> {
  assert(scratchPath !== null, "scratch directory is unavailable");
  assertId(name.replace(/\.[A-Za-z0-9]+$/, ""), "scratch name");
  stageSequence += 1;
  const path = `${scratchPath}/${String(stageSequence).padStart(6, "0")}-${name}`;
  await pi.write({ path, content });
  return path;
}

async function publishPrimitive(root: string, relative: string, value: unknown, mode: "json" | "jsonl" | "bytes" = "json"): Promise<void> {
  await ensureParent(root, relative);
  const suffix = mode === "jsonl" ? ".jsonl" : mode === "json" ? ".json" : ".bin";
  const staged = await stage(`stage-${String(Math.abs(hashCode(relative)))}${suffix}`, serialized(value, mode));
  const flag = mode === "json" ? "--json" : mode === "jsonl" ? "--jsonl" : "";
  await requireGate(
    `python -B ${shell(`${SKILL_ROOT}/scripts/write_once.py`)} --root ${shell(root)} ${flag} ${shell(relative)} < ${shell(staged)}`,
    `write-once ${relative}`,
  );
}

function hashCode(value: string): number {
  let result = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    result ^= value.charCodeAt(index);
    result = Math.imul(result, 16777619);
  }
  return result | 0;
}

async function publishOrVerifyPrimitive(
  root: string,
  relative: string,
  value: unknown,
  mode: "json" | "jsonl" | "bytes",
): Promise<void> {
  const path = join(root, relative);
  const content = serialized(value, mode);
  if (await fileState(path) === "missing") {
    await publishPrimitive(root, relative, value, mode);
    return;
  }
  const suffix = mode === "jsonl" ? ".jsonl" : mode === "json" ? ".json" : ".bin";
  const staged = await stage(`compare-${String(Math.abs(hashCode(relative)))}${suffix}`, content);
  await requireGate(`cmp -s -- ${shell(path)} ${shell(staged)}`, `verify existing canonical bytes for ${relative}`);
}

/* @include ./artifact_store.ts */

const artifactStore = createArtifactStore({
  assertCondition: assert,
  assertSafePath,
  shell,
  join,
  ensureParent,
  fileState,
  rejectSymlinkComponents,
  runGate: requireGate,
  publishPrimitive,
  publishOrVerifyPrimitive,
  writeOncePath: `${SKILL_ROOT}/scripts/write_once.py`,
  deepStagePath: `${SKILL_ROOT}/scripts/deep_stage.py`,
});

async function artifactDescriptor(root: string, relative: string): Promise<JsonObject> {
  const path = join(root, relative);
  const bytes = await requireGate(`stat -c %s -- ${shell(path)}`, `size ${relative}`);
  const size = Number(bytes.output.trim());
  assert(Number.isInteger(size) && size >= 0, `invalid byte size for ${relative}`);
  return { path: relative, sha256: await sha256File(path, relative), bytes: size };
}

async function validateContract(root: string, schema: string, relative: string, isJsonl = false): Promise<GateResult> {
  assertSafePath(relative, "contract path");
  return requireGate(
    `python -B ${shell(`${SKILL_ROOT}/scripts/validate_contracts.py`)} --schema ${shell(schema)} ` +
    `${isJsonl ? "--jsonl " : ""}${shell(join(root, relative))}`,
    `validate ${relative}`,
  );
}

async function verifySeal(root: string, revision: string, type: "design" | "execution" | "raw-freeze"): Promise<JsonObject> {
  const relative = `seals/${revision}`;
  await directoryRequired(join(root, relative));
  const gate = await requireGate(
    `python -B ${shell(`${SKILL_ROOT}/scripts/verify_seal.py`)} verify --root ${shell(root)} --seal ${shell(relative)}`,
    `verify ${type} seal`,
  );
  const parsed = JSON.parse(gate.output) as JsonObject;
  assert(parsed.status === "passed" && parsed.revision === revision, `${type} seal did not pass for ${revision}`);
  return parsed;
}

async function sha256File(path: string, label: string): Promise<string> {
  assert(await fileState(path) === "file", `${label} is missing`);
  const digestGate = await requireGate(`sha256sum -- ${shell(path)}`, `hash ${label}`);
  const digest = digestGate.output.trim().split(/\s+/)[0];
  assert(/^[0-9a-f]{64}$/.test(digest), `${label} hash is invalid`);
  return digest;
}

async function loadBoundJson(root: string, binding: ArtifactBinding, label: string): Promise<JsonObject> {
  const path = join(root, binding.path);
  const actual = await sha256File(path, label);
  assert(actual === binding.sha256, `${label} digest does not match request binding`);
  return readJson(path);
}

async function inspectInstalledRuntime(): Promise<RuntimeCapabilities> {
  const gate = await requireGate(
    `python -B ${shell(`${SKILL_ROOT}/scripts/deep_stage.py`)} doctor ` +
    `--fabric-root ${shell(FABRIC_ROOT)} --pi-root ${shell(PI_ROOT)} --max-concurrency ${HARD_MAX_CONCURRENCY}`,
    "installed runtime capability doctor",
  );
  const capability = JSON.parse(gate.output) as unknown as RuntimeCapabilities;
  unsupported(capability && capability.schema_version === 1 && capability.status === "passed",
    "installed runtime doctor returned no passing capability receipt");
  unsupported(capability.pi_version === VALIDATED_PI_VERSION,
    `Pi ${String(capability.pi_version)} differs from validated ${VALIDATED_PI_VERSION}`);
  unsupported(capability.fabric_version === VALIDATED_FABRIC_VERSION,
    `Pi Fabric ${String(capability.fabric_version)} differs from validated ${VALIDATED_FABRIC_VERSION}`);
  unsupported(capability.effective_max_calls === EFFECTIVE_MAX_AGENT_CALLS,
    `effective call cap ${String(capability.effective_max_calls)} differs from validated ${EFFECTIVE_MAX_AGENT_CALLS}`);
  unsupported(capability.recursive_agents === true && capability.recursive_custom_cwd === false,
    "installed recursive-agent cwd behavior is unsupported");
  unsupported(Array.isArray(capability.absolute_log_roots) && capability.absolute_log_roots.includes("/tmp/pi-fabric-runs-*"),
    "installed native log root is unsupported");
  unsupported(capability.actor_mesh_default_root === ".pi/fabric/mesh" && capability.actor_mesh_root_env === "PI_FABRIC_MESH_ROOT",
    "installed actor mesh contract is unsupported");
  unsupported(json(capability.output_bounds) === json(EXPECTED_OUTPUT_BOUNDS),
    "installed Fabric output bounds differ from the validated contract");
  unsupported(json(capability.event_log_bounds) === json(EXPECTED_EVENT_LOG_BOUNDS),
    "installed Fabric event/log bounds differ from the validated contract");
  unsupported(json(capability.supported_agent_request_fields) === json(EXPECTED_AGENT_REQUEST_FIELDS),
    "installed agents.run request fields differ from the validated contract");
  unsupported(json(capability.supported_agent_result_fields) === json(EXPECTED_AGENT_RESULT_FIELDS),
    "installed agents.run result fields differ from the validated contract");
  return capability;
}

async function validateBoundArtifact(root: string, binding: ArtifactBinding, schema: string, label: string): Promise<JsonObject> {
  await validateContract(root, schema, binding.path);
  return loadBoundJson(root, binding, label);
}

async function loadStageBindings(root: string, req: WorkflowRequest): Promise<void> {
  assert(installedRuntimeCapabilities !== null, "installed runtime doctor was not executed");
  runtimeCapabilities = installedRuntimeCapabilities;
  if (req.runtime_capability_binding !== null) {
    const capability = await validateBoundArtifact(root, req.runtime_capability_binding, "runtime-capability", "runtime capability") as unknown as RuntimeCapabilities;
    assert(capability.capability_id === installedRuntimeCapabilities.capability_id &&
      capability.pi_version === installedRuntimeCapabilities.pi_version &&
      capability.fabric_version === installedRuntimeCapabilities.fabric_version &&
      capability.effective_max_calls === installedRuntimeCapabilities.effective_max_calls &&
      capability.recursive_custom_cwd === installedRuntimeCapabilities.recursive_custom_cwd &&
      capability.temporary_log_pattern === installedRuntimeCapabilities.temporary_log_pattern &&
      json(capability.absolute_log_roots) === json(installedRuntimeCapabilities.absolute_log_roots) &&
      json(capability.output_bounds) === json(installedRuntimeCapabilities.output_bounds) &&
      json(capability.event_log_bounds) === json(installedRuntimeCapabilities.event_log_bounds) &&
      json(capability.supported_agent_request_fields) === json(installedRuntimeCapabilities.supported_agent_request_fields) &&
      json(capability.supported_agent_result_fields) === json(installedRuntimeCapabilities.supported_agent_result_fields),
      "bound runtime capability differs from the installed-byte doctor");
    runtimeCapabilities = capability;
  }

  const launchGated = req.route === "Execute" || req.route === "Analyze" || (req.route === "Audit" && !req.dry_run);
  if (launchGated) {
    assert(req.runtime_capability_binding !== null, `${req.stage} requires runtime_capability_binding`);
    assert(req.protected_state_binding !== null, `${req.stage} requires protected_state_binding`);
    assert(req.budget_ledger_binding !== null, `${req.stage} requires budget_ledger_binding`);
  }

  if (req.protected_state_binding !== null) {
    const state = await validateBoundArtifact(root, req.protected_state_binding, "protected-state", "protected state");
    assert(state.schema_version === 1 && state.status === "compatible" &&
      state.capability_id === runtimeCapabilities.capability_id && Array.isArray(state.conflicts) && state.conflicts.length === 0,
      "protected-state compatibility gate did not pass for the bound runtime");
    assert(typeof state.project_root === "string" && state.project_root.startsWith("/"),
      "protected-state project root is not absolute");
    const canonicalRootGate = await requireGate(`realpath -- ${shell(root)}`, "resolve packet project root");
    const canonicalRoot = canonicalRootGate.output.trim();
    assert(canonicalRoot === state.project_root || canonicalRoot.startsWith(`${state.project_root}/`),
      "protected-state project root does not contain the packet");
    protectedState = state;
  }

  if (req.budget_ledger_binding !== null) {
    const ledger = await validateBoundArtifact(root, req.budget_ledger_binding, "budget-ledger", "global budget ledger");
    const reservations = ledger.reservations;
    assert(ledger.schema_version === 1 && ledger.status === "reserved" && ledger.launch_allowed === true &&
      Number.isInteger(ledger.maximum_calls) && Number.isInteger(ledger.reserved_calls) &&
      ledger.reserved_calls <= ledger.maximum_calls && Array.isArray(reservations),
      "global budget ledger is not launchable");
    let direct = 0;
    let descendants = 0;
    const seen = new Set<string>();
    for (const reservation of reservations as JsonObject[]) {
      assert(reservation && typeof reservation === "object" && typeof reservation.reservation_id === "string" &&
        !seen.has(reservation.reservation_id) && reservation.direct_calls === 1 &&
        Number.isInteger(reservation.declared_descendant_calls) && reservation.declared_descendant_calls >= 0 &&
        reservation.reserved_calls === reservation.direct_calls + reservation.declared_descendant_calls,
        "global budget reservations must be unique per direct run and include declared descendants");
      seen.add(reservation.reservation_id);
      direct += reservation.direct_calls;
      descendants += reservation.declared_descendant_calls;
      budgetReservations.set(reservation.reservation_id, reservation);
    }
    assert(direct === ledger.reserved_direct_calls && descendants === ledger.reserved_descendant_calls &&
      direct + descendants === ledger.reserved_calls, "global budget ledger totals do not reconcile");
    budgetLedger = ledger;
  }

  if (req.stage === "design") {
    assert(req.call_plan_binding === null, "design is zero-call and must not bind a call plan");
    return;
  }
  if (req.stage === "prepare" || req.stage === "finalize" || (req.stage === "audit" && req.dry_run)) {
    assert(req.call_plan_binding === null, `${req.stage} is zero-call and must not bind a call plan`);
    return;
  }
  assert(req.call_plan_binding !== null, `${req.stage} requires call_plan_binding`);
  const plan = await validateBoundArtifact(root, req.call_plan_binding, "call-plan", "call plan") as unknown as CallPlan;
  assert(plan && plan.schema_version === 1 && plan.benchmark_id === req.benchmark_id && plan.stage === req.stage &&
    typeof plan.plan_id === "string" && ID.test(plan.plan_id), "call plan benchmark/stage identity is stale");
  assert(Array.isArray(plan.call_ids) && new Set(plan.call_ids).size === plan.call_ids.length &&
    plan.call_ids.every((id) => typeof id === "string" && ID.test(id)), "call plan IDs are invalid or duplicated");
  assert(Number.isInteger(plan.max_calls) && plan.max_calls >= 1 && plan.max_calls <= runtimeCapabilities.effective_max_calls &&
    plan.max_calls <= req.max_agents, "call plan exceeds the effective invocation cap");
  assert(Number.isInteger(plan.max_concurrency) && plan.max_concurrency >= 1 &&
    plan.max_concurrency <= runtimeCapabilities.max_concurrency && plan.max_concurrency <= req.max_concurrency,
    "call plan concurrency exceeds a bound capability");
  assert(Number.isInteger(plan.reserved_descendant_calls) && plan.reserved_descendant_calls >= 0 &&
    plan.reserved_calls === plan.call_ids.length + plan.reserved_descendant_calls && plan.reserved_calls <= runtimeCapabilities.effective_max_calls,
    "call plan direct plus descendant reservations exceed the effective cap");
  assert(plan.call_ids.length === plan.max_calls, "call plan call count does not reconcile");
  assert(budgetLedger !== null && plan.call_ids.every((id) => budgetReservations.has(id)),
    "call plan contains an ID absent from the global budget ledger");
  if (plan.predecessor_checkpoint_path !== null) {
    assertSafePath(plan.predecessor_checkpoint_path, "call plan predecessor checkpoint");
    assert(await fileState(join(root, plan.predecessor_checkpoint_path)) === "file", "bound predecessor checkpoint is missing");
  }
  callPlan = plan;
  plannedCallIds = new Set(plan.call_ids);
}

async function verifyDeltaSealReferences(root: string, req: WorkflowRequest): Promise<void> {
  const seen = new Set<string>();
  for (const reference of req.delta_seal_references) {
    const key = `${reference.seal_type}/${reference.revision}`;
    assert(!seen.has(key), `duplicate delta seal reference ${key}`);
    seen.add(key);
    assert(reference.manifest_path.endsWith(`/${reference.revision}/manifest.json`) ||
      reference.manifest_path === `seals/${reference.revision}/manifest.json`, `delta seal manifest path is not revision-qualified: ${key}`);
    assert(await sha256File(join(root, reference.manifest_path), `delta seal ${key}`) === reference.manifest_sha256,
      `delta seal reference changed: ${key}`);
  }
}

async function sealBinding(
  root: string,
  revision: string,
  type: "design" | "execution" | "raw-freeze",
): Promise<SealBinding> {
  const verification = await verifySeal(root, revision, type);
  const manifest_path = `seals/${revision}/manifest.json`;
  const manifest_sha256 = await sha256File(join(root, manifest_path), `${type} manifest`);
  return { type, revision, manifest_path, manifest_sha256, verification };
}

async function publishSealReceipt(root: string, binding: SealBinding): Promise<string> {
  const current = await sealBinding(root, binding.revision, binding.type);
  assert(current.manifest_sha256 === binding.manifest_sha256, `${binding.type} seal changed after binding`);
  const relative = `seal-receipts/${binding.type}-${binding.revision}.json`;
  const value = {
    schema_version: 1,
    ok: true,
    seal_type: binding.type,
    revision: binding.revision,
    manifest_path: binding.manifest_path,
    manifest_sha256: binding.manifest_sha256,
    verified_at: now(),
  };
  if (await fileState(join(root, relative)) === "missing") {
    await artifactStore.publish(root, relative, value);
  } else {
    const existing = await readJson(join(root, relative));
    assert(existing.ok === true && existing.seal_type === binding.type && existing.revision === binding.revision &&
      existing.manifest_path === binding.manifest_path && existing.manifest_sha256 === binding.manifest_sha256,
      `${relative} disagrees with the active revision-qualified seal`);
  }
  return relative;
}

function requirePassedGates(gates: JsonObject): void {
  for (const name of ["condition_smoke", "full_pipeline", "grader_certification", "fresh_state", "model_attribution",
    "effective_timeout", "scheduler", "supervisor_failure", "resume", "target_concurrency", "template_typecheck", "audit_dry_run"]) {
    assert(gates[name] === "passed", `required preflight gate ${name} did not pass`);
  }
  const mechanism = gates.mechanism as JsonObject;
  assert(mechanism && typeof mechanism.required === "boolean", "mechanism preflight gate is incomplete");
  assert(typeof mechanism.predicate === "string" && mechanism.predicate.length > 0, "mechanism predicate is missing");
  assert(Number.isInteger(mechanism.observed) && mechanism.observed >= 0 &&
    Number.isInteger(mechanism.minimum) && mechanism.minimum >= 0, "mechanism counts are invalid");
  assert(mechanism.required !== true || (mechanism.status === "passed" && mechanism.observed >= mechanism.minimum),
    "required mechanism preflight did not pass");
}

function validatePreflight(
  preflight: JsonObject,
  req: WorkflowRequest,
  design: SealBinding,
  execution: SealBinding,
): JsonObject {
  assert(preflight.schema_version === 1 && preflight.benchmark_id === req.benchmark_id, "preflight benchmark identity is invalid");
  assert(preflight.design_revision === design.revision && preflight.design_manifest === design.manifest_path &&
    preflight.design_manifest_sha256 === design.manifest_sha256, "preflight design seal binding is stale or incomplete");
  assert(preflight.execution_revision === execution.revision && preflight.execution_manifest === execution.manifest_path &&
    preflight.execution_manifest_sha256 === execution.manifest_sha256, "preflight execution seal binding is stale or incomplete");
  assert(preflight.requested_runtime === req.requested_runtime && preflight.requested_model === req.requested_model,
    "preflight runtime/model binding is stale or incomplete");
  assert(preflight.max_agents === req.max_agents && preflight.max_concurrency === req.max_concurrency,
    "preflight agent/concurrency ceilings do not match this invocation");
  assert(preflight.scored_attempts_started === 0 && preflight.decision === "start-scored",
    "preflight receipt does not authorize a fresh scored launch");
  const gates = preflight.gates as JsonObject;
  assert(gates && typeof gates === "object" && !Array.isArray(gates), "preflight gates are missing");
  requirePassedGates(gates);
  return gates;
}

async function validateSchemas(): Promise<void> {
  await requireGate(
    `python -B ${shell(`${SKILL_ROOT}/scripts/validate_contracts.py`)} --all-schemas`,
    "schema gate",
  );
}

function parseSchedule(values: JsonObject[], benchmarkId: string): ScheduleRow[] {
  const seen = new Set<string>();
  return values.map((value, index) => {
    assert(value.schema_version === 1 && value.benchmark_id === benchmarkId, `schedule row ${index + 1} has wrong benchmark identity`);
    assertId(value.attempt_id, `schedule row ${index + 1} attempt_id`);
    assertId(value.task_id, `schedule row ${index + 1} task_id`);
    assertId(value.condition_id, `schedule row ${index + 1} condition_id`);
    assert(!seen.has(value.attempt_id), `duplicate attempt_id ${value.attempt_id}`);
    seen.add(value.attempt_id);
    assert(Number.isInteger(value.wave) && value.wave >= 1, `schedule row ${index + 1} wave is invalid`);
    return value as ScheduleRow;
  });
}

async function loadSchedule(root: string, benchmarkId: string): Promise<ScheduleRow[]> {
  await validateContract(root, "schedule-row", "schedule.jsonl", true);
  return parseSchedule(await readJsonl(join(root, "schedule.jsonl")), benchmarkId);
}

async function boundedMap<T, U>(items: T[], concurrency: number, worker: (item: T) => Promise<U>): Promise<U[]> {
  if (items.length === 0) return [];
  const results: U[] = [];
  for (let offset = 0; offset < items.length; offset += concurrency) {
    const batch = items.slice(offset, offset + concurrency);
    const settled = await workflow.parallel(
      batch.map((item) => async () => worker(item)),
      { concurrency: Math.min(concurrency, batch.length) },
    );
    results.push(...settled);
  }
  return results;
}

async function captureReturnedLog(root: string, relative: string, result: JsonObject): Promise<JsonObject> {
  const archive = await artifactStore.copyReturnedLog(
    root, relative, result, runtimeCapabilities as unknown as Record<string, unknown> | null,
  );
  assert(protectedState !== null && typeof protectedState.project_root === "string",
    `agent ${String(result.id)} log scan lacks a protected project root`);
  const scan = await artifactStore.scanArchivedLog(root, archive, String(protectedState.project_root));
  return {
    schema_version: 1,
    agent_id: archive.agent_id,
    complete: true,
    source: "FabricAgentResult.logFile via artifactStore.copyReturnedLog and artifactStore.scanArchivedLog",
    source_path: archive.source_path,
    archive_path: archive.path,
    archive_receipt_path: archive.archive_receipt_path,
    scan_receipt_path: scan.scan_receipt_path,
    bytes: archive.bytes,
    sha256: archive.sha256,
    scanner_version: scan.scanner_version,
    event_count: scan.event_count,
    forbidden_paths: scan.forbidden_paths,
    flags: scan.flags,
    counts: scan.counts,
    child_ids: scan.child_ids,
  };
}

function usageProjection(result: JsonObject | null): JsonObject {
  const usage = result && result.usage && typeof result.usage === "object" ? result.usage as JsonObject : {};
  return {
    input_tokens: Number.isInteger(usage.input) && usage.input >= 0 ? usage.input : null,
    output_tokens: Number.isInteger(usage.output) && usage.output >= 0 ? usage.output : null,
    cache_read_tokens: Number.isInteger(usage.cacheRead) && usage.cacheRead >= 0 ? usage.cacheRead : null,
    cache_write_tokens: Number.isInteger(usage.cacheWrite) && usage.cacheWrite >= 0 ? usage.cacheWrite : null,
    cost_usd: null,
    provider_native: {
      raw_usage: usage,
      raw_cost: typeof usage.cost === "number" && Number.isFinite(usage.cost) ? usage.cost : null,
      raw_cost_unit: null,
      cost_projection: "unknown-until-a-versioned runtime receipt proves the raw unit is USD",
    },
  };
}

function authorizeCall(callId: string, req: WorkflowRequest): void {
  assert(agentCalls < EFFECTIVE_MAX_AGENT_CALLS, "effective Fabric call ceiling reached");
  assert(agentCalls < req.max_agents, "request agent call ceiling reached");
  assert(budgetLedger !== null && budgetReservations.has(callId), `call ${callId} has no unique global-budget reservation`);
  assert(!assignedWorkIds.has(callId) && !completedWorkIds.has(callId), `call ${callId} was already consumed in this invocation`);
  if (callPlan !== null) {
    assert(agentCalls < callPlan.max_calls, "call-plan ceiling reached");
    assert(plannedCallIds.has(callId), `call ${callId} is absent from the bound call plan`);
    plannedCallIds.delete(callId);
  }
}

function statusProjection(result: JsonObject | null, thrown: string | null, finalizationErrors: string[]): string {
  if (finalizationErrors.length > 0) return "invalid";
  if (result === null) return "prelaunch-failed";
  if (thrown !== null) return "invalid";
  if (result.status === "completed") return "succeeded";
  if (result.status === "timed_out") return "timed-out";
  if (result.status === "stopped") return "cancelled";
  if (result.status === "failed") return "failed";
  return thrown ? "failed" : "invalid";
}


function totalMechanismProjection(
  req: WorkflowRequest,
  row: ScheduleRow,
  condition: JsonObject,
  result: JsonObject | null,
  log: JsonObject | null,
  attemptStatus: string,
  sourceState: "file" | "missing" | "invalid" | "not-applicable",
  sourcePath: string | null,
  sourceSha256: string | null,
  sourceDetail: string | null,
): JsonObject {
  const contract = condition.mechanism as JsonObject;
  const native = condition.provider_native && typeof condition.provider_native === "object" ? condition.provider_native as JsonObject : {};
  const actorExpected = native.recursive === true;
  const flags = log && log.flags && typeof log.flags === "object" ? log.flags as JsonObject : null;
  const lifecycle = {
    create: flags === null ? null : flags.actor_create === true,
    terminal: flags === null ? null : flags.actor_terminal === true,
    cleanup: flags === null ? null : flags.actor_cleanup === true,
  };
  const nested = result && Array.isArray(result.nestedAgents) ? result.nestedAgents : [];
  const actorObserved = nested.length > 0 || lifecycle.create === true || lifecycle.terminal === true || lifecycle.cleanup === true;
  const conditionRole = condition.intervention_type === "control" ? "control" : "candidate";
  const mechanismRequired = contract.exposure !== "not-applicable";
  const evidence = [
    `conditions/${row.condition_id}.json`,
    `attempts/${row.attempt_id}/result.raw.json`,
    ...(log && typeof log.scan_receipt_path === "string" ? [log.scan_receipt_path] : []),
    ...(sourcePath === null ? [] : [sourcePath]),
    ...(nested.length > 0 ? [`attempts/${row.attempt_id}/children.json`] : []),
  ];
  let valid = false;
  let reason = "attempt-not-successful";
  let detail: string | null = attemptStatus === "succeeded" ? null : `attempt status is ${attemptStatus}`;
  if (attemptStatus === "succeeded") {
    if (log === null || flags === null || typeof log.scan_receipt_path !== "string") {
      reason = "log-evidence-missing";
      detail = "archived Fabric log scan is unavailable";
    } else if (Array.isArray(log.forbidden_paths) && log.forbidden_paths.length > 0) {
      reason = "forbidden-access-observed";
      detail = "archived Fabric log contains access outside the allowed project root";
    } else if (actorExpected && !(lifecycle.create === true && lifecycle.terminal === true && lifecycle.cleanup === true && actorObserved)) {
      reason = "actor-evidence-missing";
      detail = "recursive condition lacks complete actor create, terminal, and cleanup evidence";
    } else if (!actorExpected && actorObserved) {
      reason = "unexpected-actor-observed";
      detail = "non-recursive condition unexpectedly observed actor activity";
    } else if (sourceState === "invalid") {
      reason = "mechanism-source-invalid";
      detail = sourceDetail ?? "mechanism source is invalid";
    } else if (mechanismRequired && sourceState === "missing") {
      reason = "mechanism-source-missing";
      detail = "required mechanism source was not produced";
    } else {
      valid = true;
      reason = actorExpected ? "actor-mechanism-observed" : mechanismRequired ? "mechanism-observed" : "mechanism-not-applicable";
      detail = null;
    }
  }
  const qualifiers = [
    ...(conditionRole === "control" ? ["control"] : []),
    ...(actorExpected ? ["actor-expected"] : []),
    ...(actorObserved ? ["actor-observed"] : []),
    ...(mechanismRequired && !actorExpected ? ["non-actor-mechanism"] : []),
    ...(reason === "attempt-not-successful" ? ["attempt-failed"] : []),
    ...(reason === "mechanism-source-missing" ? ["source-missing"] : []),
    ...(reason === "mechanism-source-invalid" ? ["source-invalid"] : []),
    ...(reason === "log-evidence-missing" || reason === "actor-evidence-missing" ? ["observation-missing"] : []),
    ...(reason === "forbidden-access-observed" ? ["forbidden-access"] : []),
  ];
  return {
    schema_version: 1,
    benchmark_id: req.benchmark_id,
    attempt_id: row.attempt_id,
    valid,
    reason,
    detail,
    evidence: [...new Set(evidence)],
    ...typedStatus(valid ? (mechanismRequired ? "valid" : "not-applicable") : "invalid", [...new Set(qualifiers)]),
    condition_role: conditionRole,
    actor_expected: actorExpected,
    actor_observed: actorObserved,
    actor_lifecycle: lifecycle,
    attempt_status: attemptStatus,
    predicate: contract.predicate,
    exposure: contract.exposure,
    source_state: sourceState,
    source_path: sourcePath,
    source_sha256: sourceSha256,
    log_scan_path: log && typeof log.scan_receipt_path === "string" ? log.scan_receipt_path : null,
  };
}

function resultProjection(result: JsonObject | null, thrown: string | null, log: JsonObject | null): JsonObject {
  return {
    agent_id: result && typeof result.id === "string" ? result.id : null,
    status: result && typeof result.status === "string" ? result.status : null,
    model: result && typeof result.model === "string" ? result.model : null,
    session_id: result && typeof result.sessionId === "string" ? result.sessionId : null,
    output: result && typeof result.text === "string" ? result.text : null,
    error: result && typeof result.error === "string" ? result.error : thrown,
    usage: usageProjection(result),
    turns: result && typeof result.turns === "number" ? result.turns : null,
    tool_calls: [],
    started_at: result ? fabricTimestamp(result.startedAt) : null,
    ended_at: result ? fabricTimestamp(result.finishedAt) : null,
    provider_native: {
      aggregate_tool_call_count: result && typeof result.toolCalls === "number" ? result.toolCalls : null,
      runner_session_id: result && typeof result.runnerSessionId === "string" ? result.runnerSessionId : null,
      transport_session_id: result && typeof result.sessionId === "string" ? result.sessionId : null,
      log_complete: log && typeof log.complete === "boolean" ? log.complete : null,
      log_source: log && typeof log.source === "string" ? log.source : null,
      observed_model: null,
      nested_agents: result && Array.isArray(result.nestedAgents) ? result.nestedAgents : [],
    },
  };
}

async function copyRequiredArtifacts(root: string, row: ScheduleRow, task: JsonObject): Promise<string[]> {
  const paths = Array.isArray(task.required_artifact_paths) ? task.required_artifact_paths : [];
  const copied: string[] = [];
  for (const value of paths) {
    assertSafePath(value, `required artifact for ${row.attempt_id}`);
    const input = `workspaces/${row.attempt_id}/${value}`;
    const output = `attempts/${row.attempt_id}/artifacts/${value}`;
    assert(await fileState(join(root, input)) === "file", `required final artifact is missing: ${input}`);
    await ensureParent(root, output);
    await requireGate(
      `python -B ${shell(`${SKILL_ROOT}/scripts/write_once.py`)} --root ${shell(root)} --input ${shell(input)} ${shell(output)}`,
      `freeze required artifact ${output}`,
    );
    copied.push(output);
  }
  return copied;
}

function validateAgentRunRequest(value: AgentRunRequest, label: string): void {
  assert(typeof value.task === "string" && value.task.length > 0 && value.task.length <= HARD_MAX_TEXT_CHARS, `${label}.task is invalid`);
  if (value.name !== undefined) assert(typeof value.name === "string" && value.name.length > 0 && value.name.length <= 128, `${label}.name is invalid`);
  if (value.runner !== undefined) parseRunner(value.runner, `${label}.runner`);
  if (value.transport !== undefined) parseTransport(value.transport, `${label}.transport`);
  if (value.thinking !== undefined) parseThinking(value.thinking, `${label}.thinking`);
  if (value.tools !== undefined) parseTools(value.tools, `${label}.tools`);
  if (value.timeoutMs !== undefined) assert(Number.isInteger(value.timeoutMs) && value.timeoutMs >= 1000, `${label}.timeoutMs is invalid`);
  assert(!(value.recursive === true && value.cwd !== undefined), `${label} must omit cwd for a recursive Fabric request`);
}

async function prepareAttempt(
  root: string,
  row: ScheduleRow,
  req: WorkflowRequest,
  design: SealBinding,
  execution: SealBinding,
): Promise<PreparedAttempt> {
  await validateContract(root, "task", `tasks/${row.task_id}.json`);
  await validateContract(root, "condition", `conditions/${row.condition_id}.json`);
  const taskPath = join(root, `tasks/${row.task_id}.json`);
  const conditionPath = join(root, `conditions/${row.condition_id}.json`);
  const task = await readJson(taskPath);
  const condition = await readJson(conditionPath);
  assert(task.benchmark_id === req.benchmark_id && task.task_id === row.task_id, `task identity mismatch for ${row.attempt_id}`);
  assert(condition.benchmark_id === req.benchmark_id && condition.condition_id === row.condition_id,
    `condition identity mismatch for ${row.attempt_id}`);
  const isolation = condition.isolation as JsonObject;
  assert(isolation && isolation.fresh_process === true && isolation.fresh_session === true && isolation.fresh_workspace === true &&
    isolation.fresh_fixture === true && isolation.fresh_mutable_tool_state === true,
    `condition ${row.condition_id} lacks complete fresh-state commitments`);

  const workspaceRelative = `workspaces/${row.attempt_id}`;
  const workspace = join(root, workspaceRelative);
  await directoryRequired(workspace);
  const workspaceGate = await requireGate(`realpath -- ${shell(workspace)}`, `resolve attempt workspace ${row.attempt_id}`);
  const absoluteWorkspace = workspaceGate.output.trim();
  assert(absoluteWorkspace.startsWith("/") && !absoluteWorkspace.includes("/../") && !absoluteWorkspace.includes("/./"),
    `attempt workspace did not resolve to a canonical absolute path: ${row.attempt_id}`);
  const isolationReceipt = await readJson(join(root, `${workspaceRelative}/isolation-receipt.json`));
  const taskDigest = await sha256File(taskPath, `task ${row.task_id}`);
  const conditionDigest = await sha256File(conditionPath, `condition ${row.condition_id}`);
  const timeoutMs = Number(task.timeout_seconds) * 1000;
  const budget = condition.budget as JsonObject;
  assert(Number.isInteger(task.timeout_seconds) && task.timeout_seconds >= 1 &&
    budget && budget.timeout_seconds === task.timeout_seconds, `task/condition timeout mismatch for ${row.attempt_id}`);
  assert(isolationReceipt.schema_version === 1 && isolationReceipt.status === "passed" &&
    isolationReceipt.benchmark_id === req.benchmark_id && isolationReceipt.attempt_id === row.attempt_id &&
    isolationReceipt.task_id === row.task_id && isolationReceipt.task_revision === task.revision && isolationReceipt.task_sha256 === taskDigest &&
    isolationReceipt.condition_id === row.condition_id && isolationReceipt.condition_revision === condition.revision &&
    isolationReceipt.condition_sha256 === conditionDigest && isolationReceipt.workspace_path === workspaceRelative &&
    isolationReceipt.design_revision === design.revision && isolationReceipt.design_manifest_sha256 === design.manifest_sha256 &&
    isolationReceipt.execution_revision === execution.revision && isolationReceipt.execution_manifest_sha256 === execution.manifest_sha256,
    `isolation receipt identity/revision/digest binding failed for ${row.attempt_id}`);
  assert(json(isolationReceipt.isolation) === json(isolation), `isolation receipt commitments disagree for ${row.attempt_id}`);
  assert(json(isolationReceipt.mutable_state_paths) === json(task.mutable_state_paths) &&
    isolationReceipt.fixture_path === task.fixture_path, `isolation receipt state binding failed for ${row.attempt_id}`);
  assert(isolationReceipt.requested_timeout_ms === timeoutMs && isolationReceipt.effective_timeout_ms === timeoutMs &&
    isolationReceipt.timeout_status === "passed", `effective timeout evidence failed for ${row.attempt_id}`);

  assertSafePath(task.prompt_path, `task ${row.task_id} prompt_path`);
  const prompt = await readRequired(join(root, task.prompt_path));
  const invocation = condition.invocation as JsonObject;
  let finalPrompt = prompt;
  if (invocation.mode === "inline-instruction-bundle") {
    assertSafePath(invocation.instruction_path, `condition ${row.condition_id} instruction_path`);
    const instructions = await readRequired(join(root, invocation.instruction_path));
    finalPrompt = `${instructions}\n\n--- BENCHMARK TASK ---\n${prompt}`;
  } else if (invocation.mode === "skill-command") {
    assert(typeof invocation.skill_name === "string" && invocation.skill_name.length > 0, `condition ${row.condition_id} lacks skill_name`);
    assertSafePath(invocation.expansion_proof_path, `condition ${row.condition_id} expansion_proof_path`);
    assert(await fileState(join(root, invocation.expansion_proof_path)) === "file", `condition ${row.condition_id} lacks exact-path expansion proof`);
    finalPrompt = `/skill:${invocation.skill_name} ${prompt}`;
  } else {
    assert(invocation.mode === "plain", `condition ${row.condition_id} invocation mode is unsupported`);
  }
  assert(finalPrompt.length <= HARD_MAX_TEXT_CHARS, `rendered prompt is too large for ${row.attempt_id}`);

  const runner = parseRunner(req.requested_runtime, "Execute requested_runtime");
  const runtime = condition.runtime as JsonObject;
  assert(runtime.requested_selector === null || runtime.requested_selector === runner,
    `requested runner mismatch for condition ${row.condition_id}`);
  if (runtime.requested_model !== null || req.requested_model !== null) {
    assert(runtime.requested_model === req.requested_model, `requested model mismatch for condition ${row.condition_id}`);
  }
  const native = condition.provider_native && typeof condition.provider_native === "object" ? condition.provider_native as JsonObject : {};
  const mechanismRelative = typeof native.mechanism_evidence_path === "string" ? native.mechanism_evidence_path : "mechanism.json";
  assertSafePath(mechanismRelative, `mechanism evidence ${row.attempt_id}`);
  const recursive = native.recursive === true;
  if (recursive) {
    unsupported(runtimeCapabilities?.recursive_agents === true, `runtime capability does not authorize recursive attempt ${row.attempt_id}`);
    unsupported(runtimeCapabilities?.recursive_custom_cwd === false,
      `recursive runtime capability must explicitly record that custom cwd is unsupported for ${row.attempt_id}`);
    finalPrompt = `ABSOLUTE ATTEMPT WORKSPACE: ${absoluteWorkspace}\n` +
      `Write task outputs only beneath that workspace. Do not inspect benchmark-owned siblings or the live profile.\n\n${finalPrompt}`;
  }
  const requestValue: AgentRunRequest = {
    name: `attempt-${row.attempt_id}`,
    task: finalPrompt,
    runner,
    transport: parseTransport(native.transport === undefined ? "process" : native.transport, `condition ${row.condition_id} transport`),
    model: req.requested_model === null ? undefined : req.requested_model,
    thinking: parseThinking(native.thinking, `condition ${row.condition_id} thinking`),
    tools: parseTools(native.tools === undefined ? [] : native.tools, `condition ${row.condition_id} tools`),
    timeoutMs,
    extensions: typeof native.extensions === "boolean" ? native.extensions : true,
    recursive,
    ...(recursive ? {} : { cwd: absoluteWorkspace }),
    worktree: false,
  };
  validateAgentRunRequest(requestValue, `attempt request ${row.attempt_id}`);
  return { row, task, condition, request: requestValue, design, execution };
}

async function runMeasuredAttempt(root: string, prepared: PreparedAttempt, req: WorkflowRequest): Promise<AttemptOutcome> {
  const { row, task, request: agentRequest } = prepared;
  const base = `attempts/${row.attempt_id}`;
  let assignedAt: string | null = null;
  let assignmentCreated = false;
  let startedAt: string | null = null;
  let terminalAt = now();
  let result: JsonObject | null = null;
  let log: JsonObject | null = null;
  let thrown: string | null = null;
  const finalizationErrors: string[] = [];
  const artifacts: string[] = [`${base}/request.json`];

  await workflow.item({ id: row.attempt_id, label: row.attempt_id, phase: "Execute waves", status: "running", kind: "agent" });
  try {
    authorizeCall(row.attempt_id, req);
    assignedAt = now();
    await artifactStore.publish(root, `${base}/assignment.json`, {
      ...row,
      assigned_at: assignedAt,
      request_id: req.request_id,
      stage: req.stage,
      runtime_capability_binding: req.runtime_capability_binding,
      protected_state_binding: req.protected_state_binding,
      budget_ledger_binding: req.budget_ledger_binding,
      call_plan_binding: req.call_plan_binding,
      delta_seal_references: req.delta_seal_references,
      design_revision: prepared.design.revision,
      design_manifest_sha256: prepared.design.manifest_sha256,
      execution_revision: prepared.execution.revision,
      execution_manifest_sha256: prepared.execution.manifest_sha256,
      request_path: `${base}/request.json`,
    });
    assignmentCreated = true;
    assignedWorkIds.add(row.attempt_id);
    artifacts.push(`${base}/assignment.json`);
    agentCalls += 1;
    measuredAgentCalls += 1;
    result = await agents.run(agentRequest);
    startedAt = fabricTimestamp(result.startedAt);
    const finishedAt = fabricTimestamp(result.finishedAt);
    if (startedAt === null || finishedAt === null) {
      finalizationErrors.push("Fabric result lacks valid numeric startedAt/finishedAt evidence");
    }
    terminalAt = finishedAt ?? now();
  } catch (error) {
    thrown = message(error);
    terminalAt = now();
  } finally {
    if (assignmentCreated) {
      try {
        await artifactStore.publish(root, `${base}/result.raw.json`, {
          schema_version: 1,
          benchmark_id: req.benchmark_id,
          attempt_id: row.attempt_id,
          exact_request: agentRequest,
          fabric_result: result,
          thrown_error: thrown,
          captured_at: now(),
        });
        artifacts.push(`${base}/result.raw.json`);
      } catch (error) {
        finalizationErrors.push(`raw: ${message(error)}`);
      }
      if (result && typeof result.id === "string") {
        try {
          log = await captureReturnedLog(root, `${base}/log.raw.jsonl`, result);
          await artifactStore.publish(root, `${base}/log.receipt.json`, log);
          artifacts.push(
            `${base}/log.raw.jsonl`, `${base}/log.archive.json`, `${base}/log.scan.json`, `${base}/log.receipt.json`,
          );
        } catch (error) {
          finalizationErrors.push(`log: ${message(error)}`);
        }
      }
      try {
        await artifactStore.publish(root, `${base}/result.json`, resultProjection(result, thrown, log));
        artifacts.push(`${base}/result.json`);
      } catch (error) {
        finalizationErrors.push(`result: ${message(error)}`);
      }
      if (result && Array.isArray(result.nestedAgents) && result.nestedAgents.length > 0) {
        try {
          await artifactStore.publish(root, `${base}/children.json`, {
            schema_version: 1,
            benchmark_id: req.benchmark_id,
            attempt_id: row.attempt_id,
            parent_agent_id: typeof result.id === "string" ? result.id : null,
            source: "FabricAgentResult.nestedAgents",
            children: result.nestedAgents,
          });
          artifacts.push(`${base}/children.json`);
        } catch (error) {
          finalizationErrors.push(`children: ${message(error)}`);
        }
      }
      if (startedAt !== null && result && typeof result.id === "string") {
        try {
          await artifactStore.publish(root, `${base}/started.json`, {
            schema_version: 1,
            benchmark_id: req.benchmark_id,
            attempt_id: row.attempt_id,
            agent_id: result.id,
            runtime_started_at: startedAt,
            published_at: now(),
            source: "post-return FabricAgentResult projection, not crash-safe live chronology",
          });
          artifacts.push(`${base}/started.json`);
        } catch (error) {
          finalizationErrors.push(`started: ${message(error)}`);
        }
      }
      try {
        artifacts.push(...await copyRequiredArtifacts(root, row, task));
      } catch (error) {
        finalizationErrors.push(`artifacts: ${message(error)}`);
      }
      const mechanismContract = prepared.condition.mechanism as JsonObject;
      const native = prepared.condition.provider_native && typeof prepared.condition.provider_native === "object" ?
        prepared.condition.provider_native as JsonObject : {};
      const mechanismRelative = typeof native.mechanism_evidence_path === "string" ?
        native.mechanism_evidence_path : "mechanism.json";
      const mechanismRequired = mechanismContract.exposure !== "not-applicable";
      const mechanismWorkspaceSource = join(root, `workspaces/${row.attempt_id}/${mechanismRelative}`);
      let mechanismSourceState: "file" | "missing" | "invalid" | "not-applicable" = "missing";
      let mechanismSourcePath: string | null = null;
      let mechanismSourceSha256: string | null = null;
      let mechanismSourceDetail: string | null = null;
      try {
        const observedState = await fileState(mechanismWorkspaceSource);
        if (observedState === "file") {
          mechanismSourcePath = `${base}/mechanism.source`;
          await ensureParent(root, mechanismSourcePath);
          await requireGate(
            `python -B ${shell(`${SKILL_ROOT}/scripts/write_once.py`)} --root ${shell(root)} ` +
            `--input ${shell(`workspaces/${row.attempt_id}/${mechanismRelative}`)} ${shell(mechanismSourcePath)}`,
            `freeze mechanism source ${row.attempt_id}`,
          );
          mechanismSourceSha256 = await sha256File(join(root, mechanismSourcePath), `mechanism source ${row.attempt_id}`);
          mechanismSourceState = "file";
          artifacts.push(mechanismSourcePath);
        } else {
          mechanismSourceState = mechanismRequired ? "missing" : "not-applicable";
        }
      } catch (error) {
        mechanismSourceState = "invalid";
        mechanismSourcePath = null;
        mechanismSourceSha256 = null;
        mechanismSourceDetail = message(error).slice(0, 500);
      }
      const preliminaryStatus = statusProjection(result, thrown, finalizationErrors);
      const mechanismReceipt = totalMechanismProjection(
        req, row, prepared.condition, result, log, preliminaryStatus,
        mechanismSourceState, mechanismSourcePath, mechanismSourceSha256, mechanismSourceDetail,
      );
      await artifactStore.publish(root, `${base}/mechanism.json`, mechanismReceipt);
      artifacts.push(`${base}/mechanism.json`);
      try {
        await validateContract(root, "mechanism", `${base}/mechanism.json`);
      } catch (error) {
        finalizationErrors.push(`mechanism contract: ${message(error)}`);
      }
      if (mechanismReceipt.valid !== true && preliminaryStatus === "succeeded") {
        finalizationErrors.push(`mechanism: ${String(mechanismReceipt.reason)}`);
      }

      const status = statusProjection(result, thrown, finalizationErrors);
      const statusQualifiers = [
        ...(mechanismReceipt.valid !== true ? ["mechanism-unverified"] : []),
        ...(result && Array.isArray(result.nestedAgents) && result.nestedAgents.length > 0 ? ["nested-agents-present"] : []),
        ...(finalizationErrors.length > 0 ? ["finalization-error"] : []),
      ];
      const terminal = {
        schema_version: 1,
        benchmark_id: req.benchmark_id,
        schedule_revision: row.schedule_revision,
        attempt_id: row.attempt_id,
        task_id: row.task_id,
        condition_id: row.condition_id,
        repetition: row.repetition,
        wave: row.wave,
        worker_slot: row.worker_slot,
        retry_of: row.retry_of,
        stage: req.stage,
        ...typedStatus(status, statusQualifiers),
        failure: status === "succeeded" ? null : {
          stage: req.stage,
          code: startedAt === null ? "prelaunch-or-unobserved-start" : "attempt-terminal-failure",
          classification: status,
          message: [...(thrown ? [thrown] : []), ...finalizationErrors].join("; ") || String(result?.error ?? status),
          retryable: false,
        },
        startup_state: startedAt === null ? "not-started" : "started",
        assigned_at: assignedAt,
        started_at: startedAt,
        terminal_at: terminalAt,
        requested_runtime: req.requested_runtime,
        resolved_runner: result && typeof result.runner === "string" ? result.runner : null,
        requested_model: req.requested_model,
        resolved_model: result && typeof result.model === "string" ? result.model : null,
        observed_model: null,
        fabric_result: resultProjection(result, thrown, log),
        log_path: log === null ? null : `${base}/log.raw.jsonl`,
        session_path: null,
        process_evidence_path: `${base}/result.raw.json`,
        mechanism_evidence_path: `${base}/mechanism.json`,
        artifact_paths: [...new Set(artifacts)],
      };
      try {
        await artifactStore.publish(root, `${base}/terminal.json`, terminal);
        completedWorkIds.add(row.attempt_id);
        await workflow.item({ id: row.attempt_id, label: row.attempt_id, phase: "Execute waves", status: status === "succeeded" ? "completed" : "failed", kind: "agent" });
      } catch (error) {
        return {
          attempt_id: row.attempt_id,
          status: "ambiguous",
          error: `terminal publication failed after assignment; replay forbidden: ${message(error)}`,
        };
      }
      return { attempt_id: row.attempt_id, status: "terminal", terminal_path: `${base}/terminal.json`, ...(thrown ? { error: thrown } : {}) };
    }
  }
  return { attempt_id: row.attempt_id, status: "not-assigned", ...(thrown ? { error: thrown } : {}) };
}

async function lifecycleProjection(root: string, schedule: ScheduleRow[]): Promise<{ events: JsonObject[]; ledger: JsonObject[]; ambiguous: string[] }> {
  const assignments: Array<{ row: ScheduleRow; value: JsonObject }> = [];
  const terminals = new Map<string, JsonObject>();
  const ambiguous: string[] = [];
  for (const row of schedule) {
    const assignmentPath = join(root, `attempts/${row.attempt_id}/assignment.json`);
    const terminalPath = join(root, `attempts/${row.attempt_id}/terminal.json`);
    const assignmentState = await fileState(assignmentPath);
    const terminalState = await fileState(terminalPath);
    if (terminalState === "file" && assignmentState !== "file") {
      throw new Error(`terminal without assignment: ${row.attempt_id}`);
    }
    if (assignmentState === "file") {
      assignments.push({ row, value: await readJson(assignmentPath) });
      if (terminalState === "file") terminals.set(row.attempt_id, await readJson(terminalPath));
      else ambiguous.push(row.attempt_id);
    }
  }
  let sequence = 0;
  const events: JsonObject[] = [];
  const ledger: JsonObject[] = [];
  for (const entry of assignments) {
    sequence += 1;
    events.push({
      ...entry.row,
      ...entry.value,
      sequence,
      event_type: "assigned",
      sequence_scope: "checkpoint projection, not occurrence chronology",
    });
    const terminal = terminals.get(entry.row.attempt_id);
    if (!terminal) continue;
    const startedPath = join(root, `attempts/${entry.row.attempt_id}/started.json`);
    if (await fileState(startedPath) === "file") {
      sequence += 1;
      events.push({ ...entry.row, ...await readJson(startedPath), sequence, event_type: "started", sequence_scope: "checkpoint projection, not occurrence chronology" });
    }
    sequence += 1;
    events.push({ ...entry.row, ...terminal, sequence, event_type: "terminal", sequence_scope: "checkpoint projection, not occurrence chronology" });
    ledger.push({ ...entry.row, ...terminal, analysis_included: true, exclusion_reason: null });
  }
  return { events, ledger, ambiguous };
}

async function reconcile(
  root: string,
  schedule: ScheduleRow[],
  req: WorkflowRequest,
  canonical: boolean,
  explicitPrefix?: string,
): Promise<JsonObject> {
  const projection = await lifecycleProjection(root, schedule);
  const prefix = explicitPrefix === undefined ? (canonical ? "" : `checkpoints/${req.request_id}/`) : `${explicitPrefix}/`;
  const eventsRelative = `${prefix}events.jsonl`;
  const ledgerRelative = `${prefix}ledger.jsonl`;
  await artifactStore.publish(root, eventsRelative, projection.events, "jsonl");
  await artifactStore.publish(root, ledgerRelative, projection.ledger, "jsonl");
  const gate = await bash(
    `python -B ${shell(`${SKILL_ROOT}/scripts/reconcile_lifecycle.py`)} --root ${shell(root)} ` +
    `--schedule schedule.jsonl --events ${shell(eventsRelative)} --ledger ${shell(ledgerRelative)} ` +
    `--attempts-dir attempts --grades grades.jsonl --telemetry telemetry.jsonl`,
  );
  let result: JsonObject;
  try {
    result = JSON.parse(gate.output) as JsonObject;
  } catch {
    throw new Error(`reconciliation produced no machine receipt: ${gate.error ?? gate.output}`);
  }
  assert(Array.isArray(result.ambiguous_attempt_ids), "reconciliation receipt lacks ambiguous IDs");
  if (projection.ambiguous.length > 0) {
    assert(projection.ambiguous.every((id) => result.ambiguous_attempt_ids.includes(id)), "reconciliation lost ambiguous IDs");
  }
  return { ...result, gate_exit_code: gate.exit_code, events_path: eventsRelative, ledger_path: ledgerRelative };
}

async function runDesign(root: string, req: WorkflowRequest): Promise<JsonObject> {
  await workflow.phase("Frame", { total: 1 });
  await validateSchemas();
  assert(installedRuntimeCapabilities !== null, "installed runtime capability is unavailable");
  const runtimeCapabilityPath = "preflight/runtime-capability.json";
  await artifactStore.publish(root, runtimeCapabilityPath, installedRuntimeCapabilities, "json");
  await validateContract(root, "runtime-capability", runtimeCapabilityPath);
  await workflow.phase("Inventory", { total: 6 });
  const required = ["protocol.md", "tasks", "conditions", "graders", "schedule.jsonl", "analysis-plan.json", runtimeCapabilityPath];
  const inventory: JsonObject[] = [];
  for (const relative of required) {
    const result = await bash(`test ! -L ${shell(join(root, relative))} && test -e ${shell(join(root, relative))}`);
    inventory.push({ path: relative, present: result.ok });
  }
  assert(inventory.every((item) => item.present), "design inventory is incomplete");
  const schedule = await loadSchedule(root, req.benchmark_id);

  await workflow.phase("Build graders", { total: 1 });
  const taskIds = [...new Set(schedule.map((row) => row.task_id))];
  const conditionIds = [...new Set(schedule.map((row) => row.condition_id))];
  const graderIds = new Set<string>();
  for (const taskId of taskIds) {
    await validateContract(root, "task", `tasks/${taskId}.json`);
    const task = await readJson(join(root, `tasks/${taskId}.json`));
    for (const graderId of task.grader_ids as string[]) graderIds.add(graderId);
  }
  for (const conditionId of conditionIds) await validateContract(root, "condition", `conditions/${conditionId}.json`);
  for (const graderId of graderIds) await validateContract(root, "grader", `graders/${graderId}.json`);

  await workflow.phase("Certify graders", { total: 1 });
  assert(await fileState(join(root, "preflight/grader-certification.json")) === "file", "grader certification receipt is missing");
  await workflow.phase("Freeze design", { total: 1 });
  assert(req.design_revision !== null, "Design requires design_revision");
  const sealRelative = `seals/${req.design_revision}`;
  let seal: JsonObject;
  if (await fileState(join(root, `${sealRelative}/manifest.json`)) === "file") {
    seal = await verifySeal(root, req.design_revision, "design");
  } else {
    assert(!req.dry_run, "dry-run will not create a design seal");
    await requireGate(
      `python -B ${shell(`${SKILL_ROOT}/scripts/verify_seal.py`)} create --root ${shell(root)} ` +
      `--seal ${shell(sealRelative)} --benchmark-id ${shell(req.benchmark_id)} --seal-type design ` +
      `--revision ${shell(req.design_revision)} --created-at ${shell(now())} ` +
      required.map((path) => `--owned-path ${shell(path)}`).join(" "),
      "create design seal",
    );
    seal = await verifySeal(root, req.design_revision, "design");
  }
  await workflow.phase("Report", { total: 1 });
  return {
    schema_version: 1,
    ...typedStatus("complete"),
    route: "Design",
    stage: req.stage,
    request_id: req.request_id,
    benchmark_id: req.benchmark_id,
    rows: schedule.length,
    tasks: taskIds.length,
    conditions: conditionIds.length,
    graders: graderIds.size,
    design_seal: { path: sealRelative, status: seal.status },
    runtime_capability: {
      path: runtimeCapabilityPath,
      sha256: await sha256File(join(root, runtimeCapabilityPath), "runtime capability receipt"),
      capability_id: installedRuntimeCapabilities.capability_id,
    },
    complete: true,
    failure: null,
    evidence: ["schedule.jsonl", "preflight/grader-certification.json", runtimeCapabilityPath, `${sealRelative}/manifest.json`],
    blockers: [],
  };
}

async function runAudit(root: string, req: WorkflowRequest): Promise<JsonObject> {
  await workflow.phase("Frame", { total: 1 });
  await validateSchemas();
  await workflow.phase("Inventory", { total: 4 });
  const evidence: JsonObject[] = [];
  for (const relative of ["schedule.jsonl", "events.jsonl", "ledger.jsonl", "grades.jsonl"]) {
    evidence.push({ path: relative, state: await fileState(join(root, relative)) });
  }
  const seals: JsonObject[] = [];
  if (req.design_revision !== null && await fileState(join(root, `seals/${req.design_revision}/manifest.json`)) === "file") {
    seals.push(await verifySeal(root, req.design_revision, "design"));
  }
  if (req.execution_revision !== null && await fileState(join(root, `seals/${req.execution_revision}/manifest.json`)) === "file") {
    seals.push(await verifySeal(root, req.execution_revision, "execution"));
  }

  await workflow.phase("Reconcile", { total: 1 });
  let reconciliation: JsonObject | null = null;
  const blockers: string[] = [];
  if (evidence.find((item) => item.path === "schedule.jsonl")?.state === "file") {
    const schedule = await loadSchedule(root, req.benchmark_id);
    const gate = await bash(
      `python -B ${shell(`${SKILL_ROOT}/scripts/reconcile_lifecycle.py`)} --root ${shell(root)} ` +
      `--schedule schedule.jsonl --events events.jsonl --ledger ledger.jsonl --attempts-dir attempts ` +
      `--grades grades.jsonl --telemetry telemetry.jsonl`,
    );
    try {
      reconciliation = JSON.parse(gate.output) as JsonObject;
    } catch {
      reconciliation = { status: "invalid", complete: false, issues: [gate.error ?? gate.output] };
    }
    if (reconciliation.complete !== true) blockers.push("exact lifecycle reconciliation is incomplete");
  } else {
    blockers.push("schedule.jsonl is missing");
  }

  let semanticReview: unknown = null;
  if (!req.dry_run) {
    authorizeCall(`audit-${req.request_id}`, req);
    agentCalls += 1;
    supportAgentCalls += 1;
    semanticReview = await workflow.agent(
      `Classify only the supplied deterministic audit receipt as fatal, confounding, repairable, or analysis-limited. ` +
      `Do not claim missing evidence exists and recommend only the smallest valid repair.\n\n${JSON.stringify(reconciliation)}`,
      { label: "bounded semantic audit support", tools: [] },
    );
  }
  await workflow.phase("Report", { total: 1 });
  return {
    schema_version: 1,
    ...typedStatus(blockers.length === 0 ? "complete" : "blocked",
      blockers.length === 0 ? [] : ["reconciliation-incomplete"]),
    route: "Audit",
    stage: req.stage,
    request_id: req.request_id,
    benchmark_id: req.benchmark_id,
    dry_run: req.dry_run,
    agent_calls: req.dry_run ? 0 : 1,
    evidence,
    seals: seals.map((seal) => ({ seal: seal.seal, status: seal.status })),
    reconciliation,
    semantic_review: semanticReview,
    complete: blockers.length === 0,
    failure: null,
    blockers,
    minimum_repair: blockers.length === 0 ? null : "preserve existing bytes and create only the missing deterministic or revisioned evidence",
  };
}

async function runExecute(root: string, req: WorkflowRequest): Promise<JsonObject> {
  await workflow.phase("Frame", { total: 1 });
  assert(!req.dry_run, "Execute dry-run does not assign attempts; use Audit dry-run for harness validation");
  assert(req.design_revision !== null && req.execution_revision !== null, "Execute requires design_revision and execution_revision");
  assert(req.wave_id !== null && /^[1-9][0-9]*$/.test(req.wave_id), "Execute requires a positive integer wave_id");
  const wave = Number(req.wave_id);

  await workflow.phase("Preflight conditions", { total: 3 });
  await validateSchemas();
  const designBinding = await sealBinding(root, req.design_revision, "design");
  const executionBinding = await sealBinding(root, req.execution_revision, "execution");
  const preflight = await readJson(join(root, "preflight-receipt.json"));
  const gates = validatePreflight(preflight, req, designBinding, executionBinding);

  await workflow.phase("Verify mechanisms", { total: 1 });
  requirePassedGates(gates);

  await workflow.phase("Test scheduler and supervisor", { total: 2 });
  const schedule = await loadSchedule(root, req.benchmark_id);

  await workflow.phase("Seal execution", { total: 1 });
  assert(executionBinding.verification.status === "passed", "execution seal is not active");

  const selected = schedule.filter((row) => row.wave === wave);
  assert(selected.length > 0, `sealed wave ${wave} has no rows`);
  const eligible: ScheduleRow[] = [];
  const skipped: string[] = [];
  const ambiguous: string[] = [];
  const deterministicRepairs: string[] = [];
  const refusedReplay: string[] = [];
  const resumeActions: JsonObject[] = [];
  const repairSources = async (attemptId: string): Promise<string[]> => {
    const base = `attempts/${attemptId}`;
    if (await fileState(join(root, `${base}/result.raw.json`)) !== "file") return [];
    const sources: string[] = [];
    for (const name of ["result.raw.json", "result.json", "log.raw.jsonl", "log.receipt.json", "mechanism.json"]) {
      const relative = `${base}/${name}`;
      if (await fileState(join(root, relative)) === "file") sources.push(relative);
    }
    return sources;
  };
  const classify = (attemptId: string, action: string, reason: string, evidence: string[] = []): void => {
    resumeActions.push({ attempt_id: attemptId, action, reason, evidence });
  };
  for (const row of selected) {
    await validateContract(root, "task", `tasks/${row.task_id}.json`);
    await validateContract(root, "condition", `conditions/${row.condition_id}.json`);
    const selectedTask = await readJson(join(root, `tasks/${row.task_id}.json`));
    const selectedCondition = await readJson(join(root, `conditions/${row.condition_id}.json`));
    assert(selectedTask.benchmark_id === req.benchmark_id && selectedTask.task_id === row.task_id,
      `selected task identity mismatch for ${row.attempt_id}`);
    assert(selectedCondition.benchmark_id === req.benchmark_id && selectedCondition.condition_id === row.condition_id,
      `selected condition identity mismatch for ${row.attempt_id}`);
    const assignment = await fileState(join(root, `attempts/${row.attempt_id}/assignment.json`));
    const terminal = await fileState(join(root, `attempts/${row.attempt_id}/terminal.json`));
    if (terminal === "file" && assignment !== "file") {
      refusedReplay.push(row.attempt_id);
      classify(row.attempt_id, "refuse-replay", "terminal without assignment is a lifecycle contradiction");
      continue;
    }
    if (terminal === "file") {
      let existingAssignment: JsonObject;
      try {
        existingAssignment = await readJson(join(root, `attempts/${row.attempt_id}/assignment.json`));
      } catch (error) {
        refusedReplay.push(row.attempt_id);
        classify(row.attempt_id, "refuse-replay", `assignment is malformed: ${message(error)}`);
        continue;
      }
      const assignmentBound = existingAssignment.attempt_id === row.attempt_id &&
        existingAssignment.benchmark_id === req.benchmark_id &&
        existingAssignment.design_revision === designBinding.revision &&
        existingAssignment.design_manifest_sha256 === designBinding.manifest_sha256 &&
        existingAssignment.execution_revision === executionBinding.revision &&
        existingAssignment.execution_manifest_sha256 === executionBinding.manifest_sha256;
      if (!assignmentBound) {
        refusedReplay.push(row.attempt_id);
        classify(row.attempt_id, "refuse-replay", "attempt assignment seal binding is stale or contradictory");
        continue;
      }
      let existingTerminal: JsonObject;
      try {
        existingTerminal = await readJson(join(root, `attempts/${row.attempt_id}/terminal.json`));
        if (existingTerminal.stage !== undefined) {
          await validateContract(root, "attempt", `attempts/${row.attempt_id}/terminal.json`);
        }
      } catch (error) {
        const sources = await repairSources(row.attempt_id);
        assignedWorkIds.add(row.attempt_id);
        if (sources.length > 0) {
          deterministicRepairs.push(row.attempt_id);
          classify(row.attempt_id, "deterministic-repair-only",
            `terminal projection is malformed but immutable source evidence exists: ${message(error)}`, sources);
        } else {
          refusedReplay.push(row.attempt_id);
          classify(row.attempt_id, "refuse-replay",
            `terminal is malformed and deterministic source evidence is missing: ${message(error)}`);
        }
        continue;
      }
      if (existingTerminal.task_id !== row.task_id || existingTerminal.condition_id !== row.condition_id ||
          existingTerminal.schedule_revision !== row.schedule_revision) {
        refusedReplay.push(row.attempt_id);
        classify(row.attempt_id, "refuse-replay", "attempt terminal schedule identity is contradictory");
        continue;
      }
      let artifactsResolved = Array.isArray(existingTerminal.artifact_paths) && existingTerminal.artifact_paths.length > 0;
      if (artifactsResolved) {
        for (const artifact of existingTerminal.artifact_paths as unknown[]) {
          if (typeof artifact !== "string") {
            artifactsResolved = false;
            break;
          }
          try {
            assertSafePath(artifact, `attempt terminal artifact ${row.attempt_id}`);
            if (await fileState(join(root, artifact)) !== "file") artifactsResolved = false;
          } catch {
            artifactsResolved = false;
          }
        }
      }
      if (!artifactsResolved) {
        refusedReplay.push(row.attempt_id);
        classify(row.attempt_id, "refuse-replay", "attempt terminal artifact ownership is unresolved");
        continue;
      }
      assignedWorkIds.add(row.attempt_id);
      completedWorkIds.add(row.attempt_id);
      skipped.push(row.attempt_id);
      classify(row.attempt_id, "skip", "valid immutable terminal");
    } else if (assignment === "file") {
      assignedWorkIds.add(row.attempt_id);
      ambiguous.push(row.attempt_id);
      classify(row.attempt_id, "refuse-replay", "assigned without terminal is ambiguous");
    } else {
      let stale = false;
      for (const name of ["result.raw.json", "result.json", "started.json", "log.raw.jsonl", "log.receipt.json"]) {
        if (await fileState(join(root, `attempts/${row.attempt_id}/${name}`)) !== "missing") stale = true;
      }
      if (stale) {
        refusedReplay.push(row.attempt_id);
        classify(row.attempt_id, "refuse-replay", "unassigned attempt has stale lifecycle artifacts");
        continue;
      }
      eligible.push(row);
      classify(row.attempt_id, "run", "never assigned");
    }
  }
  const resumeBlocked = ambiguous.length > 0 || deterministicRepairs.length > 0 || refusedReplay.length > 0;
  if (resumeBlocked) {
    const blockers = [
      ...(ambiguous.length > 0 ? [`assigned without terminal; replay refused: ${ambiguous.join(", ")}`] : []),
      ...(deterministicRepairs.length > 0 ? [`deterministic repair only: ${deterministicRepairs.join(", ")}`] : []),
      ...(refusedReplay.length > 0 ? [`lifecycle contradictions; replay refused: ${refusedReplay.join(", ")}`] : []),
    ];
    const resumePlanPath = `checkpoints/${req.request_id}/resume-plan.json`;
    const receiptPath = `checkpoints/${req.request_id}/receipt.json`;
    await artifactStore.publish(root, resumePlanPath, {
      schema_version: 1,
      status: "blocked",
      request_id: req.request_id,
      benchmark_id: req.benchmark_id,
      actions: resumeActions,
      blocked_attempt_ids: [...new Set([...ambiguous, ...refusedReplay])],
      deterministic_repair_only_attempt_ids: deterministicRepairs,
    });
    const checkpoint = {
      schema_version: 1,
      ...typedStatus("blocked", ["resume-classified", "model-replay-forbidden"]),
      route: "Execute",
      stage: req.stage,
      request_id: req.request_id,
      benchmark_id: req.benchmark_id,
      execution_revision: req.execution_revision,
      wave_id: req.wave_id,
      considered: selected.map((row) => row.attempt_id),
      resume_actions: resumeActions,
      skipped_terminal: skipped,
      newly_assigned: [],
      never_assigned: eligible.map((row) => row.attempt_id),
      deferred_due_to_call_cap: [],
      ambiguous,
      deterministic_repair_only: deterministicRepairs,
      refused_replay: refusedReplay,
      resume_plan_path: resumePlanPath,
      reconciliation_path: null,
      raw_freeze: null,
      complete: false,
      failure: null,
      next_action: deterministicRepairs.length > 0
        ? "run deterministic repair/finalize from immutable source bytes; do not replay models"
        : "audit lifecycle contradictions; do not replay these IDs",
      evidence: [resumePlanPath, receiptPath],
      blockers,
    };
    await artifactStore.publish(root, receiptPath, checkpoint);
    await workflow.phase("Report", { total: 1 });
    return checkpoint;
  }
  const invocationCapacity = Math.max(0, Math.min(
    req.max_agents - agentCalls,
    EFFECTIVE_MAX_AGENT_CALLS - agentCalls,
    callPlan?.max_calls ?? req.max_agents,
  ));
  const plannedEligible = callPlan === null ? eligible : eligible.filter((row) => plannedCallIds.has(row.attempt_id));
  const launchRows = plannedEligible.slice(0, invocationCapacity);
  const deferred = eligible.filter((row) => !launchRows.some((launch) => launch.attempt_id === row.attempt_id));
  const prepared: PreparedAttempt[] = [];
  for (const row of launchRows) prepared.push(await prepareAttempt(root, row, req, designBinding, executionBinding));
  assert(prepared.length === launchRows.length, "not every launchable attempt was preloaded");
  for (const attempt of prepared) {
    await artifactStore.publish(root, `attempts/${attempt.row.attempt_id}/request.json`, attempt.request, "json");
  }

  await workflow.phase("Execute waves", { id: `wave-${wave}`, total: selected.length });
  const outcomes = await boundedMap(prepared, req.max_concurrency, (attempt) => runMeasuredAttempt(root, attempt, req));

  await workflow.phase("Reconcile", { total: 1 });
  const checkpointReconciliation = await reconcile(root, schedule, req, false);
  const postAmbiguous = checkpointReconciliation.ambiguous_attempt_ids as string[];
  const blockers: string[] = [];
  if (postAmbiguous.length > 0) blockers.push(`ambiguous assigned rows: ${postAmbiguous.join(", ")}`);
  const allTerminal = Number(checkpointReconciliation.counts?.scheduled) === Number(checkpointReconciliation.counts?.terminal_artifacts) &&
    Number(checkpointReconciliation.counts?.scheduled) === Number(checkpointReconciliation.counts?.assigned) &&
    Array.isArray(checkpointReconciliation.issues) && checkpointReconciliation.issues.length === 0;

  let canonicalReconciliation: JsonObject | null = null;
  let rawSeal: JsonObject | null = null;
  if (allTerminal) {
    canonicalReconciliation = await reconcile(root, schedule, req, true);
    assert(canonicalReconciliation.complete === true, "canonical execution reconciliation is not exact");
    await workflow.phase("Freeze raw outputs", { total: 1 });
    const suffix = req.execution_revision.replace(/^execution-/, "");
    const rawRevision = `raw-${suffix}`;
    const rawRelative = `seals/${rawRevision}`;
    if (await fileState(join(root, `${rawRelative}/manifest.json`)) === "missing") {
      await requireGate(
        `python -B ${shell(`${SKILL_ROOT}/scripts/verify_seal.py`)} create --root ${shell(root)} ` +
        `--seal ${shell(rawRelative)} --benchmark-id ${shell(req.benchmark_id)} --seal-type raw-freeze ` +
        `--revision ${shell(rawRevision)} --created-at ${shell(now())} ` +
        `--owned-path attempts --owned-path events.jsonl --owned-path ledger.jsonl`,
        "create raw freeze",
      );
    }
    rawSeal = await verifySeal(root, rawRevision, "raw-freeze");
  }

  const checkpoint = {
    schema_version: 1,
    ...typedStatus(
      allTerminal && canonicalReconciliation?.complete === true && rawSeal?.status === "passed" ? "complete" :
        blockers.length > 0 ? "blocked" : "checkpoint",
      allTerminal ? [] : deferred.length > 0 ? ["call-cap-bounded", "wave-incomplete"] : ["wave-incomplete"],
    ),
    stage: req.stage,
    request_id: req.request_id,
    benchmark_id: req.benchmark_id,
    execution_revision: req.execution_revision,
    wave_id: req.wave_id,
    considered: selected.map((row) => row.attempt_id),
    resume_actions: resumeActions,
    skipped_terminal: skipped,
    deterministic_repair_only: deterministicRepairs,
    refused_replay: refusedReplay,
    newly_assigned: outcomes.filter((outcome) => outcome.status === "terminal").map((outcome) => outcome.attempt_id),
    never_assigned: [
      ...outcomes.filter((outcome) => outcome.status === "not-assigned").map((outcome) => outcome.attempt_id),
      ...deferred.map((row) => row.attempt_id),
    ],
    deferred_due_to_call_cap: deferred.map((row) => row.attempt_id),
    ambiguous: postAmbiguous,
    reconciliation_path: `checkpoints/${req.request_id}/reconciliation.json`,
    raw_freeze: rawSeal ? rawSeal.seal : null,
    complete: allTerminal && canonicalReconciliation?.complete === true && rawSeal?.status === "passed",
    failure: null,
    next_action: postAmbiguous.length > 0 ? "audit ambiguity; do not replay these IDs" : allTerminal ? "Analyze" : "Execute the next sealed missing wave",
  };
  await artifactStore.publish(root, `checkpoints/${req.request_id}/reconciliation.json`, checkpointReconciliation);
  await artifactStore.publish(root, `checkpoints/${req.request_id}/receipt.json`, checkpoint);
  await workflow.phase("Report", { total: 1 });
  return {
    ...checkpoint,
    ...typedStatus(
      checkpoint.complete ? "complete" : blockers.length > 0 ? "blocked" : "checkpoint",
      checkpoint.complete ? [] : blockers.length > 0 ? ["ambiguous-assignment"] : ["bounded-wave-incomplete"],
    ),
    route: "Execute",
    stage: req.stage,
    evidence: [`checkpoints/${req.request_id}/receipt.json`, checkpoint.reconciliation_path, ...(rawSeal ? [`${rawSeal.seal}/manifest.json`] : [])],
    blockers,
  };
}

async function createOrVerifyBlindMaps(root: string, seed: number): Promise<void> {
  assert(scratchPath !== null, "scratch directory is unavailable");
  const privateScratch = `${scratchPath}/blind-map.private.json`;
  const publicScratch = `${scratchPath}/blind-map.public.json`;
  const receiptScratch = `${scratchPath}/blind-map.commit.json`;
  await requireGate(
    `python -B ${shell(`${SKILL_ROOT}/scripts/generate_blind_map.py`)} ` +
    `--schedule ${shell(join(root, "schedule.jsonl"))} --seed ${shell(String(seed))} ` +
    `--private-output ${shell(privateScratch)} --public-output ${shell(publicScratch)} ` +
    `--receipt-output ${shell(receiptScratch)}`,
    "derive blind maps",
  );

  const commit = await readJson(receiptScratch);
  const outputs = commit.outputs as JsonObject[];
  assert(commit.schema_version === 1 && commit.status === "committed" && commit.tool === "generate_blind_map" &&
    commit.seed === seed && Array.isArray(outputs) && outputs.length === 2,
    "blind-map helper returned an invalid commit receipt");
  const scheduleSha256 = await sha256File(join(root, "schedule.jsonl"), "blind-map schedule");
  const privateSha256 = await sha256File(privateScratch, "private blind map");
  const publicSha256 = await sha256File(publicScratch, "public blind map");
  const privateOutput = outputs.find((output) => output.role === "private");
  const publicOutput = outputs.find((output) => output.role === "public");
  assert(commit.schedule_sha256 === scheduleSha256 &&
    privateOutput?.path === privateScratch && privateOutput.sha256 === privateSha256 &&
    publicOutput?.path === publicScratch && publicOutput.sha256 === publicSha256,
    "blind-map helper receipt does not bind the generated maps");

  assert(Number.isInteger(privateOutput.bytes) && privateOutput.bytes >= 0 &&
    Number.isInteger(publicOutput.bytes) && publicOutput.bytes >= 0,
    "blind-map helper receipt has invalid byte counts");
  const privateBytes = await readRequired(privateScratch);
  const publicBytes = await readRequired(publicScratch);
  const packetCommit = {
    schema_version: 1,
    status: "committed",
    tool: "generate_blind_map",
    seed,
    schedule_sha256: scheduleSha256,
    outputs: [
      { role: "private", path: "blind-map.private.json", sha256: privateSha256, bytes: privateOutput.bytes },
      { role: "public", path: "blind-map.public.json", sha256: publicSha256, bytes: publicOutput.bytes },
    ],
  };
  await artifactStore.publish(root, "blind-map.private.json", privateBytes, "bytes");
  await artifactStore.publish(root, "blind-map.public.json", publicBytes, "bytes");
  await artifactStore.publish(root, "blind-map.commit.json", packetCommit, "json");
  const persistedCommit = await readJson(join(root, "blind-map.commit.json"));
  assert(persistedCommit.status === "committed" && persistedCommit.tool === "generate_blind_map" &&
    persistedCommit.seed === seed && persistedCommit.schedule_sha256 === scheduleSha256 &&
    json(persistedCommit.outputs) === json(packetCommit.outputs),
    "packet blind-map commit receipt is stale or incomplete");
}

async function createBlindEvidenceAliases(root: string, blind: JsonObject, task: JsonObject): Promise<string[]> {
  const aliases: string[] = [];
  const required = Array.isArray(task.required_artifact_paths) ? task.required_artifact_paths : [];
  for (const value of required) {
    assertSafePath(value, `blind evidence ${blind.blind_id}`);
    const source = `attempts/${blind.attempt_id}/artifacts/${value}`;
    const alias = `blinded/${blind.blind_id}/evidence/${value}`;
    assert(await fileState(join(root, source)) === "file", `frozen grading evidence is missing: ${source}`);
    await ensureParent(root, alias);
    if (await fileState(join(root, alias)) === "missing") {
      await requireGate(
        `python -B ${shell(`${SKILL_ROOT}/scripts/write_once.py`)} --root ${shell(root)} ` +
        `--input ${shell(source)} ${shell(alias)}`,
        `create blind-owned evidence alias ${alias}`,
      );
    } else {
      await requireGate(`cmp -s -- ${shell(join(root, source))} ${shell(join(root, alias))}`, `verify blind evidence alias ${alias}`);
    }
    aliases.push(alias);
  }
  return aliases;
}

function validateBlindGrade(record: JsonObject, blind: JsonObject, grader: JsonObject, base: string): void {
  assert(record.benchmark_id === grader.benchmark_id && record.attempt_id === blind.attempt_id &&
    record.blind_id === blind.blind_id && record.grader_id === grader.grader_id &&
    record.grader_revision === grader.revision, `grade identity mismatch at ${base}`);
  assert(Array.isArray(record.evidence_paths) && record.evidence_paths.length > 0, `grade evidence is missing at ${base}`);
  for (const evidence of record.evidence_paths) {
    assertSafePath(evidence, `grade evidence at ${base}`);
    assert(!evidence.startsWith("attempts/") && !evidence.startsWith("conditions/") && !evidence.startsWith("blind-map.private"),
      `grade evidence leaks a private attempt/condition path at ${base}`);
  }
  assert(record.evidence_paths.some((path: unknown) => typeof path === "string" && path.startsWith(`blinded/${blind.blind_id}/`)),
    `grade at ${base} lacks blind-owned evidence`);
}

async function loadExistingGrade(
  root: string,
  blind: JsonObject,
  grader: JsonObject,
  base: string,
  design: SealBinding,
  execution: SealBinding,
): Promise<JsonObject> {
  const record = await readJson(join(root, `${base}/result.json`));
  if (record.stage !== undefined) await validateContract(root, "result", `${base}/result.json`);
  validateBlindGrade(record, blind, grader, base);
  if (grader.kind === "model") {
    const assignment = await readJson(join(root, `${base}/assignment.json`));
    assert(assignment.benchmark_id === record.benchmark_id && assignment.blind_id === record.blind_id &&
      assignment.grader_id === record.grader_id && assignment.grader_revision === record.grader_revision &&
      assignment.stage === record.stage && assignment.request_path === `${base}/request.json` &&
      typeof assignment.assigned_at === "string" && Number.isFinite(Date.parse(assignment.assigned_at)),
      `model grader assignment mismatch at ${base}`);
    if (record.stage === "judge") {
      assert(assignment.design_revision === design.revision && assignment.design_manifest_sha256 === design.manifest_sha256 &&
        assignment.execution_revision === execution.revision && assignment.execution_manifest_sha256 === execution.manifest_sha256,
        `judge assignment seal binding mismatch at ${base}`);
    } else {
      await validateContract(root, "adjudication-assignment", `${base}/assignment.json`);
    }
  }
  const terminal = await readJson(join(root, `${base}/terminal.json`));
  assert(terminal.benchmark_id === record.benchmark_id && terminal.blind_id === record.blind_id &&
    terminal.grader_id === record.grader_id && terminal.grader_revision === record.grader_revision &&
    terminal.stage === record.stage && terminal.status === record.status && terminal.result_path === `${base}/result.json` &&
    typeof terminal.terminal_at === "string" && Number.isFinite(Date.parse(terminal.terminal_at)),
    `grader terminal mismatch at ${base}`);
  if (record.stage === "adjudicate") {
    await validateContract(root, "adjudication-terminal", `${base}/terminal.json`);
    assert(terminal.result_sha256 === await sha256File(join(root, `${base}/result.json`), "resumed adjudication result") &&
      terminal.raw_sha256 === await sha256File(join(root, `${base}/result.raw.json`), "resumed adjudication raw result"),
      `adjudication terminal digest mismatch at ${base}`);
  }
  for (const field of ["raw_path", "log_path"]) {
    if (terminal[field] !== null && terminal[field] !== undefined) {
      assertSafePath(terminal[field], `grader terminal ${field} at ${base}`);
      assert(await fileState(join(root, terminal[field])) === "file", `grader terminal ${field} is unresolved at ${base}`);
    }
  }
  return record;
}

async function prepareModelGrader(
  root: string,
  req: WorkflowRequest,
  blind: JsonObject,
  grader: JsonObject,
  item: JsonObject,
  itemPath: string,
  targetStage: "judge" | "adjudicate",
  adjudication: GradingJob["adjudication"],
  design: SealBinding,
  execution: SealBinding,
): Promise<GradingJob> {
  const graderId = String(grader.grader_id);
  const revision = String(grader.revision);
  const blindId = String(blind.blind_id);
  const base = `grader-runs/${blindId}/${graderId}-${revision}`;
  assertSafePath(grader.prompt_path, `model grader ${graderId} prompt_path`);
  assertSafePath(grader.output_schema_path, `model grader ${graderId} output_schema_path`);
  const prompt = await readRequired(join(root, grader.prompt_path));
  const outputSchema = JSON.parse(await readRequired(join(root, grader.output_schema_path))) as JsonObject;
  assert(outputSchema && typeof outputSchema === "object" && !Array.isArray(outputSchema), `model grader ${graderId} output schema is invalid`);
  const graderModel = grader.model as JsonObject;
  assert(graderModel && typeof graderModel.requested === "string" && graderModel.requested.length > 0,
    `model grader ${graderId} lacks requested model`);
  const native = grader.provider_native && typeof grader.provider_native === "object" ? grader.provider_native as JsonObject : {};
  assert(Number.isInteger(native.timeout_ms) && native.timeout_ms >= 1000 &&
    native.effective_timeout_ms === native.timeout_ms, `model grader ${graderId} lacks proven effective timeout evidence`);
  assertSafePath(native.timeout_evidence_path, `model grader ${graderId} timeout_evidence_path`);
  const timeoutEvidence = await readJson(join(root, native.timeout_evidence_path));
  assert(timeoutEvidence.schema_version === 1 && timeoutEvidence.status === "passed" &&
    timeoutEvidence.benchmark_id === req.benchmark_id && timeoutEvidence.grader_id === graderId &&
    timeoutEvidence.grader_revision === revision && timeoutEvidence.requested_timeout_ms === native.timeout_ms &&
    timeoutEvidence.effective_timeout_ms === native.timeout_ms && timeoutEvidence.design_revision === design.revision &&
    timeoutEvidence.design_manifest_sha256 === design.manifest_sha256 && timeoutEvidence.execution_revision === execution.revision &&
    timeoutEvidence.execution_manifest_sha256 === execution.manifest_sha256,
    `model grader ${graderId} timeout evidence is stale or incomplete`);
  const requestValue: AgentRunRequest = {
    name: `grader-${blindId}-${graderId}`.slice(0, 120),
    task: `${prompt}\n\nBLINDED ITEM:\n${JSON.stringify(item)}`,
    runner: parseRunner(native.runner === undefined ? req.requested_runtime : native.runner, `model grader ${graderId} runner`),
    model: graderModel.requested,
    transport: parseTransport(native.transport === undefined ? "process" : native.transport, `model grader ${graderId} transport`),
    thinking: parseThinking(native.thinking, `model grader ${graderId} thinking`),
    tools: parseTools(native.tools === undefined ? [] : native.tools, `model grader ${graderId} tools`),
    timeoutMs: native.timeout_ms,
    extensions: false,
    recursive: false,
    schema: outputSchema,
  };
  validateAgentRunRequest(requestValue, `grader request ${blindId}/${graderId}`);
  return { blind, grader, item, itemPath, targetStage, adjudication, request: requestValue, base, design, execution };
}

async function runModelGrader(root: string, req: WorkflowRequest, job: GradingJob): Promise<JsonObject> {
  const graderId = String(job.grader.grader_id);
  const blindId = String(job.blind.blind_id);
  const revision = String(job.grader.revision);
  let result: JsonObject | null = null;
  let log: JsonObject | null = null;
  let thrown: string | null = null;
  authorizeCall(`${blindId}-${graderId}-${revision}`, req);
  const assignedAt = now();
  assert(req.stage === job.targetStage, `grader ${blindId}/${graderId} is not eligible in ${req.stage}`);
  const assignment: JsonObject = job.adjudication === null ? {
    schema_version: 1,
    benchmark_id: req.benchmark_id,
    blind_id: blindId,
    grader_id: graderId,
    grader_revision: revision,
    assigned_at: assignedAt,
    stage: "judge",
    runtime_capability_binding: req.runtime_capability_binding,
    call_plan_binding: req.call_plan_binding,
    delta_seal_references: req.delta_seal_references,
    design_revision: job.design.revision,
    design_manifest_sha256: job.design.manifest_sha256,
    execution_revision: job.execution.revision,
    execution_manifest_sha256: job.execution.manifest_sha256,
    request_path: `${job.base}/request.json`,
    traffic_class: "grader-separate-from-measured-attempts",
  } : {
    schema_version: 1,
    benchmark_id: req.benchmark_id,
    plan_revision: job.adjudication.planRevision,
    attempt_id: job.adjudication.attemptId,
    task_id: job.adjudication.taskId,
    blind_id: blindId,
    grader_id: graderId,
    grader_revision: revision,
    stage: "adjudicate",
    assigned_at: assignedAt,
    request_path: `${job.base}/request.json`,
    runtime_capability_binding: req.runtime_capability_binding,
    call_plan_binding: req.call_plan_binding,
    traffic_class: "adjudication",
    delta_seal_references: req.delta_seal_references.map((reference) => ({
      seal_type: reference.seal_type,
      revision: reference.revision.replace(/^(?:design|execution|raw|postscore|analysis)-/, ""),
    })),
  };
  await artifactStore.publish(root, `${job.base}/assignment.json`, assignment);
  assignedWorkIds.add(`${blindId}-${graderId}-${revision}`);
  agentCalls += 1;
  graderAgentCalls += 1;
  try {
    result = await agents.run(job.request);
    if (fabricTimestamp(result.startedAt) === null || fabricTimestamp(result.finishedAt) === null) {
      thrown = "model grader Fabric result lacks valid numeric startedAt/finishedAt evidence";
    }
    if (typeof result.id === "string") log = await captureReturnedLog(root, `${job.base}/log.raw.jsonl`, result);
  } catch (error) {
    thrown = message(error);
  } finally {
    await artifactStore.publish(root, `${job.base}/result.raw.json`, {
      schema_version: 1,
      benchmark_id: req.benchmark_id,
      blind_id: blindId,
      grader_id: graderId,
      exact_request: job.request,
      fabric_result: result,
      thrown_error: thrown,
    });
    if (log !== null) await artifactStore.publish(root, `${job.base}/log.receipt.json`, log);
  }
  const value = result && result.value && typeof result.value === "object" ? result.value as JsonObject : {};
  const completed = result?.status === "completed" && thrown === null;
  const validOutcome = completed && ["passed", "failed", "abstained"].includes(value.status);
  const errorCriteria = (job.grader.criteria as JsonObject[]).map((criterion) => ({
    criterion_id: criterion.criterion_id,
    status: "error",
    score: null,
    rationale: thrown ?? "grader returned no valid schema-bound outcome",
  }));
  const finishedAt = result ? fabricTimestamp(result.finishedAt) : null;
  const record: JsonObject = {
    schema_version: 1,
    benchmark_id: req.benchmark_id,
    attempt_id: String(job.blind.attempt_id),
    blind_id: blindId,
    grader_id: graderId,
    grader_revision: revision,
    grader_run_id: result && typeof result.id === "string" ? result.id : null,
    stage: job.targetStage,
    ...typedStatus(
      validOutcome ? value.status : "grader-error",
      validOutcome ? ["model-terminal"] : [thrown ? "runtime-error" : "schema-invalid"],
    ),
    failure: validOutcome ? null : {
      stage: job.targetStage,
      code: thrown ? "grader-runtime-error" : "grader-schema-invalid",
      classification: "grader-error",
      message: thrown ?? "grader returned no valid schema-bound outcome",
      retryable: false,
    },
    score: validOutcome && (typeof value.score === "number" || value.score === null) ? value.score : null,
    criterion_results: validOutcome && Array.isArray(value.criterion_results) ? value.criterion_results : errorCriteria,
    evidence_paths: [job.itemPath, `${job.base}/result.raw.json`, ...(log ? [
      `${job.base}/log.raw.jsonl`, `${job.base}/log.archive.json`, `${job.base}/log.scan.json`, `${job.base}/log.receipt.json`,
    ] : [])],
    graded_at: finishedAt ?? now(),
    provider_native: {
      raw_result: result,
      thrown_error: thrown,
      requested_model: job.request.model,
      resolved_model: result && typeof result.model === "string" ? result.model : null,
      observed_model: null,
      usage: usageProjection(result),
      aggregate_tool_call_count: result && typeof result.toolCalls === "number" ? result.toolCalls : null,
      runner_session_id: result && typeof result.runnerSessionId === "string" ? result.runnerSessionId : null,
      assigned_at: assignedAt,
    },
  };
  validateBlindGrade(record, job.blind, job.grader, job.base);
  await artifactStore.publish(root, `${job.base}/result.json`, record);
  const terminal: JsonObject = job.adjudication === null ? {
    schema_version: 1,
    benchmark_id: req.benchmark_id,
    blind_id: blindId,
    grader_id: graderId,
    grader_revision: revision,
    stage: "judge",
    status: record.status,
    result_path: `${job.base}/result.json`,
    raw_path: `${job.base}/result.raw.json`,
    log_path: log ? `${job.base}/log.raw.jsonl` : null,
    terminal_at: now(),
  } : {
    schema_version: 1,
    benchmark_id: req.benchmark_id,
    plan_revision: job.adjudication.planRevision,
    attempt_id: job.adjudication.attemptId,
    task_id: job.adjudication.taskId,
    blind_id: blindId,
    grader_id: graderId,
    grader_revision: revision,
    stage: "adjudicate",
    status: record.status,
    terminal_at: now(),
    result_path: `${job.base}/result.json`,
    result_sha256: await sha256File(join(root, `${job.base}/result.json`), "adjudication result"),
    raw_path: `${job.base}/result.raw.json`,
    raw_sha256: await sha256File(join(root, `${job.base}/result.raw.json`), "adjudication raw result"),
    log_path: log ? `${job.base}/log.raw.jsonl` : null,
  };
  await artifactStore.publish(root, `${job.base}/terminal.json`, terminal);
  completedWorkIds.add(`${blindId}-${graderId}-${revision}`);
  return record;
}

async function runAnalyze(root: string, req: WorkflowRequest): Promise<JsonObject> {
  await workflow.phase("Frame", { total: 1 });
  assert(!req.dry_run, "Analyze dry-run is not a grading run; use Audit dry-run");
  assert(req.design_revision !== null && req.execution_revision !== null && req.analysis_revision !== null,
    "Analyze requires design_revision, execution_revision, and analysis_revision");
  const analysisBase = `analysis/${req.analysis_revision}`;
  const stagingBase = `${analysisBase}/staging/${req.request_id}`;
  const checkpointBase = `${analysisBase}/checkpoints/${req.request_id}`;
  const commitPath = `${analysisBase}/commit.json`;
  if (await fileState(join(root, commitPath)) === "file") {
    assert(req.stage === "finalize", "a committed analysis revision cannot accept more grading calls");
    const committed = await readJson(join(root, commitPath));
    assert(committed.status === "committed" && committed.analysis_revision === req.analysis_revision &&
      committed.benchmark_id === req.benchmark_id, "analysis commit identity is stale");
    return {
      schema_version: 1, ...typedStatus("complete", ["already-committed"]),
      route: "Analyze", stage: req.stage, request_id: req.request_id, benchmark_id: req.benchmark_id,
      complete: true, failure: null, evidence: [commitPath], blockers: [],
    };
  }
  await workflow.phase("Freeze raw outputs", { total: 3 });
  await validateSchemas();
  const designBinding = await sealBinding(root, req.design_revision, "design");
  const executionBinding = await sealBinding(root, req.execution_revision, "execution");
  const rawRevision = `raw-${req.execution_revision.replace(/^execution-/, "")}`;
  const rawBinding = await sealBinding(root, rawRevision, "raw-freeze");

  const schedule = await loadSchedule(root, req.benchmark_id);
  await workflow.phase("Reconcile", { total: 1 });
  const executionReconciliation = await reconcile(root, schedule, req, false, `${stagingBase}/execution`);
  assert(executionReconciliation.complete === true, "Analyze requires exact execution reconciliation");

  const analysisConfig = await readJson(join(root, "analysis-plan.json"));
  assert(Number.isInteger(analysisConfig.blind_seed), "analysis-plan.json requires an integer blind_seed");
  await workflow.phase("Blind grade", { total: schedule.length });
  await createOrVerifyBlindMaps(root, analysisConfig.blind_seed);
  const privateMap = await readJson(join(root, "blind-map.private.json"));
  const rows = privateMap.rows as JsonObject[];
  assert(Array.isArray(rows) && rows.length === schedule.length, "private blind map is incomplete");

  const adjudicatorIds = Array.isArray(analysisConfig.adjudicator_ids) ? analysisConfig.adjudicator_ids as unknown[] : [];
  assert(adjudicatorIds.every((value) => typeof value === "string" && ID.test(value)) &&
    new Set(adjudicatorIds).size === adjudicatorIds.length,
    "analysis-plan.json adjudicator_ids must be unique contract IDs");
  const adjudicationPlanRevision = analysisConfig.adjudication_plan_revision ?? "v1";
  assert(typeof adjudicationPlanRevision === "string" && /^v[1-9][0-9]*$/.test(adjudicationPlanRevision),
    "analysis-plan.json adjudication_plan_revision must be vN");
  const adjudicationPlanPath = `${analysisBase}/adjudication-plan.json`;

  const existingGrades = new Map<string, JsonObject>();
  const gradeOrder: string[] = [];
  const jobs: GradingJob[] = [];
  const judgeKeys: string[] = [];
  const blindContexts: Array<{ blind: JsonObject; task: JsonObject; item: JsonObject; itemPath: string }> = [];
  const jobCallId = (job: GradingJob): string => `${job.blind.blind_id}-${job.grader.grader_id}-${job.grader.revision}`;
  const gradeKey = (blind: JsonObject, grader: JsonObject): string =>
    `${blind.blind_id}/${grader.grader_id}@${grader.revision}`;

  const inspectGrader = async (
    blind: JsonObject,
    grader: JsonObject,
    item: JsonObject,
    itemPath: string,
    targetStage: "judge" | "adjudicate",
    adjudication: GradingJob["adjudication"],
  ): Promise<void> => {
    const base = `grader-runs/${blind.blind_id}/${grader.grader_id}-${grader.revision}`;
    const key = gradeKey(blind, grader);
    gradeOrder.push(key);
    if (targetStage === "judge") judgeKeys.push(key);
    const assignmentState = await fileState(join(root, `${base}/assignment.json`));
    const terminalState = await fileState(join(root, `${base}/terminal.json`));
    const resultState = await fileState(join(root, `${base}/result.json`));
    if (terminalState === "file") {
      assert(resultState === "file", `grader terminal lacks result: ${key}`);
      if (grader.kind === "model") assert(assignmentState === "file", `model grader terminal lacks assignment: ${key}`);
      const record = await loadExistingGrade(root, blind, grader, base, designBinding, executionBinding);
      assert(record.stage === targetStage, `grader ${key} has stage ${record.stage}, expected ${targetStage}`);
      existingGrades.set(key, record);
      if (grader.kind === "model") {
        assignedWorkIds.add(`${blind.blind_id}-${grader.grader_id}-${grader.revision}`);
        completedWorkIds.add(`${blind.blind_id}-${grader.grader_id}-${grader.revision}`);
        const prepared = await prepareModelGrader(
          root, req, blind, grader, item, itemPath, targetStage, adjudication, designBinding, executionBinding,
        );
        assert(await fileState(join(root, `${base}/request.json`)) === "file", `resumed model grader request is missing: ${key}`);
        await artifactStore.publish(root, `${base}/request.json`, prepared.request, "json");
      }
      return;
    }
    assert(assignmentState === "missing" && resultState === "missing", `ambiguous grader state; replay refused: ${key}`);
    for (const stale of ["result.raw.json", "log.raw.jsonl", "log.receipt.json"]) {
      assert(await fileState(join(root, `${base}/${stale}`)) === "missing", `unassigned grader has stale ${stale}; replay refused: ${key}`);
    }
    assert(grader.kind === "model", `deterministic or human grade is missing: ${key}`);
    if (req.stage === targetStage || (req.stage === "prepare" && targetStage === "judge")) {
      jobs.push(await prepareModelGrader(
        root, req, blind, grader, item, itemPath, targetStage, adjudication, designBinding, executionBinding,
      ));
    }
  };

  for (const blind of rows) {
    assertId(blind.blind_id, "blind_id");
    assertId(blind.attempt_id, "blind attempt_id");
    assertId(blind.task_id, "blind task_id");
    const scheduleRow = schedule.find((row) => row.attempt_id === blind.attempt_id);
    assert(scheduleRow && scheduleRow.task_id === blind.task_id, `blind map schedule binding failed for ${blind.blind_id}`);
    const terminal = await readJson(join(root, `attempts/${blind.attempt_id}/terminal.json`));
    await validateContract(root, "task", `tasks/${blind.task_id}.json`);
    const task = await readJson(join(root, `tasks/${blind.task_id}.json`));
    assert(Array.isArray(task.grader_ids) && task.grader_ids.length >= 2,
      `task ${blind.task_id} requires at least two independent judge graders`);
    assert(adjudicatorIds.every((id) => !(task.grader_ids as unknown[]).includes(id)),
      `task ${blind.task_id} reuses a judge as an adjudicator`);
    const aliases = await createBlindEvidenceAliases(root, blind, task);
    const itemPath = `blinded/${blind.blind_id}/item.json`;
    const item: JsonObject = {
      schema_version: 1,
      blind_id: blind.blind_id,
      task_id: blind.task_id,
      attempt_status: terminal.status,
      startup_state: terminal.startup_state,
      output: terminal.fabric_result?.output ?? null,
      error: terminal.fabric_result?.error ?? null,
      frozen_evidence_paths: aliases,
    };
    await artifactStore.publish(root, `blinded/${blind.blind_id}/item.json`, item, "json");
    blindContexts.push({ blind, task, item, itemPath });
    for (const graderId of task.grader_ids as string[]) {
      await validateContract(root, "grader", `graders/${graderId}.json`);
      const grader = await readJson(join(root, `graders/${graderId}.json`));
      assert(grader.benchmark_id === req.benchmark_id && grader.grader_id === graderId,
        `grader identity mismatch: ${graderId}`);
      await inspectGrader(blind, grader, item, itemPath, "judge", null);
    }
  }

  if (req.stage === "prepare") {
    const preparedCallIds = jobs.map(jobCallId);
    const preparationPath = `${stagingBase}/preparation.json`;
    await artifactStore.publish(root, preparationPath, {
      schema_version: 1,
      benchmark_id: req.benchmark_id,
      analysis_revision: req.analysis_revision,
      request_id: req.request_id,
      execution_reconciliation_path: executionReconciliation.events_path,
      blind_map_public_sha256: await sha256File(join(root, "blind-map.public.json"), "public blind map"),
      blind_map_private_sha256: await sha256File(join(root, "blind-map.private.json"), "private blind map"),
      blind_map_commit_path: "blind-map.commit.json",
      prepared_call_ids: preparedCallIds,
      existing_terminal_call_ids: [...completedWorkIds].sort(),
      model_calls: 0,
    }, "json");
    const checkpointPath = `${checkpointBase}/receipt.json`;
    const checkpoint = {
      schema_version: 1, ...typedStatus("checkpoint", ["analysis-prepared"]),
      route: "Analyze", stage: req.stage, request_id: req.request_id, benchmark_id: req.benchmark_id,
      analysis_revision: req.analysis_revision, prepared_call_ids: preparedCallIds,
      completed_call_ids: [...completedWorkIds].sort(), deferred_call_ids: preparedCallIds,
      canonical_outputs_published: false, complete: false, failure: null, next_stage: "judge",
      blockers: [], evidence: ["blind-map.commit.json", preparationPath, executionReconciliation.events_path, executionReconciliation.ledger_path],
    };
    await artifactStore.publish(root, checkpointPath, checkpoint);
    return checkpoint;
  }

  const runPendingJobs = async (): Promise<{ launched: GradingJob[]; deferred: GradingJob[] }> => {
    const eligibleIds = new Set(jobs.map(jobCallId));
    if (callPlan !== null) {
      assert([...plannedCallIds].every((id) => eligibleIds.has(id)),
        `call plan contains terminal or stage-ineligible work: ${[...plannedCallIds].filter((id) => !eligibleIds.has(id)).join(", ")}`);
    }
    const invocationCapacity = Math.max(0, Math.min(
      req.max_agents - agentCalls,
      EFFECTIVE_MAX_AGENT_CALLS - agentCalls,
      callPlan?.max_calls ?? req.max_agents,
    ));
    const plannedJobs = callPlan === null ? jobs : jobs.filter((job) => plannedCallIds.has(jobCallId(job)));
    const launched = req.stage === "finalize" ? [] : plannedJobs.slice(0, invocationCapacity);
    const deferred = jobs.filter((job) => !launched.includes(job));
    for (const job of launched) await artifactStore.publish(root, `${job.base}/request.json`, job.request, "json");
    const newGrades = await boundedMap(launched, req.max_concurrency, (job) => runModelGrader(root, req, job));
    for (let index = 0; index < launched.length; index += 1) {
      existingGrades.set(gradeKey(launched[index].blind, launched[index].grader), newGrades[index]);
    }
    return { launched, deferred };
  };

  if (req.stage === "judge") {
    assert(jobs.every((job) => job.targetStage === "judge"), "judge invocation selected non-judge work");
    const { launched, deferred } = await runPendingJobs();
    if (deferred.length > 0) {
      const checkpointPath = `${checkpointBase}/receipt.json`;
      const checkpoint = {
        schema_version: 1, ...typedStatus("checkpoint", ["call-cap-bounded", "grading-incomplete"]),
        route: "Analyze", stage: req.stage, request_id: req.request_id, benchmark_id: req.benchmark_id,
        completed_call_ids: launched.map(jobCallId), deferred_call_ids: deferred.map(jobCallId),
        canonical_outputs_published: false, complete: false, failure: null, next_stage: "judge", blockers: [],
        evidence: launched.map((job) => `${job.base}/terminal.json`),
      };
      await artifactStore.publish(root, checkpointPath, checkpoint);
      return checkpoint;
    }
    const judgeRecords = judgeKeys.map((key) => {
      const grade = existingGrades.get(key);
      assert(grade, `judge stage did not settle ${key}`);
      return grade;
    });
    const stagedGradesPath = `${stagingBase}/grading-matrix.jsonl`;
    await artifactStore.publish(root, stagedGradesPath, judgeRecords, "jsonl");
    const checkpointPath = `${checkpointBase}/receipt.json`;
    const checkpoint = {
      schema_version: 1, ...typedStatus("checkpoint", ["judges-reconciled"]),
      route: "Analyze", stage: req.stage, request_id: req.request_id, benchmark_id: req.benchmark_id,
      grade_count: judgeRecords.length, required_grade_count: judgeKeys.length,
      canonical_outputs_published: false, complete: false, failure: null, next_stage: "adjudicate",
      blockers: [], evidence: [stagedGradesPath],
    };
    await artifactStore.publish(root, checkpointPath, checkpoint);
    return checkpoint;
  }

  assert(judgeKeys.every((key) => existingGrades.has(key)),
    "adjudication/finalize requires every judge terminal");
  const adjudicationJobs: JsonObject[] = [];
  for (const context of blindContexts) {
    const judgeRecords = (context.task.grader_ids as string[]).map((graderId) => {
      const exactKey = judgeKeys.find((key) => key.startsWith(`${context.blind.blind_id}/${graderId}@`));
      const grade = exactKey === undefined ? undefined : existingGrades.get(exactKey);
      assert(grade, `adjudication source grade is missing: ${context.blind.blind_id}/${graderId}`);
      return grade;
    });
    const decisions = new Set(judgeRecords.map((grade) => JSON.stringify({
      status: grade.status,
      score: grade.score,
      criteria: Array.isArray(grade.criterion_results) ? grade.criterion_results.map((criterion: JsonObject) => [
        criterion.criterion_id, criterion.status, criterion.score,
      ]) : [],
    })));
    if (decisions.size < 2) continue;
    assert(adjudicatorIds.length > 0, `judge disagreement for ${context.blind.blind_id} has no distinct adjudicator`);
    const sourceJudgeResults: JsonObject[] = [];
    for (const grade of judgeRecords) {
      const resultPath = `grader-runs/${context.blind.blind_id}/${grade.grader_id}-${grade.grader_revision}/result.json`;
      sourceJudgeResults.push({
        grader_id: grade.grader_id,
        grader_revision: grade.grader_revision,
        result_path: resultPath,
        result_digest: await sha256File(join(root, resultPath), "adjudication source result"),
      });
    }
    for (const adjudicatorId of adjudicatorIds as string[]) {
      await validateContract(root, "grader", `graders/${adjudicatorId}.json`);
      const grader = await readJson(join(root, `graders/${adjudicatorId}.json`));
      assert(grader.benchmark_id === req.benchmark_id && grader.grader_id === adjudicatorId,
        `adjudicator identity mismatch: ${adjudicatorId}`);
      const planJob = {
        attempt_id: context.blind.attempt_id,
        blind_id: context.blind.blind_id,
        task_id: context.blind.task_id,
        adjudicator_id: adjudicatorId,
        adjudicator_revision: grader.revision,
        source_judge_results: sourceJudgeResults,
      };
      adjudicationJobs.push(planJob);
      const itemPath = `blinded/${context.blind.blind_id}/adjudication-${adjudicatorId}.json`;
      const item = {
        ...context.item,
        adjudication_source_judge_results: sourceJudgeResults,
        adjudication_source_outcomes: judgeRecords,
      };
      await artifactStore.publish(root, itemPath, item, "json");
      await inspectGrader(context.blind, grader, item, itemPath, "adjudicate", {
        planRevision: adjudicationPlanRevision,
        attemptId: String(context.blind.attempt_id),
        taskId: String(context.blind.task_id),
      });
    }
  }
  const adjudicationPlan = {
    schema_version: 1,
    benchmark_id: req.benchmark_id,
    plan_revision: adjudicationPlanRevision,
    jobs: adjudicationJobs,
    notes: "Generated deterministically from digest-bound disagreements among every frozen task judge.",
  };
  await artifactStore.publish(root, adjudicationPlanPath, adjudicationPlan, "json");
  await validateContract(root, "adjudication-plan", adjudicationPlanPath);

  if (req.stage === "adjudicate") {
    assert(jobs.every((job) => job.targetStage === "adjudicate"), "adjudicate invocation selected non-adjudicator work");
    const { launched, deferred } = await runPendingJobs();
    if (deferred.length > 0) {
      const checkpointPath = `${checkpointBase}/receipt.json`;
      const checkpoint = {
        schema_version: 1, ...typedStatus("checkpoint", ["call-cap-bounded", "adjudication-incomplete"]),
        route: "Analyze", stage: req.stage, request_id: req.request_id, benchmark_id: req.benchmark_id,
        completed_call_ids: launched.map(jobCallId), deferred_call_ids: deferred.map(jobCallId),
        canonical_outputs_published: false, complete: false, failure: null, next_stage: "adjudicate", blockers: [],
        evidence: launched.map((job) => `${job.base}/terminal.json`),
      };
      await artifactStore.publish(root, checkpointPath, checkpoint);
      return checkpoint;
    }
    const adjudicationKeys = gradeOrder.filter((key) => !judgeKeys.includes(key));
    assert(adjudicationKeys.every((key) => existingGrades.has(key)), "adjudication stage did not settle its exact plan");
    const adjudicationRecords = gradeOrder.map((key) => existingGrades.get(key)).filter((grade): grade is JsonObject => grade !== undefined);
    const stagedGradesPath = `${stagingBase}/grading-matrix.jsonl`;
    await artifactStore.publish(root, stagedGradesPath, adjudicationRecords, "jsonl");
    const checkpointPath = `${checkpointBase}/receipt.json`;
    const checkpoint = {
      schema_version: 1, ...typedStatus("checkpoint", ["adjudications-reconciled"]),
      route: "Analyze", stage: req.stage, request_id: req.request_id, benchmark_id: req.benchmark_id,
      grade_count: adjudicationRecords.length, required_grade_count: gradeOrder.length,
      canonical_outputs_published: false, complete: false, failure: null, next_stage: "finalize",
      blockers: [], evidence: [stagedGradesPath, adjudicationPlanPath],
    };
    await artifactStore.publish(root, checkpointPath, checkpoint);
    return checkpoint;
  }

  assert(req.stage === "finalize", `unsupported Analyze stage after preparation: ${req.stage}`);
  assert(jobs.length === 0, "finalize is deterministic and cannot launch missing graders or adjudicators");
  assert(new Set(gradeOrder).size === gradeOrder.length, "duplicate blind/grader identity in the expected grade matrix");
  const gradeRecords = gradeOrder.map((key) => {
    const grade = existingGrades.get(key);
    assert(grade, `finalize has no settled source for ${key}`);
    return grade;
  });
  for (const record of gradeRecords) {
    await validateContract(root, "result", `grader-runs/${record.blind_id}/${record.grader_id}-${record.grader_revision}/result.json`);
  }
  const requiredGradeKeys = [
    ...(Array.isArray(analysisConfig.required_grade_keys) ? analysisConfig.required_grade_keys : []),
    ...(Array.isArray(analysisConfig.required_adjudication_keys) ? analysisConfig.required_adjudication_keys : []),
  ];
  assert(requiredGradeKeys.every((key) => typeof key === "string" && gradeOrder.includes(key)),
    "required grade/adjudication matrix did not reconcile");
  const outputsBase = `${analysisBase}/outputs`;
  const gradesOutputPath = `${outputsBase}/grades.jsonl`;
  assert(await fileState(join(root, gradesOutputPath)) === "missing",
    "canonical grades.jsonl exists without the analysis commit marker");
  const stagedGradesPath = `${stagingBase}/grading-matrix.jsonl`;
  await artifactStore.publish(root, stagedGradesPath, gradeRecords, "jsonl");

  await workflow.phase("Aggregate telemetry", { total: 1 });
  const telemetryRows: JsonObject[] = [];
  const telemetryUnknownAttemptIds: string[] = [];
  for (const row of schedule) {
    const terminal = await readJson(join(root, `attempts/${row.attempt_id}/terminal.json`));
    const nested = Array.isArray(terminal.fabric_result?.provider_native?.nested_agents) ?
      terminal.fabric_result.provider_native.nested_agents as JsonObject[] : [];
    const agentId = terminal.fabric_result?.agent_id;
    if (typeof agentId !== "string" || agentId.length === 0) {
      assert(terminal.status === "prelaunch-failed", `launched attempt ${row.attempt_id} lacks a Fabric agent ID`);
      telemetryUnknownAttemptIds.push(row.attempt_id);
      continue;
    }
    const started = typeof terminal.started_at === "string" ? Date.parse(terminal.started_at) : NaN;
    const ended = typeof terminal.terminal_at === "string" ? Date.parse(terminal.terminal_at) : NaN;
    const directUsage = terminal.fabric_result.usage as JsonObject;
    const toolCount = terminal.fabric_result.provider_native?.aggregate_tool_call_count;
    const entity = {
      agent_id: agentId,
      parent_agent_id: null,
      session_id: terminal.fabric_result.session_id,
      requested_model: terminal.requested_model,
      resolved_model: terminal.resolved_model,
      observed_model: terminal.observed_model,
      direct_usage: directUsage,
      tool_calls: typeof toolCount === "number" ? [{ name: "__aggregate_unknown_names__", count: toolCount, failed: 0 }] : [],
      latency_ms: Number.isFinite(started) && Number.isFinite(ended) && ended >= started ? Math.round(ended - started) : null,
      provider_native: {
        usage_scope: "direct",
        tool_evidence: "aggregate count plus immutable runner log; names and failures remain unknown",
        latency_boundary: { start: "FabricAgentResult.startedAt", end: "attempt terminal_at", clock: "runtime wall clock" },
      },
    };
    const childEntities = nested.map((child, index) => {
      assert(typeof child.id === "string" && child.id.length > 0, `nested agent ${index + 1} of ${row.attempt_id} lacks an ID`);
      return {
        agent_id: child.id,
        parent_agent_id: agentId,
        session_id: typeof child.sessionId === "string" ? child.sessionId : null,
        requested_model: null,
        resolved_model: typeof child.model === "string" ? child.model : null,
        observed_model: null,
        direct_usage: usageProjection(child),
        tool_calls: typeof child.toolCalls === "number" ? [{ name: "__aggregate_unknown_names__", count: child.toolCalls, failed: 0 }] : [],
        latency_ms: null,
        provider_native: { source: "FabricAgentResult.nestedAgents", index, usage_scope: "direct-if-runtime-capability-bound" },
      };
    });
    const directRecords = [directUsage, ...childEntities.map((child) => child.direct_usage)] as JsonObject[];
    const sumField = (field: string): number | null => directRecords.every((usage) => Number.isInteger(usage[field]) && usage[field] >= 0) ?
      directRecords.reduce((total, usage) => total + Number(usage[field]), 0) : null;
    const subtreeUsage = {
      input_tokens: sumField("input_tokens"),
      output_tokens: sumField("output_tokens"),
      cache_read_tokens: sumField("cache_read_tokens"),
      cache_write_tokens: sumField("cache_write_tokens"),
      cost_usd: null,
      provider_native: {
        projection_version: runtimeCapabilities?.telemetry_projection_version ?? "fabric-result-v1",
        scope: "sum-of-unique-direct-records",
        "raw_costs_not_summed_without_versioned_unit_receipt": true,
      },
    };
    telemetryRows.push({
      schema_version: 1,
      benchmark_id: req.benchmark_id,
      attempt_id: row.attempt_id,
      estimate_version: runtimeCapabilities?.telemetry_projection_version ?? "fabric-result-v1",
      parent: entity,
      children: childEntities,
      child_ownership: childEntities.map((child) => ({
        child_agent_id: child.agent_id,
        owner_agent_id: agentId,
        settlement_artifact_path: `attempts/${row.attempt_id}/children.json`,
      })),
      subtree_usage: subtreeUsage,
    });
  }
  const stagedTelemetryPath = `${stagingBase}/telemetry.jsonl`;
  await artifactStore.publish(root, stagedTelemetryPath, telemetryRows, "jsonl");
  const telemetryCovered = [...telemetryRows.map((row) => String(row.attempt_id)), ...telemetryUnknownAttemptIds];
  assert(telemetryCovered.length === schedule.length && new Set(telemetryCovered).size === schedule.length &&
    schedule.every((row) => telemetryCovered.includes(row.attempt_id)),
    "telemetry rows plus explicit prelaunch unknowns do not cover the schedule exactly");
  assert(scratchPath !== null, "scratch directory is unavailable");
  const telemetryAggregateScratch = `${scratchPath}/telemetry-aggregate.json`;
  let telemetryAggregate: JsonObject;
  if (telemetryRows.length > 0) {
    await requireGate(
      `python -B ${shell(`${SKILL_ROOT}/scripts/aggregate_telemetry.py`)} ` +
      `--input ${shell(join(root, stagedTelemetryPath))} --output ${shell(telemetryAggregateScratch)}`,
      "telemetry aggregation",
    );
    telemetryAggregate = await readJson(telemetryAggregateScratch);
  } else {
    telemetryAggregate = {
      schema_version: 1,
      record_count: 0,
      status: "all-entity-identities-unknown",
      unknown_attempt_ids: telemetryUnknownAttemptIds,
      totals: null,
    };
  }
  const stagedTelemetryAggregatePath = `${stagingBase}/telemetry-aggregate.json`;
  await artifactStore.publish(root, stagedTelemetryAggregatePath, telemetryAggregate, "json");

  await workflow.phase("Analyze", { total: 1 });
  const gradesByAttempt = new Map<string, number[]>();
  for (const grade of gradeRecords) {
    assert(typeof grade.score === "number", `grade ${grade.attempt_id}/${grade.grader_id} has no numeric score`);
    const values = gradesByAttempt.get(String(grade.attempt_id)) ?? [];
    values.push(grade.score);
    gradesByAttempt.set(String(grade.attempt_id), values);
  }
  const analysisRecords = schedule.map((row) => {
    const values = gradesByAttempt.get(row.attempt_id) ?? [];
    assert(values.length > 0, `attempt ${row.attempt_id} has no grade in the analysis denominator`);
    return {
      task_id: row.task_id,
      condition_id: row.condition_id,
      repetition: row.repetition,
      score: values.reduce((sum, value) => sum + value, 0) / values.length,
    };
  });
  const analysisInput: JsonObject = { schema_version: 1, records: analysisRecords };
  for (const key of ["control", "candidate", "direction", "practical_threshold", "noninferiority_margin", "seed",
    "bootstrap_draws", "confidence_level", "alternative", "alpha", "multiplicity", "task_weights", "sample_scope",
    "quality_veto", "integrity_veto", "inferential_gate_frozen"]) {
    if (analysisConfig[key] !== undefined) analysisInput[key] = analysisConfig[key];
  }
  const stagedAnalysisInputPath = `${stagingBase}/analysis-input.json`;
  await artifactStore.publish(root, stagedAnalysisInputPath, analysisInput, "json");
  assert(scratchPath !== null, "scratch directory is unavailable");
  const analysisScratch = `${scratchPath}/analysis.json`;
  await requireGate(
    `python -B ${shell(`${SKILL_ROOT}/scripts/analyze_paired.py`)} --input ${shell(join(root, stagedAnalysisInputPath))} ` +
    `--output ${shell(analysisScratch)}`,
    "paired analysis",
  );
  const analysisResult = await readJson(analysisScratch);
  assert(["practical-superiority", "non-inferior", "inconclusive", "blocked-by-veto"].includes(analysisResult.decision),
    "paired analysis returned no supported decision");
  assert(typeof analysisResult.claims_limit === "string" && analysisResult.claims_limit.length > 0,
    "paired analysis returned no claims limit");
  const stagedAnalysisPath = `${stagingBase}/analysis.json`;
  await artifactStore.publish(root, stagedAnalysisPath, analysisResult, "json");

  await workflow.phase("Reconcile", { total: 1 });
  const sealReceipts = [
    await publishSealReceipt(root, designBinding),
    await publishSealReceipt(root, executionBinding),
    await publishSealReceipt(root, rawBinding),
  ];
  const stagedTelemetryCoveragePath = `${stagingBase}/telemetry-coverage.json`;
  await artifactStore.publish(root, stagedTelemetryCoveragePath, {
    schema_version: 1,
    benchmark_id: req.benchmark_id,
    scheduled_attempt_ids: schedule.map((row) => row.attempt_id),
    entity_telemetry_attempt_ids: telemetryRows.map((row) => row.attempt_id),
    prelaunch_unknown_attempt_ids: telemetryUnknownAttemptIds,
    complete_without_fabricated_ids: true,
  }, "json");
  const emptyTelemetry = await stage("reconcile-empty-telemetry.jsonl", "");
  const reconciliationTelemetry = telemetryUnknownAttemptIds.length > 0 ? emptyTelemetry : join(root, stagedTelemetryPath);
  const finalGate = await bash(
    `python -B ${shell(`${SKILL_ROOT}/scripts/reconcile_lifecycle.py`)} --root ${shell(root)} --require-graders ` +
    `--schedule schedule.jsonl --events ${shell(executionReconciliation.events_path)} ` +
    `--ledger ${shell(executionReconciliation.ledger_path)} --attempts-dir attempts ` +
    `--grades ${shell(stagedGradesPath)} --telemetry ${shell(reconciliationTelemetry)} ` +
    `--adjudication-plan ${shell(adjudicationPlanPath)} ` +
    sealReceipts.map((path) => `--seal-receipt ${shell(path)}`).join(" "),
  );
  let finalReconciliation: JsonObject;
  try {
    finalReconciliation = JSON.parse(finalGate.output) as JsonObject;
  } catch {
    throw new Error(`final reconciliation produced no receipt: ${finalGate.error ?? finalGate.output}`);
  }
  assert(finalGate.ok && finalReconciliation.complete === true, "final exact reconciliation failed");
  const stagedReconciliationPath = `${stagingBase}/reconciliation.json`;
  await artifactStore.publish(root, stagedReconciliationPath, finalReconciliation, "json");

  await workflow.phase("Report", { total: 1 });
  const statusCounts: JsonObject = {};
  for (const row of schedule) {
    const terminal = await readJson(join(root, `attempts/${row.attempt_id}/terminal.json`));
    const key = String(terminal.status);
    statusCounts[key] = Number(statusCounts[key] ?? 0) + 1;
  }
  const gradeStatusCounts: JsonObject = {};
  for (const grade of gradeRecords) {
    const key = String(grade.status);
    gradeStatusCounts[key] = Number(gradeStatusCounts[key] ?? 0) + 1;
  }
  const outputPaths = {
    events: `${outputsBase}/events.jsonl`,
    ledger: `${outputsBase}/ledger.jsonl`,
    grades: `${outputsBase}/grades.jsonl`,
    telemetry: `${outputsBase}/telemetry.jsonl`,
    telemetry_aggregate: `${outputsBase}/telemetry-aggregate.json`,
    analysis_input: `${outputsBase}/analysis-input.json`,
    analysis: `${outputsBase}/analysis.json`,
    telemetry_coverage: `${outputsBase}/telemetry-coverage.json`,
    reconciliation: `${outputsBase}/reconciliation.json`,
    decision_report: `${outputsBase}/decision-report.json`,
  };
  const decisionReport = {
    schema_version: 1,
    benchmark_id: req.benchmark_id,
    request_id: req.request_id,
    analysis_revision: req.analysis_revision,
    decision: analysisResult.decision,
    decision_basis: analysisResult.decision_basis,
    sample_label: analysisResult.sample_label,
    claims_limit: analysisResult.claims_limit,
    estimand: analysisResult.estimand,
    effect: analysisResult.effect,
    practical_threshold: analysisResult.practical_threshold,
    noninferiority: analysisResult.noninferiority,
    uncertainty: analysisResult.bootstrap,
    vetoes: analysisResult.vetoes,
    attempt_accounting: {
      scheduled: schedule.length,
      terminal_status_counts: statusCounts,
      telemetry_rows: telemetryRows.length,
      telemetry_unknown_attempt_ids: telemetryUnknownAttemptIds,
    },
    grading_accounting: { expected: gradeOrder.length, settled: gradeRecords.length, status_counts: gradeStatusCounts },
    seal_bindings: [designBinding, executionBinding, rawBinding].map((binding) => ({
      type: binding.type,
      revision: binding.revision,
      manifest_path: binding.manifest_path,
      manifest_sha256: binding.manifest_sha256,
    })),
    reconciliation_path: outputPaths.reconciliation,
    evidence_paths: ["blind-map.public.json", outputPaths.events, outputPaths.ledger, outputPaths.grades,
      outputPaths.telemetry, outputPaths.telemetry_aggregate, outputPaths.telemetry_coverage, outputPaths.analysis],
    unknowns: telemetryUnknownAttemptIds.length > 0 ? [
      `${telemetryUnknownAttemptIds.length} prelaunch failures have no Fabric agent ID and are retained in outcome denominators but absent from entity telemetry`,
      "Fabric raw cost remains unprojected because no versioned USD-unit receipt was supplied",
    ] : ["Fabric raw cost remains unprojected because no versioned USD-unit receipt was supplied"],
  };
  assert(json(decisionReport).length <= HARD_MAX_TEXT_CHARS, "decision report exceeds the workflow bound");
  const stagedDecisionPath = `${stagingBase}/decision-report.json`;
  await artifactStore.publish(root, stagedDecisionPath, decisionReport, "json");

  // Strict reconciliation above is the publication gate. Individual output
  // files may exist after interruption, but the revision is unpublished until
  // the digest-bound commit manifest below exists.
  const publications: Array<[string, string]> = [
    [executionReconciliation.events_path, outputPaths.events],
    [executionReconciliation.ledger_path, outputPaths.ledger],
    [stagedGradesPath, outputPaths.grades],
    [stagedTelemetryPath, outputPaths.telemetry],
    [stagedTelemetryAggregatePath, outputPaths.telemetry_aggregate],
    [stagedAnalysisInputPath, outputPaths.analysis_input],
    [stagedAnalysisPath, outputPaths.analysis],
    [stagedTelemetryCoveragePath, outputPaths.telemetry_coverage],
    [stagedReconciliationPath, outputPaths.reconciliation],
    [stagedDecisionPath, outputPaths.decision_report],
  ];
  for (const [source, destination] of publications) await artifactStore.publish(root, destination, source, "file", "verify");
  const outputDescriptors: JsonObject[] = [];
  for (const [, destination] of publications) outputDescriptors.push(await artifactDescriptor(root, destination));
  const analysisCommit = {
    schema_version: 1,
    status: "committed",
    benchmark_id: req.benchmark_id,
    analysis_revision: req.analysis_revision,
    request_id: req.request_id,
    committed_at: now(),
    strict_reconciliation_complete: true,
    reconciliation_path: outputPaths.reconciliation,
    runtime_capability_id: runtimeCapabilities?.capability_id ?? null,
    protected_state_capability_id: protectedState?.capability_id ?? null,
    budget_id: budgetLedger?.budget_id ?? null,
    governing_seals: [designBinding, executionBinding, rawBinding].map((binding) => ({
      type: binding.type,
      revision: binding.revision,
      manifest_path: binding.manifest_path,
      manifest_sha256: binding.manifest_sha256,
    })),
    outputs: outputDescriptors,
  };
  await artifactStore.publish(root, commitPath, analysisCommit);
  const persistedCommit = await readJson(join(root, commitPath));
  assert(persistedCommit.status === "committed" && persistedCommit.strict_reconciliation_complete === true &&
    Array.isArray(persistedCommit.outputs) && persistedCommit.outputs.length === publications.length,
    "analysis commit manifest is incomplete");
  return {
    schema_version: 1,
    ...typedStatus("complete", telemetryUnknownAttemptIds.length > 0 ? ["telemetry-partial"] : []),
    route: "Analyze",
    stage: req.stage,
    request_id: req.request_id,
    benchmark_id: req.benchmark_id,
    analysis_revision: req.analysis_revision,
    graded: gradeRecords.length,
    decision: analysisResult.decision,
    complete: true,
    failure: null,
    evidence: [commitPath, ...publications.map(([, destination]) => destination)],
    blockers: [],
  };
}

async function runBenchmarkStage(rawRequest: string): Promise<JsonObject> {
  request = null;
  scratchPath = null;
  scratchCleaned = false;
  agentCalls = 0;
  measuredAgentCalls = 0;
  graderAgentCalls = 0;
  supportAgentCalls = 0;
  stageSequence = 0;
  installedRuntimeCapabilities = null;
  runtimeCapabilities = null;
  protectedState = null;
  budgetLedger = null;
  budgetReservations = new Map<string, JsonObject>();
  callPlan = null;
  plannedCallIds = new Set<string>();
  assignedWorkIds = new Set<string>();
  completedWorkIds = new Set<string>();
  receipt = initialReceipt();
  let enteredStage = false;

try {
  request = parseRequest(rawRequest);
  receipt.route = request.route;
  receipt.stage = request.stage;
  receipt.request_id = request.request_id;
  await workflow.configure({ name: `Agent benchmark ${request.route}/${request.stage}`, description: request.benchmark_id });

  const scratchPrefix = `/tmp/pi-agent-benchmark-${request.request_id}.`;
  const scratchGate = await requireGate(
    `umask 077; mktemp -d -- ${shell(`${scratchPrefix}XXXXXX`)}`,
    "create exclusive request scratch directory",
  );
  const allocatedScratch = scratchGate.output.trim();
  assert(allocatedScratch.startsWith(scratchPrefix) && /^[A-Za-z0-9]+$/.test(allocatedScratch.slice(scratchPrefix.length)),
    "mktemp returned an invalid scratch directory");
  scratchPath = allocatedScratch;
  const requestPath = await stage("workflow-request.json", rawRequest);
  await requireGate(
    `python -B ${shell(`${SKILL_ROOT}/scripts/validate_contracts.py`)} --schema workflow-request ${shell(requestPath)}`,
    "workflow request contract",
  );
  installedRuntimeCapabilities = await inspectInstalledRuntime();
  await directoryRequired(request.packet_path);
  await loadStageBindings(request.packet_path, request);
  await verifyDeltaSealReferences(request.packet_path, request);
  enteredStage = true;

  if (request.route === "Design") receipt = await runDesign(request.packet_path, request);
  else if (request.route === "Execute") receipt = await runExecute(request.packet_path, request);
  else if (request.route === "Audit") receipt = await runAudit(request.packet_path, request);
  else receipt = await runAnalyze(request.packet_path, request);
  parseTypedStatus(receipt, `${request.route}/${request.stage} receipt`, STAGE_RECEIPT_STATUSES);
} catch (error) {
  const failure = message(error);
  try {
    await workflow.event({ message: failure.slice(0, 500), level: "error" });
  } catch {
    // The concise receipt remains available if the activity surface fails.
  }
  const unsupportedFailure = failure.startsWith("UNSUPPORTED:");
  const protectedStateFailure = failure.includes("protected-state") || failure.includes("protected state");
  const plannedIds = callPlan?.call_ids ?? [];
  const completedIds = plannedIds.filter((id) => completedWorkIds.has(id));
  const ambiguousIds = plannedIds.filter((id) => assignedWorkIds.has(id) && !completedWorkIds.has(id));
  const unstartedIds = plannedIds.filter((id) => !assignedWorkIds.has(id) && !completedWorkIds.has(id));
  const safeNextAction = ambiguousIds.length > 0
    ? `audit assigned-without-terminal IDs without replay: ${ambiguousIds.join(", ")}`
    : unstartedIds.length > 0
      ? `resume with a new bound call plan containing only never-assigned IDs: ${unstartedIds.join(", ")}`
      : protectedStateFailure
        ? "establish non-overlapping protected-state isolation, regenerate and bind its compatibility receipt, then rerun prelaunch gates; do not launch scored work"
        : unsupportedFailure
          ? "repair or regenerate the incompatible prelaunch binding; do not launch scored work"
          : !enteredStage
            ? "repair the failed prelaunch gate or binding, then rerun prelaunch gates; do not launch scored work"
            : "run deterministic finalize/repair from immutable terminals; do not retry completed IDs";
  receipt = {
    ...receipt,
    schema_version: 1,
    ...typedStatus(unsupportedFailure ? "unsupported" : "failed",
      [unsupportedFailure ? "runtime-unsupported" : "stage-failed"]),
    route: request?.route ?? receipt.route,
    stage: request?.stage ?? receipt.stage,
    request_id: request?.request_id ?? receipt.request_id,
    benchmark_id: request?.benchmark_id ?? null,
    failure: {
      stage: request?.stage ?? receipt.stage,
      code: "stage-exception",
      classification: unsupportedFailure ? "unsupported" : "blocked",
      message: failure,
      retryable: false,
      agent_calls_observed: agentCalls,
      model_calls_consumed: agentCalls,
      completed_work_ids: completedIds,
      unstarted_work_ids: unstartedIds,
      ambiguous_work_ids: ambiguousIds,
      safe_next_action: safeNextAction,
      captured_at: now(),
    },
    evidence: Array.isArray(receipt.evidence) ? receipt.evidence : [],
    completed_work_ids: completedIds,
    unstarted_work_ids: unstartedIds,
    ambiguous_work_ids: ambiguousIds,
    model_calls_consumed: agentCalls,
    safe_next_action: safeNextAction,
    blockers: [failure],
    complete: false,
  };
  if (request !== null && scratchPath !== null) {
    try {
      const failurePath = `checkpoints/${request.request_id}/failure.json`;
      const failureState = await fileState(join(request.packet_path, failurePath));
      if (failureState === "missing") {
        await artifactStore.publish(request.packet_path, failurePath, receipt);
      } else {
        const existingFailure = await readJson(join(request.packet_path, failurePath));
        parseTypedStatus(existingFailure, `failure checkpoint ${failurePath}`, ["failed", "unsupported"]);
        assert(existingFailure.schema_version === 1 && existingFailure.request_id === request.request_id &&
          existingFailure.benchmark_id === request.benchmark_id && existingFailure.complete === false &&
          existingFailure.failure && typeof existingFailure.failure.safe_next_action === "string",
          `existing failure checkpoint identity is invalid: ${failurePath}`);
      }
      receipt.evidence = [...(Array.isArray(receipt.evidence) ? receipt.evidence : []), failurePath];
    } catch (publicationError) {
      receipt.blockers = [...receipt.blockers, `failure receipt publication: ${message(publicationError)}`];
    }
  }
} finally {
  try {
    await workflow.phase("Cleanup", { total: 1 });
  } catch {
    // Cleanup evidence is the command result, not the activity update.
  }
  if (scratchPath !== null) {
    try {
      await requireGate(`rm -rf -- ${shell(scratchPath)}`, "remove request scratch directory");
      scratchCleaned = true;
    } catch (error) {
      receipt = {
        ...receipt,
        ...typedStatus("failed", [...(Array.isArray(receipt.qualifiers) ? receipt.qualifiers : []), "cleanup-failed"]),
        complete: false,
        blockers: [...(Array.isArray(receipt.blockers) ? receipt.blockers : []), `scratch cleanup: ${message(error)}`],
      };
    }
  }
  receipt.agent_calls = agentCalls;
  receipt.measured_agent_calls = measuredAgentCalls;
  receipt.grader_agent_calls = graderAgentCalls;
  receipt.support_agent_calls = supportAgentCalls;
  receipt.owned_temporary_paths = scratchPath === null ? [] : [scratchPath];
  receipt.cleaned_temporary_paths = scratchCleaned && scratchPath !== null ? [scratchPath] : [];
}

parseTypedStatus(receipt, "final deep-runner receipt", STAGE_RECEIPT_STATUSES);
return receipt;
}

return await runBenchmarkStage(π.request);
