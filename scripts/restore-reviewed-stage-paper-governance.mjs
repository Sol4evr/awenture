import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const baseline=JSON.parse(fs.readFileSync(path.join(root,'baseline/historical-corpus-v1.json'),'utf8'));
const index=JSON.parse(fs.readFileSync(path.join(root,baseline.lfsIndex),'utf8'));
const byPath=new Map(index.objects.map(entry=>[entry.path,entry]));
const outDir=path.join(root,'dist','stage-papers');
const outputs={catalog:'catalog.json',boundaries:'auto-boundary-verification.json',questionCounts:'auto-question-count-verification.json'};

function sha256(buf){return crypto.createHash('sha256').update(buf).digest('hex')}
function readPinned(key){
  const spec=baseline.reviewedGovernance?.[key];
  if(!spec?.path||!spec?.sha256)throw new Error(`Missing reviewed governance specification: ${key}`);
  const bytes=fs.readFileSync(path.join(root,spec.path));
  const actual=sha256(bytes);
  if(actual!==spec.sha256)throw new Error(`Reviewed governance artifact SHA mismatch: ${spec.path}`);
  return {spec,bytes,value:JSON.parse(bytes)};
}

if(process.env.AW_REBUILD_HISTORICAL_BASELINE==='1'){
  console.log(JSON.stringify({reviewedStagePaperGovernance:'DEEP_REBUILD_PRESERVED',baseline:baseline.id}));
  process.exit(0);
}

const artifacts=Object.fromEntries(Object.keys(outputs).map(key=>[key,readPinned(key)]));
const catalog=artifacts.catalog.value;
const boundaries=artifacts.boundaries.value;
const counts=artifacts.questionCounts.value;
const papers=Object.values(catalog.stages||{}).flatMap(stage=>stage.papers||[]);
if(papers.length!==187||catalog.summary?.sourcePdfs!==602)throw new Error('Reviewed catalog accounting regression');
if(boundaries.version!=='aw-stage-auto-boundary-1'||boundaries.summary?.verified!==187||boundaries.summary?.pending!==0)throw new Error('Reviewed boundary governance regression');
if(counts.version!=='aw-stage-question-count-8-strict-partials'||counts.summary?.verified!==184||counts.summary?.pending!==3)throw new Error('Reviewed question-count governance regression');
for(const paper of papers){
  const indexed=byPath.get(paper.sourcePath);
  if(!indexed)throw new Error(`Reviewed paper absent from immutable corpus index: ${paper.sourcePath}`);
  if(!boundaries.papers?.[paper.sourcePath]||!counts.papers?.[paper.sourcePath])throw new Error(`Reviewed paper governance incomplete: ${paper.sourcePath}`);
  const reviewedSha=paper.governance?.reviewEvidence?.sha256;
  if(reviewedSha&&reviewedSha!==indexed.oid)throw new Error(`Reviewed paper SHA is not bound to immutable corpus index: ${paper.sourcePath}`);
}
fs.mkdirSync(outDir,{recursive:true});
for(const [key,name] of Object.entries(outputs))fs.writeFileSync(path.join(outDir,name),artifacts[key].bytes);
await import('./finalize-v6.18.2-paper-proxy-manifest.mjs');
console.log(JSON.stringify({reviewedStagePaperGovernance:'PASS',baseline:baseline.id,papers:papers.length,boundariesVerified:boundaries.summary.verified,questionCountsVerified:counts.summary.verified,governedResidualEntries:counts.summary.pending,sourceBinariesRead:0}));
