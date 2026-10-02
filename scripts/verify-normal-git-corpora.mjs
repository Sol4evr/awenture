import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import historicalSource from '../lib/historical-source.js';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const index=JSON.parse(fs.readFileSync(path.join(root,'baseline/historical-corpus-v1-lfs-index.json'),'utf8'));
const materialize=process.argv.includes('--materialize');
const unique=[...new Map(index.objects.map(x=>[x.oid,x])).values()];
const verified=new Map();let next=0;
async function worker(){
 while(next<unique.length){
  const entry=unique[next++],source=historicalSource.sourceLocation(entry.path);
  const response=await fetch(source.url,{signal:AbortSignal.timeout(90000)});
  if(!response.ok)throw new Error(`Corpus download failed: ${entry.path} HTTP ${response.status}`);
  const bytes=Buffer.from(await response.arrayBuffer());
  if(bytes.length!==entry.size||crypto.createHash('sha256').update(bytes).digest('hex')!==entry.oid||bytes.subarray(0,5).toString()!=='%PDF-')throw new Error(`Corpus identity mismatch: ${entry.path}`);
  verified.set(entry.oid,true);
  if(materialize)for(const copy of index.objects.filter(x=>x.oid===entry.oid)){
   historicalSource.sourceLocation(copy.path);
   const target=path.join(root,copy.path);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,bytes);
  }
 }
}
await Promise.all(Array.from({length:4},worker));
if(verified.size!==565||index.objects.some(x=>!verified.has(x.oid)))throw new Error('Incomplete historical corpus verification');
console.log(JSON.stringify({normalGitCorpusVerification:'PASS',paths:602,uniqueObjects:565,gitLfsDownloads:0,materialized:materialize}));
