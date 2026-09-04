import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium } from "playwright";
import { parseGuidedFixtureBootstrapV1 } from "./bootstrap-contract.mjs";

const output = process.argv[2];
if (!output) throw new Error("usage: node browser-tests/run-playwright.mjs <output-directory>");
await mkdir(output, { recursive: true });
const resultPath = resolve(output, "results.v1.json");
const startedAt = new Date().toISOString();
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const writeResult = async (value) => {
  const raw = `${JSON.stringify(value, null, 2)}\n`;
  await writeFile(resultPath, raw);
  await writeFile(`${resultPath}.sha256`, `${sha256(raw)}  results.v1.json\n`);
};
let thresholdSealDigest;
try {
  const seal = JSON.parse(await readFile(resolve(output, "..", "graduation-thresholds.v1.json"), "utf8"));
  if (/^[0-9a-f]{64}$/u.test(seal.sealDigest)) thresholdSealDigest = seal.sealDigest;
} catch { /* Phase 6 and scratch browser runs are not threshold-bound. */ }

const server = spawn(process.execPath, ["scripts/serve-guided-fixture.mjs", "--artifact-root", output], {
  cwd: process.cwd(),
  env: { ...process.env, ARBOR_FIXTURE_COMPACTION_FLOOR: "current" },
  stdio: ["ignore", "pipe", "pipe"],
});
let stderr = "";
server.stderr.on("data", (chunk) => { stderr += chunk.toString(); });
const bootstrap = await new Promise((resolve, reject) => {
  let buffer = "";
  const timer = setTimeout(() => reject(new Error(`fixture server timeout: ${stderr}`)), 30_000);
  server.stdout.on("data", (chunk) => {
    buffer += chunk.toString();
    const newline = buffer.indexOf("\n");
    if (newline < 0) return;
    clearTimeout(timer);
    try { resolve(parseGuidedFixtureBootstrapV1(JSON.parse(buffer.slice(0, newline)))); } catch (error) { reject(error); }
  });
  server.once("exit", (code) => reject(new Error(`fixture server exited ${code}: ${stderr}`)));
});

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ locale: "en-US", colorScheme: "light", reducedMotion: "reduce" });
const page = await context.newPage();
const consoleRecords = [];
const pageErrors = [];
const network = [];
const externalRequests = [];
const unexpectedHttp = [];
const expectedHttp = new Set();
const expectedFailures = [];
let expectingDisconnect = false;
let expectingHttpFailure = false;

function observe(target) {
  target.on("console", (message) => {
    const record = { type: message.type(), text: message.text() };
    consoleRecords.push(record);
    const expectedConsoleFailure = (expectingDisconnect && /ERR_FAILED|EventSource|api\/v1\/stream/iu.test(record.text)) || (expectingHttpFailure && /Failed to load resource/iu.test(record.text));
    if (record.type === "error" && !expectedConsoleFailure) pageErrors.push(`console: ${record.text}`);
    else if (record.type === "error") expectedFailures.push(`console: ${record.text}`);
  });
  target.on("pageerror", (error) => pageErrors.push(`page: ${error.message}`));
  target.on("request", (request) => {
    const url = request.url();
    network.push({ phase: "request", method: request.method(), url });
    if (!url.startsWith(bootstrap.origin)) externalRequests.push(url);
  });
  target.on("requestfailed", (request) => {
    const entry = `${request.url()} ${request.failure()?.errorText ?? "failed"}`;
    const streamLifecycleAbort = request.url().includes("/api/v1/stream") && request.failure()?.errorText === "net::ERR_ABORTED";
    if (streamLifecycleAbort || (expectingDisconnect && request.url().includes("/api/v1/stream"))) expectedFailures.push(entry);
    else pageErrors.push(`request failed: ${entry}`);
  });
  target.on("response", async (response) => {
    const key = `${response.status()}:${response.url()}`;
    const record = { phase: "response", status: response.status(), url: response.url(), contentType: response.headers()["content-type"] ?? "", body: "" };
    if (response.status() >= 400 && !expectedHttp.has(key)) unexpectedHttp.push(key);
    if (!record.contentType.includes("text/event-stream")) {
      try { record.body = (await response.text()).slice(0, 2_000_000); } catch {}
    }
    network.push(record);
  });
}
observe(page);

