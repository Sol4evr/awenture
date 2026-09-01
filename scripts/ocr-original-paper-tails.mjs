import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import { createCanvas } from '@napi-rs/canvas';
import { createWorker } from 'tesseract.js';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const manifest=JSON.parse(fs.readFileSync(path.join(root,'source/icas-y2-original-papers.json'),'utf8'));
const folderFor={English:'english',Mathematics:'mathematics',Science:'science'};
const targets=new Set(['English|2014','English|2016','English|2017','Mathematics|2014','Mathematics|2019','Science|2017','Science|2018']);
const worker=await createWorker('eng');
for(const p of manifest.papers){
  const key=`${p.subject}|${p.year}`; if(!targets.has(key)) continue;
  const dir=path.join(root,'source','original-icas','year2',folderFor[p.subject]);
  const file=fs.readdirSync(dir).find(n=>n.toLowerCase().endsWith('.pdf')&&n.startsWith(String(p.year)+' '));
  const doc=await pdfjsLib.getDocument({data:new Uint8Array(fs.readFileSync(path.join(dir,file))),useWorkerFetch:false,isEvalSupported:false,useSystemFonts:true}).promise;
  const start=Math.max(1,doc.numPages-4);
  for(let n=start;n<=doc.numPages;n++){
    const page=await doc.getPage(n); const viewport=page.getViewport({scale:1.8});
    const canvas=createCanvas(Math.ceil(viewport.width),Math.ceil(viewport.height));
    const ctx=canvas.getContext('2d');
    await page.render({canvasContext:ctx,viewport}).promise;
    const {data:{text}}=await worker.recognize(canvas.toBuffer('image/png'));
    console.log('AW_OCR_TAIL '+JSON.stringify({subject:p.subject,year:p.year,page:n,totalPages:doc.numPages,text:text.replace(/\s+/g,' ').trim().slice(0,7000)}));
  }
}
await worker.terminate();
