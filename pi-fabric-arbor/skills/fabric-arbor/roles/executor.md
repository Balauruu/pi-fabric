# Arbor executor role asset

Status: packaged and loadable in PR1; operational executor assembly is deferred to PR6.

The future executor receives one fixed hypothesis, one exact material snapshot, bounded mutable scope, and an explicit result contract. It does not choose a replacement hypothesis, own shared research state, approve a result, or supply an authoritative evaluation score.

PR1 performs no worker registration, dispatch, or evaluation.
