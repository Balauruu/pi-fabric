// Temporary final-release checker. Delete review artifacts before merge.
import fs from 'node:fs';
import ts from '/home/balauru/.pi-profiles/fabric/npm/node_modules/typescript/lib/typescript.js';
import Ajv from '/home/balauru/.pi-profiles/fabric/npm/node_modules/ajv/dist/ajv.js';
import {guestTypeDeclarations} from '/home/balauru/.pi-profiles/fabric/npm/node_modules/pi-fabric/dist/runtime/guest-types.js';
import {buildDynamicGuestDeclarations} from '/home/balauru/.pi-profiles/fabric/npm/node_modules/pi-fabric/dist/runtime/dynamic-guest-types.js';
import {loadSkillsFromDir} from '/home/balauru/.local/share/pi-node/node-v22.23.1-linux-x64/lib/node_modules/@earendil-works/pi-coding-agent/dist/core/skills.js';
const root='/home/balauru/.pi-profiles/fabric/.worktrees/research-skill-rework/skills/fabric-research';
const out='/home/balauru/.pi-profiles/fabric/tmp/fabric-research-rework-review/release-check';
const text=fs.readFileSync(root+'/SKILL.md','utf8');
const contracts=JSON.parse(fs.readFileSync(out+'/current-contracts.json','utf8'));
const extensionTools=contracts.filter(c=>c.provider==='extensions').map(c=>({name:c.name,inputSchema:c.inputSchema}));
const dynamic=buildDynamicGuestDeclarations({extensionTools});
let declarations=guestTypeDeclarations(true,{dynamic});
if(!declarations.includes('declare const π')) declarations+='\ndeclare const π: Record<string,string>;\n';
fs.writeFileSync(out+'/guest-current.d.ts',declarations);
const blocks=[...text.matchAll(/```ts\n([\s\S]*?)\n```/g)].map(m=>m[1]);
const helper=blocks[3];
const prepended=new Set([1,2,4,5,6]); // A, B, C, D, E
const compileBodies=blocks.map((body,i)=>prepended.has(i) ? helper+'\n'+body : body);
const result={blockCount:blocks.length,helperBlock:4,helperPrependedTo:[2,3,5,6,7],syntax:[],types:[],schema:null,loader:null};
for(const [i,body] of compileBodies.entries()) {
 const file=out+`/current-template-${i+1}.ts`;
 fs.writeFileSync(file,'export {};\nasync function template(){\n'+body+'\n}\n');
 const p=ts.createProgram([file,out+'/guest-current.d.ts'],{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,noEmit:true,skipLibCheck:true,strict:false});
 const describe=d=>({code:d.code,message:ts.flattenDiagnosticMessageText(d.messageText,' '),line:d.file&&d.start!==undefined?d.file.getLineAndCharacterOfPosition(d.start).line+1:null});
 result.syntax.push({block:i+1,errors:p.getSyntacticDiagnostics().map(describe)});
 result.types.push({block:i+1,errors:p.getSemanticDiagnostics().map(describe)});
}
const schema=JSON.parse(fs.readFileSync(root+'/references/evidence.schema.json','utf8'));
new Ajv({strict:false}).compile(schema); result.schema='compiled';
const loaded=loadSkillsFromDir({dir:root,source:'release-check'});
result.loader={skills:loaded.skills.map(s=>({name:s.name,disableModelInvocation:s.disableModelInvocation,filePath:s.filePath})),diagnostics:loaded.diagnostics};
fs.writeFileSync(out+'/static-current-results.json',JSON.stringify(result,null,2));
console.log(JSON.stringify(result,null,2));
if(result.blockCount!==7||result.syntax.some(x=>x.errors.length)||result.types.some(x=>x.errors.length)||loaded.diagnostics.length||loaded.skills.length!==1)process.exitCode=1;
