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
function walk(dir,out=[]){if(!fs.existsSync(dir))return out;for(const e of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,e.name);if(e.isDirectory())walk(p,out);else if(e.isFile()&&e.name.toLowerCase().endsWith('.pdf'))out.push(p)}return out}
function answerNumbers(text){const nums=[];for(const m of String(text).matchAll(/(?:^|\s)(\d{1,3})\s*[-.:)]?\s*[A-E](?=\s|$)/g)){const n=Number(m[1]);if(n>=1&&n<=100)nums.push(n)}for(const m of String(text).matchAll(/\bQ(?:uestion)?\s*(\d{1,3})\s*[:.)-]?\s*[A-E]\b/ig)){const n=Number(m[1]);if(n>=1&&n<=100)nums.push(n)}return [...new Set(nums)].sort((a,b)=>a-b)}
function seqStats(nums){if(!nums.length)return null;const max=Math.max(...nums);if(max<10)return null;let present=0;for(let i=1;i<=max;i++)if(nums.includes(i))present++;const coverage=present/max;const tail=[max,max-1,max-2,max-3].filter(n=>nums.includes(n)).length;return {max,present,coverage:Number(coverage.toFixed(3)),tail}}
const rows=[];
for(const [src,e] of Object.entries(qa.papers||{})){
 if(e.questionCountVerified)continue;const p=meta.get(src);if(!p||!['icas-y3','icas-y4'].includes(p.stage))continue;const abs=path.join(root,src);if(!fs.existsSync(abs))continue;
 try{const doc=await pdfjs.getDocument({data:new Uint8Array(fs.readFileSync(abs)),disableWorker:true,isEvalSupported:false,useSystemFonts:true}).promise;const pages=[];for(let n=1;n<=Math.min(2,doc.numPages);n++){const text=await pageText(doc,n);pages.push({page:n,text:compact(text),candidates:coverCandidates(text)})}const counts=[...new Set(pages.flatMap(x=>x.candidates.map(c=>c.count)))];if(counts.length)rows.push({sourcePath:src,sha256:e.sha256,stage:p.stage,subject:p.subject,year:p.year,counts,pages});try{doc.destroy()}catch(_){}}catch(err){rows.push({sourcePath:src,stage:p.stage,subject:p.subject,year:p.year,error:String(err?.message||err).slice(0,160)})}
}
const byCount={};for(const r of rows)for(const c of r.counts||[])byCount[c]=(byCount[c]||0)+1;
// Diagnostic inventory of answer resources. This is deliberately NOT an automatic promotion channel.
// It surfaces candidate page/year/sequence evidence for manual same-paper review under the Y2 standard.
const answerKeyRows=[];for(const abs of walk(path.join(root,'source','original-icas'))){const rel=path.relative(root,abs).split(path.sep).join('/');if(!/answer|solution|marking/i.test(rel))continue;try{const doc=await pdfjs.getDocument({data:new Uint8Array(fs.readFileSync(abs)),disableWorker:true,isEvalSupported:false,useSystemFonts:true}).promise;for(let n=1;n<=doc.numPages;n++){const text=await pageText(doc,n),nums=answerNumbers(text),seq=seqStats(nums);if(!seq||seq.coverage<.6||seq.tail<2)continue;const years=[...new Set([...text.matchAll(/(?:19|20)\d{2}/g)].map(m=>Number(m[0])))];answerKeyRows.push({sourcePath:rel,page:n,years,sequence:seq,text:compact(text,650)})}try{doc.destroy()}catch(_){}}catch(_){}}
const out={version:'aw-icas-cover-count-diagnostic-v2',generatedAt:new Date().toISOString(),pendingIcas:Object.entries(qa.papers||{}).filter(([s,e])=>!e.questionCountVerified&&['icas-y3','icas-y4'].includes(meta.get(s)?.stage)).length,candidates:rows.length,byCount,rows,answerKeyRows};
fs.writeFileSync(path.join(root,'dist/stage-papers/icas-cover-count-diagnostic.json'),JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify({release:'6.18.2',icasCoverCountDiagnostic:'PASS',version:'v2-answer-key-inventory',pendingIcas:out.pendingIcas,candidates:rows.length,byCount,answerKeyCandidates:answerKeyRows.length,answerKeyRows:answerKeyRows.slice(0,120).map(r=>({sourcePath:r.sourcePath,page:r.page,years:r.years,sequence:r.sequence,text:r.text}))}));
