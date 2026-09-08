import { readFile } from 'node:fs/promises';
/** Inference fixtures choose research policy only. Product owns all operations. */
export function pr8Proposal(d:any){
 const p:any={version:2,runId:d.runId,materialId:d.materialId,epoch:d.epoch,revision:d.revision,commandId:d.commandId,expectedEvidence:[],estimatedBudget:{attempts:0,evaluatorCalls:0},rationale:'Choose the next fixed hypothesis from current owner evidence and saved interaction mode'};
 const direction=d.nodes.find((n:any)=>n.type==='direction'),latest=d.attempts.at(-1),fact=d.recentFacts.at(-1),e=d.evidence.find((e:any)=>e.id===fact?.evaluationId),decided=d.decisions.find((v:any)=>v.decision==='keep'&&e&&v.evidenceIds.includes(e.id));
 if(!direction){p.kind='propose';p.payload={nodeId:'direction',type:'direction',parentId:null,title:'One exact measured improvement',rationale:'Compare fixed local behavior',sourceRefs:[]};}
 else if(['direction','collaborative'].includes(d.interactionMode)&&!direction.reviewed){p.kind='decide';p.payload={decisionId:'pr8-choice',nodeId:'direction',decision:'request_review',evidenceIds:[]};}
 else if(!d.nodes.some((n:any)=>n.type==='hypothesis')){p.kind='propose';p.payload={nodeId:'h1',type:'hypothesis',parentId:'direction',title:'Improve score once',rationale:'PR6_LEVEL=1; edit only the assigned subject path, same hypothesis on continuation',sourceRefs:[]};}
 else if(!latest){p.kind='dispatch';p.payload={nodeId:'h1',attemptId:'h1',selection:{...d.selection.eligible.find((v:any)=>v.nodeId==='h1'),reason:'Test the single eligible fixed hypothesis'}};p.estimatedBudget.attempts=1;}
 else if(latest.state!=='completed'){p.kind='decide';p.payload={decisionId:'partial-stop-'+latest.id,nodeId:null,decision:'stop',evidenceIds:latest.evidenceId?[latest.evidenceId]:[]};p.expectedEvidence=latest.evidenceId?[latest.evidenceId]:[];}
 else if(!e){p.kind='evaluate';p.payload={attemptId:latest.id,evaluationId:'eval-'+latest.id};p.estimatedBudget.evaluatorCalls=d.budgets.evaluationCapacity;}
 else if(d.interactionMode==='review'&&!d.decisions.some((v:any)=>v.status==='approved-choice-only'&&v.evidenceIds.includes(e.id))){p.kind='decide';p.payload={decisionId:'pr8-choice',nodeId:'h1',decision:'request_review',evidenceIds:[e.id]};p.expectedEvidence=[e.id];}
 else if(!decided){p.kind='decide';p.payload={decisionId:'pr8-keep',nodeId:'h1',decision:'keep',evidenceIds:[e.id]};p.expectedEvidence=[e.id];}
 else if(!d.ancestors.some((l:any)=>l.evidenceIds.includes(e.id))){p.kind='distill';p.payload={lessonId:'pr8-lesson',nodeId:'h1',insight:'Exact local candidate improved the independently evaluated current incumbent',limitations:'Deterministic fixture only, not scientific quality',evidenceIds:[e.id]};p.expectedEvidence=[e.id];}
 else {p.kind='decide';p.payload={decisionId:'pr8-done',nodeId:null,decision:'stop',evidenceIds:[]};}
 return p;
}
export async function pr8Provider(){return (await readFile('tests/fixtures/pr2-fake-provider.ts','utf8')).replace('export default function fake','const __name=(fn:any)=>fn;\n'+pr8Proposal.toString()+'\nexport default function fake').replace('        if (data.research) {',`        if(data.research && data.objective.description.startsWith('PR8')){const p=pr8Proposal(data);trace('research.proposal',p);return stream(model,[{type:'text',text:JSON.stringify({action:'silent',data:p})}],options);}\n        if (data.research) {`);}
