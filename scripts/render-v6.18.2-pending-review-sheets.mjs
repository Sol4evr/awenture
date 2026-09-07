import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import {createCanvas} from '@napi-rs/canvas';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const indexPath=path.join(root,'dist/stage-paper-source-review/index.json');
if(!fs.existsSync(indexPath))throw new Error('source-review index missing');
const review=JSON.parse(fs.readFileSync(indexPath,'utf8'));
const outDir=path.join(root,'dist/stage-paper-source-review/sheets');fs.rmSync(outDir,{recursive:true,force:true});fs.mkdirSync(outDir,{recursive:true});
const items=(review.index||[]).filter(x=>!x.error);const perSheet=6,manifest=[];
for(let start=0;start<items.length;start+=perSheet){const batch=items.slice(start,start+perSheet),cellW=720,cellH=1080,cols=2,rows=Math.ceil(batch.length/cols),sheet=createCanvas(cellW*cols,cellH*rows),ctx=sheet.getContext('2d');ctx.fillStyle='white';ctx.fillRect(0,0,sheet.width,sheet.height);const refs=[];
  for(let i=0;i<batch.length;i++){const it=batch[i],src=it.sourcePaths?.[0],abs=path.join(root,src),x=(i%cols)*cellW,y=Math.floor(i/cols)*cellH;try{const doc=await pdfjs.getDocument({data:new Uint8Array(fs.readFileSync(abs)),disableWorker:true,isEvalSupported:false,useSystemFonts:true}).promise;const pageNo=Math.min(doc.numPages,it.questionEndPage||doc.numPages),pg=await doc.getPage(pageNo),base=pg.getViewport({scale:1}),scale=Math.min((cellW-36)/base.width,(cellH-115)/base.height),vp=pg.getViewport({scale}),c=createCanvas(Math.ceil(vp.width),Math.ceil(vp.height)),cctx=c.getContext('2d');cctx.fillStyle='white';cctx.fillRect(0,0,c.width,c.height);await pg.render({canvasContext:cctx,viewport:vp,canvas:c}).promise;ctx.drawImage(c,x+18,y+82);ctx.fillStyle='black';ctx.font='bold 19px sans-serif';ctx.fillText(`${it.id} · ${it.stage} · ${it.subject} · ${it.year??'sample'}`,x+18,y+26);ctx.font='15px sans-serif';ctx.fillText(`learner end page ${pageNo}/${doc.numPages}`,x+18,y+52);refs.push({id:it.id,sourcePaths:it.sourcePaths,page:pageNo,sha256:it.sha256});try{doc.destroy()}catch(_){}}catch(err){ctx.fillStyle='red';ctx.font='18px sans-serif';ctx.fillText(`render failed ${it.id}: ${String(err?.message||err).slice(0,70)}`,x+18,y+100);refs.push({id:it.id,error:String(err?.message||err)})}}
  const n=String(Math.floor(start/perSheet)+1).padStart(2,'0'),jpg=sheet.toBuffer('image/jpeg',82),b64=jpg.toString('base64');fs.writeFileSync(path.join(outDir,`sheet-${n}.jpg.b64.txt`),b64);manifest.push({sheet:n,file:`stage-paper-source-review/sheets/sheet-${n}.jpg.b64.txt`,items:refs});
}
fs.writeFileSync(path.join(outDir,'manifest.json'),JSON.stringify({version:'aw-stage-pending-visual-review-v1',generatedAt:new Date().toISOString(),uniqueSources:items.length,sheets:manifest.length,manifest},null,2)+'\n');console.log(JSON.stringify({release:'6.18.2',pendingVisualReviewSheets:'PASS',uniqueSources:items.length,sheets:manifest.length,manifest:manifest.map(s=>({sheet:s.sheet,ids:s.items.map(x=>x.id)}))}));
