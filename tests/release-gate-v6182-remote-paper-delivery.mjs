import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const stageDir=path.join(root,'dist','stage-papers');
const catalogPath=path.join(stageDir,'catalog.json');
const apiPath=path.join(root,'api','paper.js');
const manifestPath=path.join(root,'api','paper-manifest.json');
for(const p of [catalogPath,apiPath,manifestPath])if(!fs.existsSync(p))throw new Error(`remote paper delivery gate missing: ${p}`);
const catalog=JSON.parse(fs.readFileSync(catalogPath,'utf8'));
const delivery='github-source-proxy-v2-allowlist';
if(catalog.delivery!==delivery)throw new Error(`unexpected paper delivery mode: ${catalog.delivery}`);
const papers=[];for(const stage of Object.values(catalog.stages||{}))for(const p of stage.papers||[])papers.push(p);
if(papers.length!==187)throw new Error(`stage paper count regression: ${papers.length}/187`);
const manifest=JSON.parse(fs.readFileSync(manifestPath,'utf8'));
if(manifest.version!=='aw-paper-proxy-manifest-v1'||manifest.delivery!==delivery)throw new Error('paper proxy allowlist manifest contract mismatch');
if(Object.keys(manifest.papers||{}).length!==papers.length)throw new Error(`paper proxy allowlist count mismatch: ${Object.keys(manifest.papers||{}).length}/${papers.length}`);
for(const p of papers){
  if(!p.sourcePath?.startsWith('source/')||!p.sourcePath.toLowerCase().endsWith('.pdf'))throw new Error(`invalid GitHub source path: ${p.sourcePath}`);
  const expected=`/api/paper?id=${encodeURIComponent(p.id)}`;
  if(p.assetPath!==expected)throw new Error(`paper resolver mismatch: ${p.sourcePath}`);
  if(p.delivery!==delivery)throw new Error(`paper delivery metadata mismatch: ${p.sourcePath}`);
  if(manifest.papers[p.id]!==p.sourcePath)throw new Error(`proxy allowlist mismatch: ${p.id}`);
  if(/answer|solution|worked|marking|mark scheme|rubric|criteria|commentary|transcript|results/i.test(path.basename(p.sourcePath)))throw new Error(`support/answer resource leaked into learner proxy allowlist: ${p.sourcePath}`);
}
const deployedPdfs=[];
function walk(dir){if(!fs.existsSync(dir))return;for(const e of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,e.name);if(e.isDirectory())walk(p);else if(e.isFile()&&e.name.toLowerCase().endsWith('.pdf'))deployedPdfs.push(path.relative(root,p).split(path.sep).join('/'))}}
walk(stageDir);
if(deployedPdfs.length)throw new Error(`stage PDFs must not be deployed: ${deployedPdfs.slice(0,5).join(', ')}`);
const api=fs.readFileSync(apiPath,'utf8');
for(const needle of ['AW_GITHUB_SOURCE_TOKEN','VERCEL_GIT_COMMIT_SHA','api.github.com/repos','content-range','X-AW-Paper-Source','paper-manifest.json'])if(!api.includes(needle))throw new Error(`paper proxy contract missing: ${needle}`);
if(api.includes('req.query?.path'))throw new Error('paper proxy must not accept arbitrary repository source paths');
if(/gh[pousr]_[A-Za-z0-9_]{20,}/.test(api))throw new Error('GitHub credential must never be embedded in source');

let githubSmoke='LOCAL_SKIP';
if(process.env.VERCEL==='1'){
  const auth=process.env.AW_GITHUB_SOURCE_TOKEN||process.env.GITHUB_TOKEN||process.env.GH_TOKEN||'';
  if(auth){
    const ref=process.env.AW_GITHUB_SOURCE_REF||process.env.VERCEL_GIT_COMMIT_SHA;
    if(!ref)throw new Error('Private GitHub paper delivery smoke check has credentials but no VERCEL_GIT_COMMIT_SHA or AW_GITHUB_SOURCE_REF');
    const sample=papers.find(p=>p.sourcePath.includes('Digital AB 2006.pdf'))||papers[0];
    const encodePath=p=>p.split('/').map(encodeURIComponent).join('/');
    const meta=await fetch(`https://api.github.com/repos/Sol4evr/awenture/contents/${encodePath(sample.sourcePath)}?ref=${encodeURIComponent(ref)}`,{headers:{Authorization:`Bearer ${auth}`,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28','User-Agent':'AWenture-release-gate'}});
    if(!meta.ok)throw new Error(`Private GitHub paper source metadata smoke check failed: HTTP ${meta.status}`);
    const body=await meta.json();
    if(body?.type!=='file'||!body.download_url)throw new Error('Private GitHub paper source smoke check did not resolve a file');
    const bytes=await fetch(body.download_url,{headers:{Authorization:`Bearer ${auth}`,Accept:'application/octet-stream',Range:'bytes=0-4','User-Agent':'AWenture-release-gate'}});
    if(!(bytes.ok||bytes.status===206))throw new Error(`Private GitHub paper byte-range smoke check failed: HTTP ${bytes.status}`);
    const head=Buffer.from(await bytes.arrayBuffer()).subarray(0,5).toString('ascii');
    if(head!=='%PDF-')throw new Error(`Private GitHub paper byte-range smoke check returned non-PDF bytes: ${JSON.stringify(head)}`);
    githubSmoke='PASS';
  }else githubSmoke='SKIP_NO_PREVIEW_TOKEN';
}
console.log(JSON.stringify({release:'6.18.2',remotePaperDelivery:'PASS',delivery,papers:papers.length,proxyAllowlist:papers.length,deployedStagePdfs:0,supportResourcesReachable:false,githubCredentials:'SERVER_SIDE_ONLY',deploymentRef:'PINNED_TO_VERCEL_GIT_COMMIT_SHA',githubSourceSmoke:githubSmoke}));
