#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const ROOT=path.resolve(path.dirname(new URL(import.meta.url).pathname),'..');
const source=fs.readFileSync(path.join(ROOT,'assets/presentation/v1/runtime.js'),'utf8');
if(!source.includes("!shell.hasAttribute('data-planf3-execution-order')"))throw new Error('execution SVG must retain only its semantic grouped fallback');
const cutoff=source.indexOf("  $('[data-action=\"download\"]')");
if(cutoff<0)throw new Error('runtime test seam not found');
const executable=source.slice(0,cutoff).replace(/^\(\(\) => \{/, '(function(){')+'\nreturn { exportedHtml, setupFileImpactFilter };\n})()';

const values=[
 'src/alpha.js existing parser seam normalize input UNT-ALPHA node test',
 'src/beta.js new renderer seam add output UNT-BETA browser check',
];
function makeRows(){return values.map(textContent=>({textContent,hidden:false}))}
const rows=makeRows();
const count={textContent:'2 files',closest:()=>section};
const input={value:'',listeners:{},closest:()=>section,addEventListener(type,fn){this.listeners[type]=fn}};
const section={querySelectorAll:selector=>selector==='tr[data-planf3-file-index]'?rows:[],querySelector:selector=>selector==='[data-planf3-file-result-count]'?count:null};
const cloneRows=makeRows(),cloneInput={value:'filtered',removeAttribute(){this.removed=true}},cloneCount={textContent:'0 files',closest:()=>cloneSection};
const cloneSection={querySelectorAll:selector=>selector==='tr[data-planf3-file-index]'?cloneRows:[],querySelector:selector=>selector==='[data-planf3-file-result-count]'?cloneCount:null};
const cloneCanvas={cleared:false,styleRemoved:false,replaceChildren(){this.cleared=true},removeAttribute(name){if(name==='style')this.styleRemoved=true}};
const cloneFallback={textContent:'A --> B',hidden:false};
const cloneSource={textContent:'A --> B',type:'text/plain'};
const cloneShell={rendered:true,removeAttribute(name){if(name==='data-rendered')this.rendered=false}};
const clone={
 querySelectorAll(selector){return ({'[data-runtime-generated], .chartjs-size-monitor':[], '[data-controls-ready]':[], '.diagram-canvas':[cloneCanvas], '.diagram-shell':[cloneShell], 'tr[data-planf3-file-index]':cloneRows, '[data-planf3-file-filter]':[cloneInput], '[data-planf3-file-result-count]':[cloneCount]})[selector]??[]},
 get outerHTML(){return `<html data-query="${cloneInput.value}" data-count="${cloneCount.textContent}"><figure class="execution-order-map diagram-shell" data-planf3-execution-order${cloneShell.rendered?' data-rendered="true"':''}><div class="diagram-canvas execution-order-svg" data-planf3-execution-svg></div><script type="${cloneSource.type}" class="diagram-source">${cloneSource.textContent}</script><div class="execution-order-phases" data-planf3-execution-fallback>Execution fallback</div><pre class="diagram-fallback"${cloneFallback.hidden?' hidden':''}>${cloneFallback.textContent}</pre></figure>${cloneRows.map(r=>`<tr${r.hidden?' hidden':''}></tr>`).join('')}</html>`},
};
const documentElement={dataset:{planf3Theme:'terracotta-sage',colorMode:'auto'},classList:{add(){}},cloneNode:()=>clone};
const document={documentElement,title:'runtime test',querySelector(selector){if(selector==='[data-planf3-file-result-count]')return count;return null},querySelectorAll(selector){if(selector==='[data-planf3-file-filter]')return[input];return[]}};
const sandbox={window:{},document,console,requestAnimationFrame:fn=>fn(),localStorage:{getItem:()=>null,setItem(){}},getComputedStyle:()=>({getPropertyValue:()=>''}),matchMedia:()=>({matches:true}),setTimeout,clearTimeout,File:class{},URL,Blob,DOMParser:class{},IntersectionObserver:class{},addEventListener(){}};
sandbox.window=sandbox;
const api=vm.runInNewContext(executable,sandbox,{filename:'runtime.js'});
api.setupFileImpactFilter();
const checks={path:'alpha.js',state:'new',seam:'renderer seam',intent:'normalize input',owner:'UNT-BETA',validation:'browser check'};
for(const [dimension,query] of Object.entries(checks)){
 input.value=query;input.listeners.input();
 const visible=rows.filter(row=>!row.hidden).length;
 if(visible!==1||count.textContent!=='1 file')throw new Error(`${dimension} filter failed: ${visible}, ${count.textContent}`);
}
input.value='no match';input.listeners.input();
if(rows.some(row=>!row.hidden)||count.textContent!=='0 files')throw new Error('zero-result count failed');
cloneRows.forEach(row=>row.hidden=true);
const html=api.exportedHtml();
if(cloneRows.some(row=>row.hidden)||cloneInput.value!==''||cloneCount.textContent!=='2 files'||!html.includes('data-query="" data-count="2 files"'))throw new Error('canonical export restoration failed');
if(cloneShell.rendered||!cloneCanvas.cleared||!cloneCanvas.styleRemoved||cloneFallback.hidden||cloneSource.textContent!=='A --> B'||html.includes('data-rendered')||!html.includes('diagram-source')||!html.includes('diagram-fallback')||!html.includes('data-planf3-execution-svg')||!html.includes('data-planf3-execution-fallback'))throw new Error('canonical execution SVG fallback restoration failed');
console.log('PASS runtime filter/export: path, state, seam, intent, owner, validation, counts, execution SVG fallback, canonical export');
