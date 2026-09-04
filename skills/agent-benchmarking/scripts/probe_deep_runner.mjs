#!/usr/bin/env node
/** Behavioral failpoint probes for the public runBenchmarkStage bundle. */
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createHash } from 'node:crypto';
import {
  closeSync, cpSync, existsSync, fsyncSync, lstatSync, mkdirSync, mkdtempSync, openSync,
  readFileSync, readdirSync, realpathSync, rmSync, writeFileSync,
} from 'node:fs';
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';

function fail(message) { process.stderr.write(`error: ${message}\n`); process.exit(1); }
function args(argv) {
  if (argv.some(value => value === '--help' || value === '-h')) {
    console.log('usage: probe_deep_runner.mjs --workflow PATH --request PATH --fabric-root PATH --scenario blind-map-publication-failpoint|runtime-capability-tamper|protected-state-conflict|mechanism-totality|resume-finalize-modes|analysis-interruption-matrix');
    process.exit(0);
  }
  const out = {};
  for (let i = 0; i < argv.length; i += 2) {
    if (!argv[i]?.startsWith('--') || argv[i + 1] === undefined) fail('expected --name value arguments');
    out[argv[i].slice(2)] = argv[i + 1];
  }
  for (const key of ['workflow', 'request', 'fabric-root', 'scenario']) if (!out[key]) fail(`--${key} is required`);
  return out;
}
function within(root, candidate) {
  const rel = relative(root, candidate);
  return rel === '' || (!rel.startsWith(`..${sep}`) && rel !== '..' && !isAbsolute(rel));
}
function regular(path) { return existsSync(path) && !lstatSync(path).isSymbolicLink() && lstatSync(path).isFile(); }
function filesBelow(path) {
  if (!existsSync(path)) return [];
  const rows = [];
  const visit = current => {
    for (const name of readdirSync(current)) {
      const child = join(current, name);
      const stat = lstatSync(child);
      if (stat.isSymbolicLink()) rows.push(`symlink:${relative(path, child)}`);
      else if (stat.isDirectory()) visit(child);
      else rows.push(relative(path, child));
    }
  };
  visit(path);
  return rows.sort();
}
function readJson(path) { return JSON.parse(readFileSync(path, 'utf8')); }
function hasTypedStatus(value) {
  return value && typeof value.status === 'string' && Array.isArray(value.qualifiers) &&
    !Object.prototype.hasOwnProperty.call(value, ['status', 'qualifiers'].join('_'));
}

const opt = args(process.argv.slice(2));
const supported = new Set(['blind-map-publication-failpoint', 'runtime-capability-tamper', 'protected-state-conflict', 'mechanism-totality', 'resume-finalize-modes', 'analysis-interruption-matrix']);
if (!supported.has(opt.scenario)) fail(`unsupported scenario: ${opt.scenario}`);
const workflowPath = resolve(opt.workflow);
const requestPath = resolve(opt.request);
const fabricRoot = resolve(opt['fabric-root']);
if (!regular(workflowPath) || !regular(requestPath)) fail('workflow and request must be regular files');
const profileRoot = '/home/balauru/.pi-profiles/fabric';
const skillRoot = resolve(workflowPath, '../..');
function semanticChunk(prefix) {
  const dir = join(fabricRoot, 'dist/chunks');
  const matches = readdirSync(dir).filter(name => name.startsWith(`${prefix}-`) && name.endsWith('.js'));
  if (matches.length !== 1) fail(`expected one ${prefix} chunk`);
  return join(dir, matches[0]);
}
const [{ GUEST_TYPE_DECLARATIONS }, { typeCheckFabricCode }, { QuickJsRuntime }] = await Promise.all([
  import(pathToFileURL(semanticChunk('guest-types'))),
  import(pathToFileURL(semanticChunk('type-checker'))),
  import(pathToFileURL(semanticChunk('quickjs-runtime'))),
]);
const source = readFileSync(workflowPath, 'utf8');
const seedRequestRaw = readFileSync(requestPath, 'utf8');
const seedRequest = JSON.parse(seedRequestRaw);
const executeScenario = ['mechanism-totality', 'resume-finalize-modes'].includes(opt.scenario);
if (seedRequest.dry_run !== false || (executeScenario ?
    (seedRequest.route !== 'Execute' || seedRequest.stage !== 'execute') :
    (seedRequest.route !== 'Analyze' || seedRequest.stage !== 'prepare'))) {
  fail(executeScenario ? 'Execute probe requires an Execute/execute request' : 'probe requires an Analyze prepare request');
}
const packet = resolve(profileRoot, seedRequest.packet_path);
if (!within(profileRoot, packet)) fail('packet escapes profile');
const checked = typeCheckFabricCode(source, GUEST_TYPE_DECLARATIONS);
if (checked.errors.length) fail(checked.errors.map(error => `${error.line}:${error.column} ${error.message}`).join('; '));
const runtime = new QuickJsRuntime();
const execFileAsync = promisify(execFile);

