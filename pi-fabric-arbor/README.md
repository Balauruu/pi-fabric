# pi-fabric-arbor

Source-loaded, owner-led research for Pi and Fabric. PR12 is published; the [hard-cutover gate](docs/pr13-cutover-evidence.md) records PR13 verification and limits. The v1 architecture is removed, not migrated.

## Use

Follow [consumer installation](docs/consumer-installation.md) and [material, research and grounding configuration](docs/research-configuration.md) with the declared project environment. Node 24+, compatible Pi/Fabric and runtime `tsx` are required. No build, certificates, legacy history or profile-local benchmarking skill is needed.

The owning Pi session uses `/arbor` for intake, selection, setup, research, pause/steer/cancel, explicit resume, review, source apply/undo and export generation. Commands use ordinary Fabric permissions; real owning-Pi review is a separate requirement. CLI and browser are strictly read-only, with no attachment transport.

- A persistent proposal-only actor chooses hypotheses; the operational owner reserves effects, dispatches native workers, collects exact handles and commits domain facts.
- Code, instructions and data/recipe material use isolated owned candidates while preserving dirty source/index/refs. See [runnable example packs](examples/README.md).
- Exact-snapshot grading compares against the current incumbent. Invalid evidence, uncertainty, ties and held-out loss cannot become measured wins. Final validation is separately selected.
- Search supports bounded serial/parallel waves, directions, exploration/convergence, evidence-linked lessons and trajectories. Optional finite literature sources retain visited text and native provenance, not novelty judgments.
- Pending review never self-approves. Partial continuation and source apply/undo preserve exact identities and user receipts. Unknown native handles block without redispatch.
- Pi, CLI and browser share transactional projections, diffs, replay and existing artifacts. Report/JSON/trajectory generation stays owner-only. Participant/log views remain Fabric-owned.

## Ownership and lifetime

One configured passive `arbor` application registers operational `arbor.owner` and non-operational `arbor.drain`. The owner retains the original captured public call seam and signal. The guard acquires `arbor_lifetime.lease`; it owns no research or participant registry.

New mutations require the current generation's acquired lease and active guard. Retirement closes admission, then scoped disposal settles actual work before native owner unload/abort. Supporting storage closes with the eventual provider. Reload root `arbor`; owner-only and universal dependency/provider replacement are unproven. Catalog maintenance remains quiescent.

The [manifest](docs/pr3-action-manifest.json) lists 21 ordinary refs plus the scoped capability, schemas, caller intent, risk/effect and commands. Exactly one [public skill](skills/fabric-arbor/SKILL.md) is registered. Three internal roles and [eleven upstream skill dispositions](docs/role-maintenance.md) are packaged, not separately discovered skills.

## PR10 grounding, lessons and trajectories

Grounding remains optional, with finite descriptor-bound search/fetch and exact native literature provenance. See [grounding configuration and closed schemas](docs/research-configuration.md#grounding-configuration-and-schemas) for profile catalog preparation, risk/effect requirements and reload rules. `/arbor lessons` retrieves source-linked hypotheses to retest, not grades. Owning-Pi exports retain actual proposal/action/outcome trajectories; CLI/browser only retrieve existing artifacts. This stable section anchor also supports the shipped example guide.

## Development

From a development checkout, not as installed-runtime prerequisites. The audit consumes exit-checked logs from **all** retained native lanes; follow the [complete retained-gate recipe](docs/pr13-cutover-evidence.md#reproduce-the-complete-gate), not only the individual entrypoints below:

```sh
npm ci --ignore-scripts
npm run check
npm run test:pr13
npm run test:pr13:e2e
npm run audit:pr13
npm pack --ignore-scripts --json
```

Normal tests are source-executed; both typechecks are no-emit. Prior production native lanes remain available from PR2 through PR12. PR13 runs the full source/installed browser/lifetime gate and all three source/installed example packs. Native execution is real; experiment inference is deterministic local fixture code, not paid research or downloaded datasets. The unchanged A12 timing lane runs separately without competing test workloads; the complete cutover audit also requires fresh PR2–PR10 native exits.

The v1 test runtime and obsolete milestone audit scripts are deleted. Useful arithmetic, dirty-source, transaction, recovery and artifact assertions use current interfaces. Repository-only milestone evidence is historical, not a current release gate; current acceptance belongs in the ledger and cutover evidence.

Existing user databases, keys, workspaces and artifacts are neither imported nor deleted. Only tracked package-owned legacy code/test payloads are removed. Source rollback uses Git, not a second runtime. Applicable attribution text is retained without a certification workstream.
