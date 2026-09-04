export type ArborErrorCode =
  | "VALIDATION_FAILED"
  | "RUN_NOT_FOUND"
  | "RUN_ALREADY_EXISTS"
  | "STALE_REVISION"
  | "STALE_FENCE"
  | "LEASE_CONFLICT"
  | "LEASE_EXPIRED"
  | "IDEMPOTENCY_KEY_REUSED"
  | "ILLEGAL_TRANSITION"
  | "BUDGET_EXHAUSTED"
  | "UNKNOWN_ENTITY"
  | "DUPLICATE_ENTITY"
  | "INTENT_NOT_AT_YIELD"
  | "INTENT_STALE"
  | "EVIDENCE_INVALID"
  | "ARTIFACT_INVALID"
  | "REPORT_DEPENDENCY_RETAINED"
  | "REPORT_CONFLICT"
  | "READ_ONLY_NEWER_SCHEMA"
  | "STORE_CORRUPT"
  | "MIGRATION_FAILED"
  | "WRITE_CONFINEMENT_UNAVAILABLE"
  | "UPSTREAM_CERTIFICATION_REQUIRED"
  | "COMPATIBILITY_CERTIFICATION_REQUIRED"
  | "HELD_OUT_ISOLATION_REQUIRED"
  | "INDETERMINATE"
  | "QUARANTINED";

export class ArborError extends Error {
  readonly code: ArborErrorCode;
  readonly details: Readonly<Record<string, unknown>>;

  constructor(code: ArborErrorCode, message: string, details: Record<string, unknown> = {}) {
    super(message);
    this.name = "ArborError";
    this.code = code;
    this.details = Object.freeze({ ...details });
  }
}

export function fail(code: ArborErrorCode, message: string, details?: Record<string, unknown>): never {
  throw new ArborError(code, message, details);
}
