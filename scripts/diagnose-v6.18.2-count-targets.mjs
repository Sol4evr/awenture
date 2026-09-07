import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const targets=[
 ['source/original-icas/year4/Science Year 4/Icas Yr 4 Science 2020.pdf','fa561d7d06744633b484338534402fa94dfcb628673e85e28b4d82de73cdc58e'],
 ['source/original-icas/year4/Science Year 4/Icas Yr 4 Science 2010.pdf','73ccd89aafc4bac30415c5d15936b13adea5a3ca69f966907f338f38105d3811'],
 ['source/original-icas/year3/Digital A/Digital AB 2015.pdf','f291c91abf96cbfc7533ce1a7c1b0058c9b84ddad59e4c5e5d133034c16e97fd'],
 ['source/original-icas/year4/Digital yr 4/Digital AB 2015.pdf','bd16a5d7056221bd96d2a399e4ed3c8d249316f4c7bf945d6b5ad60e258ae540'],
 ['source/original-icas/year3/Spelling A/Spelling A 2016.pdf','250ea050d59c4044e5a98771e911a9255b918d23066bc7d9e368bfd5421383ce']
];
const sha=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
async function pageText(doc,n){const pg=await doc.getPage(n),tc=await pg.getTextContent();return (tc.items||[]).map(x=>String(x.str||'').trim()).filter(Boolean).join(' ').replace(/\s+/g,' ').trim()}
function pairs(text){const nums=[];for(const m of String(text).matchAll(/(?:^|\s)(\d{1,3})\s*[-.:)]?\s*[A-E](?=\s|$)/g)){const n=Number(m[1]);if(n>=1&&n<=100)nums.push(n)}return [...new Set(nums)].sort((a,b)=>a-b)}
function genericNums(text){const nums=[];for(const m of String(text).matchAll(/(?:^|\D)(\d{1,3})(?=\D|$)/g)){const n=Number(m[1]);if(n>=1&&n<=100)nums.push(n)}return [...new Set(nums)].sort((a,b)=>a-b)}
function seq(nums){if(!nums.length)return null;const max=Math.max(...nums);if(max<10)return null;let present=0;for(let i=1;i<=max;i++)if(nums.includes(i))present++;return {max,present,coverage:Number((present/max).toFixed(3)),tail:[max,max-1,max-2,max-3].filter(n=>nums.includes(n)).length}}
function denom(text){const out=[];for(const m of String(text).matchAll(/(?:mark|score|result)[^\n]{0,100}?\/\s*(\d{1,3})\b/ig)){const n=Number(m[1]);if(n>=10&&n<=100)out.push(n)}for(const m of String(text).matchAll(/\b(?:mark|score)\s+is\s*(?:[^0-9]{0,30})?\/\s*(\d{1,3})\b/ig)){const n=Number(m[1]);if(n>=10&&n<=100)out.push(n)}return [...new Set(out)]}
function compact(s,n=1200){s=String(s||'').replace(/\s+/g,' ').trim();return s.length<=n?s:s.slice(0,n)}
const rows=[];
for(const [src,expected] of targets){const abs=path.join(root,src);if(!fs.existsSync(abs))throw new Error(`count target missing: ${src}`);const actual=sha(abs);if(actual!==expected)throw new Error(`count target SHA mismatch: ${src}`);const doc=await pdfjs.getDocument({data:new Uint8Array(fs.readFileSync(abs)),disableWorker:true,isEvalSupported:false,useSystemFonts:true}).promise;const pages=[];for(let n=1;n<=doc.numPages;n++){const text=await pageText(doc,n),ap=pairs(text),as=seq(ap),ds=denom(text);const answer=/\b(answer(?:s| key| keys| sheet)?|correct answer|solutions?)\b/i.test(text),results=/\bresults?\b|\bmark is\b|\bscore\b/i.test(text),cover=/TIME\s+ALLOWED|DO\s+NOT\s+OPEN|MULTIPLE[- ]?(?:CHOICE|GHOICE)|QUEST(?:I|T)ONS?/i.test(text);if(answer||results||as||ds.length||cover||n>=doc.numPages-2)pages.push({page:n,answer,results,cover,answerSequence:as,denominators:ds,numbers:genericNums(text),text:compact(text)})}rows.push({sourcePath:src,sha256:actual,totalPages:doc.numPages,pages});try{doc.destroy()}catch(_){}}
const out={version:'aw-stage-count-target-diagnostic-v1',generatedAt:new Date().toISOString(),targets:rows};fs.writeFileSync(path.join(root,'dist/stage-papers/count-targets.json'),JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify({release:'6.18.2',countTargetDiagnostic:'PASS',targets:rows.map(r=>({sourcePath:r.sourcePath,totalPages:r.totalPages,pages:r.pages.map(p=>({page:p.page,answer:p.answer,results:p.results,cover:p.cover,answerSequence:p.answerSequence,denominators:p.denominators}))}))}));
