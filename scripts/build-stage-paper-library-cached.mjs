import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const cacheRoot=path.join(root,'node_modules','.cache','awenture-historical-corpus-v1','stage-papers');
const outRoot=path.join(root,'dist','stage-papers');
const marker=path.join(cacheRoot,'.complete.json');
const force=process.env.AW_REBUILD_HISTORICAL_BASELINE==='1';

function copyDir(src,dst){fs.rmSync(dst,{recursive:true,force:true});fs.mkdirSync(path.dirname(dst),{recursive:true});fs.cpSync(src,dst,{recursive:true,force:true})}
function validCache(){
  if(!fs.existsSync(marker))return false;
  try{const m=JSON.parse(fs.readFileSync(marker,'utf8'));return m.baseline==='aw-historical-corpus-v1'&&m.activated===58&&m.pending===210}catch(_){return false}
}

if(!force&&validCache()){
  copyDir(cacheRoot,outRoot);
  fs.rmSync(path.join(outRoot,'.complete.json'),{force:true});
  console.log(JSON.stringify({stagePaperLibrary:'CACHE_HIT',baseline:'aw-historical-corpus-v1',activated:58,pending:210}));
}else{
  await import('./build-stage-paper-library.mjs');
  const catalog=JSON.parse(fs.readFileSync(path.join(outRoot,'catalog.json'),'utf8'));
  if(catalog.summary.activated!==58||catalog.summary.pending!==210||catalog.summary.sourcePdfs!==602)throw new Error('Historical corpus v1 stage-library inventory does not match locked baseline');
  copyDir(outRoot,cacheRoot);
  fs.writeFileSync(marker,JSON.stringify({baseline:'aw-historical-corpus-v1',activated:58,pending:210,sourcePdfs:602,cached:true})+'\n');
  console.log(JSON.stringify({stagePaperLibrary:'CACHE_PRIMED',baseline:'aw-historical-corpus-v1'}));
}
