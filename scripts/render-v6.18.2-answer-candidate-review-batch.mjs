import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import {createCanvas} from '@napi-rs/canvas';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const candidatePath=path.join(root,'dist','stage-papers','answer-resource-candidates-v1.json');
if(!fs.existsSync(candidatePath))throw new Error('answer candidate review requires diagnostic output');
const report=JSON.parse(fs.readFileSync(candidatePath,'utf8'));
const size=Math.max(1,Math.min(12,Number(process.env.AW_ANSWER_REVIEW_BATCH_SIZE||8)));
const offset=Math.max(0,Number(process.env.AW_ANSWER_REVIEW_BATCH_OFFSET||0));
const selected=(report.candidates||[]).slice(offset,offset+size);
const outDir=path.join(root,'dist','stage-papers','answer-candidate-review-batch');
fs.rmSync(outDir,{recursive:true,force:true});fs.mkdirSync(outDir,{recursive:true});
const manifest=[];
for(const c of selected){
  const resources=[];
  for(const r of c.answerResources||[]){
    const abs=path.join(root,r.sourcePath);if(!fs.existsSync(abs))continue;
    const doc=await pdfjs.getDocument({data:new Uint8Array(fs.readFileSync(abs)),disableWorker:true,isEvalSupported:false,useSystemFonts:true}).promise;
    const wanted=[...new Set([1,Math.max(1,Math.floor((doc.numPages+1)/2)),doc.numPages])].sort((a,b)=>a-b),pages=[];
    for(const n of wanted){
      const pg=await doc.getPage(n),base=pg.getViewport({scale:1}),scale=Math.min(1.7,1450/base.width),vp=pg.getViewport({scale}),canvas=createCanvas(Math.ceil(vp.width),Math.ceil(vp.height)),ctx=canvas.getContext('2d');ctx.fillStyle='white';ctx.fillRect(0,0,canvas.width,canvas.height);await pg.render({canvasContext:ctx,viewport:vp,canvas}).promise;
      const file=`${c.id}-${r.sourceSha256.slice(0,10)}-p${String(n).padStart(2,'0')}.jpg`;fs.writeFileSync(path.join(outDir,file),canvas.toBuffer('image/jpeg',86));pages.push({page:n,file,width:canvas.width,height:canvas.height,rotation:pg.rotate||0});
    }
    resources.push({sourcePath:r.sourcePath,sourceSha256:r.sourceSha256,totalPages:doc.numPages,pages});try{doc.destroy()}catch(_){}
  }
  manifest.push({id:c.id,learnerSourcePath:c.learnerSourcePath,learnerSha256:c.learnerSha256,stage:c.stage,subject:c.subject,year:c.year,resources,checksRequired:['same-paper-identity','correct-paper-level-or-form','complete-question-range','answer-order','response-type-anomalies'],automaticPromotion:false});
}
fs.writeFileSync(path.join(outDir,'manifest.json'),JSON.stringify({version:'aw-stage-answer-candidate-review-v1',release:'6.18.2',offset,size,available:(report.candidates||[]).length,selected:manifest},null,2)+'\n');
console.log(JSON.stringify({release:'6.18.2',answerCandidateReviewBatch:'PASS',offset,size,available:(report.candidates||[]).length,selected:manifest.length,automaticPromotion:false}));
