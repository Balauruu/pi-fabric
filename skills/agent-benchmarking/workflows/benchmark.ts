/*
 * Fixed Fabric guest entry for agent benchmarking.
 *
 * Invoke these exact source bytes with one named payload:
 *   payloads.request = JSON.stringify({ specPath, outputDirectory })
 *
 * Deterministic lifecycle policy lives in scripts/run.py and
 * scripts/lifecycle_store.py.  This guest only obtains one internally admitted
 * wave, calls the supported agents.run path, and returns native results to the
 * same file-backed lifecycle.  It has no version gate, private Fabric import,
 * second model launcher, extension build, or caller-authored stage plan.
 */

const SKILL_ROOT = "/home/balauru/.pi-profiles/fabric/skills/agent-benchmarking";
const PYTHON = `${SKILL_ROOT}/.venv/bin/python`;
const RUNNER = `${SKILL_ROOT}/scripts/run.py`;
// This exact program owns a fresh fabric_exec invocation and makes at most one
// native call. It does not infer the host maximum or reuse a shared call window.
const INVOCATION_CALL_ALLOWANCE = 1;
const SUPPORTED_RUNNERS = new Set(["pi", "claude", "veda"]);
const SUPPORTED_SETTINGS = new Set([
  "cwd",
  "extensions",
  "hardDescendantCallLimit",
  "persona",
  "recursive",
  "schema",
  "thinking",
  "timeoutMs",
  "transport",
  "worktree",
]);

function shellQuote(value) {
  return `'${String(value).replaceAll("'", `'"'"'`)}'`;
}

function exactRunRequest(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("run request must be an object");
  }
  const keys = Object.keys(value).sort();
  if (JSON.stringify(keys) !== JSON.stringify(["outputDirectory", "specPath"])) {
    throw new Error("run request requires exactly specPath and outputDirectory");
  }
  for (const key of keys) {
    const item = value[key];
    if (typeof item !== "string" || !item.startsWith("/") || item.includes("/../") || item.endsWith("/..")) {
      throw new Error(`${key} must be a canonical absolute local path`);
    }
  }
  return value;
}

function selectedCapabilityError(job, capabilities) {
  capabilities = capabilities || {};
  // Version labels are intentionally ignored.  Admission depends only on the
  // behavior needed by the selected request.
  if (capabilities.agentsRun === false) return "agents.run is unavailable";
  if (capabilities.nativeResult === false) return "complete native agents.run results are unavailable";
  const request = job && job.request;
  if (!request || typeof request !== "object" || Array.isArray(request)) return "prepared request is malformed";
  if (!SUPPORTED_RUNNERS.has(request.runner)) return `runner ${String(request.runner)} is unsupported`;
  const settings = request.settings;
  if (!settings || typeof settings !== "object" || Array.isArray(settings)) return "prepared settings are malformed";
  for (const key of Object.keys(settings)) {
    if (!SUPPORTED_SETTINGS.has(key)) return `selected setting ${key} is not supported by agents.run`;
  }
  if (settings.recursive === true && request.runner !== "pi") return "recursive requests require the Pi runner";
  if (settings.recursive === true && settings.cwd !== undefined && settings.cwd !== null) {
    return "recursive agents.run requests must omit custom cwd";
  }
  if (settings.hardDescendantCallLimit !== undefined && capabilities.recursiveHardCallCap !== true) {
    return "the selected hard recursive descendant cap is unavailable";
  }
  return null;
}

function fabricRequest(job) {
  const capabilityError = selectedCapabilityError(job, {
    agentsRun: typeof agents.run === "function",
    nativeResult: true,
    // The installed public request surface has no recursive tree call-count
    // limit.  Post-hoc usage is not treated as a hard cap.
    recursiveHardCallCap: false,
  });
  if (capabilityError !== null) throw new Error(`UNSUPPORTED: ${capabilityError}`);
  const request = job.request;
  const settings = request.settings;
  const recursive = settings.recursive === true;
  const task = request.instructions
    ? `${request.instructions}\n\nTask:\n${request.prompt}`
    : request.prompt;
  return {
    task,
    name: job.workId,
    runner: request.runner,
    model: request.model,
    tools: request.tools,
    ...(settings.transport === undefined ? {} : { transport: settings.transport }),
    ...(settings.persona === undefined ? {} : { persona: settings.persona }),
    ...(settings.thinking === undefined ? {} : { thinking: settings.thinking }),
    ...(settings.timeoutMs === undefined ? {} : { timeoutMs: settings.timeoutMs }),
    ...(settings.extensions === undefined ? {} : { extensions: settings.extensions }),
    ...(recursive ? { recursive: true } : {}),
    // Recursive Fabric parents must omit custom cwd.  A contradictory explicit
    // recursive cwd was rejected above instead of silently altered.
    ...(!recursive && settings.cwd !== undefined ? { cwd: settings.cwd } : {}),
    ...(settings.worktree === undefined ? {} : { worktree: settings.worktree }),
    ...(settings.schema === undefined ? {} : { schema: settings.schema }),
  };
}

