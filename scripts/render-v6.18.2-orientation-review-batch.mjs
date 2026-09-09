import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import {createCanvas} from '@napi-rs/canvas';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const catalogPath=path.join(root,'dist','stage-papers','catalog.json');
if(!fs.existsSync(catalogPath))throw new Error('orientation review requires built stage-paper catalog');
const catalog=JSON.parse(fs.readFileSync(catalogPath,'utf8'));
const papers=Object.values(catalog.stages||{}).flatMap(s=>s.papers||[]).filter(p=>p.pageBoundaryVerified&&Number.isInteger(p.questionEndPage));
const size=Math.max(1,Math.min(20,Number(process.env.AW_ORIENTATION_BATCH_SIZE||12)));
const offset=Math.max(0,Number(process.env.AW_ORIENTATION_BATCH_OFFSET||0));
const selected=papers.slice(offset,offset+size);
const outDir=path.join(root,'dist','stage-papers','orientation-review-batch');
fs.rmSync(outDir,{recursive:true,force:true});fs.mkdirSync(outDir,{recursive:true});
const sha=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const manifest=[];
for(const p of selected){
  const abs=path.join(root,p.sourcePath);if(!fs.existsSync(abs))throw new Error(`orientation source missing: ${p.sourcePath}`);
  const doc=await pdfjs.getDocument({data:new Uint8Array(fs.readFileSync(abs)),disableWorker:true,isEvalSupported:false,useSystemFonts:true}).promise;
  const start=Math.max(1,p.questionStartPage||1),end=Math.min(doc.numPages,p.questionEndPage),mid=Math.floor((start+end)/2),wanted=[...new Set([start,mid,end])].sort((a,b)=>a-b),pages=[];
  for(const n of wanted){
    const pg=await doc.getPage(n),base=pg.getViewport({scale:1}),scale=Math.min(1.8,1500/base.width),vp=pg.getViewport({scale}),canvas=createCanvas(Math.ceil(vp.width),Math.ceil(vp.height)),ctx=canvas.getContext('2d');
    ctx.fillStyle='white';ctx.fillRect(0,0,canvas.width,canvas.height);await pg.render({canvasContext:ctx,viewport:vp,canvas}).promise;
    const file=`${p.id}-p${String(n).padStart(2,'0')}.jpg`;fs.writeFileSync(path.join(outDir,file),canvas.toBuffer('image/jpeg',86));
    pages.push({page:n,file,width:canvas.width,height:canvas.height,rotation:pg.rotate||0});
  }
  manifest.push({id:p.id,sourcePath:p.sourcePath,sourceSha256:sha(abs),stage:p.stage,subject:p.subject,year:p.year??null,questionStartPage:start,questionEndPage:end,totalPages:doc.numPages,pages,checksRequired:['upright-orientation','blank-render','crop','diagram-legibility','answer-leak']});
  try{doc.destroy()}catch(_){}
}
fs.writeFileSync(path.join(outDir,'manifest.json'),JSON.stringify({version:'aw-stage-paper-orientation-review-v1',release:'6.18.2',offset,size,available:papers.length,selected:manifest},null,2)+'\n');
console.log(JSON.stringify({release:'6.18.2',orientationReviewBatch:'PASS',offset,size,available:papers.length,selected:manifest.length}));
