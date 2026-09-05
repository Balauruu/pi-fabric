# Coordinator verification (bounded research acceptance)

## Direct route

Clock: host `new Date().toISOString()` = `2026-09-05T12:24:41.648Z`. No requested historical cutoff. Route chosen before retrieval: one stable IANA primary document covers the factual requirement; zero child dispatches in this direct route. Separate resource/lifecycle/multistream probes are not direct-route children.

| Requirement | Status | Claim and verification |
|---|---|---|
| r1: purpose and registration limits of example domains | satisfied | IANA opening paragraph states documentation purposes, illustrative use without prior coordination, and no registration/transfer. `direct-fetch.json` and `direct-passage.json` retain exact text. |
| Deliberately unreachable test URL | unavailable | `https://fabric-research-acceptance.invalid/unavailable` gives ENOTFOUND and `details.successful=0`. No assertion can be supported by this source. No browser recovery or retry. |

Decisive source: https://www.iana.org/help/example-domains, first paragraph, sentences 1-3. Primary IANA documentation, last revised 2017-05-13 as displayed. Temporal disposition: current-only, not archived historical evidence. Exact match `They are not available for registration or transfer.` found once. Entailment: yes for the bounded documentation/registration claim. Confidence high; no measurement, numerical normalization or recommendation is inferred.

`source_check` returned `unclear` from a different IANA registry passage; it is not treated as verification. The coordinator's independent direct fetch and exact stored passage support the claim. The registry's publication/effective history is not inferred. IANA sources share one origin and are not independent corroboration.

Search invocation: `extensions.web_search({query:"site.iana.org/help/example-domains reserved documentation not available registration transfer",numResults:1,workflow:"none"})`. Provider/model overrides omitted. Search responseId `mtocuw8c11xs6l`; fetch `mtocval1pxyn8f`; source check `mtocvcm8rwujhm`; failed fetch `mtocvpthj3ae5n`. Source-check artifact exposes provider `exa`; plain web_search does not expose provider/model in its returned details, and the profile `web-search.json` only contains allowBrowserCookies=true. Main subsequently retrieved the native web-search-results entry through the owner-held agents.log API: search-native-entry.json records provider exa, no error, and the same IANA URL. The selected provider is observed, not inferred. Exa exposes no separate search-model identity here; no worker-model attribution is claimed. Parent usage unavailable.

Research receipt: route=direct; reason=one stable IANA primary document covers the requirement; runStartedAtUTC=2026-09-05T12:24:41.648Z; requestedAsOfUTC=none; childCalls=0; blockedRequirements=none; parentTelemetry=unavailable

## Multistream interpretation

Canonical manifest requests two independent acceptance uncertainties plus a native attempt-cap boundary, not a substantive product comparison. Runtime clock `2026-09-05T12:28:56.446Z`. Original `live-canonical-receipt.json` is unchanged: 3 planned/terminal outcomes, 2 structurally valid, 1 candidate-usable, 1 failed-budget, 0 retries; 3 dispatch attempts, 2 native result receipts, 1 unreceipted refusal. Missing aggregate telemetry remains unavailable. Native helper token observation total=1/spent=0 is not a raw-agent token cap.

- r1 is independently supported by the coordinator's IANA passage above, not merely the child URL. Same source origin, not triangulation.
- r2 engine-execution requirement is satisfied by actual scoped artifacts and child tool trace: real installed engine, exit0, schema_version1.2, source_status HN ok, six results. The worker's proposed HN claim remains unpromoted: provenance.retrievedAtUTC is missing and the canonical guard correctly reports completed-no-usable-evidence. No recommendation about SQLite reliability follows from this sample.
- r3 native refusal requirement is satisfied by actual budget rejection while successful native sibling data remains present. It is a lifecycle acceptance result, not web evidence.
- Current-field generic stderr 'Research quality: 4/5 core sources' contradicts HN-only actual source_status; do not repeat it as coverage. Engine window is date-based, not proof of an intraday cutoff. Engagement is platform-native and not normalized reliability.

A separate actual impossible-schema worker failed delivery while its valid sibling completed. This is deliberate fault injection, not an upstream outage. No real failed branch was rerun.
