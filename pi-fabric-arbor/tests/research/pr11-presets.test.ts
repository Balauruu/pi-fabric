import assert from 'node:assert/strict';
import {runReadOnlyCli} from '../../src/cli/read-only.js';
import {mkdtemp,readFile,writeFile,mkdir,symlink,chmod,stat} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import test from 'node:test';
import {scaffold, SCAFFOLD_SCHEMA} from '../../src/presets/scaffold.js';
import {loadPreset, presetSchema} from '../../src/presets/contract.js';
import {resolveSpec} from '../../src/research/spec.js';
import {validate,RESEARCH_ACTIONS} from '../../src/research/contracts.js';
import {commandProgram,researchCommand} from '../../src/research/commands.js';
const environment={node:process.execPath,coordinatorModel:'local/coordinator',executorModel:'local/executor',subjectModel:'local/subject'};
for(const pack of ['code','agent','recipe'] as const)test(`PR11 ${pack} runnable scaffold and frozen precedence`,async()=>{
 const root=await mkdtemp(join(tmpdir(),'arbor-pr11-')),destination=join(root,'pack');
 const result=await scaffold({pack,destination,environment,heldOut:false});
 assert.equal(result.status,'unvalidated');assert.equal(result.start.overrides.material.root,join(destination,'material'));
 const spec=await resolveSpec(root,{objective:{minimumGain:'0.02'},limits:{evaluatorCalls:99}},{objective:{minimumGain:'0.03'}},result.start.overrides);
 assert.equal(spec.config.limits.evaluatorCalls,99);assert.equal(spec.origins['limits.evaluatorCalls'],'profile');
 assert.equal(spec.config.objective.minimumGain,'0.03');assert.equal(spec.origins['objective.minimumGain'],'project');
 assert.equal(spec.evaluation!.repeats,pack==='code'?3:1);assert.equal(spec.config.evaluator.aggregation,pack==='agent'?'paired-descriptive':'median');
 assert.ok(spec.config.sourceRefs.some(s=>s.startsWith('preset-sha256:')));assert.equal(spec.roles.coordinator.model,environment.coordinatorModel);
 assert.equal(spec.roles.subject.model,environment.subjectModel);assert.equal(spec.validation,undefined);
 const initial=await readFile(join(destination,'preparation.json'),'utf8');await assert.rejects(scaffold({pack,destination,environment,heldOut:false}),/exist|conflict/i);assert.equal(await readFile(join(destination,'preparation.json'),'utf8'),initial);
 const without=await resolveSpec(root,{preset:'/missing'},{},{execution:'deferred',preset:null});assert.equal(without.config.preset,null);
 const p=await loadPreset(join(destination,'preset.json'));assert.equal(p.id,`arbor-${pack}`);
});
test('PR11 owner schema and command have write risk, closed choices and no override source',()=>{
 const d=RESEARCH_ACTIONS.find(a=>a.name==='scaffold')!;assert.equal(d.risk,'write');assert.deepEqual(d.inputSchema,SCAFFOLD_SCHEMA);
 const req=researchCommand('scaffold',JSON.stringify({pack:'code',destination:'/tmp/new',environment,heldOut:false}));assert.equal(req.ref,'arbor.scaffold');assert.equal(req.resolveBinding,false);assert.match(commandProgram(req),/arbor.scaffold/);
 assert.throws(()=>validate(SCAFFOLD_SCHEMA,{pack:'code',destination:'/tmp/new',environment,heldOut:false,overwrite:true}));assert.ok(presetSchema());
});
test('PR11 selected held-out and optional grounding are frozen without mandatory network',async()=>{
 const root=await mkdtemp(join(tmpdir(),'arbor-pr11-'));
 const r=await scaffold({pack:'agent',destination:join(root,'pack'),environment,heldOut:true});
 const spec=await resolveSpec(root,{}, {},r.start.overrides);assert.equal(spec.validation!.policy,'selected');assert.equal(spec.config.grounding!.mode,'optional');assert.equal(spec.evaluation!.repeats,1);
});
test('PR11 frozen preset identity survives source-ref overrides and changed files',async()=>{
 const root=await mkdtemp(join(tmpdir(),'arbor-pr11-'));const r=await scaffold({pack:'code',destination:join(root,'pack'),environment,heldOut:false});
 const spec=await resolveSpec(root,{}, {},{...r.start.overrides,sourceRefs:['user-source'],objective:{minimumGain:'0.04'}});const saved=JSON.stringify(spec);
 assert.equal(spec.origins['objective.minimumGain'],'explicit');assert.equal(spec.presetSource!.id,'arbor-code');assert.deepEqual(spec.config.sourceRefs,['user-source']);
 const p=JSON.parse(await readFile(join(root,'pack/preset.json'),'utf8'));p.instructions='different';await writeFile(join(root,'pack/preset.json'),JSON.stringify(p));
 assert.equal(JSON.stringify(spec),saved);const changed=await resolveSpec(root,{}, {},r.start.overrides);assert.notEqual(changed.presetSource!.digest,spec.presetSource!.digest);
 await assert.rejects(resolveSpec(root,{}, {},{...r.start.overrides,evaluator:{...r.start.overrides.evaluator,repeats:1}}),/Repeat policy/);
});
test('PR11 upstream maintained adapter pins local inputs without modifying or initializing source',async()=>{
 const root=await mkdtemp(join(tmpdir(),'arbor-pr11-')),source=join(root,'prepared');await mkdir(source);await writeFile(join(source,'benchmark.cjs'),"console.log('ARBOR_METRIC 10 ms');\n");
 const prepared={root:source,files:['benchmark.cjs'],argv:[process.execPath,'benchmark.cjs'],checks:[],unit:'ms',revision:'2f4e65410a5c21c9e55835a9a0d77ead21a64ffa',sourceUrl:'https://github.com/RUC-NLPIR/Arbor'};
 await chmod(join(source,'benchmark.cjs'),0o755);const bytes=await readFile(join(source,'benchmark.cjs'));const r=await scaffold({pack:'upstream-command',destination:join(root,'pack'),environment,heldOut:false,prepared});
 assert.equal(r.status,'unvalidated');assert.deepEqual(await readFile(join(root,'pack/material/benchmark.cjs')),bytes);assert.deepEqual(await readFile(join(source,'benchmark.cjs')),bytes);
 const provenance=JSON.parse(await readFile(join(root,'pack/preparation.json'),'utf8'));assert.equal(provenance.provenance.upstream.revision,prepared.revision);assert.equal(provenance.inputs[0].sha256.length,64);assert.equal(provenance.inputs[0].mode,0o700);assert.equal((await stat(join(root,'pack/material/benchmark.cjs'))).mode&0o777,0o700);
 await assert.rejects(scaffold({pack:'upstream-command',destination:join(source,'nested'),environment,heldOut:false,prepared}),/separate/);
 await assert.rejects(scaffold({pack:'upstream-command',destination:join(root,'escape'),environment,heldOut:false,prepared:{...prepared,files:['../escape']}}),/relative/);
 await assert.rejects(scaffold({pack:'upstream-command',destination:join(root,'duplicate'),environment,heldOut:false,prepared:{...prepared,files:['benchmark.cjs','benchmark.cjs']}}),/Duplicate/);
});
test('PR11 final review bounds serialized evaluator argv and checks before destination creation',async()=>{
 const root=await mkdtemp(join(tmpdir(),'arbor-pr11-')),source=join(root,'source');await mkdir(source);await writeFile(join(source,'benchmark.cjs'),"console.log('ARBOR_METRIC 1 ms');\n");
 const prepared={root:source,files:['benchmark.cjs'],argv:[process.execPath,'benchmark.cjs'],checks:[] as string[][],unit:'ms',revision:'a'.repeat(40),sourceUrl:'https://example.invalid'};
 for(const field of ['argv','checks'] as const){const huge=Array.from({length:9},()=> 'x'.repeat(8000));const destination=join(root,field);await assert.rejects(scaffold({pack:'upstream-command',destination,environment,heldOut:false,prepared:{...prepared,[field]:field==='argv'?huge:[huge]}}),/Evaluation definition exceeds bound/);await assert.rejects(stat(destination));}
 const allowed=await scaffold({pack:'upstream-command',destination:join(root,'allowed'),environment,heldOut:false,prepared:{...prepared,argv:Array.from({length:7},()=> 'x'.repeat(8000))}});assert.ok((await readFile(join(allowed.destination,'evaluation.json'))).length<=65536);
});
test('PR11 review bounds compose preset provenance and preparation selections',async()=>{
 const root=await mkdtemp(join(tmpdir(),'arbor-pr11-'));const r=await scaffold({pack:'code',destination:join(root,'pack'),environment,heldOut:false});
 const path=join(root,'pack/preset.json'),preset=JSON.parse(await readFile(path,'utf8'));preset.sourceRefs=Array.from({length:29},(_,i)=>'source-'+i);await writeFile(path,JSON.stringify(preset));
 const spec=await resolveSpec(root,{}, {},r.start.overrides);assert.equal(spec.config.sourceRefs.length,32);
 preset.sourceRefs.push('overflow');await writeFile(path,JSON.stringify(preset));await assert.rejects(loadPreset(path),/bounded array/);
 const prepared={root,files:Array.from({length:33},(_,i)=>'file-'+i),argv:[process.execPath,'benchmark.cjs'],checks:[],unit:'ms',revision:'a'.repeat(40),sourceUrl:'https://example.invalid'};
 assert.throws(()=>validate(SCAFFOLD_SCHEMA,{pack:'upstream-command',destination:join(root,'upstream'),environment,heldOut:false,prepared}),/bounded array/);
});
test('PR11 review held-out task content is disjoint, not just renamed IDs',async()=>{
 const tasks=JSON.parse(await readFile('examples/agent/tasks.json','utf8'));const development=new Set(tasks.development.map((t:any)=>JSON.stringify([t.prompt,t.expected])));assert.ok(tasks.heldOut.every((t:any)=>!development.has(JSON.stringify([t.prompt,t.expected]))));
});
test('PR11 review retirement after awaited parent creation refuses file writes',async()=>{
 const root=await mkdtemp(join(tmpdir(),'arbor-pr11-'));let calls=0;await assert.rejects(scaffold({pack:'code',destination:join(root,'pack'),environment,heldOut:false},()=>{if(++calls===3)throw new Error('retired-after-parent')}),/retired-after-parent/);
 await assert.rejects(readFile(join(root,'pack/material/unique.cjs')));
});
test('PR11 concurrent destination claims preserve one complete pack and retirement blocks before creation',async()=>{
 const root=await mkdtemp(join(tmpdir(),'arbor-pr11-'));const request={pack:'code' as const,destination:join(root,'pack'),environment,heldOut:false};
 const outcomes=await Promise.allSettled([scaffold(request),scaffold(request)]);assert.equal(outcomes.filter(r=>r.status==='fulfilled').length,1);assert.equal(JSON.parse(await readFile(join(root,'pack/preparation.json'),'utf8')).status,'unvalidated');
 await assert.rejects(scaffold({...request,destination:join(root,'retired')},()=>{throw new Error('retired')}),/retired/);
 await assert.rejects(readFile(join(root,'retired/preparation.json')));
});
test('PR11 CLI denies preparation and export mutations in every mode without artifacts',async()=>{
 for(const mode of [[],['--mode','attached'],['--mode','offline']])for(const verb of ['scaffold','prepare','init','create','create-export','export']){let output='';const io={stdout:{write:(s:any)=>{output+=String(s);return true}},stderr:{write:(s:any)=>{output+=String(s);return true}}};assert.equal(await runReadOnlyCli([verb,...mode],io),2);assert.match(output,/strictly read-only/);}
});
test('PR11 unsafe destination parent and unknown choices reject before writes',async()=>{
 const root=await mkdtemp(join(tmpdir(),'arbor-pr11-'));await mkdir(join(root,'real'));await symlink(join(root,'real'),join(root,'link'));
 await assert.rejects(scaffold({pack:'code',destination:join(root,'link','pack'),environment,heldOut:false}),/canonical|symlink/);
 await assert.rejects(scaffold({pack:'unknown',destination:join(root,'pack'),environment,heldOut:false} as any));
});
