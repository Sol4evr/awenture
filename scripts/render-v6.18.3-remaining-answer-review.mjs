import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const sourceDir=path.join(root,'dist','stage-papers','answer-candidate-review-batch');
const batches=[{offset:8,size:12,name:'answer-candidate-review-batch-08'},{offset:20,size:10,name:'answer-candidate-review-batch-20'}];

for(const batch of batches){
  const run=spawnSync(process.execPath,['scripts/render-v6.18.2-answer-candidate-review-batch.mjs'],{
    cwd:root,
    stdio:'inherit',
    env:{...process.env,AW_ANSWER_REVIEW_BATCH_OFFSET:String(batch.offset),AW_ANSWER_REVIEW_BATCH_SIZE:String(batch.size)}
  });
  if(run.status!==0)throw new Error(`answer review render failed at offset ${batch.offset}`);
  const target=path.join(root,'dist','stage-papers',batch.name);
  fs.rmSync(target,{recursive:true,force:true});
  fs.renameSync(sourceDir,target);
}
console.log(JSON.stringify({release:'6.18.3',remainingAnswerReview:'PASS',batches:batches.map(x=>({offset:x.offset,size:x.size,name:x.name})),automaticPromotion:false}));
