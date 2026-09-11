import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import {createCanvas} from '@napi-rs/canvas';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const indexPath=path.join(root,'dist/stage-papers/source-review/index.json');
if(!fs.existsSync(indexPath))throw new Error('unresolved review batch requires source-review/index.json from test:release');
const sourceReview=JSON.parse(fs.readFileSync(indexPath,'utf8'));
const outDir=path.join(root,'dist/stage-papers/unresolved-review-batch');
fs.rmSync(outDir,{recursive:true,force:true});fs.mkdirSync(outDir,{recursive:true});
const batchSize=Math.max(1,Math.min(12,Number(process.env.AW_REVIEW_BATCH_SIZE||8)));
const batchOffset=Math.max(0,Number(process.env.AW_REVIEW_BATCH_OFFSET||0));
const skipPartial=p=>/Spelling A 2016 \(Q1-12, Q26-40\)\.pdf$/i.test(p);
const candidates=(sourceReview.index||[]).filter(r=>!r.error&&Array.isArray(r.sourcePaths)&&r.sourcePaths.length&&Number.isInteger(r.questionEndPage)&&!r.sourcePaths.every(skipPartial));
const selected=candidates.slice(batchOffset,batchOffset+batchSize);
const sha=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
async function pageText(doc,n){const pg=await doc.getPage(n),tc=await pg.getTextContent();return (tc.items||[]).map(x=>String(x.str||'').trim()).filter(Boolean).join(' ').replace(/\s+/g,' ').trim()}
const manifest=[];
for(const row of selected){
  const rel=row.sourcePaths.find(p=>!skipPartial(p))||row.sourcePaths[0],abs=path.join(root,rel);
  if(!fs.existsSync(abs))throw new Error(`unresolved review source missing: ${rel}`);
  const doc=await pdfjs.getDocument({data:new Uint8Array(fs.readFileSync(abs)),disableWorker:true,isEvalSupported:false,useSystemFonts:true}).promise;
  const end=Math.min(doc.numPages,row.questionEndPage),wanted=new Set([1,Math.max(1,end-2),Math.max(1,end-1),end]);
  if(end+1<=doc.numPages)wanted.add(end+1);if(end+2<=doc.numPages)wanted.add(end+2);
  const pages=[];
  for(const n of [...wanted].sort((a,b)=>a-b)){
    const pg=await doc.getPage(n),base=pg.getViewport({scale:1}),scale=Math.min(2.15,1800/base.width),vp=pg.getViewport({scale}),canvas=createCanvas(Math.ceil(vp.width),Math.ceil(vp.height)),ctx=canvas.getContext('2d');
    ctx.fillStyle='white';ctx.fillRect(0,0,canvas.width,canvas.height);await pg.render({canvasContext:ctx,viewport:vp,canvas}).promise;
    const file=`${row.id}-p${String(n).padStart(2,'0')}.jpg`;fs.writeFileSync(path.join(outDir,file),canvas.toBuffer('image/jpeg',88));
    const text=(await pageText(doc,n)).slice(0,1800);pages.push({page:n,file,text});
  }
  manifest.push({id:row.id,sha256:sha(abs),sourcePath:rel,sourcePaths:row.sourcePaths,stage:row.stage,subject:row.subject,year:row.year,questionEndPage:end,totalPages:doc.numPages,pages});try{doc.destroy()}catch(_){}
}
fs.writeFileSync(path.join(outDir,'manifest.json'),JSON.stringify({version:'aw-unresolved-review-batch-v1',generatedAt:new Date().toISOString(),batchOffset,batchSize,available:candidates.length,selected:manifest},null,2)+'\n');
console.log(JSON.stringify({release:'6.18.2',unresolvedReviewBatch:'PASS',batchOffset,batchSize,available:candidates.length,selected:manifest.map(x=>({id:x.id,stage:x.stage,subject:x.subject,year:x.year,sourcePath:x.sourcePath,questionEndPage:x.questionEndPage,totalPages:x.totalPages,pages:x.pages.map(p=>p.page)}))}));
