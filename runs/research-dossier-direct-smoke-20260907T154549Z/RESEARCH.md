# Evaluation research notes: Sunscreen and prevention of skin aging

## Brief

- **Evaluation label:** evaluation research
- **Question:** What does the randomized trial *Sunscreen and prevention of skin aging* (PubMed PMID 23732711) establish about daily sunscreen and skin aging, and what does it not establish about a particular commercial facial sunscreen?
- **Scope:** Trial-level causal evidence, its measured outcomes, duration, reported uncertainty, and limits on transferring results to an unspecified commercial facial sunscreen. No personal medical advice or product recommendation.
- **Primary source starting point:** https://pubmed.ncbi.nlm.nih.gov/23732711/
- **Research date:** 2026-09-07 UTC

## Required questions

1. What population, intervention, comparator, follow-up period, endpoint, and analysis did the randomized trial use?
2. What result and uncertainty did it report, and what is the narrow causal conclusion?
3. What does the study not measure or establish about a particular commercial facial sunscreen?

## Approach and stop rule

Inspect the PubMed primary record first, then seek accessible primary full-text or publisher support for methods/results and one primary trial-design/support record if it resolves a material detail. Stop after direct evidence adequately supports the requested narrow interpretation or the maximum of six retrieval invocations is reached. Retrieval count includes failures.

## Execution ledger

| Step | Status | Retrieval count | Notes |
| --- | --- | ---: | --- |
| Dossier opened | complete | 0/6 | Direct research only; no delegation. |
| Source discovery/schema inspection | complete | 0/6 | Non-retrieval tool discovery only. |
| PubMed primary record | partial | 1/6 | Readable extraction failed; direct NCBI E-utilities record is the smallest recovery check. |
| Primary supporting material | partial | 5/6 | Publisher was 403-blocked; abstract-level primary evidence retained and full-text limits explicit. |
| Synthesis and report verification | complete | 5/6 | Report drafted from P1 only; primary-access gaps and transfer limits checked explicitly. |

## Direct source notes

*Source notes follow.*
### Retrieval log: R1 - PubMed landing page (partial access)

- **URL/type/date:** https://pubmed.ncbi.nlm.nih.gov/23732711/ - NCBI PubMed landing page for the specified primary article; retrieved 2026-09-07 UTC.
- **Outcome:** The readable extractor returned no article content (response ID `mtrey1b26ozdtg`; `successful: 0`; “Could not extract readable content from HTML structure”). This is an access failure, not evidence against the trial or any claim.
- **Next check:** Retrieve the same PubMed record through NCBI’s public E-utilities XML endpoint to inspect the record’s abstract and bibliographic fields.



### Source P1 - NCBI PubMed primary record (full abstract)

