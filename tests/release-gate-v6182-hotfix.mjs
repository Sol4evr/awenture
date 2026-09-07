import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const dist=path.join(root,'dist');
const js=fs.readFileSync(path.join(dist,'stage-formal-tests.js'),'utf8');
const hasNativeStageHeading=js.includes('function syncStageHeading')&&js.includes('el.textContent=label');
const hasHotfixStageHeading=js.includes("eyebrow.textContent=STAGE_LABELS[stage]||stage");
if(!hasNativeStageHeading&&!hasHotfixStageHeading)throw new Error('stage-specific Subject tests heading sync missing');
if(!js.includes('getDocument({url:active.paper.assetPath'))throw new Error('stage PDF loader must preserve Year 2-style URL/range loading');
if(js.includes('arrayBuffer()'))throw new Error('whole-file PDF byte preload must not return');
if(!js.includes('RenderingCancelledException')||!js.includes("document.createElement('canvas')"))throw new Error('atomic page rendering/cancellation missing');
const catalog=JSON.parse(fs.readFileSync(path.join(dist,'stage-papers','catalog.json'),'utf8'));
const remote=catalog.delivery==='github-source-proxy-v1';
const required=['icas-y3','naplan-y3','icas-y4','oc-prep'];
for(const stage of required){
  const papers=catalog.stages?.[stage]?.papers||[];
  if(!papers.length)throw new Error(`No papers for ${stage}`);
  for(const p of papers){
    if(remote){
      if(p.delivery!=='github-source-proxy-v1'||!p.sourcePath?.startsWith('source/')||!String(p.assetPath||'').startsWith('/api/paper?path='))throw new Error(`Invalid GitHub paper resolver: ${p.sourcePath}`);
    }else{
      const file=path.join(dist,p.assetPath.replace(/^\//,''));
      if(!fs.existsSync(file))throw new Error(`Missing PDF asset: ${p.assetPath}`);
      const head=fs.readFileSync(file).subarray(0,5).toString('ascii');
      if(head!=='%PDF-')throw new Error(`Invalid PDF asset: ${p.assetPath}`);
    }
  }
}
if(remote&&!fs.existsSync(path.join(root,'api','paper.js')))throw new Error('GitHub paper resolver function missing');
console.log(JSON.stringify({release:'6.18.2',stageHeading:'PASS',stagePdfAssets:remote?'REMOTE_GITHUB_SOURCE':'LOCAL_DIST',paperDelivery:catalog.delivery||'local-assets',loader:'YEAR2_LITE_URL_RANGE'}));
