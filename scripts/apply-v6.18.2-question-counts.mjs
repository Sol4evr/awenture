import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const catalogPath=path.join(root,'dist','stage-papers','catalog.json');
const qaPath=path.join(root,'dist','stage-papers','auto-question-count-verification.json');
if(!fs.existsSync(catalogPath)||!fs.existsSync(qaPath))throw new Error('question-count apply requires catalog + QA output');
const catalog=JSON.parse(fs.readFileSync(catalogPath,'utf8'));
const qa=JSON.parse(fs.readFileSync(qaPath,'utf8'));
let applied=0,pending=0;
for(const st of Object.values(catalog.stages||{}))for(const p of st.papers||[]){
  const q=qa.papers?.[p.sourcePath];
  p.questionCount=q?.questionCountVerified?Number(q.questionCount):null;
  p.questionCountVerified=!!q?.questionCountVerified;
  p.questionCountMethod=q?.method||null;
  if(p.questionCountVerified)applied++;else pending++;
}
catalog.questionCountQA={version:qa.version,verified:applied,pending,total:applied+pending};
fs.writeFileSync(catalogPath,JSON.stringify(catalog,null,2)+'\n');
console.log(JSON.stringify({release:'6.18.2',questionCountApply:'PASS',applied,pending,total:applied+pending}));
