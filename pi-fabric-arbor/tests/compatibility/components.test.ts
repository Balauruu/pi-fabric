import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import type { FabricComponentContext, FabricComponentDisposer, FabricProvider } from "pi-fabric";
import { createArborWebComponent, createArborRuntimeComponent } from "../../src/component/definitions.js";
import { createCertificationBlockedProvider } from "../../src/public/provider.js";

function context(events: string[], disposers: FabricComponentDisposer[] = []): FabricComponentContext {
  return {
    id: "component_test", signal: new AbortController().signal, view: {} as never,
    invocation: { extensionContext: { hasUI: false, ui: { notify() {} } }, activity(update: { type: string }) { events.push(`activity:${update.type}`); } } as never,
    async effect(setup) { events.push("effect"); const value = await setup(); if (typeof value === "function") disposers.push(value); return async () => { if (typeof value === "function") await value(); }; },
    defer(disposer) { events.push("defer"); disposers.push(disposer); return disposer; },
    provide(provider: FabricProvider) { events.push(`provide:${provider.name}`); let active = true; return { bindingId: "binding", name: provider.name, generation: 1, get active() { return active; }, retire() { active = false; }, async release() { events.push(`release:${provider.name}`); active = false; } }; },
    guide() { return () => undefined; }, use() { throw new Error("not used"); }, async acquire() { throw new Error("not used"); }, async call() { throw new Error("not used"); },
  };
}

test("arbor-runtime publishes its provider exactly once through its supervised component lifetime", async () => {
  const events: string[] = []; const component = createArborRuntimeComponent(() => createCertificationBlockedProvider());
  const result = await component.activate(context(events), { version: 1, enabled: true });
  assert.deepEqual(events, ["provide:arbor"]); assert.equal(result, undefined);
});

test("arbor-web component owns and disposes the actual loopback server without execution capabilities", async () => {
  const root = await mkdtemp(join(tmpdir(), "arbor-web-component-")); const events: string[] = []; const disposers: FabricComponentDisposer[] = []; let url = "";
  try {
    const component = createArborWebComponent({ onStarted(address) { url = address.url; } });
    await component.activate(context(events, disposers), { version: 1, database: join(root, "authority.sqlite3"), bootstrapToken: "c".repeat(32) });
    assert.deepEqual(events, ["effect", "activity:progress"]); assert.equal(disposers.length, 1); assert.match(url, /^http:\/\/127\.0\.0\.1:\d+$/u);
    const response = await fetch(`${url}/runs`); assert.equal(response.status, 200); assert.match(await response.text(), /inbox intents only/u);
    await disposers[0]!(); await assert.rejects(fetch(`${url}/runs`));
  } finally { await rm(root, { recursive: true, force: true }); }
});
