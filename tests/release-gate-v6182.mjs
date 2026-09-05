import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const dist=path.join(root,'dist');
const html=fs.readFileSync(path.join(dist,'index.html'),'utf8');
if(!html.includes('awenture-release" content="6.18.2"'))throw new Error('v6.18.2 release marker missing');
if(!html.includes('/stage-formal-tests.js?v=61820'))throw new Error('stage formal test runtime missing');
const js=fs.readFileSync(path.join(dist,'stage-formal-tests.js'),'utf8');
for(const marker of ['syncStageIsolation','stage-historical-formal','data-aw-stage-paper','data-aw-stage-timer','pdf.min.mjs','CONDITIONS'])if(!js.includes(marker))throw new Error(`stage formal runtime marker missing: ${marker}`);
if(js.includes('MutationObserver'))throw new Error('stage formal runtime must remain lite/event-driven');
if(!js.includes("y2Grid.hidden=later")||!js.includes("y2Note.hidden=later"))throw new Error('Year 2 historical test UI must be hidden outside ICAS Y2');
for(const stage of ["'icas-y3'","'naplan-y3'","'icas-y4'","'oc-prep'"])if(!js.includes(stage))throw new Error(`missing stage condition: ${stage}`);
if(!js.includes("score:null,verified:false"))throw new Error('unverified later-stage historical papers must not auto-score');
console.log(JSON.stringify({release:'6.18.2',stageIsolation:'PASS',stageFormalPlayer:'PASS',iPadRuntime:'LITE_EVENT_DRIVEN',unverifiedAutoMarking:'OFF'}));
