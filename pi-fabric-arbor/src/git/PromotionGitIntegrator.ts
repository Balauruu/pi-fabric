import { readFileSync, realpathSync } from "node:fs";
import type { ArborContractV1, GitOid, MergeConstructionV1, RefObservationV1 } from "../domain/types.js";
import { ArborError } from "../domain/errors.js";
import { digestCanonical, sha256 } from "../util/canonical.js";
import { assertPackageRef, assertSafeRelativePath, git, runGit } from "./git-process.js";
import { assertPackagePrivateRepository, hardenPackagePrivateRepository } from "./PackageWorkspaceManager.js";

export const DETACHED_MERGE_ALGORITHM_V1 = "merge-tree-write-tree+canonical-commit-v1" as const;

export interface DetachedMergeRequestV1 {
  version: 1;
  runId: string;
  role: "heldOutBaseline" | "heldOutCandidate";
  expectedResearchTrunkOid: GitOid;
  candidateOid: GitOid;
  candidateId?: string;
  contract: ArborContractV1;
}

export interface WinnerRefMutationV1 {
  version: 1;
  operationId: string;
  runId: string;
  expectedOid: GitOid;
  targetOid: GitOid;
}

export interface PromotionGitIntegrator {
  buildDetached(request: DetachedMergeRequestV1): Promise<MergeConstructionV1>;
  observeWinnerRef(runId: string): Promise<RefObservationV1>;
  applyWinnerRef(request: WinnerRefMutationV1): Promise<void>;
  winnerRef(runId: string): string;
}

interface RawDiffEntry {
  status: string;
  oldMode: string;
  newMode: string;
  oldOid: string;
  newOid: string;
  paths: string[];
}

function parseNul(buffer: Buffer): string[] {
  const values = buffer.toString("utf8").split("\0");
  if (values.at(-1) === "") values.pop();
  return values;
}

function parseRawDiff(buffer: Buffer): RawDiffEntry[] {
  const raw = parseNul(buffer);
  const entries: RawDiffEntry[] = [];
  for (let index = 0; index < raw.length;) {
    const header = raw[index++]!;
    const match = /^:(\d{6}) (\d{6}) ([0-9a-f]+) ([0-9a-f]+) ([A-Z][0-9]*)$/u.exec(header);
    if (!match) throw new ArborError("EVIDENCE_INVALID", "Malformed detached merge diff record");
    const count = match[5]!.startsWith("R") || match[5]!.startsWith("C") ? 2 : 1;
    const paths = raw.slice(index, index + count);
    index += count;
    if (paths.length !== count) throw new ArborError("EVIDENCE_INVALID", "Incomplete detached merge rename record");
    paths.forEach(assertSafeRelativePath);
    entries.push({ status: match[5]!, oldMode: match[1]!, newMode: match[2]!, oldOid: match[3]!, newOid: match[4]!, paths });
  }
  return entries;
}

function globRegex(glob: string): RegExp {
  assertSafeRelativePath(glob.replace(/[?*]/gu, "x"));
  let source = "^";
  for (let index = 0; index < glob.length; index += 1) {
    const character = glob[index]!;
    if (character === "*") {
      if (glob[index + 1] === "*") {
        index += 1;
        source += glob[index + 1] === "/" ? "(?:.*/)?" : ".*";
        if (glob[index + 1] === "/") index += 1;
      } else source += "[^/]*";
    } else if (character === "?") source += "[^/]";
    else source += character.replace(/[\\^$.[\]{}()+|]/gu, "\\$&");
  }
  return new RegExp(`${source}$`, "u");
}

function matches(path: string, globs: readonly string[]): boolean {
  return globs.some((glob) => globRegex(glob).test(path));
}

function zeroOid(length: number): string { return "0".repeat(length); }

export class PrivateRepositoryPromotionGitIntegrator implements PromotionGitIntegrator {
  readonly privateGitDir: string;
  readonly stateRoot: string;
  readonly gitOidLength: 40 | 64;
  readonly algorithmDigest: string;
  readonly privateRepositoryIdentityDigest: string;

  constructor(input: { privateGitDir: string; stateRoot: string; gitOidLength: 40 | 64 }) {
    this.stateRoot = realpathSync(input.stateRoot);
    const identity = assertPackagePrivateRepository({ privateGitDir: input.privateGitDir, stateRoot: this.stateRoot });
    this.privateGitDir = identity.privateGitDir;
    this.privateRepositoryIdentityDigest = identity.identityDigest;
    this.gitOidLength = input.gitOidLength;
    if ((identity.objectFormat === "sha1" ? 40 : 64) !== this.gitOidLength) throw new ArborError("WRITE_CONFINEMENT_UNAVAILABLE", "Private repository object format does not match the configured OID length");
    this.algorithmDigest = digestCanonical({ version: 1, algorithm: DETACHED_MERGE_ALGORITHM_V1, sourceDigest: sha256(readFileSync(new URL(import.meta.url))), privateRepositoryIdentityDigest: identity.identityDigest });
  }

