# PlanF3 full Visual Explainer benchmark

Focused one-run comparison using `openai-codex/gpt-5.6-sol`. Timing and token telemetry were unavailable.

| Configuration | Assertions | Score |
| --- | ---: | ---: |
| Old skill | 3 / 9 | 33.3% |
| New skill | 9 / 9 | 100% |

**Improvement: +66.7 percentage points.**

The old skill preserved lifecycle behavior but could not supply a runtime marker, adaptive theme controls, Mermaid/ELK, Chart.js, slides, or share/download interactions. The revised skill passed both focused evals and the validator, with browser evidence for adaptive themes, responsive layouts, Mermaid/ELK, Chart.js, slide controls, download reopening, share fallback, and desktop/mobile overflow.

This benchmark covers two presentation-focused scenarios with one run per configuration; it is not a broad model-performance claim.
