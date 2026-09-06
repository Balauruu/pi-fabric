import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync, realpathSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { ARBOR_ACTIONS, ARBOR_OWNER_REFS } from "../../src/managed/contracts.js";

// PR6 independent scoped gate. Run before explicit reviewed-path staging.
const gate = ".runtime/pr6-gates", app = process.cwd();
const read = (path: string) => readFileSync(path, "utf8");
const git = (...args: string[]) => execFileSync("git", args, { encoding: "utf8" });
assert.equal(git("branch", "--show-current").trim(), "arbor/refactor-pr0-pr1");
assert.equal(git("rev-parse", "HEAD").trim(), "da20cd3c97445b101154a99e9657ac2273bc2378");
assert.equal(realpathSync(app), "/home/balauru/.pi-profiles/fabric/.worktrees/arbor-refactor/pi-fabric-arbor");
const manifest = JSON.parse(read("docs/pr3-action-manifest.json"));
assert.deepEqual(manifest.actions.map((a: any) => a.ref).sort(), ARBOR_ACTIONS.map(a => `arbor.${a.name}`).sort());
assert.equal(manifest.actions.length, 18);
assert.equal(manifest.actions.find((a:any)=>a.ref==='arbor.runResearch').risk,'execute');
assert.equal(manifest.actions.find((a:any)=>a.ref==='arbor.reviseRoles').risk,'write');
assert.ok(manifest.actions.find((a:any)=>a.ref==='arbor.reviseRoles').commands.includes('/arbor revise-roles')); assert.deepEqual(ARBOR_OWNER_REFS, ["agents.self", "agents.members", "agents.status", "agents.create", "agents.ask", "agents.spawn", "agents.wait", "agents.stop", "agents.remove", "schema.status"]);
assert.deepEqual(manifest.actorRequires, ["agents.self"]);
assert.deepEqual(manifest.configuration, { component: "arbor", id: "arbor", config: { stateDirectory: "absolute path outside material" } });
const pkg = JSON.parse(read("package.json")), original = JSON.parse(git("show", "HEAD:pi-fabric-arbor/package.json"));
for (const field of ["dependencies", "devDependencies", "peerDependencies", "pi"]) assert.deepEqual(pkg[field], original[field]);
assert.equal(pkg.scripts["test:source:retained"], original.scripts["test:source:retained"]);
for (const path of ["package-lock.json", "src/git/fingerprint.ts", "tests/git/fingerprint.test.ts", "skills/fabric-arbor/SKILL.md"]) assert.equal(read(path), git("show", `HEAD:pi-fabric-arbor/${path}`), path);
for (const path of ["node_modules", "node_modules/pi-fabric", "node_modules/@earendil-works/pi-coding-agent"]) assert.equal(realpathSync(path), join(app, path));
const reachable = new Set<string>(); let imports = 0;
function visit(path: string) {
  path = resolve(path); if (reachable.has(path)) return; reachable.add(path);
  assert.ok(path.startsWith(app + "/")); assert.doesNotMatch(path.slice(app.length), /\/(?:certification|containment|phase7|pr0|fixtures)\//u);
  for (const m of read(path).matchAll(/(?:from\s*|import\s*)["']([^"']+)["']/gu)) {
    imports++; const ref = m[1]!;
    if (ref.startsWith(".")) visit(resolve(dirname(path), ref.replace(/\.js$/u, ".ts")));
    else if (ref.startsWith("pi-fabric")) assert.ok(["pi-fabric", "pi-fabric/protocol"].includes(ref), ref);
  }
}
for (const path of ["src/extension.ts", "src/package.ts", "src/cli/read-only.ts"]) visit(path);
const raw = JSON.parse(execFileSync("npm", ["pack", "--ignore-scripts", "--dry-run", "--json"], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }));
const pack: any = Array.isArray(raw) ? raw[0] : Object.values(raw)[0]; const packed = new Set<string>(pack.files.map((f: any) => f.path));
for (const path of reachable) assert.ok(packed.has(path.slice(app.length + 1)), `Unpacked import ${path}`);
for (const path of packed) assert.doesNotMatch(path, /^(?:dist|\.test-dist|\.runtime|certification|tests)\//u);
assert.ok(packed.has("src/managed/RoleBundle.ts")); assert.ok(packed.has("docs/pr6-research-evidence.md"));
assert.equal(pkg.pi.skills.length, 1);
const counts = [...read(join(gate, 'main-normal-command-final.log')).matchAll(/^ℹ tests (\d+)$/gm)].map(m => Number(m[1])); assert.deepEqual(counts, [5, 92, 20, 31, 45, 34]);
const lines = (path: string) => read(join(gate, path)).split("\n").filter(Boolean);
const fresh = (beforePath: string, afterPath: string) => {
  const before = new Set(lines(beforePath));
  return lines(afterPath).filter(p => !before.has(p) && /pr[2-6]-host/.test(p));
};
// Keep the passing unaffected native lanes, then select the explicitly rerun
// command-impacted PR3/PR5 lanes. Never infer acceptance from latest directories.
const paths = [
  ...fresh('main-native-before-repair.txt', 'main-native-after-repair.txt').filter(p => /pr[246]-host/.test(p)),
  ...fresh('main-command-native-before.txt', 'main-command-native-after.txt').filter(p => /pr[35]-host/.test(p)),
].sort();
assert.equal(paths.length, 85); assert.equal(new Set(paths).size, paths.length);
const lanes: Record<string, { clean: number; expectedFailures: number }> = {};
for (const path of paths) {
  const lane = /pr[2-6]-host/u.exec(path)![0], exit = JSON.parse(read(path)); const count = lanes[lane] ??= { clean: 0, expectedFailures: 0 };
  if (path.includes("/exit-guard-") && !path.endsWith("success.txt.exit.json")) { assert.ok(exit.code !== 0 || exit.signal); count.expectedFailures++; }
  else { assert.deepEqual(exit, path.endsWith("/rpc-exit.json") ? { code: 0, signal: null } : { code: 0, signal: null, killed: false, error: null }, path); count.clean++; }
}
assert.deepEqual(lanes, { "pr2-host": { clean: 9, expectedFailures: 3 }, "pr3-host": { clean: 22, expectedFailures: 0 }, "pr4-host": { clean: 21, expectedFailures: 0 }, "pr5-host": { clean: 9, expectedFailures: 0 }, "pr6-host": { clean: 21, expectedFailures: 0 } });
const finalLogs={normal:'main-normal-command-final','pr2-native':'main-pr2-accepted','pr3-native':'main-pr3-command-final','pr4-native':'main-pr4-accepted','pr5-native':'main-pr5-command-final','research-native':'main-pr6-accepted'};
for (const [name,log] of Object.entries(finalLogs)){assert.equal(read(join(gate, `${log}.exit`)).trim(),'0');const text=read(join(gate,`${log}.log`));assert.doesNotMatch(text,/^ℹ (?:fail|skipped|cancelled) [1-9]/m);if(name!=='normal')assert.match(text,new RegExp('^ℹ tests '+({'pr2-native':8,'pr3-native':20,'pr4-native':21,'pr5-native':9,'research-native':21} as Record<string,number>)[name]+'$','m'));}
const journeys=paths.filter(p=>p.includes('pr6-host')).map(p=>join(dirname(p),'journey-summary.json')).filter(p=>{try{read(p);return true;}catch{return false;}});assert.equal(journeys.length,2);for(const path of journeys){const j=JSON.parse(read(path));assert.equal(j.attempts,4);assert.equal(j.evaluations,5);assert.equal(j.invocations,j.kind==='command'?10:30);assert.deepEqual(j.decisions.map((d:any)=>d.status),['measured-keep','applied','applied','measured-keep']);assert.equal(j.lessons.length,4);}
const changes = [...git("diff", "--name-only", "-z", "HEAD").split("\0"), ...git("-C", "..", "ls-files", "--others", "--exclude-standard", "-z").split("\0")].filter(Boolean);
assert.ok(changes.every(p => p.startsWith("pi-fabric-arbor/") || p === "docs/Arbor/deep-refactoring-plan.md"));
assert.equal(git("diff", "--cached", "--name-only"), "");
const report = { scope: 'PR6 independently accepted serial code/instruction journeys; five fixes plus adjacent exact-keep/provider-admission repairs; PR7-PR13 not accepted', normalTests: counts.reduce((n, x) => n + x, 0), counts, publicRefs: 18, ownerRequirements: 10, publicSkills: 1, packedFiles: packed.size, reachableModules: reachable.size, staticImports: imports, nativeExits: lanes, exactNativeExitPaths: paths, preserved: ["lock/dependencies", "source/index/HEAD", "retained-source selection", "fingerprint source/tests", "public skill and Pi registration"] };
writeFileSync(join(gate, "audit-main-final.json"), JSON.stringify(report, null, 2) + "\n");
console.log(JSON.stringify({ ...report, exactNativeExitPaths: `${paths.length} paths retained in audit-main-final.json` }));