  winnerRef(runId: string): string {
    if (!/^[a-z][a-z0-9_]{2,63}$/u.test(runId)) throw new ArborError("VALIDATION_FAILED", "Invalid run ID for winner ref");
    const ref = `refs/pi-fabric-arbor/${runId}/winner`;
    assertPackageRef(ref);
    return ref;
  }

  async buildDetached(request: DetachedMergeRequestV1): Promise<MergeConstructionV1> {
    this.#assertPrivateRepository();
    this.#assertOid(request.expectedResearchTrunkOid);
    this.#assertOid(request.candidateOid);
    const beforeRefs = await this.#refManifest();
    await this.#requireCommit(request.expectedResearchTrunkOid, "research trunk");
    await this.#requireCommit(request.candidateOid, "candidate");

    const merge = await runGit([
      `--git-dir=${this.privateGitDir}`, "merge-tree", "--write-tree", request.expectedResearchTrunkOid, request.candidateOid,
    ], { stateRoot: this.stateRoot, maxOutputBytes: 1_048_576 });
    if (merge.exitCode !== 0 || merge.timedOut || merge.cancelled || merge.oversized) {
      throw new ArborError("EVIDENCE_INVALID", "Detached merge candidate is conflicted or unobservable", { stderrDigest: sha256(merge.stderr) });
    }
    const lines = merge.stdout.toString("utf8").trim().split("\n");
    if (lines.length !== 1 || !this.#oidPattern().test(lines[0]!)) throw new ArborError("EVIDENCE_INVALID", "Detached merge-tree output was not one exact tree OID");
    const treeOid = lines[0]!;
    const canonicalCommit = [
      `tree ${treeOid}`,
      `parent ${request.expectedResearchTrunkOid}`,
      `parent ${request.candidateOid}`,
      "author pi-fabric-arbor <arbor@invalid> 0 +0000",
      "committer pi-fabric-arbor <arbor@invalid> 0 +0000",
      "",
      `Arbor detached ${request.role} merge`,
      "",
    ].join("\n");
    const mergeCandidateOid = (await git([
      `--git-dir=${this.privateGitDir}`, "hash-object", "-t", "commit", "-w", "--stdin",
    ], { stateRoot: this.stateRoot, input: canonicalCommit }, "Create deterministic detached merge commit")).toString("utf8").trim();
    this.#assertOid(mergeCandidateOid);
    const verifiedTree = (await git([`--git-dir=${this.privateGitDir}`, "show", "-s", "--format=%T", mergeCandidateOid], { stateRoot: this.stateRoot }, "Verify detached merge tree")).toString("utf8").trim();
    if (verifiedTree !== treeOid) throw new ArborError("EVIDENCE_INVALID", "Detached merge commit tree mismatch");

    const entries = parseRawDiff(await git([
      `--git-dir=${this.privateGitDir}`, "diff-tree", "-r", "--no-commit-id", "--raw", "-z", "--find-renames", "--no-abbrev", request.expectedResearchTrunkOid, mergeCandidateOid,
    ], { stateRoot: this.stateRoot }, "Inspect complete detached merge diff"));
    const changedPaths = [...new Set(entries.flatMap((entry) => entry.paths))].sort();
    if (request.role === "heldOutBaseline" && changedPaths.length !== 0) throw new ArborError("EVIDENCE_INVALID", "Held-out baseline construction is not an identity merge");
    for (const path of changedPaths) {
      if (matches(path, request.contract.paths.protected)) throw new ArborError("EVIDENCE_INVALID", "Detached merge changes a protected path", { path });
      if (!matches(path, request.contract.paths.editable)) throw new ArborError("EVIDENCE_INVALID", "Detached merge changes a path outside the editable manifest", { path });
    }

    const diffEntries: MergeConstructionV1["diffEntries"] = [];
    for (const entry of entries) {
      const livePath = entry.paths.at(-1)!;
      const deleted = entry.status.startsWith("D");
      let type: "file" | "symlink" | "deleted" = deleted ? "deleted" : "file";
      let symlinkTarget: string | undefined;
      if (!deleted) {
        if (entry.newMode === "120000") {
          type = "symlink";
          symlinkTarget = (await git([`--git-dir=${this.privateGitDir}`, "show", `${mergeCandidateOid}:${livePath}`], { stateRoot: this.stateRoot }, "Read detached symlink target")).toString("utf8");
          if (symlinkTarget.startsWith("/") || symlinkTarget.split("/").includes("..")) throw new ArborError("EVIDENCE_INVALID", "Detached merge symlink can escape", { path: livePath });
        } else if (entry.newMode !== "100644" && entry.newMode !== "100755") {
          throw new ArborError("EVIDENCE_INVALID", "Detached merge contains an unsupported mode", { path: livePath, mode: entry.newMode });
        }
      }
      diffEntries.push({ ...entry, type, ...(symlinkTarget === undefined ? {} : { symlinkTarget }) });
    }

    const requiredOutputs: MergeConstructionV1["requiredOutputs"] = [];
    for (const path of request.contract.paths.requiredOutputs) {
      assertSafeRelativePath(path);
      const row = (await git([`--git-dir=${this.privateGitDir}`, "ls-tree", "-z", mergeCandidateOid, "--", path], { stateRoot: this.stateRoot }, "Inspect detached required output")).toString("utf8");
      const match = /^(\d{6}) (blob) ([0-9a-f]+)\t([^\0]+)\0$/u.exec(row);
      if (!match || match[4] !== path) throw new ArborError("EVIDENCE_INVALID", "Required output is missing from detached merge", { path });
      const bytes = await git([`--git-dir=${this.privateGitDir}`, "cat-file", "blob", `${mergeCandidateOid}:${path}`], { stateRoot: this.stateRoot }, "Read detached required output");
      if (match[1] === "120000") { const target = bytes.toString("utf8"); if (target.startsWith("/") || target.split("/").includes("..")) throw new ArborError("EVIDENCE_INVALID", "Required-output symlink can escape", { path }); }
      else if (match[1] !== "100644" && match[1] !== "100755") throw new ArborError("EVIDENCE_INVALID", "Required output has unsupported mode", { path, mode: match[1] });
      requiredOutputs.push({ path, digest: sha256(bytes), mode: match[1]!, type: match[1] === "120000" ? "symlink" : "file" });
    }
    const protectedManifest = await this.#treeManifest(mergeCandidateOid, request.contract.paths.protected);
    const fullTreeManifest = await this.#treeManifest(mergeCandidateOid);
    const afterRefs = await this.#refManifest();
    hardenPackagePrivateRepository(this.privateGitDir);
    this.#assertPrivateRepository();
    if (beforeRefs.digest !== afterRefs.digest) throw new ArborError("QUARANTINED", "Detached construction changed a repository ref");
    const manifestPayload = {
      algorithm: DETACHED_MERGE_ALGORITHM_V1,
      algorithmDigest: this.algorithmDigest,
      role: request.role,
      expectedResearchTrunkOid: request.expectedResearchTrunkOid,
      candidateOid: request.candidateOid,
      mergeCandidateOid,
      treeOid,
      diffEntries,
      changedPaths,
      requiredOutputs,
      protectedManifest,
      fullTreeManifestDigest: digestCanonical(fullTreeManifest),
      refsDigest: beforeRefs.digest,
    };
    return Object.freeze({
      version: 1,
      constructionId: `merge_${sha256(digestCanonical(manifestPayload)).slice(0, 32)}`,
      role: request.role,
      ...(request.candidateId ? { candidateId: request.candidateId } : {}),
      expectedResearchTrunkOid: request.expectedResearchTrunkOid,
      candidateOid: request.candidateOid,
      mergeCandidateOid,
      treeOid,
      algorithmDigest: this.algorithmDigest,
      diffEntries,
      changedPaths,
      requiredOutputs,
      requiredOutputsDigest: digestCanonical(requiredOutputs),
      protectedManifest,
      protectedManifestDigest: digestCanonical(protectedManifest),
      fullTreeManifestDigest: digestCanonical(fullTreeManifest),
      beforeRefsDigest: beforeRefs.digest,
      afterRefsDigest: afterRefs.digest,
      manifestDigest: digestCanonical(manifestPayload),
    });
  }

  async observeWinnerRef(runId: string): Promise<RefObservationV1> {
    this.#assertPrivateRepository();
    const ref = this.winnerRef(runId);
    const result = await runGit([`--git-dir=${this.privateGitDir}`, "rev-parse", "--verify", ref], { stateRoot: this.stateRoot, maxOutputBytes: 4096 });
    if (result.timedOut || result.cancelled || result.oversized) return { version: 1, observable: false, ref, observationDigest: digestCanonical({ ref, classification: "unobservable" }) };
    if (result.exitCode !== 0) {
      const stderr = result.stderr.toString("utf8");
      if (/unknown revision|Needed a single revision|ambiguous argument|does not exist/u.test(stderr)) {
        const actualOid = zeroOid(this.gitOidLength);
        return { version: 1, observable: true, ref, actualOid, observationDigest: digestCanonical({ ref, actualOid }) };
      }
      return { version: 1, observable: false, ref, observationDigest: digestCanonical({ ref, stderrDigest: sha256(result.stderr) }) };
    }
    const actualOid = result.stdout.toString("utf8").trim();
    if (!this.#oidPattern().test(actualOid)) return { version: 1, observable: false, ref, observationDigest: digestCanonical({ ref, malformed: sha256(result.stdout) }) };
    return { version: 1, observable: true, ref, actualOid, observationDigest: digestCanonical({ ref, actualOid }) };
  }

  async applyWinnerRef(request: WinnerRefMutationV1): Promise<void> {
    this.#assertPrivateRepository();
    const ref = this.winnerRef(request.runId);
    this.#assertOid(request.expectedOid);
    this.#assertOid(request.targetOid);
    if (request.targetOid !== zeroOid(this.gitOidLength)) await this.#requireCommit(request.targetOid, "winner target");
    const args = request.targetOid === zeroOid(this.gitOidLength)
      ? [`--git-dir=${this.privateGitDir}`, "update-ref", "-d", ref, request.expectedOid]
      : [`--git-dir=${this.privateGitDir}`, "update-ref", ref, request.targetOid, request.expectedOid];
    const result = await runGit(args, { stateRoot: this.stateRoot, maxOutputBytes: 65_536 });
    if (result.exitCode !== 0 || result.timedOut || result.cancelled || result.oversized) {
      throw new ArborError("INDETERMINATE", "Exact expected-OID winner-ref update did not report success", { operationId: request.operationId, stderrDigest: sha256(result.stderr) });
    }
    hardenPackagePrivateRepository(this.privateGitDir); this.#assertPrivateRepository();
  }

  #assertPrivateRepository(): void {
    const identity = assertPackagePrivateRepository({ privateGitDir: this.privateGitDir, stateRoot: this.stateRoot });
    if (identity.identityDigest !== this.privateRepositoryIdentityDigest) throw new ArborError("WRITE_CONFINEMENT_UNAVAILABLE", "Private repository identity changed after integrator admission");
  }

  async #requireCommit(oid: string, label: string): Promise<void> {
    const result = await runGit([`--git-dir=${this.privateGitDir}`, "cat-file", "-e", `${oid}^{commit}`], { stateRoot: this.stateRoot, maxOutputBytes: 4096 });
    if (result.exitCode !== 0) throw new ArborError("EVIDENCE_INVALID", `Exact ${label} OID is not a private-repository commit`);
  }

