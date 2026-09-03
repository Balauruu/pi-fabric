# Authoritative Architecture and Delivery Plan for Native `pi-fabric-arbor`

## 1. Status, scope, and evidence language

**[Architectural decision]** Build Arbor as a native, separately versioned TypeScript package named `pi-fabric-arbor`, peer-dependent on certified `pi-fabric` releases.

Required product surfaces:

- skill: `/skill:fabric-arbor`;
- provider namespace: `arbor.*`;
- supervised definitions: `arbor-runtime` and `arbor-web`;
- optional detached monitor: `pi-fabric-arbor serve`;
- package-owned SQLite authority and content-addressed artifacts;
- Fabric agents for reasoning and implementation;
- canonical evaluator adapters outside worker authority;
- first-class loopback Web UI;
- conservative, certificate-gated package-ref promotion.

Out of scope for the initial architecture:

- prompt-only orchestration;
- an Arbor Python runtime dependency;
- an Arbor CLI or MCP bridge;
- duplicated Web and headless coordinators;
- arbitrary lifecycle scripts;
- model-extracted promotable scores;
- remote Web access;
- implicit mutation of a user checkout or checked-out ref;
- direct publication to user-owned refs;
- enabled synthetic dirty-state capture.

The following labels are normative:

- **[Verified fact]** Supported by retained, reproducible primary-source certification evidence.
- **[Architectural decision]** Required design or policy.
- **[Assumption]** Provisional premise that must not support a release claim until certified.
- **[Implementation blocker]** A required implementation or certification artifact missing for a named phase.
- **[Deferred capability]** Excluded from the relevant release and therefore not blocking it.

## 2. Immutable proposal basis and certification policy

### 2.1 Source proposals

**[Verified fact]** The following immutable proposals were read completely from line 1 through EOF and matched the supplied hashes:

| Source | Lines | Bytes | SHA-256 |
|---|---:|---:|---|
| `Arbor/architecture-and-design-investigation.md` | 1215 | 46808 | `6b3c65c55927efc4a59b2254393e077e153d8495c93ed70ab0ec7f789b654216` |
| `Arbor/native-option-c-web-ui-design.md` | 1532 | 54702 | `b2c755e35314851000a21fa0234bbf979a203c5ff83e15da6d1e2f5f312b99f3` |

**[Architectural decision]** These documents are proposals and historical investigation records. They are not upstream API, behavior, revision, provenance, license, or test certification. This plan supersedes them without modifying them.

### 2.2 Upstream claims pending certification

The proposals identify these inspection targets:

- pi-fabric source revision `1a71fff54d9bfc03de4a8df925df15e65bc82392`;
- installed pi-fabric release `0.76.2`;
- Arbor source revision `2f4e65410a5c21c9e55835a9a0d77ead21a64ffa`;
- proposed pi-fabric MIT license declaration;
- proposed Arbor Apache-2.0 license declaration;
- historical disposable-clone test totals.

**[Assumption]** None of those claims is release-certified merely because it appears in a proposal or URL. Historical test totals must not be represented as current results.

### 2.3 Reproducible upstream certification

Before relying on an upstream claim, produce an immutable `UpstreamCertificationV1` containing:

- certification ID, schema version, creation time, tool versions, and platform;
- upstream repository URL and immutable revision;
- archive, checkout, or installed-package digest;
- exact inspected file paths, byte sizes, and SHA-256 digests;
- package manifest, export map, protocol declarations, action schemas, component interfaces, approval behavior, cancellation behavior, and relevant documentation;
- exact license and notice files with digests;
- provenance method and limitations;
- compatibility test commands, fixture digests, exit codes, and complete bounded logs;
- supported and rejected version results;
- signer or CI identity and hash-chain predecessor.

Retain evidence under:

```text
certification/upstream/<project>/<revision-or-version>/
├── manifest.v1.json
├── files.sha256
├── compatibility-results.v1.json
├── logs/
└── artifacts/
```

The manifest must identify every file used to support each verified statement. Links are navigation aids, not certification evidence.

Until this artifact exists:

- public API and behavior statements remain assumptions;
- the peer-version range remains empty;
- real Fabric child dispatch is disabled;
- release metadata must not assert upstream license or provenance as independently verified.

## 3. Product goals and non-goals

### 3.1 Goals

The package shall:

1. admit an immutable, measurable research contract;
2. establish canonical development and held-out baselines before comparisons that depend on them;
3. retain hypothesis lineage, attempts, lessons, rejected evidence, and retry history;
4. run bounded independent experiments in parallel;
5. accept scores only from canonical evaluators;
6. compare maximize and minimize objectives deterministically;
7. recover at every external-effect boundary without blind replay;
8. verify the actual merge candidate using held-out evaluation;
9. require distinct intent, authorization, Fabric policy, mutation, observation, and publication stages;
10. expose durable monitoring, evidence, controls, reports, and cleanup through the Web UI;
11. represent partial, stale, failed, cancelled, rolled-back, quarantined, indeterminate, report-pending, and cleanup-pending outcomes;
12. make active-checkout mutation by workers and evaluators impossible through certified OS confinement;
13. preserve certified pi-fabric public-package compatibility;
14. remain removable as one deep module if benchmarks do not justify the product.

### 3.2 Non-goals

- Do not import `pi-fabric/src/*`, unexported `dist/*`, or internal managers and stores.
- Do not make Fabric activity, browser state, reports, mailboxes, transcripts, or model output authoritative.
- Do not accept arbitrary shell commands, host paths, refs, scores, SQL, credentials, fences, or provider handles from public or browser interfaces.
- Do not trust worker-reported scores.
- Do not silently approve on timeout.
- Do not compare scores from different evaluation epochs.
- Do not automatically move `main`, `master`, `HEAD`, a user branch, or any checked-out ref.
- Do not claim held-out secrecy without technical access isolation.
- Do not treat `cwd`, a worktree, or a tool allowlist as filesystem confinement.
- Do not weaken Schema `enforce` restrictions.
- Do not enable `dirtyPolicy: "capture"` in releases covered by this plan.

## 4. Normalized domain vocabulary

- **Run:** one admitted immutable research contract and its event history.
- **Evaluation epoch:** one digest covering objective, metric policy, evaluators, parser, paths, permissions, baseline policy, held-out policy, numeric policy, and aggregation.
- **Hypothesis:** a parent-linked research proposition with rationale, plan, and accumulated lesson.
- **Attempt:** one budget-consuming execution of a hypothesis. A retry always creates a new attempt.
- **Candidate:** an immutable commit accepted by finalization and integrity checks.
- **Trial:** one canonical evaluator execution against one exact OID and split.
- **Evaluation:** contract-declared aggregation of valid trials.
- **Certificate:** immutable evidence bound to exact evaluator inputs, outputs, environment, containment, and digests.
- **Development baseline:** certified aggregate for the epoch’s development evaluator and baseline OID.
- **Held-out baseline:** certified aggregate for the same held-out evaluator, split, epoch, aggregation policy, and baseline merge OID used by promotion comparison.
- **Research trunk:** the package-owned baseline used to construct subsequent candidates.
- **Merge candidate:** the detached result of applying a candidate to the expected research trunk.
- **Winner ref:** the package-owned ref identifying the promoted merge candidate.
- **Promotion:** expected-OID movement of the winner ref.
- **Publication:** separately designed movement of a user-owned target ref. It is disabled in v1.
- **Rollback:** authorized expected-OID restoration of the winner ref to its journaled predecessor.
- **Effect intent:** a durable declaration recorded before an external operation.
- **Fence:** a monotonically increasing controller-ownership token.
- **Command intent:** a durable Web request awaiting an admitted driver.
- **Cleanup obligation:** durable debt for a package-owned resource requiring reconciliation or removal.
- **Report publication:** external creation of a verified report generation from one committed run revision.
- **Fingerprint certificate:** machine-verifiable before/after evidence proving source-checkout invariance across one consequential boundary.

## 5. Governing invariants

1. No external effect occurs before durable intent.
2. Every mutation checks expected revision, fence, and idempotency key.
3. Models propose; deterministic package code validates and commits.
4. Only evaluator adapters create evaluation certificates.
5. Malformed, stale, ambiguous, or uncertain evidence never becomes a valid certificate.
6. Interrupted effects are observed before retry.
7. Exactly once means one accepted durable outcome, not exactly-once external execution.
8. Retry creates a new attempt and preserves prior evidence.
9. Scores from different epochs are not directly ranked.
10. Web intents are neither provider calls, package authorization, nor Fabric approval.
11. Human timeout pauses or rejects; it never approves.
12. Cleanup never hides unresolved effects or removes dependencies of unpublished reports.
13. SQLite and its journal are authoritative; projections are rebuildable.
14. Workers and evaluators cannot mutate the active user checkout.
15. Promotion never checks out the destination ref.
16. Promotion evaluates the actual merge candidate.
17. Held-out promotion compares against a certified held-out baseline from the same epoch.
18. User-ref publication is separate and disabled in v1.
19. Uncertainty produces `INDETERMINATE` or `QUARANTINED`, not success.
20. `COMPLETED` does not erase legal rollback, report-republication, or cleanup transitions.
21. Any fingerprint mismatch immediately quarantines the run and stops consequential execution.

## 6. pi-fabric compatibility contract

### 6.1 Assumed public surface pending certification

