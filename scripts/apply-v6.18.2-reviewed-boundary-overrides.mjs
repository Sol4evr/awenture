import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const catalogPath=path.join(root,'dist/stage-papers/catalog.json');
const reportPath=path.join(root,'dist/stage-papers/auto-boundary-verification.json');
const reviewPath=path.join(root,'quality/stage-paper-reviewed-boundaries-v1.json');
for(const p of [catalogPath,reportPath,reviewPath])if(!fs.existsSync(p))throw new Error(`reviewed boundary input missing: ${p}`);
const catalog=JSON.parse(fs.readFileSync(catalogPath,'utf8'));
const report=JSON.parse(fs.readFileSync(reportPath,'utf8'));
const review=JSON.parse(fs.readFileSync(reviewPath,'utf8'));
if(review.version!=='aw-stage-paper-reviewed-boundaries-v1')throw new Error('reviewed boundary version mismatch');
const papers=[];for(const s of Object.values(catalog.stages||{}))for(const p of s.papers||[])papers.push(p);
const meta=new Map(papers.map(p=>[p.sourcePath,p]));
function sha256(abs){return crypto.createHash('sha256').update(fs.readFileSync(abs)).digest('hex')}
let applied=0;
for(const r of review.overrides||[]){
  const p=meta.get(r.sourcePath);if(!p)throw new Error(`reviewed boundary source missing from catalog: ${r.sourcePath}`);
  if(p.stage!==r.stage||p.subject!==r.subject||Number(p.year||0)!==Number(r.year||0))throw new Error(`reviewed boundary metadata mismatch: ${r.sourcePath}`);
  const abs=path.join(root,r.sourcePath);if(!fs.existsSync(abs))throw new Error(`reviewed boundary source file missing: ${r.sourcePath}`);
  if(sha256(abs)!==r.sha256)throw new Error(`reviewed boundary SHA mismatch: ${r.sourcePath}`);
  if(!Number.isInteger(r.questionStartPage)||!Number.isInteger(r.questionEndPage)||r.questionStartPage<1||r.questionEndPage<r.questionStartPage)throw new Error(`invalid reviewed boundary: ${r.sourcePath}`);
  if(r.evidenceType!=='same-paper-explicit-stop-end-of-test'||r.provider!=='ACARA')throw new Error(`unapproved reviewed boundary evidence: ${r.sourcePath}`);
  const a=report.papers?.[r.sourcePath];if(!a)throw new Error(`auto boundary entry missing: ${r.sourcePath}`);
  if(Number.isInteger(a.questionEndPage)&&r.questionEndPage>a.questionEndPage)throw new Error(`reviewed boundary cannot expand learner pages: ${r.sourcePath}`);
  a.questionStartPage=r.questionStartPage;a.questionEndPage=r.questionEndPage;a.pageBoundaryVerified=true;
  a.method='reviewed-same-paper-terminal-stop';a.reviewEvidence={manifest:'quality/stage-paper-reviewed-boundaries-v1.json',sha256:r.sha256,provider:r.provider,evidenceType:r.evidenceType,evidencePage:r.evidencePage,terminalQuestion:r.terminalQuestion,reviewNote:r.reviewNote};a.reviewedBy='AWenture reviewed source QA';a.reviewedAt=new Date().toISOString();
  p.questionStartPage=r.questionStartPage;p.questionEndPage=r.questionEndPage;p.pageBoundaryVerified=true;p.learnerReady=true;
  p.governance={...(p.governance||{}),questionStartPage:r.questionStartPage,questionEndPage:r.questionEndPage,pageBoundaryVerified:true,learnerReady:true,reviewEvidence:a.reviewEvidence,reviewedBy:a.reviewedBy,reviewedAt:a.reviewedAt};applied++;
}
catalog.governance={...(catalog.governance||{}),reviewedBoundaryOverrides:'aw-stage-paper-reviewed-boundaries-v1'};
fs.writeFileSync(reportPath,JSON.stringify(report,null,2)+'\n');fs.writeFileSync(catalogPath,JSON.stringify(catalog,null,2)+'\n');
console.log(JSON.stringify({release:'6.18.2',reviewedBoundaryOverrides:'PASS',applied}));
