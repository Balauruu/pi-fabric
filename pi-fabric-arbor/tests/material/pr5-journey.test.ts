import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, writeFile, symlink } from "node:fs/promises";
import { join, resolve } from "node:path";
import test from "node:test";
import type { FabricInvocationContext } from "pi-fabric/protocol";
import { ResearchStore } from "../../src/research/ResearchStore.js";
import { ResearchService } from "../../src/research/ResearchService.js";
import { BindingStore } from "../../src/managed/BindingStore.js";
import { OwnerExecution } from "../../src/managed/OwnerExecution.js";
import { EvaluationEngine } from "../../src/evaluators/EvaluationEngine.js";
import { EvaluatorCatalog } from "../../src/evaluators/catalog.js";
import { reservedEvaluationCalls } from "../../src/research/policy.js";
import { researchObservation, researchFacts } from "../../src/research/policy.js";
import { commandProgram, researchCommand } from "../../src/research/commands.js";
import { acceptance } from "../../src/material/acceptance.js";
import { Workspace, gitBytes, gitText } from "../../src/material/Workspace.js";
const identity = { id: "root", rootId: "root", ownerHostId: "host", ownerIdentityId: "identity", sessionId: "session" };
async function fixture(t: test.TestContext, options: { direction?:"maximize"|"minimize"; heldMetric?:string; untouched?:"win"|"lose"; validation?:Record<string,unknown>; heldOut?: "win" | "lose"; settlementFailure?: boolean; search?: Record<string,number>; research?: boolean; workerLoss?: boolean; workerFailure?: boolean; output?: string; checks?: string[]; limits?: Record<string, number>; failedMetric?: boolean; review?: boolean; command?: boolean; links?: boolean; loss?: boolean; repeats?: number; tasks?: number; threshold?: string } = {}) {
  const base = resolve(".runtime/pr5-journey"); await mkdir(base, { recursive: true }); const root = await mkdtemp(join(base, "case-")), cwd = join(root, "source"), state = join(root, "state"), profile = join(root, "profile"); await mkdir(cwd); await mkdir(profile);
  const git = (...args: string[]) => execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  git("init", "-b", "main"); git("config", "user.name", "PR5"); git("config", "user.email", "pr5@example.invalid");
  await writeFile(join(cwd, "prompt"), "source committed"); await writeFile(join(cwd, "check"), "fixed"); await writeFile(join(cwd, "other"), "base"); git("add", "."); git("commit", "-m", "source"); await writeFile(join(cwd, "prompt"), "user staged"); git("add", "prompt"); await writeFile(join(cwd, "prompt"), "BASELINE_SNAPSHOT_BAD");
  if (options.links) { await symlink(".", join(cwd, "a")); await symlink("a/../outside", join(cwd, "escape")); git("add", "a", "escape"); }
  const definition = { version: 1, kind: options.command ? "command" : "agent-suite", baseline: { root: cwd, oid: "capture", files: ["prompt", "check"] }, candidate: { root: cwd, oid: "capture", files: ["prompt", "check"] }, tasks: Array.from({ length: options.tasks ?? 1 }, (_, n) => ({ id: `t${n + 1}`, prompt: `fixed task ${n + 1}`, expected: "GOOD" })), repeats: options.repeats ?? 1, retries: 0, deadlineMs: 15000, analysis: "paired-descriptive", order: "task-baseline-candidate", subject: { model: "fake/subject", tools: [], promptFiles: ["prompt"] }, judge: null, command: options.command ? { argv: [process.execPath, "-e", `const fs=require('fs');const good=fs.readFileSync('prompt','utf8').includes('GOOD');console.log('ARBOR_METRIC '+(${options.direction==='minimize'?'-(1+(good?1:0))':"1+(good?1:0)+(fs.readFileSync('other','utf8')==='GOOD'?1:0)"})+' points');${options.failedMetric ? "if(good)process.exit(3);" : ""}${options.output ?? ""}`], checks: (options.checks ?? []).map(code=>[process.execPath,"-e",code]), unit: "points" } : null, providerAction: null };
  await writeFile(join(root, "definition.json"), JSON.stringify(definition));
  if(options.heldOut) await writeFile(join(root,'validation.json'),JSON.stringify({version:1,policy:'selected',maxUses:2,criterion:'non-regression',heldOut:{...definition,...(options.heldMetric&&definition.command?{command:{...definition.command,argv:[process.execPath,'-e',`const good=require('fs').readFileSync('prompt','utf8').includes('GOOD');console.log('ARBOR_METRIC '+(${options.heldMetric})+' points');`]}}:{}),tasks:[{id:'held',prompt:'HELD_OUT_DETAIL_SENTINEL fixed task',expected:options.heldOut==='lose'?'BAD':'GOOD'}]},final:options.untouched?{...definition,tasks:[{id:"untouched",prompt:"FINAL_DETAIL_SENTINEL fixed task",expected:options.untouched==="win"?"GOOD":"BAD"}]}:null,...options.validation}));
  const store = new ResearchStore(join(state, "research.sqlite3")), bindings = new BindingStore(join(state, "bindings.sqlite3")), native = new Map<string, any>(); let count = 0;
  const call = async (ref: string, args: any = {}) => {
    if (ref === "agents.self") return { ...identity, kind: "root", local: true, stale: false };
    if (ref === "schema.status") return { mode: "off" };
    if (ref === "agents.create") { const n = { ...identity, id: "actor", kind: "actor", scope: "project", runner: "pi", residency: "session", model: args.model, requirements: [{ ref: "agents.self" }], status: "running" }; native.set("actor", n); return n; }
    if (ref === "agents.remove") { native.delete(args.id); return { removed: true }; }
    if (ref === "agents.stop" && args.id === "actor") { native.get("actor").status = "stopped"; return { id: args.id, kind: "actor", scope: "project", status: "stopped", local: true }; }
    if (ref === "agents.status" && args.id === "actor") return { id: args.id, kind: "actor", scope: "project", status: "stopped", local: true };
    if (ref === "agents.ask") { const d = args.data, nodes = d.nodes;
      const kind = nodes.length ? "dispatch" : "propose", payload = nodes.length ? { nodeId: "one", attemptId: "one", selection: {...d.selection.eligible[0],reason:"Test the admitted fixed hypothesis"} } : { nodeId: "one", type: "hypothesis", parentId: null, title: "one", rationale: "WRITE GOOD", sourceRefs: [] };
      return { actorId: args.id, direction: "out", action: "silent", runId: "activation", data: { version: 2, runId: d.runId, materialId: d.materialId, epoch: d.epoch, revision: d.revision, commandId: d.commandId, kind, payload, expectedEvidence: [], estimatedBudget: { attempts: kind === "dispatch" ? 1 : 0, evaluatorCalls: 0 }, rationale: "fixture" } };
    }
    if (ref === "agents.spawn") {
      const id = `native-${++count}`;
      if (args.task.includes("bounded material worker")) {
        if (args.task.includes("WRITE OTHER")) await writeFile(join(args.cwd, "other"), "GOOD");
        else await writeFile(join(args.cwd, "prompt"), args.task.includes("WRITE BAD") ? "BASELINE_SNAPSHOT_BAD" : "CANDIDATE_SNAPSHOT_GOOD");
        execFileSync("git", ["add", "."], { cwd: args.cwd }); execFileSync("git", ["-c", "user.name=worker", "-c", "user.email=worker@example.invalid", "commit", "--allow-empty", "-m", "worker"], { cwd: args.cwd, stdio: "ignore" });
      }
      const text = args.task.includes("CANDIDATE_SNAPSHOT_GOOD") || (options.tasks && args.task.includes("fixed task 1")) || (options.repeats && [...native.values()].filter(n => n.cwd === args.cwd).length % (2 * options.repeats) === 0) ? "GOOD" : "BAD";
      const worker = args.task.includes("bounded material worker");
      const n = { id, cwd: args.cwd, model: args.model, runner: "pi", transport: "process", status: worker && options.workerFailure ? "failed" : "completed", text, ...(worker ? { value: { sentinel: "ARBOR_WORKER_RESULT_V1", attemptId: /Attempt: (\S+)/.exec(args.task)![1], observations: "settled", paths: ["prompt"], limitations: "fixture" } } : {}) }; native.set(id, n); if (worker && options.workerLoss) throw new Error("accepted worker spawn reply lost"); if (options.loss && !args.task.includes("bounded material worker")) throw new Error("accepted evaluator spawn reply lost"); return n;
    }
    if (ref === "agents.wait" || ref === "agents.status" || ref === "agents.stop") return native.get(args.id);
    if (ref === "agents.members") return [...native.values()].map(n => ({ ...n, ...identity, id: n.id, kind: n.kind ?? "agent", local: true, stale: false }));
    throw new Error(`Unexpected public ref ${ref}`);
  };
  const owner = new OwnerExecution(call, bindings, "arbor.owner", "g1", store), catalog = new EvaluatorCatalog([], { id: "view", digest: "view", semanticDigest: "view", bindings: {} }, async () => { throw new Error("No provider"); });
  const evaluator = new EvaluationEngine(owner, store, state, catalog), service = new ResearchService(owner, store, state, profile, evaluator);
  const context = { cwd, extensionContext: { sessionManager: { getSessionId: () => "session" }, isProjectTrusted: () => true, model: { provider: "fake", id: "worker" }, modelRegistry: { getAvailable: () => [{ provider: "fake", id: "worker" }, { provider: "fake", id: "subject" }] }, hasUI: true, ui: { select: async () => "Approve research choice" } } } as unknown as FabricInvocationContext;
  const invoke = async (name: string, payload: any, commandId = `${name}-${count}-${store.get("run")?.revision}`) => service.invoke(name, { ...store.binding(store.get("run")!, commandId), ...(name === "review" ? { decisionId: payload } : name === "export" ? { format: "json" } : name === "control" ? { action: payload } : { payload }) }, context) as Promise<any>;
  t.after(async () => { if(options.workerLoss||options.settlementFailure) await assert.rejects(service.close(), /settlement/); else await service.close(); });
  const before = await readFile(join(cwd, ".git/index")), refs = git("show-ref");
  await service.invoke("start", { runId: "run", overrides: { execution: options.research ? "research" : "material", ...(options.limits ? { limits: options.limits } : {}), material: { mutablePaths: ["prompt", "other"], evaluationInputs: ["check"] }, objective: { unit: "points", ...(options.direction ? {direction:options.direction} : {}), ...(options.threshold ? { minimumGain: options.threshold, gainKind: "absolute" } : {}) }, evaluator: { kind: definition.kind, definition: join(root, "definition.json"), ...(options.heldOut ? {heldOut:join(root,"validation.json")} : {}) }, roleTools: { executor: ["read", "write", "bash"] }, search: { mode: options.review ? "review" : "auto", ...options.search } } }, context);
  if (options.command && !options.research) await invoke("evaluate", { attemptId: "baseline", evaluationId: "initial" });
  const candidate = async (id: string, task = "WRITE GOOD") => { await invoke("propose", { nodeId: id, type: "hypothesis", parentId: null, title: id, rationale: task, sourceRefs: [] }); await invoke("dispatch", { nodeId: id, attemptId: id }); await invoke("evaluate", { attemptId: id, evaluationId: `eval-${id}` }); };
  const keep = (id: string) => invoke("decide", { decisionId: `keep-${id}`, nodeId: id, decision: "keep", evidenceIds: [`eval-${id}`] });
  return { native, root, cwd, state, store, bindings, service, owner, evaluator, invoke, candidate, keep, before, refs, git, context };
}
test('PR10 independent review mixed-split decisions cannot launder held-out outcomes into project lessons',async t=>{
 const f=await fixture(t,{heldOut:'win'});await f.candidate('one');const held=f.store.evaluations('run').find(e=>e.split==='held-out'&&e.attemptId)!;
 await f.invoke('decide',{decisionId:'mixed-discard',nodeId:'one',decision:'discard',evidenceIds:['eval-one',held.id]});
 await f.invoke('distill',{lessonId:'dev-lesson',nodeId:'one',insight:'Development observation only',limitations:'Local',evidenceIds:['eval-one']});
 const hits=f.store.lessons({runId:'run',query:'',limit:8});assert.equal(hits.length,1);assert.equal(hits[0]!.outcome,'unscored-observation');
});
test('PR10 second review ordinary actor and trajectory admission reject held-out or mixed evidence',async t=>{
 const f=await fixture(t,{heldOut:'win'});await f.candidate('one');const held=f.store.evaluations('run').find(e=>e.split==='held-out'&&e.attemptId)!;
 for(const evidenceIds of [[held.id],['eval-one',held.id]]){const command=f.store.binding(f.store.get('run')!,'actor-'+evidenceIds.length),proposal={...command,version:2 as const,kind:'decide' as const,expectedEvidence:['eval-one'],estimatedBudget:{attempts:0,evaluatorCalls:0},rationale:'No test evidence in ordinary actor context',payload:{decisionId:'discard',nodeId:'one',decision:'discard',evidenceIds}};
 assert.throws(()=>f.store.validateProposal(proposal,'run'),/development|held-out/);
 assert.throws(()=>f.store.recordProposal(proposal,'g1',{actorId:'actor',nativeId:'activation',requestId:'a'.repeat(64),context:{}}),/development|held-out/);
 assert.equal(f.store.trajectories('run').length,0);
 }
});
test('PR10 delayed measured-keep trajectory retains original incumbent after a later measured keep',async t=>{
 const f=await fixture(t,{command:true});await f.candidate('one');const command=f.store.binding(f.store.get('run')!,'actor-keep-one');
 const payload={decisionId:'keep-one',nodeId:'one',decision:'keep',evidenceIds:['eval-one']},proposal={...command,version:2 as const,kind:'decide' as const,expectedEvidence:['eval-one'],estimatedBudget:{attempts:0,evaluatorCalls:0},rationale:'Exact keep',payload};
 f.store.recordProposal(proposal,'g1',{actorId:'actor',nativeId:'activation',requestId:'a'.repeat(64),context:{currentIncumbent:f.store.get('run')!.material!.incumbent}});
 const receipt=await f.invoke('decide',payload,command.commandId),incumbent=f.store.get('run')!.material!.incumbent;assert.equal(receipt.status,'applied');
 await f.candidate('two','WRITE OTHER');await f.keep('two');assert.notEqual(f.store.get('run')!.material!.incumbent,incumbent);
 f.store.finishProposal('run',command.commandId,'g1',receipt,null);const outcome=f.store.trajectories('run')[0]!.outcome!;assert.equal(outcome.incumbent,incumbent);assert.equal(outcome.revision,receipt.revision);
});
test('PR10 independent review decision and distillation trajectories retain exact evaluation and attempt links',async t=>{
 const f=await fixture(t);await f.candidate('one');
 for(const kind of ['decide','distill'] as const){const command=f.store.binding(f.store.get('run')!,'trajectory-'+kind),payload=kind==='decide'?{decisionId:'discard',nodeId:'one',decision:'discard',evidenceIds:['eval-one']}:{lessonId:'lesson',nodeId:'one',insight:'Development observation',limitations:'Local',evidenceIds:['eval-one']};
 const proposal={...command,version:2 as const,kind,payload,expectedEvidence:['eval-one'],estimatedBudget:{attempts:0,evaluatorCalls:0},rationale:'Interpret exact development evidence'};
 f.store.recordProposal(proposal,'g1',{actorId:'actor',nativeId:'activation-'+kind,requestId:'a'.repeat(64),context:{evidence:[{id:'eval-one'}]}});
 const receipt=await f.invoke(kind,payload,command.commandId);f.store.finishProposal('run',command.commandId,'g1',receipt,null);
 const outcome=f.store.trajectories('run').at(-1)!.outcome!;assert.deepEqual(outcome.evaluationIds,['eval-one']);assert.deepEqual(outcome.attemptIds,['one']);
 }
});
test('PR9 stale held-out approval cannot consume untouched final evidence',async t=>{
 const f=await fixture(t,{heldOut:'win',untouched:'win'});await f.candidate('one');
 const held=f.store.evaluations('run').find(e=>e.split==='held-out'&&e.attemptId)!;
 await writeFile(join(held.snapshots.candidate.directory,'prompt'),'TAMPERED_HELD_SNAPSHOT');const before=f.native.size;
 await assert.rejects(f.invoke('evaluate',{attemptId:'one',evaluationId:'eval-one',validation:'final'}),/changed|mismatch|modified/i);
 assert.equal(f.native.size,before);assert.equal(f.store.evaluations('run').some(e=>e.split==='final'),false);
});
test('PR9 held-out-linked lessons and decisions stay out of ordinary product ideation',async t=>{
 const f=await fixture(t,{heldOut:'win'});await f.candidate('one');
 const held=f.store.evaluations('run').find(e=>e.split==='held-out'&&e.attemptId)!;
 await f.invoke('distill',{lessonId:'held-lesson',nodeId:'one',insight:'HELD_GRADE_DETAIL_SENTINEL',limitations:'test-only',evidenceIds:[held.id]});
 await f.invoke('decide',{decisionId:'held-review',nodeId:'one',decision:'request_review',evidenceIds:[held.id]});
 const p=f.store.projection('run')!;assert.ok(JSON.stringify(p).includes('HELD_GRADE_DETAIL_SENTINEL'));
 const observation=researchObservation(p,0,f.store.evaluations('run'));
 assert.doesNotMatch(JSON.stringify(observation),/HELD_GRADE_DETAIL_SENTINEL/);assert.equal(observation.decisions.some((d:any)=>d.evidenceIds.includes(held.id)),false);
 await f.invoke('review','held-review');await f.invoke('decide',{decisionId:'held-discard',nodeId:'one',decision:'discard',evidenceIds:[held.id]});
 const after=researchObservation(f.store.projection('run')!,0,f.store.evaluations('run'));
 assert.equal(after.facts.noGain,0,'Test-only decisions cannot drive development convergence');assert.equal(after.recentFacts[0]!.evaluationId,'eval-one');
});
test('PR9 same-OID attempts cannot borrow attribution, stale review or consumed final evidence',async t=>{
 const f=await fixture(t,{heldOut:'win',validation:{policy:'final',maxUses:1},review:true});await f.candidate('one');
 await f.invoke('propose',{nodeId:'two',type:'hypothesis',parentId:null,title:'two',rationale:'WRITE GOOD',sourceRefs:[]});await f.invoke('dispatch',{nodeId:'two',attemptId:'two'});
 const run=f.store.get('run')!,one=run.material!.candidates.find(c=>c.id==='one')!,two=run.material!.candidates.find(c=>c.id==='two')!;
 assert.equal(gitText(run.material!.capture.repository,['rev-parse',one.oid+'^{tree}']),gitText(run.material!.capture.repository,['rev-parse',two.oid+'^{tree}']));
 // Two genuinely settled writers produced identical material. Attribute the same immutable commit, not merely equal metrics.
 f.store.materialCandidate(f.store.binding(run,'same-oid'),'g1',{...two,oid:one.oid});
 await assert.rejects(f.invoke('evaluate',{attemptId:'two',evaluationId:'eval-one'}),/different exact attempt/);
 await f.invoke('evaluate',{attemptId:'two',evaluationId:'eval-two'});
 await f.invoke('decide',{decisionId:'review-one',nodeId:'one',decision:'request_review',evidenceIds:['eval-one']});await f.invoke('review','review-one');await f.invoke('control','resume');
 await f.invoke('evaluate',{attemptId:'one',evaluationId:'recheck-one',purpose:'recheck'});
 await f.invoke('evaluate',{attemptId:'one',evaluationId:'recheck-one',validation:'final'});const count=f.native.size;
 assert.match((await f.keep('one')).reason,/final/,'Older development evidence cannot reuse the recheck final');
 assert.match((await f.keep('two')).reason,/final/,'Same OID is not the selected attempt');
 const stale=await f.invoke('decide',{decisionId:'stale-review',nodeId:'one',decision:'keep',evidenceIds:['recheck-one']});assert.match(stale.reason,/review receipt/);
 await assert.rejects(f.invoke('evaluate',{attemptId:'two',evaluationId:'eval-two',validation:'final'}),/already consumed/);assert.equal(f.native.size,count);
 await f.invoke('decide',{decisionId:'review-recheck',nodeId:'one',decision:'request_review',evidenceIds:['recheck-one']});await f.invoke('review','review-recheck');
 assert.equal((await f.invoke('decide',{decisionId:'fresh-keep',nodeId:'one',decision:'keep',evidenceIds:['recheck-one']})).status,'applied');
});
test('PR9 actual command held-out non-regression handles negative min/max ties and vetoes directional loss',async t=>{
 for(const direction of ['maximize','minimize'] as const)for(const loss of [false,true]){
  const f=await fixture(t,{command:true,heldOut:'win',direction,heldMetric:loss?(direction==='maximize'?'good?-2:-1':'good?0:-1'):'-1'});await f.candidate('one');
  const result=await f.keep('one');assert.equal(result.status,loss?'blocked':'applied');if(loss)assert.match(result.reason,/held-out-veto/);
 }
});
test('PR9 changed combined material requires new development and held-out current-incumbent comparisons',async t=>{
 const f=await fixture(t,{command:true,heldOut:'win',validation:{maxUses:3}});await f.candidate('one');await f.candidate('two','WRITE OTHER');const old=f.store.evaluation('run','eval-two')!;
 assert.equal((await f.keep('one')).status,'applied');assert.match((await f.keep('two')).reason,/stale-incumbent/);
 await f.invoke('evaluate',{attemptId:'two',evaluationId:'combined-two'});const combined=f.store.evaluation('run','combined-two')!,held=f.store.evaluations('run').find(e=>e.developmentId==='combined-two')!;
 assert.notEqual(combined.snapshots.candidate.oid,old.snapshots.candidate.oid);assert.equal(held.snapshots.candidate.oid,combined.snapshots.candidate.oid);assert.equal(held.snapshots.baseline.oid,f.store.get('run')!.material!.incumbent);assert.deepEqual(held.invocations.map(i=>i.score),['2','3']);
 assert.equal((await f.invoke('decide',{decisionId:'combined',nodeId:'two',decision:'keep',evidenceIds:['combined-two']})).status,'applied');assert.equal((f.store.projection('run')!.validation as any).heldOutUses,3);
});
test('PR9 held-out snapshot byte drift cannot use old score or review to keep',async t=>{
 const f=await fixture(t,{heldOut:'win'});await f.candidate('one');const held=f.store.evaluations('run').find(e=>e.split==='held-out'&&e.attemptId)!;
 await writeFile(join(held.snapshots.candidate.directory,'prompt'),'CANDIDATE_SNAPSHOT_TAMPERED');await assert.rejects(f.keep('one'),/changed|mismatch|modified/i);assert.equal(f.store.get('run')!.material!.incumbent,f.store.get('run')!.material!.capture.baseline);
});
test('PR9 development nonimprovement never invokes adaptive held-out or becomes validated',async t=>{
 const devOnly=await fixture(t);await devOnly.candidate('one');assert.equal((await devOnly.keep('one')).status,'applied');assert.equal((devOnly.store.projection('run')!.validation as any).label,'development-only');assert.equal((devOnly.store.projection('run')!.validation as any).heldOutUses,0);
 const f=await fixture(t,{heldOut:'win'});await f.candidate('one','WRITE BAD');assert.equal(f.store.evaluations('run').filter(e=>e.split==='held-out'&&e.attemptId).length,0);assert.match((await f.keep('one')).reason,/no-gain/);assert.equal((f.store.projection('run')!.validation as any).label,'development-only');
});
test('PR9 final-only is untouched until explicit owner selection, exact replay never redispatches and search cannot reuse it',async t=>{
 const limited=await fixture(t,{heldOut:'win',validation:{policy:'final',maxUses:1},limits:{evaluatorCalls:4}});await limited.candidate('one');await assert.rejects(limited.invoke('evaluate',{attemptId:'one',evaluationId:'eval-one',validation:'final'}),/capacity exhausted before untouched/);assert.equal(limited.store.evaluations('run').some(e=>e.split==='final'),false);
 const selected=await fixture(t,{heldOut:'win',untouched:'lose'});await selected.candidate('one');assert.equal((selected.store.projection('run')!.validation as any).finalUses,0);await selected.invoke('evaluate',{attemptId:'one',evaluationId:'eval-one',validation:'final'});assert.match((await selected.keep('one')).reason,/final-veto/);
 const f=await fixture(t,{heldOut:'win',validation:{policy:'final',maxUses:1}});await f.candidate('one');
 assert.equal(f.store.evaluations('run').length,2);assert.match((await f.keep('one')).reason,/final/);
 await f.invoke('control','pause');
 const payload={attemptId:'one',evaluationId:'eval-one',validation:'final'};
 assert.equal((await f.invoke('evaluate',payload)).status,'applied');const count=f.native.size;
 assert.equal((await f.invoke('evaluate',payload)).status,'applied');assert.equal(f.native.size,count);
 assert.equal((await f.keep('one')).status,'applied');assert.equal((f.store.projection('run')!.validation as any).label,'final-validated');
 await assert.rejects(f.invoke('evaluate',{attemptId:'one',evaluationId:'another'}),/Final selection/);
 await f.invoke('propose',{nodeId:'two',type:'hypothesis',parentId:null,title:'two',rationale:'WRITE GOOD',sourceRefs:[]});
 await assert.rejects(f.invoke('dispatch',{nodeId:'two',attemptId:'two'}),/Final selection/);assert.equal(f.native.size,count);
});
test('PR9 adaptive reuse is counted and capped across rechecks; frozen grading ignores policy file edits',async t=>{
 const f=await fixture(t,{heldOut:'win',validation:{maxUses:1}});await writeFile(join(f.root,'validation.json'),'{}');await f.candidate('one');
 await assert.rejects(f.invoke('evaluate',{attemptId:'one',evaluationId:'recheck',purpose:'recheck'}),/use limit/);
 assert.equal((f.store.projection('run')!.validation as any).heldOutUses,1);
 assert.equal(f.store.evaluations('run').filter(e=>e.split==='held-out'&&e.attemptId).length,1);
});
test('PR9 actual owning-Pi review cannot override held-out loser or authorize apply',async t=>{
 const f=await fixture(t,{heldOut:'lose',review:true});await f.candidate('one');
 await f.invoke('decide',{decisionId:'review',nodeId:'one',decision:'request_review',evidenceIds:['eval-one']});await f.invoke('review','review');
 assert.match((await f.keep('one')).reason,/held-out/);
 await assert.rejects(f.service.invoke('apply',{...f.store.binding(f.store.get('run')!,'apply'),decisionId:'review'},f.context),/measured-keep/);
});
test('PR9 command checks have separately reserved counted native IDs',async t=>{
 const f=await fixture(t,{command:true,heldOut:'win',checks:['process.exit(0)']});await f.candidate('one');assert.equal((await f.keep('one')).status,'applied');
 const records=f.store.evaluations('run');assert.ok(records.every(e=>e.invocations.every(i=>i.commandChecks?.length===1&&i.commandChecks[0]!.nativeId===i.native!.checkResults![0]!.id&&i.commandChecks[0]!.state==='native-complete')));
 assert.equal(researchFacts(f.store.projection('run')!).evaluatorCalls,16);
});
for(const heldOut of ['win','lose'] as const)test(`PR9 separate held-out ${heldOut} evidence gates exact measured keep`,async t=>{
 const f=await fixture(t,{heldOut});await f.candidate('one');const records=f.store.evaluations('run');
 assert.equal(records.filter(e=>(e as any).split==='held-out').length,2,'baseline and selected comparison are separate authoritative held-out records');
 const decision=await f.keep('one');assert.equal(decision.status,heldOut==='win'?'applied':'blocked');if(heldOut==='lose')assert.match(decision.reason,/held-out/);
 const p=f.store.projection('run') as any;assert.equal(p.validation.heldOutUses,1);assert.equal(p.validation.label,heldOut==='win'?'held-out-validated':'development-only');
 const ids=records.flatMap(e=>e.invocations.map(i=>i.id));assert.equal(new Set(ids).size,ids.length);assert.ok(records.every(e=>e.invocations.every(i=>i.native&&i.state==='ingested')));
});
test('PR8 explicit same-owner reopen recovers known spawn attachment gap and freezes without duplicate native work',async t=>{
 const f=await fixture(t,{command:true,settlementFailure:true});await f.invoke('propose',{nodeId:'one',type:'hypothesis',parentId:null,title:'one',rationale:'WRITE GOOD',sourceRefs:[]});
 const ingest=f.store.native.bind(f.store);let lost=true;t.mock.method(f.store,'native',(...args:Parameters<typeof f.store.native>)=>{if(lost){lost=false;throw new Error('attachment persistence interrupted');}return ingest(...args);});
 await assert.rejects(f.invoke('dispatch',{nodeId:'one',attemptId:'one'}),/attachment persistence/);const old=f.store.get('run')!,count=f.native.size;assert.equal(old.active,1);assert.equal(f.store.attempt('run','one')!.nativeId,null);await assert.rejects(f.service.close(),/settlement/);
 const store=new ResearchStore(join(f.state,'research.sqlite3')),bindings=new BindingStore(join(f.state,'bindings.sqlite3')),owner=new OwnerExecution(f.owner.call,bindings,'arbor.owner','g2',store),catalog=new EvaluatorCatalog([],{id:'view',digest:'view',semanticDigest:'view',bindings:{}},async()=>{throw new Error('no provider');}),evaluator=new EvaluationEngine(owner,store,f.state,catalog),service=new ResearchService(owner,store,f.state,join(f.root,'profile'),evaluator);t.after(()=>service.close());
 const args={...store.binding(store.get('run')!,'reopen'),payload:{attemptId:'exact-material',evaluationId:'initial',resume:true}};
 const receipt=await service.invoke('evaluate',args,f.context) as any;assert.equal(receipt.status,'applied');assert.equal(f.native.size,count);assert.equal(store.get('run')!.active,0);assert.equal(store.attempt('run','one')!.state,'completed');assert.equal(store.attempt('run','one')!.generation,'g1');assert.ok(store.get('run')!.material!.candidates[0]!.oid);assert.deepEqual(store.get('run')!.spec,old.spec);assert.equal(store.get('run')!.epoch,old.epoch);assert.deepEqual(store.get('run')!.generationHistory,['g1']);
});
for(const mode of ['continue-partial','restart-parent'] as const)test(`PR8 ${mode} is a new charged same-hypothesis invocation with exact artifact lineage`,async t=>{
 const f=await fixture(t,{workerFailure:true});await f.invoke('propose',{nodeId:'one',type:'hypothesis',parentId:null,title:'one',rationale:'WRITE GOOD',sourceRefs:[]});await assert.rejects(f.invoke('dispatch',{nodeId:'one',attemptId:'one'}));await f.invoke('control','pause');
 const before=f.store.get('run')!,prior=f.store.attempt('run','one')!,partial=before.material!.candidates[0]!,nativeBefore=f.native.size;
 const args={...f.store.binding(before,'continuation'),attemptId:'one',newAttemptId:'two',mode,summary:'Continue the same fixed hypothesis; preserve the completed partial edit and finish validation.'};
 const result=await f.service.invoke('resumeAttempt',args,f.context) as any;assert.equal(result.status,'applied');
 const after=f.store.get('run')!,next=f.store.attempt('run','two')!;assert.equal(after.state,'paused');assert.equal(after.execution,'partial-invocation-settled');assert.equal(after.attemptsUsed,before.attemptsUsed+1);assert.equal(f.native.size,nativeBefore+1);assert.deepEqual(after.spec,before.spec);assert.equal(after.epoch,before.epoch);assert.equal(after.material!.incumbent,before.material!.incumbent);assert.deepEqual(f.store.attempt('run','one'),prior);
 assert.deepEqual(next.continuation,{mode,previousAttemptId:'one',rootAttemptId:'one',sourceOid:mode==='continue-partial'?partial.oid:partial.parent,summary:args.summary});assert.equal(next.nodeId,prior.nodeId);assert.equal(after.material!.candidates.find(c=>c.id==='two')!.parent,next.continuation!.sourceOid);
 assert.deepEqual(await f.service.invoke('resumeAttempt',args,f.context),result);assert.equal(f.native.size,nativeBefore+1);assert.deepEqual(await readFile(join(f.cwd,'.git/index')),f.before);assert.equal(f.git('show-ref'),f.refs);
 await f.invoke('control','cancel');const terminal=f.store.projection('run');await assert.rejects(f.service.invoke('resumeAttempt',{...f.store.binding(f.store.get('run')!,'after-terminal'),attemptId:'two',newAttemptId:'three',mode,summary:args.summary},f.context),/quiescent/);assert.deepEqual(f.store.projection('run'),terminal);assert.equal(f.native.size,nativeBefore+1);
});
test('PR8 cancel during continuation collection stays terminal after freeze and restore finish',async t=>{
 const f=await fixture(t,{workerFailure:true});await f.invoke('propose',{nodeId:'one',type:'hypothesis',parentId:null,title:'one',rationale:'WRITE GOOD',sourceRefs:[]});await assert.rejects(f.invoke('dispatch',{nodeId:'one',attemptId:'one'}));await f.invoke('control','pause');
 let entered!:()=>void,release!:()=>void;const ready=new Promise<void>(r=>entered=r),held=new Promise<void>(r=>release=r),freeze=Workspace.prototype.freeze;
 t.mock.method(Workspace.prototype,'freeze',async function(this:Workspace,...args:Parameters<typeof freeze>){if(args[1].id==='two'){entered();await held;}return freeze.apply(this,args);});
 const pending=f.service.invoke('resumeAttempt',{...f.store.binding(f.store.get('run')!,'cancelled-continuation'),attemptId:'one',newAttemptId:'two',mode:'restart-parent',summary:'Restart the same fixed hypothesis from its exact original parent.'},f.context);
 try{await Promise.race([ready,pending.then(()=>{throw new Error('Collection barrier absent')})]);await f.invoke('control','cancel');assert.equal(f.store.get('run')!.state,'cancelled');}finally{release();await pending;}
 const p=f.store.projection('run'),nativeBefore=f.native.size;assert.equal(f.store.get('run')!.state,'cancelled');assert.equal(f.store.get('run')!.execution,'material-cancelled');await assert.rejects(f.service.invoke('resumeAttempt',{...f.store.binding(f.store.get('run')!,'after-cancel'),attemptId:'two',newAttemptId:'three',mode:'restart-parent',summary:'Must not reopen cancelled research.'},f.context),/quiescent/);assert.deepEqual(f.store.projection('run'),p);assert.equal(f.native.size,nativeBefore);assert.deepEqual(await readFile(join(f.cwd,'.git/index')),f.before);assert.equal(f.git('show-ref'),f.refs);
});
for(const operation of ['refine','discard'] as const)test(`PR8 measured continuation ${operation} uses the settled continuation not the unlaunched original`,async t=>{
 const f=await fixture(t,{command:true});await f.invoke('propose',{nodeId:'one',type:'hypothesis',parentId:null,title:'one',rationale:'WRITE GOOD',sourceRefs:[]});
 const blocked=join(f.state,'runs/run/workspace/candidates/one');await mkdir(blocked,{recursive:true});await writeFile(join(blocked,'retained'),'pre-existing obstruction');await assert.rejects(f.invoke('dispatch',{nodeId:'one',attemptId:'one'}),/already exists|not empty/);await f.invoke('control','pause');
 const prior=f.store.attempt('run','one')!;assert.equal(prior.state,'stopped');assert.equal(prior.nativeId,null);assert.equal(prior.nativeDigest,null);assert.equal(f.native.size,0);
 await f.service.invoke('resumeAttempt',{...f.store.binding(f.store.get('run')!,'restart'),attemptId:'one',newAttemptId:'two',mode:'restart-parent',summary:'Retry the same hypothesis from its saved parent after proven prelaunch refusal.'},f.context);await f.invoke('evaluate',{attemptId:'exact-material',evaluationId:'initial',resume:true});await f.invoke('evaluate',{attemptId:'two',evaluationId:'eval-two'});
 const next=f.store.attempt('run','two')!;assert.equal(next.state,'completed');assert.ok(next.nativeDigest);const nativeBefore=f.native.size;
 const result=operation==='refine'?await f.invoke('propose',{nodeId:'child',type:'hypothesis',parentId:'one',title:'Refine measured continuation',rationale:'Keep exact linked parent evidence',sourceRefs:[]}):await f.invoke('decide',{decisionId:'discard-two',nodeId:'one',decision:'discard',evidenceIds:['eval-two']});
 assert.equal(result.status,'applied');assert.deepEqual(f.store.attempt('run','one'),prior);assert.deepEqual(f.store.attempt('run','two'),next);assert.equal(f.native.size,nativeBefore);assert.equal(await readFile(join(blocked,'retained'),'utf8'),'pre-existing obstruction');assert.deepEqual(await readFile(join(f.cwd,'.git/index')),f.before);assert.equal(f.git('show-ref'),f.refs);
});
for(const research of [true,false])test(`PR8 pending ${research?'research':'material'} review rebind preserves choice and rejects an already-open old-generation dialog`,async t=>{
 const f=await fixture(t,{research,command:true});await f.invoke('propose',{nodeId:'one',type:'hypothesis',parentId:null,title:'one',rationale:'WRITE GOOD',sourceRefs:[]});await f.invoke('decide',{decisionId:'choice',nodeId:'one',decision:'request_review',evidenceIds:[]});
 let release!:(value:string)=>void,seen!:()=>void;const ready=new Promise<void>(r=>seen=r);f.context.extensionContext.ui.select=async()=>{seen();return new Promise<string>(r=>release=r);};
 const pending=f.invoke('review','choice','held-review');const settled=pending.then(()=>null,error=>error);await ready;
 const before=f.store.projection('run')!,beforeRun=f.store.get('run')!,command=f.store.binding(beforeRun,'reconcile-review');
 assert.throws(()=>f.store.rebindPendingReview(command,{...identity,ownerHostId:'outside'},f.owner.componentId,'g2'),/boundary/);assert.throws(()=>f.store.rebindPendingReview(command,identity,'other','g2'),/boundary/);assert.deepEqual(f.store.projection('run'),before);
 try{f.store.rebindPendingReview(command,identity,f.owner.componentId,'g2');}finally{release('Approve research choice');await settled;}assert.match(String(await settled),/generation|Stale/);
 const after=f.store.projection('run')!,afterRun=f.store.get('run')!;assert.equal(afterRun.state,'awaiting_review');assert.equal(afterRun.pendingDecisionId,'choice');assert.deepEqual(afterRun.spec,beforeRun.spec);assert.deepEqual(after.attempts,before.attempts);assert.deepEqual(after.evaluations,before.evaluations);assert.equal((after.decisions as any[])[0].status,'pending');assert.equal((after.decisions as any[])[0].userReceipt,undefined);
 assert.throws(()=>f.store.rebindPendingReview(command,identity,f.owner.componentId,'g3'),/Stale/);
 const fresh=f.store.binding(f.store.get('run')!,'new-review');assert.equal(f.store.review(fresh,'g2','choice','Reject research choice',identity).status,'applied');assert.equal(f.store.get('run')!.pendingDecisionId,null);assert.equal((f.store.projection('run')!.nodes as any[])[0].reviewed,false);
});
test('PR8 apply/undo owner service requires genuine current UI selection and keeps source receipts separate from review',async t=>{
 const f=await fixture(t,{command:true});await f.candidate('one');await f.keep('one');await f.invoke('control','pause');
 const run=f.store.get('run')!,args={...f.store.binding(run,'source-apply'),decisionId:'keep-one'};
 await assert.rejects(f.service.invoke('apply',{...args,approved:true},f.context),/unknown field/);
 const saved=f.context.extensionContext.ui.select;f.context.extensionContext.ui.select=async()=>undefined;
 await assert.rejects(f.service.invoke('apply',args,f.context),/dismissed|timed out/);assert.equal(await readFile(join(f.cwd,'prompt'),'utf8'),'BASELINE_SNAPSHOT_BAD');
 f.context.extensionContext.ui.select=async(_title,options)=>options[0];const applied=await f.service.invoke('apply',args,f.context) as any;assert.equal(applied.status,'applied');assert.equal(await readFile(join(f.cwd,'prompt'),'utf8'),'CANDIDATE_SNAPSHOT_GOOD');
 const undone=await f.service.invoke('undoApply',{...f.store.binding(f.store.get('run')!,'source-undo'),decisionId:'source-apply'},f.context) as any;assert.equal(undone.status,'applied');assert.equal(await readFile(join(f.cwd,'prompt'),'utf8'),'BASELINE_SNAPSHOT_BAD');assert.deepEqual(await readFile(join(f.cwd,'.git/index')),f.before);f.context.extensionContext.ui.select=saved;
});
test('PR8 stale source dialog and concurrent duplicate apply cannot rebase approval or overwrite completed journal',async t=>{
 const f=await fixture(t,{command:true});await f.candidate('one');await f.keep('one');await f.invoke('control','pause');const old={...f.store.binding(f.store.get('run')!,'stale-source'),decisionId:'keep-one'};
 f.context.extensionContext.ui.select=async()=>{await f.service.invoke('control',{...f.store.binding(f.store.get('run')!,'during-ui'),action:'steer',instruction:'Preserve newer owner direction'},f.context);return 'Apply exact source delta';};
 await assert.rejects(f.service.invoke('apply',old,f.context),/Stale/);assert.equal(await readFile(join(f.cwd,'prompt'),'utf8'),'BASELINE_SNAPSHOT_BAD');
 let release!:()=>void,seen!:()=>void,calls=0;const ready=new Promise<void>(r=>seen=r),held=new Promise<void>(r=>release=r);f.context.extensionContext.ui.select=async()=>{calls++;seen();await held;return 'Apply exact source delta';};const args={...f.store.binding(f.store.get('run')!,'single-source'),decisionId:'keep-one'};
 const a=f.service.invoke('apply',args,f.context);await ready;const b=f.service.invoke('apply',args,f.context);await assert.rejects(f.service.invoke('apply',{...args,decisionId:'other'},f.context),/Conflicting duplicate/);release();const [one,two]=await Promise.all([a,b]);assert.deepEqual(one,two);assert.equal(calls,1);
 const journal=JSON.parse(await readFile(join(f.state,'runs/run/workspace/source-operations/single-source.json'),'utf8'));assert.equal(journal.state,'applied');assert.equal(journal.intent.binding.response,'Apply exact source delta');assert.equal(journal.intent.binding.revision,args.revision);assert.deepEqual(journal.intent.binding.owner,f.store.get('run')!.owner);
 f.context.extensionContext.ui.select=async()=> 'Undo exact source delta';const undoProgram=commandProgram(researchCommand('undo-apply','run single-source'));const undone=await new Function('tools',`return(async()=>{${undoProgram}})()`)({call:({ref,args}:any)=>f.service.invoke(ref.slice(6),args,f.context)});assert.equal(undone.status,'applied');assert.equal(await readFile(join(f.cwd,'prompt'),'utf8'),'BASELINE_SNAPSHOT_BAD');assert.deepEqual(await readFile(join(f.cwd,'.git/index')),f.before);
});
test('PR6 reviewer lost worker reply preserves uncertainty through failed actor cleanup', async t => {
 const f = await fixture(t, { research: true, command: true, workerLoss: true });
 await f.service.invoke('runResearch', { ...f.store.binding(f.store.get('run')!, 'autonomous') }, f.context);
 assert.equal(f.bindings.get('material-run-one')!.state, 'cleanup_pending');
 assert.equal(f.store.get('run')!.state, 'cleanup_pending'); assert.equal(f.store.get('run')!.active, 1);
});
test('PR6 reviewer equal-tree attempts retain exact evaluation and decided evidence', async t => {
 // Production deliberately strips ambient GIT_* variables. Exercise the real
 // freeze, then canonicalize only commit metadata at this test's workspace seam.
 const freeze = Workspace.prototype.freeze;
 t.mock.method(Workspace.prototype, 'freeze', async function(this: Workspace, ...args: Parameters<typeof freeze>) {
  const frozen = await freeze.apply(this, args), repository = args[0].repository;
  const tree = gitText(repository, ['rev-parse', `${frozen.oid}^{tree}`]).trim();
  const oid = gitBytes(repository, ['-c','user.name=Arbor','-c','user.email=arbor@localhost','commit-tree',tree,'-p',frozen.parent,'-m','Arbor exact material'], undefined, {GIT_AUTHOR_DATE:'2001-01-01T00:00:00Z',GIT_COMMITTER_DATE:'2001-01-01T00:00:00Z'}).toString().trim();
  gitText(repository, ['update-ref', `refs/arbor/candidates/${frozen.id}/${oid}`, oid]);
  return {...frozen, oid};
 });
 const f = await fixture(t); await f.candidate('one');
 await f.invoke('decide', { decisionId:'discard-one',nodeId:'one',decision:'discard',evidenceIds:['eval-one'] });
 const original = researchFacts(f.store.projection('run')!).outcomes[0];
 await f.invoke('propose',{nodeId:'two',type:'hypothesis',parentId:null,title:'two',rationale:'WRITE GOOD',sourceRefs:[]});
 await f.invoke('dispatch',{nodeId:'two',attemptId:'two'});
 const before = researchFacts(f.store.projection('run')!); assert.equal(before.outcomes[1]!.evaluationId,null);
 await f.invoke('evaluate',{attemptId:'two',evaluationId:'eval-two'});
 assert.equal(f.store.get('run')!.material!.candidates[0]!.oid,f.store.get('run')!.material!.candidates[1]!.oid);
 assert.deepEqual(researchFacts(f.store.projection('run')!).outcomes[0],original);
 assert.equal(original!.comparedIncumbent,f.store.evaluation('run','eval-one')!.snapshots.baseline.oid);
 const saved=f.store.evaluation('run','eval-one')!;assert.throws(()=>f.store.saveEvaluation({...saved,attemptId:'two'}),/Immutable/);
 assert.throws(()=>f.store.saveEvaluation({...saved,validity:'invalid'}),/immutable/);
 await f.invoke('evaluate',{attemptId:'one',evaluationId:'later-one'});
 assert.deepEqual(researchFacts(f.store.projection('run')!).outcomes[0],original);
 assert.equal(researchFacts(f.store.projection('run')!).outcomes[1]!.evaluationId,'eval-two');
});
test('PR6 Main unlinked legacy evaluation cannot authorize an exact-attempt keep', async t => {
 const f = await fixture(t); await f.candidate('one');
 const original = f.store.evaluation('run','eval-one')!;
 f.store.saveEvaluation({...original,id:'legacy-unlinked',attemptId:null});
 const result = await f.invoke('decide',{decisionId:'legacy-keep',nodeId:'one',decision:'keep',evidenceIds:['legacy-unlinked']});
 assert.equal(result.status,'blocked'); assert.match(result.reason,/exact attempt/);
 assert.equal(f.store.get('run')!.material!.incumbent,f.store.get('run')!.material!.capture.baseline);
 // The owning-Pi command must select this attempt, not the newest equal-OID legacy record.
 const execute = new Function('tools', `return (async()=>{${commandProgram(researchCommand('keep','run one'))}})()`);
 const receipt = await execute({call:({ref,args}:{ref:string;args:Record<string,unknown>})=>f.service.invoke(ref.slice('arbor.'.length),args,f.context)});
 assert.equal(receipt.status,'applied');
 assert.equal((f.store.projection('run')!.decisions as Array<{status:string}>).at(-1)!.status,'measured-keep');
});
test('PR6 reviewer settled failed evidence survives authorized generation rebind without rewrite', async t => {
 const f = await fixture(t,{workerFailure:true});
 await f.invoke('propose',{nodeId:'one',type:'hypothesis',parentId:null,title:'one',rationale:'WRITE GOOD',sourceRefs:[]});
 await assert.rejects(f.invoke('dispatch',{nodeId:'one',attemptId:'one'}),/failed/);
 const a=f.store.attempt('run','one')!, evidence=structuredClone(f.store.projection('run')!.artifact_refs);
 await f.invoke('control','pause');f.store.rebindEvaluationRun(f.store.binding(f.store.get('run')!,'rebind'),f.store.get('run')!.owner,'arbor.owner','g2');
 const c=f.store.binding(f.store.get('run')!,'discard');
 assert.equal(f.store.research('decide',c,{decisionId:'discard',nodeId:'one',decision:'discard',evidenceIds:[a.evidenceId]},'g2').status,'applied');
 assert.deepEqual(f.store.attempt('run','one'),a);assert.deepEqual(f.store.projection('run')!.artifact_refs,evidence);
});
test('PR6 reviewer cumulative command check output blocks every subsequent native check',async t=>{
 const f=await fixture(t,{research:true,command:true,limits:{artifactBytes:100000},checks:["console.log('x'.repeat(60000));","throw new Error('must not dispatch second check')"]});
 await f.service.invoke('runResearch',{...f.store.binding(f.store.get('run')!,'autonomous')},f.context);
 const e=f.store.evaluations('run')[0]!;assert.equal(e.invocations.length,1);assert.equal(e.invocations[0]!.native!.checkResults!.length,1);assert.equal(e.state,'INTERRUPTED');assert.equal(f.native.size,0);
});
test('PR6 reviewer actual local output stops second invocation and actor at cumulative admission', async t => {
 const f=await fixture(t,{research:true,command:true,limits:{artifactBytes:100000},output:"console.log('x'.repeat(60000));"});
 await f.service.invoke('runResearch',{...f.store.binding(f.store.get('run')!,'autonomous')},f.context);
 const e=f.store.evaluations('run')[0]!;assert.equal(e.invocations.length,1);assert.ok(e.invocations[0]!.native!.text.length>60000);
 assert.equal(f.bindings.get('material-run-one'),undefined);assert.equal(f.native.size,0);
});
test("PR6 production dispatch and resume refuse damaged operational bundle before reservations or evaluation", async t => {
  const f = await fixture(t), ref = f.store.get("run")!.spec.roleBundle!;
  await f.invoke("propose", { nodeId: "one", type: "hypothesis", parentId: null, title: "one", rationale: "WRITE GOOD", sourceRefs: [] });
  const path = join(ref.directory, "roles/executor.md"), original = await readFile(path, "utf8");
  await writeFile(path, "generic replacement"); const before = f.store.projection("run"), nativeCount = f.native.size;
  await assert.rejects(f.invoke("dispatch", { nodeId: "one", attemptId: "one" }), /Operational role content identity/);
  assert.deepEqual(f.store.projection("run"), before); assert.equal(f.native.size, nativeCount);
  await writeFile(path, original); await f.invoke("control", "pause");
  const phase = join(ref.directory, "references/evidence-interpretation.md"), saved = await readFile(phase, "utf8");
  await writeFile(phase, "incompatible phase"); const paused = f.store.projection("run");
  await assert.rejects(f.invoke("control", "resume"), /Operational role content identity/);
  assert.deepEqual(f.store.projection("run"), paused); assert.equal(f.native.size, nativeCount);
  await writeFile(phase, saved); assert.equal((await f.invoke("control", "resume")).status, "applied");
  await f.invoke("dispatch", { nodeId: "one", attemptId: "one" });
  const binding = f.bindings.get("material-run-one")!, invocation = binding.roleInvocations![0]!;
  assert.equal(invocation.bundleId, ref.id); assert.equal(invocation.ref, "agents.spawn"); assert.equal(invocation.nativeId, f.store.attempt("run", "one")!.nativeId);
  assert.equal(invocation.instructionsId, f.store.get("run")!.spec.roles.executor.instructionsId); assert.equal(invocation.model, "fake/worker");
  assert.deepEqual(invocation.tools, ["read", "write", "bash"]); assert.deepEqual(invocation.requires, []); assert.equal(invocation.extensions, false);
  assert.equal(invocation.resultContract, "native-terminal-unscored-text");
  const poisoned = structuredClone(binding); poisoned.roleInvocations![0]!.model = "fake/rewritten";
  assert.throws(() => f.bindings.save(poisoned), /attribution cannot be rewritten/); assert.deepEqual(f.bindings.get(binding.spec.runId), binding);
});
test('PR6 public role revision is quiescent, stale-safe and append-only without measurement rewrite',async t=>{
 const f=await fixture(t);await f.candidate('one');
 const spec=f.store.get('run')!.spec,prior=f.bindings.get('material-run-one')!;
 const revise=(commandId:string)=>f.service.invoke('reviseRoles',{...f.store.binding(f.store.get('run')!,commandId)},f.context);
 await assert.rejects(revise('busy-role'),/quiescent paused/);
 await f.invoke('control','pause');const command=f.store.binding(f.store.get('run')!,'role-change');
 const receipt=await f.service.invoke('reviseRoles',{...command},f.context);
 assert.deepEqual(await f.service.invoke('reviseRoles',{...command},f.context),receipt);
 await assert.rejects(f.service.invoke('reviseRoles',{...command,commandId:'stale-role'},f.context),/Stale/);
 await assert.rejects(f.service.invoke('reviseRoles',{...f.store.binding(f.store.get('run')!,'forged-role'),approved:true},f.context),/unknown field/);
 assert.deepEqual(f.store.get('run')!.spec,spec);assert.deepEqual(f.bindings.get('material-run-one'),prior);
 await f.invoke('control','resume');await f.candidate('two');const next=f.bindings.get('material-run-two')!;
 assert.notEqual(next.roleInvocations![0]!.roleBindingId,prior.roleInvocations![0]!.roleBindingId);
 assert.deepEqual(f.bindings.get('material-run-one'),prior);assert.equal(f.store.evaluation('run','eval-two')!.specId,spec.identity);
});
test("PR5 product refuses transitive escaping baseline before evaluator dispatch", async t => {
  await assert.rejects(fixture(t, { links: true }), /symlink.*escapes/);
});
test("PR5 product exact task and repeat means do not round a below-threshold gain into eligibility", async t => {
  for (const repeat of [false, true]) for (const threshold of ["0.666666666", "0.666666667"]) {
    const f = await fixture(t, { ...(repeat ? { repeats: 3 } : { tasks: 3 }), threshold }); await f.candidate("one");
    const e = f.store.evaluation("run", "eval-one")!;
    assert.deepEqual(e.invocations.filter(i => i.condition === "baseline").map(i => i.score), ["1", "0", "0"]);
    assert.deepEqual(e.invocations.filter(i => i.condition === "candidate").map(i => i.score), ["1", "1", "1"]);
    assert.equal((await f.keep("one")).status, threshold.endsWith("7") ? "blocked" : "applied");
  }
});
test("PR5 unrounded acceptance preserves exact equality, relative thresholds, sub-nanounit repeats and mixed task directions", async t => {
  const f = await fixture(t); await f.candidate("one");
  const { digest } = await import("../../src/research/contracts.js");
  const check = (baseline: string[][], candidate: string[][], threshold: string, kind = "absolute", direction = "maximize") => {
    const run = structuredClone(f.store.get("run")!), e = structuredClone(f.store.evaluation("run", "eval-one")!);
    Object.assign(run.spec.config.objective, { minimumGain: threshold, gainKind: kind, direction });
    e.definition.tasks = baseline.map((_, n) => ({ id: `t${n}`, prompt: "exact arithmetic", expected: "GOOD" })); e.definition.repeats = baseline[0]!.length;
    run.spec.evaluation!.tasks = e.definition.tasks; run.spec.evaluation!.repeats = e.definition.repeats;
    const prior = e.invocations;
    e.invocations = baseline.flatMap((values, task) => values.flatMap((_, repeat) => (["baseline", "candidate"] as const).map(condition => ({ ...structuredClone(prior.find(i => i.condition === condition)!), id: `${condition}-${task}-${repeat}`, taskId: `t${task}`, repeat, score: (condition === "baseline" ? baseline : candidate)[task]![repeat]! }))));
    e.definitionId = digest(e.definition); const { identity: _id, ...body } = run.spec; run.spec.identity = digest(body); e.specId = run.spec.identity;
    return acceptance(run, e, e.snapshots.candidate.oid);
  };
  for (const threshold of ["0.499999999", "0.5", "0.500000001"]) assert.equal(check([["1"], ["0"]], [["1"], ["1"]], threshold), threshold === "0.500000001" ? "below-practical-threshold" : "eligible");
  for (const threshold of ["1.999999999", "2", "2.000000001"]) assert.equal(check([["1", "0", "0"]], [["1", "1", "1"]], threshold, "relative"), threshold === "2.000000001" ? "below-practical-threshold" : "eligible");
  assert.equal(check([["0.000000001", "0", "0"]], [["0.000000001", "0.000000001", "0.000000001"]], "0.000000001"), "below-practical-threshold");
  assert.equal(check([["0.000000001", "0.000000001", "0"], ["0", "0", "0"]], [["0.000000001", "0", "0"], ["1", "1", "1"]], "0"), "inconclusive-mixed-paired-tasks");
  assert.equal(check([["-1", "0", "0"]], [["-1", "-1", "-1"]], "2", "relative", "minimize"), "eligible");
});

