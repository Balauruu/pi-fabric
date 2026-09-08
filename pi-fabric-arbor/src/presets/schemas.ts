import {array, closed, enumeration, str, type Schema} from '../research/schema.js';
const model={...str(),pattern:'^[^/]+/.+$'};
const environmentSchema=closed({node:str(4096),coordinatorModel:model,executorModel:model,subjectModel:model});
const preparedSchema=closed({root:str(4096),files:array(str(4096),32,1),argv:array(str(8192),32,1),checks:array(array(str(8192),32,1),16),unit:str(64),revision:{...str(40),pattern:'^[a-f0-9]{40}$'},sourceUrl:str(4096)});
export const SCAFFOLD_SCHEMA=closed({pack:enumeration('code','agent','recipe','upstream-command'),destination:str(4096),environment:environmentSchema,heldOut:{type:'boolean'},prepared:preparedSchema},['pack','destination','environment','heldOut']);
export function scaffoldResultSchema(config:Schema){return closed({status:enumeration('unvalidated'),destination:str(4096),preparationId:str(64),start:closed({runId:str(128),overrides:config})});}
