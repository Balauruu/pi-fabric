import { spawn } from "node:child_process";
import { nativeSuccess, type EvaluationRecord, type NativeEvidence } from "./contracts.js";

// Exact fixed-scale metric arithmetic only; no inference or generic statistics engine.
export function units(value: string): bigint {
  if (!/^-?(?:0|[1-9][0-9]{0,26})(?:\.[0-9]{1,9})?$/u.test(value)) throw new Error("Expected bounded exact decimal (at most nine places)");
  const negative = value.startsWith("-"), [whole, fraction = ""] = (negative ? value.slice(1) : value).split(".");
  return (negative ? -1n : 1n) * BigInt(whole! + fraction.padEnd(9, "0"));
}
export function decimal(n: bigint): string { const sign = n < 0 ? "-" : "", digits = (n < 0 ? -n : n).toString().padStart(10, "0"); const fraction = digits.slice(-9).replace(/0+$/u, ""); return sign + digits.slice(0, -9) + (fraction ? `.${fraction}` : ""); }
export function parseMetric(text: string, unit: string): string {
  const lines = text.split(/\r?\n/u).filter(line => line.startsWith("ARBOR_METRIC "));
  if (lines.length !== 1) throw new Error("Missing or ambiguous ARBOR_METRIC output");
  const match = /^ARBOR_METRIC (-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?) (\S+)$/u.exec(lines[0]!);
  if (!match || match[2] !== unit) throw new Error("Metric syntax/unit mismatch");
  return decimal(units(match[1]!));
}
export async function commandRun(argv: string[], cwd: string, deadlineMs: number, signal: AbortSignal): Promise<NativeEvidence> {
  signal.throwIfAborted(); const startedAt = Date.now();
  return new Promise(resolve => {
    let text = "", error: string | null = null, deadline = false, cancelled = false, force: NodeJS.Timeout | undefined;
    const child = spawn(argv[0]!, argv.slice(1), { cwd, stdio: ["ignore", "pipe", "pipe"], shell: false });
    const stop = () => { child.kill("SIGTERM"); force ??= setTimeout(() => child.kill("SIGKILL"), 250); };
    const abort = () => { cancelled = true; stop(); };
    const timer = setTimeout(() => { deadline = true; stop(); }, deadlineMs);
    signal.addEventListener("abort", abort, { once: true }); if (signal.aborted) abort();
    const collect = (chunk: Buffer) => { if (Buffer.byteLength(text) + chunk.length > 65536) { error = "Command output limit exceeded"; stop(); } else text += chunk.toString("utf8"); };
    child.stdout.on("data", collect); child.stderr.on("data", collect);
    child.on("error", e => { error = String(e); });
    child.on("close", (exitCode, exitSignal) => {
      clearTimeout(timer); if (force) clearTimeout(force); signal.removeEventListener("abort", abort);
      if (exitSignal && !cancelled && !deadline) error ??= `Command signal ${exitSignal}`;
      resolve({ id: `command:${child.pid ?? "launch-failed"}`, cwd, status: deadline ? "timed_out" : cancelled ? "stopped" : exitCode === 0 && !error ? "completed" : "failed", text, error, exitCode, deadline, checks: [], usage: null, elapsedMs: Date.now() - startedAt });
    });
  });
}
export function analyze(record: EvaluationRecord, direction: "maximize" | "minimize"): EvaluationRecord["analysis"] {
  if (record.definition.analysis !== "paired-descriptive") throw new Error("Unsupported analysis method; no inferential fallback");
  const deltas: bigint[] = [];
  const tasks = record.definition.tasks.map(task => {
    let failures = 0;
    const score = (condition: "baseline" | "candidate") => {
      const values: bigint[] = [];
      for (let repeat = 0; repeat < record.definition.repeats; repeat++) {
        const attempts = record.invocations.filter(i => i.condition === condition && i.taskId === task.id && i.repeat === repeat && i.purpose !== "judge");
        const last = attempts.at(-1);
        if (!last?.valid || last.score === null || !last.native || !nativeSuccess(last.native)) { failures++; values.push(0n); }
        else values.push(units(last.score));
      }
      if (record.definition.kind === "command") { values.sort((a, b) => a < b ? -1 : a > b ? 1 : 0); return values[Math.floor(values.length / 2)]!; }
      // Task is the analysis unit. Repeat trajectories are not independent tasks.
      return values.reduce((a, b) => a + b, 0n) / BigInt(values.length);
    };
    const baseline = score("baseline"), candidate = score("candidate");
    const delta = (candidate - baseline) * (direction === "maximize" ? 1n : -1n); deltas.push(delta);
    return { taskId: task.id, baseline: decimal(baseline), candidate: decimal(candidate), delta: decimal(delta), failures };
  });
  // Derived differences may exceed the input bound. Serialize only at output.
  deltas.sort((a, b) => a < b ? -1 : a > b ? 1 : 0);
  return { method: "paired-descriptive", interpretation: "Descriptive paired tasks only; observed delta range is not a confidence interval or statistical superiority. Missing/invalid task outcomes contribute zero to the failure-inclusive summary, never an authoritative score. Repeat means truncate at nine decimal places.", tasks,
    wins: deltas.filter(d => d > 0n).length, ties: deltas.filter(d => d === 0n).length, losses: deltas.filter(d => d < 0n).length,
    failures: tasks.reduce((n, t) => n + t.failures, 0), range: [decimal(deltas[0]!), decimal(deltas.at(-1)!)] };
}