function adapter(options = {}) {
  return {
    production: false,
    agentMode: options.agentMode ?? 'forbid',
    failBeforeContains: options.failBeforeContains ?? null,
    failAfterRelative: options.failAfterRelative ?? null,
    fast: options.fast ?? false,
    packetRoot: options.packetRoot ?? packet,
    agentCalls: 0,
    hostCalls: [],
    failpointHits: 0,
    helperCommit: null,
    temporaryRoots: [],
  };
}
function fakeMeasuredResult(value, state) {
  state.agentCalls += 1;
  const ordinal = state.agentCalls;
  const rawName = String(value.name ?? '');
  const attemptId = rawName.replace(/^attempt-/, '');
  const branches = new Set(['candidate-actor', 'candidate-no-actor', 'control-no-actor', 'missing-mechanism', 'failed-attempt']);
  if (!branches.has(attemptId)) throw new Error(`unexpected measured mechanism branch: ${attemptId}`);
  if ((attemptId === 'candidate-actor') !== (value.recursive === true) ||
      (attemptId === 'candidate-actor' && value.cwd !== undefined) ||
      (attemptId !== 'candidate-actor' && typeof value.cwd !== 'string')) {
    throw new Error(`recursive/cwd contract mismatch for ${attemptId}`);
  }
  const workspace = join(state.packetRoot, 'workspaces', attemptId);
  if (!['control-no-actor', 'missing-mechanism'].includes(attemptId)) {
    exclusiveWrite(join(workspace, 'mechanism.json'), `${JSON.stringify({
      schema_version: 1, attempt_id: attemptId, observed: true,
    })}\n`);
  }
  if (state.temporaryRoots.length === 0) {
    const temporaryRoot = `/tmp/pi-fabric-runs-mechanism-${process.pid}-${Date.now().toString(16)}`;
    mkdirSync(temporaryRoot, { recursive: false, mode: 0o700 });
    state.temporaryRoots.push(temporaryRoot);
  }
  const id = `mechanism-${String(ordinal).padStart(4, '0')}`;
  const runRoot = join(state.temporaryRoots[0], id);
  mkdirSync(runRoot, { mode: 0o700 });
  const logFile = join(runRoot, 'events.jsonl');
  const events = [{ event_type: 'agent start', agent_id: id }];
  if (attemptId === 'candidate-actor') {
    events.push(
      { event_type: 'actor create', child_id: 'mechanism-child-1' },
      { event_type: 'actor terminal', child_id: 'mechanism-child-1' },
      { event_type: 'actor cleanup', child_id: 'mechanism-child-1' },
    );
  }
  const failed = attemptId === 'failed-attempt';
  events.push({ event_type: 'agent terminal', agent_id: id, status: failed ? 'failed' : 'completed' });
  exclusiveWrite(logFile, `${events.map(row => JSON.stringify(row)).join('\n')}\n`);
  const startedAt = Date.now() + ordinal;
  return {
    id,
    status: failed ? 'failed' : 'completed',
    text: failed ? '' : `completed ${attemptId}`,
    value: null,
    model: 'fake-measured-model',
    runner: 'pi',
    sessionId: `mechanism-session-${ordinal}`,
    runnerSessionId: `mechanism-runner-session-${ordinal}`,
    turns: 1,
    toolCalls: 0,
    startedAt,
    finishedAt: startedAt + 5,
    usage: { input: 10, output: 5, cacheRead: 0, cacheWrite: 0, cost: 0 },
    nestedAgents: [],
    logFile,
    error: failed ? 'injected measured attempt failure' : null,
  };
}

