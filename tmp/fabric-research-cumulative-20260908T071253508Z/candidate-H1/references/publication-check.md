# Source-grounded publication check

Run after decision-grade synthesis. Main owns the check state. The synthesizer remains the sole author of the authoritative `RESEARCH.md`. Check records and pre-correction copies are supporting evidence, never competing reports.

## Independent material check

Launch one direct leaf with the explicit model, thinking and grants in [runtime](runtime.md). Supply the original questions and required output, all source notes and limitations, the actual report (path or complete inline text), and this reference. The checker has no writing or delegation authority and does not see another checker's verdict.

The checker reads the actual report and decisive original passages, including table headers, comparator populations, methods and qualifications. It checks whether conclusions are supported and whether omitted evidence would change the recommendation, comparison or operational control. Source notes are not ground truth. For a fixed-evidence task, stay inside the supplied corpus. For live research, targeted retrieval may verify an existing claim but must not expand the topic.

Return one verdict: `accept`, `correct`, or `reject`. For each material defect return an ID, exact report passage, decisive source passage and locator, why the defect changes interpretation or action, and the smallest supported correction. If sources conflict, preserve that conflict rather than choose a value by plausibility. Missing evidence is an explicit gap, not a requested invented answer. Do not request stylistic rewrites, source quotas or retention of every source. Use `reject` when the available evidence cannot support a bounded correction.

## Close the defect, not merely the check

Main accepts only a successful check with an unambiguous `accept` verdict. A malformed, failed or ambiguous return is unresolved, not acceptance.

For `correct`, preserve the initial report as `support/pre-correction.md` in persisted mode, or in memory in no-write mode. Give one correcting synthesizer the full original report, original questions and notes, and the source-grounded defect list. It verifies the cited evidence, makes only material supported corrections, and preserves unaffected findings, qualifications, operational controls and coherent structure. It replaces only `RESEARCH.md`, or returns the corrected report inline for no-write delivery. It returns a defect-ID-to-change explanation separately from the reader-facing report. No new research streams or editorial rewrite are allowed.

Launch a distinct independent rechecker with the actual corrected report, pre-correction report, original questions, evidence and defect IDs. It verifies every material correction and checks that unaffected decision-critical evidence survived. A claimed correction without the corresponding report change fails. New material regressions fail. The rechecker returns `accept` only when those conditions hold. Reviewer disagreement must be resolved by cited source context, not a vote.

## Terminal state

Main's state is `checking → accepted | correction-pending | rejected`. A correction moves `correction-pending → rechecking → accepted | rejected`. There is at most one correction and one recheck. Tool/access failure or unavailable required capacity leaves the check unresolved. Do not restart the loop.

Only `accepted` can yield a complete decision-grade answer. Otherwise deliver useful findings as partial with the remaining defects or access limitations, without a validated-completion claim. Research coverage and storage success remain separate. Keep substantive check evidence in supporting artifacts or memory and return compact status/path receipts. No-write requests create no files at any stage.
