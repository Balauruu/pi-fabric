import { createHash } from "node:crypto";
import { ArborError } from "../domain/errors.js";
import type { Sha256 } from "../domain/types.js";

function normalize(value: unknown): unknown {
  if (value === null || typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (!Number.isSafeInteger(value)) throw new ArborError("VALIDATION_FAILED", "Canonical JSON accepts safe integers only");
    return value;
  }
  if (Array.isArray(value)) return value.map(normalize);
  if (typeof value === "object") {
    const output: Record<string, unknown> = {};
    for (const key of Object.keys(value as Record<string, unknown>).sort()) {
      const item = (value as Record<string, unknown>)[key];
      if (item === undefined) continue;
      output[key] = normalize(item);
    }
    return output;
  }
  throw new ArborError("VALIDATION_FAILED", `Unsupported canonical JSON value: ${typeof value}`);
}

export function canonicalJson(value: unknown): string {
  return JSON.stringify(normalize(value));
}

export function sha256(value: string | Uint8Array): Sha256 {
  return createHash("sha256").update(value).digest("hex");
}

export function digestCanonical(value: unknown): Sha256 {
  return sha256(canonicalJson(value));
}

export function immutableClone<T>(value: T): T {
  return deepFreeze(structuredClone(value));
}

export function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const item of Object.values(value as Record<string, unknown>)) deepFreeze(item);
  }
  return value;
}