**[Assumption]** The inspected target is expected to expose provider and component protocols, one risk per action, effect metadata, public `agents.*` actions, capability-checked component calls, cancellation signals, and bounded activity updates.

The expected risk values are:

```text
read | write | execute | network | agent
```

The expected effect kinds are:

```text
none | scoped | transactional | emission
```

`mixed` is not accepted as a risk.

### 6.2 Compatibility rules

- Import only certified public package exports.
- Never import internal managers, stores, supervisors, worktree implementations, execution services, residency internals, or source-path modules.
- Keep host interactions behind `FabricHostAdapter`, `FabricAgentAdapter`, `ComponentHost`, and `ActivityProjector`.
- Treat Fabric activity and audit as secondary projections.
- Reject unsupported Schema `enforce` sessions explicitly.
- Publish only a tested peer-version range.
- Run registration, schema, cancellation, child-lifecycle, approval, and component-capability tests against every supported release.
- Fail compatibility certification if action descriptors, agent argument schemas, child-status semantics, cancellation, approval, or capability behavior drifts.

### 6.3 Compatibility certificate

A release requires `FabricCompatibilityCertificateV1` containing:

- exact pi-fabric package digest and version;
- export-map and inspected public-file digests;
- action names and canonical request/response schema digests;
- tested `agents.run`, `agents.spawn`, `agents.wait`, `agents.status`, `agents.stop`, and `agents.cleanup` behavior;
- child-handle and correlation semantics;
- approval-mode results;
- cancellation and timeout results;
- component registration and deactivation results;
- descriptor risk/effect snapshots;
- Schema `enforce` rejection result;
- package-boundary lint result;
- complete test command and log digests.

Real agents remain disabled until this certificate exists.

## 7. Deep-module architecture

### 7.1 Package interface

`ArborApplication` is the sole owner of legal state transitions:

```ts
interface ArborApplicationV1 {
  execute(
    command: ArborCommandV1,
    context: CommandContextV1
  ): Promise<CommandReceiptV1>;

  query(
    query: ArborQueryV1,
    context: QueryContextV1
  ): Promise<ArborViewV1>;

  submitIntent(
    intent: WebIntentV1,
    session: WebSessionV1
  ): Promise<IntentReceiptV1>;

  readEvents(
    runId: ArborId,
    afterSequence: number,
    limit: number
  ): Promise<EventPageV1>;
}
```

Provider, skill, Web module, detached monitor, operator authorization tool, and test harness use this interface. The browser receives no implementation seam.

### 7.2 Internal seams

| Seam | Production adapter | Test adapter |
|---|---|---|
| `RunStore` | SQLite WAL | deterministic in-memory store |
| `FabricAgentAdapter` | certified explicit `agents.*` driver | scripted agent |
| `Evaluator` | confined process or remote evaluator | fixture evaluator |
| `WorkspaceManager` | package-owned isolated repository | disposable fixture |
| `GitIntegrator` | expected-OID package-ref operations | fault-injecting adapter |
| `Containment` | certified sandbox/container/remote runner | adversarial fixture |
| `AuthorizationAuthority` | local trusted-principal signer | deterministic test signer |
| `ReportPublisher` | atomic filesystem generation | fault-injecting publisher |
| `ActivityProjector` | Fabric activity/outbox | recording projector |
| `Clock` | monotonic and wall clock | manual clock |

### 7.3 Package layout

```text
pi-fabric-arbor/
├── package.json
├── README.md
├── LICENSE
├── THIRD_PARTY_NOTICES.md
├── NOTICE
├── bin/
│   ├── pi-fabric-arbor.ts
│   └── pi-fabric-arbor-authorize.ts
├── skills/fabric-arbor/
├── src/
│   ├── extension.ts
│   ├── public/
│   ├── component/
│   ├── application/
│   ├── domain/
│   ├── persistence/
│   ├── adapters/
│   ├── authorization/
│   ├── reports/
│   ├── web/
│   └── compatibility/
├── certification/
└── tests/
    ├── model/
    ├── provider/
    ├── persistence/
    ├── recovery/
    ├── concurrency/
    ├── git/
    ├── containment/
    ├── evaluation/
    ├── web/
    ├── compatibility/
    └── e2e/
```

## 8. Ownership and lifecycle

| Concern | Owner |
|---|---|
| Intake and operator guidance | `/skill:fabric-arbor` |
| Public descriptors and schemas | `arbor` provider |
| Legal transitions | `ArborApplication` |
| SQLite, migrations, leases, effects | Arbor package |
| Agent calls | explicit admitted Fabric driver |
| Worker confinement | certified `Containment` adapter |
| Private repository and workspaces | Arbor Git adapters |
| Canonical scores | evaluator adapter |
| Fabric risk policy and audit | pi-fabric |
| Promotion and rollback authorization | package authorization authority |
| Web server lifetime | `arbor-web` or detached binary |
| Durable Web model and cursor | Arbor package |
| Browser rendering and intent submission | Web UI |
| Reports and compatibility artifacts | Arbor package |

`arbor-runtime`:

- registers the provider;
- acquires only certified committed capabilities;
- drains secondary outbox projections;
- tracks evaluator processes it directly opened;
- processes intents only while an admitted driver owns the run lease;
- records shutdown and unfinished effects for reconciliation.

It does not autonomously call `agents.run` or `agents.spawn`, own durable state, mint authorization, or rely on teardown as recovery.

`arbor-web`:

- binds loopback HTTP;
- serves release-built assets;
- manages authenticated sessions;
- queries the durable read model;
- streams cursor-based SSE;
- appends typed command intents;
- serves bounded artifacts and diffs by opaque ID.

It acquires no agent, evaluator, shell, Git mutation, authorization, cleanup, lease, or promotion capability.

Detached mode may read, stream, and append intents. It cannot claim a lease, execute effects, evaluate, authorize, publish, clean up, or move refs. It displays `No active Fabric driver`.

## 9. Admitted driver and external-agent lifecycle

### 9.1 Driver admission

A driver is an explicit, bounded `fabric_exec` workflow initiated by the skill or a certified equivalent host path. Admission requires:

- a current Fabric compatibility certificate;
- a current containment certificate;
- a package version and schema digest accepted by the run;
- successful lease acquisition and a new fence;
- a unique driver ID and Fabric workflow correlation;
- no unresolved external effect requiring prior reconciliation.

The driver invokes package actions and Fabric `agents.*` actions. `arbor.start` only persists a contract and never runs an agent or evaluator.

### 9.2 Package-issued dispatch specification

The package transactionally reserves an attempt and creates `AgentDispatchIntentV1`:

```ts
interface AgentDispatchIntentV1 {
  version: 1;
  effectId: ArborId;
  dispatchKey: ArborId;
  runId: ArborId;
  hypothesisId: ArborId;
  attemptId: ArborId;
  fence: number;
  workspaceId: ArborId;
  containmentId: ArborId;
  cwdToken: OpaqueToken;
  agentProfileId: ArborId;
  requestSchemaDigest: Sha256;
  resultSchemaDigest: Sha256;
  toolPolicyId: ArborId;
  budgetReservationId: ArborId;
  expiresAt: CanonicalTimestamp;
}
```

The driver cannot substitute `cwd`, tools, schema, profile, containment, budget, or correlation. It resolves opaque tokens through the package adapter immediately before the approved call.

### 9.3 Dispatch sequence

1. `arbor.reserveAgentDispatch` commits the attempt, budget, cleanup obligation, and `INTENDED` effect.
2. The driver requests the required Fabric agent approval.
3. The driver invokes certified `agents.spawn` with the package-issued specification and dispatch key.
4. On receipt of a child handle, the driver immediately calls `arbor.attachAgentChild`.
5. That transaction stores:
   - Fabric child handle;
   - Fabric workflow and call correlation;
   - dispatch key;
   - containment identity;
   - child request digest;
   - observed start time;
   - current fence;
   - state `STARTED`.
6. The child performs a first-write handshake in its isolated workspace containing the dispatch key, attempt ID, request digest, and containment identity.
7. The driver observes progress through certified `agents.status` and completion through `agents.wait` or an equivalent certified API.
8. The driver calls `arbor.submitAgentObservation` with the raw result digest, terminal child status, workspace handshake, containment observation, usage, and bounded output.
9. Package code validates identity, schema, fence, workspace, OIDs, paths, and artifacts before committing `OBSERVED` and the attempt outcome.
10. Agent cleanup is separately journaled and reconciled.

A foreground `agents.run` path may be certified only if it provides equivalent durable correlation and terminal observation. Otherwise production uses `agents.spawn`.

### 9.4 Dispatch crash gap

A crash may occur after `agents.spawn` but before `arbor.attachAgentChild`. The existing `INTENDED` row and package dispatch key make the gap explicit.

Recovery classifies the child as:

- **COMPLETED:** a matching Fabric terminal record or valid workspace completion envelope exists, identities and digests match, and no active contained unit remains;
- **ACTIVE:** a matching Fabric child status or verified process/cgroup/container identity is active;
- **ABSENT:** certified host correlation lookup proves no child was created, no process unit or handshake exists, and the observation grace interval has elapsed;
- **UNCERTAIN:** correlation lookup is unavailable, contradictory, stale, or incomplete.

Recovery behavior:

