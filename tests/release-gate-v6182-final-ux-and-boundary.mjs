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
if(!y2.includes('aria-expanded')||!y2.includes('.aw-historical-grid')||!y2.includes('ICAS Grade 2'))throw new Error('Year 2 accordion/footer cleanup contract missing');
if(auto.version!=='aw-stage-auto-boundary-1')throw new Error('automatic boundary QA report missing');
let papers=0,pending=0;
for(const st of Object.values(catalog.stages||{}))for(const p of st.papers||[]){
  papers++;
  if(!p.learnerReady||p.pageBoundaryVerified!==true||!Number.isInteger(p.questionEndPage)||p.questionEndPage<1)pending++;
  if(p.scoring==='verified'&&(p.answerMappingVerified!==true||!Array.isArray(p.answers)))throw new Error(`verified scoring without verified answer mapping: ${p.sourcePath}`);
}
if(!papers)throw new Error('no later-stage papers available');
if(pending)throw new Error(`later-stage learner-page clearance incomplete: ${pending}/${papers} papers still need boundary verification`);
if(catalog.governance?.pendingBoundary!==0)throw new Error('catalog governance still reports pending learner-page boundaries');
console.log(JSON.stringify({release:'6.18.2',finalUX:'PASS',y2Accordion:'PASS',footerGrade2Removed:'PASS',automaticBoundaryQA:'PASS',papers,learnerPageClearance:'100%',autoScoring:'VERIFIED_ANSWER_MAP_ONLY'}));
