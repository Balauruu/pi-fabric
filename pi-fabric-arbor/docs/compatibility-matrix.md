# Fabric compatibility matrix

Compatibility is admitted only by `FabricCompatibilityCertificateV1` and only while its retained artifacts and active inputs mechanically verify.

| pi-fabric version | Host scope | Status | Required evidence |
|---|---|---|---|
| `0.76.2` | Exact retained package/host payload and tool bytes only | Supported when its retained inputs are current | Its B0 payload, direct host runtime, approval runtime, installed integration, and compatibility certificate all verify |
| `0.77.0` | Exact current profile sibling package/host payload and tool bytes only | Supported when its retained inputs are current | Its separate B0 payload, direct host runtime, approval runtime, installed integration, and compatibility certificate all verify |
| Any other version or payload | Any | Unsupported | No fallback or version range is admitted |

## Required evidence tiers

| Area | Required tier |
|---|---|
| Exact version, export map/runtime export keys, Arbor schemas/descriptors/risk/effects, cancellation/approval representations, child contract, package boundary | `direct-representation` |
| Provider registration, discovery, replacement, deactivation; Schema enforce rejection | `contract-harness` |
| `agents.run`, `agents.spawn`, `agents.status`, `agents.wait`, `agents.stop`, `agents.cleanup` | `direct-runtime` |
| Running-child marker and cancellation through stopped status and exit 143 | `direct-runtime` |
| Approval allow, deny, once, session, auto | `direct-runtime` |
| Installed Fabric component/provider/`fabric_exec` integration and shutdown | `direct-runtime` |

The integration subprocess uses deterministic Arbor fixture adapters and is not model evidence. The separate live host artifact supplies model-backed agent lifecycle and process-cancellation evidence. For each supported release, compatibility binds both runtime artifacts to that exact package/runtime source, Arbor certification sources, approval artifact and harness, integration test, bounded complete subprocess log, and certificate digest. The supported set is exactly `0.76.2 || 0.77.0`; later versions remain blocked until their own complete matrix is retained.

Run:

```sh
npm run certify:host-integration-runtime
npm run certify:upstream
npm run test:b1
```

`loadProductionCertificationStatus()` enables real agents only when B1 and the independent B5/B6/B7/B8, Phase 4, and Phase 5 certificates all verify. Any missing, stale, unknown, contradictory, or tampered B1 evidence disables admission.
