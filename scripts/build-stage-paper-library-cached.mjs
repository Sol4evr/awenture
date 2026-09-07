import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const cacheRoot=path.join(root,'node_modules','.cache','awenture-historical-corpus-v1','stage-papers-v3-metadata-only');
const outRoot=path.join(root,'dist','stage-papers');
const marker=path.join(cacheRoot,'.complete.json');
const force=process.env.AW_REBUILD_HISTORICAL_BASELINE==='1';
const delivery='github-source-proxy-v1';
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
    if(c.release!=='6.18.2'||c.mode!=='stage-formal-lite-v2'||c.delivery!==delivery)return false;
    for(const [stage,subjects] of Object.entries(required)){
      const papers=c.stages?.[stage]?.papers||[],present=new Set(papers.map(x=>x.subject));
      if(!papers.length||subjects.some(s=>!present.has(s)))return false;
      for(const paper of papers){
        if(!paper.sourcePath?.startsWith('source/')||!paper.sourcePath.toLowerCase().endsWith('.pdf'))return false;
        if(!String(paper.assetPath||'').startsWith('/api/paper?path='))return false;
      }
    }
    const deployedPdfs=fs.readdirSync(dir,{withFileTypes:true}).filter(e=>e.isFile()&&e.name.toLowerCase().endsWith('.pdf'));
    return deployedPdfs.length===0;
  }catch(_){return false}
}
function validCache(){
  if(!fs.existsSync(marker)||!catalogHealthy(cacheRoot))return false;
  try{const m=JSON.parse(fs.readFileSync(marker,'utf8'));return m.baseline==='aw-historical-corpus-v1'&&m.catalogVersion==='stage-formal-remote-v3'&&m.delivery===delivery}catch(_){return false}
}

if(!force&&validCache()){
  copyDir(cacheRoot,outRoot);fs.rmSync(path.join(outRoot,'.complete.json'),{force:true});
  const c=JSON.parse(fs.readFileSync(path.join(outRoot,'catalog.json'),'utf8'));
  console.log(JSON.stringify({stagePaperLibrary:'CACHE_HIT',baseline:'aw-historical-corpus-v1',catalogVersion:'stage-formal-remote-v3',delivery,activated:c.summary.activated,pending:c.summary.pending,deployedPdfCopies:0}));
}else{
  await import('./build-stage-paper-library.mjs');
  if(!catalogHealthy(outRoot))throw new Error('Stage formal remote catalog failed required subject coverage/delivery validation');
  const c=JSON.parse(fs.readFileSync(path.join(outRoot,'catalog.json'),'utf8'));
  copyDir(outRoot,cacheRoot);
  fs.writeFileSync(marker,JSON.stringify({baseline:'aw-historical-corpus-v1',catalogVersion:'stage-formal-remote-v3',delivery,activated:c.summary.activated,pending:c.summary.pending,sourcePdfs:c.summary.sourcePdfs,deployedPdfCopies:0,cached:true})+'\n');
  console.log(JSON.stringify({stagePaperLibrary:'CACHE_PRIMED',baseline:'aw-historical-corpus-v1',catalogVersion:'stage-formal-remote-v3',delivery,activated:c.summary.activated,pending:c.summary.pending,deployedPdfCopies:0}));
}