- **URL/type/date:** https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&id=23732711&retmode=xml - NCBI E-utilities XML for the PubMed record of Hughes MC, Williams GM, Baker P, Green AC, *Annals of Internal Medicine* 158(11):781-790, 2013, DOI [10.7326/0003-4819-158-11-201306040-00002](https://doi.org/10.7326/0003-4819-158-11-201306040-00002); retrieved 2026-09-07 UTC (response ID `mtreyhc4eqe9pz`). This is the indexed record and author abstract for the primary randomized trial, not its full text.
- **Inspected support (verbatim abstract passages):** “Randomized, controlled, community-based intervention” in Nambour, Australia; “903 adults younger than 55 years out of 1621 adults randomly selected from a community register”; “Random assignment into 4 groups: daily use of broad-spectrum sunscreen and 30 mg of β-carotene, daily use of sunscreen and placebo, discretionary use of sunscreen and 30 mg of β-carotene, and discretionary use of sunscreen and placebo.” The endpoint was “Change in microtopography between 1992 and 1996 ... graded by assessors blinded to treatment allocation.”
- **Measured result:** The abstract reports: “The daily sunscreen group showed no detectable increase in skin aging after 4.5 years.” Relative to discretionary sunscreen, “Skin aging from baseline to the end of the trial was 24% less” with relative odds **0.76 (95% CI 0.59 to 0.98)**. The result concerns the assessed microtopography/photoaging endpoint, not a self-reported or clinical wrinkle score and not a named commercial product.
- **Stated uncertainty/limits:** The abstract itself says, “Some outcome data were missing, and power to detect moderate treatment effects was modest.” The interval excludes 1.00 but is close to it at the upper bound, so it supports a modest relative reduction in the trial endpoint while leaving the magnitude imprecise. The no-detectable-increase statement should not be read as proof of zero aging.
- **Interpretation:** Randomization and blinded outcome grading support a causal inference for the trial regimen versus discretionary use in this community and age range over 4.5 years. It does **not** identify the product formula, sun-protection factor, application amount, adherence, facial-only result, or long-term effect beyond the trial period from the abstract alone.
- **Gap/next check:** Seek the trial registry or full article/publisher material for the protocol’s sunscreen specification, instructed application sites/schedule, and outcome scale, which are material to transfer to a specific facial product.


### Retrieval log: R3 - targeted web discovery

- **Query/date:** `"Sunscreen and prevention of skin aging" Hughes 2013 trial Nambour SPF 15 full text`; retrieved 2026-09-07 UTC (search ID `mtrez50p0gbivz`).
- **Finding and disposition:** The search located the original PubMed record, an Europe PMC abstract mirror, publisher/indexing pages, an apparent University of Queensland repository listing, and secondary summaries. Search snippets are discovery only, not support for regimen details. The registry identifier reported in P1, **ACTRN12610000086066**, is the most direct next primary source.
- **Next check:** Directly fetch that registry record.


### Retrieval log: R4 - trial registry (access blocked)

- **URL/type/date:** https://www.anzctr.org.au/ACTRN12610000086066.aspx - primary trial registry record cited by the article; retrieved 2026-09-07 UTC (response ID `mtrezkftgd24a3`).
- **Outcome:** HTTP 403 Forbidden. No registry fields were inspected. This blocks confirmation of product specification, sites, schedule, and protocol details from the registry; it does not weaken the abstract’s reported result.
- **Next check:** Attempt direct retrieval of the article’s publisher DOI landing page for the primary full text or a detailed abstract.


### Retrieval log: R5 - publisher primary article page (access blocked)

- **URL/type/date:** https://www.acpjournals.org/doi/10.7326/0003-4819-158-11-201306040-00002 - publisher page for the primary article; retrieved 2026-09-07 UTC (response ID `mtrezz3n00zykd`).
- **Outcome:** HTTP 403 Forbidden. No full article text, tables, product specifications, adherence data, absolute outcome data, or protocol details were inspected.
- **Stop decision:** Five retrieval invocations were used: two successful (NCBI E-utilities record and targeted discovery) and three inaccessible/failed (PubMed landing-page extraction, registry, publisher). The NCBI primary-record abstract directly answers the requested outcome, duration, and reported uncertainty. The uninspected full text leaves regimen-specific and product-transfer details unknown. The sixth call is reserved rather than spent on a secondary restatement; that would not resolve the primary-source gap.

## Verification decisions and gaps

- **Retained causal claim:** P1’s randomized, controlled design, daily-versus-discretionary contrast, and blinded microtopography grading support the narrow conclusion that the trial regimen was associated causally with less measured photoaging over 4.5 years in its enrolled population. [Source P1](#source-p1---ncbi-pubmed-primary-record-full-abstract)
- **Qualified quantitative claim:** Retain the relative-odds result, 0.76 (95% CI 0.59 to 0.98), exactly as reported. Do not translate it into an absolute reduction, prevented wrinkle count, or individual probability because the inspected abstract supplies none.
- **Rejected transfer claim:** Do not infer performance of an unspecified commercial facial sunscreen. P1 names only broad-spectrum sunscreen and does not, in the inspected material, specify a branded/formulated product, facial-only regimen, exposure conditions, application amount, adherence, or an outcome measured specifically on the face.
- **Unresolved primary-source gap:** Registry and publisher access were blocked (R4-R5). Thus exact sunscreen specification, protocol regimen, raw/absolute endpoint data, attrition handling, and subgroup effects remain unverified in this dossier.

## Completion

Direct research complete at **5/6 retrieval invocations**. No delegation was used.

