#!/usr/bin/env node
/** Type-check and execute the exact saved Fabric workflow in an agent-free Audit dry-run. */

import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";

function fail(message) {
  process.stderr.write(`error: ${message}\n`);
  process.exit(1);
}

function args(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 2) {
    const key = argv[i];
    const value = argv[i + 1];
    if (!key?.startsWith("--") || value === undefined) fail("expected --name value arguments");
    out[key.slice(2)] = value;
  }
  for (const key of ["workflow", "request", "fabric-root"]) if (!out[key]) fail(`--${key} is required`);
  return out;
}

function within(root, candidate) {
  const rel = relative(root, candidate);
  return rel === "" || (!rel.startsWith(`..${sep}`) && rel !== ".." && !isAbsolute(rel));
}

function regularNoSymlink(path) {
  if (!existsSync(path)) return false;
  const absolute = resolve(path);
  let cursor = absolute;
  while (true) {
    const stat = lstatSync(cursor);
    if (stat.isSymbolicLink()) return false;
    const parent = dirname(cursor);
    if (parent === cursor) break;
    cursor = parent;
  }
  return lstatSync(absolute).isFile();
}

const opt = args(process.argv.slice(2));
const workflowPath = resolve(opt.workflow);
const requestPath = resolve(opt.request);
const fabricRoot = resolve(opt["fabric-root"]);
if (!regularNoSymlink(workflowPath) || !regularNoSymlink(requestPath)) fail("workflow and request must be regular non-symlink files");
if (!existsSync(join(fabricRoot, "dist/index.js"))) fail("--fabric-root is not an installed pi-fabric package");

function semanticChunk(prefix) {
  const directory = join(fabricRoot, "dist/chunks");
  const matches = readdirSync(directory).filter((name) => name.startsWith(prefix + "-") && name.endsWith(".js"));
  if (matches.length !== 1) fail(`expected one installed ${prefix} semantic chunk, found ${matches.length}`);
  return join(directory, matches[0]);
}

// These implementation-only imports are isolated in this validator. Semantic
// wrapper names remain stable across hashed builds; the runtime doctor and
// exact execution below fail closed if their exports or behavior change.
const [{ GUEST_TYPE_DECLARATIONS }, { typeCheckFabricCode }, { QuickJsRuntime }] = await Promise.all([
  import(pathToFileURL(semanticChunk("guest-types"))),
  import(pathToFileURL(semanticChunk("type-checker"))),
  import(pathToFileURL(semanticChunk("quickjs-runtime"))),
]);

const source = readFileSync(workflowPath, "utf8");
const request = JSON.parse(readFileSync(requestPath, "utf8"));
if (request.route !== "Audit" || request.dry_run !== true) fail("request must be an Audit dry-run");

const checked = typeCheckFabricCode(source, GUEST_TYPE_DECLARATIONS);
if (checked.errors.length) {
  for (const error of checked.errors) process.stderr.write(`type-error:${error.line}:${error.column}: ${error.message}\n`);
  process.exit(1);
}
if (typeof checked.javascript !== "string") fail("Fabric type checker emitted no JavaScript");

const skillRoot = resolve(workflowPath, "../..");
const sandbox = mkdtempSync(join(tmpdir(), "agent-benchmark-workflow-"));
const packet = join(sandbox, "packet");
mkdirSync(packet, { mode: 0o700 });
request.packet_path = "packet";
request.request_id = `audit-${process.pid}`;
request.design_revision = null;
request.execution_revision = null;
request.wave_id = null;
request.requested_runtime = null;
request.requested_model = null;
request.max_agents = 1;
request.max_concurrency = 1;
const rawRequest = JSON.stringify(request);
let agentCalls = 0;
const hostCalls = [];

function bashResult(command) {
  const child = spawnSync("/bin/bash", ["-lc", command], {
    cwd: sandbox,
    encoding: "utf8",
    env: { ...process.env, PYTHONDONTWRITEBYTECODE: "1" },
    timeout: 30000,
    maxBuffer: 4 * 1024 * 1024,
  });
  if (child.error) return { ok: false, output: child.stdout ?? "", details: null, exitCode: null, error: child.error.message };
  if (child.status === 0) return { ok: true, output: child.stdout ?? "", details: null };
  return { ok: false, output: child.stdout ?? "", details: null, exitCode: child.status, error: child.stderr || `command exited ${child.status}` };
}

