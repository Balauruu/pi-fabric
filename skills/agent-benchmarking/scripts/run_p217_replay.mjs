#!/usr/bin/env node
/** Execute the checked-in benchmark guest against a deterministic local Fabric host. */
import { exec as execCallback } from "node:child_process";
import { createHash } from "node:crypto";
import {
  existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync,
} from "node:fs";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { promisify } from "node:util";
import { pathToFileURL } from "node:url";

const exec = promisify(execCallback);
const SCRIPT_ROOT = dirname(new URL(import.meta.url).pathname);
const SKILL_ROOT = resolve(SCRIPT_ROOT, "..");
const PROFILE_ROOT = resolve(SKILL_ROOT, "../..");
const FABRIC_ROOT = join(PROFILE_ROOT, "npm/node_modules/pi-fabric");
const WORKFLOW = join(SKILL_ROOT, "workflows/benchmark.ts");

function fail(message) {
  throw new Error(message);
}

function parseArgs() {
  if (process.argv.slice(2).some((value) => value === "--help" || value === "-h")) {
    console.log("usage: run_p217_replay.mjs --packet PATH");
    process.exit(0);
  }
  const values = {};
  const allowed = new Set(["packet"]);
  for (let index = 2; index < process.argv.length; index += 2) {
    const key = process.argv[index];
    const value = process.argv[index + 1];
    if (!key?.startsWith("--") || value === undefined) fail("expected --name value arguments");
    const name = key.slice(2);
    if (!allowed.has(name)) fail(`unknown argument ${key}`);
    values[name] = value;
  }
  if (!values.packet) fail("--packet is required");
  return values;
}

function canonical(value) {
  function sorted(item) {
    if (Array.isArray(item)) return item.map(sorted);
    if (item && typeof item === "object") {
      return Object.fromEntries(Object.keys(item).sort().filter((key) => item[key] !== undefined).map((key) => [key, sorted(item[key])]));
    }
    return item;
  }
  return `${JSON.stringify(sorted(value))}\n`;
}

function sha256(data) {
  return createHash("sha256").update(data).digest("hex");
}

function resolveHostPath(path) {
  return isAbsolute(path) ? path : resolve(PROFILE_ROOT, path);
}

function pagedRead(path, offset = 1, limit = 200) {
  const text = readFileSync(resolveHostPath(path), "utf8");
  if (offset <= 1 && limit >= text.split("\n").length - (text.endsWith("\n") ? 1 : 0)) return text;
  let line = 1;
  let start = 0;
  while (line < offset) {
    const newline = text.indexOf("\n", start);
    if (newline < 0) return "";
    start = newline + 1;
    line += 1;
  }
  let end = start;
  let remaining = limit;
  while (remaining > 0 && end < text.length) {
    const newline = text.indexOf("\n", end);
    if (newline < 0) {
      end = text.length;
      break;
    }
    end = newline + 1;
    remaining -= 1;
  }
  return text.slice(start, end);
}

const hostCalls = [];
let agentCounter = 0;
let logNamespace = "unbound";
const baseTime = Date.parse("2026-09-04T07:00:00Z");

globalThis.pi = {
  async bash({ command }) {
    try {
      const anchored = `cd ${JSON.stringify(PROFILE_ROOT)} && ${command}`;
      const result = await exec(anchored, { cwd: PROFILE_ROOT, maxBuffer: 32 * 1024 * 1024, shell: "/bin/bash" });
      return { ok: true, exitCode: 0, output: `${result.stdout}${result.stderr}`, error: null };
    } catch (error) {
      return {
        ok: false,
        exitCode: typeof error.code === "number" ? error.code : 1,
        output: `${error.stdout ?? ""}${error.stderr ?? ""}`,
        error: String(error.message ?? error),
      };
    }
  },
  async read({ path, offset = 1, limit = 200 }) {
    return pagedRead(path, offset, limit);
  },
  async write({ path, content }) {
    const absolute = resolveHostPath(path);
    mkdirSync(dirname(absolute), { recursive: true });
    writeFileSync(absolute, content, { flag: "wx" });
    return { ok: true, output: "", details: null };
  },
};

globalThis.workflow = {
  async configure() {},
  async phase() {},
  async item() {},
  async event() {},
  async parallel(items, _options) {
    return Promise.all(items.map((operation) => operation()));
  },
  async agent() {
    fail("workflow.agent is outside the Analyze replay path");
  },
};

globalThis.agents = {
  async run(request) {
    agentCounter += 1;
    const id = agentCounter.toString(16).padStart(32, "0");
    const name = String(request.name ?? "");
    const isAdjudicator = name.includes("-adjudicator-");
    const isDissentingJudge = name.endsWith("-judge-16");
    const passed = isAdjudicator || !isDissentingJudge;
    const value = {
      status: passed ? "passed" : "failed",
      score: passed ? 1 : 0,
      criterion_results: [{
        criterion_id: "correct",
        status: passed ? "passed" : "failed",
        score: passed ? 1 : 0,
        rationale: isAdjudicator ? "Distinct adjudicator resolves the frozen disagreement." :
          isDissentingJudge ? "Synthetic dissent creates the planned adjudication boundary." :
            "Synthetic judge accepts the frozen blinded item.",
      }],
    };
    const runDirectory = `/tmp/pi-fabric-runs-${logNamespace}/${id}`;
    mkdirSync(runDirectory, { recursive: true });
    const logFile = `${runDirectory}/events.jsonl`;
    const startedAt = baseTime + agentCounter * 10;
    const finishedAt = startedAt + 5;
    writeFileSync(logFile, [
      JSON.stringify({ type: "agent_start", agentId: id, model: "fake-model", timestamp: startedAt }),
      JSON.stringify({ type: "agent_end", agentId: id, status: "completed", usage: { input: 10, output: 5, cacheRead: 0, cacheWrite: 0 }, timestamp: finishedAt }),
      "",
    ].join("\n"), { flag: "wx" });
    const result = {
      id,
      status: "completed",
      text: JSON.stringify(value),
      value,
      model: "fake-model",
      runner: "pi",
      sessionId: `session-${id}`,
      runnerSessionId: `runner-session-${id}`,
      usage: { input: 10, output: 5, cacheRead: 0, cacheWrite: 0, cost: 0 },
      turns: 1,
      toolCalls: 0,
      nestedAgents: [],
      startedAt,
      finishedAt,
      logFile,
      error: null,
    };
    hostCalls.push({ sequence: agentCounter, name, id, stage: isAdjudicator ? "adjudicate" : "judge", status: value.status, logFile });
    return result;
  },
};

globalThis.π = { request: "" };

async function loadWorkflow() {
  const chunks = join(FABRIC_ROOT, "dist/chunks");
  const candidates = readdirSync(chunks).filter((name) => name.startsWith("type-checker-") && name.endsWith(".js"));
  if (candidates.length !== 1) fail(`expected one type-checker semantic chunk, found ${candidates.length}`);
  const compiler = await import(pathToFileURL(join(chunks, candidates[0])));
  const source = readFileSync(WORKFLOW, "utf8");
  const transpiled = compiler.transpileFabricCodeWithSourceMap(source).code;
  const moduleSource = `${transpiled}\nexport { __piFabricMain };\n`;
  const module = await import(`data:text/javascript;base64,${Buffer.from(moduleSource).toString("base64")}`);
  return { main: module.__piFabricMain, source };
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function collectFiles(root, name) {
  const result = [];
  function visit(directory) {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) visit(path);
      else if (entry.name === name) result.push(path);
    }
  }
  if (existsSync(root)) visit(root);
  return result;
}