  #assertOid(oid: string): void {
    if (!this.#oidPattern().test(oid)) throw new ArborError("VALIDATION_FAILED", "Malformed exact Git OID");
  }

  #oidPattern(): RegExp { return new RegExp(`^[0-9a-f]{${this.gitOidLength}}$`, "u"); }

  async #refManifest(): Promise<{ refs: string[]; digest: string }> {
    const body = (await git([`--git-dir=${this.privateGitDir}`, "for-each-ref", "--format=%(refname)%00%(objectname)"], { stateRoot: this.stateRoot }, "Read private ref manifest")).toString("utf8");
    const refs = body.split("\n").filter(Boolean).sort();
    if (refs.some((row) => !row.startsWith("refs/pi-fabric-arbor/"))) throw new ArborError("QUARANTINED", "Private repository contains a non-package ref");
    return { refs, digest: digestCanonical(refs) };
  }

  async #treeManifest(oid: string, globs?: readonly string[]): Promise<Array<{ path: string; mode: string; type: string; oid: string }>> {
    const rows = parseNul(await git([`--git-dir=${this.privateGitDir}`, "ls-tree", "-rz", "-r", "--full-tree", oid], { stateRoot: this.stateRoot }, "Read detached tree manifest"));
    const output: Array<{ path: string; mode: string; type: string; oid: string }> = [];
    for (const row of rows) {
      const tab = row.indexOf("\t");
      const [mode, type, objectOid] = row.slice(0, tab).split(" ");
      const path = row.slice(tab + 1);
      if (tab < 0 || !mode || !type || !objectOid) throw new ArborError("EVIDENCE_INVALID", "Malformed detached tree manifest");
      assertSafeRelativePath(path);
      if (!globs || matches(path, globs)) output.push({ path, mode, type, oid: objectOid });
    }
    return output.sort((left, right) => left.path.localeCompare(right.path));
  }
}
