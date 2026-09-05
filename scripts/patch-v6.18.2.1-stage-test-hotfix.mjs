import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const jsPath=path.join(root,'dist','stage-formal-tests.js');
if(!fs.existsSync(jsPath))throw new Error('stage-formal-tests.js missing');
let js=fs.readFileSync(jsPath,'utf8');

// This hotfix is deliberately narrow: keep the stage-specific heading correction,
// but never replace the Year 2-style direct URL/range PDF.js loader with a whole-file byte fetch.
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
if(js.includes(oldIsolation))js=js.replace(oldIsolation,newIsolation);
if(!js.includes("eyebrow.textContent=STAGE_LABELS[stage]||stage"))throw new Error('stage heading hotfix missing');
if(!js.includes('getDocument({url:active.paper.assetPath'))throw new Error('Year 2-style URL/range PDF loader was not preserved');
if(js.includes('arrayBuffer()'))throw new Error('whole-file PDF byte preload regression detected');

fs.writeFileSync(jsPath,js);
console.log(JSON.stringify({release:'6.18.2',hotfix:'stage-heading-only',heading:'STAGE_AWARE',pdf:'YEAR2_LITE_URL_RANGE'}));