- `COMPLETED`: attach the discovered correlation and commit the observed result without rerun;
- `ACTIVE`: attach and continue observation or durably request cancellation;
- `ABSENT`: mark the original effect `FAILED_ABSENT`; a retry creates a new effect and, for a worker retry, a new attempt;
- `UNCERTAIN`: mark `INDETERMINATE`, retain workspace and budget evidence, and prohibit replay.

A host configuration that cannot establish these four outcomes is not admitted for real agents. It may run deterministic fixtures only.

## 10. Public actions and truthful effect classification

### 10.1 Action classes

SQLite-only actions may be `transactional`. Any action crossing SQLite and Git, filesystem, process, Fabric child, or report boundaries is an ordered `emission`, even when its external sub-operation is individually atomic.

| Action | Risk | Effect kind | Scope |
|---|---|---|---|
| `arbor.start` | `write` | `transactional` | validate and persist contract only |
| `arbor.inspect` | `read` | `none` | bounded projections |
| `arbor.claimDriver` | `write` | `transactional` | lease and fence |
| `arbor.heartbeat` | `write` | `transactional` | extend lease |
| `arbor.signal` | `write` | `transactional` | pause, resume, gate answer, pin, prune, retry request |
| `arbor.cancel` | `write` | `transactional` | persist cancellation intent only |
| `arbor.advance` | `write` | `transactional` | one reducer step and effect planning |
| `arbor.reserveAgentDispatch` | `write` | `transactional` | reserve attempt and dispatch intent |
| `arbor.attachAgentChild` | `write` | `transactional` | attach returned child correlation |
| `arbor.submitAgentObservation` | `write` | `transactional` | validate and store observation |
| `arbor.materializeWorkspace` | `execute` | ordered `emission` | run Git/process operations in private storage |
| `arbor.finalizeCandidate` | `execute` | ordered `emission` | inspect and create candidate commit |
| `arbor.evaluate` | `execute` | ordered `emission` | canonical evaluator process |
| `arbor.buildPromotionCandidate` | `execute` | ordered `emission` | detached Git construction and checks |
| `arbor.planPromotionCommit` | `write` | `transactional` | freeze prepared promotion and authorization binding |
| `arbor.applyWinnerRef` | `write` | ordered `emission` | external Git ref CAS |
| `arbor.observeWinnerRef` | `write` | `transactional` | reconcile and commit observed ref state |
| `arbor.planRollback` | `write` | `transactional` | freeze predecessor and authorization |
| `arbor.applyRollbackRef` | `write` | ordered `emission` | external Git ref CAS rollback |
| `arbor.observeRollbackRef` | `write` | `transactional` | reconcile rollback |
| `arbor.planReport` | `write` | `transactional` | freeze report revision and dependencies |
| `arbor.publishReport` | `write` | ordered `emission` | external filesystem publication |
| `arbor.observeReport` | `write` | `transactional` | verify and commit publication |
| `arbor.planCleanup` | `write` | `transactional` | select eligible package resources |
| `arbor.executeCleanup` | `write` | ordered `emission` | external process/filesystem/Git cleanup |
| `arbor.observeCleanup` | `write` | `transactional` | reconcile cleanup observations |

Fabric `agents.*` calls retain their certified Fabric risk and effect descriptors. Arbor does not relabel them.

### 10.2 Descriptor policy tests

For every supported pi-fabric release:

- snapshot canonical descriptors and schema hashes;
- assert every SQLite-only action has no external adapter call;
- inject an external adapter call into a transactional-action test double and require the test to fail;
- assert every Git, filesystem, process, child, report, and cleanup action is an emission;
- test allow, deny, once, session, auto, cancellation, timeout, and conflict behavior;
- fail release certification on descriptor drift.

External Git/process operations are admitted because they are restricted to certified package-owned containment, have durable intent, bounded arguments, no raw caller command, and reconciliation tests. If that policy cannot be certified, the action remains disabled.

## 11. Public schema and input bounds

### 11.1 Global formats

All public and browser schemas are versioned, closed, and use `additionalProperties: false`.

| Type | Required bound |
|---|---|
| Arbor ID | `^[a-z][a-z0-9_]{2,63}$` |
| SHA-256 | lowercase `^[0-9a-f]{64}$` |
| Git OID | package-issued lowercase hex, exactly the certified repository hash length |
| Idempotency key | 16-128 URL-safe ASCII characters |
| Opaque token | 32-256 URL-safe ASCII characters; never logged |
| Short text | normalized UTF-8, 1-256 code points |
| Objective/summary | 1-2000 code points |
| Reason/lesson/rationale | 1-4000 code points |
| Implementation step | 1-1000 code points |
| Array count | explicit per field; never unbounded |
| Timestamp | canonical UTC RFC 3339 with exactly millisecond precision |
| Revision/sequence/fence | integer, 0 to `Number.MAX_SAFE_INTEGER` |
| Pagination limit | 1-200; server may impose a lower endpoint limit |
| Relative path | normalized UTF-8, 1-512 bytes, `/` separators, no empty component, `.`, `..`, NUL, backslash, drive prefix, URI prefix, or absolute root |
| Glob | 1-512 bytes, relative only, certified grammar, no brace expansion, extglobs, negation, backtracking constructs, or more than 32 wildcard tokens |
| Artifact/log preview | at most 64 KiB per response and 1 MiB aggregate page |
| Request body | at most 256 KiB unless a lower route limit applies |

Identifiers, repository IDs, evaluator IDs, retention classes, tool policy IDs, agent profiles, credential aliases, and target IDs must be administrator-admitted opaque IDs. They are not free-form paths or commands.

### 11.2 Contract bounds

- objective: 1-2000 code points;
- metric name and unit: 1-64 ASCII characters matching `^[A-Za-z][A-Za-z0-9_.%/-]{0,63}$`;
- editable, protected, and required-output arrays: 0-128 entries each;
- tools: 0-64 admitted IDs;
- credential aliases: 0-16 admitted IDs;
- max hypotheses and attempts: 1-10,000;
- max concurrent attempts: 1-64;
- retries per hypothesis: 0-32;
- cycles: 1-10,000;
- wall time: 1,000-604,800,000 ms;
- evaluator runs: 1-100,000;
- token and cost limits: validated canonical integers/decimals within policy;
- no finalization-reserve field may exceed its corresponding total.

### 11.3 Model-output bounds

Coordinator output:

- observations: 0-32 entries;
- hypotheses: 0 to the smaller of 32 and remaining budget;
- selected IDs: 0-32 unique entries;
- implementation steps: 1-32 per hypothesis;
- all text follows global limits.

Worker output:

- changed paths: 0-4096;
- required-output digests: 0-512;
- implementation choices and follow-ups: 0-32 each;
- cleanup obligations: 0-128;
- bounded preview: at most 16 KiB;
- claimed metric uses canonical decimal format and remains informational.

Unknown fields, duplicate IDs, invalid parents, unknown paths, excess counts, and inconsistent identities are rejected.

### 11.4 Gate-specific answers

`answer: unknown` is prohibited. Gates use a closed discriminated union:

```ts
type GateAnswerV1 =
  | {
      version: 1;
      kind: "confirm";
      gateId: ArborId;
      value: boolean;
    }
  | {
      version: 1;
      kind: "singleChoice";
      gateId: ArborId;
      optionId: ArborId;
    }
  | {
      version: 1;
      kind: "multiChoice";
      gateId: ArborId;
      optionIds: ArborId[];
    }
  | {
      version: 1;
      kind: "boundedText";
      gateId: ArborId;
      value: string;
    };
```

Rules:

- each gate stores its answer kind and allowed option IDs;
- multi-choice permits 1-32 unique IDs;
- bounded text permits 1-2000 code points and is unavailable for authorization, paths, commands, scores, refs, credentials, or policy expansion;
- expired, mismatched, duplicate, or unknown answers are rejected.

## 12. Research contract and deterministic numeric semantics

### 12.1 Contract shape

```ts
interface ArborContractV1 {
  version: 1;
  objective: string;

  repository: {
    repositoryId: ArborId;
    initialOid: GitOid;
    dirtyPolicy: "reject" | "committedOnly";
  };

  metric: {
    name: string;
    direction: "maximize" | "minimize";
    unit: string;
    quantum: CanonicalQuantum;
    minimumImprovement: CanonicalDecimal;
    trialCount: number;
    aggregation: "single" | "median";
    nondeterminismTolerance: CanonicalDecimal;
  };

  evaluation: {
    development: ArborId;
    heldOut: ArborId;
    parserVersion: ArborId;
    invalidTrialPolicy: "failEvaluation";
  };

  paths: {
    editable: RelativeGlob[];
    protected: RelativeGlob[];
    requiredOutputs: RelativePath[];
  };

  permissions: {
    tools: ArborId[];
    network: boolean;
    packageInstallation: boolean;
    processExecution: boolean;
    credentialAliases: ArborId[];
  };

  budgets: {
    maxHypotheses: number;
    maxAttempts: number;
    maxConcurrentAttempts: number;
    maxRetriesPerHypothesis: number;
    maxCycles: number;
    wallTimeMs: number;
    maxAgentCalls: number;
    tokenLimit?: number;
    costLimit?: CanonicalDecimal;
    evaluatorRuns: number;
    finalizationReserve: {
      attempts: number;
      agentCalls: number;
      evaluatorRuns: number;
      wallTimeMs: number;
      tokens?: number;
      cost?: CanonicalDecimal;
    };
  };

  gates: {
    beforeDispatch: "always" | "policy";
    beforePromotion: "always";
    timeout: "pause" | "reject";
  };

  promotion: {
    mode: "packageWinnerRef";
  };

  retentionClass: ArborId;
}
```

