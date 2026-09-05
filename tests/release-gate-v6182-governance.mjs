import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const dist=path.join(root,'dist');
const catalog=JSON.parse(fs.readFileSync(path.join(dist,'stage-papers','catalog.json'),'utf8'));
const js=fs.readFileSync(path.join(dist,'stage-formal-tests.js'),'utf8');
const contract=JSON.parse(fs.readFileSync(path.join(root,'quality','stage-formal-paper-governance-v1.json'),'utf8'));
if(contract.version!=='aw-formal-paper-governance-1')throw new Error('formal paper governance contract missing');
if(catalog.governance?.contract!=='aw-formal-paper-governance-1')throw new Error('catalog governance contract missing');
if(!js.includes('gradeAttempt')||!js.includes('pageBoundaryVerified')||!js.includes('answerMappingVerified'))throw new Error('runtime governance enforcement missing');
if(!js.includes('active.questionEndPage')||!js.includes('learner page boundary not verified'))throw new Error('answer-page boundary enforcement missing');
if(!js.includes('getDocument({url:active.paper.assetPath')||js.includes('arrayBuffer()'))throw new Error('Year 2 lite viewer parity regression');
if(js.includes('MutationObserver'))throw new Error('lite runtime regression: MutationObserver detected');

const requiredFields=['sourcePath','stage','subject','year','questionStartPage','questionEndPage','pageBoundaryVerified','scoring','answerReference','answerMappingVerified','learnerReady','viewer'];
let papers=0,ready=0,verified=0,pending=0;
for(const [stage,st] of Object.entries(catalog.stages||{}))for(const p of st.papers||[]){
  papers++;
  for(const f of requiredFields)if(!(f in p))throw new Error(`${stage} paper missing ${f}: ${p.sourcePath}`);
  if(p.viewer!=='year2-lite-url-range')throw new Error(`viewer parity missing: ${p.sourcePath}`);
  if(p.learnerReady){
    ready++;
    if(p.pageBoundaryVerified!==true||!Number.isInteger(p.questionEndPage)||p.questionEndPage<1)throw new Error(`learnerReady paper lacks verified boundary: ${p.sourcePath}`);
  }else pending++;
  if(p.pageBoundaryVerified!==true&&p.questionEndPage!==null)throw new Error(`unverified boundary must not publish questionEndPage: ${p.sourcePath}`);
  if(p.scoring==='verified'){
    verified++;
    if(p.answerMappingVerified!==true||p.answerReference!==true||!Array.isArray(p.answers))throw new Error(`verified scoring lacks verified answer mapping: ${p.sourcePath}`);
    if(!p.learnerReady)throw new Error(`verified scoring paper must also have verified page boundary: ${p.sourcePath}`);
  }else{
    if(p.scoring!=='source-review')throw new Error(`invalid scoring state: ${p.sourcePath}`);
    if('answers' in p)throw new Error(`unverified answers must not ship to learner catalog: ${p.sourcePath}`);
  }
  if(p.governance?.progressionCredit!== (p.scoring==='verified'))throw new Error(`progression credit governance mismatch: ${p.sourcePath}`);
}
if(!papers)throw new Error('no later-stage papers found');
if(catalog.governance.learnerReady!==ready||catalog.governance.verifiedScoring!==verified)throw new Error('governance summary mismatch');
console.log(JSON.stringify({release:'6.18.2',paperGovernance:'YEAR2_PARITY',papers,learnerReady:ready,verifiedScoring:verified,pendingQA:pending,answerPageProtection:'PASS',autoScoreGate:'VERIFIED_MAPPING_ONLY',progressionCredit:'VERIFIED_ONLY',viewer:'YEAR2_LITE_URL_RANGE'}));
