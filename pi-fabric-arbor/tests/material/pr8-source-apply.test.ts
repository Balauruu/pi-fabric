import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdir, mkdtemp, writeFile, readFile, symlink, readlink, chmod, lstat, unlink } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { Workspace, gitBytes, gitText } from '../../src/material/Workspace.js';
import { SourceApply } from '../../src/material/SourceApply.js';

async function fixture() {
 const root=await mkdtemp(resolve('.runtime/pr8-gates/source-')),source=join(root,'source');await mkdir(source);
 gitBytes(source,['init','-b','main']);gitBytes(source,['config','user.name','test']);gitBytes(source,['config','user.email','test@example.invalid']);
 await writeFile(join(source,'a'),'original');await writeFile(join(source,'b'),'original');await writeFile(join(source,'unrelated'),'original');
 gitBytes(source,['add','.']);gitBytes(source,['commit','-m','original']);await writeFile(join(source,'a'),'staged');gitBytes(source,['add','a']);await writeFile(join(source,'a'),'dirty baseline');
 const w=new Workspace(join(root,'owned')),capture=await w.capture({root:source,mutablePaths:['a','b','new','link','nested','line\nname'],evaluationInputs:[],selectedUntracked:[]});
 const c=await w.materialize(capture,'candidate',capture.baseline);await writeFile(join(c.directory,'a'),'target a');await writeFile(join(c.directory,'b'),'target b');await chmod(join(c.directory,'b'),0o755);await writeFile(join(c.directory,'new'),'new');await symlink('a',join(c.directory,'link'));
 const frozen=await w.freeze(capture,c),apply=new SourceApply(w);const binding={runId:'run',materialId:capture.id,epoch:'epoch-1',revision:7,specId:'saved-spec',owner:{id:'root',rootId:'root',ownerHostId:'host',ownerIdentityId:'owner',sessionId:'session'},decisionId:'keep',response:'Apply exact source delta'};
 return {root,source,w,capture,frozen,apply,binding,index:await readFile(join(source,'.git/index')),refs:gitText(source,['show-ref'])};
}
test.before(async()=>{await mkdir(resolve('.runtime/pr8-gates'),{recursive:true});});
test('PR8 apply and undo preserve dirty baseline, unrelated newer edits, original index/refs, modes and links',async()=>{
 const f=await fixture();await writeFile(join(f.source,'unrelated'),'newer unrelated');
 const applied=await f.apply.apply(f.capture,f.frozen.oid,'apply-1',f.binding);assert.equal(applied.state,'applied');
 assert.equal(await readFile(join(f.source,'a'),'utf8'),'target a');assert.equal(await readlink(join(f.source,'link')),'a');assert.ok((await lstat(join(f.source,'b'))).mode&0o111);
 const undone=await f.apply.undo(f.capture,'apply-1','undo-1',{...f.binding,response:'Undo exact source delta'});assert.equal(undone.state,'applied');
 assert.equal(await readFile(join(f.source,'a'),'utf8'),'dirty baseline');assert.equal(await readFile(join(f.source,'unrelated'),'utf8'),'newer unrelated');assert.deepEqual(await readFile(join(f.source,'.git/index')),f.index);assert.equal(gitText(f.source,['show-ref']),f.refs);await assert.rejects(lstat(join(f.source,'new')),/ENOENT/);
});
test('PR8 affected preimage conflicts block before any source write; export remains available',async()=>{
 const f=await fixture();await writeFile(join(f.source,'b'),'newer user edit');const result=await f.apply.apply(f.capture,f.frozen.oid,'apply-1',f.binding);assert.equal(result.state,'conflict');assert.equal(await readFile(join(f.source,'a'),'utf8'),'dirty baseline');assert.equal(await readFile(join(f.source,'b'),'utf8'),'newer user edit');assert.match(await f.w.export(f.capture,f.frozen.oid),/target a/);
});
test('PR8 undo never overwrites newer affected user bytes',async()=>{
 const f=await fixture();await f.apply.apply(f.capture,f.frozen.oid,'apply-1',f.binding);await writeFile(join(f.source,'a'),'later edit');const result=await f.apply.undo(f.capture,'apply-1','undo-1',{...f.binding,response:'Undo exact source delta'});assert.equal(result.state,'conflict');assert.equal(await readFile(join(f.source,'a'),'utf8'),'later edit');assert.equal(await readFile(join(f.source,'b'),'utf8'),'target b');
});
test('PR8 intent precedes writes; partial crash/reopen conflicts without replay or inverse',async()=>{
 const f=await fixture();const prepared=await f.apply.prepare(f.capture,f.frozen.oid,'apply-1',f.binding);assert.equal(prepared.state,'intent');assert.equal(await readFile(join(f.source,'a'),'utf8'),'dirty baseline');
 await writeFile(join(f.source,'a'),'target a');const reopened=new SourceApply(f.w);const result=await reopened.apply(f.capture,f.frozen.oid,'apply-1',f.binding);assert.equal(result.state,'conflict');assert.equal(await readFile(join(f.source,'b'),'utf8'),'original');assert.equal(await readFile(join(f.source,'a'),'utf8'),'target a');assert.match(result.error!,/partial|preimage/i);
});
test('PR8 symlink parent escape rejects before any source write',async()=>{
 const f=await fixture(),c=await f.w.materialize(f.capture,'nested-candidate',f.capture.baseline),outside=join(f.root,'outside');await mkdir(join(c.directory,'nested'));await writeFile(join(c.directory,'nested/file'),'candidate');const frozen=await f.w.freeze(f.capture,c);await mkdir(outside);await writeFile(join(outside,'file'),'outside user data');await symlink(outside,join(f.source,'nested'));const result=await f.apply.apply(f.capture,frozen.oid,'symlink-parent',f.binding);assert.equal(result.state,'conflict');assert.match(result.error!,/parent conflict/);assert.equal(await readFile(join(outside,'file'),'utf8'),'outside user data');assert.deepEqual(await readFile(join(f.source,'.git/index')),f.index);
});
test('PR8 dangling symlink parent preflight rejects before an earlier valid path is written',async()=>{
 const f=await fixture(),c=await f.w.materialize(f.capture,'dangling-parent',f.capture.baseline),missing=join(f.root,'missing');
 await writeFile(join(c.directory,'a'),'changed earlier path');await mkdir(join(c.directory,'nested'));await writeFile(join(c.directory,'nested/file'),'candidate');const frozen=await f.w.freeze(f.capture,c);await symlink(missing,join(f.source,'nested'));
 const result=await f.apply.apply(f.capture,frozen.oid,'dangling-parent',f.binding);
 assert.equal(result.state,'conflict');assert.equal(await readFile(join(f.source,'a'),'utf8'),'dirty baseline');assert.deepEqual(result.started,[]);assert.match(result.error!,/parent conflict/);assert.equal(await readlink(join(f.source,'nested')),missing);await assert.rejects(lstat(missing),/ENOENT/);assert.deepEqual(await readFile(join(f.source,'.git/index')),f.index);assert.equal(gitText(f.source,['show-ref']),f.refs);
});
test('PR8 exact deletion and newline-name addition undo safely; newer mode blocks inverse before writes',async()=>{
 const f=await fixture(),c=await f.w.materialize(f.capture,'deletion',f.capture.baseline);await unlink(join(c.directory,'b'));await writeFile(join(c.directory,'line\nname'),'new');const frozen=await f.w.freeze(f.capture,c);assert.equal((await f.apply.apply(f.capture,frozen.oid,'delete',f.binding)).state,'applied');await assert.rejects(lstat(join(f.source,'b')),/ENOENT/);assert.equal(await readFile(join(f.source,'line\nname'),'utf8'),'new');assert.equal((await f.apply.undo(f.capture,'delete','undo-delete',{...f.binding,response:'Undo exact source delta'})).state,'applied');assert.equal(await readFile(join(f.source,'b'),'utf8'),'original');await assert.rejects(lstat(join(f.source,'line\nname')),/ENOENT/);
 await f.apply.apply(f.capture,f.frozen.oid,'modes',f.binding);await chmod(join(f.source,'b'),0o644);assert.equal((await f.apply.undo(f.capture,'modes','undo-mode',{...f.binding,response:'Undo exact source delta'})).state,'conflict');assert.equal(await readFile(join(f.source,'a'),'utf8'),'target a');assert.deepEqual(await readFile(join(f.source,'.git/index')),f.index);assert.equal(gitText(f.source,['show-ref']),f.refs);
});
test('PR8 exact postimage adoption is idempotent; changed operation identity rejects',async()=>{
 const f=await fixture();await f.apply.apply(f.capture,f.frozen.oid,'apply-1',f.binding);assert.equal((await new SourceApply(f.w).apply(f.capture,f.frozen.oid,'apply-1',f.binding)).state,'applied');await assert.rejects(f.apply.apply(f.capture,f.frozen.oid,'apply-1',{...f.binding,revision:8}),/identity|binding/i);
});

