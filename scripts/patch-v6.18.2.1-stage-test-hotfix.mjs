import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const jsPath=path.join(root,'dist','stage-formal-tests.js');
if(!fs.existsSync(jsPath))throw new Error('stage-formal-tests.js missing');
let js=fs.readFileSync(jsPath,'utf8');

const oldIsolation=`function syncStageIsolation(stage=currentStage()){
  const card=subjectTestsCard();if(!card)return;
  const y2Grid=qs('.aw-historical-grid',card)||qs('.grid[data-aw-historical="1"]',card);
  const y2Note=qs('.aw-form-note',card);
  const later=stage!=='icas-y2';
  if(y2Grid)y2Grid.hidden=later;
  if(y2Note)y2Note.hidden=later;
  card.dataset.awFormalStage=stage;
}`;
const newIsolation=`function syncStageIsolation(stage=currentStage()){
  const card=subjectTestsCard();if(!card)return;
  const y2Grid=qs('.aw-historical-grid',card)||qs('.grid[data-aw-historical="1"]',card);
  const y2Note=qs('.aw-form-note',card);
  const later=stage!=='icas-y2';
  if(y2Grid)y2Grid.hidden=later;
  if(y2Note)y2Note.hidden=later;
  const eyebrow=qs('.ey',card);if(eyebrow)eyebrow.textContent=STAGE_LABELS[stage]||stage;
  card.dataset.awFormalStage=stage;
}`;
if(!js.includes(oldIsolation))throw new Error('stage isolation source marker missing');
js=js.replace(oldIsolation,newIsolation);

const oldViewer=`async function initViewer(){try{const lib=await pdfjs();if(!active)return;const task=lib.getDocument({url:active.paper.assetPath,isEvalSupported:false,useSystemFonts:true});const doc=await task.promise;if(!active){doc.destroy();return}active.pdfDoc=doc;active.pageCount=doc.numPages;active.page=1;active.zoom=1;syncViewerControls();await renderPaperPage()}catch(_){viewerStatus('Unable to open this paper on this device. Exit and try again.',true)}}`;
const newViewer=`async function initViewer(){try{const lib=await pdfjs();if(!active)return;viewerStatus('Loading paper…');const res=await fetch(active.paper.assetPath,{cache:'force-cache',credentials:'same-origin'});if(!res.ok)throw new Error('paper '+res.status);const type=(res.headers.get('content-type')||'').toLowerCase();if(type&&!type.includes('pdf')&&!type.includes('octet-stream'))throw new Error('paper content-type '+type);const bytes=new Uint8Array(await res.arrayBuffer());if(bytes.length<5||String.fromCharCode(...bytes.slice(0,5))!=='%PDF-')throw new Error('paper payload is not PDF');if(!active)return;const task=lib.getDocument({data:bytes,isEvalSupported:false,useSystemFonts:true});const doc=await task.promise;if(!active){doc.destroy();return}active.pdfDoc=doc;active.pageCount=doc.numPages;active.page=1;active.zoom=1;syncViewerControls();await renderPaperPage()}catch(err){console.error('AW_STAGE_PDF',err);viewerStatus('Unable to load this past paper. Exit and reopen the test.',true)}}`;
if(!js.includes(oldViewer))throw new Error('stage viewer source marker missing');
js=js.replace(oldViewer,newViewer);

fs.writeFileSync(jsPath,js);
console.log(JSON.stringify({release:'6.18.2',hotfix:'stage-heading-and-pdf-loading',heading:'STAGE_AWARE',pdf:'AUTHENTICATED_BYTE_FETCH'}));
