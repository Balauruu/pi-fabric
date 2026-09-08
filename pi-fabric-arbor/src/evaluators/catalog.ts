import { readFileSync } from "node:fs";
import { readFile, realpath } from "node:fs/promises";
import { isAbsolute, relative, sep } from "node:path";
import { createHash } from "node:crypto";
import type { FabricActionDescriptor, FabricCommittedCapabilityView } from "pi-fabric/protocol";
import { array, canonical, closed, digest, enumeration, integer, nullable, str, validate, type Schema } from "../research/contracts.js";
import { bindRequest } from "./trust.js";
import type { NativeEvidence } from "./contracts.js";
export interface CatalogEntry { ref: string; descriptorHash: string }
export function readCatalog(path: string): CatalogEntry[] {
  let value: unknown; try { value = JSON.parse(readFileSync(path, "utf8")); } catch (e) { if ((e as NodeJS.ErrnoException).code === "ENOENT") return []; throw e; }
  validate(array(closed({ ref: { ...str(), pattern: "^[a-zA-Z][a-zA-Z0-9_-]*\\.[a-zA-Z][a-zA-Z0-9_-]*$" }, descriptorHash: { ...str(64), pattern: "^[a-f0-9]{64}$" } }), 8), value);
  const entries = value as CatalogEntry[];
  if (new Set(entries.map(e => e.ref)).size !== entries.length || entries.some(e => /^(?:arbor|agents|pi|fabric|components|schema|mesh|state|memory|compact)\./u.test(e.ref))) throw new Error("Evaluator catalog requires distinct external exact actions, not runtime controls");
  return entries;
}
export function providerInputSchema(): Schema { return closed({ snapshot: closed({ id: str(), directory: str(4096), oid: str(64) }), specification: str(65536), outputDirectory: str(4096), evaluationId: str(), invocationId: str() }); }
export function providerOutputSchema(): Schema { return closed({ evaluationId: str(), invocationId: str(), snapshotId: str(), status: enumeration("completed", "failed", "stopped", "timed_out"), measurement: nullable(str(80)), checks: array({ type: "boolean" }, 16), artifacts: array(closed({ path: str(4096), digest: str(64) }), 16), native: closed({ id: str(), cwd: str(4096), text: { type: "string", maxLength: 65536 }, error: nullable(str(4096)), exitCode: nullable(integer(255)), deadline: { type: "boolean" } }) }); }
/** The configured hash is obtained from tools.catalog after inspecting the exact
 * input/output/risk/effect descriptor. The committed view, NOT later discovery,
 * is the authority. Missing optional actions stay missing in this generation. */
export class EvaluatorCatalog {
  readonly id: string;
  constructor(readonly entries: readonly CatalogEntry[], readonly view: FabricCommittedCapabilityView, readonly call: (ref: string, args: Record<string, unknown>) => Promise<unknown>, readonly describe?: (ref: string) => Promise<FabricActionDescriptor | undefined>) { this.entries = structuredClone(entries); this.view = structuredClone(view); this.id = digest(this.entries); }
  binding(ref: string): string {
    const entry = this.entries.find(e => e.ref === ref); if (!entry) throw new Error("Selected evaluator is not in the definition-time catalog; quiescent maintenance and re-registration required");
    const binding = this.view.bindings[ref]; if (!binding) throw new Error("Optional evaluator missing from committed view; built-ins remain available");
    if (binding.descriptorHash !== entry.descriptorHash) throw new Error("Effective evaluator descriptor mismatch; inspect schemas/risk/effects and explicitly rebind catalog");
    return canonical(binding);
  }
  async evaluate(ref: string, args: Record<string, unknown>, beforeDispatch?: () => Promise<void>): Promise<{ native: NativeEvidence; measurement: string | null }> {
    this.binding(ref); validate(providerInputSchema(), args);
    const request = bindRequest(args), expected = request.expected;
    const descriptor = await request.accept(Promise.resolve(this.describe?.(ref)));
    if (!descriptor || canonical(descriptor.inputSchema) !== canonical(providerInputSchema()) || canonical(descriptor.outputSchema) !== canonical(providerOutputSchema()) || descriptor.risk !== "execute" || descriptor.effect?.kind !== "emission" || descriptor.effect.ordering !== "ordered") throw new Error("Effective evaluator input/output/risk/effect descriptor incompatible");
    // Descriptor discovery can await arbitrarily. Admit at the actual effect boundary.
    await beforeDispatch?.(); request.check();
    const value = await request.accept(this.call(ref, request.args)); validate(providerOutputSchema(), value);
    const r = value as any, snapshot = expected.snapshot as any;
    if (r.evaluationId !== expected.evaluationId || r.invocationId !== expected.invocationId || r.snapshotId !== snapshot.id || r.native.cwd !== snapshot.directory) throw new Error("Provider result provenance mismatch");
    for (const artifact of r.artifacts) {
      const root = await request.accept(realpath(String(expected.outputDirectory))), path = await request.accept(realpath(artifact.path)), rel = relative(root, path);
      if (!rel || rel === ".." || rel.startsWith(`..${sep}`) || isAbsolute(rel)) throw new Error("Provider artifact outside evaluation output directory");
      const bytes = await readFile(path); request.check(); if (bytes.length > 1048576 || createHash("sha256").update(bytes).digest("hex") !== artifact.digest) throw new Error("Provider artifact identity mismatch");
    }
    request.check();
    return { native: { ...r.native, status: r.status, checks: r.checks, artifacts: r.artifacts, usage: null }, measurement: r.measurement };
  }
}
