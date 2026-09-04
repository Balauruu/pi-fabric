/*
 * Fixed non-scoring production adapter for runtime capability canaries.
 *
 * Run these exact bytes as a fabric_exec program. Pass one JSON object through
 * strings.request. A fresh run needs schema_version and run_root. A recovery
 * additionally sets resume=true and names already-settled run IDs. The adapter
 * exercises public Fabric agent APIs, streams returned native logs through the
 * artifact store, and invokes deterministic local receipt derivation.
 */

type JsonObject = { [key: string]: any };
type CanaryId =
  | "attempt-lifecycle"
  | "blind-map-isolation"
  | "condition-loading"
  | "false-complete-refusal"
  | "fresh-parent-sessions"
  | "interrupted-wave-resume"
  | "mechanism-nested"
  | "primary-source-grading"
  | "randomized-schedule"
  | "runtime-model-identity"
  | "supervisor-prelaunch-failure"
  | "token-cost-attribution";
type RecoveryRun = { canary_id: CanaryId; purpose: string; agent_id: string };
type HarnessRequest = {
  schema_version: 1;
  run_root: string;
  resume?: boolean;
  recovered_runs?: RecoveryRun[];
};
type CapturedRun = {
  purpose: string;
  assignment_sequence: number;
  call_sequence: number;
  terminal_sequence: number;
  task: string;
  result: FabricAgentResult;
  log_archive: JsonObject | null;
  log_scan: JsonObject;
  log_absence?: JsonObject;
  mechanism?: JsonObject;
  archived_paths: string[];
};