The contract is content-addressed. Administrator policy can only restrict it.

Changing metric, direction, unit, quantum, evaluator, parser, split, aggregation, tolerance, paths, permissions, baseline OID, or held-out policy creates a new epoch.

### 12.2 Canonical decimals

`CanonicalDecimal`:

- JSON string, never a binary floating-point number;
- grammar: `0` or `-?[1-9][0-9]{0,26}` optionally followed by `\.[0-9]{1,9}`;
- no leading `+`, exponent, leading zeros, trailing fractional zero, decimal point without a fraction, or `-0`;
- at most 27 significant digits and scale 0-9;
- absolute unscaled coefficient must fit signed 128-bit arithmetic;
- values parsed directly into `(coefficient, scale)` integers.

`CanonicalQuantum` is one of:

```text
1
0.1
0.01
0.001
0.0001
0.00001
0.000001
0.0000001
0.00000001
0.000000001
```

`minimumImprovement` and `nondeterminismTolerance` must be nonnegative and exactly representable at the quantum scale.

### 12.3 Rounding and comparison

1. Parse evaluator values as canonical decimals.
2. Quantize each trial to the contract quantum using round-half-to-even.
3. Convert values to signed integer quantum units.
4. Reject overflow.
5. Aggregate only quantized integer values.
6. `single` requires exactly one trial.
7. `median` requires an odd trial count from 3 through 99; sort ascending and select the exact middle integer.
8. Spread is `maximumQuantizedTrial - minimumQuantizedTrial`.
9. Evaluation is `NONDETERMINISTIC` when spread exceeds tolerance. Equality passes.
10. Normalize improvement:
    - maximize: `candidateAggregate - baselineAggregate`;
    - minimize: `baselineAggregate - candidateAggregate`.
11. The improvement predicate is `normalizedImprovement >= minimumImprovement`.
12. Equality at the minimum boundary passes.
13. No implicit unit conversion is permitted.

Reports render integers back into the unique canonical decimal at the quantum scale, trimming fractional trailing zeros and normalizing zero to `0`.

## 13. Baselines and evaluation authority

### 13.1 Required baselines

Baselining constructs and certifies:

1. a development baseline on the immutable initial research-trunk OID;
2. a held-out baseline on the exact detached baseline merge OID produced by the same promotion-construction algorithm used later.

The held-out baseline must use the same:

- evaluator identity and version;
- held-out split;
- evaluation epoch;
- parser;
- configuration and environment policy;
- quantum and rounding;
- trial count and ordering;
- aggregation and spread policy;
- containment and trust level

as the candidate held-out evaluation.

No promotion may be prepared until both baseline certificates are valid. A changed evaluator, split, environment policy, parser, aggregation, or baseline OID requires a new epoch and new baselines.

### 13.2 Certificates

Only evaluator adapters create certificates. A certificate binds:

- schema and certificate IDs;
- run, epoch, contract, hypothesis, attempt, and evaluation IDs;
- baseline, development, or held-out role;
- exact base, candidate, and merge-candidate OIDs;
- evaluator ID, version, parser, configuration, and environment digest;
- metric, direction, unit, quantum, minimum improvement, and tolerance;
- raw canonical trial values and quantized integer values;
- seeds, trial order, aggregation, aggregate, and spread;
- start, end, exit status, output digest, and bounded logs;
- artifacts and required outputs;
- complete protected-path manifest;
- containment identity and trust labels;
- validity and typed rejection reason.

### 13.3 Trial validity

A trial is valid only if it:

1. runs against the recorded immutable OID;
2. matches evaluator, parser, configuration, split, contract, and epoch digests;
3. exits successfully before timeout;
4. emits exactly one strict structured record;
5. matches metric and unit exactly;
6. contains a valid canonical decimal;
7. has all required artifacts and outputs with matching digests;
8. has complete candidate and protected-path manifests;
9. has a valid containment observation;
10. has no uncertain integrity result.

Regex or LLM extraction is never promotable. Multiple records, malformed decimals, exponent notation, binary floats, `NaN`, infinity, mismatch, timeout, nonzero exit, missing evidence, or uncertainty create no valid certificate.

### 13.4 Ranking

Within the same epoch and split:

1. valid evidence ranks above absent or invalid evidence;
2. compare aggregate integer units in the declared direction;
3. equal aggregates are scientific ties;
4. scheduling may break ties by earlier certificate event sequence, then lexical candidate OID.

Scheduling tie-breakers are never reported as metric superiority.

## 14. Active-checkout non-mutation guarantee

### 14.1 Structural containment

Real work is refused with `WRITE_CONFINEMENT_UNAVAILABLE` unless certification proves:

1. active checkout, Git common directory, and sibling worktrees are absent or read-only;
2. only package-owned isolated storage is writable;
3. child processes and all descendants inherit confinement;
4. process namespace, mount namespace, cgroup/container identity, user identity, and termination ownership are verifiable;
5. absolute paths, alternate spellings, symlinks, hard links, `/proc` paths, bind mounts, file-descriptor inheritance, and namespace escape cannot reach source storage;
6. system, global, local, and environment-provided Git configuration is sanitized;
7. Git hooks are disabled through a package-owned empty hooks directory and cannot be overridden;
8. credential stores, agents, sockets, tokens, device nodes, host keyrings, and unrelated environment variables are absent;
9. network follows the admitted allowlist, with deny as the default;
10. package installation follows the admitted policy, with deny as the default;
11. workers cannot invoke package Git-ref, evaluator, held-out, authorization, cleanup, report, or publication capabilities;
12. device access is denied except for an explicit minimal allowlist;
13. process escape and source writes fail at the OS boundary.

`cwd`, tool allowlists, prompt instructions, and post-hoc fingerprints are not confinement evidence.

### 14.2 Isolated repository

```text
<state-root>/repositories/<repository-id>/
├── authority.sqlite3
├── private.git/
├── runs/<run-id>/
│   ├── workspaces/
│   ├── scratch/
│   ├── artifacts/sha256/
│   └── reports/
└── web-assets/<package-version>/
```

Admission imports the exact source OID into a dissociated package-owned repository. Do not use Git alternates, linked source worktrees, shared writable object storage, or the source Git common directory.

Hooks use a package-owned empty directory. Remotes are absent or read-only and credential-free unless administrator policy explicitly admits them.

### 14.3 Fingerprint certificates

Before and after every consequential boundary, generate `RepositoryFingerprintCertificateV1` containing:

- certificate ID, run ID, boundary ID, effect ID, command ID, and correlation IDs;
- fence, expected revision, containment ID, source repository identity, and package repository identity;
- boundary kind and exact before/after capture times;
- canonical fingerprint schema and tool digests;
- before manifest digest, after manifest digest, and comparison digest;
- expected predicate, observed equality result, and mismatch list;
- report generation ID that consumes the certificate;
- previous fingerprint-certificate digest, forming a hash chain;
- signer or CI identity.

The canonical fingerprint includes:

- checkout realpath, device, inode, mount, and filesystem identity;
- symbolic `HEAD`, branch/detached/unborn state, and resolved OID;
- all user refs, packed refs, reflogs, stash ref, stash reflog, and stash list;
- index bytes, stages, extensions, digest, and metadata;
- tracked path names, types, bytes, modes, executable bits, symlink targets, and relevant metadata;
- untracked non-ignored inventory, bytes, types, modes, and metadata;
- machine-readable status;
- Git common-directory inventory and metadata;
- worktree registration records;
- sibling worktree identities, checked-out refs, HEADs, indexes, tracked state, and untracked inventories.

The test oracle independently recomputes both canonical manifests using the certified fingerprint tool and requires exact digest equality. No Arbor-caused source mutation is allowlisted. Every effect receipt, containment certificate, report manifest, and E2E result references the applicable fingerprint certificate IDs.

A mismatch fails immediately, commits `FINGERPRINT_MISMATCH`, quarantines the run, stops agents and evaluators, blocks promotion and cleanup of evidence, and publishes a partial report.

## 15. Persistence, commands, leases, and effects

### 15.1 Authority

Use one migrated SQLite database per repository identity under administrator-selected XDG/profile storage. Runs are isolated by `run_id`. Enable WAL, foreign keys, bounded transactions, integrity checks, and reducer replay checks.

Required tables include:

- `runs`, `commands`, `events`;
- `hypotheses`, `attempts`;
- `trials`, `evaluations`, `certificates`;
- `effects`, `agent_children`, `leases`, `gates`;
- `promotion_authorizations`, `rollback_authorizations`, `promotions`;
- `report_generations`, `report_publications`;
- `artifacts`, `cleanup_obligations`;
- `command_intents`, `outbox`, `snapshots`;
- `repository_fingerprints`, `budget_reservations`;
- `upstream_certifications`, `compatibility_certifications`, `containment_certifications`.

### 15.2 Command transaction

Every mutation carries:

```ts
{
  runId: ArborId;
  expectedRevision: number;
  idempotencyKey: string;
}
```

