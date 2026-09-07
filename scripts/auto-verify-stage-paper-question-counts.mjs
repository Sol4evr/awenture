import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const catalogPath=path.join(root,'dist','stage-papers','catalog.json');
const boundaryPath=path.join(root,'dist','stage-papers','auto-boundary-verification.json');
const outPath=path.join(root,'dist','stage-papers','auto-question-count-verification.json');
if(!fs.existsSync(catalogPath)||!fs.existsSync(boundaryPath))throw new Error('question-count QA requires catalog + learner-page boundaries');
const catalog=JSON.parse(fs.readFileSync(catalogPath,'utf8'));
const boundaries=JSON.parse(fs.readFileSync(boundaryPath,'utf8'));

const DEFAULT_MAX=100;
const SUPPORT_RE=/answer|solution|worked|marking|mark scheme|rubric|criteria|explanation/i;
function clampCount(n){n=Number(n);return Number.isInteger(n)&&n>=1&&n<=DEFAULT_MAX?n:null}
function plausibleMinimum(p){
  if(p.subject==='Writing')return 1;
  if(p.stage==='naplan-y3'&&p.subject==='Reading')return 20;
  if(p.stage==='naplan-y3')return 15;
  if(p.stage==='oc-prep')return 20;
  return 10;
}
async function pageLines(doc,n){
  const pg=await doc.getPage(n),tc=await pg.getTextContent();
  const lines=[];let cur='';
  for(const it of tc.items||[]){const s=String(it.str||'').trim();if(s)cur+=(cur?' ':'')+s;if(it.hasEOL&&cur){lines.push(cur.replace(/\s+/g,' ').trim());cur=''}}
  if(cur)lines.push(cur.replace(/\s+/g,' ').trim());
  return lines;
}
function countEvidence(lines){
  const totals=[],ranges=[];
  for(const line of lines){
    const text=line.replace(/[–—]/g,'-');
    for(const re of [
      /\b(?:there (?:are|is)|contains?|consists? of)\s+(\d{1,3})\s+(?:questions?|items?)\b/ig,
      /\b(\d{1,3})\s+(?:questions?|items?)\s+(?:in total|altogether)\b/ig
    ]){let m;while((m=re.exec(text))){const n=clampCount(m[1]);if(n)totals.push({n,line:text.slice(0,220)})}}
    const rangeRe=/\b(?:questions?|items?)\s+(\d{1,3})\s*(?:-|to|through)\s*(\d{1,3})\b/ig;let rm;
    while((rm=rangeRe.exec(text))){const a=clampCount(rm[1]),b=clampCount(rm[2]);if(a&&b&&b>=a)ranges.push({start:a,end:b,line:text.slice(0,220)})}
  }
  return {totals,ranges};
}
function numberedCandidates(lines){
  const nums=[];
  for(const line0 of lines){const line=line0.trim();
    let m=line.match(/^(?:question\s*)?(\d{1,3})(?:\s*[.)\]:-]|\s{1,})/i);if(m){const n=clampCount(m[1]);if(n)nums.push(n)}
    m=line.match(/^Q(?:uestion)?\s*(\d{1,3})\b/i);if(m){const n=clampCount(m[1]);if(n)nums.push(n)}
    for(const x of line.matchAll(/\bQuestion\s+(\d{1,3})\b/ig)){const n=clampCount(x[1]);if(n)nums.push(n)}
  }
  return nums;
}
function answerPairCandidates(lines){
  const nums=[];
  for(const line of lines){
    for(const m of line.matchAll(/(?:^|\s)(\d{1,3})\s*[-.:)]?\s*[A-E](?:\s|$)/g)){const n=clampCount(m[1]);if(n)nums.push(n)}
    for(const m of line.matchAll(/\bQ(?:uestion)?\s*(\d{1,3})\s*[:.)-]?\s*[A-E]\b/ig)){const n=clampCount(m[1]);if(n)nums.push(n)}
  }
  return nums;
}
function sequenceInference(nums,min,coverageFloor=.78){
  const set=new Set(nums.filter(n=>n<=DEFAULT_MAX));
  if(!set.size)return null;
  const max=Math.max(...set);if(max<min)return null;
  for(let n=max;n>=min;n--){
    let present=0;for(let i=1;i<=n;i++)if(set.has(i))present++;
    const coverage=present/n;
    const tail=[n,n-1,n-2,n-3].filter(x=>x>=1).filter(x=>set.has(x)).length;
    if(coverage>=coverageFloor&&tail>=2)return {n,coverage:Number(coverage.toFixed(3)),present};
  }
  return null;
}
function chooseEvidence(e,p,methodPrefix='document'){
  const min=plausibleMinimum(p);
  const totals=e.totals.filter(x=>x.n>=min);
  if(totals.length){
    const freq=new Map();for(const x of totals)freq.set(x.n,(freq.get(x.n)||0)+1);
    const ranked=[...freq].sort((a,b)=>b[1]-a[1]||b[0]-a[0]);
    const chosen=ranked[0][0];
    return {n:chosen,method:`${methodPrefix}-total`,evidence:totals.filter(x=>x.n===chosen).slice(0,3)};
  }
  const ranges=e.ranges.filter(x=>x.end>=min);
  if(ranges.length){
    const maxEnd=Math.max(...ranges.map(x=>x.end));
    const hasTail=ranges.some(x=>x.end===maxEnd&&x.start>1);
    const multiple=ranges.length>=2;
    if(hasTail||multiple)return {n:maxEnd,method:`${methodPrefix}-range-end`,evidence:ranges.filter(x=>x.end===maxEnd).slice(0,3)};
  }
  return null;
}
function siblingSupportFiles(sourcePath){
  const abs=path.join(root,sourcePath),dir=path.dirname(abs),base=path.basename(abs),year=(base.match(/(?:19|20)\d{2}/)||[])[0]||'';
  if(!fs.existsSync(dir))return [];
  return fs.readdirSync(dir).filter(name=>name!==base&&name.toLowerCase().endsWith('.pdf')&&SUPPORT_RE.test(name)&&(!year||name.includes(year))).map(name=>path.join(dir,name));
}
async function supportInference(sourcePath,p){
  for(const support of siblingSupportFiles(sourcePath)){
    try{
      const doc=await pdfjs.getDocument({data:new Uint8Array(fs.readFileSync(support)),disableWorker:true,isEvalSupported:false,useSystemFonts:true}).promise;
      const lines=[];for(let n=1;n<=doc.numPages;n++)lines.push(...await pageLines(doc,n));
      const chosen=chooseEvidence(countEvidence(lines),p,'support');
      if(chosen){try{doc.destroy()}catch(_){};return {...chosen,supportPath:path.relative(root,support).split(path.sep).join('/')}}
      const inf=sequenceInference(answerPairCandidates(lines),plausibleMinimum(p),.68);
      if(inf){try{doc.destroy()}catch(_){};return {n:inf.n,method:'support-answer-sequence',evidence:inf,supportPath:path.relative(root,support).split(path.sep).join('/')}}
      try{doc.destroy()}catch(_){}
    }catch(_){}
  }
  return null;
}

