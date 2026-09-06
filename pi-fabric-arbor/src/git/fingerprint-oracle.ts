import { existsSync, lstatSync, readFileSync, readlinkSync, realpathSync, statfsSync } from "node:fs";
import { opendir } from "node:fs/promises";
import { dirname, join, relative, resolve, sep } from "node:path";
import { ArborError } from "../domain/errors.js";
import { sha256 } from "../util/canonical.js";
import { assertSafeRelativePath, git } from "./git-process.js";
import type { FingerprintCaptureOptionsV1, FingerprintCommandOutputV1, FingerprintFileV1, FingerprintWorktreeV1, RepositoryFingerprintManifestV1 } from "./fingerprint.js";

const ORACLE_SCHEMA_DIGEST = sha256("pi-fabric-arbor.repository-fingerprint-manifest.v1");
export const REPOSITORY_FINGERPRINT_ORACLE_TOOL_DIGEST_V1 = sha256(readFileSync(new URL(import.meta.url)));

function oracleOutput(name: string, bytes: Buffer): FingerprintCommandOutputV1 { return { name, bytes: bytes.byteLength, digest: sha256(bytes), base64: bytes.toString("base64") }; }

function oracleMount(path: string): { mountId: string; mountPoint: string; mountRoot: string } {
  const target = realpathSync(path); let match: { mountId: string; mountPoint: string; mountRoot: string } | undefined;
  for (const row of readFileSync("/proc/self/mountinfo", "utf8").split("\n")) {
    const columns = row.split(" "); const point = columns[4]?.replace(/\\040/gu, " "); const root = columns[3]?.replace(/\\040/gu, " ");
    if (point && root !== undefined && (target === point || target.startsWith(`${point.replace(/\/$/u, "")}/`)) && (!match || point.length > match.mountPoint.length)) match = { mountId: columns[0]!, mountPoint: point, mountRoot: root };
  }
  if (!match) throw new ArborError("INDETERMINATE", "Oracle could not resolve repository mount"); return match;
}

function oracleFile(root: string, path: string, display?: string): FingerprintFileV1 {
  const name = display ?? (relative(root, path).split(sep).join("/") || ".");
  if (!existsSync(path)) return { path: name, type: "missing", mode: 0, executable: false, size: "0", device: "0", inode: "0", uid: "0", gid: "0", linkCount: "0", mtimeNs: "0", ctimeNs: "0" };
  const stat = lstatSync(path, { bigint: true }); const type = stat.isFile() ? "file" : stat.isDirectory() ? "directory" : stat.isSymbolicLink() ? "symlink" : "other";
  const target = type === "symlink" ? readlinkSync(path, "utf8") : undefined; const digest = type === "file" ? sha256(readFileSync(path)) : target === undefined ? undefined : sha256(target);
  return { path: name, type, mode: Number(stat.mode & 0o7777n), executable: (stat.mode & 0o111n) !== 0n, size: stat.size.toString(), ...(digest ? { digest } : {}), ...(target === undefined ? {} : { symlinkTarget: target }), device: stat.dev.toString(), inode: stat.ino.toString(), uid: stat.uid.toString(), gid: stat.gid.toString(), linkCount: stat.nlink.toString(), mtimeNs: stat.mtimeNs.toString(), ctimeNs: stat.ctimeNs.toString() };
}

async function oracleWalk(root: string, maximumEntries: number, maximumFileBytes: number, maximumTotalBytes: number): Promise<FingerprintFileV1[]> {
  const paths: string[] = [];
  const visit = async (directory: string): Promise<void> => {
    const names: string[] = []; const handle = await opendir(directory); for await (const entry of handle) names.push(entry.name);
    for (const name of names.sort()) { const path = join(directory, name); paths.push(path); if (lstatSync(path).isDirectory()) await visit(path); }
  };
  await visit(root); if (paths.length > maximumEntries) throw new ArborError("INDETERMINATE", "Oracle entry bound exceeded");
  let total = 0;
  return paths.map((path) => { const record = oracleFile(root, path); const bytes = Number(BigInt(record.size)); if (bytes > maximumFileBytes) throw new ArborError("INDETERMINATE", "Oracle file bound exceeded"); total += bytes; if (total > maximumTotalBytes) throw new ArborError("INDETERMINATE", "Oracle total bound exceeded"); return record; });
}

