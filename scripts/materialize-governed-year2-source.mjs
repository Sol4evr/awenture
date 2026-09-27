import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const baseline=JSON.parse(fs.readFileSync(path.join(root,'baseline','historical-corpus-v1.json'),'utf8'));
const cacheRoot=path.join(root,'node_modules','.cache',baseline.id,'governed-source','original-icas','year2');
const marker=path.join(cacheRoot,'.complete.json');

function sha256(bytes){return crypto.createHash('sha256').update(bytes).digest('hex')}
function encodePath(value){return value.split('/').map(encodeURIComponent).join('/')}
function inventory(){
  const output=execFileSync('git',['ls-tree','-r','-z','--name-only',baseline.sourceCommit,'--','source/original-icas/year2'],{cwd:root});
  const paths=output.toString('utf8').split('\0').filter(p=>p.toLowerCase().endsWith('.pdf'));
  if(paths.length!==baseline.year2RuntimePapers)throw new Error(`Governed Year 2 source inventory changed: ${paths.length}/${baseline.year2RuntimePapers}`);
  return paths;
}
function pointerFor(sourcePath){
  const text=execFileSync('git',['show',`${baseline.sourceCommit}:${sourcePath}`],{cwd:root,encoding:'utf8',maxBuffer:1024*1024});
  const oid=/^oid sha256:([a-f0-9]{64})$/m.exec(text)?.[1],size=Number(/^size (\d+)$/m.exec(text)?.[1]);
  if(!oid||!Number.isSafeInteger(size)||size<1)throw new Error(`Invalid pinned LFS identity: ${sourcePath}`);
  return {oid,size};
}
function targetFor(sourcePath){return path.join(cacheRoot,path.relative('source/original-icas/year2',sourcePath))}
function validFile(file,identity){
  if(!fs.existsSync(file)||fs.statSync(file).size!==identity.size)return false;
  return sha256(fs.readFileSync(file))===identity.oid;
}
function validCache(entries){
  if(!fs.existsSync(marker))return false;
  try{
    const value=JSON.parse(fs.readFileSync(marker,'utf8'));
    return value.baseline===baseline.id&&value.sourceCommit===baseline.sourceCommit&&value.files===entries.length&&entries.every(e=>validFile(targetFor(e.sourcePath),e));
  }catch(_){return false}
}
async function download(entry){
  const url=`https://media.githubusercontent.com/media/Sol4evr/awenture/${baseline.sourceCommit}/${encodePath(entry.sourcePath)}`;
  const response=await fetch(url,{headers:{Accept:'application/octet-stream','User-Agent':'AWenture-governed-source-materializer'},redirect:'follow',signal:AbortSignal.timeout(60000)});
  if(!response.ok)throw new Error(`Unable to materialize ${entry.sourcePath}: HTTP ${response.status}`);
  const announced=Number(response.headers.get('content-length')||0);
  if(announced&&announced!==entry.size)throw new Error(`Pinned source length mismatch: ${entry.sourcePath}`);
  const bytes=Buffer.from(await response.arrayBuffer());
  if(bytes.length!==entry.size||sha256(bytes)!==entry.oid)throw new Error(`Pinned source identity mismatch: ${entry.sourcePath}`);
  const target=targetFor(entry.sourcePath);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,bytes);
}

export async function materializeGovernedYear2Source(){
  const entries=inventory().map(sourcePath=>({sourcePath,...pointerFor(sourcePath)}));
  if(!validCache(entries)){
    fs.rmSync(cacheRoot,{recursive:true,force:true});fs.mkdirSync(cacheRoot,{recursive:true});
    for(const entry of entries)await download(entry);
    const bytes=entries.reduce((sum,e)=>sum+e.size,0);
    fs.writeFileSync(marker,JSON.stringify({baseline:baseline.id,sourceCommit:baseline.sourceCommit,files:entries.length,bytes,identitiesVerified:true})+'\n');
    console.log(JSON.stringify({historicalSource:'MATERIALIZED',baseline:baseline.id,files:entries.length,bytes,fullCorpusDownloaded:false}));
  }else console.log(JSON.stringify({historicalSource:'CACHE_HIT',baseline:baseline.id,files:entries.length,fullCorpusDownloaded:false}));
  return cacheRoot;
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))await materializeGovernedYear2Source();