The admitted driver supplies the private current fence.

One SQLite transaction:

1. rejects stale revision, fence, illegal transition, or mismatched duplicate key;
2. appends command and events;
3. increments revision exactly once;
4. reserves budgets and attempts;
5. records effect intents;
6. updates read model and outbox;
7. commits before external execution.

A matching duplicate returns the prior receipt. Reuse with different input is rejected.

### 15.3 Effect journal

```text
INTENDED
-> DISPATCHING
-> STARTED
-> OBSERVING
-> OBSERVED
-> COMMITTED

nonterminal -> FAILED_ABSENT | FAILED | INDETERMINATE | CANCEL_REQUESTED
CANCEL_REQUESTED -> CANCELLED_CONFIRMED | INDETERMINATE
```

Not every effect uses every state. Retry requires proven absence or a terminal failure policy and always receives a new effect ID.

Process identity uses PID plus process start time and containment identity. Cancellation targets a cgroup, container, process group, or equivalent descendant-owning unit, never an unverified PID.

### 15.4 Migrations and artifacts

- Number and checksum migrations.
- Back up before mutation.
- Apply SQLite-compatible changes transactionally.
- Run foreign-key, integrity, reducer-replay, and read-model checks.
- Open unknown newer schemas read-only.
- Refuse downgrades.
- Preserve previous authority after failed migration.
- Version snapshots by reducer and verify before use.

Artifacts are written to owner-only temporary files, bounded, redacted, hashed, validated, atomically renamed into CAS, and referenced transactionally. Missing or mismatched artifacts invalidate dependent evidence.

## 16. State machines and recovery

### 16.1 Run lifecycle

```text
STAGED -> ADMITTED -> BASELINING -> EXPLORING
EXPLORING -> VERIFYING_FINAL -> AWAITING_PROMOTION
AWAITING_PROMOTION -> PROMOTING -> COMPLETED

active <-> WAITING_INPUT
active <-> PAUSED
active -> CANCELLING -> CANCELLED
active -> FAILED | INDETERMINATE | QUARANTINED

COMPLETED -> REPORT_PENDING -> COMPLETED
COMPLETED -> CLEANUP_PENDING -> COMPLETED
COMPLETED -> ROLLBACK_REQUESTED -> ROLLING_BACK
ROLLING_BACK -> ROLLED_BACK | QUARANTINED
ROLLED_BACK -> AWAITING_PROMOTION
AWAITING_PROMOTION -> PROMOTING -> COMPLETED
```

`COMPLETED` means the latest promotion decision is durably settled, not that rollback, re-promotion, report republication, or cleanup is illegal.

### 16.2 Exploration phases

```text
OBSERVE -> IDEATE -> SELECT -> PREPARE -> DISPATCH
-> COLLECT -> FINALIZE -> EVALUATE_DEV -> BACKPROPAGATE
-> DECIDE -> OBSERVE | VERIFY_CANDIDATE | FINALIZE_RUN
```

Each phase may enter `RECONCILING`, `WAITING_INPUT`, `PAUSED`, `CANCELLING`, `INDETERMINATE`, or `QUARANTINED` where applicable. Recovery returns only to the first legal phase established by observed durable evidence.

### 16.3 Hypothesis lifecycle

```text
PROPOSED -> PENDING -> SELECTED -> RUNNING
RUNNING -> CANDIDATE | RETRYABLE | FAILED | INTERRUPTED
INTERRUPTED -> RECONCILING
RECONCILING -> RUNNING | RETRYABLE | CANDIDATE | INDETERMINATE
RETRYABLE -> SELECTED
CANDIDATE -> VERIFYING_HELD_OUT
VERIFYING_HELD_OUT -> VERIFIED | REJECTED | QUARANTINED
VERIFIED -> PROMOTABLE -> PROMOTED | STALE_BASE
PROMOTED -> ROLLED_BACK
ROLLED_BACK -> PROMOTABLE
eligible -> PRUNED | CANCELLED
```

### 16.4 Attempt lifecycle

```text
RESERVED -> PREPARING -> READY -> DISPATCHING -> RUNNING
RUNNING -> COLLECTING -> FINALIZING
FINALIZING -> CANDIDATE | REJECTED

PREPARING | DISPATCHING | RUNNING | COLLECTING | FINALIZING
-> INTERRUPTED -> RECONCILING

RECONCILING
-> READY | RUNNING | COLLECTING | FINALIZING
| PARTIAL | RETRYABLE | CANCELLED | INDETERMINATE

RETRYABLE -> RETRIED
```

`RETRIED` closes the old attempt. The new attempt receives a new ID, ordinal, dispatch key, effect ID, and budget reservation.

### 16.5 Promotion, authorization, report, and cleanup

```text
Promotion:
REQUESTED -> PREPARING -> CANDIDATE_BUILT
-> VERIFYING -> PREPARED -> AWAITING_AUTHORIZATION
-> AWAITING_FABRIC_POLICY -> COMMIT_PLANNED
-> REF_APPLYING -> REF_OBSERVED -> COMMITTED
-> REPORT_PENDING -> REPORTED

pre-commit -> REJECTED | STALE_BASE | INDETERMINATE
COMMITTED -> ROLLBACK_REQUESTED
ROLLBACK_REQUESTED -> AWAITING_ROLLBACK_AUTHORIZATION
-> ROLLBACK_PLANNED -> ROLLBACK_APPLYING
-> ROLLBACK_OBSERVED -> ROLLED_BACK
ROLLED_BACK -> AWAITING_AUTHORIZATION
```

```text
Authorization:
CHALLENGE_ISSUED -> SIGNED -> STORED -> CONSUMED
non-consumed -> EXPIRED | REVOKED
```

```text
Report:
PLANNED -> WRITING -> FILES_OBSERVED -> PUBLISHED
PLANNED | WRITING -> PUBLICATION_FAILED | INDETERMINATE
PUBLICATION_FAILED -> PLANNED
```

```text
Cleanup:
REQUESTED -> PLANNED -> EXECUTING -> OBSERVING
-> COMPLETED | CLEANUP_PENDING | INDETERMINATE
```

Cancellation reaches `CANCELLED` only after all active or uncertain effects are reconciled. Otherwise the run becomes `INDETERMINATE`.

## 17. Promotion, authorization, rollback, and report publication

### 17.1 Promotion verification

1. Require valid development candidate evidence.
2. Verify expected research-trunk OID.
3. Build the actual detached merge candidate.
4. Validate complete diff, renames, modes, symlinks, protected paths, editable paths, and required outputs.
5. Record merge-candidate OID and manifest.
6. Evaluate that exact OID with the held-out evaluator.
7. Compare its aggregate to the certified held-out baseline from the same epoch.
8. Require matching evaluator, split, parser, environment policy, numeric policy, trial count, aggregation, and trust labels.
9. Persist `PREPARED` without moving a ref.

### 17.2 Trusted principals and issuance API

The browser and `arbor-web` cannot mint authorization.

The initial trusted principal is a local operator principal configured by the administrator:

```ts
interface TrustedPrincipalV1 {
  principalId: ArborId;
  osUid: number;
  publicKey: string;
  allowedActions: ("promote" | "rollback")[];
  repositoryIds: ArborId[];
  expiresAt?: CanonicalTimestamp;
}
```

Authorization is issued only through:

```text
pi-fabric-arbor authorize promotion --challenge <opaque-id>
pi-fabric-arbor authorize rollback --challenge <opaque-id>
```

Issuance requires:

- an interactive local TTY;
- matching OS UID;
- an administrator-configured signing key unavailable to the Web process;
- display of run, candidate, merge OID, certificate digest, winner ref, expected current OID, predecessor OID when applicable, and expiry;
- explicit operator confirmation;
- signature over the canonical authorization payload.

The tool calls the package application directly through a dedicated local authorization adapter. It cannot alter the candidate or policy fields supplied by the challenge.

### 17.3 Authorization storage

Store:

- authorization ID and kind;
- challenge digest;
- run and repository IDs;
- candidate and merge-candidate OIDs;
- held-out certificate and contract digests;
- winner-ref identity;
- expected current and predecessor OIDs;
- expiry and one-time nonce;
- principal ID, key ID, signature, and issuance audit correlation;
- state and consumed promotion or rollback ID.

Verify the signature, principal scope, expiry, expected OIDs, current contract, certificate, and unused nonce at planning time and again immediately before ref application. Consumption is committed before ref application as part of `COMMIT_PLANNED`; reconciliation prevents reuse if the external outcome is uncertain.

Expired or lost authorization returns to `AWAITING_AUTHORIZATION`. It is never reconstructed or silently renewed.

### 17.4 Fabric policy

Promotion and rollback require both:

1. valid candidate-bound package authorization; and
2. traversal of the applicable Fabric write-risk action.

Release documentation must not claim Fabric always prompts unless the certified environment proves that configuration. Mandatory E2E configures independent interactive Fabric approval.

### 17.5 Winner ref and rollback

Winner ref:

```text
refs/pi-fabric-arbor/<run-id>/winner
```

Promotion and rollback:

- use expected-OID CAS;
- never check out the ref;
- never move a user ref;
- journal intent before CAS;
- observe actual ref after interruption;
- classify contradictory or unobservable state as `QUARANTINED`.

