#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const ROOT=path.resolve(path.dirname(new URL(import.meta.url).pathname),'..');
const contract=fs.readFileSync(path.join(ROOT,'references/report-patterns.md'),'utf8');
const css=fs.readFileSync(path.join(ROOT,'assets/presentation/v1/information-design.css'),'utf8');
const validator=fs.readFileSync(path.join(ROOT,'scripts/validate-plan.mjs'),'utf8');
const template=fs.readFileSync(path.join(ROOT,'assets/plan-template.html'),'utf8');
const contextSlice=fs.readFileSync(path.join(ROOT,'scripts/context-slice.mjs'),'utf8');
const patterns=['executive-summary','kpi-dashboard','architecture-diagram','comparison','resolution-path','file-map','test-comparison','review-findings','decision-log','code-excerpt','re-entry'];
for(const pattern of patterns)if(!contract.includes(pattern)||!validator.includes(pattern))throw new Error(`missing report pattern ${pattern}`);
for(const token of ['report-comparison','report-kpi','file-map','review-item','re-entry-grid','execution-order-phase','execution-order-wave','key-metrics-overview','execution-order-svg','code-snippet'])if(!css.includes(token))throw new Error(`missing report CSS ${token}`);
for(const token of ['--snippet-source:#67c9d1','--snippet-illustrative:#e8a45d','--snippet-terminal:#0d1210','background:var(--snippet-terminal)','grid-template-columns:minmax(0,1fr) auto','[data-planf3-code-caption]::before{content:"// "','[data-planf3-code-snippet="source"] .code-snippet-body>code>[data-planf3-code-line]'])if(!css.includes(token))throw new Error(`missing terminal audit code snippet CSS ${token}`);if(css.includes('content:"01'))throw new Error('terminal audit code snippet must not fake line numbers');for(const source of [template,validator,contextSlice])if(!source.includes('data-planf3-code-line'))throw new Error('source snippet line numbers must be authored, sliced, and validated');
const printCss=css.slice(css.indexOf('@media print'));for(const token of ['#files table{min-width:0;width:100%;table-layout:fixed}','white-space:normal','overflow-wrap:anywhere','word-break:break-word'])if(!printCss.includes(token))throw new Error(`missing print File Impact reset ${token}`);if(!printCss.includes('.code-snippet>.code-snippet-body,.code-snippet-body>code{max-height:none;min-width:0;width:100%'))throw new Error('missing print code snippet width reset');if(!printCss.includes('.code-snippet [data-planf3-code-source-label],.code-snippet [data-planf3-code-title],.code-snippet [data-planf3-code-kind-label],.code-snippet [data-planf3-code-line-label]{color:inherit}'))throw new Error('missing print terminal label color reset');
for(const token of ['data-planf3-file-map-entry','data-planf3-review-item','data-planf3-decision-confidence','data-planf3-snippet','data-planf3-code-snippet','data-planf3-code-kind','data-planf3-execution-phase','data-planf3-execution-wave-group','data-planf3-execution-svg','key-metrics-overview'])if(!validator.includes(token))throw new Error(`missing report validation ${token}`);
for(const token of ['data-planf3-code-snippet="source"','data-planf3-code-snippet="illustrative"','aria-label="Current source excerpt" tabindex="0"','aria-label="Illustrative proposed code" tabindex="0"'])if(!template.includes(token))throw new Error(`missing template code snippet exemplar ${token}`);
if(!contextSlice.includes("n.attrs['data-planf3-code-snippet']"))throw new Error('bounded context omits shared code snippets');
console.log(`PASS self-contained report contract audit: ${patterns.length} patterns and focused CSS/validator/context seams`);
