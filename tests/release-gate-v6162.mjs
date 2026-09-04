import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const fail=m=>{throw new Error(m)};
const html=fs.readFileSync('dist/index.html','utf8');
const formal=fs.readFileSync('dist/formal-tests.js','utf8');
const lock=JSON.parse(fs.readFileSync('baseline/hardened-v6.16.2.json','utf8'));
const integrity=JSON.parse(fs.readFileSync('dist/hardened-integrity.json','utf8'));
const runtime=JSON.parse(fs.readFileSync('bank/v6.13.1-original-paper-runtime.json','utf8'));

if(lock.release!=='6.16.2'||lock.status!=='immutable-release-baseline')fail('immutable baseline contract missing');
if(!html.includes('awenture-release" content="6.16.2"'))fail('release marker is not v6.16.2');
if(!html.includes('awenture-baseline" content="hardened-v6.16.2"'))fail('hardened baseline meta missing');
if(!html.includes("RELEASE='6.16.2'"))fail('runtime release is not v6.16.2');
if(!html.includes('__AW_HARDENED_BASELINE')||!html.includes('immutable:true'))fail('runtime hardened marker missing');
if(!html.includes('deepFreeze')||!html.includes('__AW_ORIGINAL_PAPERS'))fail('historical-paper config is not frozen');
if(html.includes('stable calibrated core')||html.includes('v2.1 Prototype')||html.includes('Alpha'))fail('legacy user-facing label remains');
if(html.includes('navigator.serviceWorker&&navigator.serviceWorker.getRegistrations().then(rs=>rs.forEach'))fail('legacy every-load service-worker cleanup remains');
if(!html.includes('awenture-runtime-cleanup-v6162'))fail('one-time runtime cleanup guard missing');
if(!html.includes('?v=61620'))fail('v6.16.2 cache-buster missing');
if(html.includes('?v=61610'))fail('stale v6.16.1 cache-buster remains');

const required=['premium.css','practice-flow.css','home-insights.css','challenge.css','formal-tests.css','premium.js','insights.js','challenge.js','formal-tests.js','dynamic-bank.js','brand.js','v615-parent.js'];
for(const f of required)if(!fs.existsSync(path.join('dist',f)))fail('missing runtime asset '+f);
for(const f of required){
  const needle=f.endsWith('.css')?`href="/${f}?v=61620"`:`src="/${f}?v=61620"`;
  if((html.match(new RegExp(needle.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),'g'))||[]).length!==1)fail('runtime asset is duplicated or missing in HTML: '+f);
}

const spelling=runtime.papers.find(p=>p.subject==='Spelling'&&p.year===2016);
if(!spelling||runtime.conditions?.Spelling?.questions!==15||runtime.conditions?.Spelling?.minutes!==25)fail('Spelling runtime contract missing');
if(spelling.questionNumberStart!==16||spelling.answers?.length!==15||spelling.scoring!=='verified')fail('Spelling Section B marking contract invalid');
if(!formal.includes("const SUBJECTS=['English','Mathematics','Science','Spelling']"))fail('formal subject list drifted');

for(const id of lock.quarantinedVisualIds||[])if(!html.includes(`'${id}'`)&&!html.includes(`"${id}"`))fail('quarantined visual id missing from runtime guard: '+id);
if(!html.includes("out.slice(0,15)"))fail('Daily Practice no longer hard-caps at 15');
if(!html.includes("out.filter(x=>x.subject==='Spelling').length===3"))fail('Daily Practice spelling mix drifted');

if(integrity.release!=='6.16.2'||integrity.baseline!=='hardened-v6.16.2')fail('dist integrity manifest has wrong release');
const sha=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
let verified=0;
for(const [rel,meta] of Object.entries(integrity.files||{})){
  const p=path.join('dist',rel);
  if(!fs.existsSync(p))fail('integrity file missing: '+rel);
  if(fs.statSync(p).size!==meta.bytes)fail('integrity byte mismatch: '+rel);
  if(sha(p)!==meta.sha256)fail('integrity sha mismatch: '+rel);
  verified++;
}
if(verified!==integrity.fileCount||verified<20)fail('integrity manifest coverage unexpectedly low');

console.log(JSON.stringify({release:'6.16.2',baseline:'HARDENED_IMMUTABLE',legacyLabels:'ABSENT',runtimeAssets:'UNIQUE',historicalConfig:'FROZEN',oneTimeCleanup:'PASS',integrityFiles:verified,dailyPractice:'15_QUESTIONS',spelling2016SectionB:'PASS'}));
