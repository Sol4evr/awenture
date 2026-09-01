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
const bodyMarker='</body>';
if(!html.includes(bodyMarker))throw new Error('Missing body marker for pager compatibility layer');
html=html.replace(bodyMarker,`<script>/* v6.13.1.1 formal pager compatibility layer: own page-button clicks before legacy capture handlers */window.addEventListener('click',function(e){var t=e.target&&e.target.closest?e.target.closest('[data-aw-page-next],[data-aw-page-prev]'):null;if(!t)return;e.preventDefault();e.stopPropagation();if(e.stopImmediatePropagation)e.stopImmediatePropagation();document.dispatchEvent(new KeyboardEvent('keydown',{key:t.hasAttribute('data-aw-page-next')?'ArrowRight':'ArrowLeft'}));},true);</script>${bodyMarker}`);
fs.writeFileSync(htmlPath,html);
const formalPath=path.join(root,'dist/formal-tests.js');
fs.appendFileSync(formalPath,'\n/* v6.13.1.1 iPad-safe paged historical-paper viewer; source-review mode retained. */\n');
for(const name of ['pdf.min.mjs','pdf.worker.min.mjs']){
  const src=path.join(root,'node_modules','pdfjs-dist','build',name),dest=path.join(root,'dist',name);
  if(!fs.existsSync(src))throw new Error(`Missing PDF.js runtime asset ${name}`);
  fs.copyFileSync(src,dest);
}
console.log(JSON.stringify({releaseOverlay:'6.13.1.1',historicalPapers:runtime.papers.length,verifiedScoring:runtime.papers.filter(p=>p.scoring==='verified').length,sourceReview:runtime.papers.filter(p=>p.scoring!=='verified').length,pagedViewer:'PDF.js local runtime',pagerCompatibility:'window-capture'}));