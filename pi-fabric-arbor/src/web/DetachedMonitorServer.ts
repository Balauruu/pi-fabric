import { randomBytes, timingSafeEqual } from "node:crypto";
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { URL } from "node:url";
import { ArborError } from "../domain/errors.js";
import type { ArborQueryV1, WebIntentV1 } from "../domain/types.js";
import { sha256 } from "../util/canonical.js";
import type { DetachedMonitorAuthorityV1, DetachedStreamBatchV1 } from "./DetachedMonitorAuthority.js";
import { redactText } from "./redaction.js";
import { ReleaseWebAssets, type ReleaseWebAssetV1 } from "./ReleaseWebAssets.js";
import {
  WEB_ROUTES_V1,
  WebResponseSchemaError,
  serializeWebErrorResponseV1,
  serializeWebRouteResponseV1,
  serializeWebSseEventV1,
  type WebRouteContractV1,
} from "./api-schemas.js";

const BODY_LIMIT = 256 * 1024;
const PREVIEW_LIMIT = 64 * 1024;
const REQUEST_TARGET_LIMIT = 2048;
const ID = /^[a-z][a-z0-9_]{2,63}$/u;
const TOKEN = /^[A-Za-z0-9_-]{32,256}$/u;
const IDEMPOTENCY = /^[A-Za-z0-9._~-]{16,128}$/u;
const INTEGER = /^(?:0|[1-9][0-9]{0,15})$/u;
const UI_ROUTE = /^(?:\/|\/runs|\/runs\/[a-z][a-z0-9_]{2,63}|\/runs\/[a-z][a-z0-9_]{2,63}\/(?:overview|tree|attempts|compare|metrics|timeline|resources|promotion|report|contract)|\/runs\/[a-z][a-z0-9_]{2,63}\/attempts\/[a-z][a-z0-9_]{2,63})$/u;

interface SessionV1 { sessionId: string; cookieDigest: string; csrf: string; revoked: boolean; createdAt: number; expiresAt: number }
interface RateWindowV1 { startedAt: number; count: number }

export interface DetachedMonitorServerOptionsV1 {
  authority: DetachedMonitorAuthorityV1;
  host?: "127.0.0.1" | "::1";
  port?: number;
  bootstrapToken?: string;
  pollIntervalMs?: number;
  assetsRoot?: string;
  maxRequestsPerMinute?: number;
  maxStreams?: number;
  maxStreamsPerSession?: number;
  maxStreamMs?: number;
  sessionTtlMs?: number;
}

export interface DetachedMonitorServerAddressV1 {
  version: 1;
  url: string;
  bootstrapUrl: string;
  assetManifestDigest: string;
  status: "No active Fabric driver";
}

class HttpError extends Error {
  constructor(readonly status: number, readonly code: string, message: string) { super(message); }
}

function securityHeaders(response: ServerResponse): void {
  response.setHeader("Content-Security-Policy", "default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self'; font-src 'none'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'");
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.setHeader("X-Frame-Options", "DENY");
  response.setHeader("Referrer-Policy", "no-referrer");
  response.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=(), usb=()");
  response.setHeader("Cross-Origin-Opener-Policy", "same-origin");
  response.setHeader("Cross-Origin-Resource-Policy", "same-origin");
  response.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
  response.setHeader("Cache-Control", "no-store");
}

function declaredRoute(method: WebRouteContractV1["method"], path: string): WebRouteContractV1 {
  const matches = WEB_ROUTES_V1.filter((entry) => entry.method === method && entry.path === path);
  if (matches.length !== 1) throw new WebResponseSchemaError("RESPONSE_SCHEMA_MISMATCH", `No unique response contract for ${method} ${path}`);
  return matches[0]!;
}

function sendRouteJson(response: ServerResponse, status: number, route: WebRouteContractV1, schemaName: string, value: unknown, head = false): void {
  const body = serializeWebRouteResponseV1(route, schemaName, value);
  response.statusCode = status;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.setHeader("Content-Length", Buffer.byteLength(body, "utf8"));
  response.end(head ? undefined : body);
}

function sendErrorJson(response: ServerResponse, status: number, value: unknown): void {
  const body = serializeWebErrorResponseV1(value);
  response.statusCode = status;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.setHeader("Content-Length", Buffer.byteLength(body, "utf8"));
  response.end(body);
}

