import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const cacheRoot=path.join(root,'node_modules','.cache','awenture-historical-corpus-v1','stage-papers-v2');
const outRoot=path.join(root,'dist','stage-papers');
const marker=path.join(cacheRoot,'.complete.json');
const force=process.env.AW_REBUILD_HISTORICAL_BASELINE==='1';
const required={
  'icas-y3':['Digital Technologies','English','Mathematics','Science','Spelling','Writing'],
  'icas-y4':['Digital Technologies','English','Mathematics','Science','Spelling','Writing'],
  'naplan-y3':['Language Conventions','Numeracy','Reading','Writing'],
  'oc-prep':['Reading','Mathematical Reasoning','Thinking Skills']
};

function copyDir(src,dst){fs.rmSync(dst,{recursive:true,force:true});fs.mkdirSync(path.dirname(dst),{recursive:true});fs.cpSync(src,dst,{recursive:true,force:true})}
function catalogHealthy(dir){
  const p=path.join(dir,'catalog.json');if(!fs.existsSync(p))return false;
  try{
    const c=JSON.parse(fs.readFileSync(p,'utf8'));
    if(c.release!=='6.18.2'||c.mode!=='stage-formal-lite-v2')return false;
    for(const [stage,subjects] of Object.entries(required)){
      const papers=c.stages?.[stage]?.papers||[],present=new Set(papers.map(x=>x.subject));
      if(!papers.length||subjects.some(s=>!present.has(s)))return false;
      for(const paper of papers){
        const asset=path.join(dir,path.basename(paper.assetPath));
        if(!fs.existsSync(asset))return false;
      }
    }
    return true;
  }catch(_){return false}
}
function validCache(){
  if(!fs.existsSync(marker)||!catalogHealthy(cacheRoot))return false;
  try{const m=JSON.parse(fs.readFileSync(marker,'utf8'));return m.baseline==='aw-historical-corpus-v1'&&m.catalogVersion==='stage-formal-lite-v2'}catch(_){return false}
}

if(!force&&validCache()){
  copyDir(cacheRoot,outRoot);fs.rmSync(path.join(outRoot,'.complete.json'),{force:true});
  const c=JSON.parse(fs.readFileSync(path.join(outRoot,'catalog.json'),'utf8'));
  console.log(JSON.stringify({stagePaperLibrary:'CACHE_HIT',baseline:'aw-historical-corpus-v1',catalogVersion:'stage-formal-lite-v2',activated:c.summary.activated,pending:c.summary.pending}));
}else{
  await import('./build-stage-paper-library.mjs');
  if(!catalogHealthy(outRoot))throw new Error('Stage formal catalog v2 failed required subject coverage validation');
  const c=JSON.parse(fs.readFileSync(path.join(outRoot,'catalog.json'),'utf8'));
  copyDir(outRoot,cacheRoot);
  fs.writeFileSync(marker,JSON.stringify({baseline:'aw-historical-corpus-v1',catalogVersion:'stage-formal-lite-v2',activated:c.summary.activated,pending:c.summary.pending,sourcePdfs:c.summary.sourcePdfs,cached:true})+'\n');
  console.log(JSON.stringify({stagePaperLibrary:'CACHE_PRIMED',baseline:'aw-historical-corpus-v1',catalogVersion:'stage-formal-lite-v2',activated:c.summary.activated,pending:c.summary.pending}));
}
