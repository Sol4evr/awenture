import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const stageDir=path.join(root,'dist','stage-papers');
const catalogPath=path.join(stageDir,'catalog.json');
const apiPath=path.join(root,'api','paper.js');
if(!fs.existsSync(catalogPath))throw new Error('remote paper delivery gate requires stage catalog');
if(!fs.existsSync(apiPath))throw new Error('remote paper delivery gate requires api/paper.js');
const catalog=JSON.parse(fs.readFileSync(catalogPath,'utf8'));
if(catalog.delivery!=='github-source-proxy-v1')throw new Error(`unexpected paper delivery mode: ${catalog.delivery}`);
const papers=[];for(const stage of Object.values(catalog.stages||{}))for(const p of stage.papers||[])papers.push(p);
if(papers.length!==187)throw new Error(`stage paper count regression: ${papers.length}/187`);
for(const p of papers){
  if(!p.sourcePath?.startsWith('source/')||!p.sourcePath.toLowerCase().endsWith('.pdf'))throw new Error(`invalid GitHub source path: ${p.sourcePath}`);
  const expected=`/api/paper?path=${encodeURIComponent(p.sourcePath)}`;
  if(p.assetPath!==expected)throw new Error(`paper resolver mismatch: ${p.sourcePath}`);
  if(p.delivery!=='github-source-proxy-v1')throw new Error(`paper delivery metadata mismatch: ${p.sourcePath}`);
}
const deployedPdfs=[];
function walk(dir){if(!fs.existsSync(dir))return;for(const e of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,e.name);if(e.isDirectory())walk(p);else if(e.isFile()&&e.name.toLowerCase().endsWith('.pdf'))deployedPdfs.push(path.relative(root,p).split(path.sep).join('/'))}}
walk(stageDir);
if(deployedPdfs.length)throw new Error(`stage PDFs must not be deployed: ${deployedPdfs.slice(0,5).join(', ')}`);
const api=fs.readFileSync(apiPath,'utf8');
for(const needle of ['AW_GITHUB_SOURCE_TOKEN','VERCEL_GIT_COMMIT_SHA','api.github.com/repos','Content-Range','X-AW-Paper-Source'])if(!api.includes(needle))throw new Error(`paper proxy contract missing: ${needle}`);
if(/gh[pousr]_[A-Za-z0-9_]{20,}/.test(api))throw new Error('GitHub credential must never be embedded in source');
console.log(JSON.stringify({release:'6.18.2',remotePaperDelivery:'PASS',delivery:catalog.delivery,papers:papers.length,deployedStagePdfs:0,githubCredentials:'SERVER_SIDE_ONLY',deploymentRef:'PINNED_TO_VERCEL_GIT_COMMIT_SHA'}));
