#!/usr/bin/env node
/** Type-check an exact checked-in Fabric guest against installed declarations. */

import { createHash } from "node:crypto";
import { existsSync, lstatSync, readFileSync, readdirSync } from "node:fs";
import { resolve, join } from "node:path";
import { pathToFileURL } from "node:url";

function fail(message) {
  process.stderr.write(`error: ${message}\n`);
  process.exit(1);
}

if (process.argv.slice(2).some((value) => value === "--help" || value === "-h")) {
  console.log("usage: typecheck_fabric_guest.mjs --workflow PATH --fabric-root PATH");
  process.exit(0);
}

const values = {};
for (let index = 2; index < process.argv.length; index += 2) {
  const key = process.argv[index];
  const value = process.argv[index + 1];
  if (!key?.startsWith("--") || value === undefined) fail("expected --name value arguments");
  values[key.slice(2)] = value;
}
for (const key of ["workflow", "fabric-root"]) if (!values[key]) fail(`--${key} is required`);

const workflow = resolve(values.workflow);
const fabricRoot = resolve(values["fabric-root"]);
if (!existsSync(workflow) || !lstatSync(workflow).isFile() || lstatSync(workflow).isSymbolicLink()) fail("workflow must be a regular non-symlink file");
const chunks = join(fabricRoot, "dist/chunks");
if (!existsSync(chunks)) fail("fabric-root is not an installed pi-fabric package");
function semanticChunk(prefix) {
  const matches = readdirSync(chunks).filter((name) => name.startsWith(`${prefix}-`) && name.endsWith(".js"));
  if (matches.length !== 1) fail(`expected one installed ${prefix} semantic chunk, found ${matches.length}`);
  return join(chunks, matches[0]);
}

// The installed package does not export its generated guest declarations as a
// package subpath. Read the exact generated runtime chunks, as Fabric's own
// validator does, rather than maintaining a guessed ambient declaration file.
const [{ GUEST_TYPE_DECLARATIONS }, { typeCheckFabricCode }] = await Promise.all([
  import(pathToFileURL(semanticChunk("guest-types"))),
  import(pathToFileURL(semanticChunk("type-checker"))),
]);
const source = readFileSync(workflow, "utf8");
const checked = typeCheckFabricCode(source, GUEST_TYPE_DECLARATIONS);
if (checked.errors.length) {
  for (const error of checked.errors) process.stderr.write(`type-error:${error.line}:${error.column}: ${error.message}\n`);
  process.exit(1);
}
process.stdout.write(`${JSON.stringify({
  schema_version: 1,
  status: "passed",
  workflow_sha256: createHash("sha256").update(source).digest("hex"),
  fabric_version: JSON.parse(readFileSync(join(fabricRoot, "package.json"), "utf8")).version,
  declaration_source: "installed-generated-guest-types",
}, null, 2)}\n`);
