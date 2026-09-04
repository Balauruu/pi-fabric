import { spawnSync } from "node:child_process";
import { constants, closeSync, existsSync, fstatSync, lstatSync, mkdirSync, openSync, readFileSync, readlinkSync, readdirSync, realpathSync, symlinkSync, writeFileSync, type Stats } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { ArborError } from "../domain/errors.js";
import { digestCanonical, sha256 } from "../util/canonical.js";
import { assertSafeRelativePath, git, sanitizedGitEnvironment } from "./git-process.js";

export interface CommittedTreeEntryV1 {
  path: string;
  mode: "100644" | "100755" | "120000";
  type: "file" | "symlink";
  oid: string;
  bytes: number;
  contentDigest: string;
}

export interface WorkspaceTreeEntryV1 {
  path: string;
  mode: "100644" | "100755" | "120000";
  type: "file" | "symlink";
  bytes: number;
  contentDigest: string;
  symlinkTarget?: string;
}

export interface ExactWorkspaceManifestV1 {
  version: 1;
  oid: string;
  entries: WorkspaceTreeEntryV1[];
  manifestDigest: string;
}

const MAX_ENTRIES = 200_000;
const MAX_FILE_BYTES = 16_777_216;
const MAX_TREE_BYTES = 4_294_967_296;

function parseNul(buffer: Buffer): string[] {
  const values = buffer.toString("utf8").split("\0");
  if (values.at(-1) === "") values.pop();
  return values;
}

function assertNotGitControlPath(path: string): void {
  if (path.split("/").some((part) => part.toLowerCase() === ".git")) throw new ArborError("EVIDENCE_INVALID", "A worker export must never contain a Git control path", { path });
}

function assertStableIdentity(before: Stats, after: Stats, path: string): void {
  if (before.dev !== after.dev || before.ino !== after.ino || before.mode !== after.mode || before.size !== after.size || before.mtimeMs !== after.mtimeMs || before.ctimeMs !== after.ctimeMs) {
    throw new ArborError("EVIDENCE_INVALID", "Workspace entry changed during exact-byte validation", { path });
  }
}

export function readRegularFileNoFollow(path: string, expected: Stats): Buffer {
  const fd = openSync(path, constants.O_RDONLY | constants.O_NOFOLLOW);
  try {
    const opened = fstatSync(fd);
    assertStableIdentity(expected, opened, path);
    if (!opened.isFile() || opened.size > MAX_FILE_BYTES) throw new ArborError("EVIDENCE_INVALID", "Workspace file is not a bounded regular file", { path });
    const bytes = readFileSync(fd);
    const after = fstatSync(fd);
    assertStableIdentity(opened, after, path);
    return bytes;
  } finally { closeSync(fd); }
}

export function readWorkspaceEntryBytes(workspace: string, entry: WorkspaceTreeEntryV1): Buffer {
  const full = join(realpathSync(resolve(workspace)), entry.path);
  const stat = lstatSync(full);
  if (entry.type === "symlink") {
    if (!stat.isSymbolicLink()) throw new ArborError("EVIDENCE_INVALID", "Workspace entry type changed after manifest validation", { path: entry.path });
    const target = readlinkSync(full, "utf8");
    const after = lstatSync(full); assertStableIdentity(stat, after, entry.path);
    const bytes = Buffer.from(target, "utf8");
    if (sha256(bytes) !== entry.contentDigest) throw new ArborError("EVIDENCE_INVALID", "Workspace symlink changed after manifest validation", { path: entry.path });
    return bytes;
  }
  if (!stat.isFile() || stat.isSymbolicLink()) throw new ArborError("EVIDENCE_INVALID", "Workspace entry type changed after manifest validation", { path: entry.path });
  const bytes = readRegularFileNoFollow(full, stat);
  if (sha256(bytes) !== entry.contentDigest) throw new ArborError("EVIDENCE_INVALID", "Workspace file changed after manifest validation", { path: entry.path });
  return bytes;
}