function fakeAgentResult(value, state) {
  state.agentCalls += 1;
  const name = String(value.name ?? '');
  const isAdjudicator = name.includes('adjudicator-');
  const judge = name.match(/judge-([0-9]+)$/);
  const passed = isAdjudicator || Number(judge?.[1] ?? 1) % 2 === 1;
  const outcome = {
    status: passed ? 'passed' : 'failed',
    score: passed ? 1 : 0,
    criterion_results: [{
      criterion_id: 'correct',
      status: passed ? 'passed' : 'failed',
      score: passed ? 1 : 0,
      rationale: isAdjudicator ? 'Fake adapter resolves the frozen disagreement.' : 'Fake adapter deterministic judge outcome.',
    }],
  };
  const ordinal = state.agentCalls;
  return {
    status: 'completed',
    text: JSON.stringify(outcome),
    value: outcome,
    model: String(value.model ?? 'fake-model'),
    runner: 'pi',
    runnerSessionId: `fake-session-${ordinal}`,
    turns: 1,
    toolCalls: 0,
    startedAt: 1788500000000 + ordinal * 10,
    finishedAt: 1788500000005 + ordinal * 10,
    usage: { input: 10, output: 5, cacheRead: 0, cacheWrite: 0, cost: 0 },
    nestedAgents: [],
    error: null,
  };
}
function hostPath(path) { return isAbsolute(path) ? resolve(path) : resolve(profileRoot, path); }
function success(output = '') { return { ok: true, output, details: null }; }
function failure(exitCode, error = 'command failed', output = '') {
  return { ok: false, output, details: null, exitCode, error };
}
function quoted(command) { return [...command.matchAll(/'([^']*)'/g)].map(match => match[1]); }
function option(command, name) {
  const match = command.match(new RegExp(`${name.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')}\\s+'([^']*)'`));
  return match?.[1] ?? null;
}
function symlinkComponent(path) {
  let current = resolve(path);
  while (current !== '/') {
    if (existsSync(current) && lstatSync(current).isSymbolicLink()) return true;
    current = dirname(current);
  }
  return false;
}
function sha256Bytes(bytes) { return createHash('sha256').update(bytes).digest('hex'); }
function exclusiveWrite(path, bytes) {
  const fd = openSync(path, 'wx', 0o600);
  try { writeFileSync(fd, bytes); fsyncSync(fd); } finally { closeSync(fd); }
}
function maybeInjectedWrite(state, relativePath, output = '') {
  if (state.failAfterRelative === relativePath) {
    state.failpointHits += 1;
    return failure(98, `injected interruption after ${relativePath}`, output);
  }
  return success(output);
}
function fastBashResult(command, state) {
  let match;
  if ((match = command.match(/^p='([^']+)'; case /))) {
    return symlinkComponent(hostPath(match[1])) ? failure(3, 'symlink component') : success();
  }
  if ((match = command.match(/^if \[ -f '([^']+)' \]; then exit 0; elif \[ -e '[^']+' \]; then exit 4; else exit 1; fi$/))) {
    const path = hostPath(match[1]);
    if (regular(path)) return success();
    return existsSync(path) ? failure(4, 'not a regular file') : failure(1, 'missing');
  }
  if ((match = command.match(/^test -d '([^']+)'$/))) {
    return existsSync(hostPath(match[1])) && lstatSync(hostPath(match[1])).isDirectory() ? success() : failure(1, 'not a directory');
  }
  if ((match = command.match(/^test ! -L '([^']+)' && test -e '[^']+'$/))) {
    return existsSync(hostPath(match[1])) && !lstatSync(hostPath(match[1])).isSymbolicLink() ? success() : failure(1, 'missing or symlink');
  }
  if (command.includes("file exceeds byte bound") && (match = command.match(/ '([^']+)'$/))) {
    const bytes = readFileSync(hostPath(match[1]));
    if (bytes.length > 500000) return failure(1, 'file exceeds byte bound');
    const text = bytes.toString('utf8');
    const lines = text.length === 0 ? 0 : (text.match(/\n/g)?.length ?? 0) + (text.endsWith('\n') ? 0 : 1);
    return success(`${JSON.stringify({ bytes: bytes.length, lines })}\n`);
  }
  if ((match = command.match(/^sha256sum -- '([^']+)'$/))) {
    const bytes = readFileSync(hostPath(match[1]));
    return success(`${sha256Bytes(bytes)}  ${match[1]}\n`);
  }
  if ((match = command.match(/^stat -c %s -- '([^']+)'$/))) {
    return success(`${lstatSync(hostPath(match[1])).size}\n`);
  }
  if ((match = command.match(/^cmp -s -- '([^']+)' '([^']+)'$/))) {
    return readFileSync(hostPath(match[1])).equals(readFileSync(hostPath(match[2]))) ? success() : failure(1, 'different bytes');
  }
  if ((match = command.match(/^realpath -- '([^']+)'$/))) return success(`${realpathSync(hostPath(match[1]))}\n`);
  if ((match = command.match(/^rm -rf -- '([^']+)'$/))) {
    rmSync(hostPath(match[1]), { recursive: true, force: true });
    return success();
  }
  if ((match = command.match(/^umask 077; mktemp -d -- '([^']+)XXXXXX'$/))) {
    return success(`${mkdtempSync(hostPath(match[1]))}\n`);
  }
  if (command.startsWith("if [ -L '") && command.includes('else mkdir -- ')) {
    const paths = [...command.matchAll(/if \[ -L '([^']+)' \]/g)].map(value => value[1]);
    for (const rawPath of paths) {
      const path = hostPath(rawPath);
      if (existsSync(path) && lstatSync(path).isSymbolicLink()) return failure(3, 'symlink parent');
      if (existsSync(path) && !lstatSync(path).isDirectory()) return failure(4, 'non-directory parent');
      if (!existsSync(path)) mkdirSync(path, { mode: 0o700 });
    }
    return success();
  }
  if (command.includes('/scripts/validate_contracts.py')) return success();
  if (command.includes('/scripts/deep_stage.py') && command.includes(' doctor ')) {
    return success(`${JSON.stringify(readJson(join(state.packetRoot, 'preflight/runtime-capability.json')))}\n`);
  }
  if (command.includes('/scripts/verify_seal.py') && command.includes(' verify ')) {
    const seal = option(command, '--seal');
    const revision = seal?.split('/').at(-1);
    return success(`${JSON.stringify({ schema_version: 1, status: 'passed', seal, revision })}\n`);
  }
  if (command.includes('/scripts/generate_blind_map.py')) {
    const privateOutput = option(command, '--private-output');
    const publicOutput = option(command, '--public-output');
    const receiptOutput = option(command, '--receipt-output');
    const schedule = option(command, '--schedule');
    const seed = Number(option(command, '--seed'));
    if (!privateOutput || !publicOutput || !receiptOutput || !schedule) return failure(2, 'malformed blind-map command');
    const privateBytes = readFileSync(join(state.packetRoot, 'blind-map.private.json'));
    const publicBytes = readFileSync(join(state.packetRoot, 'blind-map.public.json'));
    exclusiveWrite(privateOutput, privateBytes);
    exclusiveWrite(publicOutput, publicBytes);
    const receipt = {
      schema_version: 1, status: 'committed', tool: 'generate_blind_map', seed,
      schedule_sha256: sha256Bytes(readFileSync(hostPath(schedule))),
      outputs: [
        { role: 'private', path: privateOutput, sha256: sha256Bytes(privateBytes), bytes: privateBytes.length },
        { role: 'public', path: publicOutput, sha256: sha256Bytes(publicBytes), bytes: publicBytes.length },
      ],
    };
    exclusiveWrite(receiptOutput, Buffer.from(`${JSON.stringify(receipt)}\n`));
    state.helperCommit = receipt;
    return success();
  }
  if (command.includes('/scripts/write_once.py')) {
    const rawRoot = option(command, '--root');
    if (!rawRoot) return failure(2, 'write_once root missing');
    const root = hostPath(rawRoot);
    const inputRelative = option(command, '--input');
    let source;
    let destinationRelative;
    if (inputRelative !== null) {
      const values = quoted(command);
      destinationRelative = values.at(-1);
      source = join(root, inputRelative);
    } else {
      const io = command.match(/(?:--json |--jsonl )?'([^']+)' < '([^']+)'$/);
      if (!io) return failure(2, 'write_once redirection malformed');
      destinationRelative = io[1];
      source = io[2];
    }
    const destination = join(root, destinationRelative);
    try { exclusiveWrite(destination, readFileSync(source)); }
    catch (error) { return failure(error?.code === 'EEXIST' ? 1 : 2, error.message); }
    return maybeInjectedWrite(state, destinationRelative);
  }
  return null;
}

async function bashResult(command, state) {
  if (state.failBeforeContains && command.includes('write_once.py') && command.includes(state.failBeforeContains)) {
    state.failpointHits += 1;
    return { ok: false, output: '', details: null, exitCode: 97, error: 'injected pre-publication failpoint' };
  }
  if (state.fast) {
    const fast = fastBashResult(command, state);
    if (fast !== null) return fast;
  }
  let child;
  try {
    child = await execFileAsync('/bin/bash', ['-lc', command], {
      cwd: profileRoot,
      encoding: 'utf8',
      env: { ...process.env, PYTHONDONTWRITEBYTECODE: '1' },
      timeout: 120000,
      maxBuffer: 8 * 1024 * 1024,
    });
  } catch (error) {
    return {
      ok: false, output: typeof error.stdout === 'string' ? error.stdout : '', details: null,
      exitCode: typeof error.code === 'number' ? error.code : null,
      error: typeof error.stderr === 'string' && error.stderr ? error.stderr : error.message,
    };
  }
  if (command.includes('generate_blind_map.py')) {
    const match = command.match(/--receipt-output\s+'([^']+)'/);
    if (match && regular(match[1])) state.helperCommit = readJson(match[1]);
  }
  if (state.failAfterRelative && command.includes('write_once.py') && command.includes(`'${state.failAfterRelative}'`)) {
    state.failpointHits += 1;
    return { ok: false, output: child.stdout ?? '', details: null, exitCode: 98, error: `injected interruption after ${state.failAfterRelative}` };
  }
  return { ok: true, output: child.stdout ?? '', details: null };
}
function hostCallFor(state) {
  return async (ref, value) => {
    state.hostCalls.push(ref);
    if (ref === 'agents.run') {
      if (state.agentMode === 'mechanism') return fakeMeasuredResult(value, state);
      if (state.agentMode !== 'fake') throw new Error(`agent call forbidden in zero-call probe: ${ref}`);
      return fakeAgentResult(value, state);
    }
    if (ref.startsWith('agents.')) throw new Error(`unexpected agent operation: ${ref}`);
    if (['fabric.$configure', 'fabric.$phase', 'fabric.$item', 'fabric.$event', 'fabric.$spanStart', 'fabric.$spanEnd'].includes(ref)) return {};
    if (ref === 'pi.bash') return await bashResult(String(value.command ?? ''), state);
    if (ref === 'pi.write') {
      const path = isAbsolute(String(value.path ?? '')) ? resolve(String(value.path)) : resolve(profileRoot, String(value.path));
      if (!within(profileRoot, path) && !within('/tmp', path)) throw new Error(`write outside probe roots: ${path}`);
      const fs = await import('node:fs');
      fs.mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
      fs.writeFileSync(path, String(value.content ?? ''), { flag: 'w', mode: 0o600 });
      return { ok: true, output: '', details: null };
    }
    if (ref === 'pi.read') {
      const path = isAbsolute(String(value.path ?? '')) ? resolve(String(value.path)) : resolve(profileRoot, String(value.path));
      if (!within(profileRoot, path) && !within('/tmp', path) && !within(skillRoot, path)) throw new Error(`read outside probe roots: ${path}`);
      const lines = readFileSync(path, 'utf8').match(/.*(?:\n|$)/g)?.filter(Boolean) ?? [];
      const offset = Math.max(1, Number(value.offset ?? 1));
      const limit = Math.max(1, Number(value.limit ?? 2000));
      return lines.slice(offset - 1, offset - 1 + limit).join('');
    }
    throw new Error(`unexpected host call: ${ref}`);
  };
}
async function executeRequest(raw, state, engine = runtime) {
  return engine.execute(source, hostCallFor(state), {
    strings: { request: raw },
    tokenBudget: 1,
    timeoutMs: 180000,
    memoryLimitBytes: 384 * 1024 * 1024,
    maxLogChars: 20000,
    transpiledCode: checked.javascript,
    transpiledSourceMap: checked.sourceMap,
  });
}
function assertExecution(executed, label) {
  if (executed.terminationReason !== 'completed') fail(`${label}: QuickJS ${executed.terminationReason}: ${executed.error ?? ''}`);
  if (!hasTypedStatus(executed.value)) fail(`${label}: runner receipt lacks typed {status, qualifiers}`);
}

