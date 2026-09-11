import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const dist=path.join(root,'dist');
const catalogPath=path.join(dist,'stage-papers','catalog.json');
const jsPath=path.join(dist,'stage-formal-tests.js');
const registryPath=path.join(root,'bank','v6.18.2-stage-paper-verification.json');
if(!fs.existsSync(catalogPath)||!fs.existsSync(jsPath)||!fs.existsSync(registryPath))throw new Error('stage governance inputs missing');

const registry=JSON.parse(fs.readFileSync(registryPath,'utf8'));
if(registry.governance!=='aw-formal-paper-governance-1')throw new Error('stage paper verification registry contract mismatch');
const overrides=registry.papers||{};
const conditions={
  'icas-y3':{English:{minutes:45,questions:45,mode:'choice'},Mathematics:{minutes:45,questions:40,mode:'choice'},Science:{minutes:45,questions:30,mode:'choice'},'Digital Technologies':{minutes:30,questions:30,mode:'choice'},Spelling:{minutes:40,questions:40,mode:'choice'},Writing:{minutes:35,questions:1,mode:'writing'}},
  'icas-y4':{English:{minutes:45,questions:45,mode:'choice'},Mathematics:{minutes:45,questions:40,mode:'choice'},Science:{minutes:45,questions:30,mode:'choice'},'Digital Technologies':{minutes:30,questions:30,mode:'choice'},Spelling:{minutes:40,questions:45,mode:'choice'},Writing:{minutes:35,questions:1,mode:'writing'}},
  'naplan-y3':{Reading:{minutes:45,questions:39,mode:'mixed'},Numeracy:{minutes:45,questions:35,mode:'mixed'},'Language Conventions':{minutes:45,questions:51,mode:'mixed'},Writing:{minutes:40,questions:1,mode:'writing'}},
  'oc-prep':{Reading:{minutes:40,questions:33,mode:'choice'},'Mathematical Reasoning':{minutes:40,questions:35,mode:'choice'},Mathematics:{minutes:40,questions:35,mode:'choice'},'Thinking Skills':{minutes:30,questions:30,mode:'choice'}}
};

const catalog=JSON.parse(fs.readFileSync(catalogPath,'utf8'));
let learnerReady=0,verifiedScoring=0,pendingBoundary=0,pendingAnswers=0;
for(const st of Object.values(catalog.stages||{}))for(const p of st.papers||[]){
  const cfg=conditions[p.stage]?.[p.subject]||null;
  const v=overrides[p.sourcePath]||{};
  const start=Number.isInteger(v.questionStartPage)&&v.questionStartPage>0?v.questionStartPage:1;
  const end=Number.isInteger(v.questionEndPage)&&v.questionEndPage>=start?v.questionEndPage:null;
  const boundaryVerified=v.pageBoundaryVerified===true&&end!==null;
  const isWriting=cfg?.mode==='writing';
  const answers=Array.isArray(v.answers)?v.answers:null;
  const mappingVerified=v.answerMappingVerified===true;
  const scoring=v.scoring==='verified'?'verified':'source-review';
  if(scoring==='verified'){
    if(isWriting)throw new Error(`Writing paper cannot use objective auto-scoring: ${p.sourcePath}`);
    if(!boundaryVerified)throw new Error(`Verified scoring requires verified page boundary: ${p.sourcePath}`);
    if(!mappingVerified||!v.answerReference||!answers)throw new Error(`Verified scoring requires independently verified answer mapping: ${p.sourcePath}`);
    if(cfg&&answers.length!==cfg.questions)throw new Error(`Verified answer count mismatch for ${p.sourcePath}: ${answers.length} vs ${cfg.questions}`);
  }
  const ready=boundaryVerified;
  p.questionStartPage=start;
  p.questionEndPage=end;
  p.pageBoundaryVerified=boundaryVerified;
  p.answerReference=Boolean(v.answerReference&&mappingVerified);
  p.answerMappingVerified=mappingVerified;
  p.scoring=scoring;
  if(scoring==='verified')p.answers=answers;
  else delete p.answers;
  if(v.responseTypes&&scoring==='verified')p.responseTypes=v.responseTypes;
  else delete p.responseTypes;
  p.minutes=cfg?.minutes??null;
  p.questionCount=cfg?.questions??null;
  p.learnerReady=ready;
  p.viewer='year2-lite-url-range';
  p.governance={
    contract:'aw-formal-paper-governance-1',
    questionStartPage:start,
    questionEndPage:end,
    pageBoundaryVerified:boundaryVerified,
    answerReference:p.answerReference,
    answerMappingVerified:mappingVerified,
    learnerReady:ready,
    progressionCredit:scoring==='verified',
    reviewEvidence:v.reviewEvidence||null,
    reviewedAt:v.reviewedAt||null,
    reviewedBy:v.reviewedBy||null
  };
  if(ready)learnerReady++;else pendingBoundary++;
  if(scoring==='verified')verifiedScoring++;else if(!isWriting)pendingAnswers++;
}
catalog.governance={contract:'aw-formal-paper-governance-1',registry:'v6.18.2-stage-paper-verification-v1',learnerReady,verifiedScoring,pendingBoundary,pendingAnswers};
fs.writeFileSync(catalogPath,JSON.stringify(catalog,null,2)+'\n');

