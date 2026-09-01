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
for(const branch of delegated){if(!formal.includes(branch))throw new Error(`Missing delegated pager branch: ${branch}`);formal=formal.replace(branch,'')}
const pageLabel='<strong data-aw-page-label>Page 1 of ${p.questionEndPage}</strong>';
const pageSelect='<label class="aw-page-select-wrap"><span>Page</span><select data-aw-page-select aria-label="Paper page">${Array.from({length:p.questionEndPage},(_,i)=>`<option value="${i+1}">${i+1}</option>`).join(\'\')}</select><span data-aw-page-total>of ${p.questionEndPage}</span><strong data-aw-page-label class="aw-page-label-sr">Page 1 of ${p.questionEndPage}</strong></label>';
if(!formal.includes(pageLabel))throw new Error('Missing formal page label markup');formal=formal.replace(pageLabel,pageSelect);
const syncNeedle='const label=qs(\'[data-aw-page-label]\');if(label)label.textContent=`Page ${n} of ${total}`;';
const syncReplacement='const label=qs(\'[data-aw-page-label]\');if(label)label.textContent=`Page ${n} of ${total}`;const select=qs(\'[data-aw-page-select]\');if(select)select.value=String(n);const totalEl=qs(\'[data-aw-page-total]\');if(totalEl)totalEl.textContent=`of ${total}`;';
if(!formal.includes(syncNeedle))throw new Error('Missing viewer sync label logic');formal=formal.replace(syncNeedle,syncReplacement);
const anchor="const stage=qs('[data-aw-paper-frame]');let touchStartX=null,touchStartY=null;";
if(!formal.includes(anchor))throw new Error('Missing formal viewer control-binding anchor');
const direct=`const bindPager=(sel,fn)=>{const b=qs(sel);if(!b)return;let lastAt=0;const activate=e=>{if(b.disabled)return;const now=Date.now();if(now-lastAt<250){e.preventDefault();e.stopPropagation();return}lastAt=now;e.preventDefault();e.stopPropagation();fn()};b.addEventListener('pointerdown',activate);b.addEventListener('mousedown',activate);b.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();if(b.disabled||Date.now()-lastAt<700)return;lastAt=Date.now();fn()})};bindPager('[data-aw-page-prev]',()=>changePage(-1));bindPager('[data-aw-page-next]',()=>changePage(1));bindPager('[data-aw-zoom-out]',()=>changeZoom(-.15));bindPager('[data-aw-zoom-in]',()=>changeZoom(.15));${anchor}`;
formal=formal.replace(anchor,direct);
const syncAnchor='function sync(){transformTests()}';if(!formal.includes(syncAnchor))throw new Error('Missing sync function anchor');
const pageHandler=`function awSelectPageEvent(e){const select=e.target&&e.target.closest?e.target.closest('[data-aw-page-select]'):null;if(!select)return;select.dataset.awEvent=e.type;select.dataset.awHasActive=String(!!active);select.dataset.awHasPdf=String(!!active?.pdfDoc);select.dataset.awBeforePage=String(active?.page??'');if(!active?.pdfDoc){select.dataset.awOutcome='no-pdf';return}const n=Number(select.value);select.dataset.awRequestedPage=String(n);if(!Number.isInteger(n)){select.dataset.awOutcome='invalid';return}const next=Math.max(1,Math.min(active.pageCount,n));if(next===active.page){select.dataset.awOutcome='same';syncViewerControls();return}active.page=next;select.dataset.awAfterPage=String(active.page);select.dataset.awOutcome='changed';syncViewerControls();renderPaperPage()}\nwindow.addEventListener('input',awSelectPageEvent,true);window.addEventListener('change',awSelectPageEvent,true);\n`;
formal=formal.replace(syncAnchor,pageHandler+syncAnchor);
formal+='\n/* v6.13.1.1 page-selector diagnostic attributes are temporary until cross-browser state path is verified. */\n';fs.writeFileSync(formalPath,formal);
const cssPath=path.join(root,'dist/formal-tests.css');fs.appendFileSync(cssPath,`\n.aw-page-select-wrap{display:flex;align-items:center;justify-content:center;gap:6px;color:#344054;font-size:13px;font-weight:750;white-space:nowrap}.aw-page-select-wrap select{min-width:58px;min-height:38px;border:1px solid #aeb8c7;border-radius:8px;background:#fff;padding:5px 24px 5px 9px;font:inherit;font-weight:800;color:#243b64}.aw-page-label-sr{position:absolute!important;width:1px!important;height:1px!important;padding:0!important;margin:-1px!important;overflow:hidden!important;clip:rect(0,0,0,0)!important;white-space:nowrap!important;border:0!important}@media(max-width:700px){.aw-paper-toolbar{position:sticky;top:0;z-index:5;grid-template-columns:auto minmax(112px,1fr) auto!important}.aw-page-select-wrap{font-size:12px}.aw-page-select-wrap select{min-height:42px;min-width:60px}.aw-paper-swipe-hint{display:none}}\n`);
for(const name of ['pdf.min.mjs','pdf.worker.min.mjs']){const src=path.join(root,'node_modules','pdfjs-dist','build',name),dest=path.join(root,'dist',name);if(!fs.existsSync(src))throw new Error(`Missing PDF.js runtime asset ${name}`);fs.copyFileSync(src,dest)}
console.log(JSON.stringify({releaseOverlay:'6.13.1.1',historicalPapers:runtime.papers.length,pagedViewer:'PDF.js local runtime',pageSelector:'native-select',pagerDiagnostic:'dataset-state'}));