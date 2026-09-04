import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { request as httpRequest } from "node:http";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { ArborApplication } from "../application/ArborApplication.js";
import type { ArborQueryV1, ArborViewV1, IntentReceiptV1, WebIntentV1, WebSessionV1 } from "../domain/types.js";
import { FixtureCleanupAdapter, FixtureEvaluator, FixtureWorkspaceManager, ScriptedFixtureAgent } from "../fixtures/adapters.js";
import { FixtureDriver } from "../fixtures/driver.js";
import { InMemoryRunStore } from "../persistence/InMemoryRunStore.js";
import { FileReportPublisher } from "../reports/FileReportPublisher.js";
import { DeterministicIdFactory, ManualClock } from "../util/clock.js";
import { canonicalJson, digestCanonical, sha256 } from "../util/canonical.js";
import type { DetachedMonitorAuthorityV1, DetachedStreamBatchV1 } from "../web/DetachedMonitorAuthority.js";
import { DetachedMonitorAuthority } from "../web/DetachedMonitorAuthority.js";
import { DetachedMonitorServer } from "../web/DetachedMonitorServer.js";
import { ReleaseWebAssets } from "../web/ReleaseWebAssets.js";
import { WEB_MUTATION_ROUTES_V1, WEB_READ_ROUTES_V1 } from "../web/api-schemas.js";

export interface WebThreatObservationV1 {
  version: 1;
  name: string;
  passed: boolean;
  evidenceDigest: string;
}

export interface WebThreatCertificateV1 {
  version: 1;
  certificationId: "web_threat_b9_v1";
  createdAt: string;
  sourceDigests: Array<{ path: string; digest: string }>;
  assetManifestDigest: string;
  routeContractDigest: string;
  observations: WebThreatObservationV1[];
  passed: boolean;
  signerId: string;
  limitations: string[];
  certificateDigest: string;
}

const SOURCES = [
  "src/web/DetachedMonitorServer.ts",
  "src/web/DetachedMonitorAuthority.ts",
  "src/web/ReleaseWebAssets.ts",
  "src/web/api-schemas.ts",
  "src/web/redaction.ts",
  "web/index.html",
  "web/app.js",
  "web/app.css",
  "scripts/build-web.mjs",
  "src/component/definitions.ts",
  "src/certification/web.ts",
] as const;
const FILE = "web-threat-b9.v1.json";
const RUN_ID = "run_web_cert";
const ARTIFACT_ID = `art_${"a".repeat(60)}`;
const TOKEN = "w".repeat(32);

function sourceDigests(projectRoot: string): Array<{ path: string; digest: string }> {
  return SOURCES.map((path) => ({ path, digest: sha256(readFileSync(join(projectRoot, path))) }));
}

function observation(name: string, passed: boolean, evidence: unknown): WebThreatObservationV1 {
  return { version: 1, name, passed, evidenceDigest: digestCanonical({ name, evidence }) };
}

async function rawHostStatus(address: string, cookie: string): Promise<number> {
  return new Promise((resolveStatus, reject) => { const target = new URL("/api/v1/session", address); const request = httpRequest({ hostname: target.hostname, port: target.port, path: target.pathname, method: "GET", headers: { cookie, host: "evil.invalid" } }, (response) => { response.resume(); resolveStatus(response.statusCode ?? 0); }); request.once("error", reject); request.end(); });
}

