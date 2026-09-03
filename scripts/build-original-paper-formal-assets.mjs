import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { PDFDocument, degrees } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import { createCanvas } from '@napi-rs/canvas';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const runtime=JSON.parse(fs.readFileSync(path.join(root,'bank/v6.13.1-original-paper-runtime.json'),'utf8'));
const folderFor={English:'english',Mathematics:'mathematics',Science:'science'};
const sourceRoot=path.join(root,'source','original-icas','year2');
const outputRoot=path.join(root,'dist','original-icas','year2');
const wasmUrl=pathToFileURL(path.join(root,'node_modules','pdfjs-dist','wasm')+path.sep).href;
const forceRasterPapers=new Set(['English|2017']);
const orientationAudit=JSON.parse(fs.readFileSync(path.join(root,'quality/original-paper-orientation-v6.15.2.json'),'utf8'));
const orientationByPaper=new Map(orientationAudit.papers.map(p=>[p.subject+'|'+p.year,p.correctionDegrees]));
const runtimeKeys=runtime.papers.map(p=>p.subject+'|'+p.year);
if(orientationAudit.release!=='6.15.2'||orientationAudit.papers.length!==runtimeKeys.length||runtimeKeys.some(k=>!orientationByPaper.has(k)))throw new Error('Historical-paper orientation audit does not cover the complete authorised runtime');
for(const [key,rotation] of orientationByPaper){if(!runtimeKeys.includes(key)||![0,90,180,270].includes(rotation))throw new Error('Invalid historical-paper orientation contract: '+key+' '+rotation)};

let questionAssets=0,answerAssets=0,vectorPapers=0,rasterFallbackPapers=0;

async function rasterDerivative(bytes,indexes,title,correctionDegrees=0){
  const doc=await pdfjsLib.getDocument({data:new Uint8Array(bytes),useWorkerFetch:false,isEvalSupported:false,useSystemFonts:true,wasmUrl}).promise;
  const out=await PDFDocument.create();
  for(const index of indexes){
    const sourcePage=await doc.getPage(index+1),rotation=(sourcePage.rotate+correctionDegrees)%360,base=sourcePage.getViewport({scale:1,rotation}),view=sourcePage.getViewport({scale:1.75,rotation});
    const canvas=createCanvas(Math.ceil(view.width),Math.ceil(view.height)),ctx=canvas.getContext('2d');
    ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);await sourcePage.render({canvasContext:ctx,viewport:view}).promise;
    const png=await out.embedPng(canvas.toBuffer('image/png')),page=out.addPage([base.width,base.height]);page.drawImage(png,{x:0,y:0,width:base.width,height:base.height});
  }
  out.setTitle(title);return out.save({useObjectStreams:false});
}
async function vectorDerivative(src,indexes,title,correctionDegrees=0){const out=await PDFDocument.create(),pages=await out.copyPages(src,indexes);pages.forEach(p=>{if(correctionDegrees)p.setRotation(degrees((p.getRotation().angle+correctionDegrees)%360));out.addPage(p)});out.setTitle(title);return out.save({useObjectStreams:false})}

for(const paper of runtime.papers){
  const folder=folderFor[paper.subject],sourceDir=path.join(sourceRoot,folder),filename=fs.readdirSync(sourceDir).find(n=>n.toLowerCase().endsWith('.pdf')&&n.startsWith(String(paper.year)+' '));
  if(!filename)throw new Error(`Missing source PDF for ${paper.subject} ${paper.year}`);
  const bytes=fs.readFileSync(path.join(sourceDir,filename)),outDir=path.join(outputRoot,folder);fs.mkdirSync(outDir,{recursive:true});
  console.log(`AW_FORMAL_ASSET ${paper.subject} ${paper.year}`);
  let src=null,pageCount=paper.questionEndPage+1,vector=true,orientationCorrection=orientationByPaper.get(paper.subject+'|'+paper.year)||0;
  try{src=await PDFDocument.load(bytes,{ignoreEncryption:true});pageCount=src.getPageCount();if(paper.questionEndPage<1||paper.questionEndPage>=pageCount)throw new Error(`Invalid question cutoff ${paper.questionEndPage}/${pageCount}`)}catch(err){vector=false;const pdf=await pdfjsLib.getDocument({data:new Uint8Array(bytes),useWorkerFetch:false,isEvalSupported:false,useSystemFonts:true,wasmUrl}).promise;pageCount=pdf.numPages;if(paper.questionEndPage<1||paper.questionEndPage>=pageCount)throw new Error(`Invalid question cutoff for ${paper.subject} ${paper.year}: ${paper.questionEndPage}/${pageCount}`);console.warn(`AW_RASTER_FALLBACK ${paper.subject} ${paper.year}: ${err.message}`)}
  if(forceRasterPapers.has(`${paper.subject}|${paper.year}`)){vector=false;console.warn(`AW_RASTER_PRESERVE ${paper.subject} ${paper.year}: source uses page content that is not reliably preserved by PDF page copying`)}
  const qIndexes=Array.from({length:paper.questionEndPage},(_,i)=>i),qTitle=`${paper.year} ICAS Year 2 ${paper.subject} — questions`;
  let qBytes;
  try{qBytes=vector?await vectorDerivative(src,qIndexes,qTitle,orientationCorrection):await rasterDerivative(bytes,qIndexes,qTitle,orientationCorrection)}catch(err){if(!vector)throw err;vector=false;console.warn(`AW_RASTER_FALLBACK ${paper.subject} ${paper.year}: ${err.message}`);qBytes=await rasterDerivative(bytes,qIndexes,qTitle,orientationCorrection)}
  fs.writeFileSync(path.join(outDir,`${paper.year}-questions.pdf`),qBytes);questionAssets++;
  if(vector)vectorPapers++;else rasterFallbackPapers++;
  if(paper.answerReference){const indexes=Array.from({length:pageCount-paper.questionEndPage},(_,i)=>paper.questionEndPage+i);if(indexes.length){const title=`${paper.year} ICAS Year 2 ${paper.subject} — post-submission reference`;const aBytes=vector?await vectorDerivative(src,indexes,title,orientationCorrection):await rasterDerivative(bytes,indexes,title,orientationCorrection);fs.writeFileSync(path.join(outDir,`${paper.year}-answers.pdf`),aBytes);answerAssets++}}
}
console.log(JSON.stringify({historicalFormalAssets:'PASS',questionAssets,answerAssets,vectorPapers,rasterFallbackPapers,forcedRaster:[...forceRasterPapers],orientationAudit:'PASS',orientationPapers:orientationAudit.papers.length,orientationCorrections:orientationAudit.papers.filter(p=>p.correctionDegrees).map(p=>p.subject+'|'+p.year+'|'+p.correctionDegrees),rawAnswerPagesExcludedFromTimedFiles:true}));
