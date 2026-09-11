import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import {createCanvas} from '@napi-rs/canvas';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const input=path.join(root,'dist/stage-papers/timing-evidence-candidates-v1.json');
if(!fs.existsSync(input))throw new Error('timing candidate review requires timing evidence candidates');
const data=JSON.parse(fs.readFileSync(input,'utf8'));
const candidates=(data.candidates||data.papers||[]).filter(x=>x&&x.sourcePath&&Number.isInteger(Number(x.page||x.evidencePage||1)));
const outDir=path.join(root,'dist/stage-papers/timing-candidate-review');
fs.rmSync(outDir,{recursive:true,force:true});fs.mkdirSync(outDir,{recursive:true});
const selected=[];
for(const c of candidates){
  const abs=path.join(root,c.sourcePath);if(!fs.existsSync(abs))throw new Error(`timing source missing: ${c.sourcePath}`);
  const doc=await pdfjs.getDocument({data:new Uint8Array(fs.readFileSync(abs)),disableWorker:true,isEvalSupported:false,useSystemFonts:true}).promise;
  const n=Math.max(1,Math.min(doc.numPages,Number(c.page||c.evidencePage||1))),pg=await doc.getPage(n),base=pg.getViewport({scale:1}),scale=Math.min(1.8,1500/base.width),vp=pg.getViewport({scale}),canvas=createCanvas(Math.ceil(vp.width),Math.ceil(vp.height)),ctx=canvas.getContext('2d');
  ctx.fillStyle='white';ctx.fillRect(0,0,canvas.width,canvas.height);await pg.render({canvasContext:ctx,viewport:vp,canvas}).promise;
  const file=`${c.id||c.paperId||selected.length}-p${String(n).padStart(2,'0')}.jpg`;fs.writeFileSync(path.join(outDir,file),canvas.toBuffer('image/jpeg',88));
  selected.push({...c,evidencePage:n,file,automaticPromotion:false,reviewChecks:['paper-identity','explicit-time-wording','no-stage-default-inference']});try{doc.destroy()}catch(_){}
}
fs.writeFileSync(path.join(outDir,'manifest.json'),JSON.stringify({version:'aw-stage-paper-timing-candidate-review-v1',release:'6.18.2',policy:{paperSpecificOnly:true,automaticPromotion:false,stageDefaultsAreNotHistoricalEvidence:true},selected},null,2)+'\n');
console.log(JSON.stringify({release:'6.18.2',timingCandidateReview:'PASS',selected:selected.length,automaticPromotion:false}));
