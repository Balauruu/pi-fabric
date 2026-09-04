# Phase 6 release procedure

Phase 6 evidence is release-local. Never edit `dist/web-assets` directly; edit `web/`, run `npm run build`, and retain the resulting hashed manifest inventory.

## Required order

```sh
npm run build
npm test
npm run test:phase6
npm run test:browser
npm run lint:package-boundary
npm run verify:certificates
npm pack --dry-run --ignore-scripts --json
```

Before the verification sequence, regenerate any certificate whose source or active input changed. Phase 6 generation order is:

```sh
npm run certify:web
npm run certify:approval-runtime
npm run certify:licensing
npm run certify:retention
npm run certify:distribution
```

Generate distribution last because it records every non-self npm file's path, bytes, mode, and SHA-256, the complete build-source/tool digests, the other retained evidence and browser results. Verification creates an actual npm tarball in a temporary directory, independently unpacks it, and compares exact path/bytes/mode/digest plus bin/export/asset/license/notice inventories against the dry run and active package. The certificate and checksum paths are the only explicit deterministic self exclusions. Any same-size byte change, tool/source drift, unexpected generated/runtime/test/secret/path content, or inventory drift fails closed.

## Manual review

Inspect all three retained browser screenshots at desktop, tablet, and mobile widths. Confirm headings, summary cards, connection/driver status, controls, table wrappers, chart table alternatives, focus treatment, no horizontal page overflow, and absence of raw paths or credentials. Automated checks are not a representative user study; record that limitation without upgrading the claim.

Review `npm pack --dry-run --ignore-scripts --json` for:

- every declared bin and export target;
- `dist/web-assets/asset-manifest.v1.json` and its hashed files;
- license, notices, README, runbooks, skill, retained browser results, acceptance ledger, and retained certificates;
- absence of browser/test harnesses, source trees, tests, node_modules, temporary build roots, authority databases, state roots, private keys, secrets, and private host paths.

B1 is locally admitted only for the exact retained `pi-fabric@0.76.2` host evidence. Run `npm run certify:host-integration-runtime` before `npm run certify:upstream`; the former records the bounded real-Fabric integration subprocess, and the latter binds it with the separate live model-child/cancellation artifact and five-mode approval artifact. Do not describe the fixture-backed integration lane as model evidence. Any artifact, package, tool, harness, source, or test drift disables B1 until fresh evidence is retained.
