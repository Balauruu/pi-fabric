import { createPrivateKey, createPublicKey, generateKeyPairSync, sign, verify, type KeyObject } from "node:crypto";
import { existsSync, lstatSync, readFileSync, readlinkSync, realpathSync, readdirSync, statfsSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { ArborError } from "../domain/errors.js";
import { canonicalJson, digestCanonical, sha256 } from "../util/canonical.js";
import { git, assertSafeRelativePath } from "./git-process.js";
import { captureRepositoryFingerprintOracleV1, REPOSITORY_FINGERPRINT_ORACLE_TOOL_DIGEST_V1 } from "./fingerprint-oracle.js";

export interface FingerprintFileV1 {
  path: string;
  type: "file" | "directory" | "symlink" | "other" | "missing";
  mode: number;
  executable: boolean;
  size: string;
  digest?: string;
  symlinkTarget?: string;
  device: string;
  inode: string;
  uid: string;
  gid: string;
  linkCount: string;
  mtimeNs: string;
  ctimeNs: string;
}

export interface FingerprintCommandOutputV1 {
  name: string;
  bytes: number;
  digest: string;
  base64: string;
}

export interface FingerprintWorktreeV1 {
  token: string;
  identity: {
    realpath: string;
    device: string;
    inode: string;
    filesystemType: string;
    filesystemBlockSize: string;
    mountId: string;
    mountPoint: string;
    mountRoot: string;
  };
  head: { symbolic: string | null; state: "branch" | "detached" | "unborn"; oid: string | null };
  index: { path: string; present: boolean; bytes: number; digest: string; version: number | null; entryCount: number | null; extensions: Array<{ signature: string; bytes: number; digest: string }>; metadata?: FingerprintFileV1 };
  status: FingerprintCommandOutputV1;
  stages: FingerprintCommandOutputV1;
  tracked: FingerprintFileV1[];
  untracked: FingerprintFileV1[];
}

export interface RepositoryFingerprintManifestV1 {
  version: 1;
  schemaDigest: string;
  source: FingerprintWorktreeV1;
  refs: FingerprintCommandOutputV1;
  reflogs: FingerprintCommandOutputV1;
  stash: { ref: FingerprintCommandOutputV1; reflog: FingerprintCommandOutputV1; list: FingerprintCommandOutputV1 };
  packedRefs: FingerprintFileV1;
  commonDirectory: { identity: FingerprintFileV1; inventory: FingerprintFileV1[] };
  worktreeRegistration: FingerprintCommandOutputV1;
  siblings: FingerprintWorktreeV1[];
  toolDigest: string;
}

export interface FingerprintCaptureOptionsV1 {
  checkout: string;
  stateRoot: string;
  maxEntries?: number;
  maxFileBytes?: number;
  maxTotalBytes?: number;
}

export interface RepositoryFingerprintCertificateV1 {
  version: 1;
  certificateId: string;
  runId: string;
  boundaryId: string;
  boundaryKind: string;
  effectId: string;
  commandId: string;
  correlationIds: string[];
  fence: number;
  expectedRevision: number;
  containmentId: string;
  sourceRepositoryIdentityDigest: string;
  packageRepositoryIdentityDigest: string;
  beforeAt: string;
  afterAt: string;
  fingerprintSchemaDigest: string;
  fingerprintToolDigest: string;
  oracleToolDigest: string;
  beforeManifestDigest: string;
  afterManifestDigest: string;
  comparisonDigest: string;
  expectedPredicate: "exactEquality";
  equal: boolean;
  mismatches: string[];
  reportGenerationId: string;
  previousCertificateDigest: string;
  signerId: string;
  signingPublicKey: string;
  payloadDigest: string;
  signature: string;
  certificateDigest: string;
}

export interface FingerprintBoundaryMetadataV1 {
  certificateId: string;
  runId: string;
  boundaryId: string;
  boundaryKind: string;
  effectId: string;
  commandId: string;
  correlationIds: string[];
  fence: number;
  expectedRevision: number;
  containmentId: string;
  packageRepositoryIdentityDigest: string;
  reportGenerationId: string;
  previousCertificateDigest?: string;
}

const FINGERPRINT_SCHEMA = "pi-fabric-arbor.repository-fingerprint-manifest.v1";
export const REPOSITORY_FINGERPRINT_SCHEMA_DIGEST_V1 = sha256(FINGERPRINT_SCHEMA);
export const REPOSITORY_FINGERPRINT_TOOL_DIGEST_V1 = sha256(readFileSync(new URL(import.meta.url)));
export const REPOSITORY_FINGERPRINT_ORACLE_DIGEST_V1 = REPOSITORY_FINGERPRINT_ORACLE_TOOL_DIGEST_V1;

function output(name: string, bytes: Buffer): FingerprintCommandOutputV1 {
  return { name, bytes: bytes.byteLength, digest: sha256(bytes), base64: bytes.toString("base64") };
}

function mountIdentity(path: string): { mountId: string; mountPoint: string; mountRoot: string } {
  const normalized = realpathSync(path);
  let best: { mountId: string; mountPoint: string; mountRoot: string } | undefined;
  for (const line of readFileSync("/proc/self/mountinfo", "utf8").split("\n")) {
    if (!line) continue;
    const fields = line.split(" ");
    const point = fields[4]?.replace(/\\040/gu, " ");
    const root = fields[3]?.replace(/\\040/gu, " ");
    if (!point || root === undefined) continue;
    if ((normalized === point || normalized.startsWith(`${point.replace(/\/$/u, "")}/`)) && (!best || point.length > best.mountPoint.length)) best = { mountId: fields[0]!, mountPoint: point, mountRoot: root };
  }
  if (!best) throw new ArborError("INDETERMINATE", "Unable to identify repository mount");
  return best;
}

function fileRecord(root: string, path: string, displayPath?: string): FingerprintFileV1 {
  const relativePath = displayPath ?? (relative(root, path).split(sep).join("/") || ".");
  if (!existsSync(path)) return { path: relativePath, type: "missing", mode: 0, executable: false, size: "0", device: "0", inode: "0", uid: "0", gid: "0", linkCount: "0", mtimeNs: "0", ctimeNs: "0" };
  const stat = lstatSync(path, { bigint: true });
  const type = stat.isFile() ? "file" : stat.isDirectory() ? "directory" : stat.isSymbolicLink() ? "symlink" : "other";
  let digest: string | undefined;
  let symlinkTarget: string | undefined;
  if (type === "file") digest = sha256(readFileSync(path));
  if (type === "symlink") { symlinkTarget = readlinkSync(path, "utf8"); digest = sha256(symlinkTarget); }
  return {
    path: relativePath,
    type,
    mode: Number(stat.mode & 0o7777n),
    executable: (stat.mode & 0o111n) !== 0n,
    size: stat.size.toString(),
    ...(digest === undefined ? {} : { digest }),
    ...(symlinkTarget === undefined ? {} : { symlinkTarget }),
    device: stat.dev.toString(),
    inode: stat.ino.toString(),
    uid: stat.uid.toString(),
    gid: stat.gid.toString(),
    linkCount: stat.nlink.toString(),
    mtimeNs: stat.mtimeNs.toString(),
    ctimeNs: stat.ctimeNs.toString(),
  };
}

function walk(root: string, maxEntries: number, maxFileBytes: number, maxTotalBytes: number): FingerprintFileV1[] {
  const entries: FingerprintFileV1[] = [];
  let total = 0;
  const visit = (directory: string): void => {
    for (const name of readdirSync(directory).sort()) {
      const path = join(directory, name);
      const record = fileRecord(root, path);
      const size = BigInt(record.size);
      if (size > BigInt(maxFileBytes)) throw new ArborError("INDETERMINATE", "Fingerprint file exceeds bound", { path: record.path });
      total += Number(size);
      if (total > maxTotalBytes || entries.length >= maxEntries) throw new ArborError("INDETERMINATE", "Fingerprint inventory exceeds bound");
      entries.push(record);
      if (record.type === "directory") visit(path);
    }
  };
  visit(root);
  return entries;
}

function parseIndex(bytes: Buffer, hashBytes: 20 | 32): { version: number | null; entryCount: number | null; extensions: Array<{ signature: string; bytes: number; digest: string }> } {
  if (bytes.byteLength < 12 + hashBytes || bytes.subarray(0, 4).toString("ascii") !== "DIRC") return { version: null, entryCount: null, extensions: [] };
  const version = bytes.readUInt32BE(4);
  const entryCount = bytes.readUInt32BE(8);
  if (![2, 3, 4].includes(version)) return { version, entryCount, extensions: [] };
  let cursor = 12;
  for (let index = 0; index < entryCount; index += 1) {
    const start = cursor;
    const fixed = 40 + hashBytes + 2;
    if (cursor + fixed > bytes.byteLength - hashBytes) return { version, entryCount, extensions: [] };
    const flags = bytes.readUInt16BE(cursor + 40 + hashBytes);
    cursor += fixed;
    if ((flags & 0x4000) !== 0) cursor += 2;
    if (version === 4) {
      while (cursor < bytes.byteLength && (bytes[cursor]! & 0x80) !== 0) cursor += 1;
      cursor += 1;
      while (cursor < bytes.byteLength && bytes[cursor] !== 0) cursor += 1;
      cursor += 1;
    } else {
      while (cursor < bytes.byteLength && bytes[cursor] !== 0) cursor += 1;
      cursor += 1;
      cursor = start + Math.ceil((cursor - start) / 8) * 8;
    }
  }
  const extensions: Array<{ signature: string; bytes: number; digest: string }> = [];
  const end = bytes.byteLength - hashBytes;
  while (cursor + 8 <= end) {
    const signature = bytes.subarray(cursor, cursor + 4).toString("ascii");
    const length = bytes.readUInt32BE(cursor + 4);
    cursor += 8;
    if (cursor + length > end) return { version, entryCount, extensions: [] };
    const payload = bytes.subarray(cursor, cursor + length);
    extensions.push({ signature, bytes: length, digest: sha256(payload) });
    cursor += length;
  }
  return { version, entryCount, extensions };
}

function parseWorktreePaths(bytes: Buffer): string[] {
  return bytes.toString("utf8").split("\0").filter((field) => field.startsWith("worktree ")).map((field) => field.slice("worktree ".length));
}

async function captureWorktree(path: string, token: string, stateRoot: string, hashBytes: 20 | 32): Promise<FingerprintWorktreeV1> {
  const root = realpathSync(path);
  const stat = lstatSync(root, { bigint: true });
  const statfs = statfsSync(root, { bigint: true });
  const mount = mountIdentity(root);
  const symbolicResult = await git(["-C", root, "symbolic-ref", "-q", "HEAD"], { stateRoot, maxOutputBytes: 4096 }).catch(() => Buffer.alloc(0));
  const symbolic = symbolicResult.toString("utf8").trim() || null;
  const oidResult = await git(["-C", root, "rev-parse", "--verify", "HEAD"], { stateRoot, maxOutputBytes: 4096 }).catch(() => Buffer.alloc(0));
  const oid = oidResult.toString("utf8").trim() || null;
  const indexPathRaw = (await git(["-C", root, "rev-parse", "--path-format=absolute", "--git-path", "index"], { stateRoot, maxOutputBytes: 4096 })).toString("utf8").trim();
  const indexPath = resolve(indexPathRaw);
  const indexBytes = existsSync(indexPath) ? readFileSync(indexPath) : Buffer.alloc(0);
  const parsedIndex = parseIndex(indexBytes, hashBytes);
  const statusBytes = await git(["-C", root, "--no-optional-locks", "status", "--porcelain=v2", "-z", "--branch", "--untracked-files=all"], { stateRoot });
  const stageBytes = await git(["-C", root, "--no-optional-locks", "ls-files", "--stage", "-z"], { stateRoot });
  const trackedNames = (await git(["-C", root, "--no-optional-locks", "ls-files", "-z"], { stateRoot })).toString("utf8").split("\0").filter(Boolean);
  const untrackedNames = (await git(["-C", root, "--no-optional-locks", "ls-files", "--others", "--exclude-standard", "-z"], { stateRoot })).toString("utf8").split("\0").filter(Boolean);
  trackedNames.forEach(assertSafeRelativePath);
  untrackedNames.forEach(assertSafeRelativePath);
  return {
    token,
    identity: { realpath: root, device: stat.dev.toString(), inode: stat.ino.toString(), filesystemType: statfs.type.toString(), filesystemBlockSize: statfs.bsize.toString(), ...mount },
    head: { symbolic, state: symbolic ? (oid ? "branch" : "unborn") : "detached", oid },
    index: { path: indexPath, present: existsSync(indexPath), bytes: indexBytes.byteLength, digest: sha256(indexBytes), ...parsedIndex, ...(existsSync(indexPath) ? { metadata: fileRecord(dirname(indexPath), indexPath, "index") } : {}) },
    status: output("statusPorcelainV2", statusBytes),
    stages: output("indexStages", stageBytes),
    tracked: trackedNames.sort().map((name) => fileRecord(root, join(root, name), name)),
    untracked: untrackedNames.sort().map((name) => fileRecord(root, join(root, name), name)),
  };
}

async function capture(options: FingerprintCaptureOptionsV1): Promise<RepositoryFingerprintManifestV1> {
  const checkout = realpathSync(options.checkout);
  const stateRoot = realpathSync(options.stateRoot);
  const common = realpathSync((await git(["-C", checkout, "rev-parse", "--path-format=absolute", "--git-common-dir"], { stateRoot })).toString("utf8").trim());
  const format = (await git(["-C", checkout, "rev-parse", "--show-object-format"], { stateRoot, maxOutputBytes: 4096 })).toString("utf8").trim();
  const hashBytes: 20 | 32 = format === "sha256" ? 32 : 20;
  const maxEntries = options.maxEntries ?? 100_000;
  const maxFileBytes = options.maxFileBytes ?? 1_073_741_824;
  const maxTotalBytes = options.maxTotalBytes ?? 4_294_967_296;
  const worktreeBytes = await git(["-C", checkout, "worktree", "list", "--porcelain", "-z"], { stateRoot });
  const worktreePaths = parseWorktreePaths(worktreeBytes);
  const source = await captureWorktree(checkout, "source", stateRoot, hashBytes);
  const siblings: FingerprintWorktreeV1[] = [];
  for (const [index, path] of worktreePaths.filter((path) => realpathSync(path) !== checkout).sort().entries()) siblings.push(await captureWorktree(path, `sibling_${index + 1}`, stateRoot, hashBytes));
  const refsBytes = await git(["-C", checkout, "for-each-ref", "--format=%(refname)%00%(objectname)%00%(objecttype)%00%(symref)%00"], { stateRoot });
  const reflogResult = await git(["-C", checkout, "reflog", "show", "--all", "--date=raw", "--format=%gd%x00%H%x00%gD%x00%gs%x00"], { stateRoot }).catch(() => Buffer.alloc(0));
  const stashRef = await git(["-C", checkout, "rev-parse", "--verify", "refs/stash"], { stateRoot, maxOutputBytes: 4096 }).catch(() => Buffer.alloc(0));
  const stashReflog = await git(["-C", checkout, "reflog", "show", "refs/stash", "--date=raw", "--format=%gd%x00%H%x00%gs%x00"], { stateRoot }).catch(() => Buffer.alloc(0));
  const stashList = await git(["-C", checkout, "stash", "list", "--format=%gd%x00%H%x00%gs%x00"], { stateRoot }).catch(() => Buffer.alloc(0));
  const commonInventory = walk(common, maxEntries, maxFileBytes, maxTotalBytes);
  return {
    version: 1,
    schemaDigest: REPOSITORY_FINGERPRINT_SCHEMA_DIGEST_V1,
    source,
    refs: output("allRefs", refsBytes),
    reflogs: output("allReflogs", reflogResult),
    stash: { ref: output("stashRef", stashRef), reflog: output("stashReflog", stashReflog), list: output("stashList", stashList) },
    packedRefs: fileRecord(common, join(common, "packed-refs"), "packed-refs"),
    commonDirectory: { identity: fileRecord(dirname(common), common, "common-directory"), inventory: commonInventory },
    worktreeRegistration: output("worktreeRegistration", worktreeBytes),
    siblings,
    toolDigest: REPOSITORY_FINGERPRINT_TOOL_DIGEST_V1,
  };
}

function comparable(manifest: RepositoryFingerprintManifestV1): unknown {
  return { ...manifest, toolDigest: "tool-independent" };
}

export class RepositoryFingerprinter {
  async capture(options: FingerprintCaptureOptionsV1): Promise<RepositoryFingerprintManifestV1> { return capture(options); }
}

export class IndependentRepositoryFingerprintOracle {
  async capture(options: FingerprintCaptureOptionsV1): Promise<RepositoryFingerprintManifestV1> { return captureRepositoryFingerprintOracleV1(options); }

  async requireMatch(options: FingerprintCaptureOptionsV1, primary: RepositoryFingerprintManifestV1): Promise<string> {
    const oracle = await this.capture(options);
    const primaryDigest = digestCanonical(comparable(primary));
    const oracleDigest = digestCanonical(comparable(oracle));
    if (primaryDigest !== oracleDigest) throw new ArborError("QUARANTINED", "Independent repository fingerprint oracle mismatch", { primaryDigest, oracleDigest });
    return oracleDigest;
  }
}

function diffValues(before: unknown, after: unknown, path = "manifest", outputPaths: string[] = []): string[] {
  if (canonicalJson(before) === canonicalJson(after)) return outputPaths;
  if (!before || !after || typeof before !== "object" || typeof after !== "object") { outputPaths.push(path); return outputPaths; }
  if (Array.isArray(before) || Array.isArray(after)) {
    if (!Array.isArray(before) || !Array.isArray(after) || before.length !== after.length) { outputPaths.push(path); return outputPaths; }
    before.forEach((value, index) => diffValues(value, after[index], `${path}[${index}]`, outputPaths));
    return outputPaths;
  }
  const keys = [...new Set([...Object.keys(before as object), ...Object.keys(after as object)])].sort();
  keys.forEach((key) => diffValues((before as Record<string, unknown>)[key], (after as Record<string, unknown>)[key], `${path}.${key}`, outputPaths));
  return outputPaths.slice(0, 4096);
}

export class Ed25519FingerprintSigner {
  readonly signerId: string;
  readonly publicKey: KeyObject;
  readonly privateKey: KeyObject;

  constructor(signerId: string, privateKey?: KeyObject | string) {
    if (!/^[a-z][a-z0-9_]{2,63}$/u.test(signerId)) throw new ArborError("VALIDATION_FAILED", "Invalid fingerprint signer ID");
    this.signerId = signerId;
    if (privateKey) {
      this.privateKey = typeof privateKey === "string" ? createPrivateKey(privateKey) : privateKey;
      this.publicKey = createPublicKey(this.privateKey.export({ type: "pkcs8", format: "pem" }).toString());
    } else {
      const pair = generateKeyPairSync("ed25519");
      this.privateKey = pair.privateKey;
      this.publicKey = pair.publicKey;
    }
  }

  publicPem(): string { return this.publicKey.export({ type: "spki", format: "pem" }).toString(); }
  signDigest(digest: string): string { return sign(null, Buffer.from(digest, "hex"), this.privateKey).toString("base64url"); }
}

export function verifyRepositoryFingerprintCertificate(certificate: RepositoryFingerprintCertificateV1): boolean {
  const { certificateDigest: _certificateDigest, signature, payloadDigest, ...unsigned } = certificate;
  const expectedPayload = digestCanonical(unsigned);
  if (payloadDigest !== expectedPayload) return false;
  if (!verify(null, Buffer.from(payloadDigest, "hex"), createPublicKey(certificate.signingPublicKey), Buffer.from(signature, "base64url"))) return false;
  return certificate.fingerprintSchemaDigest === REPOSITORY_FINGERPRINT_SCHEMA_DIGEST_V1 && certificate.fingerprintToolDigest === REPOSITORY_FINGERPRINT_TOOL_DIGEST_V1 && certificate.oracleToolDigest === REPOSITORY_FINGERPRINT_ORACLE_DIGEST_V1 && certificate.certificateDigest === digestCanonical({ ...unsigned, payloadDigest, signature });
}

export class FingerprintBoundaryGuard {
  readonly #fingerprinter = new RepositoryFingerprinter();
  readonly #oracle = new IndependentRepositoryFingerprintOracle();
  constructor(
    readonly options: FingerprintCaptureOptionsV1,
    readonly signer: Ed25519FingerprintSigner,
    readonly quarantine: (certificate: RepositoryFingerprintCertificateV1) => void | Promise<void>,
  ) {}

  async run<T>(metadata: FingerprintBoundaryMetadataV1, operation: () => Promise<T>, onCertificate?: (certificate: RepositoryFingerprintCertificateV1) => void | Promise<void>): Promise<{ result: T; certificate: RepositoryFingerprintCertificateV1 }> {
    const beforeAt = new Date().toISOString();
    const before = await this.#fingerprinter.capture(this.options);
    await this.#oracle.requireMatch(this.options, before);
    let result!: T;
    let failure: unknown;
    try { result = await operation(); } catch (error) { failure = error; }
    const afterAt = new Date().toISOString();
    const after = await this.#fingerprinter.capture(this.options);
    await this.#oracle.requireMatch(this.options, after);
    const beforeDigest = digestCanonical(comparable(before));
    const afterDigest = digestCanonical(comparable(after));
    const mismatches = diffValues(comparable(before), comparable(after));
    const comparisonDigest = digestCanonical({ expectedPredicate: "exactEquality", beforeDigest, afterDigest, mismatches });
    const unsigned = {
      version: 1 as const,
      ...metadata,
      previousCertificateDigest: metadata.previousCertificateDigest ?? sha256("pi-fabric-arbor-fingerprint-certificate-chain-root-v1"),
      sourceRepositoryIdentityDigest: digestCanonical(before.source.identity),
      beforeAt,
      afterAt,
      fingerprintSchemaDigest: REPOSITORY_FINGERPRINT_SCHEMA_DIGEST_V1,
      fingerprintToolDigest: REPOSITORY_FINGERPRINT_TOOL_DIGEST_V1,
      oracleToolDigest: REPOSITORY_FINGERPRINT_ORACLE_DIGEST_V1,
      beforeManifestDigest: beforeDigest,
      afterManifestDigest: afterDigest,
      comparisonDigest,
      expectedPredicate: "exactEquality" as const,
      equal: beforeDigest === afterDigest,
      mismatches,
      signerId: this.signer.signerId,
      signingPublicKey: this.signer.publicPem(),
    };
    const payloadDigest = digestCanonical(unsigned);
    const signature = this.signer.signDigest(payloadDigest);
    const certificate: RepositoryFingerprintCertificateV1 = { ...unsigned, payloadDigest, signature, certificateDigest: digestCanonical({ ...unsigned, payloadDigest, signature }) };
    if (!verifyRepositoryFingerprintCertificate(certificate)) throw new ArborError("QUARANTINED", "Fingerprint certificate signature validation failed");
    await onCertificate?.(certificate);
    if (!certificate.equal) {
      await this.quarantine(certificate);
      throw new ArborError("QUARANTINED", "Repository fingerprint changed across consequential boundary", { certificateId: certificate.certificateId, mismatches });
    }
    if (failure !== undefined) throw failure;
    return { result, certificate };
  }
}

/** The public certificate is already path-free; this defensive projection rejects accidental path-bearing additions. */
export function publicRepositoryFingerprintCertificate(certificate: RepositoryFingerprintCertificateV1): RepositoryFingerprintCertificateV1 {
  const serialized = canonicalJson(certificate);
  if (serialized.includes(resolve("/") + "home/") || /"(?:path|realpath|mountPoint)"/u.test(serialized)) throw new ArborError("EVIDENCE_INVALID", "Public fingerprint certificate contains a raw host path");
  return structuredClone(certificate);
}
