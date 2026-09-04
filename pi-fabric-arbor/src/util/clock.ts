import type { CanonicalTimestamp } from "../domain/types.js";

export interface Clock {
  now(): CanonicalTimestamp;
}

export class SystemClock implements Clock {
  now(): CanonicalTimestamp {
    return new Date().toISOString();
  }
}

export class ManualClock implements Clock {
  #milliseconds: number;

  constructor(initial = "2026-01-01T00:00:00.000Z") {
    this.#milliseconds = Date.parse(initial);
  }

  now(): CanonicalTimestamp {
    return new Date(this.#milliseconds).toISOString();
  }

  advance(milliseconds: number): void {
    if (!Number.isSafeInteger(milliseconds) || milliseconds < 0) throw new RangeError("milliseconds must be a nonnegative safe integer");
    this.#milliseconds += milliseconds;
  }
}

export interface IdFactory {
  next(prefix: string): string;
}

export class DeterministicIdFactory implements IdFactory {
  #counter = 0;

  next(prefix: string): string {
    this.#counter += 1;
    return `${prefix}_${this.#counter.toString(36).padStart(6, "0")}`;
  }
}

export class RandomIdFactory implements IdFactory {
  next(prefix: string): string {
    const bytes = crypto.getRandomValues(new Uint8Array(12));
    const suffix = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
    return `${prefix}_${suffix}`;
  }
}