test("PR5 material cancellation retains unresolved evaluator launch and snapshots", async t => {
  const f = await fixture(t, { loss: true }); await f.invoke("control", "cancel");
  const e = f.store.evaluations("run")[0]!; assert.equal(e.invocations[0]!.state, "launching"); assert.equal(e.invocations[0]!.nativeId, null); assert.equal(f.native.size, 1);
  assert.equal(f.store.get("run")!.state, "cleanup_pending"); assert.equal(await readFile(join(e.snapshots.baseline.directory, "prompt"), "utf8"), "BASELINE_SNAPSHOT_BAD");
  const retained = f.store.projection("run"); await assert.rejects(f.invoke("control", "pause"), /Unresolved material/); assert.deepEqual(f.store.projection("run"), retained);
  await assert.rejects(f.invoke("control", "resume"), /[Uu]nknown|[Uu]nobservable/); assert.equal(f.native.size, 1); assert.deepEqual(f.store.projection("run"),retained);
});
test("PR5 completed baseline pause/resume becomes dispatchable without evaluator recharge", async t => {
  const f = await fixture(t); const calls = f.store.evaluations("run")[0]!.invocations.length;
  await f.invoke("control", "pause"); assert.equal((await f.invoke("control", "resume")).status, "applied"); assert.equal(f.store.get("run")!.state, "ready");
  assert.equal(f.store.evaluations("run")[0]!.invocations.length, calls); await f.candidate("one");
});
test("PR5 quiescent material resume does not bypass pending review or command execute policy", async t => {
  const f = await fixture(t, { review: true }); await f.invoke("propose", { nodeId: "one", type: "hypothesis", parentId: null, title: "one", rationale: "WRITE GOOD", sourceRefs: [] });
  await f.invoke("decide", { decisionId: "review-one", nodeId: "one", decision: "request_review", evidenceIds: [] });
  const before=f.store.projection('run')!,old=f.store.binding(f.store.get('run')!,'old-review'),count=f.native.size;
  const resumed=await f.invoke('control','resume');assert.equal(resumed.status,'applied');assert.equal(resumed.value.state,'awaiting_review');assert.equal(f.store.get('run')!.pendingDecisionId,'review-one');assert.equal(f.native.size,count);
  const after=f.store.projection('run')!;assert.deepEqual(after.attempts,before.attempts);assert.deepEqual(after.evaluations,before.evaluations);assert.equal((after.decisions as any[])[0].status,'pending');assert.equal((after.decisions as any[])[0].userReceipt,undefined);assert.equal((after.nodes as any[])[0].reviewed,false);
  await assert.rejects(f.service.invoke('review',{...old,decisionId:'review-one'},f.context),/Stale/);
  const c = await fixture(t, { command: true }); await c.invoke("control", "pause"); assert.equal((await c.invoke("control", "resume")).status, "blocked"); assert.equal(c.store.get("run")!.state, "paused");
  const { commandProgram, researchCommand } = await import("../../src/research/commands.js");
  const request = researchCommand("resume", "run"); const program = commandProgram(request);
  const result = await new Function("tools", `return (async()=>{${program}})()` )({ call: ({ ref, args }: any) => c.service.invoke(ref.slice(6), args, c.context) });
  assert.equal(result.status, "applied"); assert.equal(c.store.get("run")!.state, "ready"); await c.candidate("one");
});
test("PR5 terminal material cancellation cannot report resumed or reopen through pause", async t => {
  for (const command of [false, true]) {
    const f = await fixture(t, { command }); await f.invoke("control", "cancel");
    const before = f.store.projection("run"), count = f.native.size;
    const resume = () => command ? f.invoke("evaluate", { attemptId: "exact-material", evaluationId: "initial", resume: true }) : f.invoke("control", "resume");
    await assert.rejects(resume(), /[Tt]erminal material/);
    await assert.rejects(f.invoke("control", "pause"), /[Tt]erminal material/);
    assert.deepEqual(f.store.projection("run"), before); assert.equal(f.native.size, count);
  }
});
test("PR5 adjacent immutable resume and pending CAS controls fail without rebasing or new execution", async t => {
  const f = await fixture(t); await f.candidate("one"); await f.invoke("control", "pause");
  const paused = f.store.get("run")!, count = f.native.size;
  for (const patch of [{ revision: paused.revision - 1 }, { epoch: "stale" }, { materialId: "stale" }]) {
    await assert.rejects(f.service.invoke("control", { ...f.store.binding(paused, "stale-resume"), ...patch, action: "resume" }, f.context), /Stale/);
  }
  assert.deepEqual(f.store.get("run"), paused); assert.equal(f.native.size, count);
  await f.invoke("control", "resume");
  const r = f.store.get("run")!, payload = { decisionId: "pending", nodeId: "one", decision: "keep", evidenceIds: ["eval-one"] };
  f.store.prepareIntegration(f.store.binding(r, "pending-keep"), f.owner.generation, payload);
  const pending = f.store.get("run")!;
  await assert.rejects(f.invoke("control", "resume"), /integration/);
  await assert.rejects(f.invoke("control", "pause"), /integration/);
  assert.deepEqual(f.store.get("run"), pending); assert.equal(f.native.size, count);
});
test("PR5 legal baseline and exact-material attempt IDs evaluate their actual frozen candidates", async t => {
  for (const id of ["baseline", "exact-material"]) {
    const f = await fixture(t); await f.candidate(id); const e = f.store.evaluation("run", `eval-${id}`)!;
    assert.equal(e.snapshots.candidate.oid, f.store.get("run")!.material!.candidates.find(c => c.id === id)!.oid);
    assert.deepEqual(e.invocations.map(i => i.score), ["0", "1"]); assert.equal((await f.keep(id)).status, "applied");
  }
});

