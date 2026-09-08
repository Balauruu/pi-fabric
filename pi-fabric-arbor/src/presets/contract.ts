import { readFile } from "node:fs/promises";
import { CONFIG_SCHEMA, array, closed, id, str, validate, digest } from "../research/contracts.js";
/** Public closed data contract. Presets never own execution or operational roles. */
export function presetSchema() {
  const properties = CONFIG_SCHEMA.properties!;
  return closed({ id, materialKind: properties.material!.properties!.kind!, objectiveDefaults: properties.objective!, evaluator: properties.evaluator!, searchDefaults: properties.search!, groundingDefaults: properties.grounding!, limitDefaults: properties.limits!, instructions: str(8192), sourceRefs: array(str(4096), 29) }, ["id", "materialKind", "objectiveDefaults", "evaluator", "searchDefaults"]);
}
export async function loadPreset(path: string): Promise<{ id: string; identity: string; defaults: Record<string, unknown> }> {
  const text = await readFile(path, "utf8"); if (Buffer.byteLength(text) > 65536) throw new Error("Preset exceeds bound");
  const p = JSON.parse(text); validate(presetSchema(), p);
  // Instructions are provenance data, never operational bootstrap authority.
  return { id: p.id, identity: digest(p), defaults: { material: { kind: p.materialKind }, objective: p.objectiveDefaults, evaluator: p.evaluator, search: p.searchDefaults, ...(p.groundingDefaults ? {grounding:p.groundingDefaults} : {}), ...(p.limitDefaults ? {limits:p.limitDefaults} : {}), sourceRefs: [...(p.sourceRefs ?? []), `preset:${p.id}`, `preset-sha256:${digest(p)}`, ...(p.instructions ? [`preset-instructions-sha256:${digest(p.instructions)}`] : [])] } };
}
