import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const catalogPath=path.join(root,'dist','stage-papers','catalog.json');
const outPath=path.join(root,'dist','stage-papers','timing-evidence-candidates-v1.json');
if(!fs.existsSync(catalogPath))throw new Error('timing diagnostic requires built stage catalog');
const catalog=JSON.parse(fs.readFileSync(catalogPath,'utf8'));
const papers=Object.values(catalog.stages||{}).flatMap(s=>s.papers||[]);
const sha=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
function normalizeText(s){return String(s||'').replace(/\s+/g,' ').trim()}
function parseMinutes(text){
  const compact=text.replace(/\s+/g,' ');
  const patterns=[/time\s+allowed\s*[:\-]?\s*(\d{1,3})\s*(?:minutes?|mins?)/ig,/working\s+time\s*[:\-]?\s*(\d{1,3})\s*(?:minutes?|mins?)/ig,/(\d{1,3})\s*(?:minutes?|mins?)\s+(?:working\s+time|time\s+allowed)/ig];
  const found=[];for(const re of patterns){for(const m of compact.matchAll(re)){const n=Number(m[1]);if(n>=5&&n<=180)found.push(n)}}
  return [...new Set(found)];
}
const candidates=[];
for(const p of papers){
  const abs=path.join(root,p.sourcePath);if(!fs.existsSync(abs))continue;
  try{
    const doc=await pdfjs.getDocument({data:new Uint8Array(fs.readFileSync(abs)),disableWorker:true,isEvalSupported:false,useSystemFonts:true}).promise;
    const pages=[];for(let n=1;n<=Math.min(3,doc.numPages);n++){const pg=await doc.getPage(n),tc=await pg.getTextContent(),text=normalizeText(tc.items.map(x=>x.str||'').join(' ')),minutes=parseMinutes(text);if(minutes.length)pages.push({page:n,minutes,text:text.slice(0,1400)})}
    if(pages.length)candidates.push({id:p.id,sourcePath:p.sourcePath,sourceSha256:sha(abs),stage:p.stage,subject:p.subject,year:p.year??null,pages,reviewStatus:'candidate-only-not-promoted'});
    try{doc.destroy()}catch(_){}
  }catch(err){candidates.push({id:p.id,sourcePath:p.sourcePath,stage:p.stage,subject:p.subject,year:p.year??null,error:String(err?.message||err),reviewStatus:'render-error-needs-review'})}
}
const clean=candidates.filter(x=>x.pages?.length),errors=candidates.filter(x=>x.error);
fs.writeFileSync(outPath,JSON.stringify({version:'aw-stage-paper-timing-candidates-v1',release:'6.18.2',policy:{samePaperOnly:true,automaticPromotion:false,subjectDefaultsForbidden:true},summary:{papers:papers.length,candidates:clean.length,errors:errors.length},candidates},null,2)+'\n');
console.log(JSON.stringify({release:'6.18.2',timingEvidenceDiagnostic:'PASS',papers:papers.length,candidates:clean.length,errors:errors.length,automaticPromotion:false}));
