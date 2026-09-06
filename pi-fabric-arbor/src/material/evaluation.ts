import { mkdir, lstat, readFile, readlink, realpath, readdir, symlink, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { MaterialRef, Snapshot } from "../evaluators/contracts.js";
import { digest } from "../research/contracts.js";
import { gitBytes, gitText, materialPath } from "./Workspace.js";
/** Resolve against the immutable Git tree, not the host filesystem. Expanding
 * a -> . before processing a/../outside is essential to exact-input identity.
 * This does not sandbox trusted worktrees. */
function verifyLinks(entries: NonNullable<Snapshot["entries"]>): void {
  const links = new Map<string, string>();
  for (const [path, entry] of Object.entries(entries)) if (entry.mode === "120000") {
    const blob = Buffer.from(entry.base64, "base64"), text = blob.toString("utf8");
    if (!Buffer.from(text).equals(blob)) throw new Error(`Unsupported non-UTF-8 symlink target: ${path}`);
    if (text.startsWith("/") || text.includes("\0")) throw new Error(`Evaluation symlink escapes exact snapshot: ${path}`);
    links.set(path, text);
  }
  for (const path of links.keys()) {
    const resolved: string[] = [], active = new Set<string>();
    const pending: Array<string | { leave: string }> = path.split("/").reverse();
    let expansions = 0;
    while (pending.length) {
      const part = pending.pop()!;
      if (typeof part !== "string") { active.delete(part.leave); continue; }
      if (!part || part === ".") continue;
      if (part === "..") {
        if (!resolved.length) throw new Error(`Evaluation symlink escapes exact snapshot: ${path}`);
        resolved.pop(); continue;
      }
      const next = [...resolved, part].join("/"), target = links.get(next);
      if (target === undefined) { resolved.push(part); continue; }
      if (active.has(next)) throw new Error(`Evaluation symlink cycle: ${path}`);
      if (++expansions > 4096) throw new Error(`Evaluation symlink chain exceeds exact snapshot bound: ${path}`);
      active.add(next); pending.push({ leave: next }, ...target.split("/").reverse());
    }
  }
}
export async function freezeTree(ref: MaterialRef, output: string): Promise<Snapshot> {
  if (await realpath(ref.root) !== ref.root || gitText(ref.root, ["rev-parse", `${ref.oid}^{commit}`]).trim() !== ref.oid) throw new Error("Exact owned material root/OID changed");
  const contents: Record<string, string> = Object.create(null), executable: Record<string, boolean> = Object.create(null), entries: NonNullable<Snapshot["entries"]> = Object.create(null);
  const records = gitBytes(ref.root, ["ls-tree", "-rz", "--full-tree", ref.oid]).toString("utf8").split("\0").filter(Boolean);
  let bytes = 0;
  for (const record of records) {
    const match = /^(100644|100755|120000) blob ([a-f0-9]+)\t([\s\S]+)$/u.exec(record); if (!match) throw new Error("Unsupported submodule or Git material entry");
    const mode = match[1]!, oid = match[2]!, path = match[3]!; materialPath(path);
    const blob = gitBytes(ref.root, ["cat-file", "blob", oid]); bytes += blob.length; if (bytes > 16 * 1024 * 1024) throw new Error("Material evaluation exceeds 16 MiB");
    entries[path] = { mode, base64: blob.toString("base64") }; executable[path] = mode === "100755";
    const text = blob.toString("utf8"); if (mode !== "120000" && !text.includes("\0") && Buffer.from(text).equals(blob)) contents[path] = text;

  }
  verifyLinks(entries);
  const files = Object.keys(entries).sort(); if (digest(files) !== digest([...ref.files].sort())) throw new Error("Exact material file coverage changed");
  const id = `snapshot-${digest({ root: ref.root, oid: ref.oid, entries })}`, directory = join(output, id);
  await mkdir(directory, { recursive: true });
  for (const [path, entry] of Object.entries(entries)) {
    const target = join(directory, path); await mkdir(dirname(target), { recursive: true });
    try { if (entry.mode === "120000") await symlink(Buffer.from(entry.base64, "base64"), target); else await writeFile(target, Buffer.from(entry.base64, "base64"), { flag: "wx", mode: entry.mode === "100755" ? 0o700 : 0o600 }); }
    catch (e) { if ((e as NodeJS.ErrnoException).code !== "EEXIST") throw e; }
  }
  const snapshot = { ...structuredClone(ref), id, directory: await realpath(directory), contents, executable, entries };
  await verifyTree(snapshot); return snapshot;
}
export async function verifyTree(s: Snapshot): Promise<void> {
  if (!s.entries || await realpath(s.directory) !== s.directory || `snapshot-${digest({ root: s.root, oid: s.oid, entries: s.entries })}` !== s.id) throw new Error("Immutable tree snapshot identity changed");
  verifyLinks(s.entries);
  const found: string[] = [];
  const walk = async (directory: string, prefix = "") => { for (const e of await readdir(directory, { withFileTypes: true })) { const p = prefix + e.name; if (e.isDirectory()) await walk(join(directory, e.name), p + "/"); else found.push(p); } }; await walk(s.directory);
  if (digest(found.sort()) !== digest([...s.files].sort()) || digest(Object.keys(s.entries).sort()) !== digest([...s.files].sort())) throw new Error("Exact evaluation tree coverage changed");
  for (const [path, entry] of Object.entries(s.entries)) {
    materialPath(path); const target = join(s.directory, path), stat = await lstat(target);
    if (entry.mode === "120000" ? !stat.isSymbolicLink() : !stat.isFile() || (stat.mode & 0o111) !== (entry.mode === "100755" ? 0o100 : 0)) throw new Error(`Exact evaluation mode changed: ${path}`);
    const bytes = entry.mode === "120000" ? await readlink(target, { encoding: "buffer" }) : await readFile(target);
    if (bytes.toString("base64") !== entry.base64 || (Object.hasOwn(s.contents, path) && s.contents[path] !== bytes.toString("utf8"))) throw new Error(`Exact evaluation material changed: ${path}`);
  }
}
