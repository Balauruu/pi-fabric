import assert from "node:assert/strict";
import { spawn, spawnSync, type ChildProcessWithoutNullStreams } from "node:child_process";
import { mkdir, mkdtemp, readFile, readdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { StringDecoder } from "node:string_decoder";
import test from "node:test";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const piBin = join(projectRoot, "node_modules/.bin/pi");
const reloadFixture = join(projectRoot, "tests/fixtures/pr1-reload-extension.ts");

type RpcRecord = Record<string, any>;

class RpcClient {
  readonly child: ChildProcessWithoutNullStreams;
  readonly records: RpcRecord[] = [];
  readonly stderr: string[] = [];
  #waiters = new Set<() => void>();
  #nextId = 0;

  constructor(args: readonly string[], options: { cwd: string; env: NodeJS.ProcessEnv }) {
    this.child = spawn(piBin, [...args], { cwd: options.cwd, env: options.env, stdio: ["pipe", "pipe", "pipe"] });
    this.#readJsonl(this.child.stdout);
    this.child.stderr.on("data", (chunk: Buffer) => this.stderr.push(chunk.toString("utf8")));
  }

  #readJsonl(stream: NodeJS.ReadableStream): void {
    const decoder = new StringDecoder("utf8");
    let buffer = "";
    stream.on("data", (chunk: Buffer) => {
      buffer += decoder.write(chunk);
      for (;;) {
        const newline = buffer.indexOf("\n");
        if (newline < 0) break;
        const line = buffer.slice(0, newline).replace(/\r$/u, "");
        buffer = buffer.slice(newline + 1);
        if (line) this.records.push(JSON.parse(line) as RpcRecord);
        for (const wake of this.#waiters) wake();
      }
    });
  }

  async waitFor(predicate: (record: RpcRecord) => boolean, start = 0, timeoutMs = 30_000): Promise<RpcRecord> {
    const found = this.records.slice(start).find(predicate);
    if (found) return found;
    return new Promise<RpcRecord>((resolvePromise, reject) => {
      const timeout = setTimeout(() => {
        cleanup();
        reject(new Error(`RPC timeout; stderr=${this.stderr.join("")}; records=${JSON.stringify(this.records.slice(start))}`));
      }, timeoutMs);
      const inspect = () => {
        const record = this.records.slice(start).find(predicate);
        if (!record) return;
        cleanup();
        resolvePromise(record);
      };
      const cleanup = () => { clearTimeout(timeout); this.#waiters.delete(inspect); };
      this.#waiters.add(inspect);
      this.child.once("exit", (code) => {
        if (!this.#waiters.has(inspect)) return;
        cleanup();
        reject(new Error(`Pi RPC exited ${code}; stderr=${this.stderr.join("")}`));
      });
    });
  }

  async request(command: RpcRecord): Promise<{ response: RpcRecord; start: number }> {
    const id = `pr1-${++this.#nextId}`;
    const start = this.records.length;
    this.child.stdin.write(`${JSON.stringify({ ...command, id })}\n`);
    const response = await this.waitFor((record) => record.type === "response" && record.id === id, start, 60_000);
    return { response, start };
  }

  async close(): Promise<void> {
    this.child.stdin.end();
    if (this.child.exitCode !== null) return;
    await new Promise<void>((resolvePromise) => {
      const timeout = setTimeout(() => { this.child.kill("SIGTERM"); }, 1_000);
      this.child.once("exit", () => { clearTimeout(timeout); resolvePromise(); });
    });
  }
}

function withoutInheritedPiEnvironment(overrides: NodeJS.ProcessEnv = {}): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = { ...process.env };
  for (const key of Object.keys(env)) if (key.startsWith("PI_")) delete env[key];
  return Object.assign(env, overrides);
}

async function pathsBelow(root: string): Promise<string[]> {
  const paths: string[] = [];
  async function walk(directory: string): Promise<void> {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      const relative = path.slice(root.length + 1);
      paths.push(relative);
      if (entry.isDirectory() && entry.name !== "node_modules") await walk(path);
    }
  }
  await walk(root);
  return paths.sort();
}

test("clean packed install source-loads in Pi, reloads edited source, and stays passive", { timeout: 180_000 }, async () => {
  const root = await mkdtemp(join(tmpdir(), "arbor-pr1-install-"));
  const subprocessEnv = withoutInheritedPiEnvironment();
  const pack = spawnSync("npm", ["pack", "--ignore-scripts", "--json", "--pack-destination", root], { cwd: projectRoot, env: subprocessEnv, encoding: "utf8", timeout: 60_000 });
  assert.equal(pack.status, 0, pack.stderr || pack.stdout);
  const packPayload = JSON.parse(pack.stdout) as Array<{ filename: string; files: Array<{ path: string }> }> | Record<string, { filename: string; files: Array<{ path: string }> }>;
  const packed = Array.isArray(packPayload) ? packPayload : Object.values(packPayload);
  assert.equal(packed.length, 1);
  const inventory = packed[0]!.files.map((entry) => entry.path).sort();
  assert.equal(inventory.some((path) => /(^|\/)(?:dist|\.test-dist)(?:\/|$)/u.test(path)), false);
  assert.equal(inventory.some((path) => path.startsWith("certification/")), false);
  for (const path of [
    "bin/pi-fabric-arbor.mjs", "src/extension.ts", "src/package.ts", "src/package-layout.ts",
    "src/cli/read-only.ts", "src/web/SourceWebAssets.ts", "skills/fabric-arbor/SKILL.md",
    "skills/fabric-arbor/roles/coordinator.md", "skills/fabric-arbor/roles/executor.md",
    "skills/fabric-arbor/roles/literature.md", "web/read-only/index.html", "web/read-only/app.js", "web/read-only/app.css",
  ]) assert.ok(inventory.includes(path), `pack inventory omitted ${path}`);

  const fixture = join(root, "fixture");
  await mkdir(fixture);
  await writeFile(join(fixture, "package.json"), `${JSON.stringify({
    private: true,
    type: "module",
    dependencies: { "pi-fabric": "0.83.0", "pi-fabric-arbor": `file:${join(root, packed[0]!.filename)}` },
  }, null, 2)}\n`);
  const install = spawnSync("npm", ["install", "--ignore-scripts", "--offline", "--no-audit", "--no-fund"], { cwd: fixture, env: subprocessEnv, encoding: "utf8", timeout: 120_000 });
  assert.equal(install.status, 0, install.stderr || install.stdout);

  const installed = join(fixture, "node_modules/pi-fabric-arbor");
  const installedPaths = await pathsBelow(installed);
  assert.equal(installedPaths.some((path) => /(^|\/)(?:dist|\.test-dist)(?:\/|$)/u.test(path)), false);
  assert.equal(installedPaths.some((path) => path.startsWith("certification/")), false);
  assert.equal(installedPaths.some((path) => /(^|\/)exports(?:\/|$)/u.test(path)), false);
  assert.equal(JSON.parse(await readFile(join(fixture, "node_modules/pi-fabric/package.json"), "utf8")).version, "0.83.0");
  assert.equal(JSON.parse(await readFile(join(fixture, "node_modules/tsx/package.json"), "utf8")).version, "4.23.13");

  const agentDir = join(root, "agent");
  const home = join(root, "home");
  await mkdir(agentDir);
  await mkdir(home);
  const fixtureEnv = withoutInheritedPiEnvironment({ HOME: home, PI_CODING_AGENT_DIR: agentDir, PI_OFFLINE: "1", PI_SKIP_VERSION_CHECK: "1" });
  assert.deepEqual(Object.keys(fixtureEnv).filter((key) => key.startsWith("PI_")).sort(), ["PI_CODING_AGENT_DIR", "PI_OFFLINE", "PI_SKIP_VERSION_CHECK"]);

  const cli = join(installed, "bin/pi-fabric-arbor.mjs");
  const availability = spawnSync(process.execPath, [cli, "availability"], { cwd: fixture, env: fixtureEnv, encoding: "utf8" });
  assert.equal(availability.status, 0, availability.stderr);
  assert.match(availability.stdout, /"extension": "source-loaded"/u);
  const sourceImport = spawnSync(process.execPath, ["--import", "tsx", "--input-type=module", "--eval", "import('pi-fabric-arbor').then(m=>console.log(m.getArborAvailability().sourceSentinel))"], { cwd: fixture, env: fixtureEnv, encoding: "utf8" });
  assert.equal(sourceImport.status, 0, sourceImport.stderr);
  assert.equal(sourceImport.stdout.trim(), "pr1-source-a");
  for (const assetId of ["publicSkill", "coordinatorRole", "executorRole", "literatureRole", "researchStrategy", "evidenceInterpretation", "actionsReference", "webIndex", "webScript", "webStyles"]) {
    const read = spawnSync(process.execPath, [cli, "asset", assetId], { cwd: fixture, env: fixtureEnv, encoding: "utf8" });
    assert.equal(read.status, 0, `${assetId}: ${read.stderr}`);
    assert.ok(read.stdout.length > 0);
  }
  assert.equal((await pathsBelow(installed)).some((path) => /(^|\/)exports(?:\/|$)/u.test(path)), false, "asset reads created an export");

  await writeFile(join(agentDir, "settings.json"), `${JSON.stringify({ packages: [join(fixture, "node_modules/pi-fabric"), installed] })}\n`);
  const rpc = new RpcClient([
    "--mode", "rpc", "--no-session", "--offline", "--no-prompt-templates", "--no-themes", "-e", reloadFixture,
  ], { cwd: fixture, env: fixtureEnv });
  try {
    const commands = await rpc.request({ type: "get_commands" });
    assert.equal(commands.response.success, true);
    const catalog = commands.response.data.commands as Array<{ name: string; source: string; sourceInfo: { path?: string } }>;
    assert.equal(catalog.filter((entry) => entry.name === "arbor" && entry.source === "extension").length, 1);
    assert.equal(catalog.filter((entry) => entry.name === "skill:fabric-arbor" && entry.source === "skill").length, 1);
    assert.equal(catalog.some((entry) => /coordinator|executor|literature/u.test(entry.name) && entry.source === "skill"), false);

    const first = await rpc.request({ type: "prompt", message: "/arbor availability" });
    const firstNotice = await rpc.waitFor((record) => record.type === "extension_ui_request" && record.method === "notify" && record.message?.includes("pr1-source-a"), first.start);
    assert.match(firstNotice.message, /component: not-registered-by-pr1/u);

    const layoutPath = join(installed, "src/package-layout.ts");
    const source = await readFile(layoutPath, "utf8");
    assert.match(source, /pr1-source-a/u);
    await writeFile(layoutPath, source.replace("pr1-source-a", "pr1-source-b"));
    const reload = await rpc.request({ type: "prompt", message: "/pr1-reload" });
    assert.equal(reload.response.success, true);
    const second = await rpc.request({ type: "prompt", message: "/arbor availability" });
    const secondNotice = await rpc.waitFor((record) => record.type === "extension_ui_request" && record.method === "notify" && record.message?.includes("pr1-source-b"), second.start);
    assert.match(secondNotice.message, /extension: source-loaded/u);

    const rejected = await rpc.request({ type: "prompt", message: "/arbor start" });
    await rpc.waitFor((record) => record.type === "extension_error" && /read-only/u.test(record.error ?? ""), rejected.start);
    assert.equal(rpc.records.some((record) => record.type === "agent_start"), false, "registration or Arbor commands launched inference");
  } finally {
    await rpc.close();
  }
  assert.equal(rpc.stderr.join(""), "");
  const allPaths = await pathsBelow(root);
  assert.equal(allPaths.some((path) => /(?:^|\/)(?:actors|runs)(?:\/|$)/u.test(path) && !path.includes("node_modules")), false, "normal registration created actor/run storage");
  assert.equal(allPaths.some((path) => /arbor.*\.(?:sqlite3?|jsonl)$/u.test(path) && !path.includes("node_modules")), false, "normal registration created Arbor research state");
});
