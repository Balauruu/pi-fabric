import { spawn, spawnSync } from "node:child_process";
import { createPublicKey, generateKeyPairSync, randomUUID, sign, timingSafeEqual, verify } from "node:crypto";
import { accessSync, chmodSync, closeSync, constants, existsSync, fstatSync, lstatSync, mkdirSync, openSync, readFileSync, readlinkSync, readdirSync, realpathSync, rmSync, statSync } from "node:fs";
import { dirname, relative, resolve, sep } from "node:path";
import { platform, arch, release } from "node:os";
import { ArborError } from "../domain/errors.js";
import { digestCanonical, sha256 } from "../util/canonical.js";
import { requireSuccessfulProcess, runProcess } from "../system/process.js";

export interface ContainmentPermissionsV1 {
  network: boolean;
  packageInstallation: boolean;
  processExecution: boolean;
}

export interface ContainedProcessRequestV1 {
  version: 1;
  containmentId: string;
  workspace: string;
  argv: readonly string[];
  permissions: ContainmentPermissionsV1;
  workspaceWritable?: boolean;
  timeoutMs: number;
  maxOutputBytes: number;
  resourceLimits?: { maxProcesses: number; maxRssBytes: number };
  signal?: AbortSignal;
  environment?: Readonly<Record<string, string>>;
}

export interface ContainmentIdentityV1 {
  version: 1;
  containmentId: string;
  adapter: "linux-bubblewrap";
  bwrapDigest: string;
  bwrapVersion: string;
  launcherPid: number;
  childPid: number;
  processGroupId: number;
  launcherStartTicks: string;
  namespaces: Readonly<Record<"user" | "pid" | "ipc" | "uts" | "cgroup" | "network" | "mount", string>>;
  cgroupMembershipDigest: string;
  resourceControl?: { kind: "cgroup-v2"; manager: "systemd-user-service"; cgroupPathDigest: string; pidsMax: number; memoryMax: number };
  environmentDigest: string;
  mountPolicyDigest: string;
}

export interface ContainedProcessResultV1 {
  version: 1;
  identity: ContainmentIdentityV1;
  exitCode: number;
  signal: NodeJS.Signals | null;
  stdout: string;
  stderr: string;
  stdoutDigest: string;
  stderrDigest: string;
  timedOut: boolean;
  cancelled: boolean;
  oversized: boolean;
  resourceUsage: { peakProcesses: number; peakRssBytes: number; breach: "processes" | "rss" | null; source: "cgroup-v2" | "telemetry-only"; cgroupEmpty: boolean };
  descendantsTerminated: boolean;
  observation: "certain";
}

export interface BubblewrapAdapterOptionsV1 {
  stateRoot: string;
  bwrapPath?: string;
  allowedExecutables: readonly string[];
  forbiddenHostPaths?: readonly string[];
  minimalDevices?: readonly string[];
  cgroupRunnerPath?: string;
}

export class CanonicalEvaluatorReadOnlyMountGrant {
  readonly #source: string;
  readonly #tokenDigest: string;
  readonly dataDigest: string;

