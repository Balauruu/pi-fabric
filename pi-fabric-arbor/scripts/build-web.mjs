import { createHash } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const source = join(root, "web");
const output = join(root, "dist", "web-assets");
const digest = (value) => createHash("sha256").update(value).digest("hex");

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true, mode: 0o755 });
const javascript = await readFile(join(source, "app.js"));
const css = await readFile(join(source, "app.css"));
const jsName = `app.${digest(javascript).slice(0, 16)}.js`;
const cssName = `app.${digest(css).slice(0, 16)}.css`;
const template = await readFile(join(source, "index.html"), "utf8");
const html = Buffer.from(template.replaceAll("{{APP_JS}}", `/assets/${jsName}`).replaceAll("{{APP_CSS}}", `/assets/${cssName}`), "utf8");
const files = [
  { logicalName: "index", fileName: "index.html", contentType: "text/html; charset=utf-8", digest: digest(html), bytes: html.byteLength },
  { logicalName: "app", fileName: jsName, contentType: "text/javascript; charset=utf-8", digest: digest(javascript), bytes: javascript.byteLength },
  { logicalName: "styles", fileName: cssName, contentType: "text/css; charset=utf-8", digest: digest(css), bytes: css.byteLength },
];
await Promise.all([
  writeFile(join(output, "index.html"), html, { mode: 0o644 }),
  writeFile(join(output, jsName), javascript, { mode: 0o644 }),
  writeFile(join(output, cssName), css, { mode: 0o644 }),
]);
const manifest = { version: 1, build: "dependency-free", files: files.map(({ logicalName, fileName, contentType, digest, bytes }) => ({ logicalName, fileName, contentType, digest, bytes })) };
await writeFile(join(output, "asset-manifest.v1.json"), `${JSON.stringify(manifest)}\n`, { mode: 0o644 });
process.stdout.write(`${JSON.stringify({ output: "dist/web-assets", files: files.map(({ fileName, digest }) => ({ fileName, digest })) })}\n`);
