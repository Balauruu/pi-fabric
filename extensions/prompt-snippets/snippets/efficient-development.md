---
name: Efficient Development
description: Development defaults for scoped coding work. Use when implementing, fixing or refactoring.
placement: prepend
order: 30
---

# Efficient Development

Apply this as development-quality policy. Explicit task requirements and the nearest repository guidance take precedence.

## 1. Change the authoritative owner

Before mutation:

1. Identify the observable final state, invariants, and any material missing information or authority.
2. Locate the deepest existing owner that can enforce them.
3. Baseline the predicates at that owner. If they already pass, return a verified no-op.
4. Ask only when missing information, intent or authority would change the correct owner or behavior and cannot be resolved from existing sources.
 
Make the smallest reversible semantic change at that seam. Do not broaden behavior or refactor neighboring code unless an acceptance predicate requires it. Keep each change centered on one production seam. Split independent seams before implementation.

Make the smallest reversible semantic change in the owner. Do not broaden behavior or refactor neighboring code.

Keep one canonical source for each fact or invariant. Query or derive from that source instead of creating independently editable mirrors. Add derived state only when it has a concrete consumer, an authoritative source, and a defined rebuild or invalidation path.

## 2. Justify added mechanisms

Before adding a fingerprint, secondary identity, cache, custom validator, abstraction, registry, compatibility layer, migration establish:

1. the missing guarantee;
2. the observed failure, threat, or boundary requiring it;
3. why the existing owner cannot provide it;
4. who owns its lifecycle, invalidation, recovery or removal;
5. the focused semantic check proving the guarantee.

If these cannot be established, use the existing owner without the new mechanism.

Do not add speculative extension points or compatibility behavior. Require a concrete second variant, current consumer or compatibility obligation.

## 3. Prove behavior, not representation

After the final mutation:

  1. freshly re-observe every material acceptance predicate;
  2. obtain authoritative readback for stateful or ambiguous
writes;
  3. run the strongest affordable verifier independent of the
producing action;
  4. inspect the final diff for unrelated behavior, duplicated
authority, and weakened evaluators.

Use bytewise, source-text, file-list, snapshot, or fingerprint assertions only when that representation is itself the contract. Prefer repository-relative paths and named references and avoid the use of hashes or digests.

Inspect the final diff for unrelated behavior, duplicated authority, and weakened evaluators. If tests or evaluators changed, map those change to acceptance predicates and verify production behavior separately.

## Completion gate

Use the active workflow's native status vocabulary. Never translate partial or missing proof into success.

Claim `completed` or `success` only when:
 - the requested final state holds at the authoritative owner;
 - every added mechanism passed the proportionality test;
 - focused semantic checks and required independent verification pass;
 - every changed resource maps to an acceptance predicate;
 - no unrelated scope, duplicated authority, or weakened evaluator remains;
 - every required broader check is complete.

Otherwise report `failed`, `partial`, `unverified`, or`indeterminate` as appropriate, together with the exact missing predicate, evidence, authority, or tool.

The completion receipt names touched resources, fresh verifier results, required broader checks, and anything unrun.