const SKILL_ROOT = "/home/balauru/.pi-profiles/fabric/skills/agent-benchmarking";
const EVALUATION_ROOT = "/home/balauru/.pi-profiles/fabric/skill-evaluations/agent-benchmarking/";
const FIXTURE_ROOT = `${SKILL_ROOT}/validation/fixtures/canary`;
const CONDITION_PATH = `${SKILL_ROOT}/SKILL.md`;
const DEEP_STAGE = `${SKILL_ROOT}/scripts/deep_stage.py`;
const IDS: CanaryId[] = [
  "attempt-lifecycle",
  "blind-map-isolation",
  "condition-loading",
  "false-complete-refusal",
  "fresh-parent-sessions",
  "interrupted-wave-resume",
  "mechanism-nested",
  "primary-source-grading",
  "randomized-schedule",
  "runtime-model-identity",
  "supervisor-prelaunch-failure",
  "token-cost-attribution",
];
const SHA256 = /^[0-9a-f]{64}$/;
const AGENT_ID = /^[0-9a-f]{32}$/;
const RUN_ROOT = /^\/home\/balauru\/\.pi-profiles\/fabric\/skill-evaluations\/agent-benchmarking\/[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;
const LOG_FILE = /^\/tmp\/pi-fabric-runs-[^/]+\/[^/]+\/events\.jsonl$/;
let sequence = 0;

function fail(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function shell(value: string): string {
  return `'${value.replace(/'/g, `'"'"'`)}'`;
}

function isCanaryId(value: unknown): value is CanaryId {
  return typeof value === "string" && (IDS as string[]).includes(value);
}

function parseHarnessRequest(raw: string): HarnessRequest {
  const value = JSON.parse(raw) as JsonObject;
  fail(value && typeof value === "object" && !Array.isArray(value), "harness request must be an object");
  const allowed = new Set(["schema_version", "run_root", "resume", "recovered_runs"]);
  fail(Object.keys(value).every((key) => allowed.has(key)), "harness request has an unsupported field");
  fail(value.schema_version === 1, "harness schema_version must be 1");
  fail(typeof value.run_root === "string" && RUN_ROOT.test(value.run_root), "run_root must be a revisioned path under skill-evaluations/agent-benchmarking");
  const resume = value.resume === true;
  fail(value.resume === undefined || typeof value.resume === "boolean", "resume must be boolean when present");
  const recovered = value.recovered_runs ?? [];
  fail(Array.isArray(recovered), "recovered_runs must be an array");
  fail(resume || recovered.length === 0, "recovered_runs require resume=true");
  const identities = new Set<string>();
  for (const item of recovered) {
    fail(item && typeof item === "object" && !Array.isArray(item), "each recovered run must be an object");
    fail(Object.keys(item).sort().join(",") === "agent_id,canary_id,purpose", "recovered run fields must be exact");
    fail(isCanaryId(item.canary_id), "recovered run has an unknown canary_id");
    fail(typeof item.purpose === "string" && /^parent-[1-9][0-9]*$/.test(item.purpose), "recovered run purpose is invalid");
    fail(typeof item.agent_id === "string" && AGENT_ID.test(item.agent_id), "recovered run agent_id is invalid");
    const identity = `${item.canary_id}/${item.purpose}`;
    fail(!identities.has(identity), `duplicate recovered run ${identity}`);
    identities.add(identity);
  }
  return value as HarnessRequest;
}

async function bash(command: string): Promise<string> {
  const result = await pi.bash({ command, timeout: 600 });
  fail(result.ok, result.ok ? "" : `command failed: ${result.error}: ${result.output}`);
  return result.output;
}

async function fileExists(path: string): Promise<boolean> {
  return (await bash(`if test -f ${shell(path)}; then printf present; fi`)) === "present";
}

async function digest(path: string): Promise<string> {
  const output = (await bash(`sha256sum -- ${shell(path)}`)).trim().split(/\s+/)[0];
  fail(SHA256.test(output), `cannot obtain sha256 for ${path}`);
  return output;
}

function resultSchema(requestId: CanaryId): JsonObject {
  const payload = requestId === "blind-map-isolation"
    ? {
        type: "object",
        additionalProperties: false,
        required: ["nonce_echo"],
        properties: { nonce_echo: { type: "string" } },
      }
    : requestId === "fresh-parent-sessions"
      ? {
          type: "object",
          additionalProperties: false,
          required: ["file_value"],
          properties: { file_value: { type: "string" } },
        }
      : { type: "object" };
  return {
    type: "object",
    additionalProperties: false,
    required: ["request_id", "nonce", "payload"],
    properties: {
      request_id: { const: requestId },
      nonce: { type: "string", minLength: 8, maxLength: 200 },
      payload,
    },
  };
}

function taskFor(id: CanaryId, requestPath: string, requestSha256: string, workspace: string, ordinal: number): string {
  const nonce = `${id}-fabric-probe-${ordinal}`;
  const common = `This is an isolated, non-scoring Pi Fabric runtime probe. The fixed adapter bound request fixture ${requestPath} at SHA-256 ${requestSha256}. Return schema-valid JSON with request_id=${id}, nonce=${nonce}, and a payload containing concrete values you actually observed. Never return pass/fail attestations.`;
  if (id === "condition-loading") {
    return `/skill:agent-benchmarking ${common} In payload return received_as_literal (whether this slash invocation remained literal), instruction_mode, condition_sha256 from ${CONDITION_PATH}, and nonce_echo.`;
  }
  if (id === "mechanism-nested" || id === "token-cost-attribution" || id === "runtime-model-identity") {
    return `${common} Use one recursive fabric_exec agents.run call with runner pi, transport process, no cwd, tools [], and task "Return exactly child-token-${ordinal}". In payload return child_id, child_token, parent_consumed_value formed by appending -used, parent_transform_suffix="-used", and the complete child_result object returned by Fabric.`;
  }
  if (id === "fresh-parent-sessions") {
    return `${common} Use exactly one bash call in ${workspace} to write ${nonce} to parent-${ordinal}.sentinel.txt, then read that file. In payload return only file_value.`;
  }
  if (id === "blind-map-isolation") {
    return `${common} Grade only this public row {"blind_id":"b1","task_id":"t1","item_path":"blinded/b1.json"}. Use no tools. In payload return only nonce_echo.`;
  }
  if (id === "primary-source-grading") {
    return `${common} Read ${workspace}/primary-source.html, select one exact nonempty text fragment from that captured NIST page, and grade only whether that fragment is entailed by the captured page. In payload return decision="entailed" only if it is literally present, plus quote. Do not claim a source you did not read.`;
  }
  return `${common} In payload return request_sha256 and nonce_echo. Do not mutate the skill package.`;
}

class ProductionFabricAdapter {
  readonly kind = "pi-fabric-production";
  constructor(readonly runtimeRoot: string) {}

  private async archive(id: CanaryId, purpose: string, task: string, result: FabricAgentResult): Promise<CapturedRun> {
    const terminal = ++sequence;
    fail(typeof result.id === "string" && AGENT_ID.test(result.id), `${id}: Fabric result has no supported id`);
    fail(typeof result.logFile === "string" && LOG_FILE.test(result.logFile), `${id}: Fabric result has no supported logFile`);
    fail(result.task === task, `${id}/${purpose}: recovered task differs from the fixed probe`);
    const relativeBase = `runtime-raw/${id}/runs/${result.id}`;
    const destination = `${this.runtimeRoot}/${relativeBase}`;
    await bash(`mkdir -p -- ${shell(destination)}`);
    if (!(await fileExists(result.logFile))) {
      fail(id === "supervisor-prelaunch-failure" && result.status === "failed" && result.turns === 0 && typeof result.error === "string", `${id}: missing Fabric log is not an evidenced prelaunch failure`);
      const mechanism = { valid: false, reason: "prelaunch failure produced no log", evidence: [] };
      const absence = {
        schema_version: 1,
        status: "confirmed-absent",
        agent_id: result.id,
        returned_log_file: result.logFile,
        result_status: result.status,
        error: result.error,
      };
      const failedTerminal = {
        schema_version: 1,
        status: "failed",
        qualifiers: ["prelaunch-no-log"],
        agent_id: result.id,
        failure: result.error,
        mechanism_evidence_path: `${relativeBase}/mechanism.json`,
        fabric_result: result,
      };
      await bash(`test ! -e ${shell(`${destination}/mechanism.json`)} && test ! -e ${shell(`${destination}/log-absence.json`)} && test ! -e ${shell(`${destination}/terminal.json`)}`);
      await pi.write(`${destination}/mechanism.json`, JSON.stringify(mechanism));
      await pi.write(`${destination}/log-absence.json`, JSON.stringify(absence));
      await pi.write(`${destination}/terminal.json`, JSON.stringify(failedTerminal));
      return {
        purpose,
        assignment_sequence: terminal - 2,
        call_sequence: terminal - 1,
        terminal_sequence: terminal,
        task,
        result,
        log_archive: null,
        log_scan: mechanism,
        log_absence: absence,
        mechanism,
        archived_paths: ["mechanism.json", "log-absence.json", "terminal.json"].map((name) => `runs/${result.id}/${name}`),
      };
    }
    const archive = JSON.parse(await bash(
      `python -B ${shell(DEEP_STAGE)} archive --source ${shell(result.logFile)} ` +
      `--root ${shell(this.runtimeRoot)} --relative ${shell(`${relativeBase}/events.jsonl`)}`,
    )) as JsonObject;
    fail(archive.path === `${relativeBase}/events.jsonl` && archive.source_kind === "pi-fabric-events-jsonl", `${id}: artifact-store archive receipt is invalid`);
    const scan = JSON.parse(await bash(
      `python -B ${shell(DEEP_STAGE)} scan --input ${shell(`${destination}/events.jsonl`)} ` +
      `--allowed-root ${shell("/home/balauru/.pi-profiles/fabric")}`,
    )) as JsonObject;
    fail(scan.source_sha256 === archive.sha256 && scan.source_bytes === archive.bytes, `${id}: archived log scan does not bind the streamed bytes`);
    const sourceDirectory = result.logFile.slice(0, -"events.jsonl".length);
    await bash(
      `for name in lifecycle.jsonl status.json task.txt; do ` +
      `src=${shell(sourceDirectory)}$name; dst=${shell(destination)}/$name; ` +
      `test -f "$src" && test ! -e "$dst" && cp -- "$src" "$dst" || exit 41; done`,
    );
    await pi.write(`${destination}/events.archive.json`, JSON.stringify(archive));
    await pi.write(`${destination}/events.scan.json`, JSON.stringify(scan));
    return {
      purpose,
      assignment_sequence: terminal - 2,
      call_sequence: terminal - 1,
      terminal_sequence: terminal,
      task,
      result,
      log_archive: archive,
      log_scan: scan,
      archived_paths: ["events.jsonl", "lifecycle.jsonl", "status.json", "task.txt"].map((name) => `runs/${result.id}/${name}`),
    };
  }

  async run(id: CanaryId, purpose: string, task: string, options: Partial<FabricAgentRequest> = {}): Promise<CapturedRun> {
    ++sequence;
    ++sequence;
    const result = await agents.run({
      name: `canary-${id}-${purpose}`,
      task,
      runner: "pi",
      transport: "process",
      tools: ["read", "bash"],
      extensions: false,
      schema: resultSchema(id),
      ...options,
    });
    return this.archive(id, purpose, task, result);
  }

  async recover(id: CanaryId, purpose: string, task: string, agentId: string): Promise<CapturedRun> {
    ++sequence;
    ++sequence;
    const status = await agents.status({ id: agentId });
    fail(status && typeof status === "object" && "status" in status, `${id}/${purpose}: recovered participant is unavailable`);
    const result = status as FabricAgentResult;
    fail(result.status === "completed" || (id === "supervisor-prelaunch-failure" && result.status === "failed"), `${id}/${purpose}: recovered run is not terminal`);
    return this.archive(id, purpose, task, result);
  }
}

async function captureCase(adapter: ProductionFabricAdapter, id: CanaryId, recoveries: Map<string, string>): Promise<"captured" | "skipped"> {
  const requestPath = `${FIXTURE_ROOT}/${id}.request.json`;
  const requestText = await pi.read(requestPath);
  const request = JSON.parse(requestText) as JsonObject;
  fail(request.request_id === id, `${id}: request fixture identity mismatch`);
  const requestSha256 = await digest(requestPath);
  const rawRoot = `${adapter.runtimeRoot}/runtime-raw/${id}`;
  if (await fileExists(`${rawRoot}/capture.json`)) return "skipped";
  const workspaceRoot = `${rawRoot}/workspaces`;
  await bash(`mkdir -p -- ${shell(workspaceRoot)}`);
  if (id === "condition-loading") {
    await bash(`test ! -e ${shell(`${rawRoot}/condition-SKILL.md`)} && cp -- ${shell(CONDITION_PATH)} ${shell(`${rawRoot}/condition-SKILL.md`)}`);
  }
  if (id === "primary-source-grading") {
    await bash(`curl --fail --silent --show-error --location --max-time 60 https://csrc.nist.gov/pubs/fips/180-4/upd1/final --output ${shell(`${workspaceRoot}/primary-source.html`)}`);
  }

  const runCount = id === "fresh-parent-sessions" ? 2 : 1;
  const runs: CapturedRun[] = [];
  for (let index = 1; index <= runCount; index += 1) {
    const purpose = `parent-${index}`;
    const workspace = `${workspaceRoot}/${purpose}`;
    await bash(`mkdir -p -- ${shell(workspace)}`);
    const options: Partial<FabricAgentRequest> = id === "supervisor-prelaunch-failure"
      ? { runner: "veda", tools: [] }
      : id === "mechanism-nested" || id === "token-cost-attribution" || id === "runtime-model-identity"
        ? { recursive: true, extensions: true, tools: ["read"] }
        : id === "blind-map-isolation"
          ? { tools: [] }
          : id === "primary-source-grading"
            ? { tools: ["read"], cwd: workspaceRoot }
            : { cwd: workspace };
    const task = taskFor(id, requestPath, requestSha256, id === "primary-source-grading" ? workspaceRoot : workspace, index);
    const recoveredId = recoveries.get(`${id}/${purpose}`);
    runs.push(recoveredId
      ? await adapter.recover(id, purpose, task, recoveredId)
      : await adapter.run(id, purpose, task, options));
  }

  const capture = {
    schema_version: 1,
    adapter: adapter.kind,
    canary_id: id,
    request_fixture: `${id}.request.json`,
    request_sha256: requestSha256,
    captured_at: new Date().toISOString(),
    runs,
  };
  await pi.write(`${rawRoot}/capture.json`, JSON.stringify(capture));
  return "captured";
}

async function runHarness(raw: string): Promise<JsonObject> {
  const request = parseHarnessRequest(raw);
  if (request.resume === true) {
    await bash(`test -d ${shell(request.run_root)} && test -d ${shell(`${request.run_root}/runtime-canaries/runtime-raw`)}`);
  } else {
    await bash(`mkdir -- ${shell(request.run_root)} && mkdir -p -- ${shell(`${request.run_root}/runtime-canaries/runtime-raw`)}`);
  }
  const recoveries = new Map<string, string>();
  for (const item of request.recovered_runs ?? []) recoveries.set(`${item.canary_id}/${item.purpose}`, item.agent_id);
  const runtimeRoot = `${request.run_root}/runtime-canaries`;
  const adapter = new ProductionFabricAdapter(runtimeRoot);
  const completed: CanaryId[] = [];
  const skipped: CanaryId[] = [];
  await workflow.configure({ name: "Agent benchmarking runtime canaries", description: "Non-scoring production-adapter receipt generation" });
  for (const id of IDS) {
    await workflow.phase(id, { description: `Capture ${id}` });
    const outcome = await captureCase(adapter, id, recoveries);
    (outcome === "captured" ? completed : skipped).push(id);
  }
  const receiptRoot = `${runtimeRoot}/receipts`;
  if (await fileExists(`${receiptRoot}/attempt-lifecycle.json`)) {
    const validator = `${SKILL_ROOT}/scripts/run_canaries.py`;
    await bash(`python -B ${shell(validator)} --fixture-root ${shell(FIXTURE_ROOT)} --receipt-root ${shell(receiptRoot)}`);
  } else {
    const generator = `${SKILL_ROOT}/scripts/generate_canary_receipts.py`;
    await bash(
      `python -B ${shell(generator)} --fixture-root ${shell(FIXTURE_ROOT)} ` +
      `--capture-root ${shell(`${runtimeRoot}/runtime-raw`)} --receipt-root ${shell(receiptRoot)}`,
    );
  }
  return {
    schema_version: 1,
    status: "passed",
    non_scoring: true,
    scored_attempt_ids: [],
    adapter: adapter.kind,
    canary_ids: IDS,
    completed,
    skipped,
    run_root: request.run_root,
    receipt_root: `${runtimeRoot}/receipts`,
  };
}

return await runHarness(π.request);
