import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PDFDocument } from 'pdf-lib';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const runtime=JSON.parse(fs.readFileSync(path.join(root,'bank/v6.13.1-original-paper-runtime.json'),'utf8'));
const folderFor={English:'english',Mathematics:'mathematics',Science:'science'};
const sourceRoot=path.join(root,'source','original-icas','year2');
const outputRoot=path.join(root,'dist','original-icas','year2');
let questionAssets=0,answerAssets=0;

for(const paper of runtime.papers){
  const folder=folderFor[paper.subject];
  const sourceDir=path.join(sourceRoot,folder);
  const filename=fs.readdirSync(sourceDir).find(n=>n.toLowerCase().endsWith('.pdf')&&n.startsWith(String(paper.year)+' '));
  if(!filename)throw new Error(`Missing source PDF for ${paper.subject} ${paper.year}`);
  const bytes=fs.readFileSync(path.join(sourceDir,filename));
  const src=await PDFDocument.load(bytes,{ignoreEncryption:true});
  if(paper.questionEndPage<1||paper.questionEndPage>=src.getPageCount())throw new Error(`Invalid question cutoff for ${paper.subject} ${paper.year}: ${paper.questionEndPage}/${src.getPageCount()}`);
  const outDir=path.join(outputRoot,folder);fs.mkdirSync(outDir,{recursive:true});

  const questions=await PDFDocument.create();
  const qPages=await questions.copyPages(src,Array.from({length:paper.questionEndPage},(_,i)=>i));
  qPages.forEach(p=>questions.addPage(p));
  questions.setTitle(`${paper.year} ICAS Year 2 ${paper.subject} — questions`);
  fs.writeFileSync(path.join(outDir,`${paper.year}-questions.pdf`),await questions.save({useObjectStreams:false}));
  questionAssets++;

  if(paper.answerReference){
    const indexes=Array.from({length:src.getPageCount()-paper.questionEndPage},(_,i)=>paper.questionEndPage+i);
    if(indexes.length){
      const answers=await PDFDocument.create();
      const aPages=await answers.copyPages(src,indexes);aPages.forEach(p=>answers.addPage(p));
      answers.setTitle(`${paper.year} ICAS Year 2 ${paper.subject} — post-submission reference`);
      fs.writeFileSync(path.join(outDir,`${paper.year}-answers.pdf`),await answers.save({useObjectStreams:false}));
      answerAssets++;
    }
  }
}
console.log(JSON.stringify({historicalFormalAssets:'PASS',questionAssets,answerAssets,rawAnswerPagesExcludedFromTimedFiles:true}));
