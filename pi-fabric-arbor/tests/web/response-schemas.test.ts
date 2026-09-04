import assert from "node:assert/strict";
import { rm } from "node:fs/promises";
import test from "node:test";
import type { ArborQueryV1, ArborViewV1 } from "../../src/domain/types.js";
import { createFixtureContract } from "../../src/fixtures/driver.js";
import type { JsonSchema } from "../../src/schemas/catalog.js";
import type { DetachedMonitorAuthorityV1, DetachedStreamBatchV1 } from "../../src/web/DetachedMonitorAuthority.js";
import { DetachedMonitorAuthority } from "../../src/web/DetachedMonitorAuthority.js";
import { DetachedMonitorServer } from "../../src/web/DetachedMonitorServer.js";
import {
  WEB_API_ENVELOPE_SCHEMAS_V1,
  WEB_ROUTES_V1,
  WEB_SSE_EVENT_SCHEMAS_V1,
  WebResponseSchemaError,
  serializeWebRouteResponseV1,
} from "../../src/web/api-schemas.js";
import { validateJsonSchema } from "../../src/schemas/validate.js";
import { makeFixtureApplication } from "../helpers.js";

function assertClosedAndBounded(schema: JsonSchema, location: string): void {
  if (Array.isArray(schema.oneOf)) for (const [index, variant] of (schema.oneOf as JsonSchema[]).entries()) assertClosedAndBounded(variant, `${location}.oneOf[${index}]`);
  if (schema.type === "object") {
    assert.equal(schema.additionalProperties, false, `${location} must reject unknown fields`);
    for (const [key, child] of Object.entries((schema.properties ?? {}) as Record<string, JsonSchema>)) assertClosedAndBounded(child, `${location}.${key}`);
  }
  if (schema.type === "array") {
    assert.equal(Number.isSafeInteger(schema.maxItems), true, `${location} must have maxItems`);
    assertClosedAndBounded(schema.items as JsonSchema, `${location}[]`);
  }
  if (schema.type === "string" && schema.const === undefined && schema.enum === undefined) assert.equal(Number.isSafeInteger(schema.maxLength), true, `${location} must have maxLength`);
}

async function fixtureAuthority() {
  const fixture = await makeFixtureApplication(); const runId = "run_response_schema";
  await fixture.application.execute({ version: 1, kind: "start", metadata: { runId, expectedRevision: 0, idempotencyKey: "response_schema_start" }, contract: createFixtureContract() }, { fence: 0, now: fixture.clock.now() });
  const authority = new DetachedMonitorAuthority(fixture.application, fixture.store, () => 0, () => fixture.clock.now());
  return { fixture, runId, authority };
}

function overrideAuthority(base: DetachedMonitorAuthorityV1, overrides: Partial<DetachedMonitorAuthorityV1>): DetachedMonitorAuthorityV1 {
  return {
    listRuns: overrides.listRuns ?? ((limit) => base.listRuns(limit)),
    query: overrides.query ?? ((query) => base.query(query)),
    queryAttempt: overrides.queryAttempt ?? ((runId, attemptId) => base.queryAttempt(runId, attemptId)),
    readStreamBatch: overrides.readStreamBatch ?? ((runId, cursor, limit) => base.readStreamBatch(runId, cursor, limit)),
    readArtifact: overrides.readArtifact ?? ((artifactId, offset, limit, binding) => base.readArtifact(artifactId, offset, limit, binding)),
    submitIntent: overrides.submitIntent ?? ((intent, session) => base.submitIntent(intent, session)),
  };
}

async function authenticate(server: DetachedMonitorServer, token: string) {
  const address = await server.start();
  const bootstrap = await fetch(`${address.url}/api/v1/session/bootstrap`, { method: "POST", headers: { origin: address.url, "content-type": "application/json" }, body: JSON.stringify({ version: 1, token }) });
  assert.equal(bootstrap.status, 201); const cookie = bootstrap.headers.get("set-cookie")!.split(";", 1)[0]!;
  return { address, cookie };
}

test("every declared API success, error, SSE event, reset, and stream error body has a closed bounded schema", () => {
  assert.equal(new Set(WEB_ROUTES_V1.map((route) => `${route.method} ${route.path}`)).size, WEB_ROUTES_V1.length);
  for (const route of WEB_ROUTES_V1) {
    const schema = WEB_API_ENVELOPE_SCHEMAS_V1[route.response];
    assert.ok(schema, `${route.method} ${route.path} -> ${route.response}`);
    assertClosedAndBounded(schema, route.response);
  }
  assertClosedAndBounded(WEB_API_ENVELOPE_SCHEMAS_V1["error.v1"]!, "error.v1");
  assert.deepEqual(Object.keys(WEB_SSE_EVENT_SCHEMAS_V1).sort(), ["arbor-error", "arbor-event", "caught-up", "reset", "stream-limit"]);
  for (const [name, schema] of Object.entries(WEB_SSE_EVENT_SCHEMAS_V1)) assertClosedAndBounded(schema, `SSE ${name}`);
  const runs = WEB_ROUTES_V1.find((route) => route.method === "GET" && route.path === "/api/v1/runs")!;
  assert.throws(() => serializeWebRouteResponseV1(runs, "overview.v1", { version: 1, runs: [] }), (error: unknown) => error instanceof WebResponseSchemaError && error.code === "RESPONSE_SCHEMA_MISMATCH");
});

