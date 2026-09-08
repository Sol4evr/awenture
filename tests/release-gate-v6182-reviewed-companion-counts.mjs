import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const qa=JSON.parse(fs.readFileSync(path.join(root,'dist/stage-papers/auto-question-count-verification.json'),'utf8'));
const review=JSON.parse(fs.readFileSync(path.join(root,'quality/stage-paper-question-count-reviewed-companion-evidence-v1.json'),'utf8'));
if(review.version!=='aw-stage-paper-reviewed-companion-count-evidence-v1')throw new Error('reviewed companion-count manifest version mismatch');
const sha256=abs=>crypto.createHash('sha256').update(fs.readFileSync(abs)).digest('hex');
const seen=new Set();
for(const r of review.evidence||[]){
  if(seen.has(r.learnerPath))throw new Error(`duplicate reviewed companion-count evidence: ${r.learnerPath}`);seen.add(r.learnerPath);
  if(r.learnerPath===r.companionPath)throw new Error(`companion provenance must use a distinct resource: ${r.learnerPath}`);
  const e=qa.papers?.[r.learnerPath];if(!e?.questionCountVerified||e.questionCount!==r.questionCount||e.method!=='reviewed-exact-companion-evidence')throw new Error(`reviewed companion-count not applied exactly: ${r.learnerPath}`);
  const learnerSha=sha256(path.join(root,r.learnerPath)),companionSha=sha256(path.join(root,r.companionPath));
  if(learnerSha!==r.learnerSha256||companionSha!==r.companionSha256)throw new Error(`reviewed companion disk SHA mismatch: ${r.learnerPath}`);
  if(e.evidence?.learnerSha256!==r.learnerSha256||e.evidence?.companionSha256!==r.companionSha256||e.evidence?.companionPath!==r.companionPath)throw new Error(`reviewed companion dual-SHA provenance mismatch: ${r.learnerPath}`);
  if(e.evidence?.reviewManifest!=='quality/stage-paper-question-count-reviewed-companion-evidence-v1.json')throw new Error(`reviewed companion manifest provenance missing: ${r.learnerPath}`);
}
if(seen.size!==4)throw new Error(`expected four reviewed companion papers, got ${seen.size}`);
console.log(JSON.stringify({release:'6.18.2',reviewedExactCompanionCountGate:'PASS',papers:seen.size,dualShaRequired:true,subjectDefaults:'FORBIDDEN',autoScoringImplied:false,progressionCreditImplied:false}));
