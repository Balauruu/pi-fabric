import assert from "node:assert/strict";
import { rm } from "node:fs/promises";
import test from "node:test";
import extension from "../../src/extension.js";
import { createFixtureContract } from "../../src/fixtures/driver.js";
import { createArborProvider } from "../../src/public/provider.js";
import { assertJsonSchema } from "../../src/schemas/validate.js";
import { errorCode, makeFixtureApplication } from "../helpers.js";

const invocation = {} as never;

test("fixture provider supports discovery, closed start, and inspect through application", async () => {
  const fixture = await makeFixtureApplication();
  try {
    const provider = createArborProvider(fixture.application);
    const listed = await provider.list({ namespace: "arbor", query: "contract", limit: 10 }, invocation);
    assert.ok(listed.some((entry) => entry.name === "start"));
    assert.equal((await provider.describe("start", invocation))?.namespace, "arbor");
    const startArgs = { version: 1, metadata: { runId: "run_provider", expectedRevision: 0, idempotencyKey: "provider_start_key01" }, contract: createFixtureContract() };
    const receipt = await provider.invoke("start", startArgs, invocation);
    assert.doesNotThrow(() => assertJsonSchema(fixture.application.schemas.actionOutputs["arbor.start"]!, receipt));
    const view = await provider.invoke("inspect", { version: 1, runId: "run_provider", view: "contract", limit: 20 }, invocation);
    assert.doesNotThrow(() => assertJsonSchema(fixture.application.schemas.actionOutputs["arbor.inspect"]!, view));
    await assert.rejects(provider.invoke("start", { ...startArgs, unknown: true }, invocation), errorCode("VALIDATION_FAILED"));
    await provider.close?.();
  } finally { await rm(fixture.root, { recursive: true, force: true }); }
});

test("package extension registers and discovers supervised components without a duplicate host-owned provider lifetime", async () => {
  const events: Array<{ name: string; payload: unknown }> = []; const listeners = new Map<string, (payload: unknown) => void>();
  extension({ events: { emit(name, payload) { events.push({ name, payload }); }, on(name, listener) { listeners.set(name, listener); } } });
  assert.deepEqual(events.map((entry) => entry.name), ["pi-fabric:component:register:v1", "pi-fabric:component:register:v1"]);
  assert.deepEqual(events.map((entry) => (entry.payload as { component: { name: string } }).component.name), ["arbor-runtime", "arbor-web"]);
  assert.equal(events.some((entry) => entry.name.includes("provider:register")), false);
  const discovered: string[] = [];
  listeners.get("pi-fabric:component:discover:v1")?.({ version: 1, register(component: { name: string }, options: { overwrite?: boolean }) { assert.equal(options.overwrite, true); discovered.push(component.name); } });
  assert.deepEqual(discovered, ["arbor-runtime", "arbor-web"]);
  const runtime = (events[0]!.payload as { component: { activate(context: unknown, config: unknown): Promise<void> } }).component; let provider: { list(request: object, context: unknown): Promise<Array<{ name: string }>>; invoke(name: string, args: object, context: unknown): Promise<unknown> } | undefined;
  await runtime.activate({ provide(value: typeof provider) { provider = value; }, signal: new AbortController().signal, view: {}, invocation: {} }, { version: 1, enabled: true });
  assert.equal((await provider!.list({}, invocation)).length, 30);
  await assert.rejects(provider!.invoke("start", {}, invocation), (error: unknown) => errorCode("COMPATIBILITY_CERTIFICATION_REQUIRED")(error) && error instanceof Error && /graduated production composition has not been prepared/u.test(error.message));
});
