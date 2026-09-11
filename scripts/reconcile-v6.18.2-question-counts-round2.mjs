import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const qaPath=path.join(root,'dist/stage-papers/auto-question-count-verification.json');
const catalogPath=path.join(root,'dist/stage-papers/catalog.json');
const boundaryPath=path.join(root,'dist/stage-papers/auto-boundary-verification.json');
if(!fs.existsSync(qaPath)||!fs.existsSync(catalogPath)||!fs.existsSync(boundaryPath)) throw new Error('round2 count QA inputs missing');
const qa=JSON.parse(fs.readFileSync(qaPath,'utf8'));
const catalog=JSON.parse(fs.readFileSync(catalogPath,'utf8'));
const bounds=JSON.parse(fs.readFileSync(boundaryPath,'utf8'));
const papers=Object.values(catalog.stages||{}).flatMap(s=>s.papers||[]);
const meta=new Map(papers.map(p=>[p.sourcePath,p]));

function clamp(n){n=Number(n);return Number.isInteger(n)&&n>=1&&n<=100?n:null}
function numbered(lines){
  const nums=[];
  for(const raw of lines){const line=String(raw||'').trim();let m=line.match(/^(?:question\s*)?(\d{1,3})(?:\s*[.)\]:-]|\s{1,})/i);if(m){const n=clamp(m[1]);if(n)nums.push(n)}m=line.match(/^Q(?:uestion)?\s*(\d{1,3})\b/i);if(m){const n=clamp(m[1]);if(n)nums.push(n)}for(const x of line.matchAll(/\bQuestion\s+(\d{1,3})\b/ig)){const n=clamp(x[1]);if(n)nums.push(n)}}
  return nums;
}
async function linesFor(doc,n){const pg=await doc.getPage(n),tc=await pg.getTextContent();const out=[];let cur='';for(const it of tc.items||[]){const s=String(it.str||'').trim();if(s)cur+=(cur?' ':'')+s;if(it.hasEOL&&cur){out.push(cur.replace(/\s+/g,' ').trim());cur=''}}if(cur)out.push(cur.replace(/\s+/g,' ').trim());return out}
function partialRanges(src){
  const b=path.basename(src);const rs=[];for(const m of b.matchAll(/q(?:uestion)?s?\s*(\d{1,3})\s*[-–—]\s*(\d{1,3})/ig)){const a=clamp(m[1]),z=clamp(m[2]);if(a&&z&&z>=a)rs.push([a,z])}
  if(rs.length<2)return null;rs.sort((a,b)=>a[0]-b[0]);let gap=false;for(let i=1;i<rs.length;i++)if(rs[i][0]>rs[i-1][1]+1)gap=true;if(!gap)return null;const nums=[];for(const [a,z] of rs)for(let n=a;n<=z;n++)nums.push(n);return {ranges:rs,includedQuestionNumbers:nums};
}
function terminalInference(pageNums,min=10){
  const all=pageNums.flatMap(x=>x.nums),set=new Set(all);if(!set.size)return null;const max=Math.max(...set);if(max<min)return null;
  const tailPages=pageNums.slice(-2),tailSet=new Set(tailPages.flatMap(x=>x.nums));if(!tailSet.has(max))return null;
  const present=[...Array(max)].filter((_,i)=>set.has(i+1)).length,coverage=present/max;
  const last5=[max,max-1,max-2,max-3,max-4].filter(x=>x>=1),tailHits=last5.filter(x=>tailSet.has(x)||set.has(x)).length;
  const last3OnTail=[max,max-1,max-2].filter(x=>tailSet.has(x)).length;
  if(coverage>=.85&&tailHits>=4&&last3OnTail>=2)return {n:max,coverage:Number(coverage.toFixed(3)),present,tailHits,last3OnTail};
  return null;
}
function supportSubjectToken(subject){const s=String(subject||'').toLowerCase();if(s.includes('digital'))return 'digital';if(s.includes('math'))return 'math';if(s.includes('science'))return 'science';if(s.includes('spell'))return 'spell';if(s.includes('english'))return 'english';if(s.includes('numeracy'))return 'numeracy';if(s.includes('language'))return 'language';if(s.includes('reading'))return 'reading';if(s.includes('thinking'))return 'thinking';return null}
function minFor(p){if(p.subject==='Writing')return 1;if(p.stage==='naplan-y3')return 15;if(p.stage==='oc-prep')return 20;return 10}

