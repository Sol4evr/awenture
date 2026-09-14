import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';

const require=createRequire(import.meta.url);
const {VERIFIED_PAPERS,scorePaper}=require('../server/stage-paper-answer-keys-registry.cjs');
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const distRuntime=fs.readFileSync(path.join(root,'dist','stage-formal-tests.js'),'utf8');
const html=fs.readFileSync(path.join(root,'dist','index.html'),'utf8');
const api=fs.readFileSync(path.join(root,'api','mark-paper.js'),'utf8');
const review=JSON.parse(fs.readFileSync(path.join(root,'quality','v6.18.3-auto-marking-review.json'),'utf8'));
const catalog=JSON.parse(fs.readFileSync(path.join(root,'dist','stage-papers','catalog.json'),'utf8'));
const catalogPapers=Object.values(catalog.stages||{}).flatMap(stage=>stage.papers||[]);

function assert(condition,message){if(!condition)throw new Error(message)}
function questionNumbers(paper){return paper.sourceQuestionNumbers||paper.responseSchema?.sourceQuestionNumbers||paper.answers.map((_,i)=>i+1)}
function responseObject(paper,values){return Object.fromEntries(values.map((v,i)=>[questionNumbers(paper)[i],v]))}

assert(review.exactCompanionCandidates===30,'Exact companion candidate accounting changed');
assert(review.verifiedAutoMarking===29,'Verified auto-marking count must be 29');
assert(review.governedUnverified===1,'Exactly one governed auto-marking exception required');
assert(review.verifiedAutoMarking+review.governedUnverified===review.exactCompanionCandidates,'All 30 candidates must be accounted');
assert(Object.keys(VERIFIED_PAPERS).length===29,'Verified marking registry must contain exactly 29 papers');
const exception=review.governedExceptions?.[0];
assert(exception?.paperId==='0c01f6761d02b363','NAPLAN Reading must remain the governed rubric exception');
assert(exception.autoMarking===false&&exception.progressionCredit===false,'Governed rubric exception must remain fail closed');
assert(!VERIFIED_PAPERS[exception.paperId],'Governed rubric exception must not enter verified registry');
assert(scorePaper(exception.paperId,{})===null,'Governed rubric exception must not score');

for(const paper of Object.values(VERIFIED_PAPERS)){
  assert(paper.review?.status==='verified',`${paper.paperId}: review status must be verified`);
  assert(/^[a-f0-9]{64}$/.test(paper.learnerSha256),`${paper.paperId}: learner SHA missing`);
  assert(/^[a-f0-9]{64}$/.test(paper.answerSha256),`${paper.paperId}: answer SHA missing`);
  assert(paper.answers.length===paper.questionCount,`${paper.paperId}: answer count mismatch`);
  assert(questionNumbers(paper).length===paper.questionCount,`${paper.paperId}: source question-number mapping mismatch`);
  assert(new Set(questionNumbers(paper)).size===paper.questionCount,`${paper.paperId}: duplicate source question numbers`);
  assert(paper.review?.automaticPromotion===false,`${paper.paperId}: automatic promotion must remain false`);

  const allCorrect=scorePaper(paper.paperId,responseObject(paper,paper.answers));
  assert(allCorrect.correct===paper.questionCount,`${paper.paperId}: all-correct synthetic score failed`);
  assert(allCorrect.percentage===100,`${paper.paperId}: all-correct percentage failed`);
  assert(allCorrect.progressionCredit===false,`${paper.paperId}: progression credit must remain disabled`);

  const wrong=paper.answers.map(v=>String(v)==='A'?'B':'A');
  const allWrong=scorePaper(paper.paperId,responseObject(paper,wrong));
  assert(allWrong.correct===0,`${paper.paperId}: all-wrong synthetic score failed`);
  assert(allWrong.percentage===0,`${paper.paperId}: all-wrong percentage failed`);

  const split=Math.floor(paper.questionCount/2);
  const mixed=paper.answers.map((v,i)=>i<split?v:(String(v)==='A'?'B':'A'));
  const mixedScore=scorePaper(paper.paperId,responseObject(paper,mixed));
  assert(mixedScore.correct===split,`${paper.paperId}: mixed synthetic score failed`);
  assert(!distRuntime.includes(paper.answerSha256),`${paper.paperId}: answer-resource SHA must not leak into learner runtime`);
}

