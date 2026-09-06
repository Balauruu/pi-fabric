import { createHash, randomUUID } from "node:crypto";
import { readFile, mkdir, rename, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { CONFIG_DIR_NAME, getAgentDir, withFileMutationQueue, type ExtensionCommandContext } from "@earendil-works/pi-coding-agent";
import type { FabricComponentInfo } from "pi-fabric/protocol";
import { object } from "./contracts.js";

export const configurationPath = (cwd: string) => join(cwd, CONFIG_DIR_NAME, "fabric.json");
export async function readConfiguration(path: string): Promise<Record<string, unknown>> {
  try { return object(JSON.parse(await readFile(path, "utf8"))); }
  catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return {}; throw error; }
}
export function mergeArborEntry(config: Record<string, unknown>, stateDirectory: string): Record<string, unknown> {
  if (config.components !== undefined && !Array.isArray(config.components)) throw new Error("fabric.json components must be an array; no changes made");
  const entries = (config.components ?? []) as unknown[];
  const arbor = entries.map(object).filter(entry => entry.component === "arbor" || entry.id === "arbor");
  if (arbor.length > 1 || arbor.some(entry => entry.id !== "arbor" || entry.component !== "arbor")) throw new Error("Duplicate/conflicting Arbor component binding; resolve explicitly before setup");
  const prior = arbor[0];
  const entry = prior ? { ...prior, disabled: false, config: { ...object(prior.config ?? {}), stateDirectory: object(prior.config ?? {}).stateDirectory ?? stateDirectory } }
    : { id: "arbor", component: "arbor", disabled: false, config: { stateDirectory } };
  return { ...config, components: prior ? entries.map(value => value === prior ? entry : value) : [...entries, entry] };
}
export async function setupArbor(context: ExtensionCommandContext, profileDirectory = getAgentDir()): Promise<string> {
  if (!context.isProjectTrusted()) throw new Error("Trust this project before /arbor setup; no configuration changed");
  // Commands are the owning Pi UI surface, not a tool/child/CLI transport. Never
  // expose setup as an agent provider action. Research requires native self proof.
  const path = configurationPath(context.cwd);
  await withFileMutationQueue(path, async () => {
    const prior = await readConfiguration(path);
    const global = await readConfiguration(join(profileDirectory, "fabric.json"));
    const inherited = prior.components === undefined && global.components !== undefined ? { ...prior, components: global.components } : prior;
    const project = createHash("sha256").update(context.cwd).digest("hex").slice(0, 24);
    const next = mergeArborEntry(inherited, join(profileDirectory, "arbor", project, "v2"));
    if (JSON.stringify(prior) === JSON.stringify(next)) return;
    await mkdir(dirname(path), { recursive: true });
    const temporary = `${path}.${randomUUID()}.tmp`;
    await writeFile(temporary, `${JSON.stringify(next, null, 2)}\n`, { mode: 0o600 });
    await rename(temporary, path);
  });
  return `Configured one managed Arbor instance in ${path}. Run /reload, then /arbor doctor. No research started; unrelated host policy was not changed.`;
}
export async function doctorArbor(context: ExtensionCommandContext, installed: boolean, owner?: FabricComponentInfo, registrationError?: string, profileDirectory = getAgentDir()): Promise<Record<string, unknown>> {
  const trusted = context.isProjectTrusted();
  const global = await readConfiguration(join(profileDirectory, "fabric.json"));
  const project = trusted ? await readConfiguration(configurationPath(context.cwd)) : {};
  const config: Record<string, unknown> = { ...global, ...project, agents: { ...object(global.agents ?? {}), ...object(project.agents ?? {}) }, mesh: { ...object(global.mesh ?? {}), ...object(project.mesh ?? {}) }, schema: { ...object(global.schema ?? {}), ...object(project.schema ?? {}) } };
  const entries = Array.isArray(config.components) ? config.components.map(object).filter(entry => entry.component === "arbor") : [];
  const blockers: string[] = [];
  if (!installed) blockers.push(`Install/enable pi-fabric and reload${registrationError ? `: ${registrationError}` : ""}`);
  if (registrationError) blockers.push(`Component registration failed: ${registrationError}`);
  if (!trusted) blockers.push("Project is untrusted; setup and execution are blocked");
  if (entries.length !== 1) blockers.push("Run /arbor setup for exactly one configured instance (global-only configuration may require project setup)");
  if (entries.some(entry => entry.disabled === true)) blockers.push("Arbor is configured but disabled; /arbor setup enables its project entry");
  if (object(config.agents ?? {}).enabled === false) blockers.push("agents.enabled is false; enable native agents explicitly in Fabric settings");
  if (object(config.mesh ?? {}).enabled === false) blockers.push("mesh.enabled is false; project actors require a trusted mesh");
  if (object(config.schema ?? {}).mode === "enforce") blockers.push("Schema enforce does not support this native delegation path; Arbor will not change host policy");
  if (owner?.missing.length) blockers.push(`Missing exact requirements: ${owner.missing.join(", ")}. Enable the providing capability and reload.`);
  if (owner && owner.state !== "active") blockers.push(`Owner ${owner.state}: ${owner.error ?? owner.cleanupErrors?.join("; ") ?? "inspect components.status"}`);
  if (!owner) blockers.push("No active owner lifecycle observation; reload, then inspect components.status({id:'arbor.owner'}) for effective host diagnostics");
  return { installed, configured: entries.length === 1, enabled: entries.length === 1 && entries[0]!.disabled !== true,
    available: owner?.state === "active" ? "committed exact capabilities (not an inference test)" : "unavailable or unobserved", owner: owner ?? null,
    tested: "See docs/pr2-managed-owner-evidence.md and docs/pr3-interface-evidence.md and docs/pr4-evaluator-evidence.md; doctor performs no inference", blockers,
    policy: "Global/project files are configured facts; runtime/env overrides and effect approvals remain Fabric-authoritative.",
    research: "PR3 observations and PR4 exact-material command/agent-suite/provider evaluation with explicit evaluation resume; scored incumbent/dirty capture/research search/source apply/partial-material continuation remain PR5+", cli: "read-only", web: "read-only" };
}