test("PR5 production owner native worker -> frozen candidate -> actual evaluator -> transactional keep/export never mutates original", async t => {
  const f = await fixture(t); const baseline = f.store.get("run")!.material!.incumbent;
  await f.candidate("one"); assert.equal((await f.keep("one")).status, "applied");
  const m = f.store.get("run")!.material!; assert.notEqual(m.incumbent, baseline); assert.equal(gitText(m.capture.repository, ["rev-parse", "refs/arbor/incumbent"]).trim(), m.incumbent);
  const exported = await f.invoke("export", {}); const body = JSON.parse(await readFile(exported.value.path, "utf8")); assert.match(body.materialDelta.patch, /BASELINE_SNAPSHOT_BAD/); assert.doesNotMatch(body.materialDelta.patch, /user staged|source committed/);
  await f.candidate("tie"); const tie = await f.keep("tie"); assert.equal(tie.status, "blocked"); assert.equal(tie.reason, "no-gain");
  await f.invoke("decide", { decisionId: "discard-tie", nodeId: "tie", decision: "discard", evidenceIds: [] }); await f.invoke("control", "cancel");
  assert.deepEqual(await readFile(join(f.cwd, ".git/index")), f.before); assert.equal(f.git("show-ref"), f.refs); assert.equal(await readFile(join(f.cwd, "prompt"), "utf8"), "BASELINE_SNAPSHOT_BAD");
});
test("PR5 direct parsed metric before failed native exit never wins even with forged validity/analysis flags", async t => {
  const f = await fixture(t, { command: true, failedMetric: true }); await f.candidate("bad"); const e = f.store.evaluation("run", "eval-bad")!;
  assert.equal(e.validity, "invalid"); assert.equal(e.invocations.at(-1)!.native!.exitCode, 3); assert.equal((await f.keep("bad")).status, "blocked");
  e.validity = "valid"; e.quality.passed = true; e.invocations.at(-1)!.valid = true; e.invocations.at(-1)!.score = "2";
  assert.equal(acceptance(f.store.get("run")!, e, e.snapshots.candidate.oid), "invalid-native-execution");
});
test("PR5 exact owning-Pi review required for measured promotion; boolean or unrelated choice cannot approve", async t => {
  const f = await fixture(t, { review: true }); await f.candidate("one"); assert.equal((await f.keep("one")).status, "blocked");
  await f.invoke("decide", { decisionId: "review-one", nodeId: "one", decision: "request_review", evidenceIds: ["eval-one"] }); await f.invoke("review", "review-one");
  assert.equal((await f.keep("one")).status, "applied");
});