let js=fs.readFileSync(jsPath,'utf8');
const conditionNeedle="function conditionFor(p){return CONDITIONS[p.stage]?.[p.subject]||null}";
if(!js.includes(conditionNeedle))throw new Error('stage runtime condition anchor missing');
const helpers=`${conditionNeedle}\nfunction governanceFor(p){return p?.governance||{}}\nfunction normAnswer(v){if(Array.isArray(v))return v.map(normAnswer).sort().join('|');return String(v??'').trim().toUpperCase()}\nfunction gradeAttempt(p,answers,cfg){const g=governanceFor(p);if(p?.scoring!=='verified'||g.answerMappingVerified!==true||!Array.isArray(p.answers)||cfg?.mode==='writing')return{score:null,verified:false,correct:null,total:null};let correct=0;for(let i=0;i<p.answers.length;i++){if(normAnswer(answers[i+1])===normAnswer(p.answers[i]))correct++}const total=p.answers.length;return{score:total?Math.round(correct*100/total):null,verified:true,correct,total}}`;
js=js.replace(conditionNeedle,helpers);

const totalNeedle='total=active.pageCount||1';
if(!js.includes(totalNeedle))throw new Error('stage viewer total-page anchor missing');
js=js.replace(totalNeedle,'total=active.questionEndPage||active.pageCount||1');

const initNeedle='active.pdfDoc=doc;active.pageCount=doc.numPages;active.page=1;active.zoom=1;';
if(!js.includes(initNeedle))throw new Error('stage viewer init anchor missing');
js=js.replace(initNeedle,"active.pdfDoc=doc;active.pageCount=doc.numPages;if(!active.paper.pageBoundaryVerified||!Number.isInteger(active.paper.questionEndPage)||active.paper.questionEndPage<1){doc.destroy();active.pdfDoc=null;throw new Error('learner page boundary not verified')}active.questionEndPage=Math.min(active.paper.questionEndPage,doc.numPages);if(active.paper.questionEndPage>doc.numPages){doc.destroy();active.pdfDoc=null;throw new Error('verified questionEndPage exceeds PDF page count')}active.page=Math.max(1,active.paper.questionStartPage||1);active.zoom=1;");

const changeNeedle='Math.min(active.pageCount,active.page+delta)';
if(!js.includes(changeNeedle))throw new Error('stage page-change anchor missing');
js=js.replace(changeNeedle,'Math.min(active.questionEndPage||active.pageCount,active.page+delta)');
js=js.replaceAll('Math.min(active.pageCount,n)','Math.min(active.questionEndPage||active.pageCount,n)');

const instructionNeedle='function instruction(p){const cfg=conditionFor(p);';
if(!js.includes(instructionNeedle))throw new Error('stage instruction anchor missing');
js=js.replace(instructionNeedle,"function instruction(p){const cfg=conditionFor(p);if(!p?.governance?.learnerReady){overlay(`<div class=\"aw-exam-dialog\"><button class=\"aw-exam-close\" data-aw-stage-close>×</button><div class=\"ey\">${esc(STAGE_LABELS[p.stage]||p.stage)}</div><h1>${esc(p.title)}</h1><p>This paper is in the historical library but is not yet available for a learner attempt. Its final question page must be independently verified first so answer-key/support pages can never appear in the learner viewer.</p><button class=\"primary wide\" data-aw-stage-close>Close</button></div>`);return}");

const startNeedle='page:1,pageCount:1,zoom:1,renderTask:null';
if(!js.includes(startNeedle))throw new Error('stage start-state anchor missing');
js=js.replace(startNeedle,'page:p.questionStartPage||1,pageCount:1,questionEndPage:p.questionEndPage||null,zoom:1,renderTask:null');

const saveNeedle="P.attempts=Array.isArray(P.attempts)?P.attempts:[];const a={date:new Date().toISOString(),type:'stage-historical-formal'";
if(!js.includes(saveNeedle))throw new Error('stage attempt-save anchor missing');
js=js.replace(saveNeedle,"P.attempts=Array.isArray(P.attempts)?P.attempts:[];const grade=gradeAttempt(active.paper,active.answers,active.cfg);const a={date:new Date().toISOString(),type:'stage-historical-formal'");
const scoreNeedle='score:null,verified:false,durationSeconds:';
if(!js.includes(scoreNeedle))throw new Error('stage score anchor missing');
js=js.replace(scoreNeedle,'score:grade.score,verified:grade.verified,correct:grade.correct,total:grade.total,durationSeconds:');

const resultNeedle="<p>Your responses have been saved. Auto-marking remains disabled until this paper's answer key is independently verified.</p>";
if(js.includes(resultNeedle))js=js.replace(resultNeedle,"<p>${a.verified?`Verified score: ${a.correct}/${a.total} (${a.score}%).`:`Your responses have been saved. Auto-marking remains disabled until this paper's answer key is independently verified.`}</p>");

if(js.includes('arrayBuffer()'))throw new Error('governance hardening must not regress lite PDF loading');
if(!js.includes('getDocument({url:active.paper.assetPath'))throw new Error('Year 2 lite URL/range loader missing after governance hardening');
fs.writeFileSync(jsPath,js);
console.log(JSON.stringify({release:'6.18.2',hardening:'YEAR2_GOVERNANCE_PARITY',learnerReady,verifiedScoring,pendingBoundary,pendingAnswers,viewer:'YEAR2_LITE_URL_RANGE'}));
