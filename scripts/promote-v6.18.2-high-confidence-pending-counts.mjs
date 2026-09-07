import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const qaPath=path.join(root,'dist/stage-papers/auto-question-count-verification.json');
const diagPath=path.join(root,'dist/stage-papers/pending-question-count-diagnostic.json');
if(!fs.existsSync(qaPath)||!fs.existsSync(diagPath))throw new Error('high-confidence promotion requires strict QA + pending diagnostic');
const qa=JSON.parse(fs.readFileSync(qaPath,'utf8'));
const diag=JSON.parse(fs.readFileSync(diagPath,'utf8'));
let promoted=0,skipped=0,blockedLearnerAnswerConflict=0,blockedSubsectionRange=0;
for(const c of diag.candidates||[]){
  if(c?.tier!=='A'){skipped++;continue}
  const e=qa.papers?.[c.sourcePath];
  if(!e||e.questionCountVerified){skipped++;continue}
  if(!Number.isInteger(c.count)||c.count<1||c.count>100)throw new Error(`invalid Tier A count: ${c.sourcePath}`);
  const allowedReasons=new Set(['explicit terminal range in learner paper','learner sequence with strong head/tail and terminal-page placement','same-PDF answer section with strong answer-number sequence']);
  if(!allowedReasons.has(c.reason))throw new Error(`unrecognised Tier A reason: ${c.sourcePath}`);
  if(c.reason==='same-PDF answer section with strong answer-number sequence'){
    if(!c.answerHeading||!c.answer||c.answer.max!==c.count||c.answer.coverage<.8||c.answer.head<2||c.answer.tail<5)throw new Error(`weak same-PDF answer evidence: ${c.sourcePath}`);
    const learnerMax=Number.isInteger(c?.learner?.max)?c.learner.max:null;
    const corroborated=(learnerMax===c.count)||(c.terminalRange===c.count);
    if(!corroborated){blockedLearnerAnswerConflict++;skipped++;continue}
  } else if(c.reason==='learner sequence with strong head/tail and terminal-page placement'){
    if(!c.learner||c.learner.max!==c.count||c.learner.coverage<.65||c.learner.head<2||c.learner.tail<5||c.pageWithMax<Math.max(1,Math.ceil(c.pageEnd*.65)))throw new Error(`weak learner terminal evidence: ${c.sourcePath}`);
  } else if(c.reason==='explicit terminal range in learner paper') {
    if(c.terminalRange!==c.count||c.count<10)throw new Error(`invalid explicit terminal range: ${c.sourcePath}`);
    // A range such as "questions 15 to 21" is only a section boundary, not a paper total, unless
    // the independently extracted learner sequence reaches the same terminal question. This also
    // prevents an incorrectly truncated learner-page boundary from turning an internal subsection
    // into a false full-paper count.
    if(!c.learner||c.learner.max!==c.count||c.learner.coverage<.8||c.learner.tail<4){blockedSubsectionRange++;skipped++;continue}
  }
  e.questionCount=c.count;e.questionCountVerified=true;e.method='second-pass-same-paper-evidence';e.evidence={sourcePath:c.sourcePath,reason:c.reason,learner:c.learner||null,answer:c.answer||null,answerHeading:!!c.answerHeading,terminalRange:c.terminalRange||null,pageWithMax:c.pageWithMax||null,pageEnd:c.pageEnd||null};promoted++;
}
qa.summary={...(qa.summary||{}),secondPassPromoted:promoted,secondPassBlockedLearnerAnswerConflict:blockedLearnerAnswerConflict,secondPassBlockedSubsectionRange:blockedSubsectionRange};
qa.policy={...(qa.policy||{}),terminalRangeRequiresMatchingLearnerSequence:true};
qa.summary.verified=Object.values(qa.papers||{}).filter(e=>e.questionCountVerified).length;
qa.summary.pending=(qa.summary.total||Object.keys(qa.papers||{}).length)-qa.summary.verified;
fs.writeFileSync(qaPath,JSON.stringify(qa,null,2)+'\n');
console.log(JSON.stringify({release:'6.18.2',highConfidencePendingPromotion:'PASS',promoted,skipped,blockedLearnerAnswerConflict,blockedSubsectionRange,verified:qa.summary.verified,pending:qa.summary.pending}));
