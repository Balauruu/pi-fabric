# S2 cost-table supplement: raw primary extraction

## Provenance and format boundary

- **Primary URL/version:** <https://arxiv.org/html/2305.10601v2>
- **Fetched mode:** `raw`, HTTP 200, `text/html`, 186,389 characters, 1,749 lines.
- **Primary locator:** Appendix B.3 `#A2.SS3`; Table 7 `figure#A2.T7 > table#A2.T7.2`; Table 8 `figure#A2.T8 > table#A2.T8.2`.
- **Reason for this supplement:** the pre-existing S2 text extraction retains the captions at lines 317 and 321 but drops every table cell. This file is a new primary supplement. It does not alter that source snapshot.
- **Format limitation:** arXiv HTML labels the second column `Generate/Prompt tokens`; the surrounding prose calls the 5.5k figure **completion tokens**. The raw HTML does not define the slash convention beyond its header. Values below preserve the source verbatim.

## Surrounding primary qualifications

> “Running ToT requires significantly more computations than IO or CoT prompting. For example, in Game of 24 (Table 7 below), solving a problem with ToT requires 5.5k completion tokens, close to 100 CoT trials (6.7k tokens). But the performance of ToT is better than best of 100 independent CoT trials.”

> “On Creative Writing (Table 8 below), we found ToT takes around 5x completion tokens and money cost, which is intuitive as b=5 and most tokens are generated passages.”

> “So completing Game of 24 and Creative Writing’s main ToT experiments cost around 0.74 × 100 + 0.32 × 100 = 106 dollars. Crosswords’ DFS experiments should be also within 100 dollars. In general, cost and efficiency of ToT highly depend on the prompts and search algorithms used, and could require 5-100 times more generated tokens than CoT.”

## Faithful extraction of Table 7

**Primary caption:** `Table 7: Cost analysis on Game of 24.`

| Game of 24 | Generate/Prompt tokens | Cost per case | Success |
|---|---:|---:|---:|
| IO (best of 100) | 1.8k / 1.0k | $0.13 | 33% |
| CoT (best of 100) | 6.7k / 2.2k | $0.47 | 49% |
| ToT | 5.5k / 1.4k | $0.74 | 74% |

### Raw primary table markup

```html
<figure id="A2.T7" class="ltx_table">
<table id="A2.T7.2" class="ltx_tabular ltx_centering ltx_guessed_headers ltx_align_middle">
<thead class="ltx_thead"><tr id="A2.T7.2.1" class="ltx_tr">
<th id="A2.T7.2.1.1" class="ltx_td ltx_align_left ltx_th ltx_th_column ltx_border_tt"><span id="A2.T7.2.1.1.1" class="ltx_text ltx_font_bold">Game of 24</span></th>
<th id="A2.T7.2.1.2" class="ltx_td ltx_align_left ltx_th ltx_th_column ltx_border_tt"><span id="A2.T7.2.1.2.1" class="ltx_text ltx_font_bold">Generate/Prompt tokens</span></th>
<th id="A2.T7.2.1.3" class="ltx_td ltx_align_left ltx_th ltx_th_column ltx_border_tt"><span id="A2.T7.2.1.3.1" class="ltx_text ltx_font_bold">Cost per case</span></th>
<th id="A2.T7.2.1.4" class="ltx_td ltx_align_left ltx_th ltx_th_column ltx_border_tt"><span id="A2.T7.2.1.4.1" class="ltx_text ltx_font_bold">Success</span></th></tr></thead>
<tbody class="ltx_tbody">
<tr id="A2.T7.2.2" class="ltx_tr"><td id="A2.T7.2.2.1" class="ltx_td ltx_align_left ltx_border_t">IO (best of 100)</td><td id="A2.T7.2.2.2" class="ltx_td ltx_align_left ltx_border_t">1.8k / 1.0k</td><td id="A2.T7.2.2.3" class="ltx_td ltx_align_left ltx_border_t">$0.13</td><td id="A2.T7.2.2.4" class="ltx_td ltx_align_left ltx_border_t">33%</td></tr>
<tr id="A2.T7.2.3" class="ltx_tr"><td id="A2.T7.2.3.1" class="ltx_td ltx_align_left">CoT (best of 100)</td><td id="A2.T7.2.3.2" class="ltx_td ltx_align_left">6.7k / 2.2k</td><td id="A2.T7.2.3.3" class="ltx_td ltx_align_left">$0.47</td><td id="A2.T7.2.3.4" class="ltx_td ltx_align_left">49%</td></tr>
<tr id="A2.T7.2.4" class="ltx_tr"><td id="A2.T7.2.4.1" class="ltx_td ltx_align_left ltx_border_bb">ToT</td><td id="A2.T7.2.4.2" class="ltx_td ltx_align_left ltx_border_bb">5.5k / 1.4k</td><td id="A2.T7.2.4.3" class="ltx_td ltx_align_left ltx_border_bb">$0.74</td><td id="A2.T7.2.4.4" class="ltx_td ltx_align_left ltx_border_bb">74%</td></tr>
</tbody></table>
<figcaption class="ltx_caption ltx_centering"><span class="ltx_tag ltx_tag_table">Table 7: </span>Cost analysis on Game of 24.</figcaption>
</figure>
```

