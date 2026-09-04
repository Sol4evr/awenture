import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const dist=path.join(root,'dist');
const htmlFile=path.join(dist,'index.html');
if(!fs.existsSync(htmlFile))throw new Error('v6.17.2 finalization requires an existing dist build');
const html=fs.readFileSync(htmlFile,'utf8');
if(!html.includes('awenture-release" content="6.17.2"'))throw new Error('Expected v6.17.2 release marker before finalization');
function walk(dir,base=dir,out=[]){for(const ent of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,ent.name);if(ent.isDirectory())walk(p,base,out);else if(ent.isFile()&&ent.name!=='hardened-integrity.json')out.push(path.relative(base,p).split(path.sep).join('/'))}return out}
function sha256(p){return crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex')}
const files=walk(dist).sort();
const integrity={release:'6.17.2',baseline:'hardened-v6.16.2',releaseContract:'functional-learning-progression-v1.2',generatedAtBuild:true,fileCount:files.length,files:Object.fromEntries(files.map(rel=>[rel,{bytes:fs.statSync(path.join(dist,rel)).size,sha256:sha256(path.join(dist,rel))}]))};
fs.writeFileSync(path.join(dist,'hardened-integrity.json'),JSON.stringify(integrity,null,2)+'\n');
console.log(JSON.stringify({release:'6.17.2',feature:'learning-path-line-locks',files:files.length,integrityManifest:'PASS'}));