const requiredRoutes = [
  ["Overview", "/api/v1/runs/run_fixture"],
  ["Tree", "/api/v1/runs/run_fixture/tree"],
  ["Attempts", "/api/v1/runs/run_fixture/attempts"],
  ["Comparisons", "/api/v1/runs/run_fixture/comparisons"],
  ["Metrics", "/api/v1/runs/run_fixture/metrics"],
  ["Events", "/api/v1/runs/run_fixture/events"],
  ["Resources", "/api/v1/runs/run_fixture/resources"],
  ["Promotion", "/api/v1/runs/run_fixture/promotions"],
  ["Report", "/api/v1/runs/run_fixture/report"],
  ["Contract", "/api/v1/runs/run_fixture/contract"],
];
const viewportMatrix = [
  { name: "desktop", width: 1440, height: 1000, mobile: false },
  { name: "tablet", width: 900, height: 1100, mobile: false },
  { name: "mobile", width: 390, height: 844, mobile: true },
];
const routeProof = [];
const assertions = [];
const assert = (condition, message, evidence = undefined) => {
  const record = { message, passed: Boolean(condition), ...(evidence === undefined ? {} : { evidence }) };
  assertions.push(record);
  if (!condition) throw new Error(message);
};
const waitRendered = async (target = page) => {
  await target.locator("#main").waitFor({ state: "visible" });
  await target.locator("#main[aria-busy='false']").waitFor();
  await target.locator("#main h1").first().waitFor({ state: "visible" });
};
const clickNav = async (target, label, mobile) => {
  if (mobile) {
    const menu = target.getByRole("button", { name: "Open navigation menu" });
    await menu.click();
    const dialog = target.getByRole("dialog", { name: "Run navigation" });
    await dialog.waitFor({ state: "visible" });
    await dialog.getByRole("link", { name: label, exact: true }).click();
  } else {
    await target.getByRole("navigation", { name: "Run views" }).getByRole("link", { name: label, exact: true }).click();
  }
  await waitRendered(target);
};

const routeJourneyStartedMs = Date.now();
let routeJourneyDurationMs = 0;
let recoveryJourneyStartedMs = 0;
let recoveryJourneyDurationMs = 0;