for(const outcome of ['complete','preimage','mixed','newer-bytes','newer-mode'] as const)test(`PR8 fresh source adoption ${outcome} preserves original intent and never replays writes`,async()=>{
 const f=await fixture();let j=await f.apply.prepare(f.capture,f.frozen.oid,'original',f.binding);
 if(outcome==='mixed')await writeFile(join(f.source,'a'),'target a');
 else if(outcome!=='preimage'){j=f.apply.execute(f.capture,j);if(outcome==='newer-bytes')await writeFile(join(f.source,'a'),'newer');if(outcome==='newer-mode')await chmod(join(f.source,'b'),0o600);}
 // Durable all-postwrite/final-save gap, not a new apply intent.
 j.state='writing';await writeFile(f.apply.path('original'),JSON.stringify(j));const intent=structuredClone(j.intent),identity=j.identity;
 const beforeA=await readFile(join(f.source,'a')),beforeB=await readFile(join(f.source,'b')),mode=(await lstat(join(f.source,'b'))).mode;
 const binding={...f.binding,commandId:'fresh',revision:9,generation:'g2',decisionId:'original'};
 const result=new SourceApply(f.w).adopt(f.capture,j,binding);
 assert.equal(result.state,outcome==='complete'?'applied':'conflict');assert.deepEqual(result.intent,intent);assert.equal(result.identity,identity);assert.deepEqual(await readFile(join(f.source,'a')),beforeA);assert.deepEqual(await readFile(join(f.source,'b')),beforeB);assert.equal((await lstat(join(f.source,'b'))).mode,mode);assert.deepEqual(await readFile(join(f.source,'.git/index')),f.index);assert.equal(gitText(f.source,['show-ref']),f.refs);
 if(outcome==='complete'){
  assert.deepEqual(result.adoptions,[binding]);assert.deepEqual(new SourceApply(f.w).adopt(f.capture,result,binding),result);
  assert.throws(()=>f.apply.adopt(f.capture,result,{...binding,revision:10}),/Conflicting/);assert.throws(()=>f.apply.adopt(f.capture,result,{...binding,owner:{...binding.owner,ownerHostId:'other'}}),/owner/);
  assert.equal((await f.apply.undo(f.capture,'original','undo',{...binding,response:'Undo exact source delta'})).state,'applied');assert.equal(await readFile(join(f.source,'a'),'utf8'),'dirty baseline');
 }else {assert.equal(result.adoptions,undefined);await assert.rejects(f.apply.prepareUndo(f.capture,'original','undo',binding),/Exact completed/);}
});
