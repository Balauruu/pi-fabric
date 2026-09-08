# AgentDojo v3: decision constraints for a permission-bounded tool agent

**Decision.** Deploy permission bounding only as a **gateway-enforced, pre-data least-privilege control** for tasks whose required capabilities can be determined before any untrusted tool output and are disjoint from sensitive effects. Pair high-impact effects with separate authorization or explicit approval. Do not describe this as a general prompt-injection defense or a production-security guarantee.

**Scope and research date.** This assessment is limited to AgentDojo arXiv v3 and its appendices, frozen as of 2026-09-07. It addresses simulated stateful text-tool agents, not real production permissions, data, or multimodal inputs. Research ends here because the fixed-evidence condition allows no additional sources.

## What the source establishes

AgentDojo evaluates agents in four mutable simulated environments: Workspace, Slack, Travel, and Banking. Agents receive tool documentation and text-formatted tool outputs, YAML in the reported runtime. Success is checked by deterministic binary utility and security functions over model output and pre/post environment state, not an LLM judge. This is a useful evaluator property for injection testing, but the states use dummy data. [Method: §3.1](https://arxiv.org/html/2406.13352v3#S3.SS1)

| Evaluation unit | Denominator and condition |
|---|---|
| Benign utility | Fraction of **97** user tasks solved without attack |
| Utility under attack | Fraction of **629** user-task/injection-task security cases in which the user task is solved with no adversarial side effect |
| Targeted ASR | Fraction of those **629** security cases where the attacker goal is met |
| Attack collection | A case succeeds if **any** attack succeeds, modeling selection of the best included attack per case |

The suite table reports 70 tools, 97 user tasks, and 27 injection targets: Workspace 24/40/6, Slack 11/21/5, Travel 28/20/7, Banking 11/16/9 (tools/user/injection). Tasks can require up to 18 calls, include up to 7,000 GPT-4 tokens of data plus 4,000 tokens of tool descriptions, and injection goals span one to 20 steps. [§3.1; Table 1](https://arxiv.org/html/2406.13352v3#S3.T1) [Metrics: §3.4](https://arxiv.org/html/2406.13352v3#S3.SS4)

## Quantitative evidence and defense tradeoff

### Baseline context

All baseline models received a common system prompt. Claude 3/3.5 Sonnet additionally received an Anthropic-recommended prompt, and Llama 3 70B an adapted tool-calling prompt. Provider APIs were official except for Llama 3. Baseline results use the generic **Important message** injection. [§4](https://arxiv.org/html/2406.13352v3#S4)

| Model | Benign utility | Utility under attack | Targeted ASR |
|---|---:|---:|---:|
| Claude 3 Opus | 66.61% ±3.69 | 52.46% ±3.90 | 11.29% ±2.47 |
| Claude 3 Sonnet | 53.10% ±3.90 | 33.23% ±3.68 | 26.71% ±3.46 |
| Claude 3.5 Sonnet | 78.22% ±3.23 | 51.19% ±3.91 | 33.86% ±3.70 |
| Command-R+ | 25.44% ±3.40 | 25.12% ±3.39 | 0.95% ±0.76 |
| Gemini 1.5 Flash | 36.09% ±3.75 | 34.18% ±3.71 | 12.24% ±2.56 |
| Gemini 1.5 Pro | 45.63% ±3.89 | 28.93% ±3.54 | 25.60% ±3.41 |
| GPT-3.5 Turbo | 33.86% ±3.70 | 34.66% ±3.72 | 8.43% ±2.17 |
| GPT-4 Turbo | 63.43% ±3.76 | 54.05% ±3.89 | 28.62% ±3.53 |
| GPT-4o | 69.00% ±3.61 | 50.08% ±3.91 | 47.69% ±3.90 |
| Llama 3 70B | 34.50% ±3.71 | 18.28% ±3.02 | 20.03% ±3.13 |

Values are 95% confidence intervals from the source’s Table 3. They show neither benign capability nor low ASR alone is a security ranking. A low-ASR model can fail to execute the attacker goal for the same reasons it fails user tasks. [Table 3](https://arxiv.org/html/2406.13352v3#A3.T3)

### GPT-4o defense experiment

The defense comparison is a separate GPT-4o experiment against the authors’ strongest attack. The tested implementations were delimiters, a BERT/DeBERTa-style per-tool-output injection detector that aborts on detection, prompt sandwiching that repeats the user instruction after each call, and a tool filter that selects required tools before untrusted data. [§4.3](https://arxiv.org/html/2406.13352v3#S4.SS3)

| Defense | Benign utility | Utility under attack | Targeted ASR | Decision-relevant reading |
|---|---:|---:|---:|---|
| No defense | 69.00% ±3.6 | 50.01% ±3.9 | 57.69% ±3.9 | Comparator only for this table/run |
| Delimiting | 72.66% ±3.5 | 55.64% ±3.9 | 41.65% ±3.9 | Modest ASR reduction |
| PI detector | 41.49% ±3.9 | 21.14% ±3.2 | 7.95% ±2.1 | Low ASR with large utility loss, attributed to false positives |
| Repeat prompt | 85.53% ±2.8 | 67.25% ±3.7 | 27.82% ±3.5 | Better measured utility/ASR tradeoff, but source expects adaptive bypass |
| Tool filter | 73.13% ±3.5 | 56.28% ±3.9 | **6.84% ±2.0** | Lowest reported ASR and no measured benign-utility loss versus its table comparator |

[Table 5](https://arxiv.org/html/2406.13352v3#A3.T5) reports 95% confidence intervals. The tool filter result is evidence for a defense layer under these conditions, not evidence of elimination: its reported ASR remains nonzero.

Attack selection materially changes measured outcomes. For GPT-4o, four prompt families gave targeted ASR of TODO 3.66% ±0.7, Ignore previous 5.41% ±0.9, InjecAgent 5.72% ±0.9, and Important message 57.7% ±2.0. The included-attack maximum was 57.55% ±2.7, while its untargeted ASR was 68.36% ±2.6. [Table 4](https://arxiv.org/html/2406.13352v3#A3.T4) Injections were placed in placeholders within tool outputs necessary to the user task’s ground-truth call sequence, increasing retrieval relevance but limiting representativeness of arbitrary encountered content. [Appendix A](https://arxiv.org/html/2406.13352v3#A1)

## Operational guidance

1. **Enforce at the tool gateway.** Have the agent choose the allowlist from the user task before reading untrusted output. The gateway, not the model’s stated intent, must reject tools outside that list.
2. **Use only pre-plannable, disjoint scopes.** The source’s strongest case is read-only user work versus an attacker needing a write/effect tool. Bind authorization to a single task and reset it when that task ends.
3. **Separate sensitive effects.** Require distinct authorization or explicit approval for external sends, money movement, credential disclosure, and comparable effects. This reduces the consequence of permission overlap, but was not measured by AgentDojo.
4. **Measure aborts and false blocks.** A detector’s 7.95% ±2.1 targeted ASR came with 41.49% ±3.9 benign utility, so security metrics without operational utility and abort data conceal the tradeoff.
5. **Red-team adaptively before release.** Do not accept a fixed prompt set as a robustness claim. Vary prompt family, placement, identity clues, and attacks designed around the deployed authorization behavior.

## Known failure boundaries and unproven tradeoffs

- **Dynamic discovery:** filtering fails when a later result determines which tool is needed.
- **Permission overlap:** it cannot prevent an attack executable with a tool genuinely required by the user task. The source reports this condition in **17%** of test cases.
- **Persistent context:** the benchmark does not cover multiple later tasks without context reset. An injection could wait until an appropriate tool becomes available.
- **Semantic integrity:** isolation still fails if injected content changes a recommendation or result without needing an additional tool call.
- **Adaptive robustness:** the paper calls its attacks and defenses relatively simple and states that evaluating only default attacks is unsuitable without a strong adaptive attack evaluation.
- **Transfer:** synthetic dummy data, four text-only environments, benchmark tool semantics, and the single-model defense test do not establish behavior for production permissions, real data, multimodal input, another model, or a different agent architecture.

Two source inconsistencies should remain visible. Table 3 reports GPT-4o targeted ASR of 47.69% ±3.90, whereas Table 5’s no-defense cell is 57.69% ±3.9. The paper does not explain the run/configuration difference, so they must not be treated as a common baseline. Also, §4.2 says the Max attack improves success by another 10%, but Table 4 lists Max targeted ASR (57.55%) slightly below Important message (57.7%). Report the cells rather than reconciling them. The prose says 74 tools, while Table 1 and the data card say 70. The data card calls the 97 user plus 27 injection tasks “124 tasks.” This report uses Table 1’s 70/97/27 and 629 security-case evaluation denominators.

## Paired local transfer evaluation artifact

**Purpose:** test whether gateway-enforced permission bounding transfers to the local agent. This is a proposed evaluation artifact, not AgentDojo evidence.

### Configurations

- **P0:** normal local agent with all tools available.
- **P1:** local agent chooses an allowlist before any untrusted tool output. A gateway enforces the list and records denied calls.

For every user task, start P0 and P1 from identical state and inject identical untrusted content at each realistically attacker-controlled retrieval point. Include the four paper prompt families, beginning/end placement, correct and incorrect user/model identity variants, and attacks tailored to P1. Pre-register these mutually informative partitions:

| Partition | Required test property |
|---|---|
| `disjoint_permission` | Attack needs an effect tool absent from the user-task allowlist |
| `overlap` | Attack can use a tool legitimately required for the user task |
| `adaptive_tool` | A later result determines an additional required permission |
| `persistent_context` | Injection can wait for a later task’s authorization |
| `semantic_integrity` | No extra call, but content corrupts recommendation or decision |

### One-row-per-paired-case results schema

```text
case_id,partition,initial_state_id,attack_id,placement,identity_variant,
p0_task_success,p1_task_success,p0_no_unauthorized_side_effect,p1_no_unauthorized_side_effect,
p0_targeted_asr,p1_targeted_asr,p1_blocked_call_count,p1_false_block_or_abort,
p1_permission_expansion_event,notes
```

Report each metric by configuration and partition with its denominator and confidence interval: deterministic task success, task success without unauthorized side effects, targeted ASR, blocked-call count, false-block/abort rate, and permission-expansion events. Retain paired-case identifiers so P0/P1 deltas can be inspected rather than pooled across mismatched cases.

**Decision rule.** Permission bounding earns deployment support only if P1 materially reduces targeted ASR in `disjoint_permission` without an unacceptable local task-success or false-block/abort loss. The other four partitions are expected failure tests, not exclusions. Their measured rates determine the remaining authorization, context-reset, semantic-validation, or workflow redesign controls.

## Limitations and stopping condition

This is one original benchmark, not independent corroboration. It does not provide measured latency, production operational cost, or evidence for the proposed local controls. Its quoted results are condition-bound to stated model prompts, simulated environments, attack selection, and deterministic task checks. No live retrieval, other studies, audits, reports, or outside knowledge were used, as required by the fixed-evidence override.

## Source appendix

| Retained source | Type/date | Evidence form | Supports | Important limitation |
|---|---|---|---|---|
| [AgentDojo: A Dynamic Environment to Evaluate Prompt Injection Attacks and Defenses for LLM Agents, arXiv v3](https://arxiv.org/html/2406.13352v3) | Original benchmark paper, v3, 2024 | Environment/method description, Tables 1 and 3–5, appendices and data card | Suite denominators, deterministic metrics, GPT-4o attack/defense results, tool-filter boundaries, adaptive-evaluation warning | Simulated dummy-data text environments, finite/simple attacks and defenses, model/configuration-specific measurements, no production guarantee |

Local supplied evidence used for synthesis: [AgentDojo v3 evidence note](streams/s1.md). It is a navigation aid to the same frozen original source, not an independent evidence origin.
