#!/usr/bin/env node
import { resolve } from "node:path";
import { ArborApplication } from "../src/application/ArborApplication.js";
import { runAuthorizationCli } from "../src/authorization/cli.js";
import { NO_CERTIFICATIONS_V1, UnavailableCleanupAdapter, UnavailableEvaluator, UnavailableFabricAgentAdapter, UnavailableReportPublisher, UnavailableWorkspaceManager } from "../src/compatibility/fail-closed.js";
import { ArtifactStore } from "../src/persistence/ArtifactStore.js";
import { SqliteRunStore } from "../src/persistence/SqliteRunStore.js";
import { RandomIdFactory, SystemClock } from "../src/util/clock.js";
import { DetachedMonitorAuthority } from "../src/web/DetachedMonitorAuthority.js";
import { DetachedMonitorServer } from "../src/web/DetachedMonitorServer.js";

const USAGE = "Usage: pi-fabric-arbor <serve|authorize> [options]\n  pi-fabric-arbor serve --database <authority.sqlite3> [--host 127.0.0.1|::1 --port 0-65535 --artifact-root PATH]\n  pi-fabric-arbor authorize promotion|rollback --challenge <opaque-id>\n";
const SERVE_OPTIONS = new Set(["database", "host", "port", "bootstrap-token", "git-oid-length", "artifact-root"]);
function options(args: readonly string[], allowed: ReadonlySet<string>): Map<string, string> {
  const parsed = new Map<string, string>();
  for (let index = 0; index < args.length; index += 2) {
    const name = args[index]; const value = args[index + 1];
    if (!name?.startsWith("--") || value === undefined || name.length < 3) throw new Error("Options require --name value pairs");
    const key = name.slice(2); if (!allowed.has(key) || parsed.has(key)) throw new Error(`Unknown or duplicate option --${key}`); parsed.set(key, value);
  }
  return parsed;
}

async function serve(args: readonly string[]): Promise<void> {
  const parsed = options(args, SERVE_OPTIONS); const database = parsed.get("database");
  if (!database) throw new Error("pi-fabric-arbor serve requires --database <authority.sqlite3>");
  const host = parsed.get("host") ?? "127.0.0.1";
  if (host !== "127.0.0.1" && host !== "::1") throw new Error("Detached monitoring binds loopback only; remote bind is prohibited");
  const portRaw = parsed.get("port") ?? "0"; if (!/^(?:0|[1-9][0-9]{0,4})$/u.test(portRaw) || Number(portRaw) > 65_535) throw new Error("--port must be 0-65535");
  const oidRaw = parsed.get("git-oid-length") ?? "40"; if (oidRaw !== "40" && oidRaw !== "64") throw new Error("--git-oid-length must be 40 or 64");
  const store = await SqliteRunStore.open(resolve(database)); let server: DetachedMonitorServer | undefined;
  try {
    const application = new ArborApplication({
      store, workspace: new UnavailableWorkspaceManager(NO_CERTIFICATIONS_V1), agent: new UnavailableFabricAgentAdapter(NO_CERTIFICATIONS_V1),
      evaluator: new UnavailableEvaluator(NO_CERTIFICATIONS_V1), reportPublisher: new UnavailableReportPublisher(), cleanup: new UnavailableCleanupAdapter(NO_CERTIFICATIONS_V1),
      clock: new SystemClock(), ids: new RandomIdFactory(), gitOidLength: Number(oidRaw) as 40 | 64, executionMode: "productionBlocked",
    });
    const artifacts = parsed.get("artifact-root") ? await ArtifactStore.open(resolve(parsed.get("artifact-root")!)) : undefined;
    const authority = new DetachedMonitorAuthority(application, store, (runId) => store.readEventCompactionFloor(runId), () => new Date().toISOString(), artifacts);
    server = new DetachedMonitorServer({ authority, host, port: Number(portRaw), ...(parsed.get("bootstrap-token") ? { bootstrapToken: parsed.get("bootstrap-token")! } : {}) });
    const address = await server.start(); process.stdout.write(`${JSON.stringify(address)}\n`);
    await new Promise<void>((resolveClose) => {
      let requested = false;
      const close = () => { if (requested) return; requested = true; void server!.close().then(resolveClose, resolveClose); };
      process.once("SIGINT", close); process.once("SIGTERM", close);
    });
  } finally { if (server) await server.close().catch(() => undefined); await store.close(); }
}

const [command, ...args] = process.argv.slice(2);
try {
  if (command === "authorize") await runAuthorizationCli({ argv: args });
  else if (command === "serve") await serve(args);
  else if (command === undefined || command === "help" || command === "--help" || command === "-h") process.stdout.write(`pi-fabric-arbor 0.1.0\n${USAGE}`);
  else if (command === "--version" || command === "-V") process.stdout.write("pi-fabric-arbor 0.1.0\n");
  else throw new Error(`Unknown command '${command}'.\n${USAGE.trimEnd()}`);
} catch (error) { process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`); process.exitCode = 2; }