function oracleIndex(bytes: Buffer, hashBytes: 20 | 32): { version: number | null; entryCount: number | null; extensions: Array<{ signature: string; bytes: number; digest: string }> } {
  if (bytes.byteLength < 12 + hashBytes || bytes.toString("ascii", 0, 4) !== "DIRC") return { version: null, entryCount: null, extensions: [] };
  const version = bytes.readUInt32BE(4); const entryCount = bytes.readUInt32BE(8); if (version < 2 || version > 4) return { version, entryCount, extensions: [] }; let offset = 12;
  for (let count = 0; count < entryCount; count += 1) {
    const start = offset; if (offset + 42 + hashBytes > bytes.byteLength - hashBytes) return { version, entryCount, extensions: [] };
    const flags = bytes.readUInt16BE(offset + 40 + hashBytes); offset += 42 + hashBytes; if ((flags & 0x4000) !== 0) offset += 2;
    if (version === 4) { while (offset < bytes.byteLength && (bytes[offset]! & 0x80) !== 0) offset += 1; offset += 1; while (offset < bytes.byteLength && bytes[offset] !== 0) offset += 1; offset += 1; }
    else { while (offset < bytes.byteLength && bytes[offset] !== 0) offset += 1; offset += 1; offset = start + Math.ceil((offset - start) / 8) * 8; }
  }
  const extensions: Array<{ signature: string; bytes: number; digest: string }> = []; const limit = bytes.byteLength - hashBytes;
  while (offset + 8 <= limit) { const signature = bytes.toString("ascii", offset, offset + 4); const length = bytes.readUInt32BE(offset + 4); offset += 8; if (offset + length > limit) return { version, entryCount, extensions: [] }; const payload = bytes.subarray(offset, offset + length); extensions.push({ signature, bytes: length, digest: sha256(payload) }); offset += length; }
  return { version, entryCount, extensions };
}

async function oracleWorktree(path: string, token: string, stateRoot: string, hashBytes: 20 | 32): Promise<FingerprintWorktreeV1> {
  const root = realpathSync(path); const stat = lstatSync(root, { bigint: true }); const filesystem = statfsSync(root, { bigint: true });
  const symbolic = (await git(["-C", root, "symbolic-ref", "-q", "HEAD"], { stateRoot, maxOutputBytes: 4096 }).catch(() => Buffer.alloc(0))).toString("utf8").trim() || null;
  const oid = (await git(["-C", root, "rev-parse", "--verify", "HEAD"], { stateRoot, maxOutputBytes: 4096 }).catch(() => Buffer.alloc(0))).toString("utf8").trim() || null;
  const indexPath = resolve((await git(["-C", root, "rev-parse", "--path-format=absolute", "--git-path", "index"], { stateRoot, maxOutputBytes: 4096 })).toString("utf8").trim()); const indexBytes = existsSync(indexPath) ? readFileSync(indexPath) : Buffer.alloc(0);
  const status = await git(["-C", root, "--no-optional-locks", "status", "--porcelain=v2", "-z", "--branch", "--untracked-files=all"], { stateRoot }); const stages = await git(["-C", root, "--no-optional-locks", "ls-files", "--stage", "-z"], { stateRoot });
  const names = async (args: string[]): Promise<string[]> => (await git(["-C", root, "--no-optional-locks", "ls-files", ...args, "-z"], { stateRoot })).toString("utf8").split("\0").filter(Boolean).sort();
  const tracked = await names([]); const untracked = await names(["--others", "--exclude-standard"]); [...tracked, ...untracked].forEach(assertSafeRelativePath);
  return { token, identity: { realpath: root, device: stat.dev.toString(), inode: stat.ino.toString(), filesystemType: filesystem.type.toString(), filesystemBlockSize: filesystem.bsize.toString(), ...oracleMount(root) }, head: { symbolic, state: symbolic ? (oid ? "branch" : "unborn") : "detached", oid }, index: { path: indexPath, present: existsSync(indexPath), bytes: indexBytes.byteLength, digest: sha256(indexBytes), ...oracleIndex(indexBytes, hashBytes), ...(existsSync(indexPath) ? { metadata: oracleFile(dirname(indexPath), indexPath, "index") } : {}) }, status: oracleOutput("statusPorcelainV2", status), stages: oracleOutput("indexStages", stages), tracked: tracked.map((name) => oracleFile(root, join(root, name), name)), untracked: untracked.map((name) => oracleFile(root, join(root, name), name)) };
}

export async function captureRepositoryFingerprintOracleV1(options: FingerprintCaptureOptionsV1): Promise<RepositoryFingerprintManifestV1> {
  const checkout = realpathSync(options.checkout); const stateRoot = realpathSync(options.stateRoot); const common = realpathSync((await git(["-C", checkout, "rev-parse", "--path-format=absolute", "--git-common-dir"], { stateRoot })).toString("utf8").trim());
  const hashBytes: 20 | 32 = (await git(["-C", checkout, "rev-parse", "--show-object-format"], { stateRoot, maxOutputBytes: 4096 })).toString("utf8").trim() === "sha256" ? 32 : 20;
  const worktrees = await git(["-C", checkout, "worktree", "list", "--porcelain", "-z"], { stateRoot }); const paths = worktrees.toString("utf8").split("\0").filter((value) => value.startsWith("worktree ")).map((value) => value.slice(9));
  const siblings: FingerprintWorktreeV1[] = []; for (const [index, path] of paths.filter((path) => realpathSync(path) !== checkout).sort().entries()) siblings.push(await oracleWorktree(path, `sibling_${index + 1}`, stateRoot, hashBytes));
  const refs = await git(["-C", checkout, "for-each-ref", "--format=%(refname)%00%(objectname)%00%(objecttype)%00%(symref)%00"], { stateRoot }); const reflogs = await git(["-C", checkout, "reflog", "show", "--all", "--date=raw", "--format=%gd%x00%H%x00%gD%x00%gs%x00"], { stateRoot }).catch(() => Buffer.alloc(0));
  const stashRef = await git(["-C", checkout, "rev-parse", "--verify", "refs/stash"], { stateRoot, maxOutputBytes: 4096 }).catch(() => Buffer.alloc(0)); const stashReflog = await git(["-C", checkout, "reflog", "show", "refs/stash", "--date=raw", "--format=%gd%x00%H%x00%gs%x00"], { stateRoot }).catch(() => Buffer.alloc(0)); const stashList = await git(["-C", checkout, "stash", "list", "--format=%gd%x00%H%x00%gs%x00"], { stateRoot }).catch(() => Buffer.alloc(0));
  return { version: 1, schemaDigest: ORACLE_SCHEMA_DIGEST, source: await oracleWorktree(checkout, "source", stateRoot, hashBytes), refs: oracleOutput("allRefs", refs), reflogs: oracleOutput("allReflogs", reflogs), stash: { ref: oracleOutput("stashRef", stashRef), reflog: oracleOutput("stashReflog", stashReflog), list: oracleOutput("stashList", stashList) }, packedRefs: oracleFile(common, join(common, "packed-refs"), "packed-refs"), commonDirectory: { identity: oracleFile(dirname(common), common, "common-directory"), inventory: await oracleWalk(common, options.maxEntries ?? 100_000, options.maxFileBytes ?? 1_073_741_824, options.maxTotalBytes ?? 4_294_967_296) }, worktreeRegistration: oracleOutput("worktreeRegistration", worktrees), siblings, toolDigest: REPOSITORY_FINGERPRINT_ORACLE_TOOL_DIGEST_V1 };
}