const numeracy=VERIFIED_PAPERS['5d634c70edf0b6cd'];
assert(JSON.stringify(numeracy.responseSchema.shortResponse)===JSON.stringify([11,25,29,32,33,34,35]),'NAPLAN Numeracy short-response schema changed');
assert(VERIFIED_PAPERS['6f723aa0818d12b6']?.questionCount===35,'ICAS Y3 English 2019 must have 35 mapped answers');
assert(VERIFIED_PAPERS['5575cbf572df45f7']?.sourceQuestionNumbers?.[0]===7&&VERIFIED_PAPERS['5575cbf572df45f7']?.sourceQuestionNumbers?.at(-1)===25,'OC Reading 2022 must preserve source Q7-Q25');
assert(VERIFIED_PAPERS['a96fae118504d88e']?.sourceQuestionNumbers?.[0]===12&&VERIFIED_PAPERS['a96fae118504d88e']?.sourceQuestionNumbers?.at(-1)===25,'OC Reading 2023 must preserve source Q12-Q25');
for(const id of ['75ebf21a849f3e35','7127d30d75e6909c','5575cbf572df45f7','a96fae118504d88e','e815a30ac10f1df6','8da83e9407965710','508f944973ca8c55'])assert(VERIFIED_PAPERS[id]?.choiceCount===7,`${id}: OC Reading must support A-G response choices`);

assert(scorePaper('not-verified',{})===null,'Unknown paper must fail closed');
assert(html.includes('awenture-release\" content=\"6.18.3\"'),'v6.18.3 release marker missing');
assert(distRuntime.includes("fetch('/api/mark-paper'"),'Runtime must call server-side marking endpoint');
assert(distRuntime.includes('progressionCredit:false'),'Runtime must not grant progression credit');
assert(distRuntime.includes('independently verified answer mapping'),'Verified marking result copy missing');
assert(distRuntime.includes('VERIFIED_RESPONSE_SCHEMAS'),'Public non-answer response schemas must be present');
assert(distRuntime.includes('questionCountVerified:true'),'Verified marking patch must preserve the timed-start question-count contract');
const timedPapers=catalogPapers.filter(p=>p.governance?.learnerReady===true&&p.questionCountVerified===true);
const governedCountResiduals=catalogPapers.filter(p=>p.governance?.learnerReady===true&&p.questionCountVerified!==true);
assert(timedPapers.length===184,'Exactly 184 strictly count-verified papers must be timed-startable');
assert(governedCountResiduals.length===3,'Exactly three governed residual entries must remain blocked from timed start');
for(const paper of timedPapers){
  assert(Number.isInteger(Number(paper.questionCount))&&Number(paper.questionCount)>0,`${paper.id}: timed paper has an invalid verified question count`);
}
assert(!!distRuntime.match(/function start\(p\)\{const cfg=conditionFor\(p\);if\(!cfg\|\|!cfg\.questionCountVerified\|\|!Number\.isInteger\(cfg\.questions\)\|\|cfg\.questions<1\)return;/), 'Timed start must fail closed on an unverified count');
assert(timedPapers.some(p=>p.id==='406fef68c08d7e1c'&&p.stage==='icas-y3'&&p.subject==='Science'&&Number(p.year)===2016),'ICAS Y3 2016 Science must remain in the learner-ready startability contract');
assert(distRuntime.includes('"choiceCount":7'),'OC Reading A-G response schema missing');
assert(distRuntime.includes('7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25'),'OC Reading 2022 source numbering missing');
assert(distRuntime.includes('12,13,14,15,16,17,18,19,20,21,22,23,24,25'),'OC Reading 2023 source numbering missing');
assert(!distRuntime.includes(exception.answerSha256),'Governed NAPLAN answer-resource SHA must not leak into learner runtime');
assert(api.includes("stage-paper-answer-keys-registry.cjs"),'Marking API must use governed registry');
assert(!api.includes('answers: Object.freeze'),'API handler must not duplicate or serialize answer maps');
assert(!api.includes('correctAnswers'),'API must not expose per-question answers');
assert(!api.includes('answerKey'),'API must not expose answer-key fields');

console.log(JSON.stringify({release:'6.18.3',verifiedMarkingGate:'PASS',exactCompanionCandidates:30,verifiedPapers:29,governedRubricExceptions:1,syntheticScoring:['all-correct','all-wrong','mixed'],progressionCredit:false,learnerAnswerKeyExposure:false,ocReadingChoiceRange:'A-G',nonContiguousSourceNumbering:'VERIFIED',timedPaperStartability:{catalogueWide:true,strictlyVerifiedPapers:timedPapers.length,governedResidualEntries:governedCountResiduals.length,reportedRegression:'406fef68c08d7e1c'}}));
