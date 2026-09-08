## R1. Measured effects

| Technique | Task, model, method, comparator | Outcome | Compute/cost |
|---|---|---:|---|
| Few-shot chain-of-thought (CoT) | GSM8K arithmetic. PaLM-540B, greedy decoding. Eight hand-written CoT exemplars versus the same standard few-shot prompt with direct answers. | **56.9% vs 17.9%** solve rate, **+39.0 points**. | Not reported. CoT necessarily generates longer completions. |
| Zero-shot CoT | MultiArith and GSM8K. `text-davinci-002`; append “Let’s think step by step,” then extract the answer, versus zero-shot direct answer. | MultiArith **78.7% vs 17.7%**. GSM8K **40.7% vs 10.4%**. | One generation per case in the reported comparison. Token/currency cost not reported. |
| Self-consistency | GSM8K. `code-davinci-002` with few-shot CoT; sample reasoning paths and majority-vote final answers, versus greedy CoT decoding. | **78.0% vs 60.1%**, **+17.9 points**. | **40 independent outputs per run**. Thus roughly 40 model completions before aggregation, but no token or dollar total is reported. |
| ReAct | ALFWorld text-environment control. PaLM-540B, sparse thought/action trajectories, two in-context demonstrations, versus matched action-only trajectories without thoughts. Six prompt permutations, 134 unseen games. | Best prompt: **71% vs 45%** task success, **+26 points**. | Tool/action trajectory length and API cost not reported. |
| ReAct | WebShop simulated web shopping. PaLM-540B, one-shot ReAct versus one-shot Act-only. | **40.0% vs 30.1%** success, **+9.9 points**. | Not reported. |
| Tree of Thoughts (ToT) | 100 difficult Game-of-24 instances, GPT-4 at temperature 0.7. Generate and evaluate partial states with breadth-5 search/backtracking, versus input-output, CoT, and best-of-100 CoT. | ToT **74%**. Single CoT **4%**. Best-of-100 CoT **49%**. | ToT: **5.5k completion + 1.4k prompt tokens**, **$0.74/case**. Best-of-100 CoT: **6.7k + 2.2k**, **$0.47/case**. |

### Decisive source passages and conditions

1. **Few-shot CoT**
   - [Wei et al., *Chain-of-Thought Prompting Elicits Reasoning in Large Language Models*](https://arxiv.org/html/2201.11903) reports for PaLM-540B: “**Standard 17.9**” and “**Chain of thought 56.9 (+39.0)**” on GSM8K.
   - The paper defines the intervention as augmenting each few-shot exemplar with a reasoning chain, using eight manually composed exemplars for most arithmetic benchmarks.
   - Counterevidence in the same study: CoT “does not positively impact performance” for smaller models, with gains emerging around **~100B parameters**. On easy MAWPS subsets, improvements were “negative or very small.”

2. **Zero-shot CoT**
   - [Kojima et al., *Large Language Models are Zero-Shot Reasoners*](https://arxiv.org/html/2205.11916) reports: “MultiArith from **17.7% to 78.7%** and GSM8K from **10.4% to 40.7%**” using `text-davinci-002`.
   - The intervention is a fixed zero-shot phrase, “Let’s think step by step,” not retrieved examples or fine-tuning.
   - It did **not** improve the paper’s commonsense-reasoning tasks. The authors also report that small models did not benefit, and that the generated rationale can be plausible while wrong.

3. **Self-consistency**
   - [Wang et al., *Self-Consistency Improves Chain of Thought Reasoning in Language Models*](https://arxiv.org/html/2203.11171) describes “sample-and-marginalize”: sample diverse CoT paths and choose the modal final answer rather than greedily decoding one path.
   - Its arithmetic table reports `code-davinci-002` GSM8K **60.1% → 78.0%**. The method used “**40 outputs independently from the decoder** in each run.”
   - This is an inference-time ensemble, not a free prompt edit. Its cost multiplier is substantial even where the paper does not publish tokens or prices.

4. **ReAct**
   - [Yao et al., *ReAct: Synergizing Reasoning and Acting in Language Models*](https://arxiv.org/html/2210.03629) interleaves model thoughts, tool actions, and observations.
   - On ALFWorld, it used two annotated trajectories selected from three per task type, evaluated six permutations, and reports best ReAct **71%** versus best Act **45%**. The authors explicitly evaluated **134 unseen** games.
   - On WebShop, ReAct reached **40.0%** success versus Act **30.1%**. On HotpotQA/FEVER with Wikipedia API access, ReAct alone was not uniformly best: HotpotQA EM was **27.4% ReAct** versus **29.4% CoT** and **33.4% CoT-self-consistency**. This is direct counterevidence to treating tool interleaving as universally superior.

5. **Tree of Thoughts**
   - [Yao et al., *Tree of Thoughts: Deliberate Problem Solving with Large Language Models*](https://arxiv.org/html/2305.10601) tests a search scaffold, not merely a wording change. On 100 hard Game-of-24 cases, breadth-5 ToT achieved **74%**, compared with **4.0%** single CoT and **49%** best-of-100 CoT.
   - Its reported cost table is unusually actionable: ToT cost **$0.74/case** despite fewer completion tokens than best-of-100 CoT, because of its search/evaluation calls.
   - Transfer limit: on the same task, GPT-3.5 ToT achieved **19%**, versus GPT-4 ToT’s **74%**. The paper also says ToT can require **5–100×** CoT generation tokens, depending on the search configuration.

## Coverage and gaps

- **Covered:** exact controlled comparisons for multi-step arithmetic, symbolic-style reasoning, text-environment action, simulated web shopping, and search-heavy planning.
- **Not established by these inspected sources:** a measured general effect on production prose quality, current frontier models, real web reliability, tool monetary cost, latency, token use for CoT/ReAct, or safety under adversarial tool outputs.
- **Interpretation boundary:** results remain bound to the named model, benchmark, prompt set, decoding policy, access to tools/environment, and selection procedure. They do not support a universal ranking of prompt techniques.