import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);const {manifest,location,verify}=require('../lib/year2-question-delivery.js');
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
export const cacheRoot=path.join(root,'node_modules','.cache','awenture-year2-question-delivery',manifest.commit);
export async function materialize(){
  for(const a of manifest.assets){const file=path.join(cacheRoot,a.path);let ready=false;if(fs.existsSync(file)){try{verify(fs.readFileSync(file),a);ready=true}catch(_){fs.rmSync(file)}}if(ready)continue;
    let bytes;for(let attempt=0;attempt<2;attempt++){try{const r=await fetch(location(a.path).url,{signal:AbortSignal.timeout(45000)});if(!r.ok)throw Error('HTTP '+r.status);bytes=Buffer.from(await r.arrayBuffer());verify(bytes,a);break}catch(e){if(attempt===1)throw e}}
    fs.mkdirSync(path.dirname(file),{recursive:true});const temporary=file+'.download';fs.writeFileSync(temporary,bytes);fs.renameSync(temporary,file);
  }
  return cacheRoot;
}
if(process.argv[1]===fileURLToPath(import.meta.url)){await materialize();console.log(JSON.stringify({year2QuestionDelivery:'SHA_VERIFIED',assets:manifest.assets.length,commit:manifest.commit,gitLfs:false}));}
