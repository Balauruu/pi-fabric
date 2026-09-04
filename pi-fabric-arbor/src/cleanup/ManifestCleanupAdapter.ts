import { createPrivateKey, createPublicKey, generateKeyPairSync, sign, verify } from "node:crypto";
import { constants } from "node:fs";
import { chmod, lstat, mkdir, open, readdir, readFile, realpath, writeFile } from "node:fs/promises";
import { join, relative, resolve, sep } from "node:path";
import type { CleanupAdapter, CleanupExecutionRequestV1 } from "../adapters/interfaces.js";
import { ArborError } from "../domain/errors.js";
import type { ArborId, Sha256 } from "../domain/types.js";
import { canonicalJson, digestCanonical, sha256 } from "../util/canonical.js";
import { runProcess } from "../system/process.js";

const ID = /^[a-z][a-z0-9_]{2,63}$/u;
const DIGEST = /^[0-9a-f]{64}$/u;
const RELATIVE = /^(?!\/)(?!.*(?:^|\/)\.\.?\/)(?!.*\\)(?!.*\0)[^/]+(?:\/[^/]+)*$/u;
const PROTECTED = /(?:^|\/)(?:authority\.sqlite3(?:-(?:wal|shm))?|private\.git|certification|authorization|cleanup-manifests|\.cleanup-quarantine|reports\/[^/]+\/generations)(?:\/|$)/u;
const MAX_ENTRIES = 10_000;
const ZERO_DIGEST = "0".repeat(64);

export interface CleanupManifestEntryV1 {
  version: 1;
  relativePath: string;
  type: "file" | "directory";
  expectedDigest: Sha256;
  expectedIdentity: { device: string; inode: string; mode: number; size: number };
}

export interface CleanupManifestV1 {
  version: 1;
  cleanupId: ArborId;
  resourceId: ArborId;
  resourceKind: CleanupExecutionRequestV1["resourceKind"];
  runId: ArborId;
  effectId: ArborId;
  resourceRoot: string;
  rootIdentity: { device: string; inode: string };
  entries: CleanupManifestEntryV1[];
  chainSequence: number;
  predecessorManifestDigest: Sha256;
  signerId: ArborId;
  signingPublicKey: string;
  deleterDigest: Sha256;
  payloadDigest: Sha256;
  signature: string;
  manifestDigest: Sha256;
}

export interface CleanupManifestPlanV1 {
  version: 1;
  cleanupId: ArborId;
  resourceId: ArborId;
  resourceKind: CleanupExecutionRequestV1["resourceKind"];
  runId: ArborId;
  effectId: ArborId;
  resourceRoot: string;
  relativePaths: string[];
}

interface TreeEntryV1 { path: string; type: "file" | "directory"; mode: number; digest?: string }
interface AtomicDeleteResponseV1 { version: 1; status: "deleted" | "absent" | "identity-mismatch" | "unsupported-atomic-type" | "invalid" | "indeterminate"; restored?: boolean }

function payload(manifest: CleanupManifestV1): Omit<CleanupManifestV1, "manifestDigest" | "payloadDigest" | "signature"> {
  const { manifestDigest: _, payloadDigest: _p, signature: _s, ...value } = manifest; return value;
}

async function digestTree(root: string): Promise<string> {
  const entries: TreeEntryV1[] = [];
  async function walk(directory: string): Promise<void> {
    const children = await readdir(directory, { withFileTypes: true }); children.sort((left, right) => Buffer.compare(Buffer.from(left.name), Buffer.from(right.name)));
    for (const child of children) {
      if (entries.length >= MAX_ENTRIES) throw new ArborError("VALIDATION_FAILED", "Cleanup tree exceeds the manifest entry bound");
      const path = join(directory, child.name); const value = await lstat(path); const name = relative(root, path).split(sep).join("/");
      if (value.isSymbolicLink()) throw new ArborError("VALIDATION_FAILED", "Cleanup refuses a symlink in a recorded tree");
      if (value.isDirectory()) { entries.push({ path: name, type: "directory", mode: value.mode & 0o7777 }); await walk(path); }
      else if (value.isFile()) entries.push({ path: name, type: "file", mode: value.mode & 0o7777, digest: sha256(await readFile(path)) });
      else throw new ArborError("VALIDATION_FAILED", "Cleanup refuses a non-file resource");
    }
  }
  await walk(root); entries.sort((left, right) => Buffer.compare(Buffer.from(left.path), Buffer.from(right.path))); return digestCanonical(entries);
}

function verifyManifestSignature(manifest: CleanupManifestV1, expectedPublicKey?: string): boolean {
  try {
    const unsigned = payload(manifest); const payloadDigest = digestCanonical(unsigned);
    return manifest.payloadDigest === payloadDigest && manifest.manifestDigest === digestCanonical({ ...unsigned, payloadDigest, signature: manifest.signature })
      && (!expectedPublicKey || manifest.signingPublicKey === expectedPublicKey)
      && verify(null, Buffer.from(payloadDigest, "hex"), createPublicKey({ key: Buffer.from(manifest.signingPublicKey, "base64"), format: "der", type: "spki" }), Buffer.from(manifest.signature, "base64"));
  } catch { return false; }
}

export class ManifestCleanupAdapter implements CleanupAdapter {
  readonly #stateRoot: string;
  readonly #manifestRoot: string;
  readonly #rootDevice: bigint;
  readonly #rootInode: bigint;
  readonly #privateKey: ReturnType<typeof createPrivateKey>;
  readonly #publicKey: string;
  readonly #signerId: string;
  readonly #deleterPath: string;
  readonly #deleterDigest: string;
  readonly #beforeAtomicDelete: ((entry: CleanupManifestEntryV1) => void | Promise<void>) | undefined;

  private constructor(input: { stateRoot: string; rootDevice: bigint; rootInode: bigint; privateKey: ReturnType<typeof createPrivateKey>; publicKey: string; deleterPath: string; beforeAtomicDelete?: (entry: CleanupManifestEntryV1) => void | Promise<void> }) {
    this.#stateRoot = input.stateRoot; this.#manifestRoot = join(input.stateRoot, "cleanup-manifests"); this.#rootDevice = input.rootDevice; this.#rootInode = input.rootInode;
    this.#privateKey = input.privateKey; this.#publicKey = input.publicKey; this.#signerId = `cleanup_${sha256(input.publicKey).slice(0, 24)}`;
    this.#deleterPath = input.deleterPath; this.#deleterDigest = sha256(requireRegularFile(input.deleterPath)); this.#beforeAtomicDelete = input.beforeAtomicDelete;
  }

