import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const dist=path.join(root,'dist');
const stage=path.join(dist,'stage-papers');
const reviewDirs=[
  'companion-answer-review',
  'answer-candidate-review-batch',
  'answer-candidate-review-batch-08',
  'answer-candidate-review-batch-20',
  'orientation-review-batch',
  'answer-leak-review',
  'timing-candidate-review',
  'unresolved-review-batch'
];
let removedBytes=0,removedFiles=0;
function measure(target){
  if(!fs.existsSync(target))return;
  for(const entry of fs.readdirSync(target,{withFileTypes:true})){
    const absolute=path.join(target,entry.name);
    if(entry.isDirectory())measure(absolute);
    else if(entry.isFile()){removedBytes+=fs.statSync(absolute).size;removedFiles++}
  }
}
for(const name of reviewDirs){
  const target=path.join(stage,name);
  measure(target);
  fs.rmSync(target,{recursive:true,force:true});
}
const reportDir=path.join(dist,'release-audit');
fs.mkdirSync(reportDir,{recursive:true});
fs.writeFileSync(path.join(reportDir,'release-evidence-prune.json'),JSON.stringify({schemaVersion:1,release:'6.19.1',runtimeContentRemoved:false,reviewDirectories:reviewDirs,removedFiles,removedBytes},null,2)+'\n');
console.log(JSON.stringify({releaseEvidencePrune:'PASS',removedFiles,removedMiB:Number((removedBytes/1048576).toFixed(2)),runtimeContentRemoved:false}));