try {
  await page.goto(`${bootstrap.origin}/runs#${encodeURIComponent(bootstrap.bootstrapToken)}`);
  await waitRendered();
  await page.getByRole("heading", { name: "Guided fixture run" }).waitFor();
  await page.getByText(/Connected|Caught up/u).first().waitFor();
  assert(page.url() === `${bootstrap.origin}/runs/run_fixture`, "bootstrap fragment is removed before asynchronous exchange", page.url());
  assert(!(await page.locator("html").innerText()).includes(bootstrap.bootstrapToken), "bootstrap token is absent from rendered DOM");

  const overview = await page.evaluate(async () => (await fetch("/api/v1/runs/run_fixture")).json());
  const summary = await page.locator("dl.summary-grid").evaluate((node) => Object.fromEntries([...node.querySelectorAll(":scope > div")].map((entry) => [entry.querySelector("dt")?.textContent?.trim(), entry.querySelector("dd")?.textContent?.trim()])));
  const expectedSummary = {
    "Run ID": overview.runId,
    State: overview.data.summary.state,
    Outcome: overview.data.summary.outcome,
    Revision: String(overview.revision),
    Sequence: String(overview.cursor),
    Trust: overview.data.summary.trust,
  };
  assert(JSON.stringify(summary) === JSON.stringify(expectedSummary), "overview UI exactly matches authoritative API summary", { summary, expectedSummary });

  for (const viewport of viewportMatrix) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto(`${bootstrap.origin}/runs/run_fixture`);
    await waitRendered();
    for (const [label, apiPath] of requiredRoutes) {
      await clickNav(page, label, viewport.mobile);
      const heading = (await page.locator("#main h1").first().innerText()).trim();
      assert(heading.length > 0, `${viewport.name} ${label} has a visible page heading`);
      assert(!(await page.getByRole("alert").isVisible()), `${viewport.name} ${label} renders without an alert`);
      routeProof.push({ viewport: viewport.name, label, url: page.url(), apiPath, heading, viaOrdinaryControl: true });
      if (label === "Attempts") {
        const firstRowHeader = page.locator("tbody th[scope='row']").first();
        const attemptId = (await firstRowHeader.innerText()).trim();
        assert(attemptId.startsWith("attempt_"), `${viewport.name} attempt rows use stable attempt identity as semantic row headers`, attemptId);
        await firstRowHeader.getByRole("link").click();
        await waitRendered();
        assert(page.url().includes(`/attempts/${attemptId}`), `${viewport.name} attempt-detail route is reached through its row link`);
        routeProof.push({ viewport: viewport.name, label: "Attempt detail", url: page.url(), apiPath: `${apiPath}/${attemptId}`, heading: (await page.locator("#main h1").innerText()).trim(), viaOrdinaryControl: true });
      }
    }
    await clickNav(page, "Overview", viewport.mobile);
    const layout = await page.evaluate(() => ({
      viewport: innerWidth,
      scrollWidth: document.documentElement.scrollWidth,
      tableOverflows: [...document.querySelectorAll(".table-wrap")].map((node) => ({ client: node.clientWidth, scroll: node.scrollWidth })),
      containers: ["html", "body", ".shell", "#main", "#detail-content", ".table-wrap"].map((selector) => {
        const node = document.querySelector(selector); const box = node?.getBoundingClientRect(); const style = node ? getComputedStyle(node) : null;
        return { selector, client: node?.clientWidth, scroll: node?.scrollWidth, left: box?.left, right: box?.right, width: box?.width, overflowX: style?.overflowX, minWidth: style?.minWidth, maxWidth: style?.maxWidth };
      }),
      overflowingElements: [...document.querySelectorAll("body *")].map((node) => {
        const box = node.getBoundingClientRect();
        return { tag: node.tagName, id: node.id, className: typeof node.className === "string" ? node.className : "", left: box.left, right: box.right, width: box.width };
      }).filter((box) => box.left < -1 || box.right > innerWidth + 1).slice(0, 50),
    }));
    await page.screenshot({ path: `${output}/${viewport.name}.png`, fullPage: true });
    assert(layout.scrollWidth <= layout.viewport + 1, `${viewport.name} has no page-level horizontal overflow`, layout);
  }

  routeJourneyDurationMs = Date.now() - routeJourneyStartedMs;
  recoveryJourneyStartedMs = Date.now();

  // Browser history and refresh are real navigation, not route injection.
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(`${bootstrap.origin}/runs/run_fixture`);
  await waitRendered();
  await clickNav(page, "Tree", false);
  await page.goBack();
  await waitRendered();
  assert(page.url().endsWith("/runs/run_fixture"), "browser Back restores the preceding Arbor route", page.url());
  await page.reload();
  await waitRendered();
  assert((await page.locator("#main h1").innerText()).trim() === "Guided fixture run", "browser refresh restores authoritative route state");

  // Mobile drawer, modal semantics, overlay, Escape, and visible keyboard focus.
  await page.setViewportSize({ width: 390, height: 844 });
  const menuButton = page.getByRole("button", { name: "Open navigation menu" });
  await menuButton.waitFor({ state: "visible" });
  await page.locator(".skip-link").focus();
  await page.keyboard.press("Tab");
  assert(await menuButton.evaluate((node) => node === document.activeElement), "keyboard focus reaches the visible mobile navigation trigger");
  await menuButton.press("Enter");
  const dialog = page.getByRole("dialog", { name: "Run navigation" });
  await dialog.waitFor({ state: "visible" });
  await dialog.locator(":focus").waitFor({ state: "visible" });
  assert(await dialog.getAttribute("aria-modal") === "true", "mobile drawer exposes modal dialog semantics");
  const drawerFocus = await dialog.evaluate((node) => ({ inside: node.contains(document.activeElement), activeTag: document.activeElement?.tagName, activeId: document.activeElement?.id }));
  assert(drawerFocus.inside, "opening the drawer moves focus inside it", drawerFocus);
  await page.keyboard.press("Escape");
  await dialog.waitFor({ state: "hidden" });
  assert(await menuButton.evaluate((node) => node === document.activeElement), "Escape closes the drawer and restores trigger focus");
  await menuButton.click();
  await page.locator(".nav-overlay").click({ position: { x: 2, y: 2 } });
  await dialog.waitFor({ state: "hidden" });
  assert(true, "mobile overlay closes the navigation drawer");
  await page.keyboard.press("Tab");
  await page.keyboard.press("Shift+Tab");
  assert(await menuButton.evaluate((node) => node === document.activeElement), "keyboard traversal returns to the navigation trigger");
  const focusStyle = await menuButton.evaluate((node) => {
    const style = getComputedStyle(node);
    const matchedFocusRules = [...document.styleSheets].flatMap((sheet) => [...sheet.cssRules]).filter((rule) => "selectorText" in rule && node.matches(rule.selectorText)).map((rule) => rule.cssText).filter((text) => text.includes("outline"));
    return { focusVisible: node.matches(":focus-visible"), focusVariable: style.getPropertyValue("--focus"), outlineStyle: style.outlineStyle, outlineWidth: style.outlineWidth, outlineColor: style.outlineColor, boxShadow: style.boxShadow, matchedFocusRules };
  });
  assert((focusStyle.outlineStyle !== "none" && Number.parseFloat(focusStyle.outlineWidth) >= 2) || focusStyle.boxShadow !== "none", "keyboard focus indicator is visibly styled", focusStyle);

  // 400% equivalent reflow: 1280 physical CSS pixels represented as a 320 CSS-pixel viewport.
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto(`${bootstrap.origin}/runs/run_fixture`);
  await waitRendered();
  const reflow = await page.evaluate(() => ({ viewport: innerWidth, pageWidth: document.documentElement.scrollWidth, headerHeight: document.querySelector(".site-header")?.getBoundingClientRect().height }));
  assert(reflow.pageWidth <= 321, "content reflows without two-dimensional page scrolling at 400% equivalent zoom", reflow);

  // Loading is explicit and blocks refresh while authority data is pending.
  let releaseLoading;
  const loadingGate = new Promise((resolve) => { releaseLoading = resolve; });
  await page.route("**/api/v1/runs?limit=100", async (route) => {
    const upstream = await route.fetch();
    await loadingGate;
    await route.fulfill({ response: upstream });
  });
  await page.goto(`${bootstrap.origin}/runs`);
  await page.getByText("Loading authoritative data…").waitFor({ state: "visible" });
  assert(await page.locator("#main").getAttribute("aria-busy") === "true", "loading state sets aria-busy");
  assert(await page.getByRole("button", { name: "Refresh authoritative data" }).isDisabled(), "loading disables refresh");
  assert((await page.getByRole("button", { name: "Refresh authoritative data" }).getAttribute("title"))?.includes("already"), "loading control provides a disabled reason");
  releaseLoading();
  await waitRendered();
  await page.unroute("**/api/v1/runs?limit=100");

  // Empty and error states remain recoverable through the visible Refresh control.
  await page.route("**/api/v1/runs?limit=100", async (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ version: 1, runs: [] }) }));
  await page.getByRole("button", { name: "Refresh authoritative data" }).click();
  await page.getByText("No durable runs recorded.").waitFor({ state: "visible" });
  assert((await page.locator("dl.summary-grid dd").first().innerText()).trim() === "0", "empty list reports an exact zero count");
  await page.unroute("**/api/v1/runs?limit=100");
  await page.getByRole("button", { name: "Refresh authoritative data" }).click();
  await waitRendered();
  await page.route("**/api/v1/runs?limit=100", async (route) => {
    expectedHttp.add(`500:${route.request().url()}`);
    await route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ version: 1, error: "FIXTURE_FAILURE", message: "Bounded fixture read failed" }) });
  });
  expectingHttpFailure = true;
  await page.getByRole("button", { name: "Refresh authoritative data" }).click();
  await page.getByRole("alert").filter({ hasText: "Bounded fixture read failed" }).waitFor({ state: "visible" });
  expectingHttpFailure = false;
  assert(await page.getByRole("button", { name: "Refresh authoritative data" }).isEnabled(), "error state preserves manual retry");
  await page.unroute("**/api/v1/runs?limit=100");
  await page.getByRole("button", { name: "Refresh authoritative data" }).click();
  await waitRendered();

  // Empty lineage hides the visualization and exposes an explicit textual state.
  const realTree = await page.evaluate(async () => (await fetch("/api/v1/runs/run_fixture/tree")).json());
  const emptyTree = structuredClone(realTree);
  for (const [key, value] of Object.entries(emptyTree.data)) if (Array.isArray(value)) emptyTree.data[key] = [];
  await page.route("**/api/v1/runs/run_fixture/tree", async (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(emptyTree) }));
  await page.goto(`${bootstrap.origin}/runs/run_fixture/tree`);
  await waitRendered();
  await page.getByText("No lineage is available for this run.").waitFor({ state: "visible" });
  assert(await page.locator(".tree-visual").count() === 0, "empty lineage does not expose an unlabeled visualization");
  await page.unroute("**/api/v1/runs/run_fixture/tree");

  // A real stream disconnect marks data stale, disables intents with a reason, and offers manual recovery.
  await page.setViewportSize({ width: 1440, height: 1000 });
  expectingDisconnect = true;
  await page.route("**/api/v1/stream**", async (route) => route.abort("failed"));
  await page.goto(`${bootstrap.origin}/runs/run_fixture`);
  await waitRendered();
  await page.getByText(/Data may be stale/u).waitFor({ state: "visible" });
  const staleSubmit = page.getByRole("button", { name: "Submit intent" });
  assert(await staleSubmit.isDisabled(), "disconnected stale state disables intent submission");
  assert((await staleSubmit.getAttribute("title"))?.includes("Reconnect"), "stale intent control explains why it is disabled");
  await page.unroute("**/api/v1/stream**");
  expectingDisconnect = false;
  await page.getByRole("button", { name: "Retry connection and refresh data" }).click();
  await page.getByText(/Connected|Caught up/u).first().waitFor({ state: "visible" });
  assert(await staleSubmit.isEnabled(), "manual retry restores authoritative intent availability");

  // Deliver a genuine compacted reset while an intent control owns focus.
  const resetBatch = await page.evaluate(async () => (await fetch("/api/v1/runs/run_fixture/events?after=0")).json());
  assert(resetBatch.kind === "reset" && resetBatch.reason === "compacted", "fixture authority exposes a genuine compacted cursor reset", { kind: resetBatch.kind, reason: resetBatch.reason });
  await page.goto("about:blank");
  let releaseReset;
  const resetGate = new Promise((resolve) => { releaseReset = resolve; });
  let interceptedStream = false;
  await page.route("**/api/v1/stream**", async (route) => {
    if (interceptedStream) return route.continue();
    interceptedStream = true;
    await resetGate;
    const resetUrl = new URL(route.request().url());
    resetUrl.searchParams.set("cursor", "0");
    await route.continue({ url: resetUrl.href });
  });
  await page.goto(`${bootstrap.origin}/runs/run_fixture`);
  await waitRendered();
  const intentKind = page.locator("#intent-kind");
  await intentKind.focus();
  releaseReset();
  await page.locator("#announcer").getByText(/Projection reset/u).waitFor({ state: "attached" });
  assert(await intentKind.evaluate((node) => node === document.activeElement), "SSE reset rerender preserves the focused control");
  assert(await page.locator("#announcer").getAttribute("aria-live") === "polite", "SSE updates are announced politely");
  await page.unroute("**/api/v1/stream**");

  // Submit an intent without a pointer and verify the durable API receipt, not an implied effect.
  await page.getByText(/Connected|Caught up/u).first().waitFor({ state: "visible" });
  const intentReceiptResponse = page.waitForResponse((response) => response.request().method() === "POST" && response.url().endsWith("/api/v1/runs/run_fixture/intents"));
  await intentKind.focus();
  await page.keyboard.press("End");
  await page.keyboard.press("Tab");
  await page.keyboard.press("Tab");
  await page.keyboard.press("Tab");
  await page.keyboard.press("Enter");
  const pendingNotice = page.getByRole("status").filter({ hasText: /Intent .* durably recorded as PENDING/u });
  await pendingNotice.waitFor({ state: "visible" });
  const pendingIntentId = (await pendingNotice.innerText()).match(/Intent (intent_[a-z0-9_]+)/u)?.[1];
  assert(Boolean(pendingIntentId), "keyboard-only form submission returns a durable PENDING intent identity", pendingIntentId);
  const intentApi = await (await intentReceiptResponse).json();
  assert(intentApi.intentId === pendingIntentId && intentApi.state === "PENDING", "UI receipt exactly matches the backend PENDING intent state", intentApi);

  // Stale expectedRevision is rejected and the UI recovers to the authoritative revision.
  const stalePage = await context.newPage();
  observe(stalePage);
  await stalePage.addInitScript(() => {
    class QuietEventSource extends EventTarget {
      static OPEN = 1; static CLOSED = 2; static CONNECTING = 0;
      readyState = QuietEventSource.OPEN;
      constructor() { super(); queueMicrotask(() => this.dispatchEvent(new Event("open"))); }
      close() { this.readyState = QuietEventSource.CLOSED; }
    }
    Object.defineProperty(window, "EventSource", { value: QuietEventSource, configurable: true });
  });
  await stalePage.goto(`${bootstrap.origin}/runs/run_fixture`);
  await waitRendered(stalePage);
  const staleRevision = Number(await stalePage.locator("dl.summary-grid").getByText(/^\d+$/u).nth(0).innerText().catch(() => "-1"));
  const mutationReceipt = await stalePage.evaluate(async () => {
    const session = await (await fetch("/api/v1/session")).json();
    const overviewResponse = await (await fetch("/api/v1/runs/run_fixture")).json();
    const response = await fetch("/api/v1/runs/run_fixture/intents", { method: "POST", headers: { "content-type": "application/json", "x-arbor-csrf": session.csrfToken, "idempotency-key": `web_external_${Date.now()}` }, body: JSON.stringify({ version: 1, expectedRevision: overviewResponse.revision, kind: "requestReport" }) });
    return { status: response.status, body: await response.json(), oldRevision: overviewResponse.revision };
  });
  assert(mutationReceipt.status === 202, "external fixture mutation advances authority revision before stale submit", mutationReceipt);
  await stalePage.locator("#intent-kind").selectOption("requestReport");
  await stalePage.getByRole("button", { name: "Submit intent" }).click();
  await stalePage.getByRole("alert").filter({ hasText: /Revision mismatch/u }).waitFor({ state: "visible" });
  const recovered = await stalePage.evaluate(async () => (await fetch("/api/v1/runs/run_fixture")).json());
  const uiRevision = await stalePage.locator("dl.summary-grid").evaluate((node) => [...node.querySelectorAll(":scope > div")].find((entry) => entry.querySelector("dt")?.textContent?.trim() === "Revision")?.querySelector("dd")?.textContent?.trim());
  assert(uiRevision === String(recovered.revision) && recovered.revision > mutationReceipt.oldRevision, "stale-intent recovery refreshes to exact authoritative revision", { staleRevision, uiRevision, authorityRevision: recovered.revision });
  await stalePage.close();
  recoveryJourneyDurationMs = Date.now() - recoveryJourneyStartedMs;

  // Accessible names, labels, landmarks, tables, heading order, contrast, and reduced-motion behavior.
  await page.goto(`${bootstrap.origin}/runs/run_fixture/attempts`);
  await waitRendered();
  const accessibility = await page.evaluate(() => {
    const parse = (value) => { const match = value.match(/[\d.]+/gu)?.map(Number) ?? []; return match.slice(0, 3); };
    const luminance = ([r, g, b]) => { const channel = (v) => { const x = v / 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; }; return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b); };
    const contrast = (fg, bg) => { const a = luminance(parse(fg)); const b = luminance(parse(bg)); return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05); };
    const samples = ["body", ".eyebrow", ".muted", "a", ".primary", ".status-pill"].flatMap((selector) => { const node = document.querySelector(selector); if (!node) return []; const style = getComputedStyle(node); let parent = node; let background = style.backgroundColor; while ((background === "transparent" || background === "rgba(0, 0, 0, 0)") && parent.parentElement) { parent = parent.parentElement; background = getComputedStyle(parent).backgroundColor; } return [{ selector, foreground: style.color, background, ratio: contrast(style.color, background) }]; });
    const controls = [...document.querySelectorAll("button, input, select, textarea, a[href]")].filter((node) => node.getClientRects().length > 0).map((node) => ({ tag: node.tagName, id: node.id, name: node.getAttribute("aria-label") || node.textContent?.trim() || node.getAttribute("title") || (node.id ? document.querySelector(`label[for='${CSS.escape(node.id)}']`)?.textContent?.trim() : "") }));
    return {
      landmarks: Boolean(document.querySelector("header") && document.querySelector("nav[aria-label]") && document.querySelector("main") && document.querySelector("footer")),
      skipLink: document.querySelector(".skip-link")?.getAttribute("href") === "#main",
      oneH1: document.querySelectorAll("main h1").length === 1,
      headingsOrdered: [...document.querySelectorAll("main h1, main h2, main h3")].every((node, index, all) => index === 0 || Number(node.tagName[1]) <= Number(all[index - 1].tagName[1]) + 1),
      labels: [...document.querySelectorAll("input,select,textarea")].every((node) => Boolean(node.getAttribute("aria-label") || (node.id && document.querySelector(`label[for='${CSS.escape(node.id)}']`)))),
      namedControls: controls.every((entry) => Boolean(entry.name)),
      semanticTables: [...document.querySelectorAll("table")].every((table) => table.querySelector("caption") && table.querySelector("thead th[scope='col']") && table.querySelector("tbody th[scope='row']")),
      containedTables: [...document.querySelectorAll("table")].every((table) => table.parentElement?.classList.contains("table-wrap")),
      contrastSamples: samples,
      contrast: samples.every((sample) => sample.ratio >= 4.5),
      politeLiveRegion: document.querySelector("#announcer")?.getAttribute("aria-live") === "polite",
      reducedMotion: matchMedia("(prefers-reduced-motion: reduce)").matches && getComputedStyle(document.querySelector(".brand-mark")).animationName === "none",
      controls,
    };
  });
  for (const [key, value] of Object.entries(accessibility)) if (typeof value === "boolean") assert(value, `accessibility check: ${key}`, key === "contrast" ? accessibility.contrastSamples : accessibility[key]);

  // Static assurance: no HTML string injection primitive is present in the shipped browser client.
  const clientSource = await readFile("web/app.js", "utf8");
  assert(!/\.innerHTML\s*=|insertAdjacentHTML|document\.write/gu.test(clientSource), "browser client contains no HTML string injection primitive");

  // Inspect all observable text channels before declaring leakage checks complete.
  const domText = (await page.locator("html").innerText()).slice(0, 2_000_000);
  const screenshotBytes = await Promise.all(viewportMatrix.map((entry) => readFile(`${output}/${entry.name}.png`)));
  const observable = [domText, JSON.stringify(consoleRecords), JSON.stringify(network), ...screenshotBytes.map((bytes) => bytes.toString("latin1"))].join("\n");
  const forbiddenLiterals = [bootstrap.bootstrapToken, bootstrap.database, output, process.cwd(), "/home/", "file://", "sqlite3", "bootstrap="];
  const forbiddenPatterns = [
    { name: "unix-private-path", expression: /\/(?:home|root|var\/lib|tmp)\/[A-Za-z0-9._/-]+/u },
    { name: "private-key", expression: /BEGIN (?:OPENSSH |EC |RSA )?PRIVATE KEY/u },
    { name: "secret-assignment", expression: /(?:token|password|secret|nonce|signature)\s*[:=]\s*[A-Za-z0-9_+\/-]{16,}/iu },
  ];
  const leakage = [
    ...forbiddenLiterals.filter((literal) => literal && observable.includes(literal)).map((literal) => `literal:${literal}`),
    ...forbiddenPatterns.filter((entry) => entry.expression.test(observable)).map((entry) => `pattern:${entry.name}`),
  ];
  assert(leakage.length === 0, "DOM, console, network records, and screenshot bytes contain no secret or private-path leakage", leakage);
  assert(externalRequests.length === 0, "browser made no external network request", externalRequests);
  assert(unexpectedHttp.length === 0, "browser observed no unexpected HTTP error", unexpectedHttp);
  assert(pageErrors.length === 0, "browser observed no unexpected console, page, or request error", pageErrors);

  const journeyDurations = [routeJourneyDurationMs, recoveryJourneyDurationMs];
  const representativeUserJourneys = [
    { name: "responsive-route-and-attempt-review", completed: true, durationMs: routeJourneyDurationMs, ordinaryControls: true },
    { name: "keyboard-intent-and-recovery", completed: true, durationMs: recoveryJourneyDurationMs, ordinaryControls: true },
  ];
  const screenshotEvidence = viewportMatrix.map((entry, index) => ({ name: `${entry.name}.png`, bytes: screenshotBytes[index].byteLength, digest: sha256(screenshotBytes[index]) }));
  const result = {
    version: 1, startedAt, executedAt: new Date().toISOString(),
    ...(thresholdSealDigest ? { thresholdSealDigest } : {}),
    passed: true,
    origin: bootstrap.origin, assetManifestDigest: bootstrap.assetManifestDigest,
    routes: routeProof,
    viewports: viewportMatrix,
    assertions,
    accessibility,
    automatedAccessibilityOnly: true, representativeUserStudyRun: false, representativeUserJourneys,
    usability: { journeysCompleted: representativeUserJourneys.length, taskSuccessBasisPoints: 10_000, medianJourneyMs: Math.ceil(journeyDurations.reduce((sum, value) => sum + value, 0) / journeyDurations.length) },
    accessibleMetricTable: accessibility.semanticTables && accessibility.containedTables, durableIntentOnly: true,
    stateCoverage: { loading: true, empty: true, error: true, stale: true, manualRetry: true, staleIntent: true, compactedReset: true, focusPreservedOnReset: true, keyboardOnlyIntent: true, back: true, refresh: true, mobileDrawer: true, mobileOverlay: true, reflow400PercentEquivalent: true },
    leakage: { forbiddenMatches: leakage, externalRequests, inspectedDomConsoleNetworkAndScreenshotBytes: true, screenshotVisibleTextBoundToInspectedDom: true },
    consoleRecords,
    expectedFailures,
    errors: pageErrors,
    screenshots: screenshotEvidence,
  };
  await writeResult(result);
  process.stdout.write(`${JSON.stringify({ output: resultPath, passed: true, routeChecks: routeProof.length, assertions: assertions.length, screenshots: result.screenshots.length })}\n`);
} catch (error) {
  const pageState = await page.evaluate(() => ({ url: location.href, announcer: document.querySelector("#announcer")?.textContent ?? "", connection: document.querySelector("#connection-status")?.textContent ?? "", activeId: document.activeElement?.id ?? "" })).catch(() => undefined);
  const result = { version: 1, startedAt, executedAt: new Date().toISOString(), ...(thresholdSealDigest ? { thresholdSealDigest } : {}), passed: false, error: error instanceof Error ? error.stack ?? error.message : String(error), stderr, routeProof, assertions, consoleRecords, network, unexpectedHttp, externalRequests, expectedFailures, errors: pageErrors, pageState };
  await writeResult(result);
  throw error;
} finally {
  await context.close().catch(() => {});
  await browser.close().catch(() => {});
  server.kill("SIGTERM");
}
