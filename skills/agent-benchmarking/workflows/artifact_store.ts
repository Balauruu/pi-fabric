export type ArtifactPublicationMode = "json" | "jsonl" | "bytes" | "file";
export type ExistingArtifactPolicy = "refuse" | "verify";

type ArtifactStoreDependencies = {
  assertCondition: (condition: unknown, message: string) => asserts condition;
  assertSafePath: (value: unknown, field: string) => asserts value is string;
  shell: (value: string) => string;
  join: (...parts: string[]) => string;
  ensureParent: (root: string, relative: string) => Promise<void>;
  fileState: (path: string) => Promise<string>;
  rejectSymlinkComponents: (path: string) => Promise<void>;
  runGate: (command: string, label: string) => Promise<{ output: string }>;
  publishPrimitive: (
    root: string, relative: string, value: unknown, mode: "json" | "jsonl" | "bytes",
  ) => Promise<void>;
  publishOrVerifyPrimitive: (
    root: string, relative: string, value: unknown, mode: "json" | "jsonl" | "bytes",
  ) => Promise<void>;
  writeOncePath: string;
  deepStagePath: string;
};

type ReturnedLogArchive = Record<string, unknown> & {
  agent_id: string;
  source_path: string;
  path: string;
  bytes: number;
  sha256: string;
  archive_receipt_path: string;
};

export function createArtifactStore(deps: ArtifactStoreDependencies) {
  const publish = async (
    root: string,
    relative: string,
    value: unknown,
    mode: ArtifactPublicationMode = "json",
    existing: ExistingArtifactPolicy = "verify",
  ): Promise<void> => {
    deps.assertSafePath(relative, "artifact publication path");
    if (mode !== "file") {
      if (existing === "verify") await deps.publishOrVerifyPrimitive(root, relative, value, mode);
      else await deps.publishPrimitive(root, relative, value, mode);
      return;
    }
    deps.assertCondition(typeof value === "string", `file publication source is invalid for ${relative}`);
    deps.assertSafePath(value, "artifact publication source");
    const source = deps.join(root, value);
    const destination = deps.join(root, relative);
    deps.assertCondition(await deps.fileState(source) === "file", `artifact publication source is missing: ${value}`);
    const destinationState = await deps.fileState(destination);
    if (destinationState === "missing") {
      await deps.ensureParent(root, relative);
      await deps.runGate(
        `python -B ${deps.shell(deps.writeOncePath)} --root ${deps.shell(root)} ` +
        `--input ${deps.shell(value)} ${deps.shell(relative)}`,
        `publish artifact ${relative}`,
      );
      return;
    }
    deps.assertCondition(existing === "verify" && destinationState === "file", `artifact already exists: ${relative}`);
    await deps.runGate(
      `cmp -s -- ${deps.shell(source)} ${deps.shell(destination)}`,
      `verify published artifact ${relative}`,
    );
  };

  const copyReturnedLog = async (
    root: string,
    relative: string,
    result: Record<string, unknown>,
    runtimeCapabilities: Record<string, unknown> | null,
  ): Promise<ReturnedLogArchive> => {
    deps.assertCondition(typeof result.id === "string" && result.id.length > 0,
      "Fabric result lacks an agent ID for log capture");
    deps.assertCondition(typeof result.logFile === "string" && result.logFile.startsWith("/"),
      `agent ${result.id} lacks an authoritative absolute logFile path`);
    const source = result.logFile;
    deps.assertCondition(!source.includes("//") && !source.includes("/../") && !source.includes("/./") &&
      !source.endsWith("/..") && !source.endsWith("/."), `agent ${result.id} logFile path is not canonical`);
    deps.assertCondition(source !== "/home/balauru/.pi/agent" && !source.startsWith("/home/balauru/.pi/agent/"),
      `agent ${result.id} logFile points into a prohibited profile`);
    const temporaryPattern = runtimeCapabilities?.temporary_log_pattern;
    deps.assertCondition(typeof temporaryPattern === "string" && new RegExp(temporaryPattern).test(source),
      `agent ${result.id} logFile is outside the runtime-approved absolute pattern`);
    deps.assertSafePath(relative, "returned log archive path");
    await deps.ensureParent(root, relative);
    await deps.rejectSymlinkComponents(source);
    const gate = await deps.runGate(
      `python -B ${deps.shell(deps.deepStagePath)} archive --source ${deps.shell(source)} ` +
      `--root ${deps.shell(root)} --relative ${deps.shell(relative)} ` +
      `--temporary-log-pattern ${deps.shell(temporaryPattern)}`,
      `artifact-store copy returned log ${relative}`,
    );
    const archive = JSON.parse(gate.output) as Record<string, unknown>;
    deps.assertCondition(archive.path === relative && archive.source_kind === "pi-fabric-events-jsonl" &&
      Number.isInteger(archive.bytes) && Number(archive.bytes) >= 0 &&
      typeof archive.sha256 === "string" && /^[0-9a-f]{64}$/.test(archive.sha256),
      `returned log archive receipt is invalid for ${result.id}`);
    const base = relative.slice(0, relative.lastIndexOf("/"));
    const archiveReceiptPath = `${base}/log.archive.json`;
    await publish(root, archiveReceiptPath, archive, "json", "verify");
    return {
      ...archive,
      agent_id: result.id,
      source_path: source,
      path: relative,
      bytes: Number(archive.bytes),
      sha256: archive.sha256,
      archive_receipt_path: archiveReceiptPath,
    } as ReturnedLogArchive;
  };

  const scanArchivedLog = async (
    root: string,
    archive: ReturnedLogArchive,
    allowedRoot: string,
  ): Promise<Record<string, unknown> & { scan_receipt_path: string }> => {
    deps.assertCondition(allowedRoot.startsWith("/"), "archived log scan requires an absolute allowed root");
    const target = deps.join(root, archive.path);
    const gate = await deps.runGate(
      `python -B ${deps.shell(deps.deepStagePath)} scan --input ${deps.shell(target)} ` +
      `--allowed-root ${deps.shell(allowedRoot)}`,
      `artifact-store scan archived log ${archive.path}`,
    );
    const scan = JSON.parse(gate.output) as Record<string, unknown>;
    deps.assertCondition(scan.source_sha256 === archive.sha256 && scan.source_bytes === archive.bytes &&
      Number.isInteger(scan.event_count) && Number(scan.event_count) >= 1 && Array.isArray(scan.forbidden_paths),
      `archived log scan does not bind ${archive.path}`);
    const base = archive.path.slice(0, archive.path.lastIndexOf("/"));
    const scanReceiptPath = `${base}/log.scan.json`;
    await publish(root, scanReceiptPath, scan, "json", "verify");
    return { ...scan, scan_receipt_path: scanReceiptPath };
  };

  return { publish, copyReturnedLog, scanArchivedLog };
}
