import { canonical } from "../research/contracts.js";

export class EvaluationBindingError extends Error {}

/** Detached private facts: never retain provider-owned request/reply aliases
 * across an await. Freezing a shallow clone does not protect nested bindings. */
export function immutableCopy<T>(value: T): T {
  const copy = structuredClone(value);
  const freeze = (v: unknown): void => {
    if (v && typeof v === "object") { for (const child of Object.values(v)) freeze(child); Object.freeze(v); }
  };
  freeze(copy); return copy;
}
export function bindRequest<T>(input: T) {
  const expected = immutableCopy(input), fingerprint = canonical(expected);
  // The callee gets its own deep copy. Detect mutation, including nested fields,
  // rather than letting it rewrite either our expected facts or domain records.
  const args = structuredClone(expected);
  const check = (): void => {
    if (canonical(input) !== fingerprint || canonical(args) !== fingerprint) throw new EvaluationBindingError("Evaluation request mutated across trust boundary");
  };
  const accept = async <R>(pending: Promise<R>): Promise<R> => {
    try { const result = immutableCopy(await pending); check(); return result; }
    catch (error) { check(); throw error; }
  };
  return { expected, args, check, accept };
}
