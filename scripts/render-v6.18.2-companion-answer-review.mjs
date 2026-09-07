import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import {createCanvas} from '@napi-rs/canvas';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const targets=[
  {year:2007,answer:'source/original-icas/year4/Maths yr4/Maths B 2007 answers.pdf',learner:'source/original-icas/year4/Maths yr4/Maths B 2007 questions.pdf'},
  {year:2008,answer:'source/original-icas/year4/Maths yr4/Maths B 2008 answers.pdf',learner:'source/original-icas/year4/Maths yr4/Maths B 2008 questions.pdf'}
];
const outDir=path.join(root,'dist/stage-papers/companion-answer-review');fs.rmSync(outDir,{recursive:true,force:true});fs.mkdirSync(outDir,{recursive:true});
const sha=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
async function text(doc,n){const pg=await doc.getPage(n),tc=await pg.getTextContent();return (tc.items||[]).map(x=>String(x.str||'').trim()).filter(Boolean).join(' ').replace(/\s+/g,' ').trim()}
const manifest=[];
for(const t of targets){
  const abs=path.join(root,t.answer),learnerAbs=path.join(root,t.learner);if(!fs.existsSync(abs)||!fs.existsSync(learnerAbs))throw new Error(`companion target missing for ${t.year}`);
  const doc=await pdfjs.getDocument({data:new Uint8Array(fs.readFileSync(abs)),disableWorker:true,isEvalSupported:false,useSystemFonts:true}).promise;
  const pages=[];
  for(let n=1;n<=doc.numPages;n++){
    const pg=await doc.getPage(n),base=pg.getViewport({scale:1}),scale=Math.min(2.0,1700/base.width),vp=pg.getViewport({scale}),canvas=createCanvas(Math.ceil(vp.width),Math.ceil(vp.height)),ctx=canvas.getContext('2d');ctx.fillStyle='white';ctx.fillRect(0,0,canvas.width,canvas.height);await pg.render({canvasContext:ctx,viewport:vp,canvas}).promise;
    const file=`maths-b-${t.year}-answers-p${String(n).padStart(2,'0')}.jpg.b64.txt`;fs.writeFileSync(path.join(outDir,file),canvas.toBuffer('image/jpeg',88).toString('base64'));
    const raw=await text(doc,n);pages.push({page:n,file:`stage-papers/companion-answer-review/${file}`,text:raw.slice(0,3000)});
  }
  manifest.push({year:t.year,stage:'icas-y4',subject:'Mathematics',answerPath:t.answer,answerSha256:sha(abs),learnerPath:t.learner,learnerSha256:sha(learnerAbs),answerPages:doc.numPages,pages});try{doc.destroy()}catch(_){}
}
fs.writeFileSync(path.join(outDir,'manifest.json'),JSON.stringify({version:'aw-companion-answer-review-v1',generatedAt:new Date().toISOString(),targets:manifest},null,2)+'\n');
console.log(JSON.stringify({release:'6.18.2',companionAnswerReview:'PASS',targets:manifest.map(x=>({year:x.year,answerSha256:x.answerSha256,learnerSha256:x.learnerSha256,answerPages:x.answerPages,pages:x.pages.map(p=>({page:p.page,file:p.file,text:p.text.slice(0,450)}))}))}));
