# ToolBench-X scope-expectation adjudication

## Outcome

AUDIT-v2 C2's premise that v2 *adds* the twelve-model main benchmark is unsupported and contradicted by the frozen v1 primary source. The frozen file identifies itself as arXiv v1 (`sources/toolbench-x-2606.25819v1.md:4-5`), yet it already contains Table 2, “Main Results on ToolBench-X” (`:637`), and says the experiment benchmarks twelve prominent LLMs (`:643-649`). The same v1 separately labels Figure 4 as a five-model, 200-task diagnostic and defines its Baseline, Hint, TTS, and Oracle conditions (`:663-671`). Thus the correct scope is **one v1 source with two distinct experiment scopes**, not “v1 diagnostic versus v2 main benchmark.”

The live v2 primary page also contains the twelve-model setup/Table 2 and the five-model Figure 4 diagnostic. Its arXiv record identifies the current revision as v2, updated 2026-06-27, with original publication 2026-06-24: <https://arxiv.org/abs/2606.25819v2>. This confirms a later revision exists but does not support claiming that the main benchmark was introduced only in v2.

## Corrected expectation

Replace any expectation that calls a twelve-model reference an incompatible v2-only snapshot with:

> ToolBench-X arXiv v1 reports both (a) a twelve-model main benchmark in Table 2 and (b) a separate five-model, 200-task Figure 4 diagnostic with Baseline, Hint, TTS, and Oracle. A response may discuss either scope when it names the applicable table/figure, model set, and conditions. Do not require it to describe a v1-to-v2 scope split, and do not treat “twelve models” alone as a contradiction of the five-model diagnostic. A particular numerical claim still requires its table/figure and version.

This corrects the historical expectation without changing the retained diagnostic facts. The historical correction record itself said a bare twelve-model reference was not intrinsically incompatible (`CORRECTIONS.md:25-31`; `INDEPENDENT-AUDIT.md:15-19`), but its version allocation is now shown wrong by the frozen v1 source.

## Private-audit constraint

Requiring writers to mention, reconcile, or cite an audit/source conflict that they were expressly denied is invalid as an acceptance criterion. It tests access to private material rather than the authorized task evidence. The corrected expectation above is independently derivable from the writer-visible frozen primary source, so it may be required only if that source and the need to scope claims are within the writer's authorized materials. Private-audit terminology, findings, and citations must not be required.

## AgentProp comparator note

If the historical κ values are in scope, use the source's comparator map: substring κ=0.049 versus A1, 0.015 versus A2, and 0.036 versus the 92-trace consensus (`sources/agentprop-bench-2604.16706.md:19,43-45`). They are distinct comparators, not competing versions. The source's abstract wording conflicts with that mapping (`:15,19`), so comparator-qualified claims should rely on §5/Table 2.
