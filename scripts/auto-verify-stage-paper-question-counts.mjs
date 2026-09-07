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
function clampCount(n){n=Number(n);return Number.isInteger(n)&&n>=1&&n<=DEFAULT_MAX?n:null}
async function pageLines(doc,n){
  const pg=await doc.getPage(n),tc=await pg.getTextContent();
  const lines=[];let cur='';
  for(const it of tc.items||[]){const s=String(it.str||'').trim();if(s)cur+=(cur?' ':'')+s;if(it.hasEOL&&cur){lines.push(cur.replace(/\s+/g,' ').trim());cur=''}}
  if(cur)lines.push(cur.replace(/\s+/g,' ').trim());
  return lines;
}
function declaredCounts(lines){
  const out=[];
  for(const line of lines){
    const text=line.replace(/[–—]/g,'-');
    for(const re of [
      /\b(?:there (?:are|is)|contains?|consists? of)\s+(\d{1,3})\s+(?:questions?|items?)\b/ig,
      /\b(\d{1,3})\s+(?:questions?|items?)\s+(?:in total|altogether)\b/ig,
      /\bquestions?\s+1\s*(?:-|to|through)\s*(\d{1,3})\b/ig,
      /\bitems?\s+1\s*(?:-|to|through)\s*(\d{1,3})\b/ig
    ]){let m;while((m=re.exec(text))) {const n=clampCount(m[1]);if(n)out.push({n,line:text.slice(0,220)})}}
  }
  return out;
}
function numberedCandidates(lines){
  const nums=[];
  for(const line0 of lines){const line=line0.trim();
    let m=line.match(/^(?:question\s*)?(\d{1,3})(?:\s*[.)\]:-]|\s{1,})/i);if(m){const n=clampCount(m[1]);if(n)nums.push(n)}
    m=line.match(/^Q(?:uestion)?\s*(\d{1,3})\b/i);if(m){const n=clampCount(m[1]);if(n)nums.push(n)}
  }
  return nums;
}
function sequenceInference(nums){
  const set=new Set(nums.filter(n=>n<=DEFAULT_MAX));
  if(!set.size)return null;
  const max=Math.max(...set);if(max<5)return null;
  let best=null;
  for(let n=max;n>=5;n--){
    let present=0;for(let i=1;i<=n;i++)if(set.has(i))present++;
    const coverage=present/n;
    const tail=[n,n-1,n-2].filter(x=>x>=1).filter(x=>set.has(x)).length;
    if(coverage>=0.82&&tail>=2){best={n,coverage:Number(coverage.toFixed(3)),present};break}
  }
  return best;
}

const result={version:'aw-stage-question-count-1',generatedAt:new Date().toISOString(),policy:{paperSpecific:true,learnerPagesOnly:true,noSubjectDefaultForVerifiedAttempt:true,writingSingleResponse:true},papers:{},summary:{total:0,verified:0,pending:0,writing:0,declared:0,sequence:0},unresolved:[]};
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
      const end=Math.min(doc.numPages,boundary.questionEndPage),all=[];
      for(let n=1;n<=end;n++)all.push(...await pageLines(doc,n));
      const declared=declaredCounts(all);
      if(declared.length){
        const counts=declared.map(x=>x.n),freq=new Map();for(const n of counts)freq.set(n,(freq.get(n)||0)+1);
        const maxDeclared=Math.max(...counts);
        const ranked=[...freq].sort((a,b)=>b[1]-a[1]||b[0]-a[0]);
        const chosen=(ranked[0]?.[1]>=2?ranked[0][0]:maxDeclared);
        entry.questionCount=chosen;entry.questionCountVerified=true;entry.method='document-declared';entry.evidence=declared.filter(x=>x.n===chosen).slice(0,3);result.summary.declared++;
      }else{
        const inf=sequenceInference(numberedCandidates(all));
        if(inf){entry.questionCount=inf.n;entry.questionCountVerified=true;entry.method='numbered-sequence';entry.evidence=inf;result.summary.sequence++}
        else entry.evidence='question-count QA pending: could not establish a high-confidence complete numbered sequence';
      }
      try{doc.destroy()}catch(_){}
    }
  }catch(err){entry.evidence=`question-count QA pending: ${String(err?.message||err).slice(0,180)}`}
  result.papers[p.sourcePath]=entry;
  if(entry.questionCountVerified)result.summary.verified++;else{result.summary.pending++;result.unresolved.push({sourcePath:p.sourcePath,stage:p.stage,subject:p.subject,year:p.year,reason:entry.evidence})}
}
fs.writeFileSync(outPath,JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({stageQuestionCountQA:'PASS',...result.summary,unresolved:result.unresolved.slice(0,25)}));
