import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const p=path.join(root,'dist/stage-papers/auto-question-count-verification.json');
if(!fs.existsSync(p))throw new Error('strict question-count verification missing');
const qa=JSON.parse(fs.readFileSync(p,'utf8'));
if(qa.version!=='aw-stage-question-count-5-strict')throw new Error('strict question-count reconciliation version missing');
if(!qa.policy?.crossSubjectSupportForbidden||!qa.policy?.subjectDefaultForbidden)throw new Error('strict question-count governance flags missing');
for(const [src,e] of Object.entries(qa.papers||{})){
  if(e.questionCountVerified&&(!Number.isInteger(e.questionCount)||e.questionCount<1||e.questionCount>100))throw new Error(`invalid verified count: ${src}`);
  if(e.questionCountVerified&&e?.evidence?.supportPath){const s=e.evidence.supportPath.toLowerCase(),srcL=src.toLowerCase();const subjects=['digital','english','math','science','spell','reading','numeracy','language','thinking'];const sourceSubject=subjects.find(x=>srcL.includes(x));if(sourceSubject&&['digital','english','math','science','spell'].includes(sourceSubject)&&!s.includes(sourceSubject))throw new Error(`cross-subject support evidence survived strict gate: ${src} <- ${e.evidence.supportPath}`)}
}
console.log(JSON.stringify({release:'6.18.2',strictQuestionCountGate:'PASS',verified:qa.summary.verified,pending:qa.summary.pending,crossSubjectSupport:'FORBIDDEN',subjectDefault:'FORBIDDEN'}));