async function runBlindMapProbe() {
  const state = adapter({ failBeforeContains: 'blind-map.private.json' });
  const executed = await executeRequest(seedRequestRaw, state);
  assertExecution(executed, 'blind-map failpoint');
  const privatePath = join(packet, 'blind-map.private.json');
  const publicPath = join(packet, 'blind-map.public.json');
  const commitPath = join(packet, 'blind-map.commit.json');
  const interruption = {
    private_map: existsSync(privatePath),
    public_map: existsSync(publicPath),
    commit: existsSync(commitPath),
  };
  const repairState = adapter({ agentMode: 'forbid' });
  const repaired = await executeRequest(seedRequestRaw, repairState);
  assertExecution(repaired, 'blind-map deterministic repair');
  const commit = regular(commitPath) ? readJson(commitPath) : null;
  const descriptors = Array.isArray(commit?.outputs) ? commit.outputs : [];
  const commitValid = commit?.status === 'committed' && commit?.tool === 'generate_blind_map' &&
    descriptors.map(row => row.path).join(',') === 'blind-map.private.json,blind-map.public.json' &&
    descriptors.every(row => regular(join(packet, row.path)) &&
      row.sha256 === sha256Bytes(readFileSync(join(packet, row.path))) &&
      row.bytes === lstatSync(join(packet, row.path)).size);
  const passed = state.agentCalls === 0 && state.failpointHits === 1 && state.helperCommit?.status === 'committed' &&
    !interruption.private_map && !interruption.public_map && !interruption.commit && executed.value?.status === 'failed' &&
    repairState.agentCalls === 0 && repaired.value?.status === 'checkpoint' && repaired.value?.agent_calls === 0 && commitValid;
  return {
    schema_version: 1,
    status: passed ? 'passed' : 'failed',
    scenario: opt.scenario,
    workflow_sha256: createHash('sha256').update(source).digest('hex'),
    request_sha256: createHash('sha256').update(seedRequestRaw).digest('hex'),
    termination_reason: executed.terminationReason,
    agent_calls: state.agentCalls + repairState.agentCalls,
    failpoint_triggered: state.failpointHits === 1,
    helper_commit_status: state.helperCommit?.status ?? null,
    private_map_state_after_interruption: interruption.private_map ? 'present' : 'missing',
    public_map_state_after_interruption: interruption.public_map ? 'present' : 'missing',
    commit_state_after_interruption: interruption.commit ? 'present' : 'missing',
    private_map_state: existsSync(privatePath) ? 'present' : 'missing',
    public_map_state: existsSync(publicPath) ? 'present' : 'missing',
    packet_commit_status: commit?.status ?? null,
    packet_commit_paths: descriptors.map(row => row.path),
    runner_receipt: executed.value,
    repair_receipt: repaired.value,
    host_call_count: state.hostCalls.length + repairState.hostCalls.length,
  };
}