test("PR5 current-incumbent change blocks old score; combined material travels through actual command reevaluation", async t => {
  const f = await fixture(t, { command: true }); await f.candidate("one"); await f.candidate("two", "WRITE OTHER");
  const old = f.store.evaluation("run", "eval-two")!; assert.equal((await f.keep("one")).status, "applied");
  assert.match((await f.keep("two")).reason, /stale-incumbent/);
  await f.invoke("evaluate", { attemptId: "two", evaluationId: "combined-two" });
  const combined = f.store.evaluation("run", "combined-two")!; assert.notEqual(combined.snapshots.candidate.oid, old.snapshots.candidate.oid);
  assert.deepEqual(combined.invocations.map(i => i.score), ["2", "3"]);
  const kept = await f.invoke("decide", { decisionId: "keep-combined", nodeId: "two", decision: "keep", evidenceIds: ["combined-two"] }); assert.equal(kept.status, "applied");
});
test("PR5 Git CAS before database completion retains durable intent and exact replay completes once", async t => {
  const f = await fixture(t); await f.candidate("one"); const run = f.store.get("run")!;
  const args = { ...f.store.binding(run, "crash-keep"), payload: { decisionId: "crash-decision", nodeId: "one", decision: "keep", evidenceIds: ["eval-one"] } };
  const complete = f.store.completeIntegration.bind(f.store); f.store.completeIntegration = () => { throw new Error("injected after Git CAS"); };
  await assert.rejects(f.service.invoke("decide", args, f.context), /injected after Git CAS/);
  const reopened = new ResearchStore(join(f.state, "research.sqlite3")); const pending = reopened.get("run")!.material!; reopened.close();
  assert.equal(pending.incumbent, pending.pending!.expected); assert.equal(gitText(pending.capture.repository, ["rev-parse", "refs/arbor/incumbent"]).trim(), pending.pending!.target);
  f.store.completeIntegration = complete;
  const result = await f.service.invoke("decide", args, f.context); assert.equal((result as any).status, "applied"); assert.deepEqual(await f.service.invoke("decide", args, f.context), result);
  assert.equal(f.store.get("run")!.material!.pending, null);
});
test("PR5 exact candidate, epoch, spec and protected input drift cannot become a keep", async t => {
  const f = await fixture(t); await f.candidate("one"); const run = f.store.get("run")!, e = f.store.evaluation("run", "eval-one")!;
  assert.notEqual(acceptance({ ...run, epoch: "wrong" }, e, e.snapshots.candidate.oid), "eligible");
  assert.notEqual(acceptance(run, { ...e, specId: "wrong" }, e.snapshots.candidate.oid), "eligible");
  assert.notEqual(acceptance(run, e, run.material!.capture.baseline), "eligible");
  await writeFile(join(e.snapshots.candidate.directory, "check"), "poison"); await assert.rejects(f.keep("one"), /Exact evaluation material changed/);
});
test("PR5 descriptive command noise oracle is inconclusive and cannot be overridden by larger scalar claims", async t => {
  const f = await fixture(t, { command: true }); await f.candidate("one"); const run = f.store.get("run")!, e = f.store.evaluation("run", "eval-one")!;
  // Fixed repeats are part of the specification, not a caller analysis override.
  e.definition.repeats = 3; run.spec.evaluation!.repeats = 3;
  const { digest } = await import("../../src/research/contracts.js"); e.definitionId = digest(e.definition); const { identity: _identity, ...body } = run.spec; run.spec.identity = digest(body); e.specId = run.spec.identity;
  e.invocations = e.invocations.flatMap(i => [i, { ...structuredClone(i), id: i.id + "-2", repeat: 1 }, { ...structuredClone(i), id: i.id + "-3", repeat: 2 }]);
  const last = e.invocations.at(-1)!; last.score = "4"; last.native!.text = "ARBOR_METRIC 4 points\n";
  assert.equal(acceptance(run, e, e.snapshots.candidate.oid), "inconclusive-noise-recheck-required");
});

