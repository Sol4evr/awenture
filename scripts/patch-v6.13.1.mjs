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
const anchor="const stage=qs('[data-aw-paper-frame]');let touchStartX=null,touchStartY=null;";
if(!formal.includes(anchor))throw new Error('Missing formal viewer control-binding anchor');
const direct=`const bindPager=(sel,fn)=>{const b=qs(sel);if(!b)return;let pointerAt=0;b.addEventListener('pointerdown',e=>{if(b.disabled)return;pointerAt=Date.now();e.preventDefault();e.stopPropagation();fn()});b.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();if(b.disabled||Date.now()-pointerAt<700)return;fn()})};bindPager('[data-aw-page-prev]',()=>changePage(-1));bindPager('[data-aw-page-next]',()=>changePage(1));bindPager('[data-aw-zoom-out]',()=>changeZoom(-.15));bindPager('[data-aw-zoom-in]',()=>changeZoom(.15));${anchor}`;
formal=formal.replace(anchor,direct);
formal+='\n/* v6.13.1.1 iPad-safe paged historical-paper viewer; pointer-first pager controls; source-review mode retained. */\n';
fs.writeFileSync(formalPath,formal);

for(const name of ['pdf.min.mjs','pdf.worker.min.mjs']){
  const src=path.join(root,'node_modules','pdfjs-dist','build',name),dest=path.join(root,'dist',name);
  if(!fs.existsSync(src))throw new Error(`Missing PDF.js runtime asset ${name}`);
  fs.copyFileSync(src,dest);
}
console.log(JSON.stringify({releaseOverlay:'6.13.1.1',historicalPapers:runtime.papers.length,verifiedScoring:runtime.papers.filter(p=>p.scoring==='verified').length,sourceReview:runtime.papers.filter(p=>p.scoring!=='verified').length,pagedViewer:'PDF.js local runtime',pagerCompatibility:'pointer-first-controls'}));