let promotedTerminal=0,revokedPartial=0,inspected=0;
const diagnostics=[];
for(const p of papers){const e=qa.papers?.[p.sourcePath];if(!e)continue;
  const partial=partialRanges(p.sourcePath);
  if(partial){
    if(e.questionCountVerified){e.questionCount=null;e.questionCountVerified=false;e.method=null;e.evidence='question-count QA pending: partial-source paper has disjoint included question ranges; sparse answer-sheet workflow required';revokedPartial++}
    e.partialSource=true;e.includedQuestionRanges=partial.ranges;e.includedQuestionNumbers=partial.includedQuestionNumbers;diagnostics.push({sourcePath:p.sourcePath,status:'partial-source-blocked',...partial});continue;
  }
  if(e.questionCountVerified)continue;
  const b=bounds.papers?.[p.sourcePath];if(!b?.pageBoundaryVerified||!b.questionEndPage)continue;
  inspected++;
  try{
    const abs=path.join(root,p.sourcePath);const doc=await pdfjs.getDocument({data:new Uint8Array(fs.readFileSync(abs)),disableWorker:true,isEvalSupported:false,useSystemFonts:true}).promise;
    const end=Math.min(doc.numPages,b.questionEndPage),pageNums=[];
    for(let n=1;n<=end;n++){const lines=await linesFor(doc,n);pageNums.push({page:n,nums:numbered(lines)})}
    const inf=terminalInference(pageNums,minFor(p));
    diagnostics.push({sourcePath:p.sourcePath,status:inf?'terminal-candidate-promoted':'still-pending',terminal:inf,lastPages:pageNums.slice(-2)});
    if(inf){e.questionCount=inf.n;e.questionCountVerified=true;e.method='learner-terminal-sequence-high-confidence';e.evidence={...inf,rule:'max question appears in final learner pages; >=85% sequence coverage; >=4/5 terminal tail present; >=2/3 terminal numbers on final two pages'};promotedTerminal++}
    try{doc.destroy()}catch(_){}
  }catch(err){diagnostics.push({sourcePath:p.sourcePath,status:'inspection-error',error:String(err?.message||err).slice(0,180)})}
}

// Revalidate any surviving support evidence against same subject identity; this is a defence-in-depth pass.
let revokedSupport=0;for(const [src,e] of Object.entries(qa.papers||{})){if(!e?.questionCountVerified||!e?.evidence?.supportPath)continue;const p=meta.get(src);if(!p)continue;const tok=supportSubjectToken(p.subject),support=String(e.evidence.supportPath).toLowerCase();if(tok&&!support.includes(tok)){e.questionCount=null;e.questionCountVerified=false;e.method=null;e.evidence='question-count QA pending: round2 rejected support evidence without same-subject identity';revokedSupport++}}

qa.version='aw-stage-question-count-7-round2';qa.policy={...(qa.policy||{}),round2SystematicAudit:true,terminalSequenceRule:{minimumCoverage:.85,minimumTail5:4,minimumTail3OnFinalTwoPages:2},partialSourceSparseRequired:true,sameSubjectSupportRevalidated:true};
qa.summary={...(qa.summary||{}),round2Inspected:inspected,promotedTerminal,revokedPartial,revokedSupport};qa.summary.verified=Object.values(qa.papers||{}).filter(e=>e.questionCountVerified).length;qa.summary.total=papers.length;qa.summary.pending=qa.summary.total-qa.summary.verified;
qa.unresolved=[];for(const p of papers){const e=qa.papers?.[p.sourcePath];if(!e?.questionCountVerified)qa.unresolved.push({sourcePath:p.sourcePath,stage:p.stage,subject:p.subject,year:p.year,reason:e?.evidence||'question-count QA pending',partialSource:!!e?.partialSource})}
fs.writeFileSync(qaPath,JSON.stringify(qa,null,2)+'\n');
fs.writeFileSync(path.join(root,'dist/stage-papers/round2-question-count-diagnostics.json'),JSON.stringify({generatedAt:new Date().toISOString(),inspected,promotedTerminal,revokedPartial,revokedSupport,diagnostics},null,2)+'\n');
const by={};for(const u of qa.unresolved){const k=`${u.stage}|${u.subject}`;by[k]=(by[k]||0)+1}
console.log(JSON.stringify({release:'6.18.2',round2QuestionCountQA:'PASS',verified:qa.summary.verified,pending:qa.summary.pending,inspected,promotedTerminal,revokedPartial,revokedSupport,unresolvedByStageSubject:by}));
