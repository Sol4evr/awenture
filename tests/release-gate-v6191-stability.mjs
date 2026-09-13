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
const finalize6191=read('scripts/finalize-v6.19.1-stability.mjs');
const app=read('app.js');
const index=read('index.html');
const invariants=JSON.parse(read('quality/production-invariants-v1.json'));

// Reproducible release metadata: package and root lock metadata must agree.
assert(pkg.version===lock.version,'package/package-lock release version drift');
assert(pkg.version===lock.packages?.['']?.version,'package/package-lock root package version drift');
assert(invariants.release===pkg.version,'production invariants release drift');
assert(invariants.productionBaseline?.release==='6.18.3','immutable production baseline release drift');
assert(invariants.productionBaseline?.gitSha==='fa42a56fd2d0ec08fbbedf3e711727b2b56201df','immutable production baseline SHA drift');
assert(invariants.dailyPractice?.questionCount===15,'Daily Practice invariant must remain 15');
assert(JSON.stringify(invariants.dailyPractice?.subjectMix)===JSON.stringify({English:4,Mathematics:4,Science:4,Spelling:3}),'Daily Practice subject mix drift');
assert(JSON.stringify(invariants.dailyPractice?.quarantinedVisualIds)===JSON.stringify(['M09','M18','M19','M23','M26','M31']),'visual quarantine invariant drift');
assert(invariants.historicalPapers?.learnerModuleCount===21&&invariants.historicalPapers?.isolatedFromDailyPractice===true,'historical-paper invariant drift');
assert(invariants.formalPaperGovernance?.strictlyVerified===29&&invariants.formalPaperGovernance?.governedRubricExceptions===1&&invariants.formalPaperGovernance?.reviewed===30,'formal marking governance drift');
assert(invariants.laterStageAccounting?.strictlyVerified===184&&invariants.laterStageAccounting?.governedResidualEntries===3&&invariants.laterStageAccounting?.accounted===187,'later-stage accounting invariant drift');
assert(invariants.delivery?.maxDeploymentMiB===200,'deployment ceiling must remain 200 MiB');
assert(invariants.skillsFramework?.progressionEnabledByTaxonomy===false,'taxonomy must not enable progression');

// Build patch chain is ordered and each mutable release patch runs at most once.
const build=String(pkg.scripts?.build||'');
const patchNames=[...build.matchAll(/node scripts\/(?:patch|harden|finalize)-[^ &]+/g)].map(m=>m[0]);
assert(patchNames.length===new Set(patchNames).size,'duplicate mutable patch/finalizer in build chain');
const i6183=build.indexOf('patch-v6.18.3-verified-marking.mjs');
const i6190=build.indexOf('patch-v6.19.0-skills-framework.mjs');
assert(i6183>=0&&i6190>i6183,'v6.19 patch must execute after verified-marking patch');

// Release ownership: a stability release cannot rewrite an earlier release patch.
assert(patch619.includes("release:'6.19.0'"),'v6.19.0 patch release ownership changed');
assert(patch619.includes("content=\\\"6.19.0\\\"" )||patch619.includes('content="6.19.0"'),'v6.19.0 patch must still stamp 6.19.0');
assert(!patch619.includes("release:'6.19.1'"),'v6.19.1 must not be stamped by the v6.19.0 patch');
const postbuild=String(pkg.scripts?.postbuild||'');
assert(postbuild.startsWith('node scripts/finalize-v6.19.1-stability.mjs'),'v6.19.1 must be finalized in its own postbuild step');
assert(postbuild.includes('node scripts/audit-patch-ownership.mjs'),'postbuild patch ownership audit missing');
assert(postbuild.includes('node scripts/check-deployment-size.mjs'),'postbuild deployment size governance missing');
assert(finalize6191.includes("parentRelease:'6.19.0'"),'v6.19.1 finalizer parent release contract missing');
assert(finalize6191.includes("runtimeFeatureDelta:'none'"),'stability-only release contract missing');
const releaseScript=String(pkg.scripts?.['test:release']||'');
assert(releaseScript.includes('patch-v6.19.0-skills-framework.mjs')&&releaseScript.includes('finalize-v6.19.1-stability.mjs'),'release test must exercise both v6.19.0 and v6.19.1 ownership steps');
assert(releaseScript.indexOf('finalize-v6.19.1-stability.mjs')>releaseScript.indexOf('release-gate-v6190-skills-framework.mjs'),'v6.19.1 finalizer must run only after the v6.19.0 gate');

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
assert(!parent.includes('class="aw-subject-panel aw-skills-subject"'),'skills coverage must not share the legacy Parent accordion ownership class');

// v6.19 remains an additive layer and cannot replace the core learner runtime.
for(const required of ['skills-framework.js','skills-mapping-v2.js','skills-parent.js'])assert(patch619.includes(required),`skills patch missing ${required}`);
assert(patch619.includes("dailyPracticeMix:'unchanged'"),'Daily Practice preservation marker missing');

// Safari/PWA stability: do not silently introduce a service worker without a separately governed cache design.
const swNeedle='navigator.serviceWorker.register';
assert(!app.includes(swNeedle)&&!index.includes(swNeedle),'ungoverned service-worker registration introduced');

console.log(JSON.stringify({release:pkg.version,stabilityGate:'PASS',contracts:{metadataAligned:true,patchChainUnique:true,releaseOwnership:'ISOLATED',accordionScheduling:'COALESCED',touchViewer:'CAPABILITY_FIRST',parentLifecycle:'EVENT_BOUND',serviceWorker:'NOT_REGISTERED'}}));
