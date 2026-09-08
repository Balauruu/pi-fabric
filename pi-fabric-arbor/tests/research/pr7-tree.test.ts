import assert from 'node:assert/strict';
import test from 'node:test';
import { selectionOptions, validateSelection, validateNode, rankEvaluations } from '../../src/research/tree.js';
import { researchFacts } from '../../src/research/policy.js';
import { resolveSpec } from '../../src/research/spec.js';
import { validate, CONFIG_SCHEMA } from '../../src/research/contracts.js';
const node=(nodeId:string,parentId:string|null=null,type:'hypothesis'|'direction'='hypothesis')=>({nodeId,parentId,type,depth:parentId?1:0,pruned:false,reviewed:true});
function projection(){return {run:{attemptsUsed:0,material:{candidates:[]},spec:{config:{search:{maxDepth:3,maxChildren:3,exploreEvery:3,shiftAfterNoGain:3,stopAfterNoGain:5,mode:'auto'}}}},nodes:[node('a',null,'direction'),node('b',null,'direction'),node('a1','a'),node('b1','b')],attempts:[],evaluations:[],decisions:[]} as any;}
test('PR7 bounded defaults and closed configuration',async()=>{const s=await resolveSpec(process.cwd(),{},{},{execution:'deferred'});assert.equal(s.config.search.exploreEvery,3);assert.equal(s.config.search.measurementConcurrency,1);assert.equal(s.config.search.shiftAfterNoGain,3);assert.equal(s.config.search.stopAfterNoGain,5);for(const value of [0,101])assert.throws(()=>validate(CONFIG_SCHEMA,{search:{exploreEvery:value}}));});
test('PR7 topology refuses missing, pruned ancestor, depth/child overflow and unmeasured refinement',()=>{const p=projection();validateNode(p,node('a2','a'));assert.throws(()=>validateNode(p,node('x','missing')),/Parent/);assert.throws(()=>validateNode(p,node('x','a1')),/measured/);p.nodes[0].pruned=true;assert.throws(()=>validateNode(p,node('x','a1')),/pruned/);p.nodes[0].pruned=false;p.nodes.push(node('a2','a'),node('a3','a'));assert.throws(()=>validateNode(p,node('a4','a')),/child/);p.nodes[1].depth=3;assert.throws(()=>validateNode(p,node('b2','b')),/depth/);});
test('PR7 actor selects explicit slot/kind/reason; third explores and absent-kind fallback is exact',()=>{const p=projection();let o=selectionOptions(p);assert.equal(o.slot,'exploit');assert.equal(o.eligible[0]!.kind,'explore');assert.equal(o.eligible[0]!.fallback,'eligible-exploit-absent');validateSelection(p,'a1',{...o.eligible[0]!,reason:'Test this direction'});assert.throws(()=>validateSelection(p,'a1',{...o.eligible[0]!,fallback:null,reason:'bad'}),/selection/);p.decisions.push({nodeId:'a',decision:'keep',status:'measured-keep'});o=selectionOptions(p);assert.deepEqual(o.eligible.map((e:any)=>e.nodeId),['a1']);p.run.attemptsUsed=2;o=selectionOptions(p);assert.equal(o.slot,'explore');assert.deepEqual(o.eligible.map((e:any)=>e.nodeId),['b1']);p.nodes[1].pruned=true;assert.equal(selectionOptions(p).eligible[0]!.fallback,'eligible-explore-absent');});
test('PR7 exact rational rankings min/max and deterministic ID ties, never rounded means',()=>{const e=(id:string,scores:string[])=>({id,state:'completed',validity:'valid',quality:{passed:true},definition:{kind:'agent-suite',tasks:[{id:'t'}],repeats:scores.length},invocations:scores.map((score,repeat)=>({condition:'candidate',taskId:'t',repeat,purpose:'candidate',score,valid:true}))}) as any;const values=[e('z',['0','0.000000001']),e('a',['0','0','0.000000001']),e('b',['0','0.000000001'])];assert.deepEqual(rankEvaluations(values,'maximize').map(e=>e.id),['b','z','a']);assert.deepEqual(rankEvaluations(values,'minimize').map(e=>e.id),['a','b','z']);});

test('PR7 no-gain follows serial decision order, not sibling reservation order; measured keep resets',()=>{
 const p=projection();for(const id of ['a1','b1']){p.attempts.push({id,nodeId:id,state:'completed'});p.evaluations.push({id:'e-'+id,attemptId:id,state:'completed',validity:'valid',invocations:[]});}
 p.decisions=[{nodeId:'b1',decision:'keep',status:'measured-keep',evidenceIds:['e-b1'],revision:1},{nodeId:'a1',decision:'discard',status:'applied',evidenceIds:['e-a1'],revision:2}];assert.equal(researchFacts(p).noGain,1);
 p.decisions.reverse();assert.equal(researchFacts(p).noGain,0);
});
test('PR7 three valid no-gains require a different direction, absent-direction fallback, keep reset and five stop',()=>{
 const p=projection();p.run.spec.config.search.maxChildren=10;
 const add=(n:number,status='applied')=>{const id='negative'+n;p.nodes.push(node(id,'a'));p.attempts.push({id,nodeId:id,state:'completed'});p.evaluations.push({id:'e'+n,attemptId:id,state:'completed',validity:'valid',invocations:[]});p.decisions.push({nodeId:id,decision:status==='measured-keep'?'keep':'discard',status,evidenceIds:['e'+n]});};
 add(1);add(2);add(3);assert.deepEqual(selectionOptions(p).eligible.map(n=>n.nodeId),['b1']);p.nodes[1].pruned=true;assert.match(selectionOptions(p).eligible[0]!.fallback!,/different-direction-absent/);
 add(4);add(5);assert.equal(selectionOptions(p).stopped,true);assert.throws(()=>validateSelection(p,'a1',{...selectionOptions(p).eligible[0]!,reason:'must stop'}),/convergence/);
 add(6,'measured-keep');assert.equal(researchFacts(p).noGain,0);assert.equal(selectionOptions(p).shiftRequired,false);assert.equal(selectionOptions(p).stopped,false);
});

test('PR7 repair measured root hypothesis refinements share exploitation and shift lineage',()=>{
 const p=projection();p.nodes=[node('root'),node('other')];p.attempts=[{id:'root',nodeId:'root',state:'completed'}];p.evaluations=[{id:'e-root',attemptId:'root',state:'completed',validity:'valid',invocations:[]}];p.decisions=[{nodeId:'root',decision:'keep',status:'measured-keep',evidenceIds:['e-root']}];p.run.attemptsUsed=1;
 assert.equal(validateNode(p,node('child','root')),1);p.nodes.push(node('child','root'));
 assert.deepEqual(selectionOptions(p).eligible,[{nodeId:'child',slot:'exploit',kind:'exploit',fallback:null}]);
 for(let i=1;i<=3;i++){const id='negative'+i;p.nodes.push(node(id,'root'));p.attempts.push({id,nodeId:id,state:'completed'});p.evaluations.push({id:'e-'+id,attemptId:id,state:'completed',validity:'valid',invocations:[]});p.decisions.push({nodeId:id,decision:'discard',status:'applied',evidenceIds:['e-'+id]});}
 assert.deepEqual(selectionOptions(p).eligible.map(e=>e.nodeId),['other']);p.nodes.find((n:any)=>n.nodeId==='other').pruned=true;
 assert.equal(selectionOptions(p).eligible[0]!.fallback,'different-direction-absent');
});
