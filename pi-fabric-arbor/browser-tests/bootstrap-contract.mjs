const KEYS = Object.freeze(["assetManifestDigest", "bootstrapToken", "driverStatus", "origin", "runId", "version"]);
const TOKEN = /^[A-Za-z0-9_-]{32,128}$/u;
const DIGEST = /^[0-9a-f]{64}$/u;
const ID = /^[a-z][a-z0-9_]{2,63}$/u;

export function parseGuidedFixtureBootstrapV1(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("fixture bootstrap record must be an object");
  const keys = Object.keys(value).sort();
  if (JSON.stringify(keys) !== JSON.stringify(KEYS)) throw new Error("fixture bootstrap record is not closed");
  if (value.version !== 1 || value.driverStatus !== "No active Fabric driver") throw new Error("fixture bootstrap version or driver status is invalid");
  if (!TOKEN.test(value.bootstrapToken) || !DIGEST.test(value.assetManifestDigest) || !ID.test(value.runId)) throw new Error("fixture bootstrap identity or digest is invalid");
  let origin;
  try { origin = new URL(value.origin); } catch { throw new Error("fixture bootstrap origin is invalid"); }
  if (origin.protocol !== "http:" || origin.hostname !== "127.0.0.1" || origin.username || origin.password || origin.pathname !== "/" || origin.search || origin.hash || !origin.port) throw new Error("fixture bootstrap origin must be an exact loopback HTTP origin");
  return Object.freeze({ version: 1, origin: origin.origin, bootstrapToken: value.bootstrapToken, assetManifestDigest: value.assetManifestDigest, driverStatus: value.driverStatus, runId: value.runId });
}

export function createGuidedFixtureBootstrapV1({ address, bootstrapToken, runId }) {
  return parseGuidedFixtureBootstrapV1({ version: 1, origin: address.url, bootstrapToken, assetManifestDigest: address.assetManifestDigest, driverStatus: address.status, runId });
}
