import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const dist=path.join(root,'dist');
const html=fs.readFileSync(path.join(dist,'index.html'),'utf8');
const y2=fs.readFileSync(path.join(dist,'y2-test-accordion.js'),'utf8');
const catalog=JSON.parse(fs.readFileSync(path.join(dist,'stage-papers','catalog.json'),'utf8'));
const auto=JSON.parse(fs.readFileSync(path.join(dist,'stage-papers','auto-boundary-verification.json'),'utf8'));
if(!html.includes('/y2-test-accordion.js?v=61822'))throw new Error('Year 2 accordion runtime not wired');
if(!y2.includes('aria-expanded')||!y2.includes('.aw-historical-grid,.grid[data-aw-historical="1"]')||!y2.includes('ICAS Grade 2'))throw new Error('Year 2 accordion/footer cleanup contract missing or lacks historical-grid fallback');
if(!y2.includes('const PREPARE_DELAYS=[0,50,140,300,650]')||!y2.includes('function schedulePrepare()')||!y2.includes("if(e.target.closest('[data-a=\"tests\"],[data-a=\"home\"]'))schedulePrepare()")||!y2.includes("window.addEventListener('awenture:stage-change',schedulePrepare)")||!y2.includes("window.addEventListener('awenture:progression-ready',schedulePrepare)"))throw new Error('Year 2 accordion does not reinitialize across asynchronous navigation/render lifecycle');
if(auto.version!=='aw-stage-auto-boundary-1')throw new Error('automatic boundary QA report missing');
const answerLeakBoundaries=new Map([
  ['186aa4ed88ca7ef9aed01f8ee4678d13808a431f3970de67d285a45cb6615bb8',14],
  ['d84cd62773be0427d05b93facfd5d0b85fea5aeaa3945e0be0e4a5fd2952377e',14],
  ['255e038c2b5b8e41c34b3cf109cf69f132aecd80790f7dc61ad0db4fec26e1f1',13],
  ['7b68fca6f777713d01ca79dfe566e87a077ddbc37f285d7c9c4d935a0a4a11d6',15]
]);
let papers=0,pending=0,answerLeakProtectedEntries=0;
for(const st of Object.values(catalog.stages||{}))for(const p of st.papers||[]){
  papers++;
  if(!p.learnerReady||p.pageBoundaryVerified!==true||!Number.isInteger(p.questionEndPage)||p.questionEndPage<1)pending++;
  if(p.scoring==='verified'&&(p.answerMappingVerified!==true||!Array.isArray(p.answers)))throw new Error(`verified scoring without verified answer mapping: ${p.sourcePath}`);
  const evidence=p.governance?.reviewEvidence;
  if(evidence&&answerLeakBoundaries.has(evidence.sha256)){
    const expectedEnd=answerLeakBoundaries.get(evidence.sha256);
    if(p.stage!=='icas-y3'||p.subject!=='Digital Technologies'||p.questionEndPage!==expectedEnd||evidence.terminalQuestion!==30||evidence.evidenceType!=='same-paper-reviewed-auto-boundary-false-positive')throw new Error(`Y3 Digital answer-leak boundary regression: ${p.sourcePath}`);
    answerLeakProtectedEntries++;
  }
}
if(!papers)throw new Error('no later-stage papers available');
if(pending)throw new Error(`later-stage learner-page clearance incomplete: ${pending}/${papers} papers still need boundary verification`);
if(answerLeakProtectedEntries!==8)throw new Error(`Y3 Digital answer-leak protection incomplete: expected 8 duplicate catalogue entries, got ${answerLeakProtectedEntries}`);
if(catalog.governance?.pendingBoundary!==0)throw new Error('catalog governance still reports pending learner-page boundaries');
console.log(JSON.stringify({release:'6.18.2',finalUX:'PASS',y2Accordion:'PASS',historicalGridFallback:'PASS',accordionLifecycleReinit:'PASS',footerGrade2Removed:'PASS',automaticBoundaryQA:'PASS',answerLeakProtectedEntries,papers,learnerPageClearance:'100%',autoScoring:'VERIFIED_ANSWER_MAP_ONLY'}));