Rollback restores only the journaled predecessor and requires separate rollback authorization. After successful rollback, the prior candidate may be re-promoted only with a new one-time promotion authorization and a fresh Fabric policy traversal.

### 17.6 Report publication journal

Report publication is a separate external effect:

1. `arbor.planReport` freezes one committed revision, report generation ID, complete dependency list, and expected output digests.
2. Dependencies include contract, certificates, authorization records, promotion and rollback journals, fingerprint certificates, artifacts, and cleanup manifests.
3. `arbor.publishReport` writes generation-specific temporary files, fsyncs files and directory, atomically renames them into:
   ```text
   reports/<run-id>/generations/<generation-id>/
   ```
4. It writes a content-addressed generation manifest.
5. A stable `current` pointer is updated only after the complete generation is observable.
6. `arbor.observeReport` verifies every digest and commits `REPORT_PUBLISHED`.

Recovery:

- complete matching generation: commit publication without rewriting;
- no generation and proven absent process: retry with the same generation ID;
- partial temporary generation: validate or remove only its recorded temporary files, then retry;
- conflicting generation or uncertain filesystem identity: `INDETERMINATE`;
- duplicate publication with identical manifest: return the prior receipt;
- duplicate generation ID with different input: reject.

`PUBLICATION_FAILED` is durable and visible. Cleanup cannot delete any report dependency until at least one complete report generation covering that dependency is `PUBLISHED`, retention policy permits deletion, and no rollback, reconciliation, or newer report references it.

## 18. Web UI architecture

### 18.1 Product role and routes

Required routes:

```text
/runs
/runs/:runId/overview
/runs/:runId/tree
/runs/:runId/attempts
/runs/:runId/attempts/:attemptId
/runs/:runId/compare
/runs/:runId/metrics
/runs/:runId/timeline
/runs/:runId/resources
/runs/:runId/promotion
/runs/:runId/report
/runs/:runId/contract
```

Views expose:

- state, phase, outcome, next legal action, baselines, best candidate, deltas, and trust;
- budgets and finalization reserve;
- hypothesis lineage, retries, interruption, pruning, lessons, rollback, and re-promotion;
- worker claims versus canonical evidence;
- OIDs, certificates, paths, bounded diffs, logs, and artifacts;
- epoch boundaries without cross-epoch ranking;
- effects, gates, approvals, authorization, reconciliation, report publication, and cleanup;
- workspaces, refs, children, evaluator processes, leases, and cleanup debt;
- confinement, held-out isolation, and fingerprint status.

Graphs and charts require accessible tables.

### 18.2 Read API

All routes use `/api/v1`, closed schemas, opaque IDs, bounded pagination, and response-size limits.

```text
GET /api/v1/session
GET /api/v1/runs
GET /api/v1/runs/:runId
GET /api/v1/runs/:runId/tree
GET /api/v1/runs/:runId/attempts
GET /api/v1/runs/:runId/attempts/:attemptId
GET /api/v1/runs/:runId/comparisons
GET /api/v1/runs/:runId/metrics
GET /api/v1/runs/:runId/events
GET /api/v1/runs/:runId/resources
GET /api/v1/runs/:runId/promotions
GET /api/v1/runs/:runId/report
GET /api/v1/artifacts/:artifactId
GET /api/v1/diffs/:artifactId
GET /api/v1/stream
```

Responses never expose raw host paths, SQLite locations, secret values, raw credential aliases, evaluator environments, unredacted prompts, internal handles, leases, fences, signing keys, or authorization nonces.

### 18.3 Typed intents

```ts
type WebIntentV1 =
  | { version: 1; kind: "pause"; expectedRevision: number; reason?: string }
  | { version: 1; kind: "resume"; expectedRevision: number }
  | { version: 1; kind: "answerGate"; expectedRevision: number; answer: GateAnswerV1 }
  | { version: 1; kind: "pinHypothesis"; expectedRevision: number; hypothesisId: ArborId }
  | { version: 1; kind: "pruneHypothesis"; expectedRevision: number; hypothesisId: ArborId; reason: string }
  | { version: 1; kind: "retryAttempt"; expectedRevision: number; attemptId: ArborId }
  | { version: 1; kind: "cancel"; expectedRevision: number; reason?: string }
  | { version: 1; kind: "requestPromotion"; expectedRevision: number; candidateId: ArborId }
  | { version: 1; kind: "requestRollback"; expectedRevision: number; promotionId: ArborId }
  | { version: 1; kind: "requestReport"; expectedRevision: number }
  | { version: 1; kind: "requestCleanup"; expectedRevision: number };
```

Reason fields follow global bounds. Each submission uses a server-issued session and idempotency key. Competing drivers claim an intent once. Stale intents remain visible as rejected.

Promotion and rollback intents create requests and authorization challenges only. They cannot issue authorization or apply refs.

### 18.4 SSE and security

SSE sequence is durable and strictly increasing per run. Reconnect uses `Last-Event-ID` or a cursor. Duplicates are ignored, gaps trigger bounded catch-up, and cursors below the compaction floor require authoritative reset. Browser state is never authoritative.

Required security:

- loopback-only `127.0.0.1` or `::1`;
- ephemeral port by default;
- one-time fragment bootstrap exchanged for a revocable `HttpOnly`, `SameSite=Strict` cookie;
- CSRF token for every mutation;
- exact Host and Origin checks;
- strict CSP and `nosniff`;
- no CDN, analytics, remote fonts, or third-party scripts;
- rate, stream, pagination, artifact, log, and diff limits;
- redaction before persistence and presentation;
- opaque artifact IDs, immutable digest lookup, realpath containment, and symlink rejection;
- untrusted output rendered as text;
- no secrets or raw paths in DOM, console, network traces, screenshots, or reports.

Remote access is a deferred capability requiring a separate design.

## 19. Reports, cleanup, and failure behavior

### 19.1 Final outputs

Every final, partial, cancelled, failed, rolled-back, quarantined, or indeterminate run produces or retains a pending obligation for:

```text
REPORT.md
manifest.v1.json
contract.v1.json
evaluation-certificates/
fingerprint-certificates/
artifact-index.v1.json
optional arbor-compatibility/
```

Reports include:

- contract and epoch digests;
- development and held-out baselines;
- all trial values, quantization, rounding, aggregation, spread, and comparisons;
- worker claims separated from canonical evidence;
- rejected and malformed evidence;
- candidate, merge-candidate, trunk, winner, predecessor, rollback, and re-promotion OIDs;
- package authorizations and Fabric policy correlations;
- budgets and reservations;
- confinement and fingerprint certificates;
- held-out limitations;
- report-publication and cleanup status.

Every reported score traces to a certificate and artifact digest.

### 19.2 Cleanup

Cleanup is manifest-driven and idempotent:

1. reconcile or stop contained processes;
2. re-resolve containment and repository identity;
3. reject symlink or mount substitutions;
4. verify required reports are published;
5. delete only recorded package-owned resources beneath state root;
6. retain unresolved effects, journals, certificates, fingerprint evidence, reports, and authorization history;
7. record failure as `CLEANUP_PENDING`;
8. never delete source files, refs, worktrees, or unknown resources.

### 19.3 Failure behavior

| Failure | Required behavior |
|---|---|
| Worker invents score | retain as claim; ignore for ranking |
| Protected content changes | reject candidate; retain evidence |
| Traversal or symlink escape | reject and quarantine if uncertain |
| Duplicate dispatch | reservation and dispatch key reject it |
| Spawn-to-attach crash | classify completed, active, absent, or uncertain |
| Agent cancellation | preserve evidence and reconcile descendants |
| Completed child before result commit | recover observation without rerun |
| Malformed evaluator output | invalid evaluation; no fallback |
| Held-out baseline missing or mismatched | promotion prohibited |
| Stale promotion base | rebuild and reevaluate |
| Crash after ref CAS | reconcile journal against actual ref |
| Authorization expired or consumed | no movement; issue a new challenge |
| Web promotion request | intent only |
| Report publication interruption | reconcile generation; do not clean dependencies |
| Cleanup failure | durable cleanup debt |
| Fingerprint mismatch | immediate quarantine |
| Confinement unavailable | refuse real work |
| Held-out isolation unavailable | development research only; promotion disabled |
| Upstream certification absent | fixtures only; no compatibility claim |

## 20. Delivery dependency and blocker matrix

| ID | Owner | Artifact | Gates | Measurable closure |
|---|---|---|---|---|
| B0 | Compatibility lead | `UpstreamCertificationV1` | Phase 1 registration claims, Phase 3 real agents, release | exact file digests and provenance retained; all claimed facts mapped to evidence |
| B1 | Fabric adapter owner | `FabricCompatibilityCertificateV1` | Phase 3 | full supported-version matrix passes, including child correlation and descriptor tests |
| B2 | Domain owner | schema and state-machine package | Phase 1 | schemas compile; all legal and illegal transitions pass model tests |
| B3 | Evaluation owner | strict evaluator protocol and numeric conformance suite | Phase 1 fixtures, Phase 3 real evaluation | single-record parser and decimal boundary vectors pass |
| B4 | Storage owner | migration, journal, report, retention ADR | Phase 2 | migration/replay/report recovery tests pass |
| B5 | Security owner | containment implementation and certificate | Phase 3 | complete adversarial matrix passes on named platform |
| B6 | Git owner | private repository and fingerprint certificate implementation | Phase 3 | 100 dirty-checkout trials and all fingerprint oracles pass |
| B7 | Authorization owner | trusted-principal configuration, CLI, key-storage protocol, schemas | Phase 5 | promotion and rollback issuance, expiry, consumption, and recovery tests pass |
| B8 | Evaluation owner | held-out isolation implementation | Phase 5 production promotion | workers cannot access held-out data, credentials, or capability |
| B9 | Product/security owners | loopback Web threat-model certificate | Phase 1 Web release | auth, CSRF, Host, Origin, CSP, and input-limit tests pass |
| B10 | Release owner | license and provenance decision | distribution | exact reused material and license obligations recorded |
| B11 | Product owner | sealed graduation thresholds | Phase 7 | numeric benchmark, reliability, accessibility, and usability thresholds approved |
| B12 | Operations owner | retention-class table | Phase 6 cleanup release | every outcome has duration, legal hold, and deletion rule |

