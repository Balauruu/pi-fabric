import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { arch, platform, release } from "node:os";
import { join, resolve } from "node:path";
import { LinuxBubblewrapContainmentAdapter, generateContainmentCertificate, verifyContainmentCertificate, type ContainmentCertificateV1 } from "../containment/BubblewrapContainmentAdapter.js";
import { runContainmentAdversarialMatrix } from "../containment/adversarial.js";
import { canonicalJson, sha256 } from "../util/canonical.js";

function atomicWrite(path: string, content: string): void {
  const temporary = `${path}.tmp-${process.pid}`;
  writeFileSync(temporary, content, { mode: 0o600 });
  renameSync(temporary, path);
}

export async function generateLocalContainmentCertification(input: { outputRoot: string; scratchRoot: string; createdAt: string; signerId: string }): Promise<ContainmentCertificateV1> {
  mkdirSync(input.scratchRoot, { recursive: true, mode: 0o700 });
  const fixtureRoot = mkdtempSync(join(resolve(input.scratchRoot), "containment-"));
  try {
    const stateRoot = join(fixtureRoot, "state");
    const workspace = join(stateRoot, "workspace");
    const source = join(fixtureRoot, "source");
    const common = join(fixtureRoot, "common");
    const sibling = join(fixtureRoot, "sibling");
    [stateRoot, workspace, source, common, sibling].forEach((path) => mkdirSync(path, { recursive: true, mode: 0o700 }));
    const adapter = new LinuxBubblewrapContainmentAdapter({ stateRoot, allowedExecutables: [process.execPath], forbiddenHostPaths: [source, common, sibling] });
    const matrix = await runContainmentAdversarialMatrix(adapter, { workspace, sourceCheckout: source, sourceCommonDirectory: common, siblingWorktree: sibling });
    const certificate = await generateContainmentCertificate(adapter, { certificateId: "containment_linux_bwrap_0_12_0", createdAt: input.createdAt, signerId: input.signerId, matrix, limitations: ["Certificate covers the named local Linux kernel, Bubblewrap binary, Node runtime, deny-network and deny-package-install policy only.", "Allowed runtime executables are mounted one at a time with their dynamic-library closure; broader executable sets require recertification."] });
    mkdirSync(input.outputRoot, { recursive: true, mode: 0o700 });
    atomicWrite(join(input.outputRoot, "containment-certificate.v1.json"), `${canonicalJson(certificate)}\n`);
    atomicWrite(join(input.outputRoot, "adversarial-matrix.v1.json"), `${canonicalJson(certificate.matrix)}\n`);
    atomicWrite(join(input.outputRoot, "containment-certificate.v1.sha256"), `${sha256(Buffer.from(`${canonicalJson(certificate)}\n`))}  containment-certificate.v1.json\n`);
    return certificate;
  } finally { rmSync(fixtureRoot, { recursive: true, force: true }); }
}

export function verifyLocalContainmentCertification(artifactRoot: string): { valid: boolean; certificate: ContainmentCertificateV1 } {
  const certificate = JSON.parse(readFileSync(join(artifactRoot, "containment-certificate.v1.json"), "utf8")) as ContainmentCertificateV1;
  const matrix = JSON.parse(readFileSync(join(artifactRoot, "adversarial-matrix.v1.json"), "utf8"));
  let bwrapVersion = "";
  try { bwrapVersion = execFileSync("/usr/bin/bwrap", ["--version"], { encoding: "utf8" }).trim(); } catch { return { valid: false, certificate }; }
  const activeAdapterDigest = sha256(readFileSync(new URL("../containment/BubblewrapContainmentAdapter.js", import.meta.url)));
  const valid = verifyContainmentCertificate(certificate) && canonicalJson(matrix) === canonicalJson(certificate.matrix) && certificate.adapterDigest === activeAdapterDigest && certificate.bwrapDigest === sha256(readFileSync("/usr/bin/bwrap")) && certificate.bwrapVersion === bwrapVersion && certificate.platform.os === platform() && certificate.platform.architecture === arch() && certificate.platform.release === release() && certificate.platform.node === process.version;
  return { valid, certificate };
}