async function runProtectedStateConflictProbe() {
  const protectedRelative = seedRequest.protected_state_binding?.path;
  if (typeof protectedRelative !== 'string') fail('request has no protected-state binding');
  const clone = join(dirname(packet), `${basename(packet)}-protected-state-conflict`);
  rmSync(clone, { recursive: true, force: true });
  cpSync(packet, clone, { recursive: true, errorOnExist: true, preserveTimestamps: true });
  try {
    const protectedPath = join(clone, protectedRelative);
    const protectedState = readJson(protectedPath);
    const actorRoot = `${protectedState.project_root}/.pi/fabric/mesh`;
    protectedState.status = 'incompatible';
    protectedState.protected_absolute_roots = [`${protectedState.project_root}/.pi`];
    protectedState.actor_state_root = actorRoot;
    protectedState.conflicts = [`actor state ${actorRoot} overlaps protected path ${protectedState.project_root}/.pi`];
    writeFileSync(protectedPath, `${JSON.stringify(protectedState)}\n`, { flag: 'w', mode: 0o600 });
    const request = {
      ...seedRequest,
      request_id: 'protected-state-conflict',
      packet_path: relative(profileRoot, clone).split(sep).join('/'),
      protected_state_binding: {
        path: protectedRelative,
        sha256: sha256Bytes(readFileSync(protectedPath)),
      },
    };
    const state = adapter({ agentMode: 'forbid' });
    const executed = await executeRequest(`${JSON.stringify(request)}\n`, state, new QuickJsRuntime());
    assertExecution(executed, 'protected-state conflict');
    const failure = String(executed.value.failure?.message ?? '');
    const safeNextAction = String(executed.value.failure?.safe_next_action ?? '');
    const refused = executed.value.status === 'failed' && executed.value.agent_calls === 0 &&
      executed.value.model_calls_consumed === 0 && failure.includes('protected-state compatibility gate did not pass') &&
      safeNextAction === 'establish non-overlapping protected-state isolation, regenerate and bind its compatibility receipt, then rerun prelaunch gates; do not launch scored work';
    return {
      schema_version: 1,
      status: refused && state.agentCalls === 0 ? 'passed' : 'failed',
      scenario: opt.scenario,
      non_scoring: true,
      workflow_sha256: createHash('sha256').update(source).digest('hex'),
      protected_status: protectedState.status,
      conflict_count: protectedState.conflicts.length,
      safe_next_action: safeNextAction,
      agent_calls: state.agentCalls,
      runner_receipt: executed.value,
    };
  } finally {
    rmSync(clone, { recursive: true, force: true });
  }
}

async function runRuntimeCapabilityTamperProbe() {
  const capabilityRelative = seedRequest.runtime_capability_binding?.path;
  if (typeof capabilityRelative !== 'string') fail('request has no runtime capability binding');
  const cases = [
    ['output_bounds', value => { value.output_bounds.max_output_chars += 1; }],
    ['event_log_bounds', value => { value.event_log_bounds.max_event_line_chars += 1; }],
    ['supported_agent_request_fields', value => {
      value.supported_agent_request_fields = value.supported_agent_request_fields.filter(field => field !== 'schema');
    }],
    ['supported_agent_result_fields', value => {
      value.supported_agent_result_fields = value.supported_agent_result_fields.filter(field => field !== 'usage');
    }],
  ];
  const rows = [];
  for (let index = 0; index < cases.length; index += 1) {
    const [field, mutate] = cases[index];
    const clone = join(dirname(packet), `${basename(packet)}-capability-tamper-${String(index + 1).padStart(2, '0')}`);
    rmSync(clone, { recursive: true, force: true });
    cpSync(packet, clone, { recursive: true, errorOnExist: true, preserveTimestamps: true });
    try {
      const capabilityPath = join(clone, capabilityRelative);
      const capability = readJson(capabilityPath);
      mutate(capability);
      writeFileSync(capabilityPath, `${JSON.stringify(capability)}\n`, { flag: 'w', mode: 0o600 });
      const request = {
        ...seedRequest,
        request_id: `capability-tamper-${String(index + 1).padStart(2, '0')}`,
        packet_path: relative(profileRoot, clone).split(sep).join('/'),
        runtime_capability_binding: {
          path: capabilityRelative,
          sha256: sha256Bytes(readFileSync(capabilityPath)),
        },
      };
      const state = adapter({ agentMode: 'forbid' });
      const executed = await executeRequest(`${JSON.stringify(request)}\n`, state, new QuickJsRuntime());
      assertExecution(executed, `runtime capability tamper ${field}`);
      const refused = executed.value.status === 'failed' && executed.value.agent_calls === 0 &&
        executed.value.model_calls_consumed === 0 &&
        String(executed.value.failure?.message ?? '').includes('bound runtime capability differs from the installed-byte doctor');
      rows.push({ field, status: executed.value.status, agent_calls: state.agentCalls, refused });
    } finally {
      rmSync(clone, { recursive: true, force: true });
    }
  }
  const passed = rows.length === cases.length && rows.every(row => row.refused && row.agent_calls === 0);
  return {
    schema_version: 1,
    status: passed ? 'passed' : 'failed',
    scenario: opt.scenario,
    non_scoring: true,
    workflow_sha256: createHash('sha256').update(source).digest('hex'),
    tamper_cases: rows,
    agent_calls: rows.reduce((total, row) => total + row.agent_calls, 0),
  };
}

