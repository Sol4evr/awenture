import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const htmlPath=path.join(root,'dist/index.html');
const runtime=JSON.parse(fs.readFileSync(path.join(root,'bank/v6.13.1-original-paper-runtime.json'),'utf8'));
let html=fs.readFileSync(htmlPath,'utf8');
html=html.replaceAll('6.13.0','6.13.1.1').replaceAll('v=6130','v=61311');
const marker='</head>';
if(!html.includes(marker))throw new Error('Missing head marker for v6.13.1.1 overlay');
html=html.replace(marker,`<script>/* v6.13.1.1 authorised historical Year 2 formal-paper runtime */window.__AW_ORIGINAL_PAPERS=${JSON.stringify(runtime)};</script>${marker}`);
fs.writeFileSync(htmlPath,html);

const formalPath=path.join(root,'dist/formal-tests.js');
let formal=fs.readFileSync(formalPath,'utf8');
const delegated=[
  "if(e.target.closest('[data-aw-page-prev]')){changePage(-1);return}",
  "if(e.target.closest('[data-aw-page-next]')){changePage(1);return}",
  "if(e.target.closest('[data-aw-zoom-out]')){changeZoom(-.15);return}",
  "if(e.target.closest('[data-aw-zoom-in]')){changeZoom(.15);return}"
];
for(const branch of delegated){
  if(!formal.includes(branch))throw new Error(`Missing delegated pager branch: ${branch}`);
  formal=formal.replace(branch,'');
}

const pageLabel='<strong data-aw-page-label>Page 1 of ${p.questionEndPage}</strong>';
const pageSelect='<label class="aw-page-select-wrap"><span>Page</span><select data-aw-page-select aria-label="Paper page">${Array.from({length:p.questionEndPage},(_,i)=>`<option value="${i+1}">${i+1}</option>`).join(\'\')}</select><span data-aw-page-total>of ${p.questionEndPage}</span><strong data-aw-page-label class="aw-page-label-sr">Page 1 of ${p.questionEndPage}</strong></label>';
if(!formal.includes(pageLabel))throw new Error('Missing formal page label markup');
formal=formal.replace(pageLabel,pageSelect);

const syncNeedle='const label=qs(\'[data-aw-page-label]\');if(label)label.textContent=`Page ${n} of ${total}`;';
const syncReplacement='const label=qs(\'[data-aw-page-label]\');if(label)label.textContent=`Page ${n} of ${total}`;const select=qs(\'[data-aw-page-select]\');if(select)select.value=String(n);const totalEl=qs(\'[data-aw-page-total]\');if(totalEl)totalEl.textContent=`of ${total}`;';
if(!formal.includes(syncNeedle))throw new Error('Missing viewer sync label logic');
formal=formal.replace(syncNeedle,syncReplacement);

const anchor="const stage=qs('[data-aw-paper-frame]');let touchStartX=null,touchStartY=null;";
if(!formal.includes(anchor))throw new Error('Missing formal viewer control-binding anchor');
const direct=`const bindPager=(sel,fn)=>{const b=qs(sel);if(!b)return;let lastAt=0;const activate=e=>{if(b.disabled)return;const now=Date.now();if(now-lastAt<250){e.preventDefault();e.stopPropagation();return}lastAt=now;e.preventDefault();e.stopPropagation();fn()};b.addEventListener('pointerdown',activate);b.addEventListener('mousedown',activate);b.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();if(b.disabled||Date.now()-lastAt<700)return;lastAt=Date.now();fn()})};bindPager('[data-aw-page-prev]',()=>changePage(-1));bindPager('[data-aw-page-next]',()=>changePage(1));bindPager('[data-aw-zoom-out]',()=>changeZoom(-.15));bindPager('[data-aw-zoom-in]',()=>changeZoom(.15));${anchor}`;
formal=formal.replace(anchor,direct);

const inputListener="document.addEventListener('input',e=>{const input=e.target.closest('[data-aw-answer-text]');if(input&&active)active.answers[Number(input.dataset.awAnswerText)]=input.value},true);";
if(!formal.includes(inputListener))throw new Error('Missing formal input listener anchor');
const changeListener="document.addEventListener('change',e=>{const select=e.target.closest&&e.target.closest('[data-aw-page-select]');if(!select||!active?.pdfDoc)return;const n=Number(select.value);if(!Number.isInteger(n))return;active.page=Math.max(1,Math.min(active.pageCount,n));syncViewerControls();renderPaperPage()},true);";
formal=formal.replace(inputListener,`${changeListener}${inputListener}`);
formal+='\n/* v6.13.1.1 iPad-safe paged historical-paper viewer; native page selector routed through document capture; source-review mode retained. */\n';
fs.writeFileSync(formalPath,formal);

const cssPath=path.join(root,'dist/formal-tests.css');
fs.appendFileSync(cssPath,`\n/* Native iPad page selector — always visible in the formal-paper toolbar. */\n.aw-page-select-wrap{display:flex;align-items:center;justify-content:center;gap:6px;color:#344054;font-size:13px;font-weight:750;white-space:nowrap}.aw-page-select-wrap select{min-width:58px;min-height:38px;border:1px solid #aeb8c7;border-radius:8px;background:#fff;padding:5px 24px 5px 9px;font:inherit;font-weight:800;color:#243b64}.aw-page-label-sr{position:absolute!important;width:1px!important;height:1px!important;padding:0!important;margin:-1px!important;overflow:hidden!important;clip:rect(0,0,0,0)!important;white-space:nowrap!important;border:0!important}@media(max-width:700px){.aw-paper-toolbar{position:sticky;top:0;z-index:5;grid-template-columns:auto minmax(112px,1fr) auto!important}.aw-page-select-wrap{font-size:12px}.aw-page-select-wrap select{min-height:42px;min-width:60px}.aw-paper-swipe-hint{display:none}}\n`);

for(const name of ['pdf.min.mjs','pdf.worker.min.mjs']){
  const src=path.join(root,'node_modules','pdfjs-dist','build',name),dest=path.join(root,'dist',name);
  if(!fs.existsSync(src))throw new Error(`Missing PDF.js runtime asset ${name}`);
  fs.copyFileSync(src,dest);
}
console.log(JSON.stringify({releaseOverlay:'6.13.1.1',historicalPapers:runtime.papers.length,verifiedScoring:runtime.papers.filter(p=>p.scoring==='verified').length,sourceReview:runtime.papers.filter(p=>p.scoring!=='verified').length,pagedViewer:'PDF.js local runtime',pageSelector:'native-select',pagerCompatibility:'document-capture-plus-pointer-mouse'}));