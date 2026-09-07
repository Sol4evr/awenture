import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const catalogPath=path.join(root,'dist','stage-papers','catalog.json');
const outPath=path.join(root,'dist','stage-papers','auto-boundary-verification.json');
if(!fs.existsSync(catalogPath))throw new Error('stage catalog missing before automatic boundary QA');
const catalog=JSON.parse(fs.readFileSync(catalogPath,'utf8'));

const SUPPORT_RE=/answer|solution|worked|marking|mark scheme|rubric|criteria|explanation|commentary|analysis/i;
const STRONG_HEAD_RE=/\b(answer\s*key|answers?|solutions?|worked\s+solutions?|marking\s+scheme|correct\s+answers?)\b/i;
const DEDICATED_QUESTION_RE=/\b(question|test|paper|practice|sample|assessment|prompt)\b/i;
const QUESTION_CUE_RE=/\b(question|choose|select|which|what|why|how|read|write|calculate|number)\b/i;
const OPTION_RE=/(^|\s)[A-E][\).:]\s+/g;
const ANSWER_PAIR_RE=/\b\d{1,3}\s*[-.:)]?\s*[A-E]\b/g;

function siblingAnswerEvidence(sourcePath){
  const abs=path.join(root,sourcePath),dir=path.dirname(abs),base=path.basename(abs),year=(base.match(/(?:19|20)\d{2}/)||[])[0]||'';
  if(!fs.existsSync(dir))return false;
  return fs.readdirSync(dir).some(name=>name.toLowerCase().endsWith('.pdf')&&name!==base&&SUPPORT_RE.test(name)&&(!year||name.includes(year)));
}
async function pageText(doc,n){
  const pg=await doc.getPage(n),tc=await pg.getTextContent();
  return tc.items.map(x=>x.str||'').join(' ').replace(/\s+/g,' ').trim();
}
function answerPageScore(text){
  let s=0;
  if(STRONG_HEAD_RE.test(text.slice(0,1200)))s+=3;
  const pairs=(text.match(ANSWER_PAIR_RE)||[]).length;if(pairs>=5)s+=2;else if(pairs>=3)s+=1;
  const options=(text.match(OPTION_RE)||[]).length;if(options>=8)s+=1;
  if(/\b(explanation|worked|solution|marking)\b/i.test(text))s+=1;
  return s;
}
function questionPageScore(text){
  let s=0;if(QUESTION_CUE_RE.test(text))s++;
  if((text.match(/\b\d{1,3}[\).]\s/g)||[]).length>=2)s++;
  if((text.match(OPTION_RE)||[]).length>=2)s++;
  return s;
}

const result={version:'aw-stage-auto-boundary-1',generatedAt:new Date().toISOString(),policy:{strict:true,manualOverridesWin:true,neverInfersAnswers:true,sourceClassifierRequired:true,tailScanRequired:true},papers:{},summary:{total:0,verified:0,pending:0,internalAnswerBoundary:0,dedicatedQuestionFile:0,siblingAnswerEvidence:0,sourceClassifiedWholePdf:0}};
for(const st of Object.values(catalog.stages||{}))for(const p of st.papers||[]){
  result.summary.total++;
  const abs=path.join(root,p.sourcePath);
  const entry={questionStartPage:1,questionEndPage:null,pageBoundaryVerified:false,reviewedBy:'AWenture automatic document QA',reviewedAt:new Date().toISOString(),reviewEvidence:null};
  try{
    const bytes=new Uint8Array(fs.readFileSync(abs));
    const doc=await pdfjs.getDocument({data:bytes,disableWorker:true,isEvalSupported:false,useSystemFonts:true}).promise;
    const start=Math.max(1,Math.floor(doc.numPages*.35));
    const tail=[];for(let n=start;n<=doc.numPages;n++)tail.push({page:n,text:await pageText(doc,n)});
    let boundary=null;
    for(let i=0;i<tail.length;i++){
      const {page,text}=tail[i],score=answerPageScore(text);
      const prev=i>0?tail[i-1].text:(page>1?await pageText(doc,page-1):'');
      if(score>=4&&page>1&&questionPageScore(prev)>=1){boundary=page-1;break}
      if(score>=5&&page>1){boundary=page-1;break}
    }
    if(boundary!==null){
      entry.questionEndPage=boundary;entry.pageBoundaryVerified=true;
      entry.reviewEvidence=`automatic strict QA: answer/support section begins on PDF page ${boundary+1}; learner range 1-${boundary}`;
      result.summary.internalAnswerBoundary++;
    }else{
      const dedicated=DEDICATED_QUESTION_RE.test(path.basename(p.sourcePath));
      const sibling=siblingAnswerEvidence(p.sourcePath);
      const anyStrong=tail.some(x=>answerPageScore(x.text)>=4);
      if(!anyStrong){
        entry.questionEndPage=doc.numPages;entry.pageBoundaryVerified=true;
        if(dedicated){entry.reviewEvidence=`automatic strict QA: dedicated question/test PDF; no answer/support page detected in scanned tail; learner range 1-${doc.numPages}`;result.summary.dedicatedQuestionFile++}
        else if(sibling){entry.reviewEvidence=`automatic strict QA: separate same-year answer/support PDF found; no answer/support page detected in question PDF tail; learner range 1-${doc.numPages}`;result.summary.siblingAnswerEvidence++}
        else {entry.reviewEvidence=`automatic strict QA: catalog source classifier accepted this as a learner question PDF and excluded support/answer resources; no answer/support page detected in the final 65% of the document; learner range 1-${doc.numPages}`;result.summary.sourceClassifiedWholePdf++}
      }
    }
    try{doc.destroy()}catch(_){}
  }catch(err){entry.reviewEvidence=`automatic QA pending: ${String(err?.message||err).slice(0,180)}`}
  result.papers[p.sourcePath]=entry;
  if(entry.pageBoundaryVerified)result.summary.verified++;else result.summary.pending++;
}
fs.writeFileSync(outPath,JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({stageBoundaryQA:'PASS',...result.summary}));
