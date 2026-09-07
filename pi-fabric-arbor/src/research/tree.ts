import type { EvaluationRecord } from '../evaluators/contracts.js';
import { units } from '../evaluators/measurement.js';
import { researchFacts } from './policy.js';
export interface TreeNode { nodeId:string; parentId:string|null; type:'direction'|'hypothesis'; depth:number; pruned:boolean; reviewed:boolean }
export interface Selection { nodeId:string; slot:'explore'|'exploit'; kind:'explore'|'exploit'; fallback:string|null; reason:string }
type Projection=Record<string,any>;
export function ancestry(nodes:TreeNode[], id:string):TreeNode[]{
 const path:TreeNode[]=[], seen=new Set<string>();let next:string|null=id;
 while(next){if(seen.has(next))throw new Error('Cyclic tree');seen.add(next);const n=nodes.find(n=>n.nodeId===next);if(!n)throw new Error('Parent missing');path.push(n);next=n.parentId;}
 return path;
}
export function validateNode(p:Projection, n:Pick<TreeNode,'nodeId'|'parentId'|'type'>):number {
 const nodes=p.nodes as TreeNode[],s=p.run.spec.config.search;
 if(nodes.some(x=>x.nodeId===n.nodeId))throw new Error('Node ID already exists');
 const path=n.parentId?ancestry(nodes,n.parentId):[],parent=path[0];
 if(path.some(n=>n.pruned))throw new Error('Parent ancestry is pruned');
 if(parent?.type==='hypothesis'){
  const a=p.attempts.find((a:any)=>a.nodeId===parent.nodeId);
  if(n.type!=='hypothesis'||!a||!p.evaluations.some((e:any)=>e.attemptId===a.id&&e.state==='completed'&&e.validity==='valid'))throw new Error('Hypothesis refinement requires measured parent');
 }
 const depth=parent?parent.depth+1:0;
 if(depth>s.maxDepth)throw new Error('Topology depth bound exceeded');
 if(nodes.filter(x=>x.parentId===n.parentId).length>=s.maxChildren)throw new Error('Topology child bound exceeded');
 if(['direction','collaborative'].includes(s.mode)&&path.some(n=>n.type==='direction'&&!n.reviewed))throw new Error('Direction expansion requires actual owning-Pi research review');
 return depth;
}
/** Facts delimit the slot, never choose a hypothesis or judge prose. */
export function selectionOptions(p:Projection) {
 const nodes=p.nodes as TreeNode[],s=p.run.spec.config.search,facts=researchFacts(p);
 const slot:'explore'|'exploit'=(p.run.attemptsUsed+1)%(s.exploreEvery??3)===0?'explore':'exploit';
 // Root hypotheses and all their refinements are one lineage even without a direction node.
 const direction=(id:string)=>{const path=ancestry(nodes,id);return (path.filter(n=>n.type==='direction').at(-1)??path.at(-1))!.nodeId;};
 const last=facts.lastComparedNodeId;
 let eligible=nodes.filter(n=>n.type==='hypothesis'&&!nodes.some(c=>c.parentId===n.nodeId)&&!p.attempts.some((a:any)=>a.nodeId===n.nodeId)&&ancestry(nodes,n.nodeId).every(a=>!a.pruned&&(!['direction','collaborative'].includes(s.mode)||a.type!=='direction'||a.reviewed)));
 let shiftFallback=false;
 if(facts.shiftRequired&&last){const different=eligible.filter(n=>direction(n.nodeId)!==direction(last));if(different.length)eligible=different;else shiftFallback=true;}
 const kind=(n:TreeNode):'explore'|'exploit'=>p.decisions.some((d:any)=>d.status==='measured-keep'&&direction(d.nodeId)===direction(n.nodeId))?'exploit':'explore';
 const preferred=eligible.filter(n=>kind(n)===slot),fallback=preferred.length?null:`eligible-${slot}-absent`;
 return {slot,shiftRequired:facts.shiftRequired,stopped:facts.noGain>=s.stopAfterNoGain,eligible:(preferred.length?preferred:eligible).map(n=>({nodeId:n.nodeId,slot,kind:kind(n),fallback:shiftFallback?['different-direction-absent',fallback].filter(Boolean).join(';'):fallback}))};
}
export function validateSelection(p:Projection,nodeId:string,selection:Selection|undefined):Selection {
 const options=selectionOptions(p),expected=options.eligible.find(e=>e.nodeId===nodeId);
 if(options.stopped)throw new Error('Search convergence stops selection');
 if(!selection||!expected||selection.nodeId!==nodeId||selection.slot!==expected.slot||selection.kind!==expected.kind||selection.fallback!==expected.fallback||!selection.reason?.trim())throw new Error('Explicit actor selection kind/slot/reason/fallback does not match eligible frontier');
 return structuredClone(selection);
}
/** Exact task/repeat ratios; presentation means never rank candidates. */
export function rankEvaluations(evaluations:EvaluationRecord[],direction:'maximize'|'minimize'):EvaluationRecord[]{
 const ratio=(e:EvaluationRecord)=>{let sum=0n,count=0n;for(const t of e.definition.tasks){const values:bigint[]=[];for(let r=0;r<e.definition.repeats;r++){const i=e.invocations.filter(i=>i.condition==='candidate'&&i.taskId===t.id&&i.repeat===r&&i.purpose!=='judge').at(-1);if(!i?.valid||i.score===null)return null;values.push(units(i.score));}values.sort((a,b)=>a<b?-1:a>b?1:0);if(e.definition.kind==='command'){sum+=values[Math.floor(values.length/2)]!;count++;}else{sum+=values.reduce((a,b)=>a+b,0n);count+=BigInt(values.length);}}return count?{sum,count}:null;};
 return evaluations.filter(e=>e.state==='completed'&&e.validity==='valid'&&e.quality.passed).map(e=>({e,r:ratio(e)})).filter(x=>x.r!==null).sort((a,b)=>{const d=(a.r!.sum*b.r!.count-b.r!.sum*a.r!.count)*(direction==='maximize'?-1n:1n);return d<0n?-1:d>0n?1:a.e.id<b.e.id?-1:a.e.id>b.e.id?1:0;}).map(x=>x.e);
}
