import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const qa=JSON.parse(fs.readFileSync(path.join(root,'dist/stage-papers/auto-question-count-verification.json'),'utf8'));
const specs=[
  {path:'quality/stage-paper-question-count-reviewed-source-evidence-v1.json',version:'aw-stage-paper-reviewed-source-count-evidence-v1'},
  {path:'quality/stage-paper-question-count-reviewed-source-evidence-v2.json',version:'aw-stage-paper-reviewed-source-count-evidence-v2'},
  {path:'quality/stage-paper-question-count-reviewed-source-evidence-v3.json',version:'aw-stage-paper-reviewed-source-count-evidence-v3'}
];
const seen=new Set();
for(const s of specs){const review=JSON.parse(fs.readFileSync(path.join(root,s.path),'utf8'));if(review.version!==s.version)throw new Error(`reviewed source-count manifest version mismatch: ${s.path}`);for(const r of review.evidence||[]){if(seen.has(r.sourcePath))throw new Error(`duplicate reviewed source-count evidence: ${r.sourcePath}`);seen.add(r.sourcePath);const e=qa.papers?.[r.sourcePath];if(!e?.questionCountVerified||e.questionCount!==r.questionCount||e.method!=='reviewed-exact-source-evidence')throw new Error(`reviewed source-count not applied exactly: ${r.sourcePath}`);const abs=path.join(root,r.sourcePath);const sha=crypto.createHash('sha256').update(fs.readFileSync(abs)).digest('hex');if(sha!==r.sha256||e.evidence?.sha256!==r.sha256)throw new Error(`reviewed source-count SHA provenance mismatch: ${r.sourcePath}`);if(e.evidence?.reviewManifest!==s.path)throw new Error(`reviewed source-count manifest provenance missing: ${r.sourcePath}`)}}
const nap='source/naplan/2017/Year 3/Example_Yr_3_Numeracy.pdf';if(qa.papers?.[nap]?.questionCount!==35||!qa.papers?.[nap]?.questionCountVerified)throw new Error('NAPLAN sample Numeracy must be verified at 35 questions');
console.log(JSON.stringify({release:'6.18.2',reviewedExactSourceCountGate:'PASS',manifests:specs.length,papers:seen.size,naplanSampleNumeracyCount:35,subjectDefaults:'FORBIDDEN',autoScoringImplied:false,progressionCreditImplied:false}));
