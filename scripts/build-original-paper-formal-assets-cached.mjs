import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const cacheRoot=path.join(root,'node_modules','.cache','awenture-historical-corpus-v1','original-icas','year2');
const outRoot=path.join(root,'dist','original-icas','year2');
const marker=path.join(cacheRoot,'.complete.json');
const force=process.env.AW_REBUILD_HISTORICAL_BASELINE==='1';

function copyDir(src,dst){fs.rmSync(dst,{recursive:true,force:true});fs.mkdirSync(path.dirname(dst),{recursive:true});fs.cpSync(src,dst,{recursive:true,force:true})}
function validCache(){
  if(!fs.existsSync(marker))return false;
  try{const m=JSON.parse(fs.readFileSync(marker,'utf8'));return m.baseline==='aw-historical-corpus-v1'&&m.questionAssets===22&&m.answerAssets===21}catch(_){return false}
}

if(!force&&validCache()){
  copyDir(cacheRoot,outRoot);
  fs.rmSync(path.join(outRoot,'.complete.json'),{force:true});
  console.log(JSON.stringify({historicalFormalAssets:'CACHE_HIT',baseline:'aw-historical-corpus-v1',questionAssets:22,answerAssets:21}));
}else{
  await import('./build-original-paper-formal-assets.mjs');
  copyDir(outRoot,cacheRoot);
  fs.writeFileSync(marker,JSON.stringify({baseline:'aw-historical-corpus-v1',questionAssets:22,answerAssets:21,cached:true})+'\n');
  console.log(JSON.stringify({historicalFormalAssets:'CACHE_PRIMED',baseline:'aw-historical-corpus-v1'}));
}
