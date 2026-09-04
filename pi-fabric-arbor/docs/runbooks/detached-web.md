# Detached Web operations

Arbor Web is a loopback-only observer and durable intent inbox. It has no driver lease, signing key, evaluator, Git mutation, cleanup executor, or direct external-effect method. "No active Fabric driver" is shown deliberately.

## Start through the supervised component

Build first, then configure an `arbor-web` instance in trusted project `.pi/fabric.json`:

```json
{
  "configVersion": 1,
  "components": [
    {
      "id": "arbor-web-local",
      "component": "arbor-web",
      "config": {
        "version": 1,
        "enabled": true,
        "database": ".runtime/arbor.sqlite3",
        "artifactRoot": ".runtime/artifacts",
        "host": "127.0.0.1",
        "port": 0
      }
    }
  ]
}
```

Use an absolute database/artifact location in production configuration. Omit `bootstrapToken` to generate a random token. The component reports a URL of the form `http://127.0.0.1:<port>/runs#<token>` through the local UI. The fragment is consumed by `POST /api/v1/session/bootstrap`, removed from browser history, and replaced by an `HttpOnly; SameSite=Strict` session cookie. Do not paste the token into logs, reports, query strings, or support tickets.

The browser removes the fragment synchronously before starting the asynchronous exchange and retains it only in a local script closure. The server rejects non-loopback bind addresses, noncanonical Host headers, cross-origin requests, mutation requests without the CSRF header, unsupported media types and methods, oversized bodies/responses/streams, duplicate query keys, stale revisions, and unknown fields. Every authority response is checked against its route-specific closed bounded schema immediately before canonical serialization. It sends a deny-by-default CSP and related browser isolation headers. Static files come only from the release-built `dist/web-assets` manifest.

## Operating model

- Reads are bounded projections under `/api/v1` and contain no raw paths or secrets. The UI serves `/runs/:runId` as the overview alias alongside `/runs/:runId/overview`; API routing is unchanged.
- SSE uses `Last-Event-ID`. A compacted cursor receives a typed `reset` event with the snapshot and next cursor; otherwise events catch up exactly from the requested cursor. The UI marks disconnected data stale, disables stale intent submission with a visible reason, and offers a manual authoritative refresh/retry.
- Artifact and diff reads require opaque IDs and bounded `offset`/`limit`. Arbitrary paths are impossible.
- Pause, resume, gate answer, pin, prune, retry, cancel, promotion, rollback, report, and cleanup controls append typed `PENDING` intents only.
- An admitted Fabric driver validates current state, processes the inbox, and owns any later effect execution. Closing the browser does not create or cancel a driver.

## Verification and incident response

```sh
npm run build
npm run test:phase6
npm run test:browser
npm run verify:web
```

If bootstrap material appears in a URL query/fragment after script startup, DOM, console, response body, screenshot, or report, stop the server, rotate the token by restarting, preserve the Web threat certificate/results, and investigate before reuse. If an SSE client receives `reset`, replace local state with that snapshot rather than merging stale state. Reset rerenders must preserve the user's focused control and announce the update politely. Any path/secret detector finding, CSP console error, external network request, wrong-origin acceptance, direct-effect capability, or response-schema bypass is a release blocker.