function safeEqual(left: string, right: string): boolean {
  const a = Buffer.from(left); const b = Buffer.from(right);
  return a.byteLength === b.byteLength && timingSafeEqual(a, b);
}

function assertClosedObject(value: unknown, required: readonly string[], optional: readonly string[] = []): asserts value is Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new HttpError(400, "VALIDATION_FAILED", "Request body must be an object");
  const keys = Object.keys(value as Record<string, unknown>);
  if (required.some((key) => !keys.includes(key)) || keys.some((key) => !required.includes(key) && !optional.includes(key))) throw new HttpError(400, "VALIDATION_FAILED", "Request body does not match the closed schema");
}

async function readJson(request: IncomingMessage): Promise<unknown> {
  const type = request.headers["content-type"]?.split(";", 1)[0]?.trim().toLowerCase();
  if (type !== "application/json" || request.headers["content-encoding"]) throw new HttpError(415, "UNSUPPORTED_MEDIA_TYPE", "Only uncompressed application/json is accepted");
  const rawLength = request.headers["content-length"];
  if (rawLength !== undefined && !INTEGER.test(rawLength)) throw new HttpError(400, "VALIDATION_FAILED", "Content-Length is invalid");
  const contentLength = Number(rawLength ?? 0);
  if (contentLength > BODY_LIMIT) throw new HttpError(413, "BODY_LIMIT", "Request body exceeds 256 KiB");
  const chunks: Buffer[] = []; let bytes = 0;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk); bytes += buffer.byteLength;
    if (bytes > BODY_LIMIT) throw new HttpError(413, "BODY_LIMIT", "Request body exceeds 256 KiB");
    chunks.push(buffer);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString("utf8")); }
  catch { throw new HttpError(400, "VALIDATION_FAILED", "Request body is not JSON"); }
}

function assertQuery(url: URL, allowed: readonly string[]): void {
  const seen = new Set<string>();
  for (const [key] of url.searchParams) {
    if (!allowed.includes(key) || seen.has(key)) throw new HttpError(400, "VALIDATION_FAILED", "Query does not match the closed route schema");
    seen.add(key);
  }
}

function integerParameter(url: URL, name: string, fallback: number, minimum: number, maximum: number): number {
  const raw = url.searchParams.get(name);
  if (raw === null) return fallback;
  if (!INTEGER.test(raw)) throw new HttpError(400, "VALIDATION_FAILED", `Invalid ${name} parameter`);
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value < minimum || value > maximum) throw new HttpError(400, "VALIDATION_FAILED", `Invalid ${name} parameter`);
  return value;
}

function isLoopbackAddress(address: string | undefined): boolean {
  return address === "127.0.0.1" || address === "::1" || address === "::ffff:127.0.0.1";
}

export class DetachedMonitorServer {
  readonly #authority: DetachedMonitorAuthorityV1;
  readonly #host: "127.0.0.1" | "::1";
  readonly #port: number;
  readonly #pollIntervalMs: number;
  readonly #bootstrapToken: string;
  readonly #assetsRoot: string | undefined;
  readonly #maxRequestsPerMinute: number;
  readonly #maxStreams: number;
  readonly #maxStreamsPerSession: number;
  readonly #maxStreamMs: number;
  readonly #sessionTtlMs: number;
  readonly #sessions = new Map<string, SessionV1>();
  readonly #rates = new Map<string, RateWindowV1>();
  readonly #sessionStreams = new Map<string, number>();
  #activeStreams = 0;
  #bootstrapUsed = false;
  #server: Server | undefined;
  #assets: ReleaseWebAssets | undefined;
  #origin = "";
  #hostHeader = "";