const waveItem=(nodeId:string)=>({nodeId,attemptId:nodeId,selection:{nodeId,slot:'exploit',kind:'explore',fallback:'eligible-exploit-absent',reason:'Independent fixed alternative'}});
async function waveNodes(f:Awaited<ReturnType<typeof fixture>>){for(const [id,task] of [['left','WRITE GOOD'],['right','WRITE OTHER']])await f.invoke('propose',{nodeId:id,type:'hypothesis',parentId:null,title:id,rationale:task,sourceRefs:[]});}
test('PR7 atomic wave admission rolls back both attempts/slots/evaluator credits and duplicate replay never spawns',async t=>{
 const f=await fixture(t,{command:true,search:{concurrency:2},limits:{evaluatorCalls:5}});await waveNodes(f);const before=f.store.projection('run');
 await assert.rejects(f.invoke('dispatch',{waveId:'too-large',candidates:[waveItem('left'),waveItem('right')]}),/Evaluator invocation capacity/);assert.deepEqual(f.store.projection('run'),before);assert.equal(f.native.size,0);
 const payload={waveId:'one',candidates:[waveItem('left')]},command={...f.store.binding(f.store.get('run')!,'once'),payload};await f.service.invoke('dispatch',command,f.context);const count=f.native.size;await f.service.invoke('dispatch',command,f.context);assert.equal(f.native.size,count);assert.equal(f.store.get('run')!.attemptsUsed,1);assert.equal(f.store.get('run')!.active,0);
});
test('PR7 two fixed-parent candidates settle whole wave; serial evaluation, stale promotion refusal and new exact combined evaluation',async t=>{
 const f=await fixture(t,{command:true,search:{concurrency:2}});await waveNodes(f);const parent=f.store.get('run')!.material!.incumbent;
 await f.invoke('dispatch',{waveId:'pair',candidates:[waveItem('left'),waveItem('right')]});assert.equal(f.store.get('run')!.active,0);
 const attempts=['left','right'].map(id=>f.store.attempt('run',id)!);assert.ok(attempts.every(a=>a.nativeDigest&&a.parentIncumbent===parent&&a.evaluationReservation===2));assert.equal(new Set(f.store.get('run')!.material!.candidates.map(c=>c.directory)).size,2);
 const first=f.invoke('evaluate',{attemptId:'left',evaluationId:'eval-left'});await assert.rejects(f.invoke('evaluate',{attemptId:'right',evaluationId:'race'}),/occupied/);await first;await f.invoke('evaluate',{attemptId:'right',evaluationId:'eval-right'});
 const right=f.store.evaluation('run','eval-right')!;assert.equal((await f.keep('left')).status,'applied');assert.match((await f.keep('right')).reason,/stale-incumbent/);
 await f.invoke('evaluate',{attemptId:'right',evaluationId:'combined'});const combined=f.store.evaluation('run','combined')!;assert.notEqual(combined.snapshots.candidate.oid,right.snapshots.candidate.oid);assert.equal(combined.snapshots.baseline.oid,f.store.get('run')!.material!.incumbent);assert.ok(combined.invocations.every(i=>i.native&&i.state==='ingested'));assert.equal((await f.invoke('decide',{decisionId:'keep-combined',nodeId:'right',decision:'keep',evidenceIds:['combined']})).status,'applied');
 assert.deepEqual(await readFile(join(f.cwd,'.git/index')),f.before);assert.equal(f.git('show-ref'),f.refs);
});
for(const control of ['pause','cancel'] as const)test(`PR7 ${control} between admitted native launches prevents second launch and settles first`,async t=>{
 const f=await fixture(t,{command:true,search:{concurrency:2}});await waveNodes(f);let release!:()=>void,entered!:()=>void;const held=new Promise<void>(r=>release=r),ready=new Promise<void>(r=>entered=r),original=f.owner.dispatchMaterial.bind(f.owner);
 t.mock.method(f.owner,'dispatchMaterial',async(runId:string,attemptId:string,context:FabricInvocationContext)=>{if(attemptId==='right'){entered();await held;}return original(runId,attemptId,context);});
 const wave=f.invoke('dispatch',{waveId:'controlled',candidates:[waveItem('left'),waveItem('right')]});await ready;
 // Explicit owning-Pi state boundary, not actor cancellation disguised as pruning.
 f.store.control(f.store.binding(f.store.get('run')!,'control'),f.owner.generation,control);release();await wave;
 assert.equal(f.store.attempt('run','right')!.nativeId,null);assert.equal(f.store.attempt('run','right')!.state,'stopped');assert.equal(f.store.get('run')!.active,0);assert.ok(f.native.size<=1);
});
test('PR7 pruning changes eligibility, never cancels admitted worker; ancestor lesson revisions retain both siblings',async t=>{
 const f=await fixture(t,{command:true,search:{concurrency:2}});await f.invoke('propose',{nodeId:'direction',type:'direction',parentId:null,title:'direction',rationale:'Independent mechanisms',sourceRefs:[]});
 for(const id of ['left','right'])await f.invoke('propose',{nodeId:id,type:'hypothesis',parentId:'direction',title:id,rationale:'WRITE GOOD',sourceRefs:[]});
 let release!:()=>void,entered!:()=>void;const held=new Promise<void>(r=>release=r),ready=new Promise<void>(r=>entered=r),original=f.owner.dispatchMaterial.bind(f.owner);
 t.mock.method(f.owner,'dispatchMaterial',async(runId:string,attemptId:string,context:FabricInvocationContext)=>{entered();await held;return original(runId,attemptId,context);});
 const wave=f.invoke('dispatch',{waveId:'pruned-active',candidates:[waveItem('left'),waveItem('right')]});await ready;
 f.store.research('decide',f.store.binding(f.store.get('run')!,'prune'),{decisionId:'prune',nodeId:'direction',decision:'prune',evidenceIds:[]},f.owner.generation);release();await wave;assert.ok(['left','right'].every(id=>f.store.attempt('run',id)!.state==='completed'));
 const binding=f.store.binding(f.store.get('run')!,'insight-left');const lesson=(id:string)=>({lessonId:'lesson-'+id,nodeId:id,insight:'Settled factual observation',limitations:'No causal claim',evidenceIds:[f.store.attempt('run',id)!.evidenceId]});
 f.store.research('distill',binding,lesson('left'),f.owner.generation);assert.throws(()=>f.store.research('distill',{...binding,commandId:'stale-sibling'},lesson('right'),f.owner.generation),/Stale/);
 f.store.research('distill',f.store.binding(f.store.get('run')!,'insight-right'),lesson('right'),f.owner.generation);const n=(f.store.projection('run')!.nodes as any[]).find(n=>n.nodeId==='direction');assert.deepEqual(n.insightIds,['lesson-left','lesson-right']);assert.equal(n.insightRevision,f.store.get('run')!.revision);
});

