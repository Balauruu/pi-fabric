import { constants } from "node:fs";
import { lstat, open, readFile, realpath } from "node:fs/promises";
import { dirname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { ArborError } from "../domain/errors.js";
import { sha256 } from "../util/canonical.js";

const FILE_NAME = /^(?:index\.html|app\.[0-9a-f]{16}\.(?:js|css))$/u;
const DIGEST = /^[0-9a-f]{64}$/u;
const CONTENT_TYPES = new Set(["text/html; charset=utf-8", "text/javascript; charset=utf-8", "text/css; charset=utf-8"]);
const MAX_ASSET_BYTES = 256 * 1024;

export interface ReleaseWebAssetV1 {
  version: 1;
  logicalName: "index" | "app" | "styles";
  fileName: string;
  contentType: string;
  digest: string;
  bytes: number;
  body: Uint8Array;
}

interface ManifestEntryV1 {
  logicalName: ReleaseWebAssetV1["logicalName"];
  fileName: string;
  contentType: string;
  digest: string;
  bytes: number;
}

interface AssetManifestV1 {
  version: 1;
  build: "dependency-free";
  files: ManifestEntryV1[];
}

function exactKeys(value: Record<string, unknown>, keys: readonly string[], label: string): void {
  if (Object.keys(value).sort().join("\0") !== [...keys].sort().join("\0")) throw new ArborError("EVIDENCE_INVALID", `${label} is not a closed object`);
}

async function safeRead(root: string, fileName: string, expectedBytes: number, expectedDigest: string): Promise<Uint8Array> {
  const path = resolve(root, fileName);
  if (!path.startsWith(`${root}${sep}`)) throw new ArborError("EVIDENCE_INVALID", "Web asset escaped release root");
  const resolved = await realpath(path);
  if (resolved !== path || !resolved.startsWith(`${root}${sep}`)) throw new ArborError("EVIDENCE_INVALID", "Web asset realpath or symlink check failed");
  const stat = await lstat(path);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.size !== expectedBytes || stat.size > MAX_ASSET_BYTES) throw new ArborError("EVIDENCE_INVALID", "Web asset metadata is invalid");
  const handle = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW);
  try {
    const opened = await handle.stat();
    if (!opened.isFile() || opened.size !== expectedBytes) throw new ArborError("EVIDENCE_INVALID", "Web asset changed during open");
    const body = await handle.readFile();
    if (sha256(body) !== expectedDigest) throw new ArborError("EVIDENCE_INVALID", "Web asset digest mismatch");
    return body;
  } finally { await handle.close(); }
}

export class ReleaseWebAssets {
  readonly root: string;
  readonly manifestDigest: string;
  readonly #byPath: ReadonlyMap<string, ReleaseWebAssetV1>;

  private constructor(root: string, manifestDigest: string, assets: readonly ReleaseWebAssetV1[]) {
    this.root = root;
    this.manifestDigest = manifestDigest;
    const byPath = new Map<string, ReleaseWebAssetV1>();
    for (const asset of assets) {
      if (asset.logicalName === "index") { byPath.set("/", asset); byPath.set("/index.html", asset); }
      else byPath.set(`/assets/${asset.fileName}`, asset);
    }
    this.#byPath = byPath;
  }

  static defaultRoot(): string {
    return resolve(dirname(fileURLToPath(import.meta.url)), "../../../dist/web-assets");
  }

  static async load(root = ReleaseWebAssets.defaultRoot()): Promise<ReleaseWebAssets> {
    const canonicalRoot = await realpath(resolve(root));
    const rootStat = await lstat(canonicalRoot);
    if (!rootStat.isDirectory() || rootStat.isSymbolicLink()) throw new ArborError("EVIDENCE_INVALID", "Web asset root is not a regular directory");
    const manifestPath = join(canonicalRoot, "asset-manifest.v1.json");
    const manifestRealpath = await realpath(manifestPath);
    if (manifestRealpath !== manifestPath || !manifestRealpath.startsWith(`${canonicalRoot}${sep}`)) throw new ArborError("EVIDENCE_INVALID", "Web asset manifest realpath check failed");
    const manifestStat = await lstat(manifestPath);
    if (!manifestStat.isFile() || manifestStat.isSymbolicLink() || manifestStat.size > 32 * 1024) throw new ArborError("EVIDENCE_INVALID", "Web asset manifest is invalid");
    const raw = await readFile(manifestPath);
    let manifest: AssetManifestV1;
    try { manifest = JSON.parse(raw.toString("utf8")) as AssetManifestV1; }
    catch { throw new ArborError("EVIDENCE_INVALID", "Web asset manifest is not JSON"); }
    exactKeys(manifest as unknown as Record<string, unknown>, ["version", "build", "files"], "Web asset manifest");
    if (manifest.version !== 1 || manifest.build !== "dependency-free" || !Array.isArray(manifest.files) || manifest.files.length !== 3) throw new ArborError("EVIDENCE_INVALID", "Web asset manifest shape is invalid");
    const logicalNames = new Set<string>(); const fileNames = new Set<string>(); const assets: ReleaseWebAssetV1[] = [];
    for (const entry of manifest.files) {
      exactKeys(entry as unknown as Record<string, unknown>, ["logicalName", "fileName", "contentType", "digest", "bytes"], "Web asset entry");
      if (!(["index", "app", "styles"] as const).includes(entry.logicalName) || logicalNames.has(entry.logicalName) || fileNames.has(entry.fileName) || !FILE_NAME.test(entry.fileName) || !CONTENT_TYPES.has(entry.contentType) || !DIGEST.test(entry.digest) || !Number.isSafeInteger(entry.bytes) || entry.bytes < 1 || entry.bytes > MAX_ASSET_BYTES) throw new ArborError("EVIDENCE_INVALID", "Web asset entry is invalid");
      logicalNames.add(entry.logicalName); fileNames.add(entry.fileName);
      assets.push(Object.freeze({ version: 1, ...entry, body: await safeRead(canonicalRoot, entry.fileName, entry.bytes, entry.digest) }));
    }
    if (!["index", "app", "styles"].every((name) => logicalNames.has(name))) throw new ArborError("EVIDENCE_INVALID", "Web asset bundle is incomplete");
    return new ReleaseWebAssets(canonicalRoot, sha256(raw), assets);
  }

  get(pathname: string): ReleaseWebAssetV1 | undefined { return this.#byPath.get(pathname); }
}
