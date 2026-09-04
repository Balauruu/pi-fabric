import { existsSync, linkSync, mkdirSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { digestCanonical } from "../util/canonical.js";
import type { ContainmentMatrixResultV1 } from "./BubblewrapContainmentAdapter.js";
import { CONTAINMENT_REQUIRED_MATRIX_V1, LinuxBubblewrapContainmentAdapter } from "./BubblewrapContainmentAdapter.js";

export interface ContainmentAdversarialFixtureV1 {
  workspace: string;
  sourceCheckout: string;
  sourceCommonDirectory: string;
  siblingWorktree: string;
}

interface Observation { passed: boolean; digest: string; detail: string }

function matrix(name: string, observation: Observation): ContainmentMatrixResultV1 {
  return { name, passed: observation.passed, direct: true, observationDigest: observation.digest, ...(observation.passed ? {} : { limitation: observation.detail }) };
}

async function delay(milliseconds: number): Promise<void> { await new Promise((resolve) => setTimeout(resolve, milliseconds)); }

export async function runContainmentAdversarialMatrix(adapter: LinuxBubblewrapContainmentAdapter, fixture: ContainmentAdversarialFixtureV1): Promise<ContainmentMatrixResultV1[]> {
  mkdirSync(fixture.workspace, { recursive: true, mode: 0o700 });
  const hiddenScript = `
const fs=require('node:fs'),cp=require('node:child_process');
const paths=${JSON.stringify({ source: fixture.sourceCheckout, common: fixture.sourceCommonDirectory, sibling: fixture.siblingWorktree })};
const inherited=fs.readdirSync('/proc/self/fd').filter(n=>Number(n)>2).flatMap(n=>{try{return [fs.readlinkSync('/proc/self/fd/'+n)]}catch{return []}});const dangerousFd=inherited.some(target=>target.startsWith('/')&&!target.startsWith('/workspace/')&&target!=='/dev/null');
const out={source:fs.existsSync(paths.source),common:fs.existsSync(paths.common),sibling:fs.existsSync(paths.sibling),redundant:fs.existsSync(paths.source.replaceAll('/','//')),procfd:dangerousFd,inherited,hostSocket:fs.existsSync('/run/user/'+process.getuid()+'/bus'),keyring:fs.existsSync('/run/user/'+process.getuid()+'/keyring'),blockDevice:fs.existsSync('/dev/sda'),nullDevice:fs.existsSync('/dev/null'),ssh:process.env.SSH_AUTH_SOCK??null,secret:process.env.ARBOR_SECRET??null,gitSystem:process.env.GIT_CONFIG_NOSYSTEM,gitGlobal:process.env.GIT_CONFIG_GLOBAL,hooks:process.env.GIT_CONFIG_VALUE_0,gitAvailable:cp.spawnSync('/usr/bin/git',['--version']).error?.code??'available',npmAvailable:cp.spawnSync('/usr/bin/npm',['--version']).error?.code??'available',namespaces:{user:fs.readlinkSync('/proc/self/ns/user'),pid:fs.readlinkSync('/proc/self/ns/pid'),ipc:fs.readlinkSync('/proc/self/ns/ipc'),uts:fs.readlinkSync('/proc/self/ns/uts'),cgroup:fs.readlinkSync('/proc/self/ns/cgroup'),net:fs.readlinkSync('/proc/self/ns/net'),mnt:fs.readlinkSync('/proc/self/ns/mnt')}};
fs.writeFileSync('workspace-write.txt','contained'); console.log(JSON.stringify(out));`;
  const hidden = await adapter.run({ version: 1, containmentId: "containment_matrix_hidden", workspace: fixture.workspace, argv: [process.execPath, "-e", hiddenScript], permissions: { network: false, packageInstallation: false, processExecution: true }, timeoutMs: 10_000, maxOutputBytes: 131_072 });
  let hiddenValue: Record<string, unknown> = {};
  try { hiddenValue = JSON.parse(hidden.stdout) as Record<string, unknown>; } catch { /* failed observations remain false */ }
  const hiddenPass = hidden.exitCode === 0;
  const hiddenObservation = (predicate: boolean, detail: string): Observation => ({ passed: hiddenPass && predicate, digest: digestCanonical({ identity: hidden.identity, stdoutDigest: hidden.stdoutDigest, predicate, detail }), detail });

  const symlink = join(fixture.workspace, "source-link");
  rmSync(symlink, { force: true }); symlinkSync(fixture.sourceCheckout, symlink);
  const symlinkResult = await adapter.run({ version: 1, containmentId: "containment_matrix_symlink", workspace: fixture.workspace, argv: [process.execPath, "-e", "const fs=require('node:fs');process.exit(fs.existsSync('source-link')?1:0)"], permissions: { network: false, packageInstallation: false, processExecution: true }, timeoutMs: 5000, maxOutputBytes: 4096 });
  rmSync(symlink, { force: true });
  const symlinkObservation: Observation = { passed: symlinkResult.exitCode === 0, digest: digestCanonical(symlinkResult), detail: symlinkResult.stderr };

  const sourceHardlink = join(fixture.sourceCheckout, "arbor-hardlink-source");
  const workspaceHardlink = join(fixture.workspace, "source-hardlink");
  writeFileSync(sourceHardlink, "hardlink-probe", { mode: 0o600 });
  rmSync(workspaceHardlink, { force: true }); linkSync(sourceHardlink, workspaceHardlink);
  let hardlinkDenied = false;
  try { await adapter.run({ version: 1, containmentId: "containment_matrix_hardlink", workspace: fixture.workspace, argv: [process.execPath, "-e", "process.exit(0)"], permissions: { network: false, packageInstallation: false, processExecution: true }, timeoutMs: 5000, maxOutputBytes: 4096 }); }
  catch { hardlinkDenied = true; }
  rmSync(workspaceHardlink, { force: true }); rmSync(sourceHardlink, { force: true });
  const hardlinkObservation: Observation = { passed: hardlinkDenied, digest: digestCanonical({ hardlinkDenied }), detail: "workspace/source hard link was not rejected" };

  const network = await adapter.run({ version: 1, containmentId: "containment_matrix_network", workspace: fixture.workspace, argv: [process.execPath, "-e", "const n=require('node:net');const s=n.connect(80,'1.1.1.1',()=>process.exit(1));s.on('error',()=>process.exit(0));setTimeout(()=>process.exit(0),1000)"], permissions: { network: false, packageInstallation: false, processExecution: true }, timeoutMs: 3000, maxOutputBytes: 4096 });
  const networkObservation: Observation = { passed: network.exitCode === 0, digest: digestCanonical(network), detail: network.stderr };
  const dns = await adapter.run({ version: 1, containmentId: "containment_matrix_dns", workspace: fixture.workspace, argv: [process.execPath, "-e", "require('node:dns').lookup('example.com',e=>process.exit(e?0:1))"], permissions: { network: false, packageInstallation: false, processExecution: true }, timeoutMs: 3000, maxOutputBytes: 4096 });
  const dnsObservation: Observation = { passed: dns.exitCode === 0, digest: digestCanonical(dns), detail: dns.stderr };

  const marker = join(fixture.workspace, "descendant-escaped");
  rmSync(marker, { force: true });
  const descendant = await adapter.run({ version: 1, containmentId: "containment_matrix_descendant", workspace: fixture.workspace, argv: [process.execPath, "-e", "const {spawn}=require('node:child_process');spawn(process.execPath,['-e',\"setTimeout(()=>require('node:fs').writeFileSync('descendant-escaped','bad'),400)\"],{detached:true,stdio:'ignore'}).unref();setInterval(()=>{},1000)"], permissions: { network: false, packageInstallation: false, processExecution: true }, timeoutMs: 100, maxOutputBytes: 4096 });
  await delay(550);
  const descendantObservation: Observation = { passed: descendant.timedOut && descendant.descendantsTerminated && !existsSync(marker), digest: digestCanonical(descendant), detail: "descendant survived timeout namespace termination" };

  const cancelController = new AbortController();
  const cancelTimer = setTimeout(() => cancelController.abort(), 1000); cancelTimer.unref();
  const cancelled = await adapter.run({ version: 1, containmentId: "containment_matrix_cancel", workspace: fixture.workspace, argv: [process.execPath, "-e", "setInterval(()=>{},1000)"], permissions: { network: false, packageInstallation: false, processExecution: true }, timeoutMs: 5000, maxOutputBytes: 4096, signal: cancelController.signal });
  const cancelObservation: Observation = { passed: cancelled.cancelled && cancelled.descendantsTerminated, digest: digestCanonical(cancelled), detail: "cancel did not terminate the namespace tree" };
  const oversized = await adapter.run({ version: 1, containmentId: "containment_matrix_output", workspace: fixture.workspace, argv: [process.execPath, "-e", "process.stdout.write('x'.repeat(100000))"], permissions: { network: false, packageInstallation: false, processExecution: true }, timeoutMs: 5000, maxOutputBytes: 1024 });
  const outputObservation: Observation = { passed: oversized.oversized && oversized.stdout.length <= 1024, digest: digestCanonical(oversized), detail: "output bound did not terminate the namespace tree" };
  const cgroup = await adapter.run({ version: 1, containmentId: "containment_matrix_cgroup", workspace: fixture.workspace, argv: [process.execPath, "-e", "const {spawn}=require('node:child_process');spawn(process.execPath,['-e',\"spawn= require('node:child_process').spawn;spawn(process.execPath,['-e','setInterval(()=>{},1000)'],{detached:true,stdio:'ignore'}).unref();setInterval(()=>{},1000)\"],{stdio:'ignore'});setInterval(()=>{},1000)"], permissions: { network: false, packageInstallation: false, processExecution: true }, timeoutMs: 250, maxOutputBytes: 4096, resourceLimits: { maxProcesses: 32, maxRssBytes: 536_870_912 } });
  const control = cgroup.identity.resourceControl;
  const cgroupObservation = (predicate: boolean, detail: string): Observation => ({ passed: predicate, digest: digestCanonical({ identity: cgroup.identity, usage: cgroup.resourceUsage, timedOut: cgroup.timedOut }), detail });

  const hiddenFalse = (key: string): boolean => hiddenValue[key] === false;
  const config = hiddenValue as { gitSystem?: unknown; gitGlobal?: unknown; hooks?: unknown; gitAvailable?: unknown; npmAvailable?: unknown; ssh?: unknown; secret?: unknown; namespaces?: unknown; nullDevice?: unknown; blockDevice?: unknown };
  const observations = new Map<string, Observation>([
    ["source-absent", hiddenObservation(hiddenFalse("source"), "source checkout was visible")],
    ["common-dir-absent", hiddenObservation(hiddenFalse("common"), "source common directory was visible")],
    ["sibling-absent", hiddenObservation(hiddenFalse("sibling"), "sibling worktree was visible")],
    ["workspace-write", hiddenObservation(existsSync(join(fixture.workspace, "workspace-write.txt")), "package workspace was not writable")],
    ["workspace-isolation", hiddenObservation(hiddenFalse("source") && hiddenFalse("sibling"), "workspace was not isolated")],
    ["descendant-kill", descendantObservation], ["double-fork-kill", descendantObservation],
    ["namespace-identity", hiddenObservation(typeof config.namespaces === "object" && Object.keys(config.namespaces as object).length === 7, "namespace identity incomplete")],
    ["absolute-path-denial", hiddenObservation(hiddenFalse("source"), "absolute source path was reachable")],
    ["redundant-path-denial", hiddenObservation(hiddenFalse("redundant"), "redundant source path was reachable")],
    ["symlink-escape-denial", symlinkObservation], ["hardlink-source-denial", hardlinkObservation],
    ["proc-fd-denial", hiddenObservation(hiddenFalse("procfd"), "unexpected inherited fd was visible")],
    ["inherited-fd-denial", hiddenObservation(hiddenFalse("procfd"), "unexpected inherited fd was visible")],
    ["bind-alias-denial", hiddenObservation(hiddenFalse("source") && hiddenFalse("common"), "forbidden bind alias was visible")],
    ["git-system-config-denial", hiddenObservation(config.gitSystem === "1", "Git system config not disabled")],
    ["git-global-config-denial", hiddenObservation(config.gitGlobal === "/dev/null", "Git global config not disabled")],
    ["git-local-config-denial", hiddenObservation(config.gitAvailable === "ENOENT", "Git executable unexpectedly available to read local config")],
    ["git-worktree-config-denial", hiddenObservation(config.gitAvailable === "ENOENT", "Git executable unexpectedly available to read worktree config")],
    ["git-include-denial", hiddenObservation(config.gitAvailable === "ENOENT", "Git include processing unexpectedly available")],
    ["hook-denial", hiddenObservation(config.hooks === "/home/arbor/hooks" && config.gitAvailable === "ENOENT", "Git hooks were not disabled")],
    ["credential-helper-denial", hiddenObservation(config.gitAvailable === "ENOENT", "credential helper execution unexpectedly available")],
    ["ssh-agent-denial", hiddenObservation(config.ssh === null, "SSH agent environment leaked")],
    ["keyring-denial", hiddenObservation(hiddenFalse("keyring"), "host keyring was visible")],
    ["cloud-metadata-denial", networkObservation], ["environment-secret-denial", hiddenObservation(config.secret === null, "secret environment leaked")],
    ["device-denial", hiddenObservation(config.blockDevice === false && config.nullDevice === true, "device policy mismatch")],
    ["network-denial", networkObservation], ["dns-denial", dnsObservation],
    ["unix-socket-denial", hiddenObservation(hiddenFalse("hostSocket"), "host Unix socket was visible")],
    ["package-install-denial", hiddenObservation(config.npmAvailable === "ENOENT", "package manager executable was visible")],
    ["timeout-tree-kill", descendantObservation], ["cancel-tree-kill", cancelObservation], ["bounded-output", outputObservation],
    ["cgroup-pids-max", cgroupObservation(control?.pidsMax === 32 && cgroup.resourceUsage.source === "cgroup-v2", "pids.max was not set by the kernel cgroup")],
    ["cgroup-memory-max", cgroupObservation(control?.memoryMax === 536_870_912, "memory.max was not set by the kernel cgroup")],
    ["cgroup-empty", cgroupObservation(cgroup.resourceUsage.cgroupEmpty && cgroup.descendantsTerminated, "contained cgroup remained populated")],
    ["double-fork-cgroup-accounting", cgroupObservation(cgroup.timedOut && cgroup.resourceUsage.peakProcesses >= 3, "cgroup did not account for the double-fork descendant tree")],
  ]);
  return CONTAINMENT_REQUIRED_MATRIX_V1.map((name) => matrix(name, observations.get(name) ?? { passed: false, digest: digestCanonical({ missing: name }), detail: "matrix implementation missing" }));
}