No phase exits on an undefined set of “blockers.” It exits only when the listed artifacts and tests exist.

## 21. Delivery phases

### Phase 0: architecture and certification contracts

**Deliverables:**

- package/core ADR;
- domain vocabulary and complete state tables;
- bounded public, model, evaluator, gate, and Web schemas;
- decimal and aggregation specification;
- action descriptor inventory;
- storage, migration, report-publication, retention, and cleanup ADRs;
- package-ref and authorization ADRs;
- containment threat model and test plan;
- Web threat model;
- upstream evidence schema;
- sealed benchmark and graduation protocol.

**Exit criteria:**

- B0 evidence format, B2, B3 specification, B4 ADR, B5 threat model, B7 design, B9 design, B10 decision, B11 thresholds, and B12 policy are complete;
- all unsafe admission paths have typed fail-closed outcomes;
- no private pi-fabric import appears in design or lint fixtures;
- upstream claims not yet certified remain labeled assumptions.

### Phase 1: executable deterministic fixture vertical slice

**Depends on:** Phase 0 B2, B3 fixture protocol, and B9.

**Phase-specific actions:**

- `arbor.start`, `inspect`, `claimDriver`, `heartbeat`;
- `signal`, `cancel`, `advance`;
- `reserveAgentDispatch`, `attachAgentChild`, `submitAgentObservation`;
- fixture implementations of workspace materialization, candidate finalization, evaluation, report planning, publication, and observation.

**Concrete fixture driver workflow:**

1. call `arbor.start`;
2. claim a lease and fence;
3. repeatedly call `arbor.advance`;
4. execute each returned typed directive through scripted coordinator, worker, workspace, and evaluator adapters;
5. attach synthetic child correlation before reporting STARTED;
6. submit observations through the same schemas used by production;
7. establish development and held-out fixture baselines;
8. create hypotheses, reserve and complete one attempt;
9. finalize the fixture candidate and create a development certificate;
10. finalize the run without promotion;
11. plan, publish, observe, and verify the report;
12. process pause/resume Web intents only at driver yield points.

`arbor.start` itself performs none of steps 2-12.

**Exit criteria:**

- one fixture run completes from admission through report publication;
- baseline, hypothesis, attempt, candidate, development certificate, final outcome, and report all exist;
- event replay is deterministic;
- browser reconnect loses no durable event;
- stale intent is visibly rejected;
- no Web request executes an effect;
- Web and headless projections match;
- fixture development certificate references exact numeric-policy vectors.

### Phase 2: durable persistence and read model

**Depends on:** Phase 1 and B4.

**Deliverables:**

- SQLite WAL store and migrations;
- artifact CAS;
- commands, events, snapshots, outbox, intents, leases, budgets, effects, report journals, and fingerprint tables;
- read-only degraded mode;
- Compare, Metrics, Resources, Report, and Contract views.

**Exit criteria:**

- reducer replay equals stored aggregate;
- migration, backup, corruption, and newer-schema tests pass;
- corrupt snapshots rebuild from events;
- report publication is atomic, repeatable, and recoverable;
- cleanup cannot remove report dependencies;
- no secret or raw path reaches browser or report fixtures.

### Phase 3: certified isolation and real external agents

**Depends on:** Phases 0-2 and closure of B0, B1, B3, B5, and B6.

**Deliverables:**

- private dissociated repository;
- package-owned workspaces and refs;
- certified OS containment;
- complete fingerprint certificates;
- explicit admitted Fabric driver;
- dispatch reservation, approved spawn, STARTED attachment, observation, and four-way recovery;
- bounded parallel attempts;
- canonical development evaluator;
- process-tree cancellation.

**Exit criteria:**

- public-agent compatibility gate passes;
- child correlation and dispatch crash-gap tests pass;
- descendant confinement inheritance is proven;
- process, namespace, symlink, hard-link, file-descriptor, and absolute-path escape tests fail safely;
- active checkout, Git common directory, and sibling worktrees are absent or read-only;
- system/global/local Git config and hooks cannot escape policy;
- credentials, sockets, devices, and host secrets are inaccessible;
- denied network and package installation attempts fail;
- admitted network and installation behavior is limited exactly to policy;
- 100 consecutive dirty-checkout trials produce valid equal fingerprint certificates;
- three parallel attempts cannot affect one another.

### Phase 4: recovery and detached monitoring

**Depends on:** Phase 3.

**Deliverables:**

- monotonic fences;
- child and process reconciliation;
- stale-callback rejection;
- explicit resume;
- detached monitoring-plus-inbox server;
- complete interruption and retry transitions;
- crash injection at every effect and report boundary.

**Exit criteria:**

- every boundary passes at least 20 consecutive injections;
- completed, active, absent, and uncertain children are classified without blind replay;
- no duplicate dispatch, certificate, accepted outcome, report generation, or cleanup deletion;
- completed work is recovered when observable;
- uncertainty becomes `INDETERMINATE`;
- browser catch-up and reset equal fresh projection;
- every injection has before/after fingerprint certificates tied to effect, fence, containment, and report.

### Phase 5: evaluator-certified promotion and rollback

**Depends on:** Phases 3-4 and closure of B7 and B8.

**Deliverables:**

- detached merge candidates;
- held-out baseline and candidate evaluator;
- protected and required-output certificates;
- promotion and rollback journals;
- trusted-principal authorization CLI;
- one-time promotion and rollback authorizations;
- Fabric write-risk path;
- package winner ref;
- rollback and re-promotion;
- Promotion view and Web intents.

**Exit criteria:**

- held-out baseline and candidate match evaluator, split, epoch, numeric, aggregation, and trust policy;
- actual merge candidate is evaluated;
- malformed, stale, denied, timed-out, expired, consumed, and uncertain cases move no ref;
- every pre/post-CAS injection yields one detectable outcome;
- rollback and re-promotion require separate fresh authorizations;
- no source or user ref changes;
- promotion is disabled if held-out isolation is not certified.

### Phase 6: product and distribution completion

**Depends on:** Phases 1-5 and closure of B10 and B12.

**Deliverables:**

- all required Web views;
- accessible and responsive UX;
- complete reports and manifests;
- retention and cleanup workflows;
- optional semantic codec only if separately scoped;
- packaged release-built frontend;
- installation, migration, recovery, authorization, rollback, cleanup, and uninstall documentation;
- compatibility matrix and certification evidence;
- security, license, and operator runbooks.

**Exit criteria:**

- WCAG 2.2 AA automated and manual checks pass;
- production-built Playwright suite passes;
- representative users complete start-through-finalize without raw SQLite or logs;
- no secret or raw path appears in DOM, console, network, screenshot, or report;
- all distribution license claims trace to retained evidence.

### Phase 7: production hardening and graduation

**Depends on:** all prior phases and B11.

**Deliverables:**

- sealed held-out evaluator or remote service;
- enforceable resource classes and budgets where possible;
- long-duration soak and recovery suites;
- supported-platform certification;
- independent security, accessibility, and license review;
- benchmark comparison against baseline workflows;
- separate designs for any resident mode, remote Web, or user-ref publication.

**Exit criteria:**

- mandatory E2E passes on every supported platform;
- no unresolved critical security or recovery finding;
- held-out isolation passes;
- benchmark, reliability, accessibility, and usability thresholds are met;
- compatibility certification is current.

## 22. Verification program

### 22.1 Domain and numeric tests

Test:

- every legal and illegal transition, including interruption, retry, completion, rollback, report republication, cleanup, and re-promotion;
- revision, fence, lease, and idempotency behavior;
- canonical decimal grammar and normalization;
- half-even rounding vectors;
- maximize/minimize, zero, negative, equality, and minimum boundary;
- median ordering and spread;
- tolerance equality;
- overflow and scale rejection;
- malformed, exponent, `NaN`, infinity, unit, split, parser, and epoch mismatch;
- development and held-out baseline compatibility.

### 22.2 Provider and compatibility tests

Test:

- registration, discovery, replacement, and deactivation;
- descriptor and schema hashes;
- all risk and effect declarations;
- no external adapter use from transactional actions;
- approval modes and timeout;
- cancellation propagation;
- child lifecycle and correlation;
- Schema `enforce` rejection;
- package-boundary lint;
- supported pi-fabric matrix;
- retained exact-file certification evidence.

### 22.3 Git, containment, and fingerprint tests