async function main() {
  const args = parseArgs();
  const packet = resolve(args.packet);
  logNamespace = sha256(packet).slice(0, 16);
  if (!existsSync(packet) || !statSync(packet).isDirectory()) fail(`${packet}: packet directory is missing`);
  const metadata = readJson(join(packet, "replay/metadata.json"));
  const hostReceiptPath = join(packet, "replay/host-receipt.json");
  if (existsSync(hostReceiptPath)) fail(`${hostReceiptPath}: replay already has a host receipt`);
  const { main: runStage, source } = await loadWorkflow();
  const receipts = [];
  for (const name of metadata.request_order) {
    const requestPath = join(packet, `replay/requests/${name}.json`);
    const stageRequest = readJson(requestPath);
    const checkpointPath = join(packet, `analysis/analysis-v1/checkpoints/${stageRequest.request_id}/receipt.json`);
    let receipt;
    let skipped = false;
    const before = hostCalls.length;
    if (existsSync(checkpointPath)) {
      receipt = readJson(checkpointPath);
      skipped = true;
    } else {
      globalThis.π.request = readFileSync(requestPath, "utf8");
      receipt = await runStage();
    }
    receipts.push({ name, request_path: requestPath, checkpoint_path: existsSync(checkpointPath) ? checkpointPath : null,
      skipped, model_calls: hostCalls.length - before, receipt });
    if (receipt.status === "failed" || receipt.status === "unsupported") {
      fail(`${name} failed: ${JSON.stringify(receipt.blockers)}`);
    }
  }

  const expectedCalls = { prepare: 0, adjudicate: metadata.adjudication_model_call_count, finalize: 0 };
  metadata.judge_wave_counts.forEach((count, index) => { expectedCalls[`judge-${index + 1}`] = count; });
  for (const entry of receipts) {
    const expected = entry.skipped ? 0 : expectedCalls[entry.name];
    if (!Number.isInteger(expected) || entry.model_calls !== expected) {
      fail(`${entry.name}: expected ${expected} model calls in this process, observed ${entry.model_calls}`);
    }
  }
  const priorModelCalls = receipts.filter((entry) => entry.skipped)
    .reduce((total, entry) => total + expectedCalls[entry.name], 0);
  if (hostCalls.length + priorModelCalls !== metadata.total_model_call_count) {
    fail(`expected ${metadata.total_model_call_count} total model calls across checkpoints, observed ${hostCalls.length + priorModelCalls}`);
  }
  const judgeCalls = hostCalls.filter((item) => item.stage === "judge");
  const adjudicationCalls = hostCalls.filter((item) => item.stage === "adjudicate");
  if (judgeCalls.length !== metadata.judge_model_call_count || adjudicationCalls.length !== metadata.adjudication_model_call_count) {
    fail(`expected ${metadata.judge_model_call_count} judge and ${metadata.adjudication_model_call_count} adjudication calls, observed ${judgeCalls.length} and ${adjudicationCalls.length}`);
  }
  const resultFiles = collectFiles(join(packet, "grader-runs"), "result.json");
  const terminalFiles = collectFiles(join(packet, "grader-runs"), "terminal.json");
  if (resultFiles.length !== metadata.total_model_call_count || terminalFiles.length !== metadata.total_model_call_count) {
    fail(`expected exact ${metadata.total_model_call_count} grader results/terminals, observed ${resultFiles.length}/${terminalFiles.length}`);
  }
  const stageCounts = { judge: 0, adjudicate: 0 };
  for (const path of resultFiles) stageCounts[readJson(path).stage] += 1;
  if (stageCounts.judge !== metadata.judge_model_call_count || stageCounts.adjudicate !== metadata.adjudication_model_call_count) {
    fail(`persisted stage matrix mismatch: ${JSON.stringify(stageCounts)}`);
  }
  const commitPath = join(packet, "analysis/analysis-v1/commit.json");
  const reconciliationPath = join(packet, "analysis/analysis-v1/outputs/reconciliation.json");
  const commit = readJson(commitPath);
  const reconciliation = readJson(reconciliationPath);
  if (commit.status !== "committed" || commit.strict_reconciliation_complete !== true || reconciliation.complete !== true) {
    fail("finalize did not publish a strict committed analysis");
  }

  const receipt = {
    schema_version: 1,
    status: "passed",
    benchmark_id: metadata.benchmark_id,
    workflow_path: WORKFLOW,
    workflow_sha256: sha256(source),
    packet_path: packet,
    attempt_count: metadata.attempt_count,
    judge_model_calls: judgeCalls.length,
    adjudication_model_calls: adjudicationCalls.length,
    total_model_calls: hostCalls.length,
    persisted_grade_stage_counts: stageCounts,
    stage_receipts: receipts,
    analysis_commit_path: commitPath,
    analysis_commit_sha256: sha256(readFileSync(commitPath)),
    reconciliation_path: reconciliationPath,
    reconciliation_sha256: sha256(readFileSync(reconciliationPath)),
    host_calls_sha256: sha256(canonical(hostCalls)),
  };
  writeFileSync(join(packet, "replay/host-calls.jsonl"), hostCalls.map((item) => JSON.stringify(item)).join("\n") + "\n", { flag: "wx" });
  writeFileSync(hostReceiptPath, canonical(receipt), { flag: "wx" });
  process.stdout.write(canonical(receipt));
}

main().catch((error) => {
  process.stderr.write(`error: ${error.stack ?? error}\n`);
  process.exitCode = 1;
});