async function authority(): Promise<{ value: DetachedMonitorAuthorityV1; attemptId: string; submitted: () => number; dispose: () => Promise<void> }> {
  const fixtureRoot = await mkdtemp(join(tmpdir(), "arbor-web-cert-"));
  try {
    const store = new InMemoryRunStore(); const clock = new ManualClock(); const ids = new DeterministicIdFactory();
    const application = new ArborApplication({
      store, workspace: new FixtureWorkspaceManager(), agent: new ScriptedFixtureAgent(), evaluator: new FixtureEvaluator(ids), cleanup: new FixtureCleanupAdapter(),
      reportPublisher: await FileReportPublisher.open(join(fixtureRoot, "reports", RUN_ID)), clock, ids, gitOidLength: 40, executionMode: "fixture",
    });
    const { run } = await new FixtureDriver(application, store, clock).run(RUN_ID);
    const attemptId = run.attempts[0]?.attemptId;
    if (!attemptId) throw new Error("Web certification fixture produced no attempt");
    const detached = new DetachedMonitorAuthority(application, store, () => 0, () => clock.now());
    const overview = await detached.query({ version: 1, kind: "overview", runId: RUN_ID });
    let submitted = 0;
    const value: DetachedMonitorAuthorityV1 = {
      listRuns: (limit) => detached.listRuns(limit),
      async query(query: ArborQueryV1): Promise<ArborViewV1> {
        if (query.runId === "run_large") return { ...overview, runId: query.runId, data: { boundedFailureProbe: "x".repeat(1_200_000) } };
        return detached.query(query);
      },
      queryAttempt: (runId, requestedAttemptId) => detached.queryAttempt(runId, requestedAttemptId),
      async readStreamBatch(runId: string, cursor: number): Promise<DetachedStreamBatchV1> {
        if (cursor < 1) return { version: 1, kind: "events", runId, floor: 0, cursor: 1, page: { version: 1, runId, afterSequence: cursor, events: [{ version: 1, runId, sequence: 1, revision: overview.revision, type: "WEB_CERT_EVENT", at: "2026-09-04T05:00:00.000Z" }], nextSequence: 1, hasMore: false }, projection: overview };
        return { version: 1, kind: "events", runId, floor: 0, cursor, page: { version: 1, runId, afterSequence: cursor, events: [], nextSequence: cursor, hasMore: false }, projection: overview };
      },
      async readArtifact(artifactId: string, offset: number, limit: number) { const length = Math.min(limit, 70_000 - offset); return { version: 1, artifactId, digest: "d".repeat(64), bytes: 70_000, offset, length, nextOffset: offset + length, hasMore: offset + length < 70_000, text: "a".repeat(length) }; },
      async submitIntent(_intent: WebIntentV1, session: WebSessionV1): Promise<IntentReceiptV1> { submitted += 1; return { version: 1, intentId: `intent_${"a".repeat(32)}`, runId: session.runId, state: "PENDING", revision: run.revision + 1 }; },
    };
    return { value, attemptId, submitted: () => submitted, dispose: () => rm(fixtureRoot, { recursive: true, force: true }) };
  } catch (error) { await rm(fixtureRoot, { recursive: true, force: true }); throw error; }
}

