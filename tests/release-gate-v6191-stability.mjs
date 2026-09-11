import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const assert=(ok,msg)=>{if(!ok)throw new Error(msg)};

const pkg=JSON.parse(read('package.json'));
const lock=JSON.parse(read('package-lock.json'));
const startup=read('scripts/patch-v6.18.2.4-formal-paper-startup.mjs');
const parent=read('ui/skills-parent.js');
const patch619=read('scripts/patch-v6.19.0-skills-framework.mjs');
const app=read('app.js');
const index=read('index.html');

// Reproducible release metadata: package and root lock metadata must agree.
assert(pkg.version===lock.version,'package/package-lock release version drift');
assert(pkg.version===lock.packages?.['']?.version,'package/package-lock root package version drift');

// Build patch chain is ordered and each mutable release patch runs at most once.
const build=String(pkg.scripts?.build||'');
const patchNames=[...build.matchAll(/node scripts\/(?:patch|harden|finalize)-[^ &]+/g)].map(m=>m[0]);
assert(patchNames.length===new Set(patchNames).size,'duplicate mutable patch/finalizer in build chain');
const i6183=build.indexOf('patch-v6.18.3-verified-marking.mjs');
const i6190=build.indexOf('patch-v6.19.0-skills-framework.mjs');
assert(i6183>=0&&i6190>i6183,'v6.19 patch must execute after verified-marking patch');

// Regression root-cause guard: no timer fan-out or Home-triggered formal-test rescans.
assert(startup.includes('requestAnimationFrame'),'formal-paper enhancer must remain coalesced on animation frame');
assert(!/\[0\s*,\s*40\s*,\s*100\s*,\s*220\s*,\s*450\s*,\s*800\]/.test(startup),'multi-timeout accordion rescan fan-out reintroduced');
assert(!/data-a=[\\"']home[\\"']/.test(startup),'Home navigation must not trigger formal-test rescans');
assert(startup.includes('@media(hover:none) and (pointer:coarse)'),'touch capability contract missing');
const desktopRule=startup.lastIndexOf('.aw-running-exam .aw-zoom-controls{display:inline-flex!important');
const touchRule=startup.lastIndexOf('@media(hover:none) and (pointer:coarse)');
assert(touchRule>desktopRule,'touch viewer contract must remain after desktop parity rule');

// Parent skills must stay lifecycle-bound and must not introduce background polling/DOM observers.
assert(parent.includes("window.addEventListener('aw:parent-view-ready'"),'Parent skills lifecycle listener missing');
assert(parent.includes('requestAnimationFrame(mount)'),'Parent skills mount must remain frame-coalesced');
for(const forbidden of ['MutationObserver','setInterval(','setTimeout('])assert(!parent.includes(forbidden),`Parent skills background work forbidden: ${forbidden}`);
assert(parent.includes('parentLifecycleOnly:true'),'Parent-only lifecycle invariant missing');
assert(parent.includes('progressionEnabled:false'),'skills coverage must not enable progression');

// v6.19 remains an additive layer and cannot replace the core learner runtime.
for(const required of ['skills-framework.js','skills-mapping-v2.js','skills-parent.js'])assert(patch619.includes(required),`skills patch missing ${required}`);
assert(patch619.includes('dailyPracticeMix:\'unchanged\''),'Daily Practice preservation marker missing');

// Safari/PWA stability: do not silently introduce a service worker without a separately governed cache design.
const swNeedle='navigator.serviceWorker.register';
assert(!app.includes(swNeedle)&&!index.includes(swNeedle),'ungoverned service-worker registration introduced');

console.log(JSON.stringify({release:pkg.version,stabilityGate:'PASS',contracts:{metadataAligned:true,patchChainUnique:true,accordionScheduling:'COALESCED',touchViewer:'CAPABILITY_FIRST',parentLifecycle:'EVENT_BOUND',serviceWorker:'NOT_REGISTERED'}}));