## Faithful extraction of Table 8

**Primary caption (preserved as published):** `Table 8: Cost analysis on Game of 24.` The table’s row/column header is `Creative Writing`; this caption/header mismatch is in the primary HTML and is not silently corrected here.

| Creative Writing | Generate/Prompt tokens | Cost per case |
|---|---:|---:|
| IO | 0.9k / 0.4k | $0.06 |
| CoT | 0.9k / 0.4k | $0.07 |
| ToT | 4k / 2.9k | $0.32 |

### Raw primary table markup

```html
<figure id="A2.T8" class="ltx_table">
<table id="A2.T8.2" class="ltx_tabular ltx_centering ltx_guessed_headers ltx_align_middle">
<thead class="ltx_thead"><tr id="A2.T8.2.1" class="ltx_tr">
<th id="A2.T8.2.1.1" class="ltx_td ltx_align_left ltx_th ltx_th_column ltx_border_tt"><span id="A2.T8.2.1.1.1" class="ltx_text ltx_font_bold">Creative Writing</span></th>
<th id="A2.T8.2.1.2" class="ltx_td ltx_align_left ltx_th ltx_th_column ltx_border_tt"><span id="A2.T8.2.1.2.1" class="ltx_text ltx_font_bold">Generate/Prompt tokens</span></th>
<th id="A2.T8.2.1.3" class="ltx_td ltx_align_left ltx_th ltx_th_column ltx_border_tt"><span id="A2.T8.2.1.3.1" class="ltx_text ltx_font_bold">Cost per case</span></th></tr></thead>
<tbody class="ltx_tbody">
<tr id="A2.T8.2.2" class="ltx_tr"><td id="A2.T8.2.2.1" class="ltx_td ltx_align_left ltx_border_t">IO</td><td id="A2.T8.2.2.2" class="ltx_td ltx_align_left ltx_border_t">0.9k / 0.4k</td><td id="A2.T8.2.2.3" class="ltx_td ltx_align_left ltx_border_t">$0.06</td></tr>
<tr id="A2.T8.2.3" class="ltx_tr"><td id="A2.T8.2.3.1" class="ltx_td ltx_align_left">CoT</td><td id="A2.T8.2.3.2" class="ltx_td ltx_align_left">0.9k / 0.4k</td><td id="A2.T8.2.3.3" class="ltx_td ltx_align_left">$0.07</td></tr>
<tr id="A2.T8.2.4" class="ltx_tr"><td id="A2.T8.2.4.1" class="ltx_td ltx_align_left ltx_border_bb">ToT</td><td id="A2.T8.2.4.2" class="ltx_td ltx_align_left ltx_border_bb">4k / 2.9k</td><td id="A2.T8.2.4.3" class="ltx_td ltx_align_left ltx_border_bb">$0.32</td></tr>
</tbody></table>
<figcaption class="ltx_caption ltx_centering"><span class="ltx_tag ltx_tag_table">Table 8: </span>Cost analysis on Game of 24.</figcaption>
</figure>
```
