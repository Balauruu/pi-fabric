import { createPublicKey, generateKeyPairSync, sign, verify } from "node:crypto";
import { arch, platform, release } from "node:os";
import { readFileSync } from "node:fs";
import type { CanonicalEvaluatorReadOnlyMountGrant, ContainedProcessRequestV1, ContainedProcessResultV1, LinuxBubblewrapContainmentAdapter } from "../containment/BubblewrapContainmentAdapter.js";
import { ArborError } from "../domain/errors.js";
import { digestCanonical, sha256 } from "../util/canonical.js";

export interface HeldOutIsolationTestV1 {
  name: "worker-mount-absent" | "worker-token-absent" | "worker-host-path-denied" | "worker-resolution-denied" | "evaluator-read-positive" | "evaluator-write-denied" | "invalid-token-denied";
  direct: true;
  passed: boolean;
  observationDigest: string;
}

export interface HeldOutIsolationCertificateV1 {
  version: 1;
  certificateId: string;
  createdAt: string;
  adapter: "linux-bubblewrap-held-out-v1";
  platform: { os: string; architecture: string; release: string; node: string };
  bwrapVersion: string;
  bwrapDigest: string;
  containmentAdapterDigest: string;
  isolationAdapterDigest: string;
  packageLockDigest: string;
  executableDigest: string;
  containmentMountPolicyDigest: string;
  containmentEnvironmentPolicyDigest: string;
  heldOutMountPolicyDigest: string;
  tests: HeldOutIsolationTestV1[];
  workerPolicy: { heldOutData: "absent"; credentials: "absent"; hostPath: "absent"; invocationCapability: "absent"; opaqueTokenResolution: "absent" };
  evaluatorPolicy: { mountTarget: "/held-out"; access: "read-only"; tokenUse: "single-invocation"; network: false };
  valid: boolean;
  signerId: string;
  signingAlgorithm: "Ed25519";
  signingPublicKey: string;
  payloadDigest: string;
  signature: string;
  certificateDigest: string;
}

const REQUIRED = ["worker-mount-absent", "worker-token-absent", "worker-host-path-denied", "worker-resolution-denied", "evaluator-read-positive", "evaluator-write-denied", "invalid-token-denied"] as const;

export class HeldOutIsolationAdapter {
  readonly certificate: HeldOutIsolationCertificateV1;
  readonly certificateDigest: string;
  readonly #containment: LinuxBubblewrapContainmentAdapter;
  readonly #grant: CanonicalEvaluatorReadOnlyMountGrant;

  constructor(input: { containment: LinuxBubblewrapContainmentAdapter; grant: CanonicalEvaluatorReadOnlyMountGrant; certificate: HeldOutIsolationCertificateV1; packageLockPath: string; executablePath: string }) {
    if (!verifyHeldOutIsolationCertificate(input.certificate, {
      containment: input.containment,
      packageLockPath: input.packageLockPath,
      executablePath: input.executablePath,
    })) throw new ArborError("HELD_OUT_ISOLATION_REQUIRED", "Retained B8 certificate does not match the active host, tool, and policy digests");
    this.#containment = input.containment;
    this.#grant = input.grant;
    this.certificate = input.certificate;
    this.certificateDigest = input.certificate.certificateDigest;
  }

  runCanonicalEvaluator(request: ContainedProcessRequestV1, opaqueToken: string): Promise<ContainedProcessResultV1> {
    return this.#containment.runCanonicalEvaluator(request, this.#grant, opaqueToken);
  }
}

export function heldOutPolicyDigest(containment: LinuxBubblewrapContainmentAdapter): string {
  const policy = containment.policyDigests();
  return digestCanonical({ version: 1, adapter: "linux-bubblewrap-held-out-v1", baseMountPolicyDigest: policy.mountPolicyDigest, environmentPolicyDigest: policy.environmentPolicyDigest, target: "/held-out", mode: "ro", opaqueResolution: "host-only", tokenInEnvironment: false, workerCapability: false });
}

