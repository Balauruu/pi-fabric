import assert from 'node:assert/strict';
import {mkdirSync,mkdtempSync,readFileSync,readdirSync,writeFileSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import test from 'node:test';
import {cutover,documentation} from '../fixtures/pr13-cutover.js';
import {ResearchStore} from '../../src/research/ResearchStore.js';
import {createArborComponent,createArborOwnerComponent} from '../../src/managed/definitions.js';
import {createOwnerDrainComponent,OWNER_LIFETIME_ACTION} from '../../src/managed/OwnerLifetime.js';
test('PR13 mechanical hard cutover has only reachable source and current registrations',()=>{assert.equal(cutover(process.cwd(),true).modules.length,43);});
test('PR13 legacy-shaped databases are refused byte-for-byte without reader migration or owner conversion',()=>{
 const base=resolve('.runtime/pr13-gates');mkdirSync(base,{recursive:true});
 for(const version of [0,1]){const root=mkdtempSync(join(base,'legacy-refusal-')),path=join(root,'research.sqlite3'),db=new DatabaseSync(path);db.exec('CREATE TABLE legacy_runs (id TEXT PRIMARY KEY, payload TEXT); INSERT INTO legacy_runs VALUES (\'old\',\'retained user bytes\'); PRAGMA user_version='+version);db.close();writeFileSync(join(root,'user.key'),'untouched');const bytes=readFileSync(path),names=readdirSync(root).sort(),store=new ResearchStore(path);try{assert.throws(()=>store.projection('old'),/Unsupported research schema/);assert.throws(()=>store.prepareOwner(),/Unsupported research schema/);}finally{store.close();}assert.deepEqual(readFileSync(path),bytes);assert.deepEqual(readdirSync(root).sort(),names);assert.equal(readFileSync(join(root,'user.key'),'utf8'),'untouched');}
});
test('PR13 documentation rejects broken targets anchors and unshipped historical links',()=>{
 const base=resolve('.runtime/pr13-gates');mkdirSync(base,{recursive:true});const root=mkdtempSync(join(base,'docs-'));writeFileSync(join(root,'guide.md'),'# Configuration\n');writeFileSync(join(root,'history.md'),'# History\n');const packed=new Set(['README.md','guide.md']);
 writeFileSync(join(root,'README.md'),'[guide](guide.md#configuration)\n');assert.equal(documentation(root,packed).links,1);
 for(const target of ['missing.md','guide.md#missing','history.md']){writeFileSync(join(root,'README.md'),'[broken]('+target+')\n');assert.throws(()=>documentation(root,packed),/Markdown/);}
});
test('PR13 public component and manifest retain one passive application and exact scoped lifetime',()=>{
 const parent=createArborComponent(),owner=createArborOwnerComponent(),drain=createOwnerDrainComponent();assert.ok(parent);assert.deepEqual(owner.provides,['arbor','arbor_lifetime']);assert.deepEqual(drain.requires,['arbor_lifetime.lease']);assert.equal(OWNER_LIFETIME_ACTION.risk,'agent');assert.equal(OWNER_LIFETIME_ACTION.effect!.kind,'scoped');assert.equal(OWNER_LIFETIME_ACTION.inputSchema.additionalProperties,false);
});