async function pythonBridge(argumentsText) {
  const result = await pi.bash({
    command: `${shellQuote(PYTHON)} -B ${shellQuote(RUNNER)} ${argumentsText}`,
  });
  const text = result.output.trim();
  let value;
  try {
    value = JSON.parse(text);
  } catch {
    throw new Error(`local lifecycle returned malformed JSON: ${text.slice(0, 500)}`);
  }
  if (!value || value.schemaVersion !== 1 || !value.public || !Array.isArray(value.jobs)) {
    throw new Error("local lifecycle returned a malformed bridge envelope");
  }
  return value;
}

function admitArguments(request, token, capabilities) {
  const continuation = token === null ? "" : ` --token ${shellQuote(token)}`;
  return [
    "internal-admit",
    `--spec-path ${shellQuote(request.specPath)}`,
    `--output-directory ${shellQuote(request.outputDirectory)}`,
    `--requested-call-ceiling ${INVOCATION_CALL_ALLOWANCE}`,
    // These are the guest's own configured allowance, not a discovered host
    // maximum. fabric_exec is fresh and accepts positive agentBudget values;
    // using only its first call cannot consume an unknown shared remainder.
    // Embedding this program after other calls is outside the public contract.
    `--configured-call-ceiling ${INVOCATION_CALL_ALLOWANCE}`,
    `--usable-call-ceiling ${INVOCATION_CALL_ALLOWANCE}`,
    "--fresh-invocation",
    `--capabilities ${shellQuote(JSON.stringify(capabilities))}`,
    continuation,
  ].join(" ");
}

async function publishNative(request, token, job, payload) {
  const resultPath = `${request.outputDirectory}/.bridge/${token}/${job.workId}.json`;
  await pi.write({ path: resultPath, content: JSON.stringify(payload) + "\n" });
  return pythonBridge(
    [
      "internal-publish-result",
      `--spec-path ${shellQuote(request.specPath)}`,
      `--output-directory ${shellQuote(request.outputDirectory)}`,
      `--token ${shellQuote(token)}`,
      `--attempt-id ${shellQuote(job.workId)}`,
      `--result-path ${shellQuote(resultPath)}`,
    ].join(" "),
  );
}

async function fixedBenchmarkRun(rawRequest) {
  const request = exactRunRequest(rawRequest);
  const preflight = await pythonBridge(`internal-preflight --spec-path ${shellQuote(request.specPath)} --output-directory ${shellQuote(request.outputDirectory)}`);
  if (preflight.public.status !== "checkpoint") return preflight.public;
  let capabilities;
  try {
    const descriptor = await tools.describe({ ref: "agents.run" });
    capabilities = { agentsRun: typeof agents.run === "function", nativeResult: true, requestSchema: descriptor.inputSchema };
  } catch {
    capabilities = { agentsRun: false, nativeResult: false };
  }
  const admission = await pythonBridge(admitArguments(request, null, capabilities));
  if (admission.jobs.length === 0) return admission.public;
  if (admission.jobs.length !== INVOCATION_CALL_ALLOWANCE) {
    throw new Error("lifecycle violated the fixed guest's one-call allowance");
  }
  const token = admission.invocationToken;
  if (typeof token !== "string" || token.length === 0) {
    throw new Error("lifecycle admitted work without an invocation lock token");
  }
  const job = admission.jobs[0];
  const unsupported = selectedCapabilityError(job, {
    agentsRun: typeof agents.run === "function", nativeResult: true, recursiveHardCallCap: false,
  });
  let payload;
  if (unsupported !== null) {
    payload = { error: { name: "UnsupportedCapabilityError", message: unsupported } };
  } else {
    try {
      payload = { native: await agents.run(fabricRequest(job)) };
    } catch (error) {
      payload = { error: {
        name: error && error.name ? String(error.name) : "AgentRunError",
        message: error && error.message ? String(error.message) : String(error),
      } };
    }
  }
  const publication = await publishNative(request, token, job, payload);
  // Re-enter the same saved window only for deterministic exhaustion/finalization.
  // Its one-call allowance is already consumed; this cannot open a new window.
  const settled = publication.public.status === "checkpoint"
    ? await pythonBridge(admitArguments(request, token, capabilities))
    : publication;
  if (settled.invocationToken !== null || settled.jobs.length !== 0) {
    throw new Error("exhausted one-call invocation attempted to retain or admit work");
  }
  if (unsupported !== null) return {
    ...settled.public, status: "unsupported", nextAction: unsupported,
    errors: [{ code: "UNSUPPORTED_SELECTED_CAPABILITY", message: unsupported, workId: job.workId }],
  };
  // No loop can admit a second native call in this fabric_exec invocation.
  return settled.public;
}

const parsedRequest = exactRunRequest(JSON.parse(π.request));
return await fixedBenchmarkRun(parsedRequest);