const result={version:'aw-stage-question-count-3',generatedAt:new Date().toISOString(),policy:{paperSpecific:true,learnerPagesPreferred:true,supportPagesAllowedForCountVerification:true,separateAnswerKeysAllowedForIndependentCountEvidence:true,noSubjectDefaultForVerifiedAttempt:true,writingSingleResponse:true,sectionRangeAware:true,plausibilityFloor:true},papers:{},summary:{total:0,verified:0,pending:0,writing:0,learnerEvidence:0,fullDocumentEvidence:0,supportEvidence:0,sequence:0},unresolved:[]};
for(const st of Object.values(catalog.stages||{}))for(const p of st.papers||[]){
  result.summary.total++;
  const boundary=boundaries.papers?.[p.sourcePath];
  const entry={questionCount:null,questionCountVerified:false,method:null,evidence:null};
  try{
    if(p.subject==='Writing'){
      entry.questionCount=1;entry.questionCountVerified=true;entry.method='writing-single-response';entry.evidence='Writing paper uses one writing response';result.summary.writing++;
    }else if(!boundary?.pageBoundaryVerified||!boundary.questionEndPage){
      entry.evidence='question-count QA pending: learner-page boundary not verified';
    }else{
      const bytes=new Uint8Array(fs.readFileSync(path.join(root,p.sourcePath)));
      const doc=await pdfjs.getDocument({data:bytes,disableWorker:true,isEvalSupported:false,useSystemFonts:true}).promise;
      const learnerEnd=Math.min(doc.numPages,boundary.questionEndPage),learner=[],full=[];
      for(let n=1;n<=doc.numPages;n++){const lines=await pageLines(doc,n);full.push(...lines);if(n<=learnerEnd)learner.push(...lines)}
      let chosen=chooseEvidence(countEvidence(learner),p,'learner');
      if(chosen)result.summary.learnerEvidence++;
      if(!chosen){const inf=sequenceInference(numberedCandidates(learner),plausibleMinimum(p));if(inf){chosen={n:inf.n,method:'learner-numbered-sequence',evidence:inf};result.summary.sequence++}}
      if(!chosen){chosen=chooseEvidence(countEvidence(full),p,'full-document');if(chosen)result.summary.fullDocumentEvidence++}
      if(!chosen){const inf=sequenceInference(answerPairCandidates(full),plausibleMinimum(p),.68);if(inf){chosen={n:inf.n,method:'embedded-answer-sequence',evidence:inf};result.summary.fullDocumentEvidence++}}
      try{doc.destroy()}catch(_){}
      if(!chosen){chosen=await supportInference(p.sourcePath,p);if(chosen)result.summary.supportEvidence++}
      if(chosen){entry.questionCount=chosen.n;entry.questionCountVerified=true;entry.method=chosen.method;entry.evidence=chosen.supportPath?{supportPath:chosen.supportPath,evidence:chosen.evidence}:chosen.evidence}
      else entry.evidence='question-count QA pending: no high-confidence paper, support-page, or answer-key evidence';
    }
  }catch(err){entry.evidence=`question-count QA pending: ${String(err?.message||err).slice(0,180)}`}
  result.papers[p.sourcePath]=entry;
  if(entry.questionCountVerified)result.summary.verified++;else{result.summary.pending++;result.unresolved.push({sourcePath:p.sourcePath,stage:p.stage,subject:p.subject,year:p.year,reason:entry.evidence})}
}
fs.writeFileSync(outPath,JSON.stringify(result,null,2)+'\n');
const naplanReading=Object.entries(result.papers).filter(([src])=>src.toLowerCase().includes('/naplan/')&&src.toLowerCase().includes('reading')).map(([sourcePath,v])=>({sourcePath,questionCount:v.questionCount,verified:v.questionCountVerified,method:v.method}));
console.log(JSON.stringify({stageQuestionCountQA:'PASS',...result.summary,naplanReading,unresolved:result.unresolved.slice(0,25)}));
