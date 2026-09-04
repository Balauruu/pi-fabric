import { spawn } from "node:child_process";
import { ArborError } from "../domain/errors.js";

export interface ProcessResultV1 {
  version: 1;
  pid?: number;
  argv: readonly string[];
  exitCode: number;
  signal: NodeJS.Signals | null;
  stdout: Buffer;
  stderr: Buffer;
  timedOut: boolean;
  cancelled: boolean;
  oversized: boolean;
}

export interface RunProcessOptionsV1 {
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  input?: Uint8Array | string;
  timeoutMs?: number;
  maxOutputBytes?: number;
  signal?: AbortSignal;
  detached?: boolean;
  killTree?: (pid: number) => void | Promise<void>;
}

/** Executes an argv directly, with bounded capture and whole-tree termination hooks. */
export async function runProcess(argv: readonly string[], options: RunProcessOptionsV1 = {}): Promise<ProcessResultV1> {
  if (argv.length === 0 || !argv[0]) throw new ArborError("VALIDATION_FAILED", "Process argv must contain an executable");
  const max = options.maxOutputBytes ?? 1_048_576;
  if (!Number.isSafeInteger(max) || max < 1 || max > 16_777_216) throw new ArborError("VALIDATION_FAILED", "Invalid process output bound");
  if (options.signal?.aborted) throw new ArborError("INDETERMINATE", "Process cancelled before launch");

  return new Promise<ProcessResultV1>((resolve, reject) => {
    const child = spawn(argv[0]!, argv.slice(1), {
      cwd: options.cwd,
      env: options.env,
      detached: options.detached ?? false,
      stdio: [options.input === undefined ? "ignore" : "pipe", "pipe", "pipe"],
      windowsHide: true,
    });
    const stdout: Buffer[] = [];
    const stderr: Buffer[] = [];
    let captured = 0;
    let timedOut = false;
    let cancelled = false;
    let oversized = false;
    let settled = false;
    let terminating = false;

    const terminate = async (): Promise<void> => {
      if (terminating || child.pid === undefined) return;
      terminating = true;
      try {
        if (options.killTree) await options.killTree(child.pid);
        else if (options.detached) process.kill(-child.pid, "SIGKILL");
        else child.kill("SIGKILL");
      } catch {
        try { child.kill("SIGKILL"); } catch { /* already gone */ }
      }
    };
    const collect = (target: Buffer[], chunk: Buffer): void => {
      if (captured >= max) { oversized = true; void terminate(); return; }
      const remaining = max - captured;
      const kept = chunk.byteLength > remaining ? chunk.subarray(0, remaining) : chunk;
      target.push(Buffer.from(kept));
      captured += kept.byteLength;
      if (kept.byteLength !== chunk.byteLength) { oversized = true; void terminate(); }
    };
    child.stdout!.on("data", (chunk: Buffer) => collect(stdout, chunk));
    child.stderr!.on("data", (chunk: Buffer) => collect(stderr, chunk));
    child.once("error", (error) => {
      if (!settled) { settled = true; reject(error); }
    });
    const timeout = options.timeoutMs === undefined ? undefined : setTimeout(() => {
      timedOut = true;
      void terminate();
    }, options.timeoutMs);
    timeout?.unref();
    const onAbort = (): void => { cancelled = true; void terminate(); };
    options.signal?.addEventListener("abort", onAbort, { once: true });
    child.once("close", (exitCode, signal) => {
      if (settled) return;
      settled = true;
      if (timeout) clearTimeout(timeout);
      options.signal?.removeEventListener("abort", onAbort);
      resolve({
        version: 1,
        pid: child.pid!,
        argv: [...argv],
        exitCode: exitCode ?? (signal ? 128 : 1),
        signal,
        stdout: Buffer.concat(stdout),
        stderr: Buffer.concat(stderr),
        timedOut,
        cancelled,
        oversized,
      });
    });
    if (options.input !== undefined) {
      child.stdin!.end(options.input);
    }
  });
}

export function requireSuccessfulProcess(result: ProcessResultV1, label: string): ProcessResultV1 {
  if (result.timedOut || result.cancelled || result.oversized || result.exitCode !== 0) {
    throw new ArborError("INDETERMINATE", `${label} failed`, {
      exitCode: result.exitCode,
      timedOut: result.timedOut,
      cancelled: result.cancelled,
      oversized: result.oversized,
      stderr: result.stderr.toString("utf8").slice(0, 4096),
    });
  }
  return result;
}
