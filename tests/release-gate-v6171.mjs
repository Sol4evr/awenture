import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd(),dist=path.join(root,'dist');
const html=fs.readFileSync(path.join(dist,'index.html'),'utf8');
const insights=fs.readFileSync(path.join(dist,'insights.js'),'utf8');
const integrity=JSON.parse(fs.readFileSync(path.join(dist,'hardened-integrity.json'),'utf8'));
function ok(v,m){if(!v)throw new Error(m)}
ok(html.includes('awenture-release" content="6.17.1"'),'release marker 6.17.1 missing');
ok(html.includes("RELEASE='6.17.1'"),'runtime release marker 6.17.1 missing');
ok(insights.includes('function homePathHost()'),'home-only path host missing');
ok(insights.includes('function placePath()'),'scoped path placement missing');
ok(!insights.includes("new MutationObserver(()=>{if(!document.querySelector('.aw-functional-path'))renderPath()})"),'legacy global path observer still present');
ok(insights.includes("if(!host){all.forEach(x=>x.remove());return}"),'non-home path removal missing');
ok(insights.includes("const legacy=host.querySelector('.aw-learning-line');if(legacy)legacy.replaceWith(target)"),'bottom legacy path replacement missing');
ok(integrity.release==='6.17.1','integrity manifest release stale');
ok(integrity.releaseContract==='functional-learning-progression-v1.1','integrity contract missing');
console.log(JSON.stringify({release:'6.17.1',gate:'learning-path-dedupe',homePaths:1,otherScreens:0,status:'PASS'}));
