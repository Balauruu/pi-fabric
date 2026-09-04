import { existsSync, readFileSync, realpathSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { ArborError } from "../domain/errors.js";

/** Every admitted release has its own complete B0/B1 evidence matrix. */
export const CERTIFIED_PI_FABRIC_VERSIONS_V1 = Object.freeze(["0.76.2", "0.77.0"] as const);
export type CertifiedPiFabricVersionV1 = typeof CERTIFIED_PI_FABRIC_VERSIONS_V1[number];
export const PI_FABRIC_PEER_RANGE_V1 = "0.76.2 || 0.77.0" as const;

export function isCertifiedPiFabricVersionV1(value: unknown): value is CertifiedPiFabricVersionV1 {
  return typeof value === "string" && (CERTIFIED_PI_FABRIC_VERSIONS_V1 as readonly string[]).includes(value);
}

export function assertCertifiedPiFabricVersionV1(value: unknown): CertifiedPiFabricVersionV1 {
  if (!isCertifiedPiFabricVersionV1(value)) throw new ArborError("COMPATIBILITY_CERTIFICATION_REQUIRED", `pi-fabric@${String(value)} has no complete B0/B1 matrix`, { certifiedVersions: [...CERTIFIED_PI_FABRIC_VERSIONS_V1] });
  return value;
}

export function readCertifiedPiFabricVersionV1(packageRoot: string): CertifiedPiFabricVersionV1 {
  const manifest = JSON.parse(readFileSync(join(realpathSync(packageRoot), "package.json"), "utf8")) as { name?: unknown; version?: unknown };
  if (manifest.name !== "pi-fabric") throw new ArborError("EVIDENCE_INVALID", "Installed package identity is not pi-fabric", { name: manifest.name });
  return assertCertifiedPiFabricVersionV1(manifest.version);
}

export function piFabricVersionIdV1(version: CertifiedPiFabricVersionV1): string {
  return version.replace(/\./gu, "_");
}

export function piFabricCertificationRootV1(certificationRoot: string, version: CertifiedPiFabricVersionV1): string {
  return join(resolve(certificationRoot), "upstream", "pi-fabric", version);
}

export function projectRelativePathV1(projectRoot: string, target: string): string {
  const value = relative(resolve(projectRoot), resolve(target)).split(sep).join("/");
  return value.length === 0 ? "." : value;
}

/** Finds the lock that owns node_modules/pi-fabric and proves it pins the selected exact release. */
export function findPiFabricPackageLockV1(packageRoot: string): string {
  const root = realpathSync(packageRoot); const version = readCertifiedPiFabricVersionV1(root); let cursor = dirname(root);
  while (true) {
    const candidate = join(cursor, "package-lock.json");
    if (existsSync(candidate)) {
      const lock = JSON.parse(readFileSync(candidate, "utf8")) as { packages?: Record<string, { name?: unknown; version?: unknown }> };
      const entry = lock.packages?.["node_modules/pi-fabric"];
      if (entry?.version === version) return candidate;
    }
    const parent = dirname(cursor); if (parent === cursor) break; cursor = parent;
  }
  throw new ArborError("EVIDENCE_INVALID", `No owning package-lock pins pi-fabric@${version}`, { packageRoot: root });
}