Use disposable repositories with dirty tracked and untracked state, stash, detached and unborn HEAD, alternate branches, nested and sibling worktrees, stale OIDs, conflicts, path changes, modes, symlinks, traversal, required-output removal, wrong identity, missing workspace, and cleanup interruption.

Adversarial child tests must include:

- descendants and double-forked processes;
- process-group and namespace escape;
- absolute paths, redundant separators, symlink chains, hard links, `/proc/self/fd`, inherited descriptors, and bind-mount aliases;
- source Git config via environment, includes, system, global, local, and worktree config;
- hooks path overrides and hook execution;
- credential helpers, SSH agents, keyrings, cloud metadata, environment secrets, and device files;
- denied network, DNS, Unix sockets, and package installation;
- narrowly admitted network/install policy with exact endpoint/package enforcement.

Every consequential boundary must produce a valid fingerprint certificate. The independent oracle must recompute and match its digests.

### 22.4 Evaluation tests

Test:

- strict single-record output;
- deterministic rerun and median aggregation;
- timeout, cancellation, and descendant termination;
- stderr-only and oversized output;
- truncation and double redaction;
- wrong candidate, baseline, split, evaluator, parser, unit, epoch, or contract;
- forged scores;
- missing or altered artifacts;
- tolerance boundaries;
- held-out data, credential, and invocation denial;
- held-out baseline mismatch.

### 22.5 Crash matrix

Inject termination:

1. after command intent but before effect;
2. after workspace intent but before creation;
3. after workspace creation but before observation;
4. before agent call;
5. after spawn but before child attachment;
6. during active child execution;
7. after child completion but before result commit;
8. after candidate commit;
9. during development baseline or candidate evaluation;
10. after evaluator completion but before certificate commit;
11. after merge-candidate construction;
12. before winner-ref CAS;
13. after winner-ref CAS but before observation;
14. after state commit but before report publication;
15. during report temporary writes;
16. after report rename but before publication commit;
17. during rollback;
18. during cleanup;
19. during outbox publication.

Require one accepted durable outcome, no blind replay, no duplicate child/certificate/ref movement/report, no lost confirmed work, deterministic Web reconstruction, and matching fingerprint certificates.

## 23. Mandatory end-to-end acceptance

Execute once with `maximize` and once with `minimize`.

1. Create an active checkout with dirty tracked changes, untracked files, stash state, sibling worktree, and user refs.
2. Record the complete source fingerprint and certificate.
3. Admit a content-addressed `committedOnly` contract.
4. Import the exact base OID into private storage.
5. Prove worker and evaluator containment denies source and sibling writes.
6. Prove descendant inheritance, process-escape denial, absolute-path variants, Git config and hook isolation, credential/device isolation, and admitted network/install policy.
7. Establish canonical development and held-out baselines.
8. Create three hypotheses and reserve three attempts.
9. Run three attempts concurrently:
   - one valid candidate;
   - one protected-path rejection;
   - one interrupted.
10. Crash after successful child completion but before result commit.
11. Submit or retain Web intents while disconnected.
12. Reconnect from the last durable cursor.
13. Acquire a new fence and reject stale callbacks.
14. Recover the completed child without rerun.
15. Classify the interrupted child and retry its hypothesis as a new attempt.
16. Canonically evaluate exact candidate OIDs.
17. Demonstrate direction handling, equality at minimum improvement, spread boundary, and scientific tie.
18. Construct the actual merge candidate.
19. Evaluate it using the same held-out evaluator, split, epoch, numeric, and aggregation policy as the held-out baseline.
20. Display correct trust labels.
21. Submit Web promotion intent and prove it is not authorization.
22. Issue a candidate-bound authorization through the trusted-principal CLI.
23. Obtain independent Fabric write-risk approval.
24. CAS-update only `refs/pi-fabric-arbor/<run-id>/winner`.
25. Crash immediately after CAS and reconcile without duplicate movement.
26. Issue separate rollback authorization and perform rollback.
27. Issue a new promotion authorization and re-promote.
28. Plan report publication from one committed revision.
29. Crash after state commit and before publication, then recover.
30. Generate and verify report, manifest, contract, certificates, fingerprint certificates, and artifact index.
31. Interrupt cleanup and resume idempotently or retain cleanup debt.
32. Compare Web and headless final projections.
33. Produce a fingerprint certificate before and after every consequential boundary.
34. Mechanically verify every certificate against the independent oracle and bind it to effect, fence, containment identity, and report.
35. Fail immediately on any fingerprint mismatch.

Any unmet step fails acceptance.

## 24. Decisions, implementation blockers, and deferred capabilities

### 24.1 Normative decisions with implementation blockers

- **Held-out isolation:** production promotion requires technically inaccessible held-out data and credentials. B8 gates Phase 5.
- **Strict evaluator output:** one strict structured record with no regex or model fallback is mandatory. B3 gates evaluation.
- **Package promotion destination:** v1 moves only the package winner ref.
- **Storage:** authoritative state uses administrator-selected XDG/profile storage, not source Git metadata.
- **Resume:** v1 uses explicit admitted drivers; resident autonomous execution is deferred.
- **Web deployment:** v1 is loopback-only.
- **Authorization:** promotion and rollback use local trusted-principal signing plus Fabric policy.
- **Initial platform:** real execution is supported only on platforms with a passing containment certificate. The first target is Linux unless another platform independently passes.

### 24.2 Remaining implementation blockers

- certified pi-fabric peer-version range and child-correlation behavior;
- concrete Linux containment adapter and supported kernel/runtime matrix;
- trusted-principal key storage and operational recovery;
- retention durations for each outcome class;
- clean-room versus reused-material licensing evidence;
- numeric graduation thresholds.

### 24.3 Deferred capabilities

These do not block releases that exclude them:

- `dirtyPolicy: "capture"`;
- user-ref publication;
- remote Web access;
- resident background execution;
- semantic Arbor import/export;
- novelty/search agent;
- persistent conversational actor;
- macOS and Windows support;
- evaluator network access beyond denied-by-default policy;
- package installation beyond denied-by-default policy.

## 25. Provenance, licensing, and documentation

### 25.1 Provenance and licensing

**[Assumption]** The proposals identify Arbor as Apache-2.0 and pi-fabric as MIT. Release metadata may promote those to verified facts only after `UpstreamCertificationV1` records exact license-file digests and provenance.

Prefer clean-room semantic implementation:

- cite Arbor as design inspiration;
- retain proposal hashes and certified upstream revision;
- avoid copying code, prompts, tests, schemas, or substantial wording;
- document independent implementation and review.

If material is copied or adapted:

- identify exact files, ranges, revisions, and digests;
- preserve applicable notices;
- mark modifications;
- include required license and attribution files;
- perform release-time legal review;
- generate `THIRD_PARTY_NOTICES.md` from certified evidence.

Do not infer NOTICE obligations from a proposal. Record the inspected upstream NOTICE state and copied-material analysis.

### 25.2 Required documentation

Ship:

- README covering installation, lifecycle, commands, Web UI, safety limits, and trust labels;
- concise package `AGENTS.md`;
- architecture, containment, evaluation, authorization, report, cleanup, and promotion ADRs;
- public contract, event, evaluator, certificate, fingerprint, and Web schema references;
- compatibility matrix and evidence manifests;
- Web security and remote-access exclusions;
- recovery, quarantine, rollback, and operator runbooks;
- migration, retention, cleanup, export, and uninstall guidance;
- licensing, provenance, and third-party notices;
- test-certification report with exact commands, digests, fault counts, and fingerprint evidence.

### 25.3 Upstream inspection targets

The proposal-supplied URLs may seed certification but do not themselves establish verified facts:

- pi-fabric package manifest, public protocol, provider documentation, component documentation, action registry, approval controller, execution service, worktree manager, Mesh store, actor restoration, residency handling, and schema enforcement at proposed revision `1a71fff54d9bfc03de4a8df925df15e65bc82392`;
- Arbor package metadata, license, research skill, hypothesis model, coordinator, executor lifecycle, integrity checks, Git operations, MCP promotion path, checkpointing, human timeout, and Web UI documentation at proposed revision `2f4e65410a5c21c9e55835a9a0d77ead21a64ffa`.

Certification must record exact inspected files and digests, resolve stale or nonexistent paths, run compatibility tests, and downgrade any unsupported assertion to an assumption or remove it.

## 26. Acceptance summary

The architecture is complete only when:

- `arbor.start` remains persistence-only;
- an admitted driver executes the full directive workflow;
- package-issued dispatch intent becomes an approved and correlated Fabric child;
- completed, active, absent, and uncertain children recover without blind replay;
- action risks and effects match actual transaction boundaries;
- development and held-out comparisons use certified same-policy baselines;
- rollback, report republication, cleanup, and re-promotion are legal after completion;
- promotion and rollback authorization are independently issuable and recoverable;
- numeric behavior is integer-deterministic after canonical decimal quantization;
- every public and browser input is bounded and gate-specific;
- containment certification covers descendants, escape paths, Git configuration, hooks, credentials, devices, network, and installation;
- report publication has a complete journal and dependency-preserving recovery path;
- every consequential boundary has a machine-verifiable fingerprint certificate;
- upstream API, behavior, revision, license, provenance, and compatibility claims trace to retained reproducible evidence;
- the first-class Web UI ships under the same safety, recovery, accessibility, and release gates as the orchestration module.