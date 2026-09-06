import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import test from "node:test";

const PLAN = resolve(process.cwd(), "../docs/Arbor/deep-refactoring-plan.md");

test("the authoritative plan consistently describes the approved owner-local architecture", async () => {
  const plan = await readFile(PLAN, "utf8");

  for (const required of [
    "captures the managed `FabricComponentContext` call seam",
    "context.call(\"agents.spawn\", request)",
    "structured proposal in an `agents.ask` response",
    "owner-held `agents.wait` promises",
    "The CLI is strictly read-only in attached and offline modes.",
    "No Fabric API change is in scope.",
    "PR0 must genuinely prove",
    "through the declared public `agents.self` action",
    "Every mesh-shaped stop result",
    "Remote stop transport and cross-owner cleanup are outside",
    "returns `INTERRUPTED` and exits",
    "the revised PR0 gate passes",
    "None is a cyclic PR0 blocker.",
  ]) {
    assert.ok(plan.includes(required), `missing binding architecture statement: ${required}`);
  }

  for (const superseded of [
    "child-local Arbor forwarding surface",
    "actor-facing research operations",
    "CLI mutations require an acknowledged live-host attachment",
    "public lifecycle observation/host callback seam",
    "smallest required generic Fabric API change",
    "Pi/attached-CLI",
    "real remote mesh stop acknowledgement",
    "real remote stop acknowledgment is required",
  ]) {
    assert.equal(plan.includes(superseded), false, `superseded requirement remains: ${superseded}`);
  }

  const acceptanceIds = [...plan.matchAll(/^\| (A\d{2}) \|/gmu)].map((match) => match[1]);
  assert.deepEqual(acceptanceIds, Array.from({ length: 30 }, (_, index) => `A${String(index + 1).padStart(2, "0")}`));

  const prOffsets = Array.from({ length: 14 }, (_, index) => plan.indexOf(`### PR${index}.`));
  assert.ok(prOffsets.every((offset) => offset >= 0), "PR0-PR13 must all remain present");
  assert.deepEqual([...prOffsets].sort((left, right) => left - right), prOffsets, "PR0-PR13 order changed");
  const pr0 = plan.slice(prOffsets[0], prOffsets[1]);
  const pr1 = plan.slice(prOffsets[1], prOffsets[2]);
  const pr4 = plan.slice(prOffsets[4], prOffsets[5]);
  const pr8 = plan.slice(prOffsets[8], prOffsets[9]);
  assert.match(pr0, /optional-evaluator scope is definition-time catalog binding\/change/u);
  assert.match(pr1, /clean temporary install/u);
  assert.match(pr4, /complete missing\/mismatched descriptor and invalid-result rejection matrix/u);
  assert.match(pr8, /partial material continuation/u);

  process.stdout.write("ARBOR_PR0_PLAN_CONSISTENCY text-only; makes no functional acceptance claim\n");
});