export function createHeldOutIsolationCertificate(input: {
  certificateId: string;
  createdAt: string;
  signerId: string;
  containment: LinuxBubblewrapContainmentAdapter;
  bwrapVersion: string;
  packageLockPath: string;
  executablePath: string;
  tests: HeldOutIsolationTestV1[];
}): HeldOutIsolationCertificateV1 {
  const testMap = new Map(input.tests.map((entry) => [entry.name, entry]));
  const valid = REQUIRED.every((name) => testMap.get(name)?.passed === true && testMap.get(name)?.direct === true);
  const policy = input.containment.policyDigests();
  const pair = generateKeyPairSync("ed25519");
  const signingPublicKey = pair.publicKey.export({ format: "der", type: "spki" }).toString("base64");
  const unsigned = {
    version: 1 as const, certificateId: input.certificateId, createdAt: input.createdAt, adapter: "linux-bubblewrap-held-out-v1" as const,
    platform: { os: platform(), architecture: arch(), release: release(), node: process.version },
    bwrapVersion: input.bwrapVersion, bwrapDigest: input.containment.bwrapDigest,
    containmentAdapterDigest: policy.adapterDigest,
    isolationAdapterDigest: sha256(readFileSync(new URL(import.meta.url))),
    packageLockDigest: sha256(readFileSync(input.packageLockPath)), executableDigest: sha256(readFileSync(input.executablePath)),
    containmentMountPolicyDigest: policy.mountPolicyDigest, containmentEnvironmentPolicyDigest: policy.environmentPolicyDigest,
    heldOutMountPolicyDigest: heldOutPolicyDigest(input.containment), tests: [...input.tests].sort((left, right) => left.name.localeCompare(right.name)),
    workerPolicy: { heldOutData: "absent" as const, credentials: "absent" as const, hostPath: "absent" as const, invocationCapability: "absent" as const, opaqueTokenResolution: "absent" as const },
    evaluatorPolicy: { mountTarget: "/held-out" as const, access: "read-only" as const, tokenUse: "single-invocation" as const, network: false as const },
    valid, signerId: input.signerId, signingAlgorithm: "Ed25519" as const, signingPublicKey,
  };
  const payloadDigest = digestCanonical(unsigned);
  const signature = sign(null, Buffer.from(payloadDigest, "hex"), pair.privateKey).toString("base64");
  return { ...unsigned, payloadDigest, signature, certificateDigest: digestCanonical({ ...unsigned, payloadDigest, signature }) };
}

export function verifyHeldOutIsolationCertificate(certificate: HeldOutIsolationCertificateV1, active?: { containment: LinuxBubblewrapContainmentAdapter; packageLockPath: string; executablePath: string }): boolean {
  const { certificateDigest, payloadDigest, signature, ...unsigned } = certificate;
  const tests = new Map(certificate.tests.map((entry) => [entry.name, entry]));
  try {
    const structural = certificate.valid === REQUIRED.every((name) => tests.get(name)?.passed === true && tests.get(name)?.direct === true)
      && payloadDigest === digestCanonical(unsigned)
      && certificateDigest === digestCanonical({ ...unsigned, payloadDigest, signature })
      && verify(null, Buffer.from(payloadDigest, "hex"), createPublicKey({ key: Buffer.from(certificate.signingPublicKey, "base64"), format: "der", type: "spki" }), Buffer.from(signature, "base64"));
    if (!structural || !active) return structural;
    const policy = active.containment.policyDigests();
    return certificate.platform.os === platform() && certificate.platform.architecture === arch() && certificate.platform.release === release() && certificate.platform.node === process.version
      && certificate.bwrapDigest === active.containment.bwrapDigest && certificate.containmentAdapterDigest === policy.adapterDigest
      && certificate.isolationAdapterDigest === sha256(readFileSync(new URL(import.meta.url)))
      && certificate.packageLockDigest === sha256(readFileSync(active.packageLockPath)) && certificate.executableDigest === sha256(readFileSync(active.executablePath))
      && certificate.containmentMountPolicyDigest === policy.mountPolicyDigest && certificate.containmentEnvironmentPolicyDigest === policy.environmentPolicyDigest
      && certificate.heldOutMountPolicyDigest === heldOutPolicyDigest(active.containment);
  } catch { return false; }
}

export const HELD_OUT_ISOLATION_REQUIRED_TESTS_V1 = REQUIRED;
