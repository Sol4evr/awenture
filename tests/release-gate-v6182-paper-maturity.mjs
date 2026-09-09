import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const p=path.join(root,'dist','stage-papers','paper-maturity-v1.json');
if(!fs.existsSync(p))throw new Error('paper maturity report missing');
const r=JSON.parse(fs.readFileSync(p,'utf8'));
const s=r.summary||{};
if(r.version!=='aw-stage-paper-maturity-v1')throw new Error('paper maturity report version mismatch');
if(s.papers!==187)throw new Error(`paper maturity accounting mismatch: ${s.papers} != 187`);
if(s.boundaryVerified!==187)throw new Error(`learner boundary regression: ${s.boundaryVerified}/187`);
if((s.countVerified||0)+(s.countGovernedExceptions||0)!==187)throw new Error('question-count maturity accounting must close 187/187');
if(s.countGovernedExceptions!==3)throw new Error(`governed question-count residual regression: ${s.countGovernedExceptions} != 3`);
if(s.unclassifiedResources!==0)throw new Error(`active-stage source resources remain unclassified: ${s.unclassifiedResources}`);
for(const x of r.papers||[]){
  if(x.progressionCredit&&x.scoring!=='verified')throw new Error(`unverified paper grants progression credit: ${x.sourcePath}`);
  if(x.scoring==='verified'&&x.answerMapping!=='verified')throw new Error(`verified scoring lacks verified answer mapping: ${x.sourcePath}`);
  if(x.questionCount==='governed-exception'&&(x.scoring==='verified'||x.progressionCredit))throw new Error(`governed count exception must remain fail-closed: ${x.sourcePath}`);
  if(x.timing==='stage-subject-default-not-source-verified'&&x.maturityState==='mature-verified')throw new Error(`generic timing may not qualify paper as mature verified: ${x.sourcePath}`);
  if(x.orientation==='pending-visual-qa'&&x.maturityState==='mature-verified')throw new Error(`orientation pending paper may not qualify as mature verified: ${x.sourcePath}`);
}
console.log(JSON.stringify({release:'6.18.2',paperMaturityGate:'PASS',papers:s.papers,boundaryVerified:s.boundaryVerified,countVerified:s.countVerified,countGovernedExceptions:s.countGovernedExceptions,objectiveAnswerMappingsVerified:s.objectiveAnswerMappingsVerified,objectiveAnswerMappingsPending:s.objectiveAnswerMappingsPending,writingPapers:s.writingPapers,unclassifiedResources:s.unclassifiedResources,matureVerified:s.matureVerified,matureGovernedExceptions:s.matureGovernedExceptions,maturityWorkRequired:s.maturityWorkRequired}));
