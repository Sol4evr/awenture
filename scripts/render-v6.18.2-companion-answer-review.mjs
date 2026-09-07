import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import {createCanvas} from '@napi-rs/canvas';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const targets=[
  {id:'y4-maths-2007',stage:'icas-y4',subject:'Mathematics',year:2007,source:'source/original-icas/year4/Maths yr4/Maths B 2007 answers.pdf',learner:'source/original-icas/year4/Maths yr4/Maths B 2007 questions.pdf',pages:'all'},
  {id:'y4-maths-2008',stage:'icas-y4',subject:'Mathematics',year:2008,source:'source/original-icas/year4/Maths yr4/Maths B 2008 answers.pdf',learner:'source/original-icas/year4/Maths yr4/Maths B 2008 questions.pdf',pages:'all'},
  {id:'y3-maths-2015-answer-sheet',stage:'icas-y3',subject:'Mathematics',year:2015,source:'source/original-icas/year3/Maths A/Maths A 2015.pdf',learner:'source/original-icas/year3/Maths A/Maths A 2015.pdf',pages:[15]},
  {id:'y4-science-2010-answer-key',stage:'icas-y4',subject:'Science',year:2010,source:'source/original-icas/year4/Science Year 4/Icas Yr 4 Science 2010.pdf',learner:'source/original-icas/year4/Science Year 4/Icas Yr 4 Science 2010.pdf',pages:[15,16]}
];
const outDir=path.join(root,'dist/stage-papers/companion-answer-review');fs.rmSync(outDir,{recursive:true,force:true});fs.mkdirSync(outDir,{recursive:true});
const sha=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
async function text(doc,n){const pg=await doc.getPage(n),tc=await pg.getTextContent();return (tc.items||[]).map(x=>String(x.str||'').trim()).filter(Boolean).join(' ').replace(/\s+/g,' ').trim()}
function emitThumbnail(id,page,pg){return (async()=>{const base=pg.getViewport({scale:1}),scale=Math.min(1.2,760/base.width),vp=pg.getViewport({scale}),canvas=createCanvas(Math.ceil(vp.width),Math.ceil(vp.height)),ctx=canvas.getContext('2d');ctx.fillStyle='white';ctx.fillRect(0,0,canvas.width,canvas.height);await pg.render({canvasContext:ctx,viewport:vp,canvas}).promise;const b64=canvas.toBuffer('image/jpeg',52).toString('base64'),chunkSize=6000,total=Math.ceil(b64.length/chunkSize);console.log(JSON.stringify({release:'6.18.2',visualReviewThumbnail:'BEGIN',id,page,width:canvas.width,height:canvas.height,base64Chars:b64.length,chunks:total}));for(let i=0;i<total;i++)console.log(JSON.stringify({release:'6.18.2',visualReviewThumbnail:'CHUNK',id,page,index:i,total,data:b64.slice(i*chunkSize,(i+1)*chunkSize)}));console.log(JSON.stringify({release:'6.18.2',visualReviewThumbnail:'END',id,page,chunks:total}));})();}
const manifest=[];
for(const t of targets){
  const abs=path.join(root,t.source),learnerAbs=path.join(root,t.learner);if(!fs.existsSync(abs)||!fs.existsSync(learnerAbs))throw new Error(`visual-review target missing: ${t.id}`);
  const doc=await pdfjs.getDocument({data:new Uint8Array(fs.readFileSync(abs)),disableWorker:true,isEvalSupported:false,useSystemFonts:true}).promise;
  const pageNos=t.pages==='all'?[...Array(doc.numPages)].map((_,i)=>i+1):t.pages.filter(n=>n>=1&&n<=doc.numPages),pages=[];
  for(const n of pageNos){
    const pg=await doc.getPage(n),base=pg.getViewport({scale:1}),scale=Math.min(2.25,1900/base.width),vp=pg.getViewport({scale}),canvas=createCanvas(Math.ceil(vp.width),Math.ceil(vp.height)),ctx=canvas.getContext('2d');ctx.fillStyle='white';ctx.fillRect(0,0,canvas.width,canvas.height);await pg.render({canvasContext:ctx,viewport:vp,canvas}).promise;
    const file=`${t.id}-p${String(n).padStart(2,'0')}.jpg.b64.txt`;fs.writeFileSync(path.join(outDir,file),canvas.toBuffer('image/jpeg',90).toString('base64'));
    const raw=await text(doc,n);pages.push({page:n,file:`stage-papers/companion-answer-review/${file}`,text:raw.slice(0,3000)});
    await emitThumbnail(t.id,n,pg);
  }
  manifest.push({id:t.id,year:t.year,stage:t.stage,subject:t.subject,sourcePath:t.source,sourceSha256:sha(abs),learnerPath:t.learner,learnerSha256:sha(learnerAbs),totalPages:doc.numPages,pages});try{doc.destroy()}catch(_){}
}
fs.writeFileSync(path.join(outDir,'manifest.json'),JSON.stringify({version:'aw-companion-answer-review-v3-log-thumbnails',generatedAt:new Date().toISOString(),targets:manifest},null,2)+'\n');
console.log(JSON.stringify({release:'6.18.2',companionAnswerReview:'PASS',version:'v3-log-thumbnails',targets:manifest.map(x=>({id:x.id,year:x.year,sourceSha256:x.sourceSha256,learnerSha256:x.learnerSha256,totalPages:x.totalPages,pages:x.pages.map(p=>({page:p.page,file:p.file,text:p.text.slice(0,450)}))}))}));