async function hostCall(ref, value) {
  hostCalls.push(ref);
  if (ref.startsWith("agents.")) {
    agentCalls += 1;
    throw new Error(`agent call forbidden in Audit dry-run: ${ref}`);
  }
  if (["fabric.$configure", "fabric.$phase", "fabric.$item", "fabric.$event", "fabric.$spanStart", "fabric.$spanEnd"].includes(ref)) return {};
  if (ref === "pi.bash") return bashResult(String(value.command ?? ""));
  if (ref === "pi.write") {
    const rawPath = String(value.path ?? "");
    const path = isAbsolute(rawPath) ? resolve(rawPath) : resolve(sandbox, rawPath);
    if (!within(sandbox, path) && !within(tmpdir(), path)) throw new Error(`write outside dry-run scratch: ${path}`);
    mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
    writeFileSync(path, String(value.content ?? ""), { flag: "w", mode: 0o600 });
    return { ok: true, output: "", details: null };
  }
  if (ref === "pi.read") {
    const rawPath = String(value.path ?? "");
    const path = isAbsolute(rawPath) ? resolve(rawPath) : resolve(sandbox, rawPath);
    if (!within(sandbox, path) && !within(skillRoot, path)) throw new Error(`read outside dry-run roots: ${path}`);
    const lines = readFileSync(path, "utf8").match(/.*(?:\n|$)/g)?.filter(Boolean) ?? [];
    const offset = Math.max(1, Number(value.offset ?? 1));
    const limit = Math.max(1, Number(value.limit ?? 2000));
    return lines.slice(offset - 1, offset - 1 + limit).join("");
  }
  throw new Error(`unexpected host call in Audit dry-run: ${ref}`);
}

let executed;
try {
  const runtime = new QuickJsRuntime();
  executed = await runtime.execute(source, hostCall, {
    strings: { request: rawRequest },
    tokenBudget: 1,
    timeoutMs: 60000,
    memoryLimitBytes: 256 * 1024 * 1024,
    maxLogChars: 20000,
    transpiledCode: checked.javascript,
    transpiledSourceMap: checked.sourceMap,
  });
} finally {
  rmSync(sandbox, { recursive: true, force: true });
}

if (executed.terminationReason !== "completed") fail(`QuickJS execution ${executed.terminationReason}: ${executed.error ?? "unknown"}`);
if (agentCalls !== 0) fail(`Audit dry-run made ${agentCalls} agent calls`);
if (!executed.value || executed.value.route !== "Audit" || executed.value.dry_run !== true) fail(`Audit dry-run returned the wrong receipt: ${JSON.stringify(executed.value)}`);
if (executed.value.agent_calls !== 0) fail("workflow receipt reports an agent call");

const receipt = {
  schema_version: 1,
  status: "passed",
  non_scoring: true,
  canary_id: "fabric-audit-dry-run",
  workflow_path: relative(skillRoot, workflowPath).split(sep).join("/"),
  workflow_sha256: createHash("sha256").update(source).digest("hex"),
  request_path: relative(skillRoot, requestPath).split(sep).join("/"),
  request_sha256: createHash("sha256").update(readFileSync(requestPath)).digest("hex"),
  fabric_version: JSON.parse(readFileSync(join(fabricRoot, "package.json"), "utf8")).version,
  typecheck: "passed",
  executor: "installed-QuickJsRuntime",
  termination_reason: executed.terminationReason,
  agents_run_calls: 0,
  host_calls: hostCalls,
  audit_receipt: executed.value,
  limitations: [
    "The canary executes the exact saved bytes in the installed Fabric QuickJS engine with controlled Pi host-call adapters.",
    "It proves the agent-free Audit dry-run path, not measured Execute/Analyze behavior or provider correctness."
  ]
};
process.stdout.write(`${JSON.stringify(receipt, null, 2)}\n`);
