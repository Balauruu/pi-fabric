import { readFile } from "node:fs/promises";
import { CONFIG_SCHEMA, array, closed, id, str, validate } from "../research/contracts.js";
/** Data defaults only. No scanner, registration, execution or store ownership. */
export async function loadPreset(path: string): Promise<{ id: string; defaults: Record<string, unknown> }> {
  const text = await readFile(path, "utf8"); if (text.length > 65536) throw new Error("Preset exceeds bound");
  const properties = CONFIG_SCHEMA.properties!;
  const schema = closed({ id, materialKind: properties.material!.properties!.kind!, objectiveDefaults: properties.objective!, evaluator: properties.evaluator!, searchDefaults: properties.search!, instructions: str(8192), sourceRefs: array(str(4096)) }, ["id", "materialKind", "objectiveDefaults", "evaluator", "searchDefaults"]);
  const p = JSON.parse(text); validate(schema, p);
  // Instructions are data, not operational bootstrap authority. Preserve source
  // provenance in the resolved defaults; roles never load a candidate preset.
  return { id: p.id, defaults: { material: { kind: p.materialKind }, objective: p.objectiveDefaults, evaluator: p.evaluator, search: p.searchDefaults, sourceRefs: [...(p.sourceRefs ?? []), `preset:${p.id}${p.instructions ? `:${p.instructions}` : ""}`] } };
}
