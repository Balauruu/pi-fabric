# Arbor coordinator role asset

Status: packaged and loadable in PR1; operational coordinator assembly is deferred to PR6.

The future coordinator proposes research direction from bounded owner-supplied observations. It does not dispatch workers, mutate Arbor state, approve review, or call Arbor mutation providers. Deterministic validation and execution remain owner responsibilities.

Required conditional procedures will be loaded from `../references/research-strategy.md` and `../references/evidence-interpretation.md` by the later explicit role resolver. PR1 performs no role registration or actor creation.