  static async open(stateRoot: string, options: { beforeAtomicDelete?: (entry: CleanupManifestEntryV1) => void | Promise<void>; deleterPath?: string } = {}): Promise<ManifestCleanupAdapter> {
    const canonical = await realpath(resolve(stateRoot)); const rootStat = await lstat(canonical, { bigint: true });
    if (!rootStat.isDirectory() || rootStat.isSymbolicLink() || (rootStat.mode & 0o077n) !== 0n || (process.getuid && rootStat.uid !== BigInt(process.getuid()))) throw new ArborError("VALIDATION_FAILED", "Cleanup state root must be an owner-only package directory");
    const manifestRoot = join(canonical, "cleanup-manifests"); await mkdir(manifestRoot, { recursive: true, mode: 0o700 }); await chmod(manifestRoot, 0o700);
    const keyPath = join(manifestRoot, "cleanup-authority.ed25519.pk8"); let privateBytes: Buffer;
    try { privateBytes = await safeReadFile(keyPath, 4096); }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      const pair = generateKeyPairSync("ed25519"); privateBytes = pair.privateKey.export({ format: "der", type: "pkcs8" }); await writeFile(keyPath, privateBytes, { mode: 0o600, flag: "wx" });
    }
    await chmod(keyPath, 0o600); const privateKey = createPrivateKey({ key: privateBytes, format: "der", type: "pkcs8" }); const publicKey = createPublicKey(privateKey as never).export({ format: "der", type: "spki" }).toString("base64");
    const deleterPath = realpathFromUrl(options.deleterPath ?? new URL("../../../scripts/atomic-cleanup.py", import.meta.url));
    return new ManifestCleanupAdapter({ stateRoot: canonical, rootDevice: rootStat.dev, rootInode: rootStat.ino, privateKey, publicKey, deleterPath, ...(options.beforeAtomicDelete ? { beforeAtomicDelete: options.beforeAtomicDelete } : {}) });
  }

  async plan(input: CleanupManifestPlanV1): Promise<CleanupManifestV1> {
    this.#validatePlanIdentity(input); const path = join(this.#manifestRoot, `${input.resourceId}.v1.json`); this.#assertContained(path);
    try {
      const existing = await this.#readManifest(input.resourceId);
      if (existing.cleanupId !== input.cleanupId || existing.runId !== input.runId || existing.effectId !== input.effectId || existing.resourceKind !== input.resourceKind || existing.resourceRoot !== input.resourceRoot || digestCanonical(existing.entries.map((entry) => entry.relativePath)) !== digestCanonical([...input.relativePaths].sort())) throw new ArborError("VALIDATION_FAILED", "Existing cleanup manifest conflicts with the planned effect");
      return existing;
    } catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; }
    const rootIdentity = { device: this.#rootDevice.toString(), inode: this.#rootInode.toString() };
    const entries: CleanupManifestEntryV1[] = [];
    for (const relativePath of [...input.relativePaths].sort()) {
      this.#validateEntryPath(relativePath, input.resourceRoot); const full = resolve(this.#stateRoot, relativePath); const value = await lstat(full, { bigint: true });
      if (value.isSymbolicLink() || (!value.isFile() && !value.isDirectory())) throw new ArborError("VALIDATION_FAILED", "Cleanup planning refuses a symlink or special resource");
      const expectedDigest = value.isFile() ? sha256(await readFile(full)) : await digestTree(full);
      entries.push({ version: 1, relativePath, type: value.isFile() ? "file" : "directory", expectedDigest, expectedIdentity: { device: value.dev.toString(), inode: value.ino.toString(), mode: Number(value.mode & 0o7777n), size: Number(value.size) } });
    }
    this.#validateEntries(entries);
    const chain = await this.#chainHead(input.runId); const unsigned = { version: 1 as const, cleanupId: input.cleanupId, resourceId: input.resourceId, resourceKind: input.resourceKind, runId: input.runId, effectId: input.effectId, resourceRoot: input.resourceRoot, rootIdentity, entries, chainSequence: chain.sequence + 1, predecessorManifestDigest: chain.digest, signerId: this.#signerId, signingPublicKey: this.#publicKey, deleterDigest: this.#deleterDigest };
    const payloadDigest = digestCanonical(unsigned); const signature = sign(null, Buffer.from(payloadDigest, "hex"), this.#privateKey).toString("base64"); const manifest: CleanupManifestV1 = { ...unsigned, payloadDigest, signature, manifestDigest: digestCanonical({ ...unsigned, payloadDigest, signature }) };
    await writeFile(path, `${canonicalJson(manifest)}\n`, { encoding: "utf8", mode: 0o600, flag: "wx" }); return Object.freeze(structuredClone(manifest));
  }

  async execute(request: CleanupExecutionRequestV1): Promise<{ version: 1; cleanupId: ArborId; outcome: "completed" | "pending" | "indeterminate" }> {
    if (request.version !== 1 || !ID.test(request.cleanupId) || !ID.test(request.resourceId) || !ID.test(request.runId) || !ID.test(request.effectId)) throw new ArborError("VALIDATION_FAILED", "Cleanup execution identity is invalid");
    let manifest: CleanupManifestV1;
    try { manifest = await this.#readManifest(request.resourceId); }
    catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return { version: 1, cleanupId: request.cleanupId, outcome: "pending" }; throw error; }
    if (manifest.cleanupId !== request.cleanupId || manifest.runId !== request.runId || manifest.effectId !== request.effectId || manifest.resourceKind !== request.resourceKind || manifest.resourceId !== request.resourceId) throw new ArborError("VALIDATION_FAILED", "Cleanup execution does not match its package-authored planned effect");
    await this.#verifyRoot(manifest); await this.#verifyChain(manifest); this.#validateEntries(manifest.entries);
    for (const entry of manifest.entries) {
      await this.#beforeAtomicDelete?.(entry);
      const result = await this.#atomicDelete(request.cleanupId, manifest.rootIdentity, entry);
      if (result.status === "absent") continue;
      if (result.status !== "deleted") return { version: 1, cleanupId: request.cleanupId, outcome: "indeterminate" };
      try { await lstat(resolve(this.#stateRoot, entry.relativePath)); return { version: 1, cleanupId: request.cleanupId, outcome: "indeterminate" }; }
      catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") return { version: 1, cleanupId: request.cleanupId, outcome: "indeterminate" }; }
    }
    return { version: 1, cleanupId: request.cleanupId, outcome: "completed" };
  }

  async #atomicDelete(cleanupId: string, rootIdentity: CleanupManifestV1["rootIdentity"], entry: CleanupManifestEntryV1): Promise<AtomicDeleteResponseV1> {
    if (sha256(requireRegularFile(this.#deleterPath)) !== this.#deleterDigest) throw new ArborError("WRITE_CONFINEMENT_UNAVAILABLE", "Atomic cleanup helper changed after adapter admission");
    const result = await runProcess(["/usr/bin/python", this.#deleterPath], { env: { PATH: "/usr/bin:/bin", LANG: "C", LC_ALL: "C" }, input: canonicalJson({ version: 1, root: this.#stateRoot, rootIdentity, cleanupId, entry }), timeoutMs: 30_000, maxOutputBytes: 4096 });
    let response: AtomicDeleteResponseV1; try { response = JSON.parse(result.stdout.toString("utf8")) as AtomicDeleteResponseV1; } catch { throw new ArborError("WRITE_CONFINEMENT_UNAVAILABLE", "Atomic cleanup helper returned malformed evidence"); }
    if (response.version !== 1 || !["deleted", "absent", "identity-mismatch", "unsupported-atomic-type", "invalid", "indeterminate"].includes(response.status)) throw new ArborError("WRITE_CONFINEMENT_UNAVAILABLE", "Atomic cleanup helper returned an unknown status");
    return response;
  }

  async #readManifest(resourceId: string): Promise<CleanupManifestV1> {
    const path = join(this.#manifestRoot, `${resourceId}.v1.json`); this.#assertContained(path); const raw = await safeReadFile(path, 1024 * 1024); const manifest = JSON.parse(raw.toString("utf8")) as CleanupManifestV1;
    const keys = ["chainSequence", "cleanupId", "deleterDigest", "effectId", "entries", "manifestDigest", "payloadDigest", "predecessorManifestDigest", "resourceId", "resourceKind", "resourceRoot", "rootIdentity", "runId", "signature", "signerId", "signingPublicKey", "version"].sort();
    if (Object.keys(manifest as unknown as Record<string, unknown>).sort().join("\0") !== keys.join("\0") || manifest.version !== 1 || manifest.resourceId !== resourceId || !ID.test(resourceId) || !ID.test(manifest.cleanupId) || !ID.test(manifest.runId) || !ID.test(manifest.effectId) || !ID.test(manifest.signerId) || !RELATIVE.test(manifest.resourceRoot) || !Array.isArray(manifest.entries) || manifest.entries.length < 1 || manifest.entries.length > MAX_ENTRIES || !Number.isSafeInteger(manifest.chainSequence) || manifest.chainSequence < 1 || !DIGEST.test(manifest.predecessorManifestDigest) || !DIGEST.test(manifest.deleterDigest) || manifest.deleterDigest !== this.#deleterDigest || !verifyManifestSignature(manifest, this.#publicKey)) throw new ArborError("VALIDATION_FAILED", "Cleanup manifest is invalid");
    for (const entry of manifest.entries) { this.#validateEntryPath(entry.relativePath, manifest.resourceRoot); if (entry.version !== 1 || !["file", "directory"].includes(entry.type) || !DIGEST.test(entry.expectedDigest) || !entry.expectedIdentity || !/^\d+$/u.test(entry.expectedIdentity.device) || !/^\d+$/u.test(entry.expectedIdentity.inode) || !Number.isSafeInteger(entry.expectedIdentity.mode) || !Number.isSafeInteger(entry.expectedIdentity.size)) throw new ArborError("VALIDATION_FAILED", "Cleanup manifest entry is invalid"); }
    return manifest;
  }

  async #chainHead(runId: string): Promise<{ sequence: number; digest: string }> {
    const manifests: CleanupManifestV1[] = [];
    for (const name of (await readdir(this.#manifestRoot)).filter((value) => value.endsWith(".v1.json")).sort()) { try { const manifest = await this.#readManifest(name.slice(0, -".v1.json".length)); if (manifest.runId === runId) manifests.push(manifest); } catch { throw new ArborError("VALIDATION_FAILED", "Cleanup signature chain contains an invalid manifest"); } }
    if (manifests.length === 0) return { sequence: 0, digest: ZERO_DIGEST };
    manifests.sort((left, right) => left.chainSequence - right.chainSequence); let prior = ZERO_DIGEST;
    for (let index = 0; index < manifests.length; index += 1) { const manifest = manifests[index]!; if (manifest.chainSequence !== index + 1 || manifest.predecessorManifestDigest !== prior) throw new ArborError("VALIDATION_FAILED", "Cleanup manifest signature chain is discontinuous"); prior = manifest.manifestDigest; }
    return { sequence: manifests.length, digest: prior };
  }

  async #verifyChain(manifest: CleanupManifestV1): Promise<void> { const head = await this.#chainHead(manifest.runId); if (head.sequence < manifest.chainSequence || (head.sequence === manifest.chainSequence && head.digest !== manifest.manifestDigest)) throw new ArborError("VALIDATION_FAILED", "Cleanup manifest is not in its run-bound signature chain"); }
  async #verifyRoot(manifest: CleanupManifestV1): Promise<void> { const canonical = await realpath(this.#stateRoot); const value = await lstat(canonical, { bigint: true }); if (canonical !== this.#stateRoot || !value.isDirectory() || value.isSymbolicLink() || value.dev !== this.#rootDevice || value.ino !== this.#rootInode || manifest.rootIdentity.device !== value.dev.toString() || manifest.rootIdentity.inode !== value.ino.toString()) throw new ArborError("VALIDATION_FAILED", "Cleanup state-root identity changed"); }
  #validatePlanIdentity(input: CleanupManifestPlanV1): void { if (input.version !== 1 || !ID.test(input.cleanupId) || !ID.test(input.resourceId) || !ID.test(input.runId) || !ID.test(input.effectId) || !["workspace", "scratch", "agentChild", "evaluatorProcess", "temporaryReport"].includes(input.resourceKind) || !RELATIVE.test(input.resourceRoot) || !input.resourceRoot.split("/").includes(input.runId) || !Array.isArray(input.relativePaths) || input.relativePaths.length < 1 || input.relativePaths.length > MAX_ENTRIES) throw new ArborError("VALIDATION_FAILED", "Cleanup plan identity is invalid"); }
  #validateEntryPath(path: string, resourceRoot: string): void { if (!RELATIVE.test(path) || PROTECTED.test(path) || (path !== resourceRoot && !path.startsWith(`${resourceRoot}/`))) throw new ArborError("VALIDATION_FAILED", "Cleanup manifest entry is outside its planned resource root"); this.#assertContained(resolve(this.#stateRoot, path)); }
  #validateEntries(entries: readonly CleanupManifestEntryV1[]): void { const paths = entries.map((entry) => entry.relativePath); if (new Set(paths).size !== paths.length || paths.some((path, index) => paths.some((other, otherIndex) => index !== otherIndex && other.startsWith(`${path}/`)))) throw new ArborError("VALIDATION_FAILED", "Cleanup manifest entries overlap"); }
  #assertContained(path: string): void { const normalized = resolve(path); if (normalized === this.#stateRoot || !normalized.startsWith(`${this.#stateRoot}${sep}`)) throw new ArborError("VALIDATION_FAILED", "Cleanup target escaped or selected the state root"); }
}

function realpathFromUrl(value: string | URL): string { const path = value instanceof URL ? value.pathname : value; return resolve(decodeURIComponent(path)); }
function requireRegularFile(path: string): Buffer { const value = requireStat(path); if (!value.isFile() || value.isSymbolicLink()) throw new ArborError("WRITE_CONFINEMENT_UNAVAILABLE", "Atomic cleanup helper is not a regular file"); return requireRead(path); }
function requireStat(path: string) { const value = statSyncCompat(path); return value; }
function requireRead(path: string): Buffer { return readFileSyncCompat(path); }
// Synchronous helper admission avoids a mutable digest gap in the constructor.
import { lstatSync as statSyncCompat, readFileSync as readFileSyncCompat } from "node:fs";

async function safeReadFile(path: string, maxBytes: number): Promise<Buffer> {
  const value = await lstat(path); if (!value.isFile() || value.isSymbolicLink() || value.size > maxBytes || (value.mode & 0o077) !== 0) throw new ArborError("VALIDATION_FAILED", "Cleanup authority file is not owner-only");
  const handle = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW); try { const opened = await handle.stat(); if (!opened.isFile() || opened.dev !== value.dev || opened.ino !== value.ino || opened.size !== value.size) throw new ArborError("VALIDATION_FAILED", "Cleanup authority file identity changed during open"); return await handle.readFile(); } finally { await handle.close(); }
}
