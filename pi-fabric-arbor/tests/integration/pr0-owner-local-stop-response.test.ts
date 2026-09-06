import assert from "node:assert/strict";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import test from "node:test";

const sourceUrl = pathToFileURL(resolve(process.cwd(), "src", "pr0", "OwnerLocalFabricProbe.ts")).href;
const { parseOwnerLocalStopResponse } = await import(sourceUrl) as typeof import("../../src/pr0/OwnerLocalFabricProbe.js");

const actor = { id: "actor-local", kind: "actor" as const };
const agent = { id: "agent-local", kind: "agent" as const };
const actorTerminal = { id: actor.id, name: "coordinator", scope: "project", status: "stopped", queued: 0 };
const agentTerminal = { id: agent.id, name: "worker", status: "completed", cwd: "/tmp/worker" };

test("PR0 accepts documented local actor and agent terminal stop results", () => {
  assert.deepEqual(parseOwnerLocalStopResponse(actorTerminal, actor), { terminal: true, routed: "local", status: "stopped" });
  assert.deepEqual(parseOwnerLocalStopResponse(agentTerminal, agent), { terminal: true, routed: "local", status: "completed" });
  assert.deepEqual(parseOwnerLocalStopResponse({ ...actorTerminal, routed: "local", local: true }, actor), { terminal: true, routed: "local", status: "stopped" });
  assert.deepEqual(parseOwnerLocalStopResponse({ ...agentTerminal, routed: "local", local: true }, agent), { terminal: true, routed: "local", status: "completed" });
});

test("PR0 rejects acknowledged delivery and every explicit nonlocal or unknown locality discriminator", () => {
  for (const response of [
    { routed: "mesh", queued: true, acknowledged: true, messageId: "ack-1" },
    { routed: "mesh", queued: true },
    { queued: true, acknowledged: true, messageId: "ack-2" },
    { ...actorTerminal, acknowledged: true },
  ]) {
    assert.throws(() => parseOwnerLocalStopResponse(response, actor), /mesh-shaped stop response is not owner-local terminal proof/u);
  }

  for (const target of [actor, agent] as const) {
    const terminal = target.kind === "actor" ? actorTerminal : agentTerminal;
    for (const contradictory of [
      { routed: "remote" },
      { routed: "unknown" },
      { routed: null },
      { local: false },
      { local: "unknown" },
      { local: null },
    ]) {
      assert.throws(
        () => parseOwnerLocalStopResponse({ ...terminal, ...contradictory }, target),
        /explicit stop routing\/locality is not owner-local proof/u,
        `${target.kind} accepted ${JSON.stringify(contradictory)}`,
      );
    }
  }
});

test("PR0 rejects malformed, nonterminal, and target-mismatched actor and agent stop results", () => {
  assert.throws(() => parseOwnerLocalStopResponse(false, actor), /expected an object/u);
  assert.throws(() => parseOwnerLocalStopResponse({ ...actorTerminal, status: "unknown" }, actor), /not a stopped actor result/u);
  assert.throws(() => parseOwnerLocalStopResponse({ ...agentTerminal, status: "running" }, agent), /not a terminal agent result/u);
  assert.throws(() => parseOwnerLocalStopResponse({ ...actorTerminal, id: "other" }, actor), /target mismatch/u);
  assert.throws(() => parseOwnerLocalStopResponse({ ...agentTerminal, id: "other" }, agent), /target mismatch/u);
});