  constructor(source: string, opaqueToken: string) {
    const stat = lstatSync(source);
    if (stat.isSymbolicLink() || (!stat.isDirectory() && !stat.isFile())) throw new ArborError("HELD_OUT_ISOLATION_REQUIRED", "Held-out source must be one real file or directory");
    this.#source = realpathSync(source);
    this.#tokenDigest = sha256(opaqueToken);
    this.dataDigest = computeCanonicalFilesystemDigest(this.#source);
  }

  resolve(opaqueToken: string): { source: string; tokenDigest: string; dataDigest: string } {
    const expected = Buffer.from(this.#tokenDigest, "hex"); const actual = Buffer.from(sha256(opaqueToken), "hex");
    if (expected.byteLength !== actual.byteLength || !timingSafeEqual(expected, actual)) throw new ArborError("HELD_OUT_ISOLATION_REQUIRED", "Opaque held-out token resolution was denied");
    this.verifyCurrent();
    return { source: this.#source, tokenDigest: this.#tokenDigest, dataDigest: this.dataDigest };
  }

  verifyCurrent(): void {
    if (computeCanonicalFilesystemDigest(this.#source) !== this.dataDigest) throw new ArborError("HELD_OUT_ISOLATION_REQUIRED", "Held-out input changed after its grant was sealed");
  }
}

export interface ContainmentMatrixResultV1 {
  name: string;
  passed: boolean;
  direct: boolean;
  observationDigest: string;
  limitation?: string;
}

export interface ContainmentCertificateV1 {
  version: 1;
  certificateId: string;
  createdAt: string;
  adapter: "linux-bubblewrap";
  platform: { os: string; architecture: string; release: string; node: string };
  bwrapVersion: string;
  bwrapDigest: string;
  adapterDigest: string;
  mountPolicyDigest: string;
  environmentPolicyDigest: string;
  cgroupVersion: "v2";
  cgroupRunnerDigest: string;
  resourceLimitEnforcement: "kernel-cgroup-v2";
  requiredNamespaces: string[];
  minimalDevices: string[];
  matrix: ContainmentMatrixResultV1[];
  limitations: string[];
  predecessorDigest?: string;
  signerId: string;
  signingAlgorithm: "Ed25519";
  signingPublicKey: string;
  valid: boolean;
  payloadDigest: string;
  signature: string;
  certificateDigest: string;
}

const REQUIRED_MATRIX = Object.freeze([
  "source-absent", "common-dir-absent", "sibling-absent", "workspace-write", "workspace-isolation",
  "descendant-kill", "double-fork-kill", "namespace-identity", "absolute-path-denial", "redundant-path-denial",
  "symlink-escape-denial", "hardlink-source-denial", "proc-fd-denial", "inherited-fd-denial", "bind-alias-denial",
  "git-system-config-denial", "git-global-config-denial", "git-local-config-denial", "git-worktree-config-denial",
  "git-include-denial", "hook-denial", "credential-helper-denial", "ssh-agent-denial", "keyring-denial",
  "cloud-metadata-denial", "environment-secret-denial", "device-denial", "network-denial", "dns-denial",
  "unix-socket-denial", "package-install-denial", "timeout-tree-kill", "cancel-tree-kill", "bounded-output",
  "cgroup-pids-max", "cgroup-memory-max", "cgroup-empty", "double-fork-cgroup-accounting",
]);

function readStartTicks(pid: number): string {
  const value = readFileSync(`/proc/${pid}/stat`, "utf8");
  const end = value.lastIndexOf(")");
  const fields = value.slice(end + 2).split(" ");
  const ticks = fields[19];
  if (!ticks) throw new ArborError("WRITE_CONFINEMENT_UNAVAILABLE", "Unable to read containment process start time");
  return ticks;
}

function systemNamespace(name: string): string {
  return readlinkSync(`/proc/self/ns/${name === "network" ? "net" : name}`, "utf8");
}

function descendantResourceUsage(rootPid: number): { processes: number; rssBytes: number } {
  const rows: Array<{ pid: number; parent: number; rssBytes: number }> = [];
  for (const name of readdirSync("/proc")) {
    if (!/^\d+$/u.test(name)) continue;
    const pid = Number(name);
    try {
      const stat = readFileSync(`/proc/${name}/stat`, "utf8"); const end = stat.lastIndexOf(")"); const fields = stat.slice(end + 2).split(" "); const parent = Number(fields[1]);
      const status = readFileSync(`/proc/${name}/status`, "utf8"); const rssKiB = Number(/^VmRSS:\s+(\d+)\s+kB$/mu.exec(status)?.[1] ?? "0");
      if (Number.isSafeInteger(parent) && Number.isSafeInteger(rssKiB)) rows.push({ pid, parent, rssBytes: rssKiB * 1024 });
    } catch { /* process exited during the bounded observation */ }
  }
  const descendants = new Set<number>([rootPid]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const row of rows) if (descendants.has(row.parent) && !descendants.has(row.pid)) { descendants.add(row.pid); changed = true; }
  }
  return { processes: descendants.size, rssBytes: rows.filter((row) => descendants.has(row.pid)).reduce((sum, row) => sum + row.rssBytes, 0) };
}

interface CgroupObservationV1 { path: string; pathDigest: string; pidsMax: number; memoryMax: number }

function cgroupForPid(pid: number, expected?: { maxProcesses: number; maxRssBytes: number }): CgroupObservationV1 {
  const membership = readFileSync(`/proc/${pid}/cgroup`, "utf8"); const row = membership.split("\n").find((line) => line.startsWith("0::"));
  if (!row) throw new ArborError("WRITE_CONFINEMENT_UNAVAILABLE", "Process is not in a unified cgroup-v2 hierarchy");
  const relativePath = row.slice(3); const path = resolve("/sys/fs/cgroup", `.${relativePath}`);
  const pids = readFileSync(joinPath(path, "pids.max"), "utf8").trim(); const memory = readFileSync(joinPath(path, "memory.max"), "utf8").trim();
  if (pids === "max" || memory === "max") throw new ArborError("WRITE_CONFINEMENT_UNAVAILABLE", "Kernel cgroup process or memory limit is unbounded");
  const observation = { path, pathDigest: sha256(relativePath), pidsMax: Number(pids), memoryMax: Number(memory) };
  if (!Number.isSafeInteger(observation.pidsMax) || !Number.isSafeInteger(observation.memoryMax) || (expected && (observation.pidsMax !== expected.maxProcesses || observation.memoryMax !== expected.maxRssBytes))) throw new ArborError("WRITE_CONFINEMENT_UNAVAILABLE", "Kernel cgroup limits do not equal the requested pids.max and memory.max");
  return observation;
}

function readCgroupNumber(path: string, name: string): number {
  try { const value = Number(readFileSync(joinPath(path, name), "utf8").trim()); return Number.isSafeInteger(value) && value >= 0 ? value : 0; } catch { return 0; }
}

function readCgroupEvent(path: string, file: string, key: string): number {
  try { return Number(new RegExp(`^${key}\\s+(\\d+)$`, "mu").exec(readFileSync(joinPath(path, file), "utf8"))?.[1] ?? "0"); } catch { return 0; }
}

function cgroupIsEmptyOrRemoved(path: string | undefined): boolean {
  if (!path || !existsSync(path)) return true;
  try { return /^populated\s+0$/mu.test(readFileSync(joinPath(path, "cgroup.events"), "utf8")); } catch { return false; }
}

function libraryPaths(executable: string): string[] {
  const result = requireSuccessfulProcess(runProcessSync(["/usr/bin/ldd", executable]), "Resolve containment runtime libraries");
  const paths = new Set<string>();
  for (const line of result.stdout.toString("utf8").split("\n")) {
    const arrow = /=>\s+(\/[^\s]+)\s+/u.exec(line)?.[1];
    const direct = /^\s*(\/[^\s]+)\s+/u.exec(line)?.[1];
    if (arrow && existsSync(arrow)) { paths.add(arrow); paths.add(realpathSync(arrow)); }
    if (direct && existsSync(direct)) paths.add(realpathSync(direct));
  }
  return [...paths].sort();
}

function runProcessSync(argv: readonly string[]) {
  const result = spawnSync(argv[0]!, argv.slice(1), { encoding: null, env: { PATH: "/usr/bin:/bin", LANG: "C" }, maxBuffer: 4_194_304 });
  return { version: 1 as const, argv, exitCode: result.status ?? 1, signal: result.signal, stdout: Buffer.from(result.stdout ?? ""), stderr: Buffer.from(result.stderr ?? ""), timedOut: false, cancelled: false, oversized: false };
}

function safeEnvironment(extra: Readonly<Record<string, string>> | undefined): Readonly<Record<string, string>> {
  const environment: Record<string, string> = {
    PATH: "/usr/bin",
    HOME: "/home/arbor",
    XDG_CONFIG_HOME: "/home/arbor/config",
    TMPDIR: "/tmp",
    LANG: "C.UTF-8",
    LC_ALL: "C.UTF-8",
    TZ: "UTC",
    GIT_CONFIG_NOSYSTEM: "1",
    GIT_CONFIG_SYSTEM: "/dev/null",
    GIT_CONFIG_GLOBAL: "/dev/null",
    GIT_TERMINAL_PROMPT: "0",
    GIT_ASKPASS: "/runtime/denied",
    SSH_ASKPASS: "/runtime/denied",
    GIT_CONFIG_COUNT: "4",
    GIT_CONFIG_KEY_0: "core.hooksPath",
    GIT_CONFIG_VALUE_0: "/home/arbor/hooks",
    GIT_CONFIG_KEY_1: "credential.helper",
    GIT_CONFIG_VALUE_1: "",
    GIT_CONFIG_KEY_2: "credential.interactive",
    GIT_CONFIG_VALUE_2: "never",
    GIT_CONFIG_KEY_3: "protocol.file.allow",
    GIT_CONFIG_VALUE_3: "never",
  };
  for (const [key, value] of Object.entries(extra ?? {})) {
    if (!/^ARBOR_[A-Z0-9_]{1,48}$/u.test(key) || value.length > 4096 || /(?:TOKEN|SECRET|PASSWORD|CREDENTIAL|KEY)/u.test(key)) throw new ArborError("WRITE_CONFINEMENT_UNAVAILABLE", "Unadmitted containment environment key", { key });
    environment[key] = value;
  }
  return Object.freeze(environment);
}

function directoryMountArgs(paths: readonly string[]): string[] {
  const directories = new Set<string>();
  for (const path of paths) {
    let current = dirname(path);
    while (current !== "/") { directories.add(current); current = dirname(current); }
  }
  return [...directories].sort((left, right) => left.split("/").length - right.split("/").length || left.localeCompare(right)).flatMap((directory) => ["--dir", directory]);
}

interface CanonicalFilesystemEntryV1 { path: string; type: "file" | "directory"; mode: number; bytes: number; digest?: string }

export function canonicalFilesystemEntries(root: string, maximumEntries = 200_000): CanonicalFilesystemEntryV1[] {
  const canonicalRoot = realpathSync(root); const entries: CanonicalFilesystemEntryV1[] = [];
  const visit = (path: string): void => {
    const stat = lstatSync(path);
    if (stat.isSymbolicLink()) throw new ArborError("HELD_OUT_ISOLATION_REQUIRED", "Canonical input directories cannot contain symlinks");
    const relativePath = relative(canonicalRoot, path).split(sep).join("/") || ".";
    if (entries.length >= maximumEntries) throw new ArborError("WRITE_CONFINEMENT_UNAVAILABLE", "Canonical filesystem digest exceeds its observation bound");
    if (stat.isDirectory()) {
      entries.push({ path: relativePath, type: "directory", mode: stat.mode & 0o7777, bytes: 0 });
      for (const name of readdirSync(path).sort()) visit(joinPath(path, name));
    } else if (stat.isFile()) {
      const fd = openSync(path, constants.O_RDONLY | constants.O_NOFOLLOW);
      try {
        const opened = fstatSync(fd);
        if (!opened.isFile() || opened.dev !== stat.dev || opened.ino !== stat.ino || opened.size !== stat.size || opened.mtimeMs !== stat.mtimeMs || opened.ctimeMs !== stat.ctimeMs) throw new ArborError("HELD_OUT_ISOLATION_REQUIRED", "Canonical input changed while it was opened");
        const bytes = readFileSync(fd); const after = fstatSync(fd);
        if (after.dev !== opened.dev || after.ino !== opened.ino || after.size !== opened.size || after.mtimeMs !== opened.mtimeMs || after.ctimeMs !== opened.ctimeMs) throw new ArborError("HELD_OUT_ISOLATION_REQUIRED", "Canonical input changed while it was hashed");
        entries.push({ path: relativePath, type: "file", mode: stat.mode & 0o7777, bytes: bytes.byteLength, digest: sha256(bytes) });
      } finally { closeSync(fd); }
    } else throw new ArborError("HELD_OUT_ISOLATION_REQUIRED", "Canonical input contains an unsupported filesystem entry");
  };
  visit(canonicalRoot); return entries.sort((left, right) => left.path.localeCompare(right.path));
}

export function computeCanonicalFilesystemDigest(path: string): string {
  const stat = lstatSync(path);
  if (stat.isSymbolicLink() || (!stat.isDirectory() && !stat.isFile())) throw new ArborError("HELD_OUT_ISOLATION_REQUIRED", "Canonical input must be a real file or directory");
  return stat.isFile() ? sha256(readFileSync(realpathSync(path))) : digestCanonical(canonicalFilesystemEntries(path));
}

function inodeSet(root: string, maximumEntries = 200_000): Set<string> {
  const inodes = new Set<string>();
  const visit = (path: string): void => {
    const stat = lstatSync(path, { bigint: true });
    if (stat.isFile()) inodes.add(`${stat.dev}:${stat.ino}`);
    if (stat.isDirectory() && !stat.isSymbolicLink()) for (const name of readdirSync(path).sort()) { if (inodes.size > maximumEntries) throw new ArborError("WRITE_CONFINEMENT_UNAVAILABLE", "Hard-link preflight exceeds its observation bound"); visit(joinPath(path, name)); }
  };
  visit(root); return inodes;
}

function joinPath(parent: string, name: string): string { return `${parent.replace(/\/$/u, "")}/${name}`; }

function sanitizeLog(value: Buffer, secrets: readonly string[]): string {
  let output = value.toString("utf8");
  for (const secret of secrets.filter(Boolean).sort((a, b) => b.length - a.length)) output = output.split(secret).join("<redacted-path>");
  output = output.replace(/(?:token|secret|password|credential|api[_-]?key)\s*[=:]\s*[^\s]+/giu, "$1=<redacted>");
  return output;
}

export class LinuxBubblewrapContainmentAdapter {
  readonly stateRoot: string;
  readonly bwrapPath: string;
  readonly allowedExecutables: readonly string[];
  readonly forbiddenHostPaths: readonly string[];
  readonly minimalDevices: readonly string[];
  readonly bwrapDigest: string;
  readonly cgroupRunnerPath: string;
  readonly cgroupRunnerDigest: string;
  #version?: string;

  constructor(options: BubblewrapAdapterOptionsV1) {
    if (platform() !== "linux") throw new ArborError("WRITE_CONFINEMENT_UNAVAILABLE", "Bubblewrap containment is Linux-only");
    this.stateRoot = realpathSync(options.stateRoot);
    this.bwrapPath = realpathSync(options.bwrapPath ?? "/usr/bin/bwrap");
    accessSync(this.bwrapPath, constants.X_OK);
    this.allowedExecutables = Object.freeze(options.allowedExecutables.map((path) => realpathSync(path)).sort());
    if (this.allowedExecutables.length === 0) throw new ArborError("WRITE_CONFINEMENT_UNAVAILABLE", "Containment requires a nonempty executable allowlist");
    const packageManagers = /\/(?:npm|npx|pnpm|yarn|bun|pip\d*|pacman|apt(?:-get)?|dnf|yum|apk|gem|cargo|go)$/u;
    if (this.allowedExecutables.some((path) => packageManagers.test(path))) throw new ArborError("WRITE_CONFINEMENT_UNAVAILABLE", "Package-manager executables cannot be admitted in deny-install mode");
    this.forbiddenHostPaths = Object.freeze((options.forbiddenHostPaths ?? []).map((path) => realpathSync(path)));
    this.minimalDevices = Object.freeze(options.minimalDevices ?? ["/dev/null", "/dev/urandom"]);
    for (const device of this.minimalDevices) {
      if (!["/dev/null", "/dev/zero", "/dev/urandom", "/dev/random"].includes(device)) throw new ArborError("WRITE_CONFINEMENT_UNAVAILABLE", "Device is outside the minimal allowlist", { device });
    }
    this.bwrapDigest = sha256(readFileSync(this.bwrapPath));
    this.cgroupRunnerPath = realpathSync(options.cgroupRunnerPath ?? "/usr/bin/systemd-run"); accessSync(this.cgroupRunnerPath, constants.X_OK);
    this.cgroupRunnerDigest = sha256(readFileSync(this.cgroupRunnerPath));
  }

  async verifyPrerequisites(): Promise<{ bwrapVersion: string; probeDigest: string }> {
    const version = requireSuccessfulProcess(await runProcess([this.bwrapPath, "--version"], { env: { PATH: "/usr/bin:/bin", LANG: "C" }, maxOutputBytes: 4096, timeoutMs: 5000 }), "Read Bubblewrap version").stdout.toString("utf8").trim();
    if (readFileSync("/proc/sys/user/max_user_namespaces", "utf8").trim() === "0") throw new ArborError("WRITE_CONFINEMENT_UNAVAILABLE", "User namespaces are unavailable");
    const probe = await runProcess([this.bwrapPath, "--die-with-parent", "--new-session", "--unshare-user", "--unshare-pid", "--unshare-ipc", "--unshare-uts", "--unshare-cgroup", "--unshare-net", "--clearenv", "--ro-bind", "/usr", "/usr", "--symlink", "usr/lib", "/lib", "--symlink", "usr/lib", "/lib64", "/usr/bin/true"], { env: {}, timeoutMs: 5000, maxOutputBytes: 4096 });
    if (probe.exitCode !== 0 || probe.timedOut) throw new ArborError("WRITE_CONFINEMENT_UNAVAILABLE", "Bubblewrap user/cgroup/network namespace probe failed", { stderr: probe.stderr.toString("utf8") });
    this.#version = version;
    return { bwrapVersion: version, probeDigest: digestCanonical({ version, exitCode: probe.exitCode, bwrapDigest: this.bwrapDigest }) };
  }

  run(request: ContainedProcessRequestV1): Promise<ContainedProcessResultV1> {
    return this.#run(request);
  }

  runCanonicalEvaluator(request: ContainedProcessRequestV1, grant: CanonicalEvaluatorReadOnlyMountGrant, opaqueToken: string): Promise<ContainedProcessResultV1> {
    return this.#run(request, grant.resolve(opaqueToken));
  }

  async #run(request: ContainedProcessRequestV1, heldOut?: { source: string; tokenDigest: string; dataDigest: string }): Promise<ContainedProcessResultV1> {
    if (request.version !== 1 || !/^[a-z][a-z0-9_]{2,63}$/u.test(request.containmentId)) throw new ArborError("VALIDATION_FAILED", "Invalid containment request");
    if (request.signal?.aborted) throw new ArborError("INDETERMINATE", "Containment request was cancelled before launch");
    if (request.permissions.network || request.permissions.packageInstallation || !request.permissions.processExecution) throw new ArborError("WRITE_CONFINEMENT_UNAVAILABLE", "Requested permissions are not supported by the certified deny-network/deny-install adapter");
    if (!Number.isSafeInteger(request.timeoutMs) || request.timeoutMs < 1 || request.timeoutMs > 3_600_000) throw new ArborError("VALIDATION_FAILED", "Invalid containment timeout");
    if (!Number.isSafeInteger(request.maxOutputBytes) || request.maxOutputBytes < 1 || request.maxOutputBytes > 16_777_216) throw new ArborError("VALIDATION_FAILED", "Invalid containment output bound");
    if (request.resourceLimits && (!Number.isSafeInteger(request.resourceLimits.maxProcesses) || request.resourceLimits.maxProcesses < 1 || request.resourceLimits.maxProcesses > 1_024 || !Number.isSafeInteger(request.resourceLimits.maxRssBytes) || request.resourceLimits.maxRssBytes < 1_048_576 || request.resourceLimits.maxRssBytes > 68_719_476_736)) throw new ArborError("VALIDATION_FAILED", "Invalid containment process or RSS bound");
    if (request.argv.length === 0 || !request.argv[0]) throw new ArborError("VALIDATION_FAILED", "Contained argv is empty");
    const executable = realpathSync(request.argv[0]);
    if (!this.allowedExecutables.includes(executable)) throw new ArborError("WRITE_CONFINEMENT_UNAVAILABLE", "Executable is outside the containment allowlist");
    const workspace = realpathSync(request.workspace);
    const workspaceRelative = relative(this.stateRoot, workspace);
    if (workspaceRelative === ".." || workspaceRelative.startsWith(`..${sep}`)) throw new ArborError("WRITE_CONFINEMENT_UNAVAILABLE", "Workspace is outside package-owned state");
    const workspaceInodes = inodeSet(workspace);
    for (const forbidden of this.forbiddenHostPaths) {
      const rel = relative(forbidden, workspace);
      if (rel === "" || (!rel.startsWith("..") && !resolve(rel).startsWith(".."))) throw new ArborError("WRITE_CONFINEMENT_UNAVAILABLE", "Workspace aliases forbidden host storage");
      const wsStat = statSync(workspace, { bigint: true });
      const forbiddenStat = statSync(forbidden, { bigint: true });
      if (wsStat.dev === forbiddenStat.dev && wsStat.ino === forbiddenStat.ino) throw new ArborError("WRITE_CONFINEMENT_UNAVAILABLE", "Workspace inode aliases forbidden storage");
      const forbiddenInodes = inodeSet(forbidden);
      for (const inode of workspaceInodes) if (forbiddenInodes.has(inode)) throw new ArborError("WRITE_CONFINEMENT_UNAVAILABLE", "Workspace contains a hard link to forbidden host storage");
    }
    const prerequisite = this.#version ? { bwrapVersion: this.#version } : await this.verifyPrerequisites();
    const libraries = libraryPaths(executable);
    const mountedPaths = [executable, ...libraries, ...this.minimalDevices];
    const args = [
      "--die-with-parent", "--new-session", "--unshare-user", "--unshare-pid", "--unshare-ipc", "--unshare-uts", "--unshare-cgroup", "--unshare-net", "--clearenv",
      ...directoryMountArgs(mountedPaths),
      "--symlink", "usr/bin", "/bin", "--symlink", "usr/lib", "/lib", "--symlink", "usr/lib", "/lib64",
      "--proc", "/proc", "--tmpfs", "/tmp", "--dir", "/home", "--dir", "/home/arbor", "--dir", "/home/arbor/config", "--dir", "/home/arbor/hooks", "--dir", "/runtime", "--dir", "/runtime/bin",
    ];
    for (const path of [executable, ...libraries]) args.push("--ro-bind", path, path);
    for (const device of this.minimalDevices) args.push("--dev-bind", device, device);
    args.push(request.workspaceWritable === false ? "--ro-bind" : "--bind", workspace, "/workspace");
    if (heldOut) args.push("--ro-bind", heldOut.source, "/held-out");
    args.push("--chdir", "/workspace");
    const environment = safeEnvironment(request.environment);
    for (const [key, value] of Object.entries(environment)) args.push("--setenv", key, value);
    args.push("--json-status-fd", "3", "--block-fd", "0", executable, ...request.argv.slice(1));
    const mountPolicyDigest = digestCanonical({ root: "empty", workspace: request.workspaceWritable === false ? "ro" : "rw", executable: sha256(readFileSync(executable)), libraries: libraries.map((path) => ({ path: path.replace(/^.*\//u, ""), digest: sha256(readFileSync(path)) })), devices: this.minimalDevices, sourceMounted: false, forbiddenMounted: false, networkNamespace: "isolated", heldOut: heldOut ? { target: "/held-out", mode: "ro", dataDigest: heldOut.dataDigest, tokenDigest: heldOut.tokenDigest } : "absent" });
    const environmentDigest = digestCanonical(environment);
    if (request.signal?.aborted) throw new ArborError("INDETERMINATE", "Containment request was cancelled during fail-closed preflight");
    const scopeUnit = request.resourceLimits ? `pi-fabric-arbor-${request.containmentId.slice(0, 24)}-${digestCanonical({ stateRoot: this.stateRoot, containmentId: request.containmentId }).slice(0, 20)}.service` : undefined;
    const statusDirectory = joinPath(this.stateRoot, "containment-control"); if (request.resourceLimits) { mkdirSync(statusDirectory, { recursive: true, mode: 0o700 }); chmodSync(statusDirectory, 0o700); }
    const statusFile = request.resourceLimits ? joinPath(statusDirectory, `${request.containmentId}-${randomUUID()}.jsonl`) : undefined;
    const launcher = request.resourceLimits ? this.cgroupRunnerPath : this.bwrapPath;
    const launcherArgs = request.resourceLimits ? ["--user", "--wait", "--pipe", "--quiet", `--unit=${scopeUnit}`, `--property=MemoryMax=${request.resourceLimits.maxRssBytes}`, "--property=MemorySwapMax=0", `--property=TasksMax=${request.resourceLimits.maxProcesses}`, "/bin/sh", "-c", "umask 077; exec 3>\"$1\"; shift; exec \"$@\"", "arbor-cgroup-launch", statusFile!, this.bwrapPath, ...args] : args;

    return new Promise<ContainedProcessResultV1>((resolvePromise, reject) => {
      const child = spawn(launcher, launcherArgs, { env: { PATH: "/usr/bin:/bin", LANG: "C", ...(request.resourceLimits ? { XDG_RUNTIME_DIR: `/run/user/${process.getuid?.() ?? -1}`, DBUS_SESSION_BUS_ADDRESS: `unix:path=/run/user/${process.getuid?.() ?? -1}/bus` } : {}) }, detached: true, stdio: ["pipe", "pipe", "pipe", "pipe"] });
      if (child.pid === undefined) { reject(new ArborError("WRITE_CONFINEMENT_UNAVAILABLE", "Bubblewrap did not provide a launcher PID")); return; }
      const launcherPid = child.pid;
      let launcherStartTicks: string;
      try { launcherStartTicks = readStartTicks(launcherPid); } catch (error) { child.kill("SIGKILL"); reject(error); return; }
      let statusText = "";
      let identity: ContainmentIdentityV1 | undefined;
      const stdout: Buffer[] = [];
      const stderr: Buffer[] = [];
      let bytes = 0;
      let timedOut = false;
      let cancelled = false;
      let oversized = false;
      let peakProcesses = 0;
      let peakRssBytes = 0;
      let resourceBreach: "processes" | "rss" | null = null;
      let cgroup: CgroupObservationV1 | undefined;
      let terminating = false;
      let handshakeReleased = false;
      const releaseHandshake = (): void => {
        if (handshakeReleased) return;
        handshakeReleased = true;
        child.stdin!.end(Buffer.from([0]));
      };
      child.stdin!.on("error", () => { /* close handling preserves the authoritative process result */ });
      const terminate = (): void => {
        if (terminating) return;
        terminating = true;
        child.stdin!.destroy();
        if (scopeUnit) spawnSync("/usr/bin/systemctl", ["--user", "kill", "--kill-whom=all", "--signal=SIGKILL", scopeUnit], { env: { PATH: "/usr/bin:/bin", LANG: "C", XDG_RUNTIME_DIR: `/run/user/${process.getuid?.() ?? -1}`, DBUS_SESSION_BUS_ADDRESS: `unix:path=/run/user/${process.getuid?.() ?? -1}/bus` }, stdio: "ignore" });
        try { process.kill(-launcherPid, "SIGKILL"); } catch { try { child.kill("SIGKILL"); } catch { /* gone */ } }
        if (identity) { try { process.kill(identity.childPid, "SIGKILL"); } catch { /* PID namespace already gone */ } }
      };
      const collect = (target: Buffer[], chunk: Buffer): void => {
        const remaining = request.maxOutputBytes - bytes;
        if (remaining <= 0) { oversized = true; terminate(); return; }
        const kept = chunk.byteLength > remaining ? chunk.subarray(0, remaining) : chunk;
        target.push(Buffer.from(kept)); bytes += kept.byteLength;
        if (kept.byteLength !== chunk.byteLength) { oversized = true; terminate(); }
      };
      const observeStatus = (line: string): void => {
        try {
          const status = JSON.parse(line) as Record<string, number>; if (!status["child-pid"]) return;
          const namespaces = {
            user: status["user-namespace"] ? `user:[${status["user-namespace"]}]` : `user:[unshared-by-bwrap-${this.bwrapDigest.slice(0, 16)}]`,
            pid: `pid:[${status["pid-namespace"]}]`, ipc: `ipc:[${status["ipc-namespace"]}]`, uts: `uts:[${status["uts-namespace"]}]`,
            cgroup: `cgroup:[${status["cgroup-namespace"]}]`, network: `net:[${status["net-namespace"]}]`, mount: `mnt:[${status["mnt-namespace"]}]`,
          };
          if (namespaces.pid === systemNamespace("pid") || namespaces.network === systemNamespace("network") || namespaces.cgroup === systemNamespace("cgroup")) throw new ArborError("WRITE_CONFINEMENT_UNAVAILABLE", "Required namespace was not isolated");
          const cgroupIdentity = existsSync(`/proc/${status["child-pid"]}/cgroup`) ? readFileSync(`/proc/${status["child-pid"]}/cgroup`, "utf8") : namespaces.cgroup;
          if (request.resourceLimits) cgroup = cgroupForPid(status["child-pid"], request.resourceLimits);
          identity = { version: 1, containmentId: request.containmentId, adapter: "linux-bubblewrap", bwrapDigest: this.bwrapDigest, bwrapVersion: prerequisite.bwrapVersion, launcherPid, childPid: status["child-pid"], processGroupId: launcherPid, launcherStartTicks, namespaces, cgroupMembershipDigest: sha256(cgroupIdentity), ...(cgroup ? { resourceControl: { kind: "cgroup-v2" as const, manager: "systemd-user-service" as const, cgroupPathDigest: cgroup.pathDigest, pidsMax: cgroup.pidsMax, memoryMax: cgroup.memoryMax } } : {}), environmentDigest, mountPolicyDigest };
          releaseHandshake();
        } catch (error) { if (error instanceof ArborError) terminate(); }
      };
      child.stdout!.on("data", (chunk: Buffer) => collect(stdout, chunk));
      child.stderr!.on("data", (chunk: Buffer) => collect(stderr, chunk));
      if (!request.resourceLimits) child.stdio[3]!.on("data", (chunk: Buffer) => { statusText += chunk.toString("utf8"); const lines = statusText.split("\n"); statusText = lines.pop() ?? ""; for (const line of lines.filter(Boolean)) observeStatus(line); });
      const pollStatusFile = (): void => {
        if (!statusFile || identity || !existsSync(statusFile)) return;
        try { statusText = readFileSync(statusFile, "utf8"); for (const line of statusText.split("\n").filter(Boolean)) observeStatus(line); } catch { /* retried until process termination */ }
      };
      const sampleResources = (): void => {
        pollStatusFile(); if (terminating) return;
        if (request.resourceLimits) {
          if (!cgroup) return;
          peakProcesses = Math.max(peakProcesses, readCgroupNumber(cgroup.path, "pids.peak"), readCgroupNumber(cgroup.path, "pids.current"));
          peakRssBytes = Math.max(peakRssBytes, readCgroupNumber(cgroup.path, "memory.peak"), readCgroupNumber(cgroup.path, "memory.current"));
          if (readCgroupEvent(cgroup.path, "pids.events", "max") > 0) resourceBreach = "processes";
          if (readCgroupEvent(cgroup.path, "memory.events", "oom_kill") > 0 || readCgroupEvent(cgroup.path, "memory.events", "max") > 0) resourceBreach = "rss";
        } else {
          const usage = descendantResourceUsage(launcherPid); peakProcesses = Math.max(peakProcesses, usage.processes); peakRssBytes = Math.max(peakRssBytes, usage.rssBytes);
        }
      };
      sampleResources();
      const resourceMonitor = request.resourceLimits ? setInterval(sampleResources, 1) : undefined;
      resourceMonitor?.unref();
      const timeout = setTimeout(() => { timedOut = true; terminate(); }, request.timeoutMs);
      timeout.unref();
      const onAbort = (): void => { cancelled = true; terminate(); };
      request.signal?.addEventListener("abort", onAbort, { once: true });
      child.once("error", (error) => { clearTimeout(timeout); if (resourceMonitor) clearInterval(resourceMonitor); request.signal?.removeEventListener("abort", onAbort); if (statusFile) rmSync(statusFile, { force: true }); reject(error); });
      child.once("close", (code, signal) => {
        pollStatusFile(); sampleResources(); clearTimeout(timeout); if (resourceMonitor) clearInterval(resourceMonitor); request.signal?.removeEventListener("abort", onAbort);
        if (!identity) { if (statusFile) rmSync(statusFile, { force: true }); reject(new ArborError("WRITE_CONFINEMENT_UNAVAILABLE", "Containment identity could not be observed with certainty", { containmentId: request.containmentId, statusDigest: sha256(statusText), stderrDigest: sha256(Buffer.concat(stderr)) })); return; }
        if (statusFile) rmSync(statusFile, { force: true });
        if (scopeUnit) {
          const managerEnvironment = { PATH: "/usr/bin:/bin", LANG: "C", XDG_RUNTIME_DIR: `/run/user/${process.getuid?.() ?? -1}`, DBUS_SESSION_BUS_ADDRESS: `unix:path=/run/user/${process.getuid?.() ?? -1}/bus` };
          const properties = spawnSync("/usr/bin/systemctl", ["--user", "show", scopeUnit, "--property=Result", "--property=MemoryPeak"], { env: managerEnvironment, encoding: "utf8" });
          if (/^Result=oom-kill$/mu.test(properties.stdout ?? "")) resourceBreach = "rss";
          const managerPeak = Number(/^MemoryPeak=(\d+)$/mu.exec(properties.stdout ?? "")?.[1] ?? "0"); if (Number.isSafeInteger(managerPeak)) peakRssBytes = Math.max(peakRssBytes, managerPeak);
          spawnSync("/usr/bin/systemctl", ["--user", "reset-failed", scopeUnit], { env: managerEnvironment, stdio: "ignore" });
        }
        const rawOut = Buffer.concat(stdout); const rawErr = Buffer.concat(stderr);
        if (heldOut && computeCanonicalFilesystemDigest(heldOut.source) !== heldOut.dataDigest) { reject(new ArborError("HELD_OUT_ISOLATION_REQUIRED", "Held-out input changed before evaluator receipt")); return; }
        const cgroupEmpty = cgroupIsEmptyOrRemoved(cgroup?.path);
        if (request.resourceLimits && !cgroupEmpty) { reject(new ArborError("WRITE_CONFINEMENT_UNAVAILABLE", "Kernel cgroup remained populated after contained process exit")); return; }
        const secrets = [workspace, this.stateRoot, ...this.forbiddenHostPaths];
        resolvePromise({ version: 1, identity, exitCode: code ?? (signal ? 128 : 1), signal, stdout: sanitizeLog(rawOut, secrets), stderr: sanitizeLog(rawErr, secrets), stdoutDigest: sha256(rawOut), stderrDigest: sha256(rawErr), timedOut, cancelled, oversized, resourceUsage: { peakProcesses, peakRssBytes, breach: resourceBreach, source: request.resourceLimits ? "cgroup-v2" : "telemetry-only", cgroupEmpty }, descendantsTerminated: cgroupEmpty, observation: "certain" });
      });
    });
  }

  policyDigests(): { adapterDigest: string; mountPolicyDigest: string; environmentPolicyDigest: string } {
    return {
      adapterDigest: sha256(readFileSync(new URL(import.meta.url))),
      mountPolicyDigest: digestCanonical({ root: "empty", source: "absent", workspace: "only-writable", network: "new-namespace", devices: this.minimalDevices, executables: this.allowedExecutables.map((path) => sha256(readFileSync(path))), resourceLimits: "kernel-cgroup-v2", cgroupRunnerDigest: this.cgroupRunnerDigest }),
      environmentPolicyDigest: digestCanonical(safeEnvironment(undefined)),
    };
  }
}

export async function generateContainmentCertificate(
  adapter: LinuxBubblewrapContainmentAdapter,
  input: { certificateId: string; createdAt: string; signerId: string; matrix: ContainmentMatrixResultV1[]; limitations?: string[]; predecessorDigest?: string },
): Promise<ContainmentCertificateV1> {
  const prerequisite = await adapter.verifyPrerequisites();
  const digests = adapter.policyDigests();
  const matrixByName = new Map(input.matrix.map((entry) => [entry.name, entry]));
  const complete = REQUIRED_MATRIX.every((name) => matrixByName.get(name)?.passed === true && matrixByName.get(name)?.direct === true);
  const keyPair = generateKeyPairSync("ed25519");
  const signingPublicKey = keyPair.publicKey.export({ type: "spki", format: "der" }).toString("base64");
  const unsigned = {
    version: 1 as const, certificateId: input.certificateId, createdAt: input.createdAt, adapter: "linux-bubblewrap" as const,
    platform: { os: platform(), architecture: arch(), release: release(), node: process.version },
    bwrapVersion: prerequisite.bwrapVersion, bwrapDigest: adapter.bwrapDigest, ...digests,
    cgroupVersion: "v2" as const, cgroupRunnerDigest: adapter.cgroupRunnerDigest, resourceLimitEnforcement: "kernel-cgroup-v2" as const,
    requiredNamespaces: ["user", "pid", "ipc", "uts", "cgroup", "network", "mount"], minimalDevices: [...adapter.minimalDevices], matrix: [...input.matrix].sort((a, b) => a.name.localeCompare(b.name)),
    limitations: [...(input.limitations ?? [])], ...(input.predecessorDigest ? { predecessorDigest: input.predecessorDigest } : {}), signerId: input.signerId, signingAlgorithm: "Ed25519" as const, signingPublicKey, valid: complete,
  };
  const payloadDigest = digestCanonical(unsigned); const signature = sign(null, Buffer.from(payloadDigest, "hex"), keyPair.privateKey).toString("base64");
  return { ...unsigned, payloadDigest, signature, certificateDigest: digestCanonical({ ...unsigned, payloadDigest, signature }) };
}

export function verifyContainmentCertificate(certificate: ContainmentCertificateV1): boolean {
  const { certificateDigest, payloadDigest, signature, ...unsigned } = certificate;
  const matrix = new Map(certificate.matrix.map((entry) => [entry.name, entry]));
  try {
    return certificate.cgroupVersion === "v2" && certificate.resourceLimitEnforcement === "kernel-cgroup-v2" && /^[0-9a-f]{64}$/u.test(certificate.cgroupRunnerDigest) && payloadDigest === digestCanonical(unsigned) && certificateDigest === digestCanonical({ ...unsigned, payloadDigest, signature }) && verify(null, Buffer.from(payloadDigest, "hex"), createPublicKey({ key: Buffer.from(certificate.signingPublicKey, "base64"), format: "der", type: "spki" }), Buffer.from(signature, "base64")) && certificate.valid === REQUIRED_MATRIX.every((name) => matrix.get(name)?.passed === true && matrix.get(name)?.direct === true);
  } catch { return false; }
}

export const CONTAINMENT_REQUIRED_MATRIX_V1 = REQUIRED_MATRIX;
