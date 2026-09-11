import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const catalogPath=path.join(root,'dist','stage-papers','catalog.json');
const manifestPath=path.join(root,'api','paper-manifest.json');
const delivery='github-source-proxy-v2-allowlist';
if(!fs.existsSync(catalogPath))throw new Error(`paper proxy finalizer missing catalog: ${catalogPath}`);
const catalog=JSON.parse(fs.readFileSync(catalogPath,'utf8'));
if(catalog.release!=='6.18.2'||catalog.delivery!==delivery)throw new Error('paper proxy finalizer catalog contract mismatch');
const papers=[];for(const stage of Object.values(catalog.stages||{}))for(const p of stage.papers||[])papers.push(p);
if(papers.length!==187)throw new Error(`paper proxy finalizer requires 187 papers, got ${papers.length}`);
const entries={};
for(const p of papers){
  if(!p.id||entries[p.id])throw new Error(`invalid/duplicate paper id: ${p.id||'<missing>'}`);
  if(!p.sourcePath?.startsWith('source/')||!p.sourcePath.toLowerCase().endsWith('.pdf'))throw new Error(`invalid paper source: ${p.sourcePath}`);
  if(p.pageBoundaryVerified!==true||p.learnerReady!==true||!Number.isInteger(p.questionEndPage)||p.questionEndPage<1)throw new Error(`paper lacks verified learner delivery boundary: ${p.sourcePath}`);
  const reviewedSha=p.governance?.reviewEvidence?.sha256||null;
  if(reviewedSha!==null&&!/^[a-f0-9]{64}$/.test(reviewedSha))throw new Error(`invalid reviewed source SHA: ${p.sourcePath}`);
  entries[p.id]={sourcePath:p.sourcePath,deliveryStartPage:1,deliveryEndPage:p.questionEndPage,pageBoundaryVerified:true,sourceSha256:reviewedSha};
}
fs.writeFileSync(manifestPath,JSON.stringify({version:'aw-paper-proxy-manifest-v2',delivery,generatedAtBuild:true,learnerOnly:true,papers:entries},null,2)+'\n');
console.log(JSON.stringify({release:'6.18.2',paperProxyManifest:'PASS',version:'aw-paper-proxy-manifest-v2',papers:papers.length,learnerOnly:true,verifiedDeliveryBoundaries:papers.length,shaPinnedReviewedEntries:Object.values(entries).filter(x=>x.sourceSha256).length}));