export async function executeWebThreatMatrix(projectRoot: string): Promise<{ observations: WebThreatObservationV1[]; assetManifestDigest: string }> {
  const root = resolve(projectRoot); const observations: WebThreatObservationV1[] = []; const lane = await authority();
  try {
  let remoteBindDenied = false;
  try { new DetachedMonitorServer({ authority: lane.value, host: "0.0.0.0" as "127.0.0.1" }); } catch { remoteBindDenied = true; }
  observations.push(observation("loopback-only-bind", remoteBindDenied, { remoteBindDenied }));
  const assets = await ReleaseWebAssets.load(join(root, "dist/web-assets"));
  const index = assets.get("/")!; const indexText = Buffer.from(index.body).toString("utf8");
  observations.push(observation("release-built-local-assets", !/https?:\/\/(?!127\.0\.0\.1|\[::1\])/u.test(indexText) && indexText.includes("/assets/app."), { manifestDigest: assets.manifestDigest, files: ["index", "app", "styles"] }));

  const server = new DetachedMonitorServer({ authority: lane.value, bootstrapToken: TOKEN, pollIntervalMs: 10, maxStreams: 1, maxStreamsPerSession: 1, maxStreamMs: 1000 });
  const address = await server.start();
  try {
    const unauthenticated = await fetch(`${address.url}/api/v1/runs`);
    observations.push(observation("authenticated-api", unauthenticated.status === 401, { status: unauthenticated.status }));
    const rootResponse = await fetch(`${address.url}/runs`); const headers = Object.fromEntries(["content-security-policy", "x-content-type-options", "x-frame-options", "referrer-policy", "permissions-policy", "cross-origin-opener-policy", "cross-origin-resource-policy", "cross-origin-embedder-policy"].map((name) => [name, rootResponse.headers.get(name)]));
    const strictHeaders = rootResponse.status === 200 && headers["x-content-type-options"] === "nosniff" && headers["x-frame-options"] === "DENY" && (headers["content-security-policy"] ?? "").includes("default-src 'none'") && (headers["content-security-policy"] ?? "").includes("frame-ancestors 'none'");
    observations.push(observation("security-headers", strictHeaders, headers));

    const wrongBootstrapOrigin = await fetch(`${address.url}/api/v1/session/bootstrap`, { method: "POST", headers: { origin: "http://evil.invalid", "content-type": "application/json" }, body: JSON.stringify({ version: 1, token: TOKEN }) });
    const bootstrap = await fetch(`${address.url}/api/v1/session/bootstrap`, { method: "POST", headers: { origin: address.url, "content-type": "application/json" }, body: JSON.stringify({ version: 1, token: TOKEN }) });
    const session = await bootstrap.json() as { csrfToken: string }; const setCookie = bootstrap.headers.get("set-cookie") ?? ""; const cookie = setCookie.split(";", 1)[0] ?? "";
    const secondBootstrap = await fetch(`${address.url}/api/v1/session/bootstrap`, { method: "POST", headers: { origin: address.url, "content-type": "application/json" }, body: JSON.stringify({ version: 1, token: TOKEN }) });
    const bootstrapPassed = wrongBootstrapOrigin.status === 403 && bootstrap.status === 201 && secondBootstrap.status === 409 && /HttpOnly/iu.test(setCookie) && /SameSite=Strict/iu.test(setCookie) && !setCookie.includes(TOKEN);
    observations.push(observation("one-time-fragment-bootstrap-cookie", bootstrapPassed, { wrongOrigin: wrongBootstrapOrigin.status, first: bootstrap.status, second: secondBootstrap.status, httpOnly: /HttpOnly/iu.test(setCookie), sameSiteStrict: /SameSite=Strict/iu.test(setCookie), tokenAbsent: !setCookie.includes(TOKEN) }));

    const wrongHostStatus = await rawHostStatus(address.url, cookie);
    const wrongOrigin = await fetch(`${address.url}/api/v1/session`, { headers: { cookie, origin: "http://evil.invalid" } });
    observations.push(observation("exact-host-origin", wrongHostStatus === 400 && wrongOrigin.status === 403, { wrongHost: wrongHostStatus, wrongOrigin: wrongOrigin.status }));

    const noCsrf = await fetch(`${address.url}/api/v1/runs/${RUN_ID}/intents`, { method: "POST", headers: { cookie, origin: address.url, "content-type": "application/json", "idempotency-key": "web_cert_no_csrf" }, body: JSON.stringify({ version: 1, kind: "pause", expectedRevision: 1 }) });
    observations.push(observation("csrf-every-mutation", noCsrf.status === 403 && lane.submitted() === 0, { status: noCsrf.status, submitted: lane.submitted() }));

    const requiredReads = [
      "/api/v1/session", "/api/v1/runs", `/api/v1/runs/${RUN_ID}`, `/api/v1/runs/${RUN_ID}/tree`, `/api/v1/runs/${RUN_ID}/attempts`, `/api/v1/runs/${RUN_ID}/attempts/${lane.attemptId}`, `/api/v1/runs/${RUN_ID}/comparisons`, `/api/v1/runs/${RUN_ID}/metrics`, `/api/v1/runs/${RUN_ID}/events`, `/api/v1/runs/${RUN_ID}/resources`, `/api/v1/runs/${RUN_ID}/promotions`, `/api/v1/runs/${RUN_ID}/report`, `/api/v1/runs/${RUN_ID}/contract`, `/api/v1/artifacts/${ARTIFACT_ID}?runId=${RUN_ID}&effectId=effect_web_cert`, `/api/v1/diffs/${ARTIFACT_ID}?runId=${RUN_ID}&effectId=effect_web_cert`,
    ];
    const readStatuses: number[] = [];
    for (const path of requiredReads) readStatuses.push((await fetch(`${address.url}${path}`, { headers: { cookie } })).status);
    observations.push(observation("complete-bounded-read-api", readStatuses.every((status) => status === 200) && WEB_READ_ROUTES_V1.length === 16, { readStatuses, contracts: WEB_READ_ROUTES_V1.length }));

    const artifactBound = await fetch(`${address.url}/api/v1/artifacts/${ARTIFACT_ID}?limit=65537&runId=${RUN_ID}&effectId=effect_web_cert`, { headers: { cookie } });
    const closedQuery = await fetch(`${address.url}/api/v1/runs?unknown=1`, { headers: { cookie } });
    const longTarget = await fetch(`${address.url}/${"x".repeat(2050)}`, { headers: { cookie } });
    observations.push(observation("pagination-artifact-diff-target-bounds", artifactBound.status === 400 && closedQuery.status === 400 && longTarget.status === 414, { artifactBound: artifactBound.status, closedQuery: closedQuery.status, longTarget: longTarget.status }));

    const oversized = await fetch(`${address.url}/api/v1/runs/${RUN_ID}/intents`, { method: "POST", headers: { cookie, origin: address.url, "x-arbor-csrf": session.csrfToken, "content-type": "application/json", "idempotency-key": "web_cert_body_limit" }, body: JSON.stringify({ version: 1, kind: "pause", expectedRevision: 1, reason: "x".repeat(256 * 1024) }) });
    const largeResponse = await fetch(`${address.url}/api/v1/runs/run_large`, { headers: { cookie } });
    observations.push(observation("body-and-response-limits", oversized.status === 413 && largeResponse.status === 507, { request: oversized.status, response: largeResponse.status }));

    const intent = await fetch(`${address.url}/api/v1/runs/${RUN_ID}/intents`, { method: "POST", headers: { cookie, origin: address.url, "x-arbor-csrf": session.csrfToken, "content-type": "application/json", "idempotency-key": "web_cert_intent_01" }, body: JSON.stringify({ version: 1, kind: "requestReport", expectedRevision: 1 }) });
    const forbidden = await fetch(`${address.url}/api/v1/runs/${RUN_ID}`, { method: "PATCH", headers: { cookie, origin: address.url } });
    observations.push(observation("inbox-only-mutations", intent.status === 202 && lane.submitted() === 1 && forbidden.status === 405 && WEB_MUTATION_ROUTES_V1.every((entry) => entry.mutationAuthority !== "none"), { intent: intent.status, submitted: lane.submitted(), forbidden: forbidden.status, contracts: WEB_MUTATION_ROUTES_V1.length }));

    const controller = new AbortController(); const firstStream = await fetch(`${address.url}/api/v1/stream?runId=${RUN_ID}&cursor=0`, { headers: { cookie }, signal: controller.signal });
    const firstChunk = await firstStream.body!.getReader().read(); const eventText = new TextDecoder().decode(firstChunk.value);
    const secondStream = await fetch(`${address.url}/api/v1/stream?runId=${RUN_ID}&cursor=0`, { headers: { cookie } }); controller.abort();
    observations.push(observation("sse-catchup-and-concurrency-limit", firstStream.status === 200 && /event: arbor-event/u.test(eventText) && secondStream.status === 429, { first: firstStream.status, event: /event: arbor-event/u.test(eventText), second: secondStream.status }));

    const revoked = await fetch(`${address.url}/api/v1/session`, { method: "DELETE", headers: { cookie, origin: address.url, "x-arbor-csrf": session.csrfToken } });
    const afterRevoke = await fetch(`${address.url}/api/v1/session`, { headers: { cookie } });
    observations.push(observation("revocable-session", revoked.status === 200 && afterRevoke.status === 401, { revoked: revoked.status, afterRevoke: afterRevoke.status }));
  } finally { await server.close(); }

  const rateServer = new DetachedMonitorServer({ authority: lane.value, bootstrapToken: "r".repeat(32), maxRequestsPerMinute: 2 }); const rateAddress = await rateServer.start();
  try {
    const statuses = [await fetch(`${rateAddress.url}/`), await fetch(`${rateAddress.url}/runs`), await fetch(`${rateAddress.url}/`)].map((entry) => entry.status);
    observations.push(observation("request-rate-limit", statuses[0] === 200 && statuses[1] === 200 && statuses[2] === 429, { statuses }));
  } finally { await rateServer.close(); }
  return { observations, assetManifestDigest: assets.manifestDigest };
  } finally { await lane.dispose(); }
}