test("the response boundary rejects unknown fields, over-counts, oversize values, and route-kind mismatches from a malformed authority", async () => {
  const lane = await fixtureAuthority();
  try {
    const validOverview = await lane.authority.query({ version: 1, kind: "overview", runId: lane.runId });
    const validSummary = (await lane.authority.listRuns(1))[0]!;
    const scenarios: Array<{ name: string; path: string; status: number; mutate(base: DetachedMonitorAuthorityV1): DetachedMonitorAuthorityV1 }> = [
      {
        name: "unknown-field", path: "/api/v1/runs", status: 500,
        mutate: (base) => overrideAuthority(base, { listRuns: async () => [{ ...validSummary, undeclaredAuthorityField: true } as never] }),
      },
      {
        name: "over-count", path: "/api/v1/runs", status: 500,
        mutate: (base) => overrideAuthority(base, { listRuns: async () => Array.from({ length: 201 }, () => validSummary) }),
      },
      {
        name: "over-size", path: `/api/v1/runs/${lane.runId}`, status: 507,
        mutate: (base) => overrideAuthority(base, { query: async () => ({ ...validOverview, data: { ...validOverview.data, oversized: "x".repeat(1_100_000) } }) }),
      },
      {
        name: "route-kind-mismatch", path: `/api/v1/runs/${lane.runId}/tree`, status: 500,
        mutate: (base) => overrideAuthority(base, { query: async (_query: ArborQueryV1): Promise<ArborViewV1> => validOverview }),
      },
    ];
    for (const [index, scenario] of scenarios.entries()) {
      const token = String.fromCharCode(97 + index).repeat(32);
      const server = new DetachedMonitorServer({ authority: scenario.mutate(lane.authority), bootstrapToken: token, pollIntervalMs: 10 });
      try {
        const { address, cookie } = await authenticate(server, token); const response = await fetch(`${address.url}${scenario.path}`, { headers: { cookie } });
        assert.equal(response.status, scenario.status, scenario.name);
        const body = await response.json(); assert.deepEqual(validateJsonSchema(WEB_API_ENVELOPE_SCHEMAS_V1["error.v1"]!, body), [], scenario.name);
      } finally { await server.close(); }
    }
  } finally { await rm(lane.fixture.root, { recursive: true, force: true }); }
});

test("malformed authority SSE reset and post-connect event bodies fail closed with typed errors", async () => {
  const lane = await fixtureAuthority();
  try {
    const overview = await lane.authority.query({ version: 1, kind: "overview", runId: lane.runId });
    const malformedReset: DetachedStreamBatchV1 = { version: 1, kind: "reset", runId: lane.runId, floor: 1, cursor: overview.cursor, reason: "compacted", projection: overview };
    const preflightAuthority = overrideAuthority(lane.authority, { readStreamBatch: async () => ({ ...malformedReset, unknown: true } as never) });
    const firstServer = new DetachedMonitorServer({ authority: preflightAuthority, bootstrapToken: "s".repeat(32), pollIntervalMs: 10 });
    try {
      const { address, cookie } = await authenticate(firstServer, "s".repeat(32)); const response = await fetch(`${address.url}/api/v1/stream?runId=${lane.runId}&cursor=0`, { headers: { cookie } });
      assert.equal(response.status, 500); assert.deepEqual(validateJsonSchema(WEB_API_ENVELOPE_SCHEMAS_V1["error.v1"]!, await response.json()), []);
    } finally { await firstServer.close(); }

    let calls = 0;
    const validBatch = await lane.authority.readStreamBatch(lane.runId, overview.cursor, 1);
    const postConnectAuthority = overrideAuthority(lane.authority, { readStreamBatch: async () => ++calls === 1 ? validBatch : ({ ...malformedReset, unknown: true } as never) });
    const secondServer = new DetachedMonitorServer({ authority: postConnectAuthority, bootstrapToken: "t".repeat(32), pollIntervalMs: 10 });
    try {
      const { address, cookie } = await authenticate(secondServer, "t".repeat(32)); const response = await fetch(`${address.url}/api/v1/stream?runId=${lane.runId}&cursor=${overview.cursor}`, { headers: { cookie } });
      assert.equal(response.status, 200); const reader = response.body!.getReader(); let text = "";
      while (!text.includes("event: arbor-error")) { const next = await reader.read(); if (next.done) break; text += new TextDecoder().decode(next.value); }
      assert.match(text, /event: caught-up/u); assert.match(text, /event: arbor-error/u);
      const body = JSON.parse(text.split("event: arbor-error\ndata: ")[1]!.split("\n\n", 1)[0]!);
      assert.deepEqual(validateJsonSchema(WEB_SSE_EVENT_SCHEMAS_V1["arbor-error"]!, body), []);
    } finally { await secondServer.close(); }
  } finally { await rm(lane.fixture.root, { recursive: true, force: true }); }
});
