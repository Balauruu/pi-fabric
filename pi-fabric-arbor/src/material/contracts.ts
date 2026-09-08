import { array, closed, id, integer, nullable, str, type Schema } from "../research/contracts.js";
import type { Candidate, Capture } from "./Workspace.js";
export interface MaterialState {
  capture: Capture; incumbent: string; baselineEvaluation: string | null; candidates: Candidate[];
  pending: { commandId: string; decisionId: string; evaluationId: string; expected: string; target: string; revision: number } | null;
}
export function materialSchema(): Schema {
  const paths = array(str(4096), 4096), oid = str(64);
  return closed({ capture: closed({ id, root: str(4096), mutablePaths: paths, evaluationInputs: paths, selectedUntracked: paths, repository: str(4096), baseline: oid, originalOid: nullable(oid), evaluationInputId: str(64), files: paths }), incumbent: oid, baselineEvaluation: nullable(id), candidates: array(closed({ id, directory: str(4096), parent: oid, oid: nullable(oid) }), 100), pending: nullable(closed({ commandId: id, decisionId: id, evaluationId: id, expected: oid, target: oid, revision: integer() })) });
}