function stagedTargets(requestId) {
  const base = `analysis/analysis-v1/staging/${requestId}`;
  return [
    `${base}/execution/events.jsonl`,
    `${base}/execution/ledger.jsonl`,
    `${base}/grading-matrix.jsonl`,
    `${base}/telemetry.jsonl`,
    `${base}/telemetry-aggregate.json`,
    `${base}/analysis-input.json`,
    `${base}/analysis.json`,
    'seal-receipts/design-design-v1.json',
    'seal-receipts/execution-execution-v1.json',
    'seal-receipts/raw-freeze-raw-v1.json',
    `${base}/telemetry-coverage.json`,
    `${base}/reconciliation.json`,
    `${base}/decision-report.json`,
  ];
}

async function runMechanismTotalityProbe() {
  const state = adapter({ agentMode: 'mechanism', packetRoot: packet });
  try {
    const executed = await executeRequest(seedRequestRaw, state, new QuickJsRuntime());
    assertExecution(executed, 'mechanism totality');
    const expected = {
      'candidate-actor': { valid: true, reason: 'actor-mechanism-observed', status: 'valid', terminal: 'succeeded' },
      'candidate-no-actor': { valid: true, reason: 'mechanism-observed', status: 'valid', terminal: 'succeeded' },
      'control-no-actor': { valid: true, reason: 'mechanism-not-applicable', status: 'not-applicable', terminal: 'succeeded' },
      'missing-mechanism': { valid: false, reason: 'mechanism-source-missing', status: 'invalid', terminal: 'invalid' },
      'failed-attempt': { valid: false, reason: 'attempt-not-successful', status: 'invalid', terminal: 'failed' },
    };
    const branches = Object.entries(expected).map(([attemptId, wanted]) => {
      const mechanismPath = join(packet, 'attempts', attemptId, 'mechanism.json');
      const terminalPath = join(packet, 'attempts', attemptId, 'terminal.json');
      const mechanism = regular(mechanismPath) ? readJson(mechanismPath) : null;
      const terminal = regular(terminalPath) ? readJson(terminalPath) : null;
      const evidenceResolved = Array.isArray(mechanism?.evidence) && mechanism.evidence.every(path => regular(join(packet, path)));
      const matches = mechanism?.valid === wanted.valid && mechanism?.reason === wanted.reason &&
        mechanism?.status === wanted.status && terminal?.status === wanted.terminal &&
        mechanism?.attempt_status === (attemptId === 'missing-mechanism' ? 'succeeded' : wanted.terminal) &&
        evidenceResolved && terminal?.mechanism_evidence_path === `attempts/${attemptId}/mechanism.json` &&
        Array.isArray(terminal?.artifact_paths) && terminal.artifact_paths.includes(`attempts/${attemptId}/mechanism.json`);
      return {
        attempt_id: attemptId, matches, valid: mechanism?.valid ?? null,
        reason: mechanism?.reason ?? null, status: mechanism?.status ?? null,
        attempt_status: mechanism?.attempt_status ?? null, terminal_status: terminal?.status ?? null,
        evidence_count: Array.isArray(mechanism?.evidence) ? mechanism.evidence.length : 0,
        actor_expected: mechanism?.actor_expected ?? null, actor_observed: mechanism?.actor_observed ?? null,
        source_state: mechanism?.source_state ?? null,
      };
    });
    const passed = executed.value.status === 'complete' && executed.value.complete === true &&
      state.agentCalls === 5 && branches.length === 5 && branches.every(row => row.matches);
    return {
      schema_version: 1,
      status: passed ? 'passed' : 'failed',
      scenario: opt.scenario,
      non_scoring: true,
      workflow_sha256: createHash('sha256').update(source).digest('hex'),
      agent_calls: state.agentCalls,
      runner_status: executed.value.status,
      runner_complete: executed.value.complete,
      branches,
      runner_receipt: executed.value,
    };
  } finally {
    for (const root of state.temporaryRoots) rmSync(root, { recursive: true, force: true });
  }
}

