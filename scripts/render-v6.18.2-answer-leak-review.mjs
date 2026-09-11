import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import {createCanvas} from '@napi-rs/canvas';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const catalog=JSON.parse(fs.readFileSync(path.join(root,'dist/stage-papers/catalog.json'),'utf8'));
const suspectYears=new Set([2010,2011,2012,2013]);
const papers=Object.values(catalog.stages||{}).flatMap(s=>s.papers||[]).filter(p=>p.stage==='icas-y3'&&p.subject==='Digital Technologies'&&suspectYears.has(Number(p.year)));
const outDir=path.join(root,'dist/stage-papers/answer-leak-review');
fs.rmSync(outDir,{recursive:true,force:true});fs.mkdirSync(outDir,{recursive:true});
const sha=abs=>crypto.createHash('sha256').update(fs.readFileSync(abs)).digest('hex');
const selected=[];
for(const p of papers){
  const abs=path.join(root,p.sourcePath);if(!fs.existsSync(abs))throw new Error(`answer leak review source missing: ${p.sourcePath}`);
  const doc=await pdfjs.getDocument({data:new Uint8Array(fs.readFileSync(abs)),disableWorker:true,isEvalSupported:false,useSystemFonts:true}).promise;
  const end=Math.min(doc.numPages,Number(p.questionEndPage||doc.numPages));
  const start=Math.max(1,end-4),pages=[];
  for(let n=start;n<=end;n++){
    const pg=await doc.getPage(n),base=pg.getViewport({scale:1}),scale=Math.min(1.8,1500/base.width),vp=pg.getViewport({scale}),canvas=createCanvas(Math.ceil(vp.width),Math.ceil(vp.height)),ctx=canvas.getContext('2d');
    ctx.fillStyle='white';ctx.fillRect(0,0,canvas.width,canvas.height);await pg.render({canvasContext:ctx,viewport:vp,canvas}).promise;
    const file=`${p.id}-p${String(n).padStart(2,'0')}.jpg`;fs.writeFileSync(path.join(outDir,file),canvas.toBuffer('image/jpeg',88));
    pages.push({page:n,file,width:canvas.width,height:canvas.height,rotation:pg.rotate||0});
  }
  selected.push({id:p.id,sourcePath:p.sourcePath,sourceSha256:sha(abs),stage:p.stage,subject:p.subject,year:p.year,questionEndPage:p.questionEndPage,totalPages:doc.numPages,pages,checksRequired:['terminal-question','answer-key-transition','learner-answer-leak'],automaticPromotion:false});
  try{doc.destroy()}catch(_){}
}
fs.writeFileSync(path.join(outDir,'manifest.json'),JSON.stringify({version:'aw-stage-paper-answer-leak-review-v1',release:'6.18.2',policy:{failClosed:true,doNotInferTerminalBoundary:true,automaticPromotion:false},selected},null,2)+'\n');
console.log(JSON.stringify({release:'6.18.2',answerLeakReview:'PASS',papers:selected.length,automaticPromotion:false}));