export async function generateWebThreatCertificate(input: { projectRoot?: string; createdAt: string; signerId: string }): Promise<WebThreatCertificateV1> {
  const projectRoot = resolve(input.projectRoot ?? process.cwd()); const result = await executeWebThreatMatrix(projectRoot);
  const base = { version: 1 as const, certificationId: "web_threat_b9_v1" as const, createdAt: input.createdAt, sourceDigests: sourceDigests(projectRoot), assetManifestDigest: result.assetManifestDigest, routeContractDigest: digestCanonical({ read: WEB_READ_ROUTES_V1, mutation: WEB_MUTATION_ROUTES_V1 }), observations: result.observations, passed: result.observations.every((entry) => entry.passed), signerId: input.signerId, limitations: ["Certificate covers the release-built local loopback implementation and deterministic HTTP matrix. Remote access is prohibited and not certified.", "Representative-user and manual accessibility review are not claimed."] };
  return { ...base, certificateDigest: digestCanonical(base) };
}

export function writeWebThreatCertificate(path: string, certificate: WebThreatCertificateV1): void {
  const target = resolve(path); mkdirSync(dirname(target), { recursive: true, mode: 0o700 }); const raw = `${canonicalJson(certificate)}\n`; const temporary = `${target}.tmp`;
  writeFileSync(temporary, raw, { mode: 0o600 }); renameSync(temporary, target); writeFileSync(`${target}.sha256`, `${sha256(raw)}  ${FILE}\n`, { mode: 0o600 });
}

