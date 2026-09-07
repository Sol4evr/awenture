import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const qaPath=path.join(root,'dist/stage-papers/auto-question-count-verification.json');
const catalogPath=path.join(root,'dist/stage-papers/catalog.json');
const reviewPath=path.join(root,'quality/stage-paper-question-count-reviewed-source-evidence-v1.json');
for(const p of [qaPath,catalogPath,reviewPath])if(!fs.existsSync(p))throw new Error(`reviewed source-count input missing: ${p}`);
const qa=JSON.parse(fs.readFileSync(qaPath,'utf8'));
const catalog=JSON.parse(fs.readFileSync(catalogPath,'utf8'));
const review=JSON.parse(fs.readFileSync(reviewPath,'utf8'));
if(review.version!=='aw-stage-paper-reviewed-source-count-evidence-v1')throw new Error('reviewed source-count version mismatch');
const meta=new Map();for(const s of Object.values(catalog.stages||{}))for(const p of s.papers||[])meta.set(p.sourcePath,p);
function sha256(abs){return crypto.createHash('sha256').update(fs.readFileSync(abs)).digest('hex')}
const allowedTypes=new Set(['same-paper-explicit-terminal-stop','same-paper-explicit-terminal-range','same-paper-complete-answer-sequence','same-paper-terminal-question-sequence']);
let applied=0,alreadyVerified=0;
for(const r of review.evidence||[]){
  const p=meta.get(r.sourcePath);if(!p)throw new Error(`reviewed source-count paper not in catalog: ${r.sourcePath}`);
  if(p.stage!==r.stage||p.subject!==r.subject||Number(p.year||0)!==Number(r.year||0))throw new Error(`reviewed source-count metadata mismatch: ${r.sourcePath}`);
  const abs=path.join(root,r.sourcePath);if(!fs.existsSync(abs))throw new Error(`reviewed source-count file missing: ${r.sourcePath}`);
  if(sha256(abs)!==r.sha256)throw new Error(`reviewed source-count SHA mismatch: ${r.sourcePath}`);
  if(!allowedTypes.has(r.evidenceType))throw new Error(`unapproved reviewed source-count evidence type: ${r.sourcePath}`);
  if(!Number.isInteger(r.questionCount)||r.questionCount<1||r.questionCount>100)throw new Error(`invalid reviewed source count: ${r.sourcePath}`);
  if(!Number.isInteger(r.evidencePage)||r.evidencePage<1)throw new Error(`reviewed source-count evidence page required: ${r.sourcePath}`);
  if(typeof r.evidenceText!=='string'||r.evidenceText.trim().length<8)throw new Error(`reviewed source-count evidence text required: ${r.sourcePath}`);
  const e=qa.papers?.[r.sourcePath];if(!e)throw new Error(`QA entry missing: ${r.sourcePath}`);
  if(e.questionCountVerified){if(e.questionCount!==r.questionCount)throw new Error(`reviewed source-count conflicts with existing verified count: ${r.sourcePath}`);alreadyVerified++;continue}
  e.questionCount=r.questionCount;e.questionCountVerified=true;e.method='reviewed-exact-source-evidence';
  e.evidence={reviewManifest:'quality/stage-paper-question-count-reviewed-source-evidence-v1.json',sha256:r.sha256,provider:r.provider||null,evidenceType:r.evidenceType,evidencePage:r.evidencePage,evidenceText:r.evidenceText,reviewNote:r.reviewNote||null};applied++;
}
qa.summary={...(qa.summary||{}),reviewedExactSourceApplied:applied};qa.summary.verified=Object.values(qa.papers||{}).filter(e=>e.questionCountVerified).length;qa.summary.pending=(qa.summary.total||Object.keys(qa.papers||{}).length)-qa.summary.verified;
fs.writeFileSync(qaPath,JSON.stringify(qa,null,2)+'\n');
console.log(JSON.stringify({release:'6.18.2',reviewedExactSourceCountEvidence:'PASS',applied,alreadyVerified,verified:qa.summary.verified,pending:qa.summary.pending}));
