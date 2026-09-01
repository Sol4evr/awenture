import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const manifest=JSON.parse(fs.readFileSync(path.join(root,'source/icas-y2-original-papers.json'),'utf8'));
const folderFor={English:'english',Mathematics:'mathematics',Science:'science'};
const out=[];
for(const p of manifest.papers){
  const dir=path.join(root,'source','original-icas','year2',folderFor[p.subject]);
  const file=fs.readdirSync(dir).find(n=>n.toLowerCase().endsWith('.pdf')&&n.startsWith(String(p.year)+' '));
  if(!file) throw new Error(`Missing PDF ${p.subject} ${p.year}`);
  const bytes=new Uint8Array(fs.readFileSync(path.join(dir,file)));
  const doc=await pdfjsLib.getDocument({data:bytes,useWorkerFetch:false,isEvalSupported:false,useSystemFonts:true}).promise;
  const pages=[];
  for(let i=1;i<=doc.numPages;i++){
    const page=await doc.getPage(i);
    const tc=await page.getTextContent();
    const text=tc.items.map(x=>x.str).join(' ').replace(/\s+/g,' ').trim();
    pages.push({page:i,text:text.slice(0,5000)});
  }
  out.push({id:p.id,subject:p.subject,year:p.year,file,pages});
}
const target=path.join(root,'dist','original-icas','inspection.json');
fs.mkdirSync(path.dirname(target),{recursive:true});
fs.writeFileSync(target,JSON.stringify({generatedFor:'v6.13.1-preview-inspection',papers:out}));
console.log(JSON.stringify({originalPaperInspection:'READY',papers:out.length,pages:out.reduce((n,p)=>n+p.pages.length,0)}));
