import { execFileSync } from "node:child_process";
import { randomUUID, createHash } from "node:crypto";
import { mkdir, lstat, readdir, readFile, readlink, realpath, writeFile } from "node:fs/promises";
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { canonical, digest } from "../research/contracts.js";

export interface CaptureRequest { root: string; mutablePaths: string[]; evaluationInputs: string[]; selectedUntracked: string[] }
export interface Capture extends CaptureRequest { id: string; repository: string; baseline: string; originalOid: string | null; evaluationInputId: string; files: string[] }
export interface Candidate { id: string; directory: string; parent: string; oid: string | null }
interface Entry { path: string; mode: string; bytes: Buffer; stamp: string }
async function destination(path: string): Promise<string> { try { return await realpath(path); } catch (e) { if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e; return join(await destination(dirname(path)), basename(path)); } }
const inventoryId = (value: { entries: Entry[]; metadata: string; oid: string | null }) => digest({ ...value, entries: value.entries.map(e => ({ ...e, bytes: hash(e.bytes) })) });
const hash = (bytes: Buffer) => createHash("sha256").update(bytes).digest("hex");
export function materialPath(path: string): void {
  if (!path || path.includes("\0") || path.includes("\ufffd") || isAbsolute(path) || path.split("/").some(p => !p || p === "." || p === ".." || p.toLowerCase() === ".git")) throw new Error("Expected exact relative material path (no NUL/traversal/.git)");
}
const within = (root: string, path: string) => { const r = relative(root, path); return !r || (!isAbsolute(r) && r !== ".." && !r.startsWith(`..${sep}`)); };
/** Filenames travel only in NUL-delimited data or literal pathspecs. No source Git writes, filters, hooks or index refresh. */
export function gitBytes(cwd: string, args: string[], input?: Buffer, extra: Record<string, string> = {}): Buffer {
  const env = Object.fromEntries(Object.entries(process.env).filter(([k]) => !k.startsWith("GIT_")));
  return execFileSync("git", ["-c", "core.hooksPath=/dev/null", "-c", "core.fsmonitor=false", ...args], { cwd, env: { ...env, GIT_OPTIONAL_LOCKS: "0", GIT_CONFIG_NOSYSTEM: "1", GIT_CONFIG_GLOBAL: "/dev/null", ...extra }, ...(input ? { input } : {}), timeout: 10000, maxBuffer: 32 * 1024 * 1024, stdio: ["pipe", "pipe", "pipe"] });
}
export const gitText = (cwd: string, args: string[]) => gitBytes(cwd, args).toString("utf8");
function nul(bytes: Buffer): string[] { const text = bytes.toString("utf8"); if (!Buffer.from(text).equals(bytes)) throw new Error("Unsupported non-UTF8 filename"); return text.split("\0").filter(Boolean); }
function tree(repository: string, oid: string): Map<string, string> {
  return new Map(nul(gitBytes(repository, ["ls-tree", "-rz", "--full-tree", oid])).map(line => { const tab = line.indexOf("\t"), path = line.slice(tab + 1); materialPath(path); const entry = line.slice(0, tab); if (!/^(100644|100755|120000) blob [a-f0-9]+$/u.test(entry)) throw new Error("Unsupported submodule/tree entry"); return [path, entry]; }));
}
function inputIdentity(entries: Map<string, string>, paths: string[]): string { return digest([...entries].filter(([p]) => paths.some(s => p === s || p.startsWith(s + "/")))); }
export class Workspace {
  constructor(readonly directory: string) {}
  async #init(): Promise<string> {
    await mkdir(this.directory, { recursive: true }); const repository = join(await realpath(this.directory), "repository.git");
    try { await lstat(repository); } catch (e) { if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e; gitBytes(this.directory, ["init", "--bare", repository]); }
    if (await realpath(repository) !== repository || gitText(repository, ["rev-parse", "--is-bare-repository"]).trim() !== "true") throw new Error("Expected owned bare snapshot repository");
    return repository;
  }
  async #inventory(root: string, selected: string[], repository: string, allUntracked = false): Promise<{ entries: Entry[]; metadata: string; oid: string | null }> {
    let gitRoot: string | null = null;
    try { gitRoot = gitText(root, ["rev-parse", "--show-toplevel"]).trim(); } catch { /* Non-Git input never initialized in place. */ }
    let paths: string[], metadata = "nonGit", oid: string | null = null;
    if (gitRoot) {
      let sparse = ""; try { sparse = gitText(root, ["config", "--bool", "--get", "core.sparseCheckout"]).trim(); } catch (e) { if ((e as { status?: number }).status !== 1) throw e; }
      if (sparse === "true") throw new Error("Unsupported sparse checkout");
      if (gitText(root, ["rev-parse", "--show-superproject-working-tree"]).trim()) throw new Error("Unsupported submodule material root");
      if (gitRoot !== root && gitBytes(root, ["ls-files", "-z"]).length === 0) {
        let headPaths = 0; try { headPaths = gitBytes(root, ["ls-tree", "-rz", "HEAD"]).length; } catch { /* unborn enclosing repository */ }
        if (headPaths === 0) gitRoot = null; // Staged deletion is still Git material, not an unversioned directory.
      }
    }
    // config --get exits 1 when absent, unlike all other Git inspection errors.
    if (gitRoot) {
      const staged = gitBytes(root, ["ls-files", "--stage", "-z"]), flags = gitBytes(root, ["ls-files", "-v", "-z"]);
      if (nul(staged).some(e => /^160000 /u.test(e))) throw new Error("Unsupported submodule material");
      if (nul(staged).some(e => !/^[0-9]+ [a-f0-9]+ 0\t/u.test(e))) throw new Error("Unresolved merge in source index");
      if (nul(flags).some(e => /^[Ss] /u.test(e))) throw new Error("Unsupported sparse/skip-worktree index");
      try { oid = gitText(root, ["rev-parse", "--verify", "HEAD"]).trim(); } catch { /* unborn Git repository */ }
      if (oid && nul(gitBytes(root, ["ls-tree", "-rz", oid])).some(e => e.startsWith("160000 "))) throw new Error("Unsupported submodule material");
      paths = [...new Set([...nul(staged).map(e => e.slice(e.indexOf("\t") + 1)), ...(allUntracked ? nul(gitBytes(root, ["ls-files", "--others", "--exclude-standard", "-z"])) : selected)])];
      for (const path of selected) {
        try { gitBytes(root, ["check-ignore", "--no-index", "--quiet", "--", path]); throw new Error(`Selected ignored file excluded: ${path}`); }
        catch (e) { if ((e as { status?: number }).status !== 1) throw e; }
      }
      const indexPath = gitText(root, ["rev-parse", "--git-path", "index"]).trim();
      let index: Buffer = Buffer.alloc(0); try { index = await readFile(resolve(root, indexPath)); } catch (e) { if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e; }
      metadata = digest({ staged: hash(staged), flags: hash(flags), index: hash(index), oid });
    } else {
      paths = [];
      const walk = async (dir: string, prefix = "") => { for (const entry of await readdir(dir, { withFileTypes: true })) { if (entry.name === ".git") continue; const path = prefix + entry.name; materialPath(path); if (entry.isDirectory()) { try { gitBytes(repository, ["--work-tree", root, "check-ignore", "--no-index", "--quiet", "--", path + "/"]); continue; } catch (e) { if ((e as { status?: number }).status !== 1) throw e; } await walk(join(dir, entry.name), path + "/"); } else { paths.push(path); if (paths.length > 4096) throw new Error("Material inventory exceeds 4096 files"); } } };
      await walk(root);
      // Use Git's ignore implementation against the read-only original work tree.
      paths = paths.filter(path => { try { gitBytes(repository, ["--work-tree", root, "check-ignore", "--no-index", "--quiet", "--", path]); return false; } catch (e) { if ((e as { status?: number }).status !== 1) throw e; return true; } });
      if (selected.some(p => !paths.includes(p))) throw new Error("Selected file missing or ignored");
    }
    const entries: Entry[] = []; let size = 0;
    for (const path of paths.sort()) {
      materialPath(path); const target = join(root, path);
      // Never follow a symlink in a parent directory while capturing.
      const parts = path.split("/"); let parent = root;
      for (const part of parts.slice(0, -1)) { parent = join(parent, part); try { if (!(await lstat(parent)).isDirectory()) throw new Error(`Symlink/non-directory material parent: ${path}`); } catch (e) { if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e; } }
      let stat; try { stat = await lstat(target, { bigint: true }); } catch (e) { if ((e as NodeJS.ErrnoException).code === "ENOENT") continue; throw e; }
      if (!stat.isFile() && !stat.isSymbolicLink()) throw new Error(`Unsupported material file type: ${path}`);
      const bytes = stat.isSymbolicLink() ? await readlink(target, { encoding: "buffer" }) : await readFile(target);
      size += bytes.length; if (entries.length >= 4096 || size > 16 * 1024 * 1024) throw new Error("Snapshot exceeds 4096 files / 16 MiB bound");
      entries.push({ path, mode: stat.isSymbolicLink() ? "120000" : stat.mode & 0o111n ? "100755" : "100644", bytes, stamp: `${stat.dev}/${stat.ino}/${stat.size}/${stat.mtimeNs}/${stat.ctimeNs}` });
    }
    for (const path of selected) if (!entries.some(e => e.path === path)) throw new Error(`Selected untracked file missing: ${path}`);
    return { entries, metadata, oid };
  }
  async #scan(root: string, selected: string[], repository: string, all = false) {
    // Missing config is normal; other inspection errors must remain visible.
    return this.#inventory(root, selected, repository, all);
  }
  #commit(repository: string, entries: Entry[], parent?: string): string {
    const index = join(this.directory, `index-${randomUUID()}`), env = { GIT_INDEX_FILE: index };
    gitBytes(repository, ["read-tree", "--empty"], undefined, env);
    const records = entries.map(e => { const oid = gitBytes(repository, ["hash-object", "-w", "--stdin"], e.bytes).toString().trim(); return Buffer.from(`${e.mode} ${oid}\t${e.path}\0`); });
    if (records.length) gitBytes(repository, ["update-index", "-z", "--index-info"], Buffer.concat(records), env);
    const treeId = gitBytes(repository, ["write-tree"], undefined, env).toString().trim();
    return gitBytes(repository, ["-c", "user.name=Arbor", "-c", "user.email=arbor@localhost", "commit-tree", treeId, ...(parent ? ["-p", parent] : []), "-m", "Arbor exact material"], undefined).toString().trim();
  }
  async capture(request: CaptureRequest, afterRead?: () => Promise<void>): Promise<Capture> {
    request = structuredClone({ root: request.root, mutablePaths: request.mutablePaths, evaluationInputs: request.evaluationInputs, selectedUntracked: request.selectedUntracked }); const root = await realpath(request.root); if (root !== request.root) throw new Error("Source root must be canonical");
    for (const path of [...request.mutablePaths, ...request.evaluationInputs, ...request.selectedUntracked]) materialPath(path);
    const owned = await destination(resolve(this.directory)); if (within(root, owned) || within(owned, root)) throw new Error("Owned state must be outside source material");
    const repository = await this.#init(); if (within(root, repository) || within(repository, root)) throw new Error("Owned state must be outside source material");
    const first = await this.#scan(root, request.selectedUntracked, repository); await afterRead?.(); const second = await this.#scan(root, request.selectedUntracked, repository);
    if (inventoryId(first) !== inventoryId(second)) throw new Error("Source changed during capture; no baseline adopted");
    if (!first.entries.length) throw new Error("Empty material capture is not evaluable");
    const baseline = this.#commit(repository, first.entries); const files = first.entries.map(e => e.path);
    gitBytes(repository, ["update-ref", `refs/arbor/captures/${baseline}`, baseline]);
    for (const path of request.evaluationInputs) if (!files.some(p => p === path || p.startsWith(path + "/"))) throw new Error(`Missing evaluation input: ${path}`);
    const body = { ...request, repository, baseline, originalOid: first.oid, evaluationInputId: inputIdentity(tree(repository, baseline), request.evaluationInputs), files };
    const capture = { ...body, id: `material-${digest(body).slice(0, 48)}` };
    gitBytes(repository, ["update-ref", "refs/arbor/baseline", baseline, "0".repeat(40)]);
    gitBytes(repository, ["update-ref", "refs/arbor/incumbent", baseline, "0".repeat(40)]);
    await writeFile(join(this.directory, "capture.json"), canonical(capture) + "\n", { flag: "wx" }); return capture;
  }
  async verify(capture: Capture): Promise<void> {
    const { id, ...body } = capture;
    if (id !== `material-${digest(body).slice(0, 48)}` || capture.repository !== join(await realpath(this.directory), "repository.git") || await realpath(capture.repository) !== capture.repository || gitText(capture.repository, ["rev-parse", "refs/arbor/baseline"]).trim() !== capture.baseline || inputIdentity(tree(capture.repository, capture.baseline), capture.evaluationInputs) !== capture.evaluationInputId) throw new Error("Immutable owned capture identity changed");
  }
  async materialize(capture: Capture, id: string, parent: string): Promise<Candidate> {
    await this.verify(capture); if (!/^[A-Za-z0-9][A-Za-z0-9_.-]{0,95}$/u.test(id) || !/^[a-f0-9]{40}$/u.test(parent)) throw new Error("Invalid candidate identity");
    const directory = join(this.directory, "candidates", id); await mkdir(join(this.directory, "candidates"), { recursive: true });
    gitBytes(capture.repository, ["worktree", "add", "--detach", directory, parent]);
    return { id, directory: await realpath(directory), parent, oid: null };
  }
  async #owned(capture: Capture, candidate: Candidate): Promise<void> {
    await this.verify(capture);
    if (candidate.directory !== join(await realpath(this.directory), "candidates", candidate.id) || await realpath(candidate.directory) !== candidate.directory || await realpath(gitText(candidate.directory, ["rev-parse", "--git-common-dir"]).trim()) !== capture.repository) throw new Error("Not an exact owned candidate worktree");
  }
  async freeze(capture: Capture, candidate: Candidate): Promise<Candidate & { oid: string }> {
    await this.#owned(capture, candidate);
    const first = await this.#scan(candidate.directory, [], capture.repository, true), second = await this.#scan(candidate.directory, [], capture.repository, true);
    if (inventoryId(first) !== inventoryId(second)) throw new Error("Candidate changed during freeze; writers must settle");
    const oid = this.#commit(capture.repository, first.entries, candidate.parent);
    gitBytes(capture.repository, ["update-ref", `refs/arbor/candidates/${candidate.id}/${oid}`, oid]);
    if (first.oid) gitBytes(capture.repository, ["update-ref", `refs/arbor/workers/${candidate.id}/${first.oid}`, first.oid]);
    await this.checkScope(capture, oid); return { ...candidate, oid };
  }
  async checkScope(capture: Capture, oid: string): Promise<void> {
    const before = tree(capture.repository, capture.baseline), after = tree(capture.repository, oid);
    if (inputIdentity(after, capture.evaluationInputs) !== capture.evaluationInputId) throw new Error("Protected evaluation input changed");
    for (const path of new Set([...before.keys(), ...after.keys()])) if (before.get(path) !== after.get(path) && !capture.mutablePaths.some(s => path === s || path.startsWith(s + "/"))) throw new Error(`Outside mutable scope: ${path}`);
  }
  async restore(capture: Capture, candidate: Candidate): Promise<void> {
    await this.#owned(capture, candidate);
    // Retain both worker HEAD and full dirty state before resetting only owned state.
    const state = await this.#scan(candidate.directory, [], capture.repository, true), oid = this.#commit(capture.repository, state.entries, candidate.parent);
    gitBytes(capture.repository, ["update-ref", `refs/arbor/retained/${candidate.id}/${oid}`, oid]);
    if (state.oid) gitBytes(capture.repository, ["update-ref", `refs/arbor/workers/${candidate.id}/${state.oid}`, state.oid]);
    gitBytes(candidate.directory, ["checkout", "--detach", "--force", candidate.parent]); gitBytes(candidate.directory, ["clean", "-fd"]);
  }
  async export(capture: Capture, oid: string): Promise<string> { await this.verify(capture); await this.checkScope(capture, oid); return gitText(capture.repository, ["diff", "--binary", "--no-ext-diff", "--no-textconv", capture.baseline, oid, "--"]); }
  reference(capture: Capture, oid: string) { return { root: capture.repository, oid, files: [...tree(capture.repository, oid).keys()].sort(), format: "git-tree" as const }; }
  async combine(capture: Capture, candidate: Candidate, incumbent: string): Promise<Candidate> {
    await this.verify(capture); if (!candidate.oid) throw new Error("Frozen candidate required");
    if (candidate.parent === incumbent) return candidate;
    let treeId: string;
    try { treeId = gitText(capture.repository, ["merge-tree", "--write-tree", incumbent, candidate.oid]).split("\n")[0]!; }
    catch { throw new Error("Candidate integration conflict; retained branches require a new candidate, no score reused"); }
    const oid = gitText(capture.repository, ["-c", "user.name=Arbor", "-c", "user.email=arbor@localhost", "commit-tree", treeId, "-p", incumbent, "-p", candidate.oid, "-m", "Arbor combined material requires evaluation"]).trim();
    gitBytes(capture.repository, ["update-ref", `refs/arbor/combined/${candidate.id}/${oid}`, oid]); await this.checkScope(capture, oid);
    return { ...candidate, oid };
  }
  async integrate(capture: Capture, expected: string, target: string): Promise<void> {
    await this.verify(capture); await this.checkScope(capture, target);
    const current = gitText(capture.repository, ["rev-parse", "refs/arbor/incumbent"]).trim(); if (current === target) return;
    if (current !== expected) throw new Error("Incumbent ref conflict; integration intent requires reconciliation");
    gitBytes(capture.repository, ["update-ref", "refs/arbor/incumbent", target, expected]);
  }
}