async function runResumeFinalizeModesProbe() {
  const resumeState = adapter({ agentMode: 'forbid', packetRoot: packet });
  const companion = join(dirname(packet), `${basename(packet)}-finalize-companion`);
  try {
    const resumed = await executeRequest(seedRequestRaw, resumeState, new QuickJsRuntime());
    assertExecution(resumed, 'public Execute resume classification');
    const expected = new Map([
      ['candidate-actor', 'skip'],
      ['candidate-no-actor', 'deterministic-repair-only'],
      ['control-no-actor', 'refuse-replay'],
      ['missing-mechanism', 'run'],
      ['failed-attempt', 'refuse-replay'],
    ]);
    const actions = Array.isArray(resumed.value.resume_actions) ? resumed.value.resume_actions : [];
    const actionMap = new Map(actions.map(row => [row.attempt_id, row.action]));
    const fourActions = new Set(actions.map(row => row.action));
    const repair = actions.find(row => row.attempt_id === 'candidate-no-actor');
    const resumePassed = resumed.value.status === 'blocked' && resumed.value.complete === false &&
      resumeState.agentCalls === 0 && resumed.value.agent_calls === 0 && actions.length === expected.size &&
      [...expected].every(([attemptId, action]) => actionMap.get(attemptId) === action) &&
      [...fourActions].sort().join(',') === ['deterministic-repair-only', 'refuse-replay', 'run', 'skip'].sort().join(',') &&
      Array.isArray(repair?.evidence) && repair.evidence.length > 0 &&
      repair.evidence.every(relative => regular(join(packet, relative))) &&
      Array.isArray(resumed.value.deterministic_repair_only) &&
      resumed.value.deterministic_repair_only.join(',') === 'candidate-no-actor' &&
      Array.isArray(resumed.value.ambiguous) && resumed.value.ambiguous.includes('control-no-actor') &&
      Array.isArray(resumed.value.never_assigned) && resumed.value.never_assigned.includes('missing-mechanism') &&
      Array.isArray(resumed.value.refused_replay) && resumed.value.refused_replay.includes('failed-attempt') &&
      regular(join(packet, String(resumed.value.resume_plan_path ?? '')));

    if (existsSync(companion)) fail(`finalize companion already exists: ${companion}`);
    await execFileAsync('python', [
      '-B', join(skillRoot, 'scripts/build_p217_replay.py'), '--root', companion,
      '--compact-interruption-fixture', '--pre-finalize-fixture',
    ], { cwd: skillRoot, maxBuffer: 16 * 1024 * 1024 });
    const finalizeRaw = readFileSync(join(companion, 'replay/requests/finalize.json'), 'utf8');
    const finalizeState = adapter({ agentMode: 'forbid', fast: true, packetRoot: companion });
    const finalized = await executeRequest(finalizeRaw, finalizeState, new QuickJsRuntime());
    assertExecution(finalized, 'public zero-call finalize');
    const commit = regular(join(companion, 'analysis/analysis-v1/commit.json'))
      ? readJson(join(companion, 'analysis/analysis-v1/commit.json')) : null;
    const finalizePassed = finalized.value.status === 'complete' && finalized.value.complete === true &&
      finalizeState.agentCalls === 0 && finalized.value.agent_calls === 0 &&
      commit?.status === 'committed' && commit?.strict_reconciliation_complete === true;
    const passed = resumePassed && finalizePassed;
    return {
      schema_version: 1,
      status: passed ? 'passed' : 'failed',
      scenario: opt.scenario,
      adapter: 'production-shaped-deep-runner-non-scoring',
      workflow_sha256: createHash('sha256').update(source).digest('hex'),
      resume_agent_calls: resumeState.agentCalls,
      resume_status: resumed.value.status,
      resume_complete: resumed.value.complete,
      resume_actions: actions,
      action_set: [...fourActions].sort(),
      deterministic_repair_only: resumed.value.deterministic_repair_only,
      ambiguous: resumed.value.ambiguous,
      never_assigned: resumed.value.never_assigned,
      refused_replay: resumed.value.refused_replay,
      resume_plan_path: resumed.value.resume_plan_path,
      finalize_agent_calls: finalizeState.agentCalls,
      finalize_status: finalized.value.status,
      finalize_complete: finalized.value.complete,
      finalize_commit_status: commit?.status ?? null,
      strict_reconciliation_complete: commit?.strict_reconciliation_complete ?? false,
      resume_receipt: resumed.value,
      finalize_receipt: finalized.value,
    };
  } finally {
    rmSync(companion, { recursive: true, force: true });
  }
}