export function readWorkspaceTreeManifest(workspace: string): WorkspaceTreeEntryV1[] {
  const root = realpathSync(resolve(workspace));
  if (root !== resolve(workspace)) throw new ArborError("EVIDENCE_INVALID", "Workspace root symlinks are prohibited");
  const rootStat = lstatSync(root);
  if (!rootStat.isDirectory() || rootStat.isSymbolicLink()) throw new ArborError("EVIDENCE_INVALID", "Workspace root is not a real directory");
  const entries: WorkspaceTreeEntryV1[] = [];
  let totalBytes = 0;
  const visit = (directory: string): void => {
    const beforeDirectory = lstatSync(directory);
    if (!beforeDirectory.isDirectory() || beforeDirectory.isSymbolicLink()) throw new ArborError("EVIDENCE_INVALID", "Workspace directory was substituted", { path: relative(root, directory) });
    for (const name of readdirSync(directory).sort()) {
      const full = join(directory, name);
      const path = relative(root, full).split(sep).join("/");
      assertSafeRelativePath(path); assertNotGitControlPath(path);
      const stat = lstatSync(full);
      if (stat.isDirectory() && !stat.isSymbolicLink()) { visit(full); continue; }
      if (entries.length >= MAX_ENTRIES) throw new ArborError("EVIDENCE_INVALID", "Workspace tree exceeds its entry bound");
      if (stat.isSymbolicLink()) {
        const target = readlinkSync(full, "utf8");
        const after = lstatSync(full); assertStableIdentity(stat, after, path);
        if (target.startsWith("/") || target.split("/").includes("..") || Buffer.byteLength(target, "utf8") > 4096) throw new ArborError("EVIDENCE_INVALID", "Candidate symlink can escape the workspace", { path });
        const bytes = Buffer.from(target, "utf8"); totalBytes += bytes.byteLength;
        entries.push({ path, mode: "120000", type: "symlink", bytes: bytes.byteLength, contentDigest: sha256(bytes), symlinkTarget: target });
      } else if (stat.isFile()) {
        if (stat.nlink !== 1) throw new ArborError("EVIDENCE_INVALID", "Workspace files must not be hard-linked", { path });
        if ((stat.mode & 0o7000) !== 0) throw new ArborError("EVIDENCE_INVALID", "Workspace file has a privileged mode", { path });
        const bytes = readRegularFileNoFollow(full, stat); totalBytes += bytes.byteLength;
        entries.push({ path, mode: (stat.mode & 0o111) === 0 ? "100644" : "100755", type: "file", bytes: bytes.byteLength, contentDigest: sha256(bytes) });
      } else throw new ArborError("EVIDENCE_INVALID", "Workspace contains an unsupported filesystem entry", { path });
      if (totalBytes > MAX_TREE_BYTES) throw new ArborError("EVIDENCE_INVALID", "Workspace tree exceeds its byte bound");
    }
    const afterDirectory = lstatSync(directory); assertStableIdentity(beforeDirectory, afterDirectory, relative(root, directory) || ".");
  };
  visit(root);
  return entries.sort((left, right) => left.path.localeCompare(right.path));
}

function parseCommittedRows(rows: string[], readBlob: (oid: string) => Buffer): CommittedTreeEntryV1[] {
  const entries: CommittedTreeEntryV1[] = []; let totalBytes = 0;
  for (const row of rows) {
    if (entries.length >= MAX_ENTRIES) throw new ArborError("EVIDENCE_INVALID", "Committed tree exceeds its entry bound");
    const tab = row.indexOf("\t"); const [mode, objectType, objectOid] = row.slice(0, tab).split(" "); const path = row.slice(tab + 1);
    if (tab < 0 || !mode || objectType !== "blob" || !objectOid || !["100644", "100755", "120000"].includes(mode)) throw new ArborError("EVIDENCE_INVALID", "Committed tree contains an unsupported entry");
    assertSafeRelativePath(path); assertNotGitControlPath(path); const bytes = readBlob(objectOid); totalBytes += bytes.byteLength;
    if (bytes.byteLength > MAX_FILE_BYTES || totalBytes > MAX_TREE_BYTES) throw new ArborError("EVIDENCE_INVALID", "Committed tree exceeds its byte bound");
    entries.push({ path, mode: mode as CommittedTreeEntryV1["mode"], type: mode === "120000" ? "symlink" : "file", oid: objectOid, bytes: bytes.byteLength, contentDigest: sha256(bytes) });
  }
  return entries.sort((left, right) => left.path.localeCompare(right.path));
}

function trustedGitSync(privateGitDir: string, stateRoot: string, args: string[]): Buffer {
  const result = spawnSync("/usr/bin/git", [`--git-dir=${privateGitDir}`, ...args], { env: sanitizedGitEnvironment(stateRoot), encoding: null, maxBuffer: MAX_FILE_BYTES, timeout: 120_000 });
  if (result.error || result.status !== 0) throw new ArborError("EVIDENCE_INVALID", "Trusted committed-object inspection failed", { exitCode: result.status ?? -1, stderrDigest: sha256(Buffer.from(result.stderr ?? "")) });
  return Buffer.from(result.stdout ?? "");
}

