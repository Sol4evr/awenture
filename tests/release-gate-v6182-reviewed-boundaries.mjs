import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const catalog=JSON.parse(fs.readFileSync(path.join(root,'dist/stage-papers/catalog.json'),'utf8'));
const report=JSON.parse(fs.readFileSync(path.join(root,'dist/stage-papers/auto-boundary-verification.json'),'utf8'));
const review=JSON.parse(fs.readFileSync(path.join(root,'quality/stage-paper-reviewed-boundaries-v1.json'),'utf8'));
if(review.version!=='aw-stage-paper-reviewed-boundaries-v1')throw new Error('reviewed boundary manifest version mismatch');
const papers=new Map();for(const s of Object.values(catalog.stages||{}))for(const p of s.papers||[])papers.set(p.sourcePath,p);
for(const r of review.overrides||[]){const p=papers.get(r.sourcePath),a=report.papers?.[r.sourcePath];if(!p||!a)throw new Error(`reviewed boundary target missing: ${r.sourcePath}`);if(p.questionEndPage!==r.questionEndPage||a.questionEndPage!==r.questionEndPage)throw new Error(`reviewed boundary not applied exactly: ${r.sourcePath}`);if(!p.pageBoundaryVerified||!p.learnerReady||!a.pageBoundaryVerified)throw new Error(`reviewed boundary readiness missing: ${r.sourcePath}`);const abs=path.join(root,r.sourcePath);const sha=crypto.createHash('sha256').update(fs.readFileSync(abs)).digest('hex');if(sha!==r.sha256)throw new Error(`reviewed boundary SHA mismatch: ${r.sourcePath}`);if(a.reviewEvidence?.manifest!=='quality/stage-paper-reviewed-boundaries-v1.json')throw new Error(`reviewed boundary provenance missing: ${r.sourcePath}`)}
const nap='source/naplan/2017/Year 3/Example_Yr_3_Numeracy.pdf';if(papers.get(nap)?.questionEndPage!==14)throw new Error('NAPLAN sample Numeracy learner boundary must stop at page 14 before blank/practice pages');
console.log(JSON.stringify({release:'6.18.2',reviewedBoundaryGate:'PASS',overrides:(review.overrides||[]).length,naplanSampleNumeracyEndPage:14,practicePagesLearnerVisible:false}));
