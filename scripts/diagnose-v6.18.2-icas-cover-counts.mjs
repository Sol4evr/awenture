import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const qaPath=path.join(root,'dist/stage-papers/auto-question-count-verification.json');
const catalogPath=path.join(root,'dist/stage-papers/catalog.json');
if(!fs.existsSync(qaPath)||!fs.existsSync(catalogPath))throw new Error('ICAS cover-count diagnostic requires QA + catalog');
const qa=JSON.parse(fs.readFileSync(qaPath,'utf8'));
const catalog=JSON.parse(fs.readFileSync(catalogPath,'utf8'));
const meta=new Map();for(const s of Object.values(catalog.stages||{}))for(const p of s.papers||[])meta.set(p.sourcePath,p);
function compact(s,n=2500){s=String(s||'').replace(/\s+/g,' ').trim();return s.length<=n?s:s.slice(0,n)}
function sha256(abs){return crypto.createHash('sha256').update(fs.readFileSync(abs)).digest('hex')}
async function pageText(doc,n){const pg=await doc.getPage(n),tc=await pg.getTextContent();return (tc.items||[]).map(x=>String(x.str||'').trim()).filter(Boolean).join(' ').replace(/\s+/g,' ').trim()}
function coverCandidates(text){const out=[];const patterns=[/\b(\d{2})\s+QUESTIONS?\b/ig,/\bQUESTIONS?\s*[:=-]?\s*(\d{2})\b/ig,/\b(\d{2})\s*QUESTIONS?\s+TIME\s+ALLOWED\b/ig];for(const re of patterns){for(const m of text.matchAll(re)){const n=Number(m[1]);if(n>=10&&n<=80)out.push({count:n,match:m[0]})}}return [...new Map(out.map(x=>[x.count,x])).values()]}
function walk(dir,out=[]){if(!fs.existsSync(dir))return out;for(const e of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,e.name);if(e.isDirectory())walk(p,out);else if(e.isFile()&&e.name.toLowerCase().endsWith('.pdf'))out.push(p)}return out}
function answerNumbers(text){const nums=[];for(const m of String(text).matchAll(/(?:^|\s)(\d{1,3})\s*[-.:)]?\s*[A-E](?=\s|$)/g)){const n=Number(m[1]);if(n>=1&&n<=100)nums.push(n)}for(const m of String(text).matchAll(/\bQ(?:uestion)?\s*(\d{1,3})\s*[:.)-]?\s*[A-E]\b/ig)){const n=Number(m[1]);if(n>=1&&n<=100)nums.push(n)}return [...new Set(nums)].sort((a,b)=>a-b)}
function standaloneNumbers(text){const nums=[];for(const m of String(text).matchAll(/(?:^|\s)(\d{1,3})(?=\s|$)/g)){const n=Number(m[1]);if(n>=1&&n<=100)nums.push(n)}return nums}
function seqStats(nums){if(!nums.length)return null;const max=Math.max(...nums);if(max<10)return null;let present=0;for(let i=1;i<=max;i++)if(nums.includes(i))present++;const coverage=present/max;const tail=[max,max-1,max-2,max-3].filter(n=>nums.includes(n)).length;return {max,present,coverage:Number(coverage.toFixed(3)),tail}}
function normBase(p){return path.basename(p,'.pdf').toLowerCase().replace(/\b(?:answers?|solutions?|questions?|with answers?|paper|test|icas)\b/g,' ').replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim()}
const unresolved=[...meta.values()].filter(p=>!qa.papers?.[p.sourcePath]?.questionCountVerified&&['icas-y3','icas-y4'].includes(p.stage));
const unresolvedByYearSubject=new Map();for(const p of unresolved){const k=`${p.stage}|${p.subject}|${p.year||''}`;if(!unresolvedByYearSubject.has(k))unresolvedByYearSubject.set(k,[]);unresolvedByYearSubject.get(k).push(p.sourcePath)}
const rows=[];
for(const [src,e] of Object.entries(qa.papers||{})){
 if(e.questionCountVerified)continue;const p=meta.get(src);if(!p||!['icas-y3','icas-y4'].includes(p.stage))continue;const abs=path.join(root,src);if(!fs.existsSync(abs))continue;
 try{const doc=await pdfjs.getDocument({data:new Uint8Array(fs.readFileSync(abs)),disableWorker:true,isEvalSupported:false,useSystemFonts:true}).promise;const pages=[];for(let n=1;n<=Math.min(2,doc.numPages);n++){const text=await pageText(doc,n);pages.push({page:n,text:compact(text),candidates:coverCandidates(text)})}const counts=[...new Set(pages.flatMap(x=>x.candidates.map(c=>c.count)))];if(counts.length)rows.push({sourcePath:src,sha256:e.sha256,stage:p.stage,subject:p.subject,year:p.year,counts,pages});try{doc.destroy()}catch(_){}}catch(err){rows.push({sourcePath:src,stage:p.stage,subject:p.subject,year:p.year,error:String(err?.message||err).slice(0,160)})}
}
const byCount={};for(const r of rows)for(const c of r.counts||[])byCount[c]=(byCount[c]||0)+1;
const answerKeyRows=[];const answerResourceRaw=[];
for(const abs of walk(path.join(root,'source','original-icas'))){
 const rel=path.relative(root,abs).split(path.sep).join('/');if(!/^source\/original-icas\/year(?:3|4)\//i.test(rel)||!/answer|solution|marking|with answers/i.test(rel))continue;
 const stage=/\/year3\//i.test(rel)?'icas-y3':'icas-y4';const yearMatch=rel.match(/(?:19|20)\d{2}/),year=yearMatch?Number(yearMatch[0]):null;
 let subject=null;if(/digital|computer/i.test(rel))subject='Digital Technologies';else if(/english/i.test(rel))subject='English';else if(/math/i.test(rel))subject='Mathematics';else if(/science/i.test(rel))subject='Science';else if(/spell/i.test(rel))subject='Spelling';
 try{const doc=await pdfjs.getDocument({data:new Uint8Array(fs.readFileSync(abs)),disableWorker:true,isEvalSupported:false,useSystemFonts:true}).promise;const rawPages=[];for(let n=1;n<=doc.numPages;n++){const text=await pageText(doc,n),nums=answerNumbers(text),seq=seqStats(nums),standalone=standaloneNumbers(text);rawPages.push({page:n,text:compact(text),adjacentAnswerNumbers:nums,adjacentSequence:seq,standaloneNumbers:standalone.slice(0,250)});if(seq&&seq.coverage>=.6&&seq.tail>=2){const years=[...new Set([...text.matchAll(/(?:19|20)\d{2}/g)].map(m=>Number(m[0])))];answerKeyRows.push({sourcePath:rel,page:n,years,sequence:seq,text:compact(text,650)})}}
 const k=`${stage}|${subject||''}|${year||''}`;const candidateLearners=unresolvedByYearSubject.get(k)||[];answerResourceRaw.push({sourcePath:rel,sha256:sha256(abs),stage,subject,year,numPages:doc.numPages,normalizedStem:normBase(rel),candidateLearners,pages:rawPages});try{doc.destroy()}catch(_){}}catch(err){answerResourceRaw.push({sourcePath:rel,stage,subject,year,error:String(err?.message||err).slice(0,180)})}
}
const out={version:'aw-icas-cover-count-diagnostic-v4-raw-answer-resources',generatedAt:new Date().toISOString(),pendingIcas:unresolved.length,candidates:rows.length,byCount,rows,answerKeyRows,answerResourceRaw};
fs.writeFileSync(path.join(root,'dist/stage-papers/icas-cover-count-diagnostic.json'),JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify({release:'6.18.2',icasCoverCountDiagnostic:'PASS',version:'v4-raw-answer-resources',pendingIcas:out.pendingIcas,candidates:rows.length,byCount,answerKeyCandidates:answerKeyRows.length,answerResources:answerResourceRaw.length,resourcesWithUnresolvedPairs:answerResourceRaw.filter(r=>r.candidateLearners?.length).length}));
