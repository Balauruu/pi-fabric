# T1 source audit v2

## Audit boundary
This is a source-audited fact ledger, not an expected answer. “Measured” is a result in a cited source. “Proposed control” is an operational test warranted by the evidence, not a universal prescription. This revision adds the missing raw-primary ToT cost-table accounting and makes the existing S4 matched-independent-restart causal control explicit. No candidate has run.

## Decision-critical facts retained from AUDIT.md

| ID | Evidence class | Audited fact and qualification | Saved locator |
|---|---|---|---|
| F1 | Measured | PaLM-540B GSM8K: eight-manual-exemplar CoT with greedy decoding was **56.9%** vs **17.9%** standard. No end-to-end production cost or latency is reported. | `sources/S1-chain-of-thought.md`, §3.1–3.2, App. B Table 2 |
| F2 | Counterevidence | PaLM-540B MAWPS SingleOp: standard and CoT were both **94.1%**. Smaller models could produce fluent but illogical chains. | `sources/S1-chain-of-thought.md`, §3.2, App. B Table 3 |
| F3 | Measured | GPT-4 Chat Completion, 100 hard Game-of-24 cases, temperature 0.7, task-specific 3-step BFS: IO **7.3%**, CoT **4.0%**, CoT-SC **9.0%**, ToT breadth 1 **45%**, breadth 5 **74%**. | `sources/S2-tree-of-thoughts.md`, §4.1, Table 2 |
| F4 | Measured cost/result, corrected accounting | Game of 24 Table 7: IO best-of-100 **1.8k / 1.0k, $0.13, 33%**; CoT best-of-100 **6.7k / 2.2k, $0.47, 49%**; ToT **5.5k / 1.4k, $0.74, 74%**. Surrounding prose calls 5.5k completion tokens and says it is close to 100 CoT trials, while the table labels the field `Generate/Prompt tokens`. | `sources/S2-cost-tables.md`, Table 7 and `#A2.SS3`, `#A2.T7` |
| F5 | Measured cost/result, added full table | Creative Writing Table 8: IO **0.9k / 0.4k, $0.06**; CoT **0.9k / 0.4k, $0.07**; ToT **4k / 2.9k, $0.32**. The paper says ToT takes around 5× completion tokens and money cost. The main Game-of-24 plus Creative-Writing ToT experiments are reported as **$106** (`0.74×100 + 0.32×100`); cost depends on prompt/search and can require **5–100×** more generated tokens than CoT. | `sources/S2-cost-tables.md`, Table 8 and `#A2.SS3`, `#A2.T8` |
| F6 | Counterevidence | The ToT authors state deliberate search is not necessary for many tasks GPT-4 already performs well and requires more resources than sampling. | `sources/S2-tree-of-thoughts.md`, §6 and App. B.1–B.3 |
| F7 | Measured positional intervention | Across listed long-context models, multi-document QA was U-shaped by answer position. For GPT-3.5-Turbo, worst-case 20/30-document performance fell by >20% and below the **56.1%** closed-book result. | `sources/S3-lost-in-the-middle.md`, §2.1–2.3, Fig. 5, Table 1 |
| F8 | Measured plus counterevidence | Synthetic key-value query repetition: GPT-3.5-Turbo (16K) was **100%** at 300 pairs vs **45.6%** worst case, but this minimally changed multi-document QA and otherwise slightly decreased performance. | `sources/S3-lost-in-the-middle.md`, §3.1–3.2, §4.2, Figs. 7 and 9 |
| F9 | Measured complementarity | PaLM-540B question-only HotpotQA/FEVER: ReAct **27.4 EM/60.9%** vs CoT **29.4/56.3**. CoT-SC→ReAct **34.2/64.6** and ReAct→CoT-SC **35.1/62.0**. ReAct uses a constrained Wikipedia API, not a general retriever. | `sources/S5-react.md`, §3.1–3.3, Table 1 |
| F10 | Measured operational failure evidence | In 200 manually examined HotpotQA trajectories, ReAct had reasoning error **47%** and empty/unhelpful-search error **23%**; CoT had hallucination **56%**. These are study-specific coded categories. | `sources/S5-react.md`, §3.3, Table 2 |
| F11 | Measured repair counterevidence | On HumanEval/APPS, own-feedback repair gains were often modest, heterogeneous, or absent. Stronger feedback improved performance; experienced-programmer feedback increased GPT-4 repaired programs passing all unit tests **1.58×**. | `sources/S4-self-repair-silver-bullet.md`, Abstract, §4–6 |

