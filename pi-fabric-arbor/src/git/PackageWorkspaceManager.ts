import { randomUUID } from "node:crypto";
import { chmodSync, copyFileSync, existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, realpathSync, rmSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, join, relative, resolve, sep } from "node:path";
import type { ArborContractV1, CandidateV1, GitOid } from "../domain/types.js";
import { ArborError } from "../domain/errors.js";
import type { CandidateFinalizationRequestV1, WorkspaceManager, WorkspaceMaterializationRequestV1, WorkspaceObservationV1 } from "../adapters/interfaces.js";
import { canonicalJson, digestCanonical, sha256 } from "../util/canonical.js";
import { assertPackageRef, assertSafeRelativePath, git, runGit } from "./git-process.js";
import { exportCommittedTree, readCommittedTreeManifest, readWorkspaceEntryBytes, readWorkspaceTreeManifest } from "./trusted-tree.js";

export interface PackageRepositoryOptionsV1 {
  stateRoot: string;
  repositoryId: string;
  sourceCheckout: string;
  expectedSourceOid: GitOid;
  gitOidLength?: 40 | 64;
}

export interface ImportedRepositoryV1 {
  version: 1;
  repositoryId: string;
  privateGitDir: string;
  sourceIdentityDigest: string;
  importedOid: GitOid;
  objectFormat: "sha1" | "sha256";
  packageRef: string;
  dissociationDigest: string;
  ownershipCertificateDigest: string;
}

export interface FinalizedDiffEntryV1 {
  status: string;
  oldMode: string;
  newMode: string;
  oldOid: string;
  newOid: string;
  paths: string[];
  type: "file" | "symlink" | "deleted" | "other";
  symlinkTarget?: string;
}

interface PrivateRepositoryIdentityV1 {
  version: 1;
  repositoryId: string;
  stateRoot: string;
  repositoryRoot: string;
  privateGitDir: string;
  sourceCheckout: string;
  sourceGitDir: string;
  sourceCommonDir: string;
  siblingCheckouts: string[];
  objectFormat: "sha1" | "sha256";
  configDigest: string;
  ownerUid: number;
  identityDigest: string;
}

interface WorkspaceMetadataV1 {
  version: 1;
  runId: string;
  attemptId: string;
  workspaceId: string;
  workspace: string;
  baseOid: string;
  rootIdentity: { device: string; inode: string };
  exportManifestDigest: string;
  privateRepositoryIdentityDigest: string;
  metadataDigest: string;
}

const IDENTITY_FILE = "repository-identity.v1.json";

function assertUnder(root: string, candidate: string): void {
  const canonicalRoot = realpathSync(root);
  const rel = relative(canonicalRoot, resolve(candidate));
  if (rel === "" || rel === ".." || rel.startsWith(`..${sep}`)) throw new ArborError("WRITE_CONFINEMENT_UNAVAILABLE", "Package path escaped its state root");
}

function assertDisjoint(left: string, right: string, label: string): void {
  const a = realpathSync(left); const b = realpathSync(right);
  const aToB = relative(a, b); const bToA = relative(b, a);
  const nested = aToB === "" || (!aToB.startsWith(`..${sep}`) && aToB !== "..") || (!bToA.startsWith(`..${sep}`) && bToA !== "..");
  if (nested) throw new ArborError("WRITE_CONFINEMENT_UNAVAILABLE", `Package private state overlaps ${label}`);
}

function parseNul(buffer: Buffer): string[] {
  const values = buffer.toString("utf8").split("\0");
  if (values.at(-1) === "") values.pop();
  return values;
}

function globRegex(glob: string): RegExp {
  assertSafeRelativePath(glob.replace(/[?*]/gu, "x"));
  let source = "^";
  for (let index = 0; index < glob.length; index += 1) {
    const char = glob[index]!;
    if (char === "*") {
      if (glob[index + 1] === "*") { index += 1; source += glob[index + 1] === "/" ? "(?:.*/)?" : ".*"; if (glob[index + 1] === "/") index += 1; }
      else source += "[^/]*";
    } else if (char === "?") source += "[^/]";
    else source += char.replace(/[\\^$.[\]{}()+|]/gu, "\\$&");
  }
  return new RegExp(`${source}$`, "u");
}

function matches(path: string, globs: readonly string[]): boolean { return globs.some((glob) => globRegex(glob).test(path)); }

