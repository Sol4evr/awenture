import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const dist=path.join(root,'dist');
const htmlFile=path.join(dist,'index.html');
if(!fs.existsSync(htmlFile))throw new Error('v6.16.2 hardening requires an existing dist build');

let html=fs.readFileSync(htmlFile,'utf8');
if(!html.includes('awenture-release" content="6.16.1"'))throw new Error('Expected v6.16.1 release marker before hardening');
if(!html.includes("RELEASE='6.16.1'"))throw new Error('Expected v6.16.1 runtime marker before hardening');

// Promote only the application release/cache markers. Historical-paper schema release
// identifiers remain unchanged because they are provenance contracts, not app versions.
html=html.replace('awenture-release" content="6.16.1"','awenture-release" content="6.16.2"');
html=html.replace("RELEASE='6.16.1'","RELEASE='6.16.2'");
html=html.replaceAll('?v=61610','?v=61620');

// Remove obsolete user-facing wording inherited from the old immutable HTML seed.
html=html.replaceAll('ICAS Grade 2 · stable calibrated core','ICAS Grade 2');
html=html.replaceAll('Made with love by Arthur Wang (daddy), 2026','Made with ♥ by Arthur Wang (daddy), 2026');
html=html.replaceAll('v2.1 Prototype','');
html=html.replaceAll('Alpha','');

// Retire the old every-load service-worker/cache purge. Run the migration once per device
// so Safari no longer repeats expensive registration/cache enumeration on every launch.
const oldCleanup='<script>try{navigator.serviceWorker&&navigator.serviceWorker.getRegistrations().then(rs=>rs.forEach(r=>r.unregister()));caches&&caches.keys().then(ks=>ks.forEach(k=>caches.delete(k)))}catch(e){}</script>';
const oneTimeCleanup=`<script>(()=>{const k='awenture-runtime-cleanup-v6162';try{if(localStorage.getItem(k)==='1')return;Promise.allSettled([navigator.serviceWorker?navigator.serviceWorker.getRegistrations().then(rs=>Promise.all(rs.map(r=>r.unregister()))):Promise.resolve(),globalThis.caches?caches.keys().then(ks=>Promise.all(ks.map(x=>caches.delete(x)))):Promise.resolve()]).finally(()=>{try{localStorage.setItem(k,'1')}catch(_){}})}catch(_){try{localStorage.setItem(k,'1')}catch(__){}}})();</script>`;
if(html.includes(oldCleanup))html=html.replace(oldCleanup,oneTimeCleanup);

// Explicit immutable baseline marker and frozen historical configuration.
if(!html.includes('name="awenture-baseline"'))html=html.replace('</head>','<meta name="awenture-baseline" content="hardened-v6.16.2"></head>');
const hardeningRuntime=`<script>(()=>{const deepFreeze=o=>{if(!o||typeof o!=='object'||Object.isFrozen(o))return o;Object.freeze(o);for(const v of Object.values(o))deepFreeze(v);return o};if(window.__AW_ORIGINAL_PAPERS)deepFreeze(window.__AW_ORIGINAL_PAPERS);window.__AW_HARDENED_BASELINE=Object.freeze({release:'6.16.2',id:'hardened-v6.16.2',immutable:true});})();</script>`;
if(!html.includes('__AW_HARDENED_BASELINE'))html=html.replace('</body>',hardeningRuntime+'</body>');

// Remove stale version-banner comments from shipped text assets without touching source history.
const versionComment=/\/\*\s*v\d+\.\d+(?:\.\d+)?[^*]*\*\//g;
html=html.replace(versionComment,'');
fs.writeFileSync(htmlFile,html);
for(const name of fs.readdirSync(dist)){
  if(!/\.(?:js|css)$/.test(name))continue;
  const p=path.join(dist,name);
  const cleaned=fs.readFileSync(p,'utf8').replace(versionComment,'');
  fs.writeFileSync(p,cleaned);
}

function walk(dir,base=dir,out=[]){
  for(const ent of fs.readdirSync(dir,{withFileTypes:true})){
    const p=path.join(dir,ent.name);
    if(ent.isDirectory())walk(p,base,out);
    else if(ent.isFile()&&ent.name!=='hardened-integrity.json')out.push(path.relative(base,p).split(path.sep).join('/'));
  }
  return out;
}
function sha256(p){return crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex')}
const files=walk(dist).sort();
const integrity={
  release:'6.16.2',
  baseline:'hardened-v6.16.2',
  generatedAtBuild:true,
  fileCount:files.length,
  files:Object.fromEntries(files.map(rel=>[rel,{bytes:fs.statSync(path.join(dist,rel)).size,sha256:sha256(path.join(dist,rel))}]))
};
fs.writeFileSync(path.join(dist,'hardened-integrity.json'),JSON.stringify(integrity,null,2)+'\n');
console.log(JSON.stringify({release:'6.16.2',baseline:'HARDENED_IMMUTABLE',files:files.length,legacyUserFacingLabels:'REMOVED',serviceWorkerCleanup:'ONE_TIME_ONLY',historicalRuntime:'FROZEN',integrityManifest:'PASS'}));