  constructor(options: DetachedMonitorServerOptionsV1) {
    this.#authority = options.authority;
    const suppliedHost = options.host ?? "127.0.0.1";
    if (suppliedHost !== "127.0.0.1" && suppliedHost !== "::1") throw new ArborError("VALIDATION_FAILED", "Remote Web bind is prohibited");
    this.#host = suppliedHost;
    this.#port = options.port ?? 0;
    this.#pollIntervalMs = options.pollIntervalMs ?? 250;
    this.#bootstrapToken = options.bootstrapToken ?? randomBytes(32).toString("base64url");
    this.#assetsRoot = options.assetsRoot;
    this.#maxRequestsPerMinute = options.maxRequestsPerMinute ?? 240;
    this.#maxStreams = options.maxStreams ?? 8;
    this.#maxStreamsPerSession = options.maxStreamsPerSession ?? 2;
    this.#maxStreamMs = options.maxStreamMs ?? 5 * 60_000;
    this.#sessionTtlMs = options.sessionTtlMs ?? 8 * 60 * 60_000;
    if (!TOKEN.test(this.#bootstrapToken)) throw new ArborError("VALIDATION_FAILED", "Bootstrap token is not bounded URL-safe data");
    if (!Number.isSafeInteger(this.#port) || this.#port < 0 || this.#port > 65_535) throw new ArborError("VALIDATION_FAILED", "Invalid loopback port");
    if (!Number.isSafeInteger(this.#pollIntervalMs) || this.#pollIntervalMs < 10 || this.#pollIntervalMs > 10_000) throw new ArborError("VALIDATION_FAILED", "Invalid SSE poll interval");
    for (const [value, minimum, maximum, label] of [[this.#maxRequestsPerMinute, 1, 10_000, "request rate"], [this.#maxStreams, 1, 64, "stream count"], [this.#maxStreamsPerSession, 1, 16, "session stream count"], [this.#maxStreamMs, 1000, 3_600_000, "stream duration"], [this.#sessionTtlMs, 60_000, 86_400_000, "session duration"]] as const) {
      if (!Number.isSafeInteger(value) || value < minimum || value > maximum) throw new ArborError("VALIDATION_FAILED", `Invalid ${label} limit`);
    }
  }

  async start(): Promise<DetachedMonitorServerAddressV1> {
    if (this.#server) throw new ArborError("ILLEGAL_TRANSITION", "Detached server is already running");
    this.#assets = await ReleaseWebAssets.load(this.#assetsRoot);
    const server = createServer({ maxHeaderSize: 16 * 1024, requestTimeout: 15_000, headersTimeout: 10_000, keepAliveTimeout: 5_000 }, (request, response) => { void this.#handle(request, response); });
    server.maxHeadersCount = 64;
    this.#server = server;
    try {
      await new Promise<void>((resolve, reject) => { server.once("error", reject); server.listen(this.#port, this.#host, () => { server.off("error", reject); resolve(); }); });
    } catch (error) { this.#server = undefined; throw error; }
    const address = server.address();
    if (!address || typeof address === "string") throw new ArborError("STORE_CORRUPT", "Detached server has no TCP address");
    this.#hostHeader = this.#host === "::1" ? `[::1]:${address.port}` : `127.0.0.1:${address.port}`;
    this.#origin = `http://${this.#hostHeader}`;
    return { version: 1, url: this.#origin, bootstrapUrl: `${this.#origin}/runs#${this.#bootstrapToken}`, assetManifestDigest: this.#assets.manifestDigest, status: "No active Fabric driver" };
  }

  async close(): Promise<void> {
    const server = this.#server; this.#server = undefined;
    for (const session of this.#sessions.values()) session.revoked = true;
    this.#sessionStreams.clear(); this.#activeStreams = 0;
    if (server) {
      server.closeAllConnections();
      await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    }
  }

  async #handle(request: IncomingMessage, response: ServerResponse): Promise<void> {
    securityHeaders(response);
    try {
      if (!this.#server || request.headers.host !== this.#hostHeader) throw new HttpError(400, "HOST_REJECTED", "Host header is not the bound loopback authority");
      if (!isLoopbackAddress(request.socket.remoteAddress)) throw new HttpError(403, "REMOTE_REJECTED", "Remote clients are prohibited");
      if ((request.url?.length ?? 0) > REQUEST_TARGET_LIMIT) throw new HttpError(414, "TARGET_LIMIT", "Request target is too long");
      const url = new URL(request.url ?? "/", this.#origin);
      if (url.origin !== this.#origin) throw new HttpError(400, "HOST_REJECTED", "Absolute request target is not the bound origin");
      const origin = request.headers.origin;
      if (origin !== undefined && origin !== this.#origin) throw new HttpError(403, "ORIGIN_REJECTED", "Origin is not the bound loopback origin");
      this.#rateLimit(request.socket.remoteAddress ?? "loopback");

      if ((request.method === "GET" || request.method === "HEAD") && UI_ROUTE.test(url.pathname)) { assertQuery(url, []); return this.#asset(response, this.#assets!.get("/")!, request.method === "HEAD", false); }
      if ((request.method === "GET" || request.method === "HEAD") && url.pathname.startsWith("/assets/")) { assertQuery(url, []); const asset = this.#assets!.get(url.pathname); if (!asset) throw new HttpError(404, "NOT_FOUND", "Asset not found"); return this.#asset(response, asset, request.method === "HEAD", true); }
      if (request.method === "POST" && url.pathname === "/api/v1/session/bootstrap") { assertQuery(url, []); return await this.#bootstrap(request, response); }

      const session = this.#session(request);
      if (!session) throw new HttpError(401, "UNAUTHENTICATED", "An authenticated local session is required");
      this.#rateLimit(session.sessionId);
      if ((request.method === "GET" || request.method === "HEAD") && url.pathname === "/api/v1/session") {
        assertQuery(url, []); const route = declaredRoute("GET", "/api/v1/session");
        return sendRouteJson(response, 200, route, "session.v1", { version: 1, authenticated: true, csrfToken: session.csrf, driverStatus: "No active Fabric driver", expiresAt: new Date(session.expiresAt).toISOString() }, request.method === "HEAD");
      }
      if (request.method === "DELETE" && url.pathname === "/api/v1/session") { assertQuery(url, []); return this.#revoke(request, response, session); }
      if ((request.method === "GET" || request.method === "HEAD") && url.pathname === "/api/v1/runs") {
        assertQuery(url, ["limit"]); const limit = integerParameter(url, "limit", 100, 1, 200); const route = declaredRoute("GET", "/api/v1/runs");
        return sendRouteJson(response, 200, route, "runList.v1", { version: 1, runs: await this.#authority.listRuns(limit) }, request.method === "HEAD");
      }
      if (request.method === "GET" && url.pathname === "/api/v1/stream") { assertQuery(url, ["runId", "cursor"]); return await this.#stream(request, response, url, session); }
      const artifact = /^\/api\/v1\/(artifacts|diffs)\/(art_[0-9a-f]{60})$/u.exec(url.pathname);
      if (artifact && (request.method === "GET" || request.method === "HEAD")) {
        assertQuery(url, ["offset", "limit", "runId", "effectId"]); const offset = integerParameter(url, "offset", 0, 0, Number.MAX_SAFE_INTEGER); const limit = integerParameter(url, "limit", PREVIEW_LIMIT, 1, PREVIEW_LIMIT); const runId = url.searchParams.get("runId"); const effectId = url.searchParams.get("effectId");
        if (!runId || !effectId) throw new HttpError(400, "VALIDATION_FAILED", "Artifact reads require runId and effectId capability bindings");
        const page = await this.#authority.readArtifact(artifact[2]!, offset, limit, { principalId: session.sessionId, runId, effectId });
        const isDiff = artifact[1] === "diffs"; const route = declaredRoute("GET", isDiff ? "/api/v1/diffs/:artifactId" : "/api/v1/artifacts/:artifactId"); const schema = isDiff ? "diffPage.v1" : "artifactPage.v1";
        return sendRouteJson(response, 200, route, schema, { ...page, kind: isDiff ? "diff" : "artifact" }, request.method === "HEAD");
      }
      const attempt = /^\/api\/v1\/runs\/([a-z][a-z0-9_]{2,63})\/attempts\/([a-z][a-z0-9_]{2,63})$/u.exec(url.pathname);
      if (attempt && (request.method === "GET" || request.method === "HEAD")) {
        assertQuery(url, []); const route = declaredRoute("GET", "/api/v1/runs/:runId/attempts/:attemptId");
        return sendRouteJson(response, 200, route, "attemptDetail.v1", await this.#authority.queryAttempt(attempt[1]!, attempt[2]!), request.method === "HEAD");
      }
      const match = /^\/api\/v1\/runs\/([a-z][a-z0-9_]{2,63})(?:\/(intents|tree|attempts|comparisons|metrics|events|resources|promotions|report|contract))?$/u.exec(url.pathname);
      if (match) {
        const runId = match[1]!; const suffix = match[2];
        if (request.method === "POST" && suffix === "intents") { assertQuery(url, []); return await this.#intent(request, response, runId, session); }
        if ((request.method === "GET" || request.method === "HEAD") && suffix === "events") {
          assertQuery(url, ["after", "limit"]); const cursor = integerParameter(url, "after", 0, 0, Number.MAX_SAFE_INTEGER); const limit = integerParameter(url, "limit", 200, 1, 200); const route = declaredRoute("GET", "/api/v1/runs/:runId/events");
          return sendRouteJson(response, 200, route, "eventBatch.v1", await this.#authority.readStreamBatch(runId, cursor, limit), request.method === "HEAD");
        }
        const views: Readonly<Record<string, { kind: ArborQueryV1["kind"]; route: string; schema: string }>> = {
          "": { kind: "overview", route: "/api/v1/runs/:runId", schema: "overview.v1" },
          tree: { kind: "tree", route: "/api/v1/runs/:runId/tree", schema: "tree.v1" },
          attempts: { kind: "attempts", route: "/api/v1/runs/:runId/attempts", schema: "attempts.v1" },
          comparisons: { kind: "compare", route: "/api/v1/runs/:runId/comparisons", schema: "comparisons.v1" },
          metrics: { kind: "metrics", route: "/api/v1/runs/:runId/metrics", schema: "metrics.v1" },
          resources: { kind: "resources", route: "/api/v1/runs/:runId/resources", schema: "resources.v1" },
          promotions: { kind: "promotion", route: "/api/v1/runs/:runId/promotions", schema: "promotions.v1" },
          report: { kind: "report", route: "/api/v1/runs/:runId/report", schema: "report.v1" },
          contract: { kind: "contract", route: "/api/v1/runs/:runId/contract", schema: "contract.v1" },
        };
        const view = views[suffix ?? ""];
        if (view && (request.method === "GET" || request.method === "HEAD")) {
          assertQuery(url, ["limit"]); const limit = integerParameter(url, "limit", 100, 1, 200); const route = declaredRoute("GET", view.route);
          return sendRouteJson(response, 200, route, view.schema, await this.#authority.query({ version: 1, kind: view.kind, runId, limit }), request.method === "HEAD");
        }
      }
      if (["POST", "PUT", "PATCH", "DELETE"].includes(request.method ?? "")) throw new HttpError(405, "METHOD_NOT_ALLOWED", "No mutation is available at this route");
      throw new HttpError(404, "NOT_FOUND", "Route not found");
    } catch (error) {
      if (response.headersSent) { response.end(); return; }
      const status = error instanceof HttpError ? error.status : error instanceof WebResponseSchemaError ? (error.code === "RESPONSE_LIMIT" ? 507 : 500) : error instanceof ArborError ? (error.code === "RUN_NOT_FOUND" || error.code === "UNKNOWN_ENTITY" ? 404 : 400) : 500;
      const code = error instanceof HttpError ? error.code : error instanceof WebResponseSchemaError ? error.code : error instanceof ArborError ? error.code : "INTERNAL_ERROR";
      const message = status >= 500 ? (status === 507 ? "Bounded response limit exceeded" : "Internal server failure") : redactText(error instanceof Error ? error.message : "Request failed").slice(0, 512);
      if (status === 405) response.setHeader("Allow", "GET, HEAD");
      sendErrorJson(response, status, { version: 1, error: code, message });
    }
  }

  #asset(response: ServerResponse, asset: ReleaseWebAssetV1, head: boolean, immutable: boolean): void {
    response.statusCode = 200;
    response.setHeader("Content-Type", asset.contentType);
    response.setHeader("Content-Length", asset.bytes);
    response.setHeader("ETag", `\"sha256-${asset.digest}\"`);
    response.setHeader("Cache-Control", immutable ? "public, max-age=31536000, immutable" : "no-store");
    response.end(head ? undefined : Buffer.from(asset.body));
  }

  async #bootstrap(request: IncomingMessage, response: ServerResponse): Promise<void> {
    this.#requireOrigin(request);
    if (this.#bootstrapUsed) throw new HttpError(409, "BOOTSTRAP_ALREADY_USED", "The one-time bootstrap was already exchanged");
    const body = await readJson(request); assertClosedObject(body, ["version", "token"]);
    if (body.version !== 1 || typeof body.token !== "string" || !TOKEN.test(body.token) || !safeEqual(body.token, this.#bootstrapToken)) throw new HttpError(400, "VALIDATION_FAILED", "Bootstrap token is invalid");
    // The second check closes the race between concurrent body reads. Only a
    // successfully validated exchange consumes the one-time fragment token.
    if (this.#bootstrapUsed) throw new HttpError(409, "BOOTSTRAP_ALREADY_USED", "The one-time bootstrap was already exchanged");
    this.#bootstrapUsed = true;
    const cookie = randomBytes(32).toString("base64url"); const csrf = randomBytes(24).toString("base64url"); const now = Date.now();
    const sessionId = `session_${randomBytes(12).toString("hex")}`;
    this.#sessions.set(sessionId, { sessionId, cookieDigest: sha256(cookie), csrf, revoked: false, createdAt: now, expiresAt: now + this.#sessionTtlMs });
    response.setHeader("Set-Cookie", `arbor_session=${sessionId}.${cookie}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${Math.floor(this.#sessionTtlMs / 1000)}`);
    const route = declaredRoute("POST", "/api/v1/session/bootstrap");
    sendRouteJson(response, 201, route, "session.v1", { version: 1, authenticated: true, csrfToken: csrf, driverStatus: "No active Fabric driver", expiresAt: new Date(now + this.#sessionTtlMs).toISOString() });
  }

  #session(request: IncomingMessage): SessionV1 | undefined {
    const cookies = request.headers.cookie?.split(/;\s*/u).filter((entry) => entry.startsWith("arbor_session=")) ?? [];
    if (cookies.length !== 1) return undefined;
    const cookie = cookies[0]!.slice("arbor_session=".length); const separator = cookie.indexOf(".");
    if (separator < 1) return undefined;
    const session = this.#sessions.get(cookie.slice(0, separator));
    if (!session || session.revoked || session.expiresAt <= Date.now() || !safeEqual(session.cookieDigest, sha256(cookie.slice(separator + 1)))) return undefined;
    return session;
  }

  #revoke(request: IncomingMessage, response: ServerResponse, session: SessionV1): void {
    this.#requireMutationGuards(request, session); session.revoked = true;
    response.setHeader("Set-Cookie", "arbor_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0");
    const route = declaredRoute("DELETE", "/api/v1/session");
    sendRouteJson(response, 200, route, "sessionRevocation.v1", { version: 1, revoked: true });
  }

  async #intent(request: IncomingMessage, response: ServerResponse, runId: string, session: SessionV1): Promise<void> {
    this.#requireMutationGuards(request, session);
    const value = await readJson(request); assertClosedObject(value, ["version", "kind", "expectedRevision"], ["reason", "answer", "hypothesisId", "attemptId", "candidateId", "promotionId"]);
    const suppliedKey = request.headers["idempotency-key"];
    if (typeof suppliedKey !== "string" || !IDEMPOTENCY.test(suppliedKey)) throw new HttpError(400, "VALIDATION_FAILED", "A bounded Idempotency-Key header is required");
    const receipt = await this.#authority.submitIntent(value as unknown as WebIntentV1, { version: 1, sessionId: session.sessionId, runId, idempotencyKey: suppliedKey, csrfValidated: true, originValidated: true });
    const route = declaredRoute("POST", "/api/v1/runs/:runId/intents");
    sendRouteJson(response, 202, route, "intentReceipt.v1", receipt);
  }

  async #stream(request: IncomingMessage, response: ServerResponse, url: URL, session: SessionV1): Promise<void> {
    const runId = url.searchParams.get("runId") ?? ""; if (!ID.test(runId)) throw new HttpError(400, "VALIDATION_FAILED", "Invalid stream run ID");
    const queryCursor = url.searchParams.get("cursor"); const headerCursor = request.headers["last-event-id"];
    // Native EventSource reconnects retain the original cursor query and add
    // Last-Event-ID. The durable header must win on reconnect rather than
    // turning a valid browser reconnect into a validation failure.
    const rawCursor = typeof headerCursor === "string" ? headerCursor : (queryCursor ?? "0");
    if (!INTEGER.test(rawCursor)) throw new HttpError(400, "VALIDATION_FAILED", "Invalid stream cursor");
    let cursor = Number(rawCursor); if (!Number.isSafeInteger(cursor)) throw new HttpError(400, "VALIDATION_FAILED", "Invalid stream cursor");
    const route = declaredRoute("GET", "/api/v1/stream");
    serializeWebRouteResponseV1(route, "sseStream.v1", { version: 1, contentType: "text/event-stream", events: ["arbor-event", "reset", "caught-up", "stream-limit", "arbor-error"] });
    let encoded = this.#encodeBatch(await this.#authority.readStreamBatch(runId, cursor, 1), route.maxResponseBytes);
    const sessionCount = this.#sessionStreams.get(session.sessionId) ?? 0;
    if (this.#activeStreams >= this.#maxStreams || sessionCount >= this.#maxStreamsPerSession) throw new HttpError(429, "STREAM_LIMIT", "Concurrent stream limit reached");
    this.#activeStreams += 1; this.#sessionStreams.set(session.sessionId, sessionCount + 1);
    response.statusCode = 200; response.setHeader("Content-Type", "text/event-stream; charset=utf-8"); response.setHeader("Connection", "keep-alive"); response.setHeader("X-Accel-Buffering", "no"); response.flushHeaders();
    let closed = false; let released = false; const startedAt = Date.now();
    const releaseStream = (): void => {
      closed = true;
      if (released) return;
      released = true;
      this.#activeStreams = Math.max(0, this.#activeStreams - 1);
      const remaining = (this.#sessionStreams.get(session.sessionId) ?? 1) - 1;
      if (remaining > 0) this.#sessionStreams.set(session.sessionId, remaining); else this.#sessionStreams.delete(session.sessionId);
    };
    response.once("close", releaseStream);
    request.once("aborted", releaseStream);
    try {
      while (!closed && this.#server && Date.now() - startedAt < this.#maxStreamMs) {
        for (const chunk of encoded.chunks) await this.#write(response, chunk);
        cursor = encoded.cursor;
        if (!closed) await new Promise((resolve) => setTimeout(resolve, this.#pollIntervalMs));
        if (!closed) encoded = this.#encodeBatch(await this.#authority.readStreamBatch(runId, cursor, 1), route.maxResponseBytes);
      }
      if (!closed) await this.#write(response, this.#sseChunk("stream-limit", { version: 1, runId, cursor, reconnect: true }, route.maxResponseBytes));
    } catch (error) {
      if (!closed) {
        const code = error instanceof WebResponseSchemaError ? error.code : "INTERNAL_ERROR";
        const value = { version: 1, runId, cursor, error: code, message: "Durable stream closed because a response failed validation", reconnect: false };
        try { await this.#write(response, this.#sseChunk("arbor-error", value, route.maxResponseBytes)); } catch { /* The connection is already unusable. */ }
      }
    } finally {
      releaseStream();
      response.end();
    }
  }

  #encodeBatch(batch: DetachedStreamBatchV1, maximumBytes: number): { chunks: string[]; cursor: number } {
    if (batch.kind === "reset") return { chunks: [this.#sseChunk("reset", batch, maximumBytes, batch.cursor)], cursor: batch.cursor };
    const chunks = batch.page.events.map((event) => this.#sseChunk("arbor-event", { version: 1, event, projection: batch.projection }, maximumBytes, event.sequence));
    if (chunks.length === 0) chunks.push(this.#sseChunk("caught-up", { version: 1, runId: batch.runId, cursor: batch.cursor, projection: batch.projection }, maximumBytes));
    return { chunks, cursor: batch.cursor };
  }

  #sseChunk(eventName: string, value: unknown, maximumBytes: number, eventId?: number): string {
    const body = serializeWebSseEventV1(eventName, value, maximumBytes);
    return `${eventId === undefined ? "" : `id: ${eventId}\n`}event: ${eventName}\ndata: ${body}\n\n`;
  }

  async #write(response: ServerResponse, body: string): Promise<void> {
    if (!response.write(body)) {
      await new Promise<void>((resolve) => {
        const settled = () => { response.off("drain", settled); response.off("close", settled); response.off("error", settled); resolve(); };
        response.once("drain", settled); response.once("close", settled); response.once("error", settled);
      });
    }
  }

  #requireOrigin(request: IncomingMessage): void {
    if (request.headers.origin !== this.#origin) throw new HttpError(403, "ORIGIN_REJECTED", "Origin is not the bound loopback origin");
  }

  #requireMutationGuards(request: IncomingMessage, session: SessionV1): void {
    this.#requireOrigin(request);
    if (request.headers["x-arbor-csrf"] !== session.csrf) throw new HttpError(403, "CSRF_REJECTED", "CSRF token is invalid");
  }

  #rateLimit(key: string): void {
    const now = Date.now(); const current = this.#rates.get(key);
    if (!current || now - current.startedAt >= 60_000) { this.#rates.set(key, { startedAt: now, count: 1 }); return; }
    current.count += 1;
    if (current.count > this.#maxRequestsPerMinute) throw new HttpError(429, "RATE_LIMIT", "Request rate limit exceeded");
    if (this.#rates.size > 4096) for (const [entryKey, value] of this.#rates) if (now - value.startedAt >= 60_000) this.#rates.delete(entryKey);
  }
}
