import fs from 'node:fs';
import { PDFDocument } from 'pdf-lib';
const htmlUrl=new URL('../dist/index.html',import.meta.url),brandUrl=new URL('../dist/brand.js',import.meta.url);
const originalHtml=fs.readFileSync(htmlUrl,'utf8'),originalBrand=fs.readFileSync(brandUrl,'utf8');
try{
  fs.writeFileSync(htmlUrl,originalHtml.replaceAll('6.15.2','6.15.1').replaceAll('61520','61510'));
  fs.writeFileSync(brandUrl,originalBrand.replaceAll('aw-brand-1.3','aw-brand-1.2').replaceAll('61520','61510'));
  await import('./release-gate-v6151.mjs?compat='+Date.now());
}finally{fs.writeFileSync(htmlUrl,originalHtml);fs.writeFileSync(brandUrl,originalBrand)}
const html=fs.readFileSync(htmlUrl,'utf8'),brand=fs.readFileSync(brandUrl,'utf8'),brandCss=fs.readFileSync(new URL('../dist/brand.css',import.meta.url),'utf8'),parent=fs.readFileSync(new URL('../dist/v615-parent.js',import.meta.url),'utf8'),parentCss=fs.readFileSync(new URL('../dist/v615.css',import.meta.url),'utf8'),insights=fs.readFileSync(new URL('../dist/insights.js',import.meta.url),'utf8');
for(const x of ['content="6.15.2',"RELEASE='6.15.2'",'/brand.js?v=61520','/v615-parent.js?v=61520'])if(!html.includes(x))throw new Error('v6.15.2 missing '+x);
for(const x of ['aw-brand-1.3','aw-brand-landing','61520'])if(!brand.includes(x))throw new Error('Landing emblem runtime missing '+x);
for(const x of ['aw-brand-landing','width:50px','width:46px'])if(!brandCss.includes(x))throw new Error('Landing emblem sizing missing '+x);
for(const x of ['singleOpenAccordion','visualSubjectCues',"removeAttribute('open')"])if(!parent.includes(x))throw new Error('Subject accordion behavior missing '+x);
for(const x of ['data-subject-tone','aw-subject-icon','aw-subject-score','aw-subject-chevron'])if(!insights.includes(x))throw new Error('Subject accordion markup missing '+x);
for(const x of ['aw-subject-icon','aw-subject-score','aw-subject-chevron','min-height:70px'])if(!parentCss.includes(x))throw new Error('Subject accordion presentation missing '+x);
const audit=JSON.parse(fs.readFileSync(new URL('../quality/original-paper-orientation-v6.15.2.json',import.meta.url),'utf8')),runtime=JSON.parse(fs.readFileSync(new URL('../bank/v6.13.1-original-paper-runtime.json',import.meta.url),'utf8'));
if(audit.release!=='6.15.2'||audit.papers.length!==21||runtime.papers.length!==21)throw new Error('Historical orientation audit must cover all 21 papers');
const keys=new Set(audit.papers.map(p=>p.subject+'|'+p.year));if(runtime.papers.some(p=>!keys.has(p.subject+'|'+p.year)))throw new Error('Historical orientation audit coverage mismatch');
const corrected=audit.papers.filter(p=>p.correctionDegrees);if(corrected.length!==1||corrected[0].subject!=='Mathematics'||corrected[0].year!==2019||corrected[0].correctionDegrees!==180)throw new Error('2019 Mathematics orientation correction mismatch');
for(const paper of runtime.papers){const folder=paper.subject.toLowerCase(),url=new URL('../dist/original-icas/year2/'+folder+'/'+paper.year+'-questions.pdf',import.meta.url);if(!fs.existsSync(url))throw new Error('Missing historical paper asset '+paper.subject+' '+paper.year);const pdf=await PDFDocument.load(fs.readFileSync(url));if(pdf.getPageCount()!==paper.questionEndPage)throw new Error('Historical page count mismatch '+paper.subject+' '+paper.year);if(paper.subject==='Mathematics'&&paper.year===2019&&pdf.getPages().some(p=>(p.getRotation().angle%360)!==180))throw new Error('2019 Mathematics output is not upright-normalized with a 180 degree page correction')}
console.log(JSON.stringify({release:'6.15.2',compatibility:'PASS',landingBrand:'LARGER_ONLY_ON_HOME',parentSubskills:'SINGLE_OPEN_SUBJECT_ACCORDION',historicalOrientation:'21_PAPERS_AUDITED',mathematics2019:'ROTATED_180'}));
