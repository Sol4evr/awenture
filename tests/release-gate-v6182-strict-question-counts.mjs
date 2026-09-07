import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const p=path.join(root,'dist/stage-papers/auto-question-count-verification.json');
if(!fs.existsSync(p))throw new Error('strict question-count verification missing');
const qa=JSON.parse(fs.readFileSync(p,'utf8'));
if(qa.version!=='aw-stage-question-count-8-strict-partials')throw new Error('strict partial-paper reconciliation version missing');
if(!qa.policy?.crossSubjectSupportForbidden||!qa.policy?.subjectDefaultForbidden||!qa.policy?.weakSequenceForbidden||!qa.policy?.propagatedEvidenceRequiresIndependentVerifiedSource||!qa.policy?.discontinuousPartialFilenameForbiddenAsFullCount)throw new Error('strict question-count governance flags missing');
const propagated=new Set(['duplicate-binary-match','same-source-identity-match']);
function hasIndependentVerifiedProvenance(src,seen=new Set()){
  if(seen.has(src))return false;seen.add(src);
  const e=qa.papers?.[src];if(!e?.questionCountVerified)return false;
  if(!propagated.has(e.method))return true;
  const ref=e?.evidence?.matchingSourcePath;if(!ref)return false;
  const r=qa.papers?.[ref];if(!r?.questionCountVerified||r.questionCount!==e.questionCount)return false;
  if(e.method==='duplicate-binary-match'&&e.sha256&&r.sha256&&e.sha256!==r.sha256)return false;
  return hasIndependentVerifiedProvenance(ref,seen);
}
for(const [src,e] of Object.entries(qa.papers||{})){
  if(e.questionCountVerified&&(!Number.isInteger(e.questionCount)||e.questionCount<1||e.questionCount>100))throw new Error(`invalid verified count: ${src}`);
  if(e.questionCountVerified&&e?.evidence?.supportPath){const s=e.evidence.supportPath.toLowerCase(),srcL=src.toLowerCase();const subjects=['digital','english','math','science','spell','reading','numeracy','language','thinking'];const sourceSubject=subjects.find(x=>srcL.includes(x));if(sourceSubject&&['digital','english','math','science','spell'].includes(sourceSubject)&&!s.includes(sourceSubject))throw new Error(`cross-subject support evidence survived strict gate: ${src} <- ${e.evidence.supportPath}`)}
  if(e.questionCountVerified&&['learner-numbered-sequence','embedded-answer-sequence','support-answer-sequence','support-numbered-sequence'].includes(e.method)){const cov=e?.evidence?.coverage??e?.evidence?.evidence?.coverage;if(typeof cov!=='number'||cov<.95)throw new Error(`weak sequence survived strict gate: ${src}`)}
  if(e.questionCountVerified&&propagated.has(e.method)&&!hasIndependentVerifiedProvenance(src))throw new Error(`orphaned propagated count survived strict gate: ${src}`);
  if(e.questionCountVerified&&e.method==='second-pass-same-paper-evidence'){
    const ev=e.evidence;if(!ev||ev.sourcePath!==src)throw new Error(`second-pass evidence not same-paper: ${src}`);
    const reason=ev.reason;
    if(reason==='same-PDF answer section with strong answer-number sequence'){
      if(!ev.answerHeading||!ev.answer||ev.answer.max!==e.questionCount||ev.answer.coverage<.8||ev.answer.head<2||ev.answer.tail<5)throw new Error(`weak second-pass answer evidence: ${src}`);
      const learnerMax=Number.isInteger(ev?.learner?.max)?ev.learner.max:null;
      if(learnerMax!==e.questionCount&&ev.terminalRange!==e.questionCount)throw new Error(`learner/answer terminal-count conflict survived strict gate: ${src}`);
    }else if(reason==='learner sequence with strong head/tail and terminal-page placement'){
      if(!ev.learner||ev.learner.max!==e.questionCount||ev.learner.coverage<.65||ev.learner.head<2||ev.learner.tail<5||ev.pageWithMax<Math.max(1,Math.ceil(ev.pageEnd*.65)))throw new Error(`weak second-pass learner evidence: ${src}`);
    }else if(reason==='explicit terminal range in learner paper'){
      if(ev.terminalRange!==e.questionCount||e.questionCount<10)throw new Error(`invalid second-pass explicit range: ${src}`);
    }else throw new Error(`unknown second-pass evidence reason: ${src}`);
  }
  if(e.questionCountVerified&&/q(?:uestion)?s?\s*\d{1,3}\s*[-–—]\s*\d{1,3}.*q(?:uestion)?s?\s*\d{1,3}\s*[-–—]\s*\d{1,3}/i.test(path.basename(src))&&e.method==='filename-explicit-question-range')throw new Error(`discontinuous partial paper treated as full count: ${src}`);
}
for(const bad of ['source/original-icas/year3/Digital A/Digital AB 2012.pdf','source/original-icas/year3/English A/English A 2012.pdf','source/original-icas/year3/Maths A/Maths A 2017.pdf','source/original-icas/year3/Science A/Science A 2017.pdf'])if(qa.papers?.[bad]?.questionCountVerified)throw new Error(`known cross-subject false match survived strict gate: ${bad}`);
console.log(JSON.stringify({release:'6.18.2',strictQuestionCountGate:'PASS',verified:qa.summary.verified,pending:qa.summary.pending,crossSubjectSupport:'FORBIDDEN',weakSequence:'FORBIDDEN',orphanedPropagation:'FORBIDDEN',partialPaperAsFullCount:'FORBIDDEN',learnerAnswerCountConflict:'FORBIDDEN',secondPassSamePaper:'GATED',subjectDefault:'FORBIDDEN'}));
