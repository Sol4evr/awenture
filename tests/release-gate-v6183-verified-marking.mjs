import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';

const require=createRequire(import.meta.url);
const {VERIFIED_PAPERS,scorePaper}=require('../server/stage-paper-answer-keys.cjs');
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const distRuntime=fs.readFileSync(path.join(root,'dist','stage-formal-tests.js'),'utf8');
const html=fs.readFileSync(path.join(root,'dist','index.html'),'utf8');
const api=fs.readFileSync(path.join(root,'api','mark-paper.js'),'utf8');

function assert(condition,message){if(!condition)throw new Error(message)}
function responseObject(values){return Object.fromEntries(values.map((v,i)=>[i+1,v]))}

assert(Object.keys(VERIFIED_PAPERS).length===2,'Initial verified marking tranche must contain exactly two papers');
for(const paper of Object.values(VERIFIED_PAPERS)){
  assert(paper.review?.status==='verified',`${paper.paperId}: review status must be verified`);
  assert(/^[a-f0-9]{64}$/.test(paper.learnerSha256),`${paper.paperId}: learner SHA missing`);
  assert(/^[a-f0-9]{64}$/.test(paper.answerSha256),`${paper.paperId}: answer SHA missing`);
  assert(paper.answers.length===paper.questionCount,`${paper.paperId}: answer count mismatch`);
  assert(paper.review?.automaticPromotion===false,`${paper.paperId}: automatic promotion must remain false`);

  const allCorrect=scorePaper(paper.paperId,responseObject(paper.answers));
  assert(allCorrect.correct===paper.questionCount,`${paper.paperId}: all-correct synthetic score failed`);
  assert(allCorrect.percentage===100,`${paper.paperId}: all-correct percentage failed`);
  assert(allCorrect.progressionCredit===false,`${paper.paperId}: progression credit must remain disabled`);

  const allWrong=scorePaper(paper.paperId,responseObject(paper.answers.map(v=>String(v)==='A'?'B':'A')));
  assert(allWrong.correct===0,`${paper.paperId}: all-wrong synthetic score failed`);
  assert(allWrong.percentage===0,`${paper.paperId}: all-wrong percentage failed`);

  const split=Math.floor(paper.questionCount/2);
  const mixed=paper.answers.map((v,i)=>i<split?v:(String(v)==='A'?'B':'A'));
  const mixedScore=scorePaper(paper.paperId,responseObject(mixed));
  assert(mixedScore.correct===split,`${paper.paperId}: mixed synthetic score failed`);
}

const numeracy=VERIFIED_PAPERS['5d634c70edf0b6cd'];
assert(JSON.stringify(numeracy.responseSchema.shortResponse)===JSON.stringify([11,25,29,32,33,34,35]),'NAPLAN Numeracy short-response schema changed');
assert(scorePaper('not-verified',{})===null,'Unverified paper must fail closed');
assert(html.includes('awenture-release\" content=\"6.18.3\"'),'v6.18.3 release marker missing');
assert(distRuntime.includes("fetch('/api/mark-paper'"),'Runtime must call server-side marking endpoint');
assert(distRuntime.includes('progressionCredit:false'),'Runtime must not grant progression credit');
assert(distRuntime.includes('independently verified answer mapping'),'Verified marking result copy missing');
assert(!distRuntime.includes("'5d634c70edf0b6cd': Object.freeze"),'Answer mapping must not be bundled into learner runtime');
assert(!distRuntime.includes("'c7b97767539d3dd9': Object.freeze"),'ICAS answer mapping must not be bundled into learner runtime');
assert(!api.includes('answers: Object.freeze'),'API handler must not duplicate or serialize answer maps');
assert(!api.includes('correctAnswers'),'API must not expose per-question answers');
assert(!api.includes('answerKey'),'API must not expose answer-key fields');

console.log(JSON.stringify({release:'6.18.3',verifiedMarkingGate:'PASS',verifiedPapers:2,syntheticScoring:['all-correct','all-wrong','mixed'],progressionCredit:false,learnerAnswerKeyExposure:false}));
