import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const qa=JSON.parse(fs.readFileSync(path.join(root,'dist/stage-papers/auto-question-count-verification.json'),'utf8'));
if(!qa.policy?.explicitCoverTotalsOpeningPagesOnly)throw new Error('explicit cover total opening-page scope policy missing');
if(!qa.policy?.ocrFuzzyCoverTotalsRequireCorroboration)throw new Error('OCR fuzzy cover total corroboration policy missing');
const audit=qa.coverCountProvenance?.audit||{};
let coverVerified=0;
for(const [src,e] of Object.entries(qa.papers||{})){
  if(e?.questionCountVerified&&['learner-total','full-document-total'].includes(e.method)&&Array.isArray(e.evidence)&&e.evidence.some(x=>x?.kind==='explicit-cover-total'))throw new Error(`ungated broad explicit cover evidence survived: ${src}`);
  if(e?.questionCountVerified&&e.method==='cover-explicit-total'){
    coverVerified++;const a=audit[src];if(!a||a.trustedCount!==e.questionCount)throw new Error(`cover-explicit total lacks matching opening-page audit: ${src}`);if(e.evidence?.scope!=='opening-pages-only')throw new Error(`cover-explicit total scope missing: ${src}`);
  }
}
const y3d='source/original-icas/year3/Digital A/Digital AB 2006.pdf';const yd=qa.papers?.[y3d];if(!yd?.questionCountVerified||yd.questionCount!==30||yd.method!=='cover-explicit-total')throw new Error('Y3 Digital 2006 must be verified as 30 from corroborated opening-page cover evidence');
console.log(JSON.stringify({release:'6.18.2',coverCountProvenanceGate:'PASS',coverVerified,y3Digital2006:30}));