export function readCommittedTreeManifestSync(privateGitDir: string, oid: string, stateRoot: string): CommittedTreeEntryV1[] {
  const rows = parseNul(trustedGitSync(privateGitDir, stateRoot, ["ls-tree", "-rz", "-r", "--full-tree", oid]));
  return parseCommittedRows(rows, (objectOid) => trustedGitSync(privateGitDir, stateRoot, ["cat-file", "blob", objectOid]));
}

export function validateExactCommittedWorkspaceSync(input: { workspace: string; privateGitDir: string; oid: string; stateRoot: string }): ExactWorkspaceManifestV1 {
  const committed = readCommittedTreeManifestSync(input.privateGitDir, input.oid, input.stateRoot); const workspace = readWorkspaceTreeManifest(input.workspace);
  const expected = committed.map(({ path, mode, type, bytes, contentDigest }) => ({ path, mode, type, bytes, contentDigest }));
  if (digestCanonical(workspace.map(({ symlinkTarget: _, ...entry }) => entry)) !== digestCanonical(expected)) throw new ArborError("EVIDENCE_INVALID", "Evaluator workspace bytes do not exactly equal the committed OID");
  return Object.freeze({ version: 1, oid: input.oid, entries: workspace, manifestDigest: digestCanonical({ oid: input.oid, entries: expected }) });
}

export async function readCommittedTreeManifest(privateGitDir: string, oid: string, stateRoot: string): Promise<CommittedTreeEntryV1[]> {
  const rows = parseNul(await git([`--git-dir=${privateGitDir}`, "ls-tree", "-rz", "-r", "--full-tree", oid], { stateRoot }, "Read trusted committed tree"));
  const blobs = new Map<string, Buffer>();
  for (const row of rows) { const tab = row.indexOf("\t"); const objectOid = row.slice(0, tab).split(" ")[2]; if (objectOid && !blobs.has(objectOid)) blobs.set(objectOid, await git([`--git-dir=${privateGitDir}`, "cat-file", "blob", objectOid], { stateRoot, maxOutputBytes: MAX_FILE_BYTES }, "Read trusted committed blob")); }
  return parseCommittedRows(rows, (objectOid) => { const bytes = blobs.get(objectOid); if (!bytes) throw new ArborError("EVIDENCE_INVALID", "Committed blob inspection was incomplete"); return bytes; });
}

export async function validateExactCommittedWorkspace(input: { workspace: string; privateGitDir: string; oid: string; stateRoot: string }): Promise<ExactWorkspaceManifestV1> {
  const committed = await readCommittedTreeManifest(input.privateGitDir, input.oid, input.stateRoot);
  const workspace = readWorkspaceTreeManifest(input.workspace);
  const expected = committed.map(({ path, mode, type, bytes, contentDigest }) => ({ path, mode, type, bytes, contentDigest }));
  if (digestCanonical(workspace.map(({ symlinkTarget: _, ...entry }) => entry)) !== digestCanonical(expected)) {
    throw new ArborError("EVIDENCE_INVALID", "Evaluator workspace bytes do not exactly equal the committed OID");
  }
  return Object.freeze({ version: 1, oid: input.oid, entries: workspace, manifestDigest: digestCanonical({ oid: input.oid, entries: expected }) });
}

export async function exportCommittedTree(input: { privateGitDir: string; oid: string; stateRoot: string; destination: string }): Promise<ExactWorkspaceManifestV1> {
  const destination = resolve(input.destination);
  if (existsSync(destination) && readdirSync(destination).length !== 0) throw new ArborError("EVIDENCE_INVALID", "Committed export destination is not empty");
  mkdirSync(destination, { recursive: true, mode: 0o700 });
  const committed = await readCommittedTreeManifest(input.privateGitDir, input.oid, input.stateRoot);
  for (const entry of committed) {
    const full = join(destination, entry.path);
    mkdirSync(dirname(full), { recursive: true, mode: 0o700 });
    const bytes = await git([`--git-dir=${input.privateGitDir}`, "cat-file", "blob", entry.oid], { stateRoot: input.stateRoot, maxOutputBytes: MAX_FILE_BYTES }, "Export trusted committed blob");
    if (sha256(bytes) !== entry.contentDigest) throw new ArborError("EVIDENCE_INVALID", "Committed blob changed during export", { path: entry.path });
    if (entry.type === "symlink") {
      const target = bytes.toString("utf8");
      if (target.startsWith("/") || target.split("/").includes("..")) throw new ArborError("EVIDENCE_INVALID", "Committed symlink can escape its export", { path: entry.path });
      symlinkSync(target, full);
    } else writeFileSync(full, bytes, { mode: entry.mode === "100755" ? 0o755 : 0o644, flag: "wx" });
  }
  return validateExactCommittedWorkspace({ workspace: destination, privateGitDir: input.privateGitDir, oid: input.oid, stateRoot: input.stateRoot });
}
