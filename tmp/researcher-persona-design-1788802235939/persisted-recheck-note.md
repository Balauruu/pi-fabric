# Research note: persisted-recheck

## 1. Question, scope and status

**Assignment ID:** persisted-recheck  
**Required questions:** Q1 - validity of preferring B's 90% over A's 80%; Q2 - evidence needed to resolve that comparison.  
**Scope:** Complete authorized corpus is the local synthetic fixture only. No external research.  
**Status:** complete - the corpus supports a qualified non-ranking conclusion.

## 2. Findings and analysis

### Q1 - Does B's 90% justify preferring it over A's 80%?

**No.** The percentages are not a valid like-for-like basis for preference. A's 80% is from 20 TypeScript tasks using M1 with one attempt per task, while B's 90% is from 50 Python tasks using M2 with three attempts per task. Task language/population, model, attempt budget, and denominator differ. The 10-point difference therefore does not isolate a system difference. Neither result supplies an uncertainty estimate or independent reproduction. [Local synthetic fixture](file:///home/balauru/.pi-profiles/fabric/tmp/researcher-persona-design-1788802235939/fixture.md#system-a) [B evidence](file:///home/balauru/.pi-profiles/fabric/tmp/researcher-persona-design-1788802235939/fixture.md#system-b)

This does not show A is better or that B has no advantage. It shows only that the supplied figures cannot establish the requested preference.

### Q2 - What evidence would resolve the comparison?

A matched evaluation: run A and B on the same representative task set, with the same model/configuration where applicable, identical attempt/action budgets, the same success definition and grader, and reported denominators. Report uncertainty (for example, confidence intervals) and preferably independently reproduce the result. For a deployment decision, add production outcomes, a security audit, and decision-quality measurements, all absent from the corpus. [Missing-evidence statement](file:///home/balauru/.pi-profiles/fabric/tmp/researcher-persona-design-1788802235939/fixture.md#missing-evidence)

## 3. Evidence and source notes

**S1 - [Synthetic researcher test evidence (local)](file:///home/balauru/.pi-profiles/fabric/tmp/researcher-persona-design-1788802235939/fixture.md)**, inspected in full.

- **System A:** reported 80% success on 20 TypeScript tasks, M1, one attempt; no uncertainty estimate or independent reproduction.
- **System B:** reported 90% success on 50 Python tasks, M2, three attempts; no uncertainty estimate or independent reproduction.
- **Corpus limitation:** no matched comparison, production outcomes, security audit, or decision-quality measurement.

The fixture explicitly labels itself synthetic and not evidence about real products. The statements above are reported results within this local corpus, not independently verified performance claims.

## 4. Counterevidence and alternatives

The only apparent pro-B evidence is its higher reported percentage (90% versus 80%). It cannot overturn the non-ranking conclusion because the conditions differ materially. No counterevidence establishing A's superiority was supplied or sought outside the authorized corpus.

## 5. Coverage and gaps

| Required question | Disposition | Basis |
| --- | --- | --- |
| Q1 | qualified | The values are documented, but their differing tasks, models, and attempt budgets make ranking unsupported. |
| Q2 | supported | The corpus identifies the missing comparison and outcome evidence; matched conditions and uncertainty/reproduction are necessary to resolve it. |

**Decision-changing unknowns:** comparative performance under matched conditions; uncertainty around both rates; independent reproducibility; production, security, and decision-quality outcomes.  
**Smallest useful next check:** a controlled, matched A/B evaluation with equal task set, model/configuration, attempt budget, success definition, and grader, reporting denominators and uncertainty.  
**Stop reason:** the complete authorized local corpus was inspected once; Q1 and Q2 are addressed and further retrieval is out of scope.
