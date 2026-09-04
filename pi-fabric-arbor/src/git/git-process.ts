import { chmodSync, mkdirSync, realpathSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { ArborError } from "../domain/errors.js";
import { requireSuccessfulProcess, runProcess, type ProcessResultV1 } from "../system/process.js";

const FORBIDDEN_GIT_ENV = /^(?:GIT_|SSH_|GCM_|GH_|GITHUB_|GL_|AWS_|AZURE_|GOOGLE_|CLOUD_|CI_JOB_JWT)/u;

export interface GitProcessOptionsV1 {
  stateRoot: string;
  cwd?: string;
  input?: Uint8Array | string;
  maxOutputBytes?: number;
  timeoutMs?: number;
  signal?: AbortSignal;
  indexFile?: string;
}

const COMMAND_CONFIG = Object.freeze([
  ["core.hooksPath", "empty-hooks"],
  ["core.attributesFile", "/dev/null"],
  ["core.fsmonitor", "false"],
  ["core.sshCommand", "/bin/false"],
  ["core.editor", "/bin/false"],
  ["sequence.editor", "/bin/false"],
  ["credential.helper", ""],
  ["credential.interactive", "never"],
  ["protocol.allow", "never"],
  ["protocol.file.allow", "never"],
  ["maintenance.auto", "false"],
  ["gc.auto", "0"],
  ["diff.external", "/bin/false"],
  ["core.pager", "cat"],
] as const);

function assertUnder(root: string, candidate: string): void {
  const canonicalRoot = realpathSync(root);
  const rel = relative(canonicalRoot, resolve(candidate));
  if (rel === "" || rel === ".." || rel.startsWith(`..${sep}`)) throw new ArborError("WRITE_CONFINEMENT_UNAVAILABLE", "Trusted Git scratch path escaped package state");
}

/**
 * Git receives no inherited environment. System/global configuration, credentials,
 * protocols, hooks, fsmonitor, pagers, editors, external diffs, and SSH commands
 * are disabled. Repository-local configuration is accepted only from a separately
 * validated package-private repository and never from a worker export.
 */
export function sanitizedGitEnvironment(stateRoot: string, indexFile?: string): NodeJS.ProcessEnv {
  const canonicalState = realpathSync(stateRoot);
  const home = join(canonicalState, "git-home");
  const hooks = join(canonicalState, "empty-hooks");
  const xdg = join(canonicalState, "xdg-config");
  for (const path of [home, hooks, xdg]) { mkdirSync(path, { recursive: true, mode: 0o700 }); chmodSync(path, 0o700); }
  if (indexFile !== undefined) { assertUnder(canonicalState, indexFile); mkdirSync(dirname(indexFile), { recursive: true, mode: 0o700 }); }
  const config = COMMAND_CONFIG.map(([key, value]) => [key, value === "empty-hooks" ? hooks : value] as const);
  const base: NodeJS.ProcessEnv = {
    PATH: "/usr/bin:/bin",
    HOME: home,
    XDG_CONFIG_HOME: xdg,
    LANG: "C.UTF-8",
    LC_ALL: "C.UTF-8",
    TZ: "UTC",
    GIT_CONFIG_NOSYSTEM: "1",
    GIT_CONFIG_SYSTEM: "/dev/null",
    GIT_CONFIG_GLOBAL: "/dev/null",
    GIT_ATTR_NOSYSTEM: "1",
    GIT_TERMINAL_PROMPT: "0",
    GIT_OPTIONAL_LOCKS: "0",
    GIT_ASKPASS: "/bin/false",
    SSH_ASKPASS: "/bin/false",
    GIT_SSH_COMMAND: "/bin/false",
    GIT_PROTOCOL_FROM_USER: "0",
    GIT_ALLOW_PROTOCOL: "",
    GIT_PAGER: "cat",
    GIT_CONFIG_COUNT: String(config.length),
    ...(indexFile === undefined ? {} : { GIT_INDEX_FILE: resolve(indexFile) }),
  };
  config.forEach(([key, value], index) => { base[`GIT_CONFIG_KEY_${index}`] = key; base[`GIT_CONFIG_VALUE_${index}`] = value; });
  for (const key of Object.keys(base)) {
    if (FORBIDDEN_GIT_ENV.test(key) && !key.startsWith("GIT_CONFIG") && !["GIT_ATTR_NOSYSTEM", "GIT_TERMINAL_PROMPT", "GIT_OPTIONAL_LOCKS", "GIT_ASKPASS", "GIT_SSH_COMMAND", "GIT_PROTOCOL_FROM_USER", "GIT_ALLOW_PROTOCOL", "GIT_PAGER", "GIT_INDEX_FILE", "SSH_ASKPASS"].includes(key)) {
      throw new ArborError("WRITE_CONFINEMENT_UNAVAILABLE", "Sanitized Git environment contains a forbidden key", { key });
    }
  }
  return Object.freeze(base);
}

export async function runGit(args: readonly string[], options: GitProcessOptionsV1): Promise<ProcessResultV1> {
  return runProcess(["/usr/bin/git", ...args], {
    ...(options.cwd ? { cwd: options.cwd } : {}),
    env: sanitizedGitEnvironment(options.stateRoot, options.indexFile),
    ...(options.input === undefined ? {} : { input: options.input }),
    maxOutputBytes: options.maxOutputBytes ?? 8_388_608,
    timeoutMs: options.timeoutMs ?? 120_000,
    ...(options.signal ? { signal: options.signal } : {}),
  });
}

export async function git(args: readonly string[], options: GitProcessOptionsV1, label = "Git operation"): Promise<Buffer> {
  return requireSuccessfulProcess(await runGit(args, options), label).stdout;
}

export function assertPackageRef(ref: string): void {
  if (!/^refs\/pi-fabric-arbor\/[a-z0-9_./-]{1,240}$/u.test(ref) || ref.includes("..") || ref.includes("//") || ref.endsWith("/")) {
    throw new ArborError("VALIDATION_FAILED", "Git ref is outside the package namespace", { ref });
  }
}

export function assertSafeRelativePath(path: string): void {
  if (Buffer.byteLength(path, "utf8") < 1 || Buffer.byteLength(path, "utf8") > 512 || path.startsWith("/") || path.includes("\\") || path.includes("\0") || path.split("/").some((part) => part === "" || part === "." || part === ".." || part.toLowerCase() === ".git")) {
    throw new ArborError("VALIDATION_FAILED", "Unsafe repository-relative path", { path });
  }
}