test('PR7 duplicate wave identity refuses before new reservation or native effects',async t=>{
 const f=await fixture(t,{command:true,search:{concurrency:2,maxChildren:4}});await waveNodes(f);await f.invoke('dispatch',{waveId:'stable',candidates:[waveItem('left'),waveItem('right')]});
 await f.invoke('propose',{nodeId:'third',type:'hypothesis',parentId:null,title:'third',rationale:'WRITE GOOD',sourceRefs:[]});const before=f.store.projection('run'),count=f.native.size;
 await assert.rejects(f.invoke('dispatch',{waveId:'stable',candidates:[waveItem('third')]}),/Wave identity/);assert.deepEqual(f.store.projection('run'),before);assert.equal(f.native.size,count);
});
test('PR7 budget exhaustion mid serial wave releases unlaunched slot with no second native effect',async t=>{
 const f=await fixture(t,{command:true,search:{concurrency:1},limits:{activeMs:1000}});await waveNodes(f);const original=f.owner.dispatchMaterial.bind(f.owner);
 t.mock.method(f.owner,'dispatchMaterial',async(runId:string,attemptId:string,context:FabricInvocationContext)=>{if(attemptId==='left'){const r=await original(runId,attemptId,context);await new Promise(r=>setTimeout(r,1100));return r;}return original(runId,attemptId,context);});
 await f.invoke('dispatch',{waveId:'budget',candidates:[waveItem('left'),waveItem('right')]});assert.equal(f.native.size,1);assert.equal(f.store.attempt('run','right')!.state,'stopped');assert.equal(f.store.attempt('run','right')!.nativeId,null);assert.equal(f.store.get('run')!.active,0);
});
test('PR7 convergence committed midwave admits no further native launch',async t=>{
 const f=await fixture(t,{command:true,search:{concurrency:1,stopAfterNoGain:1}});await f.candidate('prior','WRITE BAD');await waveNodes(f);const original=f.owner.dispatchMaterial.bind(f.owner),count=f.native.size;
 t.mock.method(f.owner,'dispatchMaterial',async(runId:string,attemptId:string,context:FabricInvocationContext)=>{const result=await original(runId,attemptId,context);if(attemptId==='left')f.store.research('decide',f.store.binding(f.store.get('run')!,'negative'),{decisionId:'negative',nodeId:'prior',decision:'discard',evidenceIds:['eval-prior']},f.owner.generation);return result;});
 await f.invoke('dispatch',{waveId:'convergence',candidates:[waveItem('left'),waveItem('right')]});assert.equal(f.native.size,count+1);assert.equal(f.store.attempt('run','right')!.nativeId,null);assert.equal(f.store.attempt('run','right')!.state,'stopped');assert.equal(f.store.get('run')!.active,0);
});

