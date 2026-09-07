import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync, realpathSync, writeFileSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { ARBOR_ACTIONS, ARBOR_OWNER_REFS } from "../../src/managed/contracts.js";

// PR7 pre-publication scoped gate. Evidence stays local and is never packed.
const gate = ".runtime/pr7-gates", app = process.cwd();
const read = (path: string) => readFileSync(path, "utf8");
const git = (...args: string[]) => execFileSync("git", args, { encoding: "utf8" });
assert.equal(git("branch", "--show-current").trim(), "arbor/refactor-pr0-pr1");
assert.equal(git("rev-parse", "HEAD").trim(), "e8abded64db245ebfca2725bdeca486094e0c1a4");
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
const counts=[...read(join(gate,'insight-normal.log')).matchAll(/^ℹ tests (\d+)$/gm)].map(m=>Number(m[1]));assert.deepEqual(counts,[5,92,20,42,45,48]);
for(const [lane,expected] of Object.entries({'insight-normal':252,'insight-target':67,'insight-green':1,'insight-pr6-native':21,'compat-normal':251,'compat-target':66,'compat-green':1,'compat-pr3-native':20,'compat-pr6-native':21,'repair-normal-final':250,'repair-target':65,'repair-pr2-native':8,'repair-pr3-native':20,'repair-pr4-native':21,'repair-pr5-native':9,'repair-pr6-native':21,'repair-pr7-native':5,'repair-effects-native':2})){
 const log=read(join(gate,lane+'.log'));assert.equal(read(join(gate,lane+'.exit')).trim(),'0');assert.doesNotMatch(log,/^ℹ (?:fail|skipped|cancelled) [1-9]/m);assert.equal([...log.matchAll(/^ℹ tests (\d+)$/gm)].reduce((n,m)=>n+Number(m[1]),0),expected,lane);
}
assert.equal(read(join(gate,'repair-red.exit')).trim(),'1');assert.match(read(join(gate,'repair-red.log')),/^ℹ fail 7$/m);
assert.equal(read(join(gate,'repair-pr7-native-red.exit')).trim(),'1');assert.match(read(join(gate,'repair-pr7-native-red.log')),/Provided value cannot be bound to SQLite parameter 2/);
assert.match(read(join(gate,'repair-independent-review.txt')),/No blocking findings/);
const before=new Set(read(join(gate,'repair-native-before.txt')).trim().split('\n'));
const paths=read(join(gate,'repair-native-after.txt')).trim().split('\n').filter(p=>!before.has(p));
const start=statSync(join(gate,'repair-native-before.txt')).mtimeMs,end=statSync(join(gate,'repair-native-after.txt')).mtimeMs;
for(const p of paths){assert.match(p,/^\.runtime\/pr[2-6]-host\/[^/]+\/[^/]*exit\.json$/);const time=statSync(p).mtimeMs;assert.ok(time>start&&time<=end,p);}
const compatBefore=new Set(read(join(gate,'compat-native-before.txt')).trim().split('\n'));
const compatPaths=read(join(gate,'compat-native-after.txt')).trim().split('\n').filter(p=>!compatBefore.has(p));
assert.equal(compatPaths.length,64);
for(const p of compatPaths){assert.match(p,/^\.runtime\/pr[36]-host\/[^/]+\/[^/]*exit\.json$/);const time=statSync(p).mtimeMs;assert.ok(time>statSync(join(gate,'compat-native-before.txt')).mtimeMs&&time<=statSync(join(gate,'compat-native-after.txt')).mtimeMs,p);assert.ok(!paths.includes(p));}
paths.push(...compatPaths);
assert.equal(read(join(gate,'insight-red.exit')).trim(),'1');assert.match(read(join(gate,'insight-red.log')),/Missing expected exception/);
assert.equal(read(join(gate,'compat-red.exit')).trim(),'1');assert.match(read(join(gate,'compat-red.log')),/config.search.exploreEvery: required/);
const timing=JSON.parse(read(join(gate,'a12.json'))),a12roots=new Set<string>(timing.results.map((r:any)=>r.root));
const controlRoots=new Set<string>(['pause','cancel'].map(action=>JSON.parse(read(join(gate,`control-${action}.json`))).root));
const repairRoots=new Set<string>(['preparation','protected'].map(failure=>JSON.parse(read(join(gate,`repair-native-${failure}.json`))).root));
// Every earlier host in this repair window remains in the inventory, including
// the red native assertion run. Clean exits are not relabeled as passing tests.
const checkpoints=new Set<string>([
 ...JSON.parse(read(join(gate,'a12-repair-first.json'))).results.map((r:any)=>r.root),
 ...['pause','cancel'].map(action=>JSON.parse(read(join(gate,`repair-control-${action}-first.json`))).root),
 ...['preparation','protected'].map(failure=>JSON.parse(read(join(gate,`repair-native-${failure}-first.json`))).root),
 ...['command-M8cwbT','command-6aXdDC'].map(id=>join(app,'.runtime/pr6-host',id))
]);
assert.equal(controlRoots.size,2);assert.equal(repairRoots.size,2);assert.equal(checkpoints.size,8);
const lanes:Record<string,{clean:number;expectedFailures:number}>={};
for(const path of paths){const root=resolve(dirname(path)),lane=controlRoots.has(root)?'pr7-controls-host':repairRoots.has(root)?'pr7-repairs-host':a12roots.has(root)?'pr7-host':checkpoints.has(root)?'pr7-checkpoint-host':/pr[2-6]-host/.exec(path)![0],exit=JSON.parse(read(path)),count=lanes[lane]??={clean:0,expectedFailures:0};
 if(path.includes('/exit-guard-')&&!path.endsWith('success.txt.exit.json')){assert.ok(exit.code!==0||exit.signal);count.expectedFailures++;}
 else{assert.deepEqual(exit,path.endsWith('/rpc-exit.json')?{code:0,signal:null}:{code:0,signal:null,killed:false,error:null},path);count.clean++;}
}
assert.deepEqual(lanes,{'pr2-host':{clean:9,expectedFailures:3},'pr3-host':{clean:44,expectedFailures:0},'pr4-host':{clean:21,expectedFailures:0},'pr5-host':{clean:9,expectedFailures:0},'pr6-host':{clean:63,expectedFailures:0},'pr7-host':{clean:2,expectedFailures:0},'pr7-controls-host':{clean:2,expectedFailures:0},'pr7-repairs-host':{clean:2,expectedFailures:0},'pr7-checkpoint-host':{clean:8,expectedFailures:0}});
assert.ok(timing.ratio<=0.8);for(const r of timing.results){assert.equal(r.warmed.length,3);assert.equal(r.waves.length,4);assert.ok(r.waves.every((w:any)=>w.attemptIds.length===2));if(r.concurrency===2)assert.ok(r.warmed.every((w:any)=>w.overlap>0));}
let maxEventBytes=0,maxTraceBytes=0;
for(const path of paths){let trace:string;try{trace=read(join(dirname(path),'trace.jsonl'));}catch{continue;}maxTraceBytes=Math.max(maxTraceBytes,Buffer.byteLength(trace));for(const line of trace.trim().split('\n'))maxEventBytes=Math.max(maxEventBytes,Buffer.byteLength(line));}
assert.ok(maxEventBytes<4*1048576,'Native event exceeds 4 MiB');
for(const r of timing.results){const events=read(join(r.root,'trace.jsonl')).trim().split('\n').map((s:string)=>JSON.parse(s));const workers=events.filter((e:any)=>e.event==='pr7.worker'&&e.data.didTool).map((e:any)=>e.data);assert.equal(workers.length,8);assert.equal(new Set(workers.map((w:any)=>w.cwd)).size,8);for(let i=0;i<4;i++){const a=workers.find((w:any)=>w.attempt==='h'+(2*i+1)),b=workers.find((w:any)=>w.attempt==='h'+(2*i+2));assert.equal(a.oid,b.oid);assert.ok(a.interval.end-a.interval.start>=1000&&b.interval.end-b.interval.start>=1000);const w=r.waves[i];assert.equal(w.attemptIds.length,2);assert.ok(!events.some((e:any)=>e.event==='research.proposal'&&e.at>w.startedAt&&e.at<w.collectedAt),'No intervening actor proposal within execution wave');}}
let journeys=0;for(const path of paths.filter(p=>p.includes('pr6-host'))){let j;try{j=JSON.parse(read(join(dirname(path),'journey-summary.json')));}catch{continue;}journeys++;assert.equal(j.attempts,4);assert.equal(j.evaluations,5);assert.equal(j.invocations,j.kind==='command'?10:30);assert.deepEqual(j.decisions.map((d:any)=>d.status),['measured-keep','applied','applied','measured-keep']);}assert.equal(journeys,6);
const changes=[...git('diff','--name-only','-z','HEAD').split('\0'),...git('-C','..','ls-files','--others','--exclude-standard','-z').split('\0')].filter(Boolean);assert.ok(changes.every(p=>p.startsWith('pi-fabric-arbor/')||p==='docs/Arbor/deep-refactoring-plan.md'));assert.ok(changes.every(p=>!/(?:^|\/)(?:node_modules|\.runtime|dist|\.test-dist)(?:\/|$)/u.test(p)),'No runtime/generated staged or untracked artifacts');
const report={scope:'PR7 repaired scoped gate; final independent staged review gates publication; no PR8-13',normalTests:counts.reduce((n,x)=>n+x,0),counts,publicRefs:18,ownerRequirements:10,publicSkills:1,packedFiles:packed.size,reachableModules:reachable.size,staticImports:imports,nativeExits:lanes,maxEventBytes,maxTraceBytes,exactNativeExitPaths:paths,a12:{ratio:timing.ratio,serialMedian:timing.results[0].median,parallelMedian:timing.results[1].median},preserved:['dependencies/lock','native refs/configuration/actor commitment','read-only CLI/browser','fingerprint and retained-source selection','original source/index/refs','single public skill']};
writeFileSync(join(gate,'repair-audit-final.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({...report,exactNativeExitPaths:paths.length}));
