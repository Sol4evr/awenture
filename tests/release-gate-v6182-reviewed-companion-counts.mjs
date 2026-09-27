import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const qa=JSON.parse(fs.readFileSync(path.join(root,'dist/stage-papers/auto-question-count-verification.json'),'utf8'));
const review=JSON.parse(fs.readFileSync(path.join(root,'quality/stage-paper-question-count-reviewed-companion-evidence-v1.json'),'utf8'));
const baseline=JSON.parse(fs.readFileSync(path.join(root,'baseline/historical-corpus-v1.json'),'utf8'));
const sourceIndex=new Map(JSON.parse(fs.readFileSync(path.join(root,baseline.lfsIndex),'utf8')).objects.map(x=>[x.path,x.oid]));
if(review.version!=='aw-stage-paper-reviewed-companion-count-evidence-v1')throw new Error('reviewed companion-count manifest version mismatch');
const required=new Set([
  'source/original-icas/year4/Maths yr4/Maths B 2007 questions.pdf',
  'source/original-icas/year4/Maths yr4/Maths B 2008 questions.pdf',
  'source/original-icas/year4/Maths yr4/Maths B 2017 questions.pdf',
  'source/original-icas/year4/Maths yr4/Maths B 2018 questions.pdf',
  'source/original-icas/year4/English yr 4/English B 2007 questions.pdf'
]);
const seen=new Set();
for(const r of review.evidence||[]){
  if(seen.has(r.learnerPath))throw new Error(`duplicate reviewed companion-count evidence: ${r.learnerPath}`);seen.add(r.learnerPath);
  if(r.learnerPath===r.companionPath)throw new Error(`companion provenance must use a distinct resource: ${r.learnerPath}`);
  const e=qa.papers?.[r.learnerPath];if(!e?.questionCountVerified||e.questionCount!==r.questionCount||e.method!=='reviewed-exact-companion-evidence')throw new Error(`reviewed companion-count not applied exactly: ${r.learnerPath}`);
  const learnerSha=sourceIndex.get(r.learnerPath),companionSha=sourceIndex.get(r.companionPath);
  if(learnerSha!==r.learnerSha256||companionSha!==r.companionSha256)throw new Error(`reviewed companion immutable-index SHA mismatch: ${r.learnerPath}`);
  if(e.evidence?.learnerSha256!==r.learnerSha256||e.evidence?.companionSha256!==r.companionSha256||e.evidence?.companionPath!==r.companionPath)throw new Error(`reviewed companion dual-SHA provenance mismatch: ${r.learnerPath}`);
  if(e.evidence?.reviewManifest!=='quality/stage-paper-question-count-reviewed-companion-evidence-v1.json')throw new Error(`reviewed companion manifest provenance missing: ${r.learnerPath}`);
}
if(seen.size!==5)throw new Error(`expected five reviewed companion papers, got ${seen.size}`);
for(const p of required)if(!seen.has(p))throw new Error(`required reviewed companion paper missing: ${p}`);
console.log(JSON.stringify({release:'6.18.2',reviewedExactCompanionCountGate:'PASS',papers:seen.size,dualShaRequired:true,subjectDefaults:'FORBIDDEN',autoScoringImplied:false,progressionCreditImplied:false}));
