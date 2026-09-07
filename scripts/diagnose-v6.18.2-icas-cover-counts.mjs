import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const qaPath=path.join(root,'dist/stage-papers/auto-question-count-verification.json');
const catalogPath=path.join(root,'dist/stage-papers/catalog.json');
if(!fs.existsSync(qaPath)||!fs.existsSync(catalogPath))throw new Error('ICAS cover-count diagnostic requires QA + catalog');
const qa=JSON.parse(fs.readFileSync(qaPath,'utf8'));
const catalog=JSON.parse(fs.readFileSync(catalogPath,'utf8'));
const meta=new Map();for(const s of Object.values(catalog.stages||{}))for(const p of s.papers||[])meta.set(p.sourcePath,p);
function compact(s,n=1200){s=String(s||'').replace(/\s+/g,' ').trim();return s.length<=n?s:s.slice(0,n)}
async function pageText(doc,n){const pg=await doc.getPage(n),tc=await pg.getTextContent();return (tc.items||[]).map(x=>String(x.str||'').trim()).filter(Boolean).join(' ').replace(/\s+/g,' ').trim()}
function coverCandidates(text){const out=[];const patterns=[/\b(\d{2})\s+QUESTIONS?\b/ig,/\bQUESTIONS?\s*[:=-]?\s*(\d{2})\b/ig,/\b(\d{2})\s*QUESTIONS?\s+TIME\s+ALLOWED\b/ig];for(const re of patterns){for(const m of text.matchAll(re)){const n=Number(m[1]);if(n>=10&&n<=80)out.push({count:n,match:m[0]})}}return [...new Map(out.map(x=>[x.count,x])).values()]}
const rows=[];
for(const [src,e] of Object.entries(qa.papers||{})){
 if(e.questionCountVerified)continue;const p=meta.get(src);if(!p||!['icas-y3','icas-y4'].includes(p.stage))continue;const abs=path.join(root,src);if(!fs.existsSync(abs))continue;
 try{const doc=await pdfjs.getDocument({data:new Uint8Array(fs.readFileSync(abs)),disableWorker:true,isEvalSupported:false,useSystemFonts:true}).promise;const pages=[];for(let n=1;n<=Math.min(2,doc.numPages);n++){const text=await pageText(doc,n);pages.push({page:n,text:compact(text),candidates:coverCandidates(text)})}const counts=[...new Set(pages.flatMap(x=>x.candidates.map(c=>c.count)))];if(counts.length)rows.push({sourcePath:src,sha256:e.sha256,stage:p.stage,subject:p.subject,year:p.year,counts,pages});try{doc.destroy()}catch(_){}}catch(err){rows.push({sourcePath:src,stage:p.stage,subject:p.subject,year:p.year,error:String(err?.message||err).slice(0,160)})}
}
const byCount={};for(const r of rows)for(const c of r.counts||[])byCount[c]=(byCount[c]||0)+1;
const out={version:'aw-icas-cover-count-diagnostic-v1',generatedAt:new Date().toISOString(),pendingIcas:Object.entries(qa.papers||{}).filter(([s,e])=>!e.questionCountVerified&&['icas-y3','icas-y4'].includes(meta.get(s)?.stage)).length,candidates:rows.length,byCount,rows};
fs.writeFileSync(path.join(root,'dist/stage-papers/icas-cover-count-diagnostic.json'),JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify({release:'6.18.2',icasCoverCountDiagnostic:'PASS',pendingIcas:out.pendingIcas,candidates:rows.length,byCount,rows:rows.map(r=>({sourcePath:r.sourcePath,sha256:r.sha256,counts:r.counts,stage:r.stage,subject:r.subject,year:r.year}))}));