## Missing decision-critical causal and operational controls now explicit

| Control | Status | Exact source-supported basis and limit |
|---|---|---|
| **Repair must be compared with independent restarts from the same base model at the same program-sample budget.** Record `k = n_p + n_p n_fr` (or `n_p + n_p n_f n_r`) and report the matched i.i.d. baseline. | Proposed causal control | S4 §3.2: “we then compare against a baseline with `k=|programs(T)|` i.i.d. samples” (`sources/S4-self-repair-silver-bullet.md` lines 85–87). Figures 3–4 label the black line “i.i.d. sampling without repair from the same model” and normalize at an equivalent budget (lines 105, 115, 121). This was present in the source but not named as a required local causal control in `AUDIT.md`. |
| **Also compare repair and restart at total generated-token budget, including feedback tokens.** | Proposed causal control | S4 Appendix A says its main pass@k “does not account for the feedback tokens … and so risks overemphasizing” repair (lines 332–334), and defines total program-and-feedback-token pass@t (lines 336–342). Token matching does not make a result general outside its task/model. |
| **Do not treat bootstrap resampling from one large repair tree as fresh independent trial replication.** Record the generation/resampling structure and separately run independent restarts when estimating uncertainty. | Proposed operational control | S4 §3.2: one large repair tree per specification is sub-sampled with replacement; `N_p=50`, `N_f=25`, `N_t=1000` (line 89). S4 limitations explicitly says this “risks introducing statistical artefacts” (line 180). |
| **For ReAct fallback, preserve both arms and their budgets: CoT-SC is 21 sampled CoT trajectories at temperature 0.7 with majority answer; ReAct→CoT-SC is only when no answer arrives within 7 HotpotQA or 5 FEVER steps.** | Proposed operational control | S5 §3.2: exact CoT-SC definition (line 66) and fallback/count condition, including “more steps will not improve ReAct performance” (line 70). The 7/5 rule is conditional fallback logic, not ReAct’s generic sampling count. |
| **Reproduce ReAct’s task interface and prompt construction before attributing effects to the scaffold.** Log question-only input, action API, and the manually composed 6 HotpotQA / 3 FEVER few-shot trajectories. | Proposed operational control | S5 §3.1 defines question-only setting and `search`, `lookup`, `finish` API (lines 52–56). §3.2 specifies random selection and manual composition of 6/3 exemplars (line 62). |

## Exact model definitions checked in this correction

- **ReAct F9/F10:** Table 1 uses **PaLM-540B as the base model** (`sources/S5-react.md`, §3.3 line 80), on question-only HotpotQA and FEVER with the limited Wikipedia API. The retained source does not establish a “frozen PaLM-540B” condition, so that word is not asserted.
- **ReAct CoT-SC/fallback:** **21** CoT trajectories, decoding temperature **0.7**, majority answer. Fallback caps are **7** HotpotQA and **5** FEVER ReAct steps, and the reverse fallback is triggered when the CoT-SC majority occurs fewer than `n/2` times (`sources/S5-react.md`, lines 66, 70).
- **S4 repair:** API endpoints are **gpt-3.5-turbo-0301** and **gpt-4-0314**, plus **CodeLlama-13b-instruct**; all use temperature **0.8**. The source’s no-repair comparison is i.i.d. sampling from the corresponding model (`sources/S4-self-repair-silver-bullet.md`, line 95).

## Corrections and retention

- The existing S2 snapshot remains unchanged. Its caption-only Table 7/8 extraction is supplemented, not overwritten.
- F4 is corrected to the actual Table 7 values and F5 adds the omitted Table 8 values. In particular, no unsupported **14k prompt-token** claim is retained: raw v2 HTML has no `14k` match, and Table 7 gives **5.5k / 1.4k** for ToT.
- The raw source itself captions Table 8 “Cost analysis on Game of 24” despite the `Creative Writing` header. This audit preserves that mismatch rather than repairing it.
- Previous supported CoT, long-context, ReAct, and repair facts are retained above under their original conditions. No claim was widened to make a candidate pass.
