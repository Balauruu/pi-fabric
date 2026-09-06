import assert from "node:assert/strict";
import { cp, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import test from "node:test";
import { arborPackageRoot } from "../../src/package-layout.js";
import { RoleBundle, ROLE_SENTINEL } from "../../src/managed/RoleBundle.js";

async function fixture() {
  const base = resolve(".runtime/pr6-roles"); await mkdir(base, { recursive: true });
  const root = await mkdtemp(join(base, "case-")), packageRoot = join(root, "package"), candidate = join(root, "candidate");
  await mkdir(candidate); await cp(join(arborPackageRoot(), "skills"), join(packageRoot, "skills"), { recursive: true });
  const bundles = new RoleBundle(join(root, "state", "roles"), packageRoot);
  return { root, packageRoot, candidate, bundles };
}
test("PR6 immutable package bundle survives package changes and reconstruction; candidate path cannot resolve optimizer", async () => {
  const f = await fixture(); const saved = await f.bundles.freeze();
  await mkdir(join(f.candidate, "skills/fabric-arbor/roles"), { recursive: true });
  await writeFile(join(f.candidate, "skills/fabric-arbor/roles/coordinator.md"), "CANDIDATE_OVERRIDE");
  const original = await f.bundles.load(saved, "coordinator", ["strategy"]);
  assert.match(original.instructions, new RegExp(ROLE_SENTINEL)); assert.match(original.instructions, /ARBOR_RESEARCH_STRATEGY_V1/);
  assert.doesNotMatch(original.instructions, /ARBOR_EVIDENCE_INTERPRETATION_V1|CANDIDATE_OVERRIDE/);
  await writeFile(join(f.packageRoot, "skills/fabric-arbor/roles/coordinator.md"), "PACKAGE_UPDATE");
  const reconstructed = new RoleBundle(join(f.root, "state", "roles"), f.candidate);
  assert.deepEqual(await reconstructed.load(saved, "coordinator", ["strategy"]), original);
  assert.ok(original.sources.every(s => s.path.startsWith(saved.directory + "/")));
  assert.equal(await readFile(join(f.candidate, "skills/fabric-arbor/roles/coordinator.md"), "utf8"), "CANDIDATE_OVERRIDE");
});
test("PR6 missing/incompatible bootstrap refuses snapshot; required missing phase refuses phase before native effects", async () => {
  const f = await fixture(), saved = await f.bundles.freeze();
  await rm(join(saved.directory, "references/research-strategy.md"));
  await assert.rejects(f.bundles.load(saved, "coordinator", ["strategy"]), /Operational role.*research-strategy/);
  await f.bundles.load(saved, "executor", []); // conditional phase is not silently injected
  await writeFile(join(f.packageRoot, "skills/fabric-arbor/roles/executor.md"), "generic fallback");
  await assert.rejects(f.bundles.freeze(), /incompatible.*executor/);
  await rm(join(f.packageRoot, "skills/fabric-arbor/roles/executor.md"));
  await assert.rejects(f.bundles.freeze(), /Operational role.*executor/);
});
test("PR6 new role bundle is attributable without rewriting old bytes; integrity, outside-material and byte bounds", async () => {
  const f = await fixture(), first = await f.bundles.freeze();
  const path = join(f.packageRoot, "skills/fabric-arbor/roles/executor.md");
  await writeFile(path, (await readFile(path, "utf8")) + "\nExplicit procedure revision.\n");
  const second = await f.bundles.freeze(); assert.notEqual(second.id, first.id);
  const otherRoot = join(f.root, "other-bundles"); await mkdir(otherRoot); await symlink(f.candidate, join(otherRoot, second.id));
  await assert.rejects(new RoleBundle(otherRoot, f.packageRoot).freeze(), /destination identity/);
  await assert.rejects(readFile(join(f.candidate, "manifest.json")));
  assert.notEqual((await f.bundles.load(second, "executor", [])).instructionsId, (await f.bundles.load(first, "executor", [])).instructionsId);
  await writeFile(join(first.directory, "roles/executor.md"), "poisoned");
  await assert.rejects(f.bundles.load(first, "executor", []), /identity|incompatible/);
  await assert.rejects(f.bundles.freeze(100), /budget/);
  await assert.rejects(new RoleBundle(join(f.candidate, "roles"), f.packageRoot).freeze(65536, f.candidate), /outside candidate/);
  await rm(path); await symlink(join(f.candidate, "outside.md"), path); await writeFile(join(f.candidate, "outside.md"), ROLE_SENTINEL);
  await assert.rejects(f.bundles.freeze(), /package root/);
});
