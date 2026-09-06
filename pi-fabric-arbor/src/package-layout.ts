import { dirname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

export const ARBOR_PACKAGE_VERSION = "0.1.0" as const;
export const ARBOR_SOURCE_SENTINEL = "pr1-source-a" as const;

export const ARBOR_PACKAGED_ASSETS = Object.freeze({
  publicSkill: "skills/fabric-arbor/SKILL.md",
  coordinatorRole: "skills/fabric-arbor/roles/coordinator.md",
  executorRole: "skills/fabric-arbor/roles/executor.md",
  literatureRole: "skills/fabric-arbor/roles/literature.md",
  researchStrategy: "skills/fabric-arbor/references/research-strategy.md",
  evidenceInterpretation: "skills/fabric-arbor/references/evidence-interpretation.md",
  actionsReference: "skills/fabric-arbor/references/actions.md",
  webIndex: "web/read-only/index.html",
  webScript: "web/read-only/app.js",
  webStyles: "web/read-only/app.css",
} as const);

export type ArborPackagedAssetId = keyof typeof ARBOR_PACKAGED_ASSETS;

export function arborPackageRoot(): string {
  return resolve(dirname(fileURLToPath(import.meta.url)), "..");
}

export function resolveArborPackagedAsset(id: ArborPackagedAssetId): string {
  const root = arborPackageRoot();
  const path = resolve(root, ARBOR_PACKAGED_ASSETS[id]);
  if (!path.startsWith(`${root}${sep}`)) throw new Error(`Packaged Arbor asset escaped package root: ${id}`);
  return path;
}

export interface ArborAvailability {
  version: typeof ARBOR_PACKAGE_VERSION;
  sourceSentinel: string;
  extension: "source-loaded";
  cli: "read-only";
  web: "read-only-assets";
  research: "transactional-research-observation-only";
  component: "managed-definition; setup-and-reload-to-enable";
}

export function getArborAvailability(): ArborAvailability {
  return Object.freeze({
    version: ARBOR_PACKAGE_VERSION,
    sourceSentinel: ARBOR_SOURCE_SENTINEL,
    extension: "source-loaded",
    cli: "read-only",
    web: "read-only-assets",
    research: "transactional-research-observation-only",
    component: "managed-definition; setup-and-reload-to-enable",
  });
}
