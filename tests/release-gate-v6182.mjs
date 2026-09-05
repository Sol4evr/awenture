import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const dist=path.join(root,'dist');
const html=fs.readFileSync(path.join(dist,'index.html'),'utf8');
if(!html.includes('awenture-release" content="6.18.2"'))throw new Error('v6.18.2 release marker missing');
if(!html.includes('/stage-formal-tests.js?v=61820'))throw new Error('stage formal test runtime missing');
const js=fs.readFileSync(path.join(dist,'stage-formal-tests.js'),'utf8');
for(const marker of ['syncStageIsolation','syncStageHeading','stage-historical-formal','data-aw-stage-paper','data-aw-stage-timer','pdf.min.mjs','CONDITIONS','data-aw-stage-page-select'])if(!js.includes(marker))throw new Error(`stage formal runtime marker missing: ${marker}`);
if(js.includes('MutationObserver'))throw new Error('stage formal runtime must remain lite/event-driven');
if(!js.includes("y2Grid.hidden=later")||!js.includes("y2Note.hidden=later"))throw new Error('Year 2 historical test UI must be hidden outside ICAS Y2');
if(!js.includes('getDocument({url:active.paper.assetPath'))throw new Error('later-stage viewer must use Year 2-style URL/range PDF.js loading');
if(js.includes('arrayBuffer()'))throw new Error('later-stage viewer must not download the whole PDF before opening');
if(!js.includes('RenderingCancelledException')||!js.includes("document.createElement('canvas')"))throw new Error('later-stage viewer must keep Year 2-style atomic page rendering');
if(!js.includes("Writing:{minutes:35,questions:1"))throw new Error('ICAS Writing timed contract missing');
if(!js.includes("score:null,verified:false"))throw new Error('unverified later-stage historical papers must not auto-score');

const catalog=JSON.parse(fs.readFileSync(path.join(dist,'stage-papers','catalog.json'),'utf8'));
if(catalog.release!=='6.18.2'||catalog.mode!=='stage-formal-lite-v2')throw new Error('stage formal catalog v2 missing');
const required={
  'icas-y3':['Digital Technologies','English','Mathematics','Science','Spelling','Writing'],
  'icas-y4':['Digital Technologies','English','Mathematics','Science','Spelling','Writing'],
  'naplan-y3':['Language Conventions','Numeracy','Reading','Writing'],
  'oc-prep':['Reading','Mathematical Reasoning','Thinking Skills']
};
for(const [stage,subjects] of Object.entries(required)){
  const papers=catalog.stages?.[stage]?.papers||[],present=new Set(papers.map(p=>p.subject));
  if(!papers.length)throw new Error(`${stage} has no activated papers`);
  for(const subject of subjects)if(!present.has(subject))throw new Error(`${stage} missing ${subject} paper section`);
  for(const p of papers){
    const asset=path.join(dist,p.assetPath.replace(/^\//,''));
    if(!fs.existsSync(asset))throw new Error(`missing stage paper asset ${p.assetPath}`);
    const fd=fs.openSync(asset,'r'),b=Buffer.alloc(5);fs.readSync(fd,b,0,5,0);fs.closeSync(fd);
    if(b.toString('ascii')!=='%PDF-')throw new Error(`invalid PDF asset ${p.assetPath}`);
  }
}
console.log(JSON.stringify({release:'6.18.2',stageIsolation:'PASS',completeStageCoverage:'PASS',stageFormalPlayer:'PASS',viewer:'YEAR2_LITE_PARITY',iPadRuntime:'LITE_EVENT_DRIVEN',unverifiedAutoMarking:'OFF',activated:catalog.summary.activated}));