for(const concurrency of [1,2])test(`PR7 repair preparation failure releases every proven unlaunched reservation at concurrency ${concurrency}`,async t=>{
 const f=await fixture(t,{command:true,search:{concurrency}});await waveNodes(f);
 const blocked=join(f.state,'runs/run/workspace/candidates/right');await mkdir(blocked,{recursive:true});await writeFile(join(blocked,'retained'),'obstruction');
 const payload={waveId:'prepare-failure',candidates:[waveItem('left'),waveItem('right')]},command={...f.store.binding(f.store.get('run')!,'prepare-failure'),payload};
 await assert.rejects(f.service.invoke('dispatch',command,f.context),/already exists|not empty/);
 assert.equal(f.native.size,0);assert.equal(f.store.get('run')!.active,0);
 const p=f.store.projection('run')!;assert.equal(reservedEvaluationCalls(p.attempts as any,p.evaluations as any),0);
 for(const id of ['left','right']){const a=f.store.attempt('run',id)!;assert.equal(a.state,'stopped');assert.equal(a.nativeId,null);assert.equal(a.nativeDigest,null);}
 assert.equal(await readFile(join(blocked,'retained'),'utf8'),'obstruction');assert.ok(f.store.get('run')!.material!.candidates.find(c=>c.id==='left'));
 const replay=await f.service.invoke('dispatch',command,f.context) as any;assert.equal(replay.status,'blocked');assert.match(replay.reason,/already exists|not empty/);assert.equal(f.native.size,0);
});
for(const restoreFails of [false,true])test(`PR7 repair protected freeze rejection still restores settled writer; restore failure ${restoreFails}`,async t=>{
 const f=await fixture(t,{command:true});await waveNodes(f);const dispatch=f.owner.dispatchMaterial.bind(f.owner);let workerHead='';
 t.mock.method(f.owner,'dispatchMaterial',async(...args:Parameters<typeof dispatch>)=>{await dispatch(...args);const c=f.store.get('run')!.material!.candidates.find(c=>c.id===args[1])!;await writeFile(join(c.directory,'check'),'PROTECTED WORKER CHANGE');gitText(c.directory,['add','check']);gitText(c.directory,['-c','user.name=worker','-c','user.email=worker@example.invalid','commit','-m','protected']);workerHead=gitText(c.directory,['rev-parse','HEAD']).trim();});
 let restores=0;const restore=Workspace.prototype.restore;t.mock.method(Workspace.prototype,'restore',async function(this:Workspace,...args:Parameters<typeof restore>){restores++;if(restoreFails)throw new Error('restore probe failure');await restore.apply(this,args);});
 const payload={nodeId:'left',attemptId:'left'},command={...f.store.binding(f.store.get('run')!,'protected'),payload};
 await assert.rejects(f.service.invoke('dispatch',command,f.context),/Protected evaluation input/);assert.equal(restores,1);
 const m=f.store.get('run')!.material!,c=m.candidates.find(c=>c.id==='left')!;assert.equal(c.oid,null);assert.equal(m.incumbent,m.capture.baseline);assert.equal(f.store.get('run')!.active,0);assert.ok(f.store.attempt('run','left')!.nativeDigest);
 assert.equal(gitText(c.directory,['rev-parse','HEAD']).trim(),restoreFails?workerHead:c.parent);assert.match(gitText(m.capture.repository,['show-ref']),new RegExp(workerHead));
 const replay=await f.service.invoke('dispatch',command,f.context) as any;assert.equal(replay.status,'blocked');assert.match(replay.reason,/Protected evaluation input/);if(restoreFails)assert.match(replay.reason,/restore probe failure/);
 assert.deepEqual(await readFile(join(f.cwd,'.git/index')),f.before);assert.equal(f.git('show-ref'),f.refs);
});

