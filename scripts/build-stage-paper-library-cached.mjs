import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const cacheRoot=path.join(root,'node_modules','.cache','awenture-historical-corpus-v1','stage-papers-v4-allowlisted-remote');
const outRoot=path.join(root,'dist','stage-papers');
const proxyManifestPath=path.join(root,'api','paper-manifest.json');
const marker=path.join(cacheRoot,'.complete.json');
const force=process.env.AW_REBUILD_HISTORICAL_BASELINE==='1';
const delivery='github-source-proxy-v2-allowlist';
const required={
  'icas-y3':['Digital Technologies','English','Mathematics','Science','Spelling','Writing'],
  'icas-y4':['Digital Technologies','English','Mathematics','Science','Spelling','Writing'],
  'naplan-y3':['Language Conventions','Numeracy','Reading','Writing'],
  'oc-prep':['Reading','Mathematical Reasoning','Thinking Skills']
};

function copyDir(src,dst){fs.rmSync(dst,{recursive:true,force:true});fs.mkdirSync(path.dirname(dst),{recursive:true});fs.cpSync(src,dst,{recursive:true,force:true})}
function papers(c){return Object.values(c.stages||{}).flatMap(s=>s.papers||[])}
function writeProxyManifest(c){
  const entries={};for(const p of papers(c)){if(entries[p.id])throw new Error(`Duplicate stage paper id: ${p.id}`);entries[p.id]=p.sourcePath}
  fs.mkdirSync(path.dirname(proxyManifestPath),{recursive:true});
  fs.writeFileSync(proxyManifestPath,JSON.stringify({version:'aw-paper-proxy-manifest-v1',delivery,generatedAtBuild:true,papers:entries},null,2)+'\n');
  return Object.keys(entries).length;
}
function catalogHealthy(dir){
  const p=path.join(dir,'catalog.json');if(!fs.existsSync(p))return false;
  try{
    const c=JSON.parse(fs.readFileSync(p,'utf8'));
    if(c.release!=='6.18.2'||c.mode!=='stage-formal-lite-v2'||c.delivery!==delivery)return false;
    for(const [stage,subjects] of Object.entries(required)){
      const ps=c.stages?.[stage]?.papers||[],present=new Set(ps.map(x=>x.subject));
      if(!ps.length||subjects.some(s=>!present.has(s)))return false;
      for(const paper of ps){
        if(!paper.sourcePath?.startsWith('source/')||!paper.sourcePath.toLowerCase().endsWith('.pdf'))return false;
        if(paper.assetPath!==`/api/paper?id=${encodeURIComponent(paper.id)}`||paper.delivery!==delivery)return false;
      }
    }
    const deployedPdfs=fs.readdirSync(dir,{withFileTypes:true}).filter(e=>e.isFile()&&e.name.toLowerCase().endsWith('.pdf'));
    return deployedPdfs.length===0&&papers(c).length===187;
  }catch(_){return false}
}
function validCache(){
  if(!fs.existsSync(marker)||!catalogHealthy(cacheRoot))return false;
  try{const m=JSON.parse(fs.readFileSync(marker,'utf8'));return m.baseline==='aw-historical-corpus-v1'&&m.catalogVersion==='stage-formal-remote-v4'&&m.delivery===delivery}catch(_){return false}
}

let c;
if(!force&&validCache()){
  copyDir(cacheRoot,outRoot);fs.rmSync(path.join(outRoot,'.complete.json'),{force:true});
  c=JSON.parse(fs.readFileSync(path.join(outRoot,'catalog.json'),'utf8'));
  const allowlisted=writeProxyManifest(c);
  console.log(JSON.stringify({stagePaperLibrary:'CACHE_HIT',baseline:'aw-historical-corpus-v1',catalogVersion:'stage-formal-remote-v4',delivery,activated:c.summary.activated,pending:c.summary.pending,deployedPdfCopies:0,proxyAllowlist:allowlisted}));
}else{
  await import('./build-stage-paper-library.mjs');
  if(!catalogHealthy(outRoot))throw new Error('Stage formal allowlisted remote catalog failed required subject coverage/delivery validation');
  c=JSON.parse(fs.readFileSync(path.join(outRoot,'catalog.json'),'utf8'));
  const allowlisted=writeProxyManifest(c);
  copyDir(outRoot,cacheRoot);
  fs.writeFileSync(marker,JSON.stringify({baseline:'aw-historical-corpus-v1',catalogVersion:'stage-formal-remote-v4',delivery,activated:c.summary.activated,pending:c.summary.pending,sourcePdfs:c.summary.sourcePdfs,deployedPdfCopies:0,proxyAllowlist:allowlisted,cached:true})+'\n');
  console.log(JSON.stringify({stagePaperLibrary:'CACHE_PRIMED',baseline:'aw-historical-corpus-v1',catalogVersion:'stage-formal-remote-v4',delivery,activated:c.summary.activated,pending:c.summary.pending,deployedPdfCopies:0,proxyAllowlist:allowlisted}));
}
