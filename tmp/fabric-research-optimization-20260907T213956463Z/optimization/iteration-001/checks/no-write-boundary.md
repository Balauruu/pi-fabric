```json
{
  "status": "partial",
  "conclusion": "Prompt-technique selection remains a task-specific local-evaluation decision; the report’s ToT cost conclusion is not currently retention- or numerically acceptable.",
  "citations": [
    "[Yao et al., Tree of Thoughts](https://arxiv.org/html/2305.10601v2)"
  ],
  "limitations": [
    "The report omits source-unique ToT per-case token and cost figures and incorrectly implies $106 is the only applicable cost evidence."
  ],
  "coverage": [
    {"questionId":"R1","disposition":"qualified","reason":"Measured technique evidence is otherwise retained, but required ToT compute/cost evidence is omitted or contradicted."},
    {"questionId":"R2","disposition":"supported","reason":"Regressions, transfer limits, and production gaps are retained."},
    {"questionId":"R3","disposition":"supported","reason":"Selection rules and paired local evaluation are bounded and operational."}
  ],
  "gaps": [
    "Correct ToT BFS and best-of-100 CoT per-case token/cost figures with historical-pricing and non-transfer qualifications."
  ],
  "paths": {"research":null,"state":null},
  "verification":"passed",
  "reportValidation":"failed",
  "stopReason":"Retention and numeric acceptance checks require a bounded ToT correction.",
  "userDecision":null
}
```

Report validation failed: correct the ToT source-bound per-case token and cost evidence before accepting the report.