import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const qaPath=path.join(root,'dist/stage-papers/auto-question-count-verification.json');
const catalogPath=path.join(root,'dist/stage-papers/catalog.json');
const boundaryPath=path.join(root,'dist/stage-papers/auto-boundary-verification.json');
for(const p of [qaPath,catalogPath,boundaryPath])if(!fs.existsSync(p))throw new Error(`cover-count provenance input missing: ${p}`);
const qa=JSON.parse(fs.readFileSync(qaPath,'utf8'));
const catalog=JSON.parse(fs.readFileSync(catalogPath,'utf8'));
const bounds=JSON.parse(fs.readFileSync(boundaryPath,'utf8'));
const papers=[];for(const s of Object.values(catalog.stages||{}))for(const p of s.papers||[])papers.push(p);
const meta=new Map(papers.map(p=>[p.sourcePath,p]));
const clamp=n=>{n=Number(n);return Number.isInteger(n)&&n>=10&&n<=100?n:null};
async function pageText(doc,n){const pg=await doc.getPage(n),tc=await pg.getTextContent();return (tc.items||[]).map(x=>String(x.str||'').trim()).filter(Boolean).join(' ').replace(/\s+/g,' ').trim()}
function extractCoverSignals(text,page){
  const t=String(text||'').replace(/[–—]/g,'-');
  const compact=t.replace(/\s+/g,' ');
  const signals=[];
  const add=(count,kind,match)=>{count=clamp(String(count).replace(/\s+/g,''));if(count)signals.push({count,kind,page,match:String(match).slice(0,180)})};
  for(const m of compact.matchAll(/\b(\d{1,3})\s+(QUESTIONS?|ITEMS?)\b/ig))add(m[1],'exact-total',m[0]);
  for(const m of compact.matchAll(/\b(\d{1,3})\s+(QUESTTONS?|QUESTONS?)\b/ig))add(m[1],'ocr-fuzzy-total',m[0]);
  for(const m of compact.matchAll(/\b((?:\d\s*){1,3})\s+Q\s*U\s*E\s*S\s*T\s*I\s*O\s*N\s*S?\b/ig))add(m[1],'ocr-spaced-total',m[0]);
  for(const m of compact.matchAll(/\b(?:QUESTIONS?|QUESTTONS?|QUESTONS?)\s*\(\s*1\s*[- ]\s*(\d{1,3})\s*\)/ig))add(m[1],'explicit-1-to-n-range',m[0]);
  for(const m of compact.matchAll(/\b(?:QUESTIONS?|QUESTTONS?|QUESTONS?)\s*\(\s*1\s+(\d{1,3})\s*\)/ig))add(m[1],'ocr-1-to-n-range',m[0]);
  const instructionContext=/TIME\s+ALLOWED|DO\s+NOT\s+OPEN|ANSWER\s*SHEET|MULTIPLE[- ]?(?:CHOICE|GHOICE)/i.test(compact);
  return {signals,instructionContext,text:compact.slice(0,1800)};
}
function trustedCandidate(pages){
  const all=pages.flatMap(p=>p.signals),byCount=new Map();for(const s of all){if(!byCount.has(s.count))byCount.set(s.count,[]);byCount.get(s.count).push(s)}
  const candidates=[];
  for(const [count,sigs] of byCount){
    const exact=sigs.some(s=>s.kind==='exact-total'||s.kind==='ocr-spaced-total');
    const fuzzy=sigs.some(s=>s.kind==='ocr-fuzzy-total');
    const range=sigs.some(s=>s.kind==='explicit-1-to-n-range'||s.kind==='ocr-1-to-n-range');
    const context=pages.some(p=>p.instructionContext&&p.signals.some(s=>s.count===count));
    const repeated=sigs.length>=2;
    if((exact&&context)||(exact&&range)||(fuzzy&&range)||(fuzzy&&repeated&&context))candidates.push({count,signals:sigs,context});
  }
  if(candidates.length!==1)return null;
  return candidates[0];
}
function hasBroadExplicitEvidence(e){return ['learner-total','full-document-total'].includes(e?.method)&&Array.isArray(e?.evidence)&&e.evidence.some(x=>x?.kind==='explicit-cover-total')}
function reset(e,reason){e.questionCount=null;e.questionCountVerified=false;e.method=null;e.evidence=`question-count QA pending: ${reason}`}
let promoted=0,revoked=0,confirmed=0,scanned=0;
const audit={};
for(const p of papers){
  if(p.subject==='Writing')continue;
  const src=p.sourcePath,e=qa.papers?.[src],b=bounds.papers?.[src];if(!e||!b?.pageBoundaryVerified||!b.questionEndPage)continue;
  const abs=path.join(root,src);if(!fs.existsSync(abs))continue;
  try{
    const doc=await pdfjs.getDocument({data:new Uint8Array(fs.readFileSync(abs)),disableWorker:true,isEvalSupported:false,useSystemFonts:true}).promise;
    const pages=[];for(let n=1;n<=Math.min(2,doc.numPages,b.questionEndPage);n++){const text=await pageText(doc,n);pages.push({page:n,...extractCoverSignals(text,n)})}try{doc.destroy()}catch(_){}
    scanned++;const trusted=trustedCandidate(pages);audit[src]={trustedCount:trusted?.count??null,signals:pages.flatMap(x=>x.signals),instructionContext:pages.some(x=>x.instructionContext)};
    if(e.questionCountVerified&&hasBroadExplicitEvidence(e)){
      if(!trusted||trusted.count!==e.questionCount){reset(e,'broad explicit-total evidence was not reproducible from opening cover/instruction pages');revoked++;continue}
      e.method='cover-explicit-total';e.evidence={pages:[...new Set(trusted.signals.map(s=>s.page))],signals:trusted.signals,scope:'opening-pages-only'};confirmed++;continue;
    }
    if(!e.questionCountVerified&&trusted){e.questionCount=trusted.count;e.questionCountVerified=true;e.method='cover-explicit-total';e.evidence={pages:[...new Set(trusted.signals.map(s=>s.page))],signals:trusted.signals,scope:'opening-pages-only'};promoted++}
  }catch(err){audit[src]={error:String(err?.message||err).slice(0,180)}}
}
qa.policy={...(qa.policy||{}),explicitCoverTotalsOpeningPagesOnly:true,ocrFuzzyCoverTotalsRequireCorroboration:true};
qa.coverCountProvenance={version:'aw-stage-cover-count-provenance-v1',scanned,promoted,revoked,confirmed,audit};
qa.summary={...(qa.summary||{})};qa.summary.verified=Object.values(qa.papers||{}).filter(e=>e.questionCountVerified).length;qa.summary.total=papers.length;qa.summary.pending=qa.summary.total-qa.summary.verified;
qa.unresolved=[];for(const p of papers){const e=qa.papers?.[p.sourcePath];if(!e?.questionCountVerified)qa.unresolved.push({sourcePath:p.sourcePath,stage:p.stage,subject:p.subject,year:p.year,reason:e?.evidence||'question-count QA pending'})}
fs.writeFileSync(qaPath,JSON.stringify(qa,null,2)+'\n');
console.log(JSON.stringify({release:'6.18.2',coverCountProvenance:'PASS',scanned,promoted,revoked,confirmed,verified:qa.summary.verified,pending:qa.summary.pending}));
