import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";
import { NO_CERTIFICATIONS_V1, UnavailableCleanupAdapter, UnavailableEvaluator, UnavailableFabricAgentAdapter, UnavailableWorkspaceManager } from "../../src/compatibility/fail-closed.js";
import { createActionDescriptors } from "../../src/public/descriptors.js";
import { createCertificationBlockedProvider } from "../../src/public/provider.js";
import { FIXTURE_SCHEMAS_V1 } from "../../src/schemas/catalog.js";
import { errorCode } from "../helpers.js";

const dummy = {} as never;

test("all real external adapters fail closed with typed certification outcomes", async () => {
  await assert.rejects(new UnavailableFabricAgentAdapter(NO_CERTIFICATIONS_V1).spawn(dummy), errorCode("UPSTREAM_CERTIFICATION_REQUIRED"));
  await assert.rejects(new UnavailableWorkspaceManager(NO_CERTIFICATIONS_V1).materialize(dummy), errorCode("WRITE_CONFINEMENT_UNAVAILABLE"));
  await assert.rejects(new UnavailableEvaluator(NO_CERTIFICATIONS_V1).evaluate(dummy), errorCode("WRITE_CONFINEMENT_UNAVAILABLE"));
  await assert.rejects(new UnavailableCleanupAdapter(NO_CERTIFICATIONS_V1).execute(), errorCode("WRITE_CONFINEMENT_UNAVAILABLE"));
  const provider = createCertificationBlockedProvider({ descriptors: createActionDescriptors(FIXTURE_SCHEMAS_V1) });
  await assert.rejects(provider.invoke("arbor.start", {}, dummy), errorCode("COMPATIBILITY_CERTIFICATION_REQUIRED"));
});

test("descriptor risk/effect inventory matches transaction boundaries", () => {
  const descriptors = createActionDescriptors(FIXTURE_SCHEMAS_V1);
  assert.equal(descriptors.length, 30);
  const byName = new Map(descriptors.map((entry) => [entry.name, entry]));
  assert.deepEqual([byName.get("arbor.start")?.risk, byName.get("arbor.start")?.effect?.kind], ["write", "transactional"]);
  assert.deepEqual([byName.get("arbor.inspect")?.risk, byName.get("arbor.inspect")?.effect?.kind], ["read", "none"]);
  for (const name of ["arbor.materializeWorkspace", "arbor.finalizeCandidate", "arbor.evaluate", "arbor.applyWinnerRef", "arbor.publishReport", "arbor.executeCleanup"]) {
    assert.equal(byName.get(name)?.effect?.kind, "emission", name);
    assert.equal(byName.get(name)?.effect?.ordering, "ordered", name);
  }
});

test("source imports pi-fabric only through public package export", async () => {
  for (const path of ["src/extension.ts", "src/public/descriptors.ts", "src/public/provider.ts"]) {
    const source = await readFile(join(process.cwd(), path), "utf8");
    assert.equal(/from\s+["']pi-fabric\/(?:src|dist)\//u.test(source), false);
    for (const match of source.matchAll(/from\s+["'](pi-fabric[^"']*)["']/gu)) assert.equal(match[1], "pi-fabric");
  }
});
