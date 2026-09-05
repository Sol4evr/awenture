import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const dist=path.join(root,'dist');
const js=fs.readFileSync(path.join(dist,'stage-formal-tests.js'),'utf8');
if(!js.includes("eyebrow.textContent=STAGE_LABELS[stage]||stage"))throw new Error('stage-specific Subject tests eyebrow sync missing');
if(!js.includes("credentials:'same-origin'"))throw new Error('stage PDF loader must fetch with same-origin credentials');
if(!js.includes("res.arrayBuffer()"))throw new Error('stage PDF loader must use byte fetch before PDF.js parsing');
if(!js.includes("%PDF-"))throw new Error('stage PDF payload signature guard missing');
const catalog=JSON.parse(fs.readFileSync(path.join(dist,'stage-papers','catalog.json'),'utf8'));
const required=['icas-y3','naplan-y3','icas-y4','oc-prep'];
for(const stage of required){
  const papers=catalog.stages?.[stage]?.papers||[];
  if(!papers.length)throw new Error(`No papers for ${stage}`);
  for(const p of papers){
    const file=path.join(dist,p.assetPath.replace(/^\//,''));
    if(!fs.existsSync(file))throw new Error(`Missing PDF asset: ${p.assetPath}`);
    const head=fs.readFileSync(file).subarray(0,5).toString('ascii');
    if(head!=='%PDF-')throw new Error(`Invalid PDF asset: ${p.assetPath}`);
  }
}
console.log(JSON.stringify({release:'6.18.2',stageHeading:'PASS',stagePdfAssets:'PASS',loader:'AUTHENTICATED_BYTE_FETCH'}));