async function runAnalysisInterruptionMatrix() {
  const metadata = readJson(join(packet, 'replay/metadata.json'));
  if (!Array.isArray(metadata.request_order) || metadata.request_order.at(-1) !== 'finalize') fail('invalid replay request order');
  if (metadata.prefinalize_terminal_count !== 4) {
    fail(`interruption matrix requires exactly four immutable pre-finalize terminals, observed ${metadata.prefinalize_terminal_count}`);
  }
  const terminalCount = filesBelow(join(packet, 'grader-runs')).filter(path => path.endsWith('/terminal.json')).length;
  if (terminalCount !== 4) fail(`pre-finalize fixture terminal count is ${terminalCount}, expected 4`);
  const setupAgentCalls = 0;
  const setupReceipts = [{ name: 'pre-finalize-fixture', status: 'immutable', qualifiers: ['non-scoring'], agent_calls: 0 }];
  const originalFinalize = readJson(join(packet, 'replay/requests/finalize.json'));
  const commitRelative = 'analysis/analysis-v1/commit.json';
  const outputsRelative = 'analysis/analysis-v1/outputs';
  if (existsSync(join(packet, commitRelative)) || filesBelow(join(packet, outputsRelative)).length !== 0) {
    fail('base packet was published before interruption matrix');
  }
  const rows = new Array(13);
  const matrixPrefix = `${basename(packet)}-analysis-interrupt`;
  const runNonce = createHash('sha256').update(packet).digest('hex').slice(0, 10);
  const runCase = async index => {
    const clone = join(dirname(packet), `${matrixPrefix}-${String(index + 1).padStart(2, '0')}`);
    rmSync(clone, { recursive: true, force: true });
    cpSync(packet, clone, { recursive: true, errorOnExist: true, preserveTimestamps: true });
    const requestId = `matrix-${runNonce}-${String(index + 1).padStart(2, '0')}`;
    const request = {
      ...originalFinalize,
      request_id: requestId,
      packet_path: relative(profileRoot, clone).split(sep).join('/'),
    };
    const target = stagedTargets(requestId)[index];
    const raw = `${JSON.stringify(request)}\n`;
    const engine = new QuickJsRuntime();
    const interruptedState = adapter({ failAfterRelative: target, fast: true, packetRoot: clone });
    const interrupted = await executeRequest(raw, interruptedState, engine);
    assertExecution(interrupted, `interrupt ${target}`);
    const canonicalAfterFailure = filesBelow(join(clone, outputsRelative));
    const failurePath = join(clone, `checkpoints/${requestId}/failure.json`);
    const interruptedOwned = interrupted.value.owned_temporary_paths;
    const interruptedCleaned = interrupted.value.cleaned_temporary_paths;
    const interruptedScratchClean = Array.isArray(interruptedOwned) && interruptedOwned.length === 1 &&
      Array.isArray(interruptedCleaned) && interruptedCleaned.length === 1 &&
      interruptedOwned[0] === interruptedCleaned[0] && !existsSync(interruptedOwned[0]);
    const failureValid = interrupted.value.status === 'failed' && interrupted.value.complete === false &&
      interrupted.value.agent_calls === 0 && interrupted.value.model_calls_consumed === 0 && interruptedScratchClean &&
      typeof interrupted.value.failure?.safe_next_action === 'string' && regular(failurePath);
    if (interruptedState.failpointHits !== 1 || !regular(join(clone, target)) ||
        canonicalAfterFailure.length !== 0 || existsSync(join(clone, commitRelative)) || !failureValid) {
      fail(`interruption invariant failed at ${target}: ${JSON.stringify({
        hits: interruptedState.failpointHits,
        target: regular(join(clone, target)),
        canonicalAfterFailure,
        commit: existsSync(join(clone, commitRelative)),
        receipt: interrupted.value,
      })}`);
    }
    const repairState = adapter({ agentMode: 'forbid', fast: true, packetRoot: clone });
    const repaired = await executeRequest(raw, repairState, engine);
    assertExecution(repaired, `repair ${target}`);
    const commitPath = join(clone, commitRelative);
    const canonicalAfterRepair = filesBelow(join(clone, outputsRelative));
    const commit = regular(commitPath) ? readJson(commitPath) : null;
    const repairOwned = repaired.value.owned_temporary_paths;
    const repairCleaned = repaired.value.cleaned_temporary_paths;
    const repairScratchClean = Array.isArray(repairOwned) && repairOwned.length === 1 &&
      Array.isArray(repairCleaned) && repairCleaned.length === 1 && repairOwned[0] === repairCleaned[0] &&
      repairOwned[0] !== interruptedOwned[0] && !existsSync(repairOwned[0]);
    if (repairState.agentCalls !== 0 || repaired.value.status !== 'complete' || repaired.value.agent_calls !== 0 ||
        repaired.value.complete !== true || !repairScratchClean || commit?.status !== 'committed' ||
        commit?.strict_reconciliation_complete !== true || canonicalAfterRepair.length !== 10) {
      fail(`deterministic repair failed at ${target}: ${JSON.stringify({
        repairAgentCalls: repairState.agentCalls,
        canonicalAfterRepair,
        commit,
        receipt: repaired.value,
      })}`);
    }
    rows[index] = {
      index: index + 1,
      target,
      interrupted_status: interrupted.value.status,
      interrupted_model_calls: interrupted.value.model_calls_consumed,
      canonical_outputs_after_interruption: canonicalAfterFailure.length,
      commit_after_interruption: false,
      repair_status: repaired.value.status,
      repair_agent_calls: repairState.agentCalls,
      committed_outputs: canonicalAfterRepair.length,
      strict_reconciliation_complete: commit.strict_reconciliation_complete,
      unique_owned_scratch_cleaned: interruptedScratchClean && repairScratchClean,
    };
    rmSync(clone, { recursive: true, force: true });
  };
  let nextCase = 0;
  const worker = async () => {
    while (nextCase < rows.length) {
      const index = nextCase;
      nextCase += 1;
      await runCase(index);
    }
  };
  await Promise.all(Array.from({ length: 2 }, () => worker()));
  const passed = rows.length === 13 && rows.every(row => row.interrupted_status === 'failed' &&
    row.interrupted_model_calls === 0 && row.canonical_outputs_after_interruption === 0 &&
    row.commit_after_interruption === false && row.repair_status === 'complete' &&
    row.repair_agent_calls === 0 && row.committed_outputs === 10 && row.strict_reconciliation_complete === true);
  return {
    schema_version: 1,
    status: passed ? 'passed' : 'failed',
    scenario: opt.scenario,
    adapter: 'deterministic-fake-non-scoring',
    workflow_sha256: createHash('sha256').update(source).digest('hex'),
    setup_agent_calls: setupAgentCalls,
    planned_setup_agent_calls: 0,
    prefinalize_terminal_count: metadata.prefinalize_terminal_count,
    finalize_agent_calls: 0,
    publication_step_count: rows.length,
    setup_receipts: setupReceipts,
    steps: rows,
  };
}

const receipt = opt.scenario === 'blind-map-publication-failpoint'
  ? await runBlindMapProbe()
  : opt.scenario === 'runtime-capability-tamper'
    ? await runRuntimeCapabilityTamperProbe()
    : opt.scenario === 'protected-state-conflict'
      ? await runProtectedStateConflictProbe()
      : opt.scenario === 'mechanism-totality'
        ? await runMechanismTotalityProbe()
        : opt.scenario === 'resume-finalize-modes'
          ? await runResumeFinalizeModesProbe()
          : await runAnalysisInterruptionMatrix();
process.stdout.write(`${JSON.stringify(receipt)}\n`);
if (receipt.status !== 'passed') process.exitCode = 1;