function walkEntries(root: string): string[] {
  const output: string[] = [];
  const visit = (directory: string): void => {
    for (const name of readdirSync(directory).sort()) {
      const path = join(directory, name); const stat = lstatSync(path);
      output.push(path); if (stat.isDirectory() && !stat.isSymbolicLink()) visit(path);
    }
  };
  if (existsSync(root)) visit(root);
  return output;
}

function inodeKeys(root: string): Set<string> {
  return new Set(walkEntries(root).filter((path) => lstatSync(path).isFile()).map((path) => { const stat = lstatSync(path, { bigint: true }); return `${stat.dev}:${stat.ino}`; }));
}

function objectStoreDigest(root: string): string {
  return digestCanonical(walkEntries(root).filter((path) => lstatSync(path).isFile()).map((path) => ({ path: relative(root, path).split(sep).join("/"), digest: sha256(readFileSync(path)), bytes: lstatSync(path).size })).sort((left, right) => left.path.localeCompare(right.path)));
}

export function hardenPackagePrivateRepository(root: string): void {
  const owner = process.getuid?.();
  for (const path of [root, ...walkEntries(root)]) {
    const stat = lstatSync(path);
    if (stat.isSymbolicLink()) throw new ArborError("WRITE_CONFINEMENT_UNAVAILABLE", "Package private repository contains a symlink", { path: basename(path) });
    if (owner !== undefined && stat.uid !== owner) throw new ArborError("WRITE_CONFINEMENT_UNAVAILABLE", "Package private repository has a foreign owner", { path: basename(path) });
    chmodSync(path, stat.isDirectory() ? 0o700 : 0o600);
  }
}

export function assertPackagePrivateRepository(input: { privateGitDir: string; stateRoot: string }): PrivateRepositoryIdentityV1 {
  const stateRoot = realpathSync(input.stateRoot); const privateGitDir = realpathSync(input.privateGitDir);
  const rel = relative(stateRoot, privateGitDir);
  if (rel === "" || rel === ".." || rel.startsWith(`..${sep}`) || basename(privateGitDir) !== "private.git") throw new ArborError("WRITE_CONFINEMENT_UNAVAILABLE", "Private Git directory is not package-owned under configured state");
  const repositoryRoot = dirname(privateGitDir); const identityPath = join(repositoryRoot, IDENTITY_FILE);
  const identityStat = lstatSync(identityPath); const privateStat = lstatSync(privateGitDir); const owner = process.getuid?.();
  if (!identityStat.isFile() || identityStat.isSymbolicLink() || !privateStat.isDirectory() || privateStat.isSymbolicLink() || (identityStat.mode & 0o077) !== 0 || (privateStat.mode & 0o077) !== 0 || (owner !== undefined && (identityStat.uid !== owner || privateStat.uid !== owner))) throw new ArborError("WRITE_CONFINEMENT_UNAVAILABLE", "Private repository ownership certificate is not owner-only");
  const identity = JSON.parse(readFileSync(identityPath, "utf8")) as PrivateRepositoryIdentityV1;
  const { identityDigest, ...payload } = identity;
  if (identity.version !== 1 || identity.privateGitDir !== privateGitDir || identity.repositoryRoot !== repositoryRoot || (identity.stateRoot !== stateRoot || !repositoryRoot.startsWith(`${stateRoot}${sep}`)) || identityDigest !== digestCanonical(payload)) throw new ArborError("WRITE_CONFINEMENT_UNAVAILABLE", "Private repository identity certificate is invalid");
  const config = join(privateGitDir, "config"); const configStat = lstatSync(config);
  if (!configStat.isFile() || configStat.isSymbolicLink() || (configStat.mode & 0o077) !== 0 || sha256(readFileSync(config)) !== identity.configDigest) throw new ArborError("WRITE_CONFINEMENT_UNAVAILABLE", "Private repository executable configuration changed");
  for (const source of [identity.sourceCheckout, identity.sourceGitDir, identity.sourceCommonDir, ...identity.siblingCheckouts]) assertDisjoint(privateGitDir, source, "a source checkout, Git common directory, or sibling worktree");
  return identity;
}

function privateConfig(format: "sha1" | "sha256"): string {
  return format === "sha256"
    ? "[extensions]\n\tobjectformat = sha256\n[core]\n\trepositoryformatversion = 1\n\tfilemode = true\n\tbare = true\n"
    : "[core]\n\trepositoryformatversion = 0\n\tfilemode = true\n\tbare = true\n";
}

