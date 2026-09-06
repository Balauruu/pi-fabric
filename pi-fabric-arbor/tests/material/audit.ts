import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync, realpathSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { ARBOR_ACTIONS, ARBOR_OWNER_REFS } from "../../src/managed/contracts.js";
const independent = process.argv.includes("--independent"), reviewRepair = independent || process.argv.includes("--review-repair"), gate = independent ? ".runtime/pr5-independent-gate" : reviewRepair ? ".runtime/pr5-review-repair" : ".runtime/pr5-gates";
const app = process.cwd(), manifest = JSON.parse(readFileSync("docs/pr3-action-manifest.json", "utf8"));
assert.deepEqual(manifest.actions.map((a: any) => a.ref).sort(), ARBOR_ACTIONS.map(a => `arbor.${a.name}`).sort()); assert.equal(manifest.actions.length, 16); assert.equal(ARBOR_OWNER_REFS.length, 10); assert.deepEqual(manifest.actorRequires, ["agents.self"]);
assert.deepEqual(manifest.configuration, { component: "arbor", id: "arbor", config: { stateDirectory: "absolute path outside material" } });
const pkg = JSON.parse(readFileSync("package.json", "utf8")), original = JSON.parse(execFileSync("git", ["show", "HEAD:pi-fabric-arbor/package.json"], { encoding: "utf8" }));
assert.deepEqual(pkg.dependencies, original.dependencies); assert.deepEqual(pkg.devDependencies, original.devDependencies); assert.equal(pkg.scripts["test:source:retained"], original.scripts["test:source:retained"]); assert.equal(pkg.pi.skills.length, 1);
assert.equal(execFileSync("git", ["diff", "HEAD", "--", "package-lock.json", "src/git/fingerprint.ts", "tests/git/fingerprint.test.ts"], { encoding: "utf8" }), "");
for (const p of ["node_modules", "node_modules/pi-fabric", "node_modules/@earendil-works/pi-coding-agent"]) assert.equal(realpathSync(p), join(app, p));
const reachable = new Set<string>(); let imports = 0;
function visit(path: string) {
  path = resolve(path); if (reachable.has(path)) return; reachable.add(path); const text = readFileSync(path, "utf8");
  assert.doesNotMatch(path.slice(app.length), /\/(?:certification|containment|phase7|pr0|fixtures)\//u);
  for (const m of text.matchAll(/(?:from\s*|import\s*)["']([^"']+)["']/gu)) { imports++; const ref = m[1]!; if (ref.startsWith(".")) visit(resolve(dirname(path), ref.replace(/\.js$/u, ".ts"))); else if (ref.startsWith("pi-fabric")) assert.ok(["pi-fabric", "pi-fabric/protocol"].includes(ref), ref); }
}
visit("src/extension.ts"); visit("src/package.ts"); visit("src/cli/read-only.ts");
const packedRaw = JSON.parse(execFileSync("npm", ["pack", "--ignore-scripts", "--dry-run", "--json"], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] })); const packed = Array.isArray(packedRaw) ? packedRaw[0] : Object.values(packedRaw)[0] as any;
const files = new Set<string>(packed.files.map((f: any) => f.path)); for (const path of reachable) assert.ok(files.has(path.slice(app.length + 1)), `Unpacked runtime import ${path}`);
for (const file of files) assert.doesNotMatch(file, /^(?:dist|\.test-dist|\.runtime|certification|tests)\//u);
for (const symbol of ["capture", "materialize", "freeze", "restore", "export", "integrate", "combine"]) assert.match(readFileSync("src/material/Workspace.ts", "utf8"), new RegExp(`async ${symbol}\\(`));
const paths = readFileSync(join(gate, reviewRepair ? "native-final-paths.txt" : "native-final3-paths.txt"), "utf8").trim().split("\n");
assert.equal(new Set(paths).size, paths.length, "Native exit evidence must contain distinct paths");
if (independent) {
  const before = new Set(readFileSync(join(gate, "native-before-final.txt"), "utf8").trim().split("\n"));
  const after = readFileSync(join(gate, "native-after-final.txt"), "utf8").trim().split("\n");
  assert.deepEqual(paths, after.filter(p => !before.has(p)), "Audit only the exact final native path-set difference");
}
const lanes: Record<string, { clean: number; expectedGuardFailures: number }> = {};
for (const path of paths) { const lane = /pr[2-5]-host/u.exec(path)![0], e = JSON.parse(readFileSync(path, "utf8")); const count = lanes[lane] ??= { clean: 0, expectedGuardFailures: 0 }; if (path.includes("/exit-guard-") && !path.endsWith("success.txt.exit.json")) { assert.ok(e.code !== 0 || e.signal); count.expectedGuardFailures++; } else { assert.deepEqual(e, path.endsWith("/rpc-exit.json") ? { code: 0, signal: null } : { code: 0, signal: null, killed: false, error: null }, path); count.clean++; } }
assert.equal(paths.length, reviewRepair ? 63 : 59);
assert.deepEqual(lanes, {
  "pr2-host": { clean: 9, expectedGuardFailures: 3 }, "pr3-host": { clean: 22, expectedGuardFailures: 0 },
  "pr4-host": { clean: 21, expectedGuardFailures: 0 }, "pr5-host": { clean: reviewRepair ? 8 : 4, expectedGuardFailures: 0 },
});
const changes = execFileSync("git", ["diff", "--name-only", "-z", "HEAD"], { encoding: "utf8" }).split("\0").filter(Boolean); assert.ok(changes.every(p => p.startsWith("pi-fabric-arbor/") || p === "docs/Arbor/deep-refactoring-plan.md"));
const normalTestCounts = [...readFileSync(join(gate, reviewRepair ? "check-final.log" : "check-final3.log"), "utf8").matchAll(/^ℹ tests (\d+)$/gm)].map(m => Number(m[1])); const normalTests = normalTestCounts.reduce((sum, n) => sum + n, 0); assert.deepEqual(normalTestCounts, [5, 92, 20, 25, 44, independent ? 26 : reviewRepair ? 24 : 15]); assert.equal(normalTests, independent ? 212 : reviewRepair ? 210 : 201);
const untracked = execFileSync("git", ["-C", "..", "ls-files", "--others", "--exclude-standard", "-z"], { encoding: "utf8" }).split("\0").filter(Boolean); assert.ok(untracked.every(p => p.startsWith("pi-fabric-arbor/")));
const report = { normalTestCounts, normalTests, publicRefs: manifest.actions.length, ownerRequires: ARBOR_OWNER_REFS.length, publicSkills: pkg.pi.skills.length, packedFiles: files.size, reachableModules: reachable.size, staticImports: imports, unchanged: ["dependencies", "lockfile", "retained source selection", "minimal fingerprint oracle"], nativeExits: lanes, exactNativeExitPaths: paths };
writeFileSync(join(gate, "audit-complete.json"), JSON.stringify(report, null, 2) + "\n"); console.log(JSON.stringify({ ...report, exactNativeExitPaths: `${paths.length} paths retained in audit-complete.json` }));
