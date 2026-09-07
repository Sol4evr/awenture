import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const qaPath=path.join(root,'dist/stage-papers/auto-question-count-verification.json');
const catalogPath=path.join(root,'dist/stage-papers/catalog.json');
const evidencePath=path.join(root,'quality/stage-paper-question-count-reviewed-evidence-v1.json');
for(const p of [qaPath,catalogPath,evidencePath])if(!fs.existsSync(p))throw new Error(`reviewed paper-count evidence input missing: ${p}`);
const qa=JSON.parse(fs.readFileSync(qaPath,'utf8'));
const catalog=JSON.parse(fs.readFileSync(catalogPath,'utf8'));
const review=JSON.parse(fs.readFileSync(evidencePath,'utf8'));
if(review.version!=='aw-stage-paper-reviewed-count-evidence-v1')throw new Error('reviewed evidence version mismatch');
const meta=new Map();for(const s of Object.values(catalog.stages||{}))for(const p of s.papers||[])meta.set(p.sourcePath,p);
const allowedProviders=new Set(['ACARA','NAP']);
let applied=0,alreadyVerified=0;
for(const r of review.evidence||[]){
  const p=meta.get(r.sourcePath);if(!p)throw new Error(`reviewed source not in active catalog: ${r.sourcePath}`);
  if(p.stage!==r.stage||p.subject!==r.subject||Number(p.year||0)!==Number(r.year||0))throw new Error(`reviewed metadata mismatch: ${r.sourcePath}`);
  if(!Number.isInteger(r.questionCount)||r.questionCount<1||r.questionCount>100)throw new Error(`invalid reviewed count: ${r.sourcePath}`);
  if(!allowedProviders.has(r.provider))throw new Error(`unapproved reviewed provider: ${r.sourcePath}`);
  if(r.evidenceType!=='official-year3-answer-sheet-column-end')throw new Error(`unapproved reviewed evidence type: ${r.sourcePath}`);
  if(typeof r.sourceUrl!=='string'||!/^https:\/\/(?:www\.)?acara\.edu\.au\//i.test(r.sourceUrl))throw new Error(`official source URL required: ${r.sourcePath}`);
  const e=qa.papers?.[r.sourcePath];if(!e)throw new Error(`QA entry missing: ${r.sourcePath}`);
  if(e.questionCountVerified){
    if(e.questionCount!==r.questionCount)throw new Error(`reviewed evidence conflicts with existing verified count: ${r.sourcePath}`);
    alreadyVerified++;continue;
  }
  e.questionCount=r.questionCount;e.questionCountVerified=true;e.method='reviewed-official-answer-sheet';
  e.evidence={reviewManifest:'quality/stage-paper-question-count-reviewed-evidence-v1.json',provider:r.provider,evidenceType:r.evidenceType,sourceUrl:r.sourceUrl,reviewNote:r.reviewNote};applied++;
}
qa.summary={...(qa.summary||{}),reviewedOfficialApplied:applied};qa.summary.verified=Object.values(qa.papers||{}).filter(e=>e.questionCountVerified).length;qa.summary.pending=(qa.summary.total||Object.keys(qa.papers||{}).length)-qa.summary.verified;
fs.writeFileSync(qaPath,JSON.stringify(qa,null,2)+'\n');
console.log(JSON.stringify({release:'6.18.2',reviewedOfficialCountEvidence:'PASS',applied,alreadyVerified,verified:qa.summary.verified,pending:qa.summary.pending}));
