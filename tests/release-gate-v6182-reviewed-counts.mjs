import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const qa=JSON.parse(fs.readFileSync(path.join(root,'dist/stage-papers/auto-question-count-verification.json'),'utf8'));
const review=JSON.parse(fs.readFileSync(path.join(root,'quality/stage-paper-question-count-reviewed-evidence-v1.json'),'utf8'));
const exactPath=path.join(root,'quality/stage-paper-question-count-reviewed-source-evidence-v1.json');
const exact=fs.existsSync(exactPath)?JSON.parse(fs.readFileSync(exactPath,'utf8')):{evidence:[]};
const exactByPath=new Map((exact.evidence||[]).map(r=>[r.sourcePath,r]));
if(review.version!=='aw-stage-paper-reviewed-count-evidence-v1')throw new Error('review manifest version mismatch');
const seen=new Set();for(const r of review.evidence||[]){
  if(seen.has(r.sourcePath))throw new Error(`duplicate reviewed evidence: ${r.sourcePath}`);seen.add(r.sourcePath);
  const e=qa.papers?.[r.sourcePath];if(!e?.questionCountVerified||e.questionCount!==r.questionCount)throw new Error(`reviewed evidence not applied exactly: ${r.sourcePath}`);
  const stronger=exactByPath.get(r.sourcePath);
  if(stronger){
    if(stronger.questionCount!==r.questionCount)throw new Error(`official/exact reviewed evidence conflict: ${r.sourcePath}`);
    if(e.method!=='reviewed-exact-source-evidence'||e.evidence?.reviewManifest!=='quality/stage-paper-question-count-reviewed-source-evidence-v1.json')throw new Error(`stronger exact-source provenance not retained: ${r.sourcePath}`);
  }else{
    if(e.method!=='reviewed-official-answer-sheet')throw new Error(`reviewed evidence method mismatch: ${r.sourcePath}`);
    if(e.evidence?.reviewManifest!=='quality/stage-paper-question-count-reviewed-evidence-v1.json')throw new Error(`reviewed manifest provenance missing: ${r.sourcePath}`);
    if(e.evidence?.sourceUrl!==r.sourceUrl||e.evidence?.provider!==r.provider)throw new Error(`reviewed provenance mismatch: ${r.sourcePath}`);
  }
  if(r.provider!=='ACARA')throw new Error(`non-ACARA reviewed source: ${r.sourcePath}`);
  if(r.evidenceType==='official-year3-answer-sheet-column-end'){if(!/^https:\/\/(?:www\.)?acara\.edu\.au\//i.test(r.sourceUrl))throw new Error(`non-official answer-sheet source: ${r.sourcePath}`)}
  else if(r.evidenceType==='official-example-test-terminal-question'){if(!/^https:\/\/(?:www\.)?nap\.edu\.au\//i.test(r.sourceUrl)||r.questionCount!==35)throw new Error(`non-official example-test evidence: ${r.sourcePath}`)}
  else throw new Error(`unapproved reviewed evidence type: ${r.sourcePath}`);
}
console.log(JSON.stringify({release:'6.18.2',reviewedOfficialCountGate:'PASS',papers:seen.size,strongerExactSourceOverrides:[...seen].filter(s=>exactByPath.has(s)).length,answerSheetAndExampleEvidence:'GATED',subjectDefaults:'FORBIDDEN',autoScoringImplied:false,progressionCreditImplied:false}));
