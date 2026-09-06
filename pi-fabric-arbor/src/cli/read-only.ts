import { constants } from "node:fs";
import { lstat, open, realpath } from "node:fs/promises";
import { resolve, sep } from "node:path";
import {
  ARBOR_PACKAGED_ASSETS,
  getArborAvailability,
  resolveArborPackagedAsset,
  type ArborPackagedAssetId,
} from "../package-layout.js";

const MAX_READ_BYTES = 8 * 1024 * 1024;
const MUTATING_COMMANDS = new Set([
  "setup", "start", "pause", "resume", "cancel", "steer", "keep", "discard", "review",
  "apply", "undo", "undo-apply", "export", "generate", "serve", "authorize", "certify", "cleanup",
]);

const USAGE = `Usage: pi-fabric-arbor <command> [options]

Read-only commands:
  availability                         Show installed PR1 capability status
  assets                               List packaged skill, role, reference, and Web assets
  asset <asset-id>                     Read one packaged asset
  inspect --file <existing-file>       Read an existing projection or metadata file
  replay --file <existing-jsonl>       Validate and replay existing JSONL records
  artifact --root <root> --path <path> Retrieve an existing regular artifact below root
  help                                 Show this help

The CLI has no setup/start/control/review/apply/undo/export-generation command and no live-owner attachment transport.
`;

interface WritableOutput {
  write(chunk: string | Uint8Array): boolean;
}

interface CliIo {
  stdout: WritableOutput;
  stderr: WritableOutput;
}

function optionMap(args: readonly string[], allowed: ReadonlySet<string>): Map<string, string> {
  if (args.length % 2 !== 0) throw new Error("Options require --name value pairs");
  const values = new Map<string, string>();
  for (let index = 0; index < args.length; index += 2) {
    const flag = args[index];
    const value = args[index + 1];
    if (!flag?.startsWith("--") || value === undefined) throw new Error("Options require --name value pairs");
    const name = flag.slice(2);
    if (!allowed.has(name) || values.has(name)) throw new Error(`Unknown or duplicate option --${name}`);
    values.set(name, value);
  }
  return values;
}

async function readRegularFile(path: string): Promise<Uint8Array> {
  const absolute = resolve(path);
  const resolved = await realpath(absolute);
  if (resolved !== absolute) throw new Error("Refusing to read a symlinked file");
  const stat = await lstat(resolved);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.size > MAX_READ_BYTES) throw new Error("File must be a bounded regular file");
  const handle = await open(resolved, constants.O_RDONLY | constants.O_NOFOLLOW);
  try {
    const opened = await handle.stat();
    if (!opened.isFile() || opened.size !== stat.size) throw new Error("File changed while opening");
    return await handle.readFile();
  } finally {
    await handle.close();
  }
}

async function readArtifact(rootInput: string, relativeInput: string): Promise<Uint8Array> {
  if (!relativeInput || resolve("/", relativeInput) === "/") throw new Error("Artifact path must name an existing file");
  const root = await realpath(resolve(rootInput));
  const candidate = resolve(root, relativeInput);
  if (!candidate.startsWith(`${root}${sep}`)) throw new Error("Artifact path escaped its root");
  return readRegularFile(candidate);
}

function writeBody(output: WritableOutput, body: Uint8Array): void {
  output.write(body);
  if (body.length === 0 || body[body.length - 1] !== 10) output.write("\n");
}

function replayJsonl(body: Uint8Array): string {
  const text = Buffer.from(body).toString("utf8");
  const records: unknown[] = [];
  for (const [index, line] of text.split("\n").entries()) {
    if (!line.trim()) continue;
    try {
      records.push(JSON.parse(line) as unknown);
    } catch {
      throw new Error(`Replay input has invalid JSON on line ${index + 1}`);
    }
  }
  return records.map((record) => JSON.stringify(record)).join("\n") + (records.length ? "\n" : "");
}

async function dispatch(args: readonly string[], io: CliIo): Promise<void> {
  const [command = "help", ...rest] = args;
  if (MUTATING_COMMANDS.has(command)) throw new Error(`Command '${command}' is unavailable: the Arbor CLI is strictly read-only.`);

  if (command === "help" || command === "--help" || command === "-h") {
    if (rest.length) throw new Error("help accepts no arguments");
    io.stdout.write(`pi-fabric-arbor ${getArborAvailability().version}\n${USAGE}`);
    return;
  }
  if (command === "--version" || command === "-V") {
    if (rest.length) throw new Error("version accepts no arguments");
    io.stdout.write(`${getArborAvailability().version}\n`);
    return;
  }
  if (command === "availability") {
    if (rest.length) throw new Error("availability accepts no arguments");
    io.stdout.write(`${JSON.stringify(getArborAvailability(), null, 2)}\n`);
    return;
  }
  if (command === "assets") {
    if (rest.length) throw new Error("assets accepts no arguments");
    io.stdout.write(`${Object.entries(ARBOR_PACKAGED_ASSETS).map(([id, path]) => `${id}\t${path}`).join("\n")}\n`);
    return;
  }
  if (command === "asset") {
    if (rest.length !== 1 || !(rest[0]! in ARBOR_PACKAGED_ASSETS)) throw new Error("asset requires one asset-id listed by 'assets'");
    writeBody(io.stdout, await readRegularFile(resolveArborPackagedAsset(rest[0] as ArborPackagedAssetId)));
    return;
  }
  if (command === "inspect" || command === "replay") {
    const options = optionMap(rest, new Set(["file"]));
    const file = options.get("file");
    if (!file) throw new Error(`${command} requires --file <existing-file>`);
    const body = await readRegularFile(file);
    if (command === "replay") io.stdout.write(replayJsonl(body));
    else writeBody(io.stdout, body);
    return;
  }
  if (command === "artifact") {
    const options = optionMap(rest, new Set(["root", "path"]));
    const root = options.get("root");
    const path = options.get("path");
    if (!root || !path) throw new Error("artifact requires --root <root> --path <relative-path>");
    writeBody(io.stdout, await readArtifact(root, path));
    return;
  }
  throw new Error(`Unknown command '${command}'. The Arbor CLI is strictly read-only.\n${USAGE.trimEnd()}`);
}

export async function runReadOnlyCli(args: readonly string[], io: CliIo): Promise<number> {
  try {
    await dispatch(args, io);
    return 0;
  } catch (error) {
    io.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    return 2;
  }
}
