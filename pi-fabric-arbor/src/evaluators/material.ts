import { execFile } from "node:child_process";
import { mkdir, readFile, realpath, writeFile, lstat } from "node:fs/promises";
import { dirname, isAbsolute, join, relative, sep } from "node:path";
import { promisify } from "node:util";
import { digest } from "../research/contracts.js";
import type { MaterialRef, Snapshot } from "./contracts.js";
import { freezeTree, verifyTree } from "../material/evaluation.js";
const exec = promisify(execFile);
function child(path: string): void { if (!path || isAbsolute(path) || path.split(/[\\/]/u).some(p => p === ".." || p === "." || !p)) throw new Error("Expected exact relative material file"); }
/** PR4 seam: selected regular UTF-8 files at a full committed OID, NOT dirty capture. */
export async function freezeMaterial(ref: MaterialRef, output: string): Promise<Snapshot> {
  if (ref.format === "git-tree") return freezeTree(ref, output);
  const root = await realpath(ref.root);
  if (root !== ref.root) throw new Error("Material root must be canonical");
  const rel = relative(root, output); if (!rel || (rel !== ".." && !rel.startsWith(`..${sep}`) && !isAbsolute(rel))) throw new Error("Evaluation output must be outside source material");
  const git = async (...args: string[]) => (await exec("git", args, { cwd: root, timeout: 10000, maxBuffer: 1048576 })).stdout;
  if ((await git("rev-parse", `${ref.oid}^{commit}`)).trim() !== ref.oid) throw new Error("Expected exact commit identity");
  if (new Set(ref.files).size !== ref.files.length) throw new Error("Duplicate material files");
  // Git filenames are data, including __proto__; never invoke object setters.
  const contents: Record<string, string> = Object.create(null), executable: Record<string, boolean> = Object.create(null); let bytes = 0;
  for (const path of ref.files) {
    child(path);
    const entry = /^(100644|100755) blob ([a-f0-9]+)\t([^\0]+)\0$/u.exec(await git("ls-tree", "-z", ref.oid, "--", `:(literal)${path}`));
    if (!entry || entry[3] !== path) throw new Error(`PR4 exact-material seam requires regular committed file: ${path}`);
    // ls-tree paths are relative to this cwd; OID:path in git show is not.
    // Extract precisely the blob we just checked, including for subdir roots.
    const text = await git("cat-file", "blob", entry[2]!); bytes += Buffer.byteLength(text);
    if (bytes > 1048576 || text.includes("\0") || text.includes("\ufffd")) throw new Error("PR4 material must be bounded UTF-8 text");
    contents[path] = text; executable[path] = entry[1] === "100755";
  }
  const id = `snapshot-${digest({ root, oid: ref.oid, contents, executable })}`;
  const directory = join(output, id); await mkdir(directory, { recursive: true });
  for (const [path, text] of Object.entries(contents)) {
    const target = join(directory, path); await mkdir(dirname(target), { recursive: true });
    try { await writeFile(target, text, { flag: "wx", mode: executable[path] ? 0o700 : 0o600 }); }
    catch (error) { if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error; }
  }
  const snapshot = { ...structuredClone(ref), id, directory: await realpath(directory), contents, executable };
  await verifyMaterial(snapshot); return snapshot;
}
export async function verifyMaterial(s: Snapshot): Promise<void> {
  if (s.format === "git-tree") return verifyTree(s);
  if (await realpath(s.root) !== s.root || await realpath(s.directory) !== s.directory || `snapshot-${digest({ root: s.root, oid: s.oid, contents: s.contents, executable: s.executable })}` !== s.id) throw new Error("Snapshot immutable identity changed");
  if (new Set(s.files).size !== s.files.length || Object.keys(s.contents).length !== s.files.length || Object.keys(s.executable).length !== s.files.length || s.files.some(path => !Object.hasOwn(s.contents, path) || !Object.hasOwn(s.executable, path))) throw new Error("Snapshot selected-file coverage changed");
  for (const [path, text] of Object.entries(s.contents)) {
    child(path); const target = join(s.directory, path);
    const stat = await lstat(target);
    if (typeof s.executable?.[path] !== "boolean" || !stat.isFile() || (stat.mode & 0o111) !== (s.executable[path] ? 0o100 : 0) || await realpath(target) !== target || await readFile(target, "utf8") !== text) throw new Error(`Exact evaluation material changed: ${path}`);
  }
}
export function subjectBootstrap(snapshot: Snapshot, files: string[], task: string): string {
  return `Arbor evaluation subject. You are NOT the operational coordinator or hypothesis executor. Answer the fixed task, do not grade yourself.\nSnapshot: ${snapshot.id}\n` + files.map(path => {
    const text = snapshot.contents[path]; if (!Object.hasOwn(snapshot.contents, path)) throw new Error(`Missing explicit subject prompt/skill: ${path}`);
    return `Subject instructions from ${path}:\n${text}\nEnd subject instructions.`;
  }).join("\n") + `\nFixed task:\n${task}`;
}
