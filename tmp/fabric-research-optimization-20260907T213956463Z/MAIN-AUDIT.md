# Independent Main audit

## F1: Requirement IDs were detached from meanings

`runs/research-great-llm-prompts-20260907T183938Z/streams/techniques-evidence.md`, Question/scope/status and Coverage/gaps, explicitly says RQ2 and RQ6 lack supplied definitions and cannot be mapped to separate conclusions. The full definitions exist in that run's RESEARCH.md under Required questions. The worker still produced substantive research. This is evidence of a handoff contract failure, not a source shortage.

Acceptance: each assigned ID travels with its exact question text, required inclusions, expected report contribution, and decision context. A semantic check rejects unknown/missing/mismatched IDs before dispatch. Evaluation should catch a worker that merely echoes an ID as covered.

## F2: More report-supporting structure in the legacy artifact

`/data/AI/docs/agent-performance-beyond-model-selection.md` has detailed evidence and operating chapters (line 78 onward), quantitative synthesis (175), failure-signal-to-intervention matrix (192), reusable artifacts (213), integrated policy (321), local evaluation (347), gaps (374), and source appendix (393). Specific chapters pair failure mechanisms, bounded measured interventions, transfer limits, and operating implications. Its reference skill requires extracting evidence into final report slots and makes a source appendix explicit for decision-grade reports.

The current prompt report has question-oriented analysis and citations, but places a large separate workflow/verification narrative in RESEARCH.md and often points to stream notes for fuller methodology. Test preserving decision-relevant measurements, applicability, failure conditions, counterevidence and useful operating detail in the one authoritative report. Do not concatenate raw streams or mandate this particular topic's taxonomy for all research.

## F3: Current policy differs from requested execution

Current researcher.md specifies thinking high and runtime.md extends high-thinking policy to other roles. User now explicitly requires openai-codex/gpt-5.6-terra at medium. Verify all trial descendants, not just trial coordinator selection.

## F4: Historical size does not establish quality or speed

Observed counts: legacy agent-performance report 6998 words, other legacy reports 3709-5966 words. Current prompt REPORT 3677 words plus administrative RESEARCH 2816 words and seven stream documents approximately 14015 words. Architecture REPORT is 5192 words. These are different topics and unknown original execution conditions. Do not conclude every current artifact is shorter or worse, nor infer elapsed time from file timestamps. The matched trials are needed.

## Evaluation cautions

Predefine expected question-level content independently of skill-specific formatting. Audit factual and citation support, not only instruction compliance. Reject unsupported expansion even if a report looks deeper. Version candidate packages so their reference links/templates resolve to the tested variant. Preserve historical source materials read-only. Retain best candidate, and independently verify actual requested no-improvement streak from real trial evidence.
