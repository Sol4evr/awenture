import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const catalog=JSON.parse(fs.readFileSync(path.join(root,'dist/stage-papers/catalog.json'),'utf8'));
const bounds=JSON.parse(fs.readFileSync(path.join(root,'dist/stage-papers/auto-boundary-verification.json'),'utf8'));
const targets=[
  {
    sourcePath:'source/original-icas/year4/English yr 4/Icas Yr 4 English 2015.pdf',
    expectedSha256:'7636d8eed9d040b602d3098f7795c6ec2897ca1543433c070992bb8bdfadbb2c'
  }
];
const meta=new Map();for(const s of Object.values(catalog.stages||{}))for(const p of s.papers||[])meta.set(p.sourcePath,p);
const sha=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
async function pageText(doc,n){const pg=await doc.getPage(n),tc=await pg.getTextContent();return (tc.items||[]).map(x=>String(x.str||'').trim()).filter(Boolean).join(' ').replace(/\s+/g,' ').trim()}
function questionNums(text){const nums=[];for(const m of String(text).matchAll(/(?:^|\s)(\d{1,2})(?:\s*[.)\]:-]|\s+(?=[A-Z]))/g)){const n=Number(m[1]);if(n>=1&&n<=80)nums.push(n)}for(const m of String(text).matchAll(/\bQuestion\s+(\d{1,2})\b/ig)){const n=Number(m[1]);if(n>=1&&n<=80)nums.push(n)}return [...new Set(nums)].sort((a,b)=>a-b)}
function classify(text){return {
  answer:/\b(answer(?:s| key| sheet)?|correct answer|solutions?|marking guide)\b/i.test(text),
  stop:/\bSTOP\b|\bEND OF TEST\b/i.test(text),
  results:/\bresults?\b|\bmark is\b/i.test(text),
  learnerSignals:/\bquestion\b/i.test(text)||/\bread the following\b/i.test(text)||/\bchoose the best answer\b/i.test(text)||/\bparagraph\b/i.test(text)
}}
const rows=[];
for(const t of targets){const abs=path.join(root,t.sourcePath),p=meta.get(t.sourcePath),b=bounds.papers?.[t.sourcePath];if(!fs.existsSync(abs))throw new Error(`missing boundary target ${t.sourcePath}`);const actualSha=sha(abs);if(actualSha!==t.expectedSha256)throw new Error(`SHA mismatch for ${t.sourcePath}: ${actualSha}`);const doc=await pdfjs.getDocument({data:new Uint8Array(fs.readFileSync(abs)),disableWorker:true,isEvalSupported:false,useSystemFonts:true}).promise;const pages=[];for(let n=1;n<=doc.numPages;n++){const text=await pageText(doc,n);pages.push({page:n,questionNumbers:questionNums(text),signals:classify(text),text:text.slice(0,5000)})}rows.push({sourcePath:t.sourcePath,sha256:actualSha,stage:p?.stage,subject:p?.subject,year:p?.year,currentBoundary:b?.questionEndPage??null,pageBoundaryVerified:!!b?.pageBoundaryVerified,totalPages:doc.numPages,pages});try{doc.destroy()}catch(_){}}
const out={version:'aw-stage-reviewed-boundary-targets-v1',generatedAt:new Date().toISOString(),targets:rows};
fs.writeFileSync(path.join(root,'dist/stage-papers/reviewed-boundary-targets.json'),JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify({release:'6.18.2',reviewedBoundaryTargets:'PASS',targets:rows.map(r=>({sourcePath:r.sourcePath,currentBoundary:r.currentBoundary,totalPages:r.totalPages}))}));
