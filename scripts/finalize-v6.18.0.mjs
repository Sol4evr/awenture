import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const dist=path.join(root,'dist');
const htmlFile=path.join(dist,'index.html');
if(!fs.existsSync(htmlFile))throw new Error('v6.18.0 finalization requires an existing dist build');
const html=fs.readFileSync(htmlFile,'utf8');
if(!html.includes('awenture-release" content="6.18.0"'))throw new Error('Expected v6.18.0 release marker before finalization');
const catalogFile=path.join(dist,'stage-papers','catalog.json');
if(!fs.existsSync(catalogFile))throw new Error('Missing stage-paper catalog');
const catalog=JSON.parse(fs.readFileSync(catalogFile,'utf8'));
const legacy=catalog.release==='6.18.0'&&catalog.mode==='stage-linked-source-review';
const upgraded=catalog.release==='6.18.2'&&catalog.mode==='stage-formal-lite-v2';
if(!legacy&&!upgraded)throw new Error('Invalid stage-paper catalog contract');
function walk(dir,base=dir,out=[]){for(const ent of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,ent.name);if(ent.isDirectory())walk(p,base,out);else if(ent.isFile()&&ent.name!=='hardened-integrity.json')out.push(path.relative(base,p).split(path.sep).join('/'))}return out}
function sha256(p){return crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex')}
const files=walk(dist).sort();
const integrity={release:'6.18.0',baseline:'hardened-v6.16.2',releaseContract:upgraded?'stage-formal-lite-v2-through-v6180-checkpoint':'stage-linked-historical-paper-library-v1',generatedAtBuild:true,fileCount:files.length,files:Object.fromEntries(files.map(rel=>[rel,{bytes:fs.statSync(path.join(dist,rel)).size,sha256:sha256(path.join(dist,rel))}]))};
fs.writeFileSync(path.join(dist,'hardened-integrity.json'),JSON.stringify(integrity,null,2)+'\n');
console.log(JSON.stringify({release:'6.18.0',feature:'stage-linked-historical-paper-library',catalogMode:catalog.mode,activated:catalog.summary.activated,pending:catalog.summary.pending,files:files.length,integrityManifest:'PASS'}));