export async function verifyWebThreatCertificate(input: { projectRoot?: string; artifact: string }): Promise<{ valid: boolean; certificate?: WebThreatCertificateV1; errors: string[] }> {
  let certificate: WebThreatCertificateV1; let raw: string;
  try { raw = readFileSync(resolve(input.artifact), "utf8"); certificate = JSON.parse(raw) as WebThreatCertificateV1; } catch { return { valid: false, errors: ["Web threat certificate is missing or invalid JSON"] }; }
  const errors: string[] = []; const projectRoot = resolve(input.projectRoot ?? process.cwd()); const { certificateDigest, ...unsigned } = certificate;
  if (certificateDigest !== digestCanonical(unsigned)) errors.push("certificate digest mismatch");
  if (canonicalJson(certificate.sourceDigests) !== canonicalJson(sourceDigests(projectRoot))) errors.push("active Web source digest mismatch");
  const rerun = await executeWebThreatMatrix(projectRoot);
  if (rerun.assetManifestDigest !== certificate.assetManifestDigest) errors.push("release Web asset manifest digest mismatch");
  if (canonicalJson(rerun.observations) !== canonicalJson(certificate.observations)) errors.push("Web threat matrix is not reproducible");
  if (certificate.routeContractDigest !== digestCanonical({ read: WEB_READ_ROUTES_V1, mutation: WEB_MUTATION_ROUTES_V1 })) errors.push("Web route contract digest mismatch");
  if (!certificate.passed || !rerun.observations.every((entry) => entry.passed)) errors.push("Web threat matrix did not pass");
  try { const checksum = readFileSync(`${resolve(input.artifact)}.sha256`, "utf8").trim().split(/\s+/u)[0]; if (checksum !== sha256(raw)) errors.push("artifact checksum mismatch"); } catch { errors.push("Web threat certificate checksum is missing"); }
  return { valid: errors.length === 0, certificate, errors };
}
