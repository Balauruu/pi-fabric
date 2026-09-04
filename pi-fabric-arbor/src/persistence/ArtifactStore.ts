import { constants } from "node:fs";
import { randomBytes, timingSafeEqual } from "node:crypto";
import { appendFile, chmod, lstat, mkdir, open, realpath, rename, rm, writeFile } from "node:fs/promises";
import { join, resolve, sep } from "node:path";
import { ArborError } from "../domain/errors.js";
import type { ArborId, Sha256 } from "../domain/types.js";
import { canonicalJson, sha256 } from "../util/canonical.js";
import { redactText } from "../web/redaction.js";

const ARTIFACT_ID = /^art_[0-9a-f]{60}$/u;
const DIGEST = /^[0-9a-f]{64}$/u;
const MAX_ARTIFACT_BYTES = 64 * 1024 * 1024;
export const ARTIFACT_PREVIEW_BYTES = 64 * 1024;
export const ARTIFACT_PAGE_BYTES = 1024 * 1024;

export interface ArtifactReceiptV1 {
  version: 1;
  artifactId: ArborId;
  digest: Sha256;
  bytes: number;
}

export interface ArtifactPageV1 extends ArtifactReceiptV1 {
  offset: number;
  length: number;
  nextOffset: number;
  hasMore: boolean;
  text: string;
}

export interface PutArtifactOptionsV1 {
  expectedDigest?: Sha256;
  maxBytes?: number;
  redacted: boolean;
}

interface ArtifactMetadataV1 { version: 1; artifactId: ArborId; digest: Sha256; bytes: number }

export interface ArtifactReadGrantRequestV1 {
  version: 1;
  artifactId: ArborId;
  expectedDigest: Sha256;
  principalId: ArborId;
  runId: ArborId;
  effectId: ArborId;
  expiresAt: string;
  maxReads: number;
}

export interface ArtifactReadCapabilityV1 extends ArtifactReadGrantRequestV1 {
  grantId: ArborId;
  token: string;
}

export interface ArtifactReadRequestV1 {
  version: 1;
  capability: ArtifactReadCapabilityV1;
  offset: number;
  limit: number;
}

export interface ArtifactAccessAuditV1 {
  version: 1;
  grantId: ArborId;
  action: "issued" | "read" | "denied";
  artifactId: ArborId;
  expectedDigest: Sha256;
  principalId: ArborId;
  runId: ArborId;
  effectId: ArborId;
  observedAt: string;
  useNumber: number;
}

interface StoredArtifactGrantV1 extends ArtifactReadCapabilityV1 { tokenDigest: Sha256; reads: number }
const ID = /^[a-z][a-z0-9_]{2,63}$/u;
const TOKEN = /^[A-Za-z0-9_-]{32,128}$/u;
const ZERO_TOKEN_DIGEST = "0".repeat(64);

export class ArtifactStore {
  #root: string;
  #casRoot: string;
  #refRoot: string;
  #tmpRoot: string;
  #auditPath: string;
  #now: () => string;
  #grants = new Map<string, StoredArtifactGrantV1>();
  #audit: ArtifactAccessAuditV1[] = [];

  private constructor(root: string, now: () => string) {
    this.#root = root;
    this.#casRoot = join(root, "sha256");
    this.#refRoot = join(root, "refs");
    this.#tmpRoot = join(root, "tmp");
    this.#auditPath = join(root, "artifact-access.v1.jsonl");
    this.#now = now;
  }

  static async open(root: string, options: { now?: () => string } = {}): Promise<ArtifactStore> {
    await mkdir(root, { recursive: true, mode: 0o700 });
    const canonicalRoot = await realpath(root);
    const rootStat = await lstat(canonicalRoot);
    if (!rootStat.isDirectory() || rootStat.isSymbolicLink()) throw new ArborError("ARTIFACT_INVALID", "Artifact root is not a directory");
    const store = new ArtifactStore(canonicalRoot, options.now ?? (() => new Date().toISOString()));
    await Promise.all([
      mkdir(store.#casRoot, { recursive: true, mode: 0o700 }),
      mkdir(store.#refRoot, { recursive: true, mode: 0o700 }),
      mkdir(store.#tmpRoot, { recursive: true, mode: 0o700 }),
    ]);
    await Promise.all([store.#assertDirectory(store.#casRoot), store.#assertDirectory(store.#refRoot), store.#assertDirectory(store.#tmpRoot)]);
    try { await writeFile(store.#auditPath, "", { mode: 0o600, flag: "wx" }); } catch (error) { if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error; }
    await chmod(store.#auditPath, 0o600); return store;
  }

  async putText(text: string, options: Omit<PutArtifactOptionsV1, "redacted"> = {}): Promise<ArtifactReceiptV1> {
    return this.put(Buffer.from(redactText(text), "utf8"), { ...options, redacted: true });
  }

  async put(bytes: Uint8Array, options: PutArtifactOptionsV1): Promise<ArtifactReceiptV1> {
    if (!options.redacted) throw new ArborError("ARTIFACT_INVALID", "Artifacts must be redacted before CAS admission");
    const maxBytes = options.maxBytes ?? ARTIFACT_PAGE_BYTES;
    if (!Number.isSafeInteger(maxBytes) || maxBytes < 1 || maxBytes > MAX_ARTIFACT_BYTES || bytes.byteLength > maxBytes) throw new ArborError("ARTIFACT_INVALID", "Artifact exceeds admitted byte bound", { maxBytes });
    const digest = sha256(bytes);
    if (options.expectedDigest !== undefined && options.expectedDigest !== digest) throw new ArborError("ARTIFACT_INVALID", "Artifact digest does not match expectation");
    const artifactId = `art_${digest.slice(0, 60)}`;
    const directory = join(this.#casRoot, digest.slice(0, 2));
    const destination = join(directory, digest);
    await mkdir(directory, { recursive: true, mode: 0o700 });
    await this.#assertDirectory(directory);
    const temporary = join(this.#tmpRoot, `${artifactId}_${process.pid}_${Date.now().toString(36)}`);
    const handle = await open(temporary, constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY | constants.O_NOFOLLOW, 0o600);
    try { await handle.writeFile(bytes); await handle.sync(); } finally { await handle.close(); }
    try {
      await rename(temporary, destination);
    } catch (error) {
      const existing = await this.#readVerified(destination, digest).catch(() => undefined);
      await rm(temporary, { force: true });
      if (!existing) throw error;
    }
    const metadata: ArtifactMetadataV1 = { version: 1, artifactId, digest, bytes: bytes.byteLength };
    const metadataJson = canonicalJson(metadata);
    const refPath = join(this.#refRoot, `${artifactId}.json`);
    try { await writeFile(refPath, metadataJson, { encoding: "utf8", mode: 0o600, flag: "wx" }); }
    catch {
      const existing = await this.#safeReadFile(refPath, 4096);
      if (existing.toString("utf8") !== metadataJson) throw new ArborError("ARTIFACT_INVALID", "Opaque artifact ID collision");
    }
    return Object.freeze({ version: 1, artifactId, digest, bytes: bytes.byteLength });
  }

  async describe(artifactId: ArborId): Promise<ArtifactReceiptV1> {
    const metadata = await this.#metadata(artifactId); return { version: 1, artifactId, digest: metadata.digest, bytes: metadata.bytes };
  }

  async issueReadCapability(request: ArtifactReadGrantRequestV1): Promise<ArtifactReadCapabilityV1> {
    const now = Date.parse(this.#now()); const expiry = Date.parse(request.expiresAt);
    if (request.version !== 1 || !ID.test(request.principalId) || !ID.test(request.runId) || !ID.test(request.effectId) || !DIGEST.test(request.expectedDigest) || !Number.isSafeInteger(request.maxReads) || request.maxReads < 1 || request.maxReads > 100 || !Number.isFinite(now) || !Number.isFinite(expiry) || expiry <= now || expiry > now + 86_400_000) throw new ArborError("ARTIFACT_INVALID", "Artifact capability binding is invalid");
    const metadata = await this.#metadata(request.artifactId); if (metadata.digest !== request.expectedDigest) throw new ArborError("ARTIFACT_INVALID", "Artifact capability digest binding is invalid");
    const grantId = `grant_${randomBytes(24).toString("hex")}`; const token = randomBytes(32).toString("base64url"); const capability: ArtifactReadCapabilityV1 = Object.freeze({ ...structuredClone(request), grantId, token });
    this.#grants.set(grantId, { ...capability, tokenDigest: sha256(token), reads: 0 }); await this.#recordAudit(capability, "issued", 0); return capability;
  }

  async read(capability: ArtifactReadCapabilityV1, limit = ARTIFACT_PREVIEW_BYTES): Promise<Uint8Array> {
    if (!Number.isSafeInteger(limit) || limit < 1 || limit > ARTIFACT_PREVIEW_BYTES) throw new ArborError("ARTIFACT_INVALID", "Artifact preview limit must be 1-65536");
    const metadata = await this.#authorize(capability); const bytes = await this.#readVerified(join(this.#casRoot, metadata.digest.slice(0, 2), metadata.digest), metadata.digest);
    if (bytes.byteLength !== metadata.bytes) throw new ArborError("ARTIFACT_INVALID", "CAS object size mismatch"); return bytes.subarray(0, limit);
  }

  async readPage(request: ArtifactReadRequestV1): Promise<ArtifactPageV1> {
    if (request.version !== 1 || !Number.isSafeInteger(request.offset) || request.offset < 0) throw new ArborError("ARTIFACT_INVALID", "Artifact offset must be a nonnegative integer");
    if (!Number.isSafeInteger(request.limit) || request.limit < 1 || request.limit > ARTIFACT_PAGE_BYTES) throw new ArborError("ARTIFACT_INVALID", "Artifact page limit must be 1-1048576");
    const metadata = await this.#authorize(request.capability); const path = join(this.#casRoot, metadata.digest.slice(0, 2), metadata.digest); const bytes = await this.#readVerified(path, metadata.digest);
    if (bytes.byteLength !== metadata.bytes || request.offset > bytes.byteLength) throw new ArborError("ARTIFACT_INVALID", "Artifact range or size is invalid");
    const page = bytes.subarray(request.offset, Math.min(bytes.byteLength, request.offset + request.limit)); const nextOffset = request.offset + page.byteLength;
    return Object.freeze({ version: 1, artifactId: metadata.artifactId, digest: metadata.digest, bytes: metadata.bytes, offset: request.offset, length: page.byteLength, nextOffset, hasMore: nextOffset < bytes.byteLength, text: redactText(new TextDecoder("utf-8", { fatal: false }).decode(page)) });
  }

  createEvidenceVerifier(): { verifyArtifact(input: { version: 1; artifactId: string; expectedDigest: string; principalId: string; runId: string; effectId: string }): Promise<void> } {
    return Object.freeze({ verifyArtifact: async (input: { version: 1; artifactId: string; expectedDigest: string; principalId: string; runId: string; effectId: string }) => {
      const capability = await this.issueReadCapability({ ...input, expiresAt: new Date(Date.parse(this.#now()) + 60_000).toISOString(), maxReads: 1 }); await this.read(capability, 1);
    } });
  }

  auditRecords(): readonly ArtifactAccessAuditV1[] { return Object.freeze(structuredClone(this.#audit)); }

  async #authorize(capability: ArtifactReadCapabilityV1): Promise<ArtifactMetadataV1> {
    const stored = this.#grants.get(capability.grantId); const candidateDigest = TOKEN.test(capability.token) ? sha256(capability.token) : ZERO_TOKEN_DIGEST;
    const tokenMatches = stored ? timingSafeEqual(Buffer.from(stored.tokenDigest, "hex"), Buffer.from(candidateDigest, "hex")) : false;
    const bindingMatches = stored && stored.version === 1 && stored.artifactId === capability.artifactId && stored.expectedDigest === capability.expectedDigest && stored.principalId === capability.principalId && stored.runId === capability.runId && stored.effectId === capability.effectId && stored.expiresAt === capability.expiresAt && stored.maxReads === capability.maxReads;
    if (!stored || !tokenMatches || !bindingMatches || Date.parse(this.#now()) >= Date.parse(stored.expiresAt) || stored.reads >= stored.maxReads) { if (stored) await this.#recordAudit(stored, "denied", stored.reads + 1); throw new ArborError("ARTIFACT_INVALID", "Artifact read capability is absent, expired, exhausted, or binding-mismatched"); }
    stored.reads += 1; await this.#recordAudit(stored, "read", stored.reads); const metadata = await this.#metadata(stored.artifactId); if (metadata.digest !== stored.expectedDigest) throw new ArborError("ARTIFACT_INVALID", "Artifact changed after capability issuance"); return metadata;
  }

  async #recordAudit(binding: ArtifactReadCapabilityV1, action: ArtifactAccessAuditV1["action"], useNumber: number): Promise<void> {
    const record: ArtifactAccessAuditV1 = { version: 1, grantId: binding.grantId, action, artifactId: binding.artifactId, expectedDigest: binding.expectedDigest, principalId: binding.principalId, runId: binding.runId, effectId: binding.effectId, observedAt: this.#now(), useNumber };
    this.#audit.push(record); await appendFile(this.#auditPath, `${canonicalJson(record)}\n`, { encoding: "utf8", mode: 0o600 });
  }

  async #metadata(artifactId: ArborId): Promise<ArtifactMetadataV1> {
    if (!ARTIFACT_ID.test(artifactId)) throw new ArborError("ARTIFACT_INVALID", "Invalid opaque artifact ID");
    const metadataPath = join(this.#refRoot, `${artifactId}.json`);
    const raw = await this.#safeReadFile(metadataPath, 4096);
    let metadata: ArtifactMetadataV1;
    try { metadata = JSON.parse(raw.toString("utf8")) as ArtifactMetadataV1; }
    catch { throw new ArborError("ARTIFACT_INVALID", "Artifact reference metadata is invalid"); }
    if (Object.keys(metadata as unknown as Record<string, unknown>).sort().join("\0") !== ["artifactId", "bytes", "digest", "version"].sort().join("\0") || metadata.version !== 1 || metadata.artifactId !== artifactId || !DIGEST.test(metadata.digest) || !Number.isSafeInteger(metadata.bytes) || metadata.bytes < 0 || metadata.bytes > MAX_ARTIFACT_BYTES) throw new ArborError("ARTIFACT_INVALID", "Artifact reference metadata is invalid");
    return metadata;
  }

  async #readVerified(path: string, digest: string): Promise<Uint8Array> {
    const bytes = await this.#safeReadFile(path, MAX_ARTIFACT_BYTES);
    if (sha256(bytes) !== digest) throw new ArborError("ARTIFACT_INVALID", "CAS object digest mismatch");
    return bytes;
  }

  async #safeReadFile(path: string, maxBytes: number): Promise<Buffer> {
    this.#assertContained(path);
    const resolved = await realpath(path);
    if (resolved !== resolve(path)) throw new ArborError("ARTIFACT_INVALID", "Artifact realpath or symlink check failed");
    this.#assertContained(resolved);
    const stat = await lstat(path);
    if (!stat.isFile() || stat.isSymbolicLink() || stat.size > maxBytes) throw new ArborError("ARTIFACT_INVALID", "Artifact object is not an admitted regular file");
    const handle = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW);
    try {
      const opened = await handle.stat();
      if (!opened.isFile() || opened.size !== stat.size || opened.dev !== stat.dev || opened.ino !== stat.ino) throw new ArborError("ARTIFACT_INVALID", "Artifact identity changed during open");
      return await handle.readFile();
    } finally { await handle.close(); }
  }

  async #assertDirectory(path: string): Promise<void> {
    this.#assertContained(path);
    const resolved = await realpath(path);
    if (resolved !== resolve(path)) throw new ArborError("ARTIFACT_INVALID", "Artifact directory symlink is prohibited");
    const stat = await lstat(path);
    if (!stat.isDirectory() || stat.isSymbolicLink()) throw new ArborError("ARTIFACT_INVALID", "Artifact directory is invalid");
  }

  #assertContained(path: string): void {
    const normalized = resolve(path);
    if (normalized !== this.#root && !normalized.startsWith(`${this.#root}${sep}`)) throw new ArborError("ARTIFACT_INVALID", "Artifact path escaped CAS root");
  }
}