function copyObjectStore(source: string, destination: string): { copiedFiles: number; retainedFiles: number; bytes: number; digest: string } {
  let copiedFiles = 0; let retainedFiles = 0; let bytes = 0; const copied: Array<{ path: string; bytes: number; digest: string; disposition: "copied" | "retained" }> = [];
  const visit = (from: string, to: string, prefix: string): void => {
    mkdirSync(to, { recursive: true, mode: 0o700 });
    for (const name of readdirSync(from).sort()) {
      const sourcePath = join(from, name); const destinationPath = join(to, name); const relativePath = prefix ? `${prefix}/${name}` : name; const stat = lstatSync(sourcePath);
      if (stat.isDirectory() && !stat.isSymbolicLink()) { visit(sourcePath, destinationPath, relativePath); continue; }
      if (!stat.isFile() || stat.isSymbolicLink()) throw new ArborError("WRITE_CONFINEMENT_UNAVAILABLE", "Source Git object store contains a non-regular entry", { relativePath });
      bytes += stat.size;
      if (copied.length >= 1_000_000 || stat.size > 1_073_741_824 || bytes > 4_294_967_296) throw new ArborError("WRITE_CONFINEMENT_UNAVAILABLE", "Source Git object store exceeds the bounded dissociation inventory");
      const digest = sha256(readFileSync(sourcePath));
      if (existsSync(destinationPath)) {
        const existing = lstatSync(destinationPath);
        if (!existing.isFile() || existing.isSymbolicLink() || sha256(readFileSync(destinationPath)) !== digest) throw new ArborError("WRITE_CONFINEMENT_UNAVAILABLE", "Existing private Git object conflicts with exact source content", { relativePath });
        retainedFiles += 1; copied.push({ path: relativePath, bytes: stat.size, digest, disposition: "retained" });
      } else { copyFileSync(sourcePath, destinationPath); chmodSync(destinationPath, 0o600); copiedFiles += 1; copied.push({ path: relativePath, bytes: stat.size, digest, disposition: "copied" }); }
    }
  };
  visit(source, destination, "");
  return { copiedFiles, retainedFiles, bytes, digest: digestCanonical(copied) };
}

function workspaceMetadataPath(repositoryRoot: string, attemptId: string): string { return join(repositoryRoot, "trusted-metadata", "workspaces", `${attemptId}.v1.json`); }

export class PackageWorkspaceManager implements WorkspaceManager {
  readonly stateRoot: string;
  readonly repositoryRoot: string;
  readonly privateGitDir: string;
  readonly sourceCheckout: string;
  readonly repositoryId: string;
  readonly expectedSourceOid: GitOid;
  readonly gitOidLength: 40 | 64;
  #imported?: ImportedRepositoryV1;
  #importing?: Promise<ImportedRepositoryV1>;
  readonly #attemptWorkspaces = new Map<string, string>();

  constructor(options: PackageRepositoryOptionsV1) {
    if (!/^[a-z][a-z0-9_]{2,63}$/u.test(options.repositoryId)) throw new ArborError("VALIDATION_FAILED", "Invalid repository ID");
    this.stateRoot = realpathSync(options.stateRoot); this.repositoryId = options.repositoryId;
    this.repositoryRoot = join(this.stateRoot, "repositories", options.repositoryId); this.privateGitDir = join(this.repositoryRoot, "private.git");
    this.sourceCheckout = realpathSync(options.sourceCheckout); this.expectedSourceOid = options.expectedSourceOid;
    this.gitOidLength = options.gitOidLength ?? (options.expectedSourceOid.length as 40 | 64);
    if (!new RegExp(`^[0-9a-f]{${this.gitOidLength}}$`, "u").test(this.expectedSourceOid)) throw new ArborError("VALIDATION_FAILED", "Invalid exact source OID");
    assertDisjoint(this.stateRoot, this.sourceCheckout, "the source checkout");
  }

