import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import ts from '/home/balauru/.pi-profiles/fabric/npm/node_modules/typescript/lib/typescript.js';
const root=path.resolve(process.argv[2]);
const names=['SKILL.md','references/runtime.md','references/stream-contracts.md','references/synthesis-and-reporting.md','references/last30days.md'];
const docs=Object.fromEntries(names.map(n=>[n,fs.readFileSync(path.join(root,n),'utf8')]));
const p=path.join(root,'researcher.md');
assert.ok(fs.existsSync(p),'canonical researcher template must exist');
const template=fs.readFileSync(p,'utf8');
assert.ok(template.split('\n').length<=65,'template stays short');
const code=template.match(/```ts\n([\s\S]*?)\n```/)[1];
const transpile=s=>{const r=ts.transpileModule(s,{compilerOptions:{target:ts.ScriptTarget.ES2022},reportDiagnostics:true});assert.equal(r.diagnostics?.length??0,0);return r.outputText;};
const request=vm.runInNewContext(transpile(code+'\nresearcherRequest;'));
assert.equal(request.runner,'pi'); assert.equal(request.model,'openai-codex/gpt-5.6-terra'); assert.equal(request.thinking,'high');
assert.equal(request.extensions,true); assert.equal(request.recursive,false);
assert.deepEqual(Array.from(request.tools),['web_search','fetch_content','get_search_content','read']);
assert.ok(!('cwd' in request)&&!('schema' in request)&&!('persona' in request));
assert.equal(request.task.split('{{TASK}}').length,2);
assert.match(request.task,/original-source links/); assert.match(request.task,/Counterevidence/);assert.match(request.task,/Coverage and gaps/);
assert.match(docs['SKILL.md'],/\[researcher request template\]\(researcher\.md\)/);
assert.match(docs['SKILL.md'],/Workflow code only: persist the full Markdown/);
assert.match(docs['SKILL.md'],/grant the planner write authority only for `RESEARCH.md`/);
assert.match(docs['SKILL.md'],/never planner writes/);
assert.match(docs['references/stream-contracts.md'],/Researchers always return the full Markdown/);
const all=Object.values(docs).join('\n');
for(const stale of ['Only that worker writes its stream while live','Researchers read the stream contract and save substantive evidence incrementally','Research workers can return a short path/status handoff','and the profile root as `cwd`'])assert.ok(!all.includes(stale),'stale rule: '+stale);
for(const [n,text] of Object.entries({...docs,'researcher.md':template}))for(const m of text.matchAll(/\]\(([^)]+)\)/g)){const target=m[1].split('#')[0];if(target&&!/^https?:/.test(target))assert.ok(fs.existsSync(path.resolve(path.dirname(path.join(root,n)),target)),'broken link '+target);}
const fragment=docs['references/runtime.md'].match(/```ts\n([\s\S]*?)\n```/)[1];
const body='(async()=>{'+transpile(fragment)+'return receipt;})()';
const cases=[['success','completed','# Note\n\n[Source](https://example.org)\n  ',true,false,false],['failed-partial','failed','# Partial\n',true,false,false],['empty-success','completed','  ',true,false,false],['failed-empty','failed','',true,false,false],['no-write','completed','# Unsaved\n',false,false,false],['write-failure','completed','# Retained\n',true,true,false],['readback-mismatch','completed','# Retained\n',true,false,true]];
const outcomes=[];
for(const [name,status,text,persist,failWrite,mismatch] of cases){let saved;let writes=0;const result={id:name,status,text};const context={researcherRequest:request,persist,streamPath:'note.md',agents:{run:async()=>result},pi:{write:async a=>{writes++;if(failWrite)throw new Error('storage blocked');saved=a.text;},read:async()=>mismatch?'different':saved}};
const receipt=await vm.runInNewContext(body,context);
assert.equal(receipt.nativeStatus,status);assert.equal(receipt.hasText,text.trim().length>0);assert.ok(!('text' in receipt));
if(!persist||!text.trim()){assert.equal(writes,0);assert.equal(receipt.savedPath,null);}else if(failWrite||mismatch){assert.equal(receipt.savedPath,null);assert.ok(receipt.persistenceError);}else{assert.equal(saved,text);assert.equal(receipt.savedPath,'note.md');assert.equal(receipt.persistenceError,null);}
outcomes.push({case:name,pass:true});}
console.log(JSON.stringify({template:'PASS',ownership:'PASS',links:'PASS',persistence:outcomes}));