test('PR7 repair adjacent prelaunch admission rejection releases reservations but never lost native replies',async t=>{
 const f=await fixture(t,{command:true,search:{concurrency:2}});await waveNodes(f);const call=f.owner.call;
 t.mock.method(f.owner,'call',async(ref:Parameters<typeof call>[0],args:Parameters<typeof call>[1])=>{if(ref==='schema.status')throw new Error('prelaunch admission failed');return call(ref,args);});
 await assert.rejects(f.invoke('dispatch',{waveId:'admission',candidates:[waveItem('left'),waveItem('right')]}),/prelaunch admission failed/);
 assert.equal(f.native.size,0);assert.equal(f.store.get('run')!.active,0);assert.ok(['left','right'].every(id=>f.store.attempt('run',id)!.state==='stopped'));
});
test('PR7 repair ambiguous spawn keeps reservation, workspace and blocked replay without redispatch',async t=>{
 const f=await fixture(t,{command:true,workerLoss:true});await waveNodes(f);const payload={nodeId:'left',attemptId:'left'},command={...f.store.binding(f.store.get('run')!,'ambiguous'),payload};
 await assert.rejects(f.service.invoke('dispatch',command,f.context),/ambiguous|lost/);const count=f.native.size,m=f.store.get('run')!.material!;
 assert.equal(f.store.get('run')!.active,1);assert.equal(f.store.get('run')!.state,'cleanup_pending');assert.equal(m.candidates[0]!.oid,null);assert.equal(f.store.attempt('run','left')!.nativeDigest,null);
 assert.notEqual(gitText(m.candidates[0]!.directory,['rev-parse','HEAD']).trim(),m.candidates[0]!.parent);
 const replay=await f.service.invoke('dispatch',command,f.context) as any;assert.equal(replay.status,'blocked');assert.equal(f.native.size,count);
});
