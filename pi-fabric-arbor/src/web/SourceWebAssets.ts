import { constants } from "node:fs";
import { lstat, open, realpath } from "node:fs/promises";
import { resolve, sep } from "node:path";
import { arborPackageRoot, resolveArborPackagedAsset } from "../package-layout.js";

const MAX_ASSET_BYTES = 256 * 1024;

export interface SourceWebAsset {
  path: "/" | "/index.html" | "/assets/app.js" | "/assets/app.css";
  fileName: "index.html" | "app.js" | "app.css";
  contentType: "text/html; charset=utf-8" | "text/javascript; charset=utf-8" | "text/css; charset=utf-8";
  body: Uint8Array;
}

const DEFINITIONS = Object.freeze([
  { id: "webIndex", paths: ["/", "/index.html"], fileName: "index.html", contentType: "text/html; charset=utf-8" },
  { id: "webScript", paths: ["/assets/app.js"], fileName: "app.js", contentType: "text/javascript; charset=utf-8" },
  { id: "webStyles", paths: ["/assets/app.css"], fileName: "app.css", contentType: "text/css; charset=utf-8" },
] as const);

async function readRegularPackagedFile(path: string): Promise<Uint8Array> {
  const root = await realpath(arborPackageRoot());
  const absolute = resolve(path);
  const resolved = await realpath(absolute);
  if (resolved !== absolute || !resolved.startsWith(`${root}${sep}`)) throw new Error("Web asset is outside the Arbor package");
  const stat = await lstat(resolved);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.size < 1 || stat.size > MAX_ASSET_BYTES) throw new Error("Web asset is not a bounded regular file");
  const handle = await open(resolved, constants.O_RDONLY | constants.O_NOFOLLOW);
  try {
    const opened = await handle.stat();
    if (!opened.isFile() || opened.size !== stat.size) throw new Error("Web asset changed while opening");
    return await handle.readFile();
  } finally {
    await handle.close();
  }
}

export class SourceWebAssets {
  readonly root = resolve(arborPackageRoot(), "web/read-only");
  readonly #byPath: ReadonlyMap<SourceWebAsset["path"], SourceWebAsset>;

  private constructor(assets: readonly SourceWebAsset[]) {
    this.#byPath = new Map(assets.map((asset) => [asset.path, asset]));
  }

  static async load(): Promise<SourceWebAssets> {
    const assets: SourceWebAsset[] = [];
    for (const definition of DEFINITIONS) {
      const body = await readRegularPackagedFile(resolveArborPackagedAsset(definition.id));
      for (const path of definition.paths) assets.push(Object.freeze({ path, fileName: definition.fileName, contentType: definition.contentType, body }));
    }
    return new SourceWebAssets(assets);
  }

  get(path: SourceWebAsset["path"]): SourceWebAsset | undefined {
    return this.#byPath.get(path);
  }
}
