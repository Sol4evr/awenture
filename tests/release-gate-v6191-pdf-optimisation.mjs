import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {PDFDocument} from 'pdf-lib';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const reportPath=path.join(root,'dist','release-audit','historical-pdf-optimisation.json');
if(!fs.existsSync(reportPath))throw new Error('Historical PDF optimisation report is missing');
const report=JSON.parse(fs.readFileSync(reportPath,'utf8'));
if(report.optimiser!=='aw-historical-pdf-ipad-v1'||report.deterministic!==true)throw new Error('Historical PDF optimisation contract mismatch');
if(report.governedAssets!==43||report.assets?.length!==43)throw new Error(`Historical PDF asset accounting regression: ${report.assets?.length}/43`);
if(report.dpi<216||report.jpegQuality<92)throw new Error('Historical PDF readability settings were weakened');
if(report.savedBytes<50*1024*1024)throw new Error(`Historical PDF optimisation regression: only ${(report.savedBytes/1048576).toFixed(2)} MiB saved`);
if(report.afterBytes>130*1024*1024)throw new Error(`Historical PDF output regression: ${(report.afterBytes/1048576).toFixed(2)} MiB exceeds 130 MiB`);

let pages=0;
for(const asset of report.assets){
  if(!asset.path.startsWith('original-icas/year2/')||!asset.path.endsWith('.pdf'))throw new Error(`Unexpected governed PDF path: ${asset.path}`);
  if(!Number.isInteger(asset.pages)||asset.pages<1)throw new Error(`Invalid page accounting: ${asset.path}`);
  if(asset.afterBytes>asset.beforeBytes)throw new Error(`Optimiser enlarged asset: ${asset.path}`);
  if(asset.replaced&&asset.minEffectiveDpi<215)throw new Error(`Optimised paper below readability floor: ${asset.path}`);
  const absolute=path.join(root,'dist',asset.path);
  const bytes=fs.readFileSync(absolute);
  if(bytes.subarray(0,5).toString('ascii')!=='%PDF-')throw new Error(`Invalid PDF output: ${asset.path}`);
  const pdf=await PDFDocument.load(bytes);
  if(pdf.getPageCount()!==asset.pages)throw new Error(`Page-count regression: ${asset.path}`);
  for(const page of pdf.getPages()){
    const {width,height}=page.getSize();
    if(width<200||height<200)throw new Error(`Invalid page geometry: ${asset.path}`);
  }
  pages+=asset.pages;
}
console.log(JSON.stringify({release:'6.19.1',historicalPdfOptimisation:'PASS',assets:report.governedAssets,pages,replaced:report.replacedAssets,savedMiB:Number((report.savedBytes/1048576).toFixed(2)),afterMiB:Number((report.afterBytes/1048576).toFixed(2)),minimumDpi:216}));