  async importExactSource(): Promise<ImportedRepositoryV1> { if (this.#imported) return this.#imported; this.#importing ??= this.#performImport(); return this.#importing; }

  async #performImport(): Promise<ImportedRepositoryV1> {
    const sourceGitDir = (await git(["-C", this.sourceCheckout, "rev-parse", "--absolute-git-dir"], { stateRoot: this.stateRoot }, "Resolve source Git directory")).toString("utf8").trim();
    const sourceCommonDir = (await git(["-C", this.sourceCheckout, "rev-parse", "--path-format=absolute", "--git-common-dir"], { stateRoot: this.stateRoot }, "Resolve source common directory")).toString("utf8").trim();
    const actualOid = (await git(["-C", this.sourceCheckout, "rev-parse", "--verify", `${this.expectedSourceOid}^{commit}`], { stateRoot: this.stateRoot }, "Verify exact source OID")).toString("utf8").trim();
    if (actualOid !== this.expectedSourceOid) throw new ArborError("EVIDENCE_INVALID", "Source OID did not resolve exactly");
    const format = (await git(["-C", this.sourceCheckout, "rev-parse", "--show-object-format"], { stateRoot: this.stateRoot }, "Read object format")).toString("utf8").trim();
    if (format !== "sha1" && format !== "sha256") throw new ArborError("WRITE_CONFINEMENT_UNAVAILABLE", "Unsupported Git object format");
    const objectFormat = format as "sha1" | "sha256";
    if ((objectFormat === "sha1" ? 40 : 64) !== this.gitOidLength) throw new ArborError("EVIDENCE_INVALID", "Certified Git OID length does not match repository");
    const worktreeRows = parseNul(await git(["-C", this.sourceCheckout, "worktree", "list", "--porcelain", "-z"], { stateRoot: this.stateRoot }, "Inventory source worktrees"));
    const siblingCheckouts = worktreeRows.filter((row) => row.startsWith("worktree ")).map((row) => realpathSync(row.slice("worktree ".length))).sort();
    for (const source of [realpathSync(sourceGitDir), realpathSync(sourceCommonDir), ...siblingCheckouts]) assertDisjoint(this.stateRoot, source, "a source Git common directory or sibling worktree");

    mkdirSync(this.repositoryRoot, { recursive: true, mode: 0o700 }); chmodSync(this.repositoryRoot, 0o700); assertUnder(this.stateRoot, this.repositoryRoot);
    const identityPath = join(this.repositoryRoot, IDENTITY_FILE);
    let identity: PrivateRepositoryIdentityV1;
    if (existsSync(this.privateGitDir) || existsSync(identityPath)) {
      if (!existsSync(this.privateGitDir) || !existsSync(identityPath)) throw new ArborError("WRITE_CONFINEMENT_UNAVAILABLE", "Existing private repository is incomplete and will not be replaced");
      identity = assertPackagePrivateRepository({ privateGitDir: this.privateGitDir, stateRoot: this.stateRoot });
      if (identity.repositoryId !== this.repositoryId || identity.sourceCheckout !== this.sourceCheckout || identity.sourceGitDir !== realpathSync(sourceGitDir) || identity.sourceCommonDir !== realpathSync(sourceCommonDir) || identity.objectFormat !== objectFormat || digestCanonical(identity.siblingCheckouts) !== digestCanonical(siblingCheckouts)) throw new ArborError("WRITE_CONFINEMENT_UNAVAILABLE", "Existing private repository identity does not match this package source");
    } else {
      const template = join(this.repositoryRoot, "trusted-metadata", "empty-git-template"); mkdirSync(template, { recursive: true, mode: 0o700 });
      await git(["init", "--bare", `--object-format=${objectFormat}`, `--template=${template}`, this.privateGitDir], { stateRoot: this.repositoryRoot }, "Initialize package private repository");
      const config = privateConfig(objectFormat); writeFileSync(join(this.privateGitDir, "config"), config, { encoding: "utf8", mode: 0o600, flag: "w" });
      const payload = { version: 1 as const, repositoryId: this.repositoryId, stateRoot: this.stateRoot, repositoryRoot: this.repositoryRoot, privateGitDir: realpathSync(this.privateGitDir), sourceCheckout: this.sourceCheckout, sourceGitDir: realpathSync(sourceGitDir), sourceCommonDir: realpathSync(sourceCommonDir), siblingCheckouts, objectFormat, configDigest: sha256(config), ownerUid: process.getuid?.() ?? -1 };
      identity = { ...payload, identityDigest: digestCanonical(payload) }; writeFileSync(identityPath, `${canonicalJson(identity)}\n`, { encoding: "utf8", mode: 0o600, flag: "wx" });
    }

    const present = await runGit([`--git-dir=${this.privateGitDir}`, "cat-file", "-e", `${this.expectedSourceOid}^{commit}`], { stateRoot: this.repositoryRoot, maxOutputBytes: 4096 });
    if (present.exitCode !== 0) copyObjectStore(join(realpathSync(sourceCommonDir), "objects"), join(this.privateGitDir, "objects"));
    await git([`--git-dir=${this.privateGitDir}`, "cat-file", "-e", `${this.expectedSourceOid}^{commit}`], { stateRoot: this.repositoryRoot }, "Verify private exact OID");
    const packageRef = `refs/pi-fabric-arbor/imports/${this.expectedSourceOid}`; assertPackageRef(packageRef);
    const existingRef = await runGit([`--git-dir=${this.privateGitDir}`, "rev-parse", "--verify", packageRef], { stateRoot: this.repositoryRoot, maxOutputBytes: 4096 });
    if (existingRef.exitCode === 0) { if (existingRef.stdout.toString("utf8").trim() !== this.expectedSourceOid) throw new ArborError("QUARANTINED", "Existing package import ref has a mismatched exact OID"); }
    else await git([`--git-dir=${this.privateGitDir}`, "update-ref", packageRef, this.expectedSourceOid, "0".repeat(this.gitOidLength)], { stateRoot: this.repositoryRoot }, "Create package import ref");

    const alternates = join(this.privateGitDir, "objects", "info", "alternates"); if (existsSync(alternates)) throw new ArborError("WRITE_CONFINEMENT_UNAVAILABLE", "Private repository uses object alternates");
    const refs = (await git([`--git-dir=${this.privateGitDir}`, "for-each-ref", "--format=%(refname)%00%(objectname)"], { stateRoot: this.repositoryRoot }, "Verify private refs")).toString("utf8").split("\n").filter(Boolean).sort();
    if (refs.some((row) => !row.startsWith("refs/pi-fabric-arbor/"))) throw new ArborError("WRITE_CONFINEMENT_UNAVAILABLE", "Private repository contains a non-package ref", { refs });
    const remotes = (await git([`--git-dir=${this.privateGitDir}`, "remote"], { stateRoot: this.repositoryRoot }, "Verify private remotes")).toString("utf8").trim(); if (remotes) throw new ArborError("WRITE_CONFINEMENT_UNAVAILABLE", "Private repository has a remote");
    const sourceInodes = inodeKeys(join(realpathSync(sourceCommonDir), "objects")); const privateInodes = inodeKeys(join(this.privateGitDir, "objects"));
    for (const key of privateInodes) if (sourceInodes.has(key)) throw new ArborError("WRITE_CONFINEMENT_UNAVAILABLE", "Private Git object is hard-linked to source storage");
    hardenPackagePrivateRepository(this.privateGitDir); chmodSync(identityPath, 0o600);
    identity = assertPackagePrivateRepository({ privateGitDir: this.privateGitDir, stateRoot: this.stateRoot });
    const sourceIdentityDigest = digestCanonical({ sourceCheckout: this.sourceCheckout, sourceGitDir: identity.sourceGitDir, sourceCommonDir: identity.sourceCommonDir, siblingCheckouts, repositoryId: this.repositoryId });
    const ownershipCertificateDigest = digestCanonical({ identityDigest: identity.identityDigest, ownerUid: identity.ownerUid, repositoryMode: lstatSync(this.repositoryRoot).mode & 0o777, privateGitMode: lstatSync(this.privateGitDir).mode & 0o777, configDigest: identity.configDigest, verified: true });
    const dissociationDigest = digestCanonical({ privateGitDir: this.privateGitDir, sourceIdentityDigest, packageRef, refs, alternates: false, remotes: false, sharedInodes: false, commonDirectoryShared: false, privateObjectStoreDigest: objectStoreDigest(join(this.privateGitDir, "objects")), ownershipCertificateDigest });
    this.#imported = Object.freeze({ version: 1, repositoryId: this.repositoryId, privateGitDir: this.privateGitDir, sourceIdentityDigest, importedOid: this.expectedSourceOid, objectFormat, packageRef, dissociationDigest, ownershipCertificateDigest });
    return this.#imported;
  }

  workspacePath(runId: string, workspaceId: string): string {
    if (!/^[a-z][a-z0-9_]{2,63}$/u.test(runId) || !/^[a-z][a-z0-9_]{2,63}$/u.test(workspaceId)) throw new ArborError("VALIDATION_FAILED", "Invalid workspace identity");
    const path = join(this.repositoryRoot, "runs", runId, "workspaces", workspaceId); assertUnder(this.repositoryRoot, path); return path;
  }

  async exportCommittedOid(oid: string, destination: string): Promise<string> {
    await this.importExactSource();
    const manifest = await exportCommittedTree({ privateGitDir: this.privateGitDir, oid, stateRoot: this.repositoryRoot, destination });
    return manifest.manifestDigest;
  }

  async materialize(request: WorkspaceMaterializationRequestV1): Promise<WorkspaceObservationV1> {
    const imported = await this.importExactSource(); if (request.baseOid !== imported.importedOid) throw new ArborError("EVIDENCE_INVALID", "Workspace base OID does not match imported exact OID");
    const workspace = this.workspacePath(request.runId, request.workspaceId); const metadataPath = workspaceMetadataPath(this.repositoryRoot, request.attemptId);
    let metadata: WorkspaceMetadataV1;
    if (existsSync(workspace) || existsSync(metadataPath)) {
      if (!existsSync(workspace) || !existsSync(metadataPath)) throw new ArborError("EVIDENCE_INVALID", "Existing worker export lacks trusted recovery metadata");
      metadata = JSON.parse(readFileSync(metadataPath, "utf8")) as WorkspaceMetadataV1; const { metadataDigest, ...payload } = metadata;
      const stat = statSync(workspace, { bigint: true });
      if (metadataDigest !== digestCanonical(payload) || metadata.runId !== request.runId || metadata.attemptId !== request.attemptId || metadata.workspaceId !== request.workspaceId || metadata.workspace !== realpathSync(workspace) || metadata.baseOid !== request.baseOid || metadata.privateRepositoryIdentityDigest !== assertPackagePrivateRepository({ privateGitDir: this.privateGitDir, stateRoot: this.stateRoot }).identityDigest || metadata.rootIdentity.device !== stat.dev.toString() || metadata.rootIdentity.inode !== stat.ino.toString()) throw new ArborError("EVIDENCE_INVALID", "Worker export recovery metadata does not match the requested identity");
      readWorkspaceTreeManifest(workspace);
    } else {
      mkdirSync(dirname(workspace), { recursive: true, mode: 0o700 }); const exportManifestDigest = await this.exportCommittedOid(request.baseOid, workspace); const stat = statSync(workspace, { bigint: true });
      const payload = { version: 1 as const, runId: request.runId, attemptId: request.attemptId, workspaceId: request.workspaceId, workspace: realpathSync(workspace), baseOid: request.baseOid, rootIdentity: { device: stat.dev.toString(), inode: stat.ino.toString() }, exportManifestDigest, privateRepositoryIdentityDigest: assertPackagePrivateRepository({ privateGitDir: this.privateGitDir, stateRoot: this.stateRoot }).identityDigest };
      metadata = { ...payload, metadataDigest: digestCanonical(payload) }; mkdirSync(dirname(metadataPath), { recursive: true, mode: 0o700 }); writeFileSync(metadataPath, `${canonicalJson(metadata)}\n`, { encoding: "utf8", mode: 0o600, flag: "wx" });
    }
    this.#attemptWorkspaces.set(request.attemptId, workspace);
    return Object.freeze({ version: 1, workspaceId: request.workspaceId, baseOid: request.baseOid, identityDigest: digestCanonical({ workspaceIdentity: metadata.rootIdentity, baseOid: request.baseOid, exportManifestDigest: metadata.exportManifestDigest, metadataDigest: metadata.metadataDigest, dissociationDigest: imported.dissociationDigest }), trust: "certified" });
  }

  async finalize(request: CandidateFinalizationRequestV1): Promise<CandidateV1> {
    await this.importExactSource(); if (request.baseOid !== this.expectedSourceOid) throw new ArborError("EVIDENCE_INVALID", "Candidate base OID does not equal the imported source OID");
    const actualWorkspace = this.#workspaceForAttempt(request.runId, request.attemptId); const firstManifest = readWorkspaceTreeManifest(actualWorkspace);
    const baseManifest = await readCommittedTreeManifest(this.privateGitDir, request.baseOid, this.repositoryRoot);
    const baseByPath = new Map(baseManifest.map((entry) => [entry.path, entry])); const actualByPath = new Map(firstManifest.map((entry) => [entry.path, entry]));
    const actualPaths = [...new Set([...baseByPath.keys(), ...actualByPath.keys()].filter((path) => { const base = baseByPath.get(path); const actual = actualByPath.get(path); return !base || !actual || base.mode !== actual.mode || base.type !== actual.type || base.contentDigest !== actual.contentDigest; }))].sort();
    const claimedPaths = [...new Set(request.changedPaths)].sort(); claimedPaths.forEach(assertSafeRelativePath);
    if (digestCanonical(actualPaths) !== digestCanonical(claimedPaths)) throw new ArborError("EVIDENCE_INVALID", "Worker changed-path claim does not equal the complete exported-tree diff", { claimedPaths, actualPaths });
    this.validatePathPolicy(actualPaths, request.contract);

    const indexFile = join(this.repositoryRoot, "trusted-metadata", "indexes", `${request.candidateId}-${randomUUID()}.index`); mkdirSync(dirname(indexFile), { recursive: true, mode: 0o700 });
    let tree = ""; let candidateOid = "";
    try {
      await git([`--git-dir=${this.privateGitDir}`, "read-tree", request.baseOid], { stateRoot: this.repositoryRoot, indexFile }, "Initialize trusted candidate index");
      for (const path of actualPaths) {
        const entry = actualByPath.get(path);
        if (!entry) { await git([`--git-dir=${this.privateGitDir}`, "update-index", "-z", "--index-info"], { stateRoot: this.repositoryRoot, indexFile, input: `0 ${"0".repeat(this.gitOidLength)}\t${path}\0` }, "Remove candidate index entry"); continue; }
        const bytes = readWorkspaceEntryBytes(actualWorkspace, entry);
        const blobOid = (await git([`--git-dir=${this.privateGitDir}`, "hash-object", "-t", "blob", "-w", "--stdin"], { stateRoot: this.repositoryRoot, input: bytes }, "Write unfiltered candidate blob")).toString("utf8").trim();
        await git([`--git-dir=${this.privateGitDir}`, "update-index", "--add", "--cacheinfo", `${entry.mode},${blobOid},${path}`], { stateRoot: this.repositoryRoot, indexFile }, "Update trusted candidate index");
      }
      tree = (await git([`--git-dir=${this.privateGitDir}`, "write-tree"], { stateRoot: this.repositoryRoot, indexFile }, "Write trusted candidate tree")).toString("utf8").trim();
      const commit = [`tree ${tree}`, `parent ${request.baseOid}`, "author pi-fabric-arbor <arbor@invalid> 0 +0000", "committer pi-fabric-arbor <arbor@invalid> 0 +0000", "", `Arbor candidate ${request.candidateId}`, ""].join("\n");
      candidateOid = (await git([`--git-dir=${this.privateGitDir}`, "hash-object", "-t", "commit", "-w", "--stdin"], { stateRoot: this.repositoryRoot, input: commit }, "Create deterministic candidate commit")).toString("utf8").trim();
    } finally { rmSync(indexFile, { force: true }); }
    if (!new RegExp(`^[0-9a-f]{${this.gitOidLength}}$`, "u").test(candidateOid)) throw new ArborError("EVIDENCE_INVALID", "Candidate OID is malformed");

    const raw = parseNul(await git([`--git-dir=${this.privateGitDir}`, "diff-tree", "-r", "--no-commit-id", "--raw", "-z", "--find-renames", "--no-ext-diff", "--no-abbrev", request.baseOid, candidateOid], { stateRoot: this.repositoryRoot }, "Read trusted candidate diff"));
    const entries: FinalizedDiffEntryV1[] = [];
    for (let index = 0; index < raw.length;) {
      const header = raw[index++]!; const match = /^:(\d{6}) (\d{6}) ([0-9a-f]+) ([0-9a-f]+) ([A-Z][0-9]*)$/u.exec(header);
      if (!match) throw new ArborError("EVIDENCE_INVALID", "Malformed machine Git diff record");
      const status = match[5]!; const pathCount = status.startsWith("R") || status.startsWith("C") ? 2 : 1; const paths = raw.slice(index, index + pathCount); index += pathCount;
      if (paths.length !== pathCount) throw new ArborError("EVIDENCE_INVALID", "Incomplete machine Git diff record"); paths.forEach(assertSafeRelativePath);
      const live = actualByPath.get(paths.at(-1)!); const type: FinalizedDiffEntryV1["type"] = status.startsWith("D") ? "deleted" : live?.type ?? "other";
      entries.push({ status, oldMode: match[1]!, newMode: match[2]!, oldOid: match[3]!, newOid: match[4]!, paths, type, ...(live?.symlinkTarget === undefined ? {} : { symlinkTarget: live.symlinkTarget }) });
    }
    const diffPaths = [...new Set(entries.flatMap((entry) => entry.paths))].sort(); if (digestCanonical(diffPaths) !== digestCanonical(actualPaths)) throw new ArborError("EVIDENCE_INVALID", "Trusted candidate diff does not equal the exported-tree manifest");
    const requiredOutputs: Array<{ path: string; digest: string; mode: string }> = request.contract.paths.requiredOutputs.map((path) => { assertSafeRelativePath(path); const entry = actualByPath.get(path); if (!entry) throw new ArborError("EVIDENCE_INVALID", "Required output is missing from candidate", { path }); return { path, digest: entry.contentDigest, mode: entry.mode }; });
    const finalManifest = readWorkspaceTreeManifest(actualWorkspace); if (digestCanonical(firstManifest) !== digestCanonical(finalManifest)) throw new ArborError("EVIDENCE_INVALID", "Worker export changed during trusted finalization");
    const committed = await readCommittedTreeManifest(this.privateGitDir, candidateOid, this.repositoryRoot); const expectedCommitted = finalManifest.map(({ symlinkTarget: _, ...entry }) => entry);
    if (digestCanonical(committed.map(({ oid: _, ...entry }) => entry)) !== digestCanonical(expectedCommitted)) throw new ArborError("EVIDENCE_INVALID", "Constructed candidate tree does not equal the validated worker export");

    const candidateRef = `refs/pi-fabric-arbor/${request.runId}/candidates/${request.candidateId}`; assertPackageRef(candidateRef);
    const existing = await runGit([`--git-dir=${this.privateGitDir}`, "rev-parse", "--verify", candidateRef], { stateRoot: this.repositoryRoot, maxOutputBytes: 4096 });
    if (existing.exitCode === 0) { if (existing.stdout.toString("utf8").trim() !== candidateOid) throw new ArborError("QUARANTINED", "Existing candidate ref has a different exact OID"); }
    else await git([`--git-dir=${this.privateGitDir}`, "update-ref", candidateRef, candidateOid, "0".repeat(this.gitOidLength)], { stateRoot: this.repositoryRoot }, "Publish immutable package candidate ref");
    hardenPackagePrivateRepository(this.privateGitDir); assertPackagePrivateRepository({ privateGitDir: this.privateGitDir, stateRoot: this.stateRoot });
    const manifestDigest = digestCanonical({ baseOid: request.baseOid, candidateOid, tree, entries, requiredOutputs, workspaceManifestDigest: digestCanonical(finalManifest) });
    return Object.freeze({ version: 1, candidateId: request.candidateId, hypothesisId: request.hypothesisId, attemptId: request.attemptId, baseOid: request.baseOid, candidateOid, changedPaths: actualPaths, manifestDigest });
  }

  #workspaceForAttempt(runId: string, attemptId: string): string {
    const remembered = this.#attemptWorkspaces.get(attemptId); const metadataPath = workspaceMetadataPath(this.repositoryRoot, attemptId);
    if (!existsSync(metadataPath)) throw new ArborError("UNKNOWN_ENTITY", "Attempt workspace trusted metadata is missing");
    const metadata = JSON.parse(readFileSync(metadataPath, "utf8")) as WorkspaceMetadataV1; const { metadataDigest, ...payload } = metadata;
    if (metadataDigest !== digestCanonical(payload) || metadata.runId !== runId || metadata.attemptId !== attemptId || (remembered !== undefined && remembered !== metadata.workspace) || !existsSync(metadata.workspace) || realpathSync(metadata.workspace) !== metadata.workspace) throw new ArborError("EVIDENCE_INVALID", "Attempt workspace trusted metadata is invalid");
    const stat = statSync(metadata.workspace, { bigint: true }); if (metadata.rootIdentity.device !== stat.dev.toString() || metadata.rootIdentity.inode !== stat.ino.toString()) throw new ArborError("EVIDENCE_INVALID", "Attempt workspace root identity changed");
    return metadata.workspace;
  }

  private validatePathPolicy(paths: readonly string[], contract: ArborContractV1): void {
    for (const path of paths) { if (matches(path, contract.paths.protected)) throw new ArborError("EVIDENCE_INVALID", "Candidate changes a protected path", { path }); if (!matches(path, contract.paths.editable)) throw new ArborError("EVIDENCE_INVALID", "Candidate changes a path outside the editable manifest", { path }); }
  }
}
