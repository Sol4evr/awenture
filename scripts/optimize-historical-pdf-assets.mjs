import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import {PDFDocument} from 'pdf-lib';
import {createCanvas} from '@napi-rs/canvas';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const assetRoot=path.join(root,'dist','original-icas','year2');
const reportDir=path.join(root,'dist','release-audit');
const DPI=216;
const SCALE=DPI/72;
const JPEG_QUALITY=92;
const MIN_SAVING_RATIO=0.10;
const FIXED_DATE=new Date('2026-01-01T00:00:00.000Z');

if(!fs.existsSync(assetRoot))throw new Error('Historical PDF optimiser: Year 2 paper output is missing');

const files=[];
function walk(dir){
  for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
    const absolute=path.join(dir,entry.name);
    if(entry.isDirectory())walk(absolute);
    else if(entry.isFile()&&entry.name.toLowerCase().endsWith('.pdf'))files.push(absolute);
  }
}
walk(assetRoot);
files.sort();
if(files.length!==43)throw new Error(`Historical PDF optimiser: expected 43 governed assets, found ${files.length}`);

const results=[];
for(const absolute of files){
  const source=fs.readFileSync(absolute);
  const input=await pdfjs.getDocument({data:new Uint8Array(source),disableWorker:true,isEvalSupported:false,useSystemFonts:true}).promise;
  const output=await PDFDocument.create();
  output.setProducer('AWenture deterministic iPad delivery optimiser');
  output.setCreator('AWenture');
  output.setCreationDate(FIXED_DATE);
  output.setModificationDate(FIXED_DATE);
  let minEffectiveDpi=Infinity;
  try{
    for(let pageNumber=1;pageNumber<=input.numPages;pageNumber++){
      const page=await input.getPage(pageNumber);
      const base=page.getViewport({scale:1});
      const viewport=page.getViewport({scale:SCALE});
      const canvas=createCanvas(Math.ceil(viewport.width),Math.ceil(viewport.height));
      const context=canvas.getContext('2d');
      context.fillStyle='#fff';
      context.fillRect(0,0,canvas.width,canvas.height);
      await page.render({canvasContext:context,viewport,canvas}).promise;
      const jpeg=canvas.toBuffer('image/jpeg',JPEG_QUALITY);
      const image=await output.embedJpg(jpeg);
      const target=output.addPage([base.width,base.height]);
      target.drawImage(image,{x:0,y:0,width:base.width,height:base.height});
      minEffectiveDpi=Math.min(minEffectiveDpi,canvas.width/base.width*72,canvas.height/base.height*72);
      page.cleanup();
    }
  }finally{
    try{input.destroy()}catch(_){}
  }
  const optimised=Buffer.from(await output.save({useObjectStreams:true,addDefaultPage:false,objectsPerTick:50}));
  const replace=optimised.length<=source.length*(1-MIN_SAVING_RATIO);
  if(replace){
    const temp=`${absolute}.aw-optimising`;
    fs.writeFileSync(temp,optimised);
    fs.renameSync(temp,absolute);
  }
  results.push({
    path:path.relative(path.join(root,'dist'),absolute).split(path.sep).join('/'),
    pages:output.getPageCount(),
    beforeBytes:source.length,
    afterBytes:replace?optimised.length:source.length,
    savedBytes:replace?source.length-optimised.length:0,
    replaced:replace,
    minEffectiveDpi:Number(minEffectiveDpi.toFixed(1))
  });
}
const beforeBytes=results.reduce((n,x)=>n+x.beforeBytes,0);
const afterBytes=results.reduce((n,x)=>n+x.afterBytes,0);
const report={
  schemaVersion:1,
  optimiser:'aw-historical-pdf-ipad-v1',
  deterministic:true,
  dpi:DPI,
  jpegQuality:JPEG_QUALITY,
  governedAssets:files.length,
  replacedAssets:results.filter(x=>x.replaced).length,
  beforeBytes,
  afterBytes,
  savedBytes:beforeBytes-afterBytes,
  assets:results
};
fs.mkdirSync(reportDir,{recursive:true});
fs.writeFileSync(path.join(reportDir,'historical-pdf-optimisation.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({historicalPdfOptimisation:'PASS',assets:files.length,replaced:report.replacedAssets,beforeMiB:Number((beforeBytes/1048576).toFixed(2)),afterMiB:Number((afterBytes/1048576).toFixed(2)),savedMiB:Number((report.savedBytes/1048576).toFixed(2)),dpi:DPI}));
