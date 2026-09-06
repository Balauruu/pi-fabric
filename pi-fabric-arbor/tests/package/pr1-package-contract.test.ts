import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";
import piFabricArbor from "../../src/extension.js";
import { ARBOR_PACKAGED_ASSETS, resolveArborPackagedAsset } from "../../src/package-layout.js";
import { SourceWebAssets } from "../../src/web/SourceWebAssets.js";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const cli = join(projectRoot, "bin/pi-fabric-arbor.mjs");

async function fingerprint(root: string): Promise<string> {
  const entries: string[] = [];
  async function walk(directory: string): Promise<void> {
    for (const name of (await readdir(directory)).sort()) {
      const path = join(directory, name);
      const relative = path.slice(root.length + 1);
      const value = await stat(path);
      if (value.isDirectory()) await walk(path);
      else entries.push(`${relative}\0${createHash("sha256").update(await readFile(path)).digest("hex")}`);
    }
  }
  await walk(root);
  return createHash("sha256").update(entries.join("\n")).digest("hex");
}

function runCli(args: readonly string[]) {
  return spawnSync(process.execPath, [cli, ...args], { cwd: projectRoot, encoding: "utf8" });
}

test("active package manifest has only source exports, one read-only bin, and one public skill", async () => {
  const manifest = JSON.parse(await readFile(join(projectRoot, "package.json"), "utf8")) as Record<string, any>;
  assert.equal(manifest.main, "./src/package.ts");
  assert.equal(manifest.types, "./src/package.ts");
  assert.deepEqual(Object.keys(manifest.exports), [".", "./extension", "./assets"]);
  assert.deepEqual(manifest.bin, { "pi-fabric-arbor": "./bin/pi-fabric-arbor.mjs" });
  assert.deepEqual(manifest.pi, { extensions: ["./src/extension.ts"], skills: ["./skills/fabric-arbor/SKILL.md"] });
  assert.equal(manifest.dependencies.tsx, "4.23.13");
  assert.equal(manifest.peerDependencies["pi-fabric"], ">=0.83.0 <0.84.0");
  assert.equal("prepack" in manifest.scripts, false);
  assert.equal("build" in manifest.scripts, false);
  assert.match(manifest.scripts.test, /test:source/u);
  assert.match(manifest.scripts["test:source"], /test:source:retained/u);
  assert.match(manifest.scripts.check, /npm test/u);
  for (const retained of ["tests/model/*.test.ts", "tests/git/fingerprint.test.ts", "tests/git/workspace.test.ts", "tests/git/promotion-candidate.test.ts", "tests/persistence/*.test.ts", "tests/recovery/dispatch.test.ts", "tests/recovery/outbox.test.ts", "tests/recovery/report.test.ts", "tests/recovery/fault-matrix.test.ts", "tests/concurrency/commands.test.ts", "tests/evaluation/protocol.test.ts", "tests/compatibility/components.test.ts", "tests/compatibility/provider.test.ts"]) {
    assert.ok(manifest.scripts["test:source:retained"].includes(retained), `retained source lane omitted ${retained}`);
  }
  assert.doesNotMatch(JSON.stringify({ exports: manifest.exports, bin: manifest.bin, files: manifest.files, scripts: manifest.scripts, pi: manifest.pi }), /(?:^|[/.])(?:dist|\.test-dist)(?:[/.]|$)/u);
  assert.equal(manifest.files.some((path: string) => path.startsWith("certification/")), false);
});

test("source extension registration is passive and publishes no research surface", () => {
  const registrations: Array<{ name: string; command: { handler(args: string, context: any): unknown } }> = [];
  piFabricArbor({ registerCommand(name, command) { registrations.push({ name, command }); } });
  assert.deepEqual(registrations.map((entry) => entry.name), ["arbor"]);
  const messages: string[] = [];
  registrations[0]!.command.handler("availability", { ui: { notify(message: string) { messages.push(message); } } });
  assert.match(messages[0]!, /research: unavailable-until-pr2-plus/u);
  assert.throws(() => registrations[0]!.command.handler("start", { ui: { notify() {} } }), /read-only/u);
});

test("all declared skill, role, reference, and read-only Web assets resolve from source", async () => {
  for (const id of Object.keys(ARBOR_PACKAGED_ASSETS) as Array<keyof typeof ARBOR_PACKAGED_ASSETS>) {
    const path = resolveArborPackagedAsset(id);
    assert.equal((await stat(path)).isFile(), true, `${id} did not resolve to a file`);
    assert.ok((await readFile(path)).length > 0, `${id} was empty`);
  }
  const assets = await SourceWebAssets.load();
  const index = Buffer.from(assets.get("/")!.body).toString("utf8");
  const script = Buffer.from(assets.get("/assets/app.js")!.body).toString("utf8");
  assert.equal(assets.get("/index.html")!.fileName, "index.html");
  assert.equal(assets.get("/assets/app.css")!.fileName, "app.css");
  assert.doesNotMatch(index, /<(?:form|input|select|textarea)\b/iu);
  assert.doesNotMatch(script, /\bfetch\s*\(|XMLHttpRequest|WebSocket|EventSource|\bPOST\b|\bPUT\b|\bPATCH\b|\bDELETE\b/u);
});

test("CLI reads existing inputs, rejects every mutation verb, and changes no fixture bytes", async () => {
  const root = await mkdtemp(join(tmpdir(), "arbor-pr1-cli-"));
  await mkdir(join(root, "artifacts"));
  await writeFile(join(root, "projection.json"), "{\"revision\":1}\n");
  await writeFile(join(root, "events.jsonl"), "{\"event\":\"one\"}\n{\"event\":\"two\"}\n");
  await writeFile(join(root, "artifacts", "existing.txt"), "existing artifact\n");
  const before = await fingerprint(root);

  assert.equal(runCli(["availability"]).status, 0);
  assert.equal(runCli(["inspect", "--file", join(root, "projection.json")]).stdout, "{\"revision\":1}\n");
  assert.equal(runCli(["replay", "--file", join(root, "events.jsonl")]).stdout, "{\"event\":\"one\"}\n{\"event\":\"two\"}\n");
  assert.equal(runCli(["artifact", "--root", join(root, "artifacts"), "--path", "existing.txt"]).stdout, "existing artifact\n");
  assert.equal(runCli(["asset", "coordinatorRole"]).status, 0);

  for (const command of ["setup", "start", "pause", "resume", "cancel", "steer", "keep", "discard", "review", "apply", "undo", "undo-apply", "export", "generate", "serve", "authorize", "certify", "cleanup"]) {
    const result = runCli([command]);
    assert.equal(result.status, 2, `${command} unexpectedly succeeded`);
    assert.match(result.stderr, /strictly read-only/u);
  }
  assert.equal(await fingerprint(root), before);
});
