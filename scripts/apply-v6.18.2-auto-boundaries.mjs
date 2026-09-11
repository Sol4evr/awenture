import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const catalogPath=path.join(root,'dist','stage-papers','catalog.json');
const reportPath=path.join(root,'dist','stage-papers','auto-boundary-verification.json');
if(!fs.existsSync(catalogPath)||!fs.existsSync(reportPath))throw new Error('automatic boundary QA outputs missing');
const catalog=JSON.parse(fs.readFileSync(catalogPath,'utf8'));
const report=JSON.parse(fs.readFileSync(reportPath,'utf8'));
if(report.version!=='aw-stage-auto-boundary-1')throw new Error('automatic boundary QA contract mismatch');
let promoted=0,pending=0;
for(const st of Object.values(catalog.stages||{}))for(const p of st.papers||[]){
  const a=report.papers?.[p.sourcePath];
  if(!a?.pageBoundaryVerified||!Number.isInteger(a.questionEndPage)||a.questionEndPage<1){pending++;continue}
  if(p.pageBoundaryVerified===true&&Number.isInteger(p.questionEndPage)&&p.questionEndPage!==a.questionEndPage)throw new Error(`manual/automatic boundary conflict: ${p.sourcePath}`);
  p.questionStartPage=a.questionStartPage||1;
  p.questionEndPage=a.questionEndPage;
  p.pageBoundaryVerified=true;
  p.learnerReady=true;
  p.governance={...(p.governance||{}),questionStartPage:p.questionStartPage,questionEndPage:p.questionEndPage,pageBoundaryVerified:true,learnerReady:true,reviewEvidence:a.reviewEvidence,reviewedAt:a.reviewedAt,reviewedBy:a.reviewedBy};
  promoted++;
}
const papers=Object.values(catalog.stages||{}).flatMap(s=>s.papers||[]);
const learnerReady=papers.filter(p=>p.learnerReady).length;
const verifiedScoring=papers.filter(p=>p.scoring==='verified').length;
const pendingAnswers=papers.filter(p=>p.scoring!=='verified'&&p.subject!=='Writing').length;
catalog.governance={...(catalog.governance||{}),automaticBoundaryQA:'aw-stage-auto-boundary-1',learnerReady,verifiedScoring,pendingBoundary:papers.length-learnerReady,pendingAnswers};
fs.writeFileSync(catalogPath,JSON.stringify(catalog,null,2)+'\n');
console.log(JSON.stringify({release:'6.18.2',autoBoundaryApply:'PASS',promoted,pending,learnerReady,total:papers.length}));
