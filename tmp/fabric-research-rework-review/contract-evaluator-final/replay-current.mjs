// Temporary evaluator artifact. Validates only saved native live returns; no fixtures.
import fs from 'node:fs';
import Ajv from '/home/balauru/.pi-profiles/fabric/npm/node_modules/ajv/dist/ajv.js';
const old='/home/balauru/.pi-profiles/fabric/tmp/fabric-research-rework-review/live';
const schema=JSON.parse(fs.readFileSync('/home/balauru/.pi-profiles/fabric/.worktrees/research-skill-rework/skills/fabric-research/references/evidence.schema.json','utf8'));
const validate=new Ajv({strict:false}).compile(schema);
const native=JSON.parse(fs.readFileSync(old+'/worker-concurrency.json','utf8'));
if(native.status!=='failed') throw new Error(`native status changed or unexpected: ${native.status}`);
if(typeof native.text!=='string') throw new Error('actual failed native return has no text');
const text=JSON.parse(native.text);
const textValid=validate(text);
const result={nativeStatus:native.status,nativeId:native.id,textRows:Array.isArray(text.rows)?text.rows.length:null,textCalls:Array.isArray(text.calls)?text.calls.length:null,textValid,errors:validate.errors};
fs.writeFileSync('/home/balauru/.pi-profiles/fabric/tmp/fabric-research-rework-review/contract-evaluator-final/replay-current-results.json',JSON.stringify(result,null,2));
console.log(JSON.stringify(result,null,2));
if(!textValid) process.exitCode=1;
