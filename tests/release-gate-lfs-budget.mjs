import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const baseline=JSON.parse(read('baseline/historical-corpus-v1.json'));
const index=JSON.parse(read(baseline.lfsIndex));
const quality=read('.github/workflows/quality-gate.yml');
const deep=read('.github/workflows/historical-corpus-deep-audit.yml');
const api=read('api/paper.js');
const materializer=read('scripts/materialize-governed-year2-source.mjs');

if(quality.includes('lfs: true')||/git lfs (pull|fetch)/.test(quality))throw new Error('Ordinary quality gate must never download the full LFS corpus');
if(!quality.includes('release-gate-lfs-budget.mjs')||!quality.includes('node_modules/.cache/awenture-historical-corpus-v1'))throw new Error('Ordinary quality gate lacks LFS architecture/cache protection');
if(!/workflow_dispatch:/.test(deep)||/pull_request:|push:/.test(deep)||!deep.includes('lfs: true')||!deep.includes(baseline.sourceCommit))throw new Error('Deep corpus audit must be manual and SHA-pinned');
if(!deep.includes('allow_lfs_bandwidth')||!deep.includes("inputs.allow_lfs_bandwidth == true"))throw new Error('Deep corpus audit must require explicit LFS bandwidth approval');
if(baseline.policy?.ordinaryBuildsMayDownloadFullLfsCorpus!==false||baseline.policy?.runtimeSourceMustUsePinnedCommit!==true)throw new Error('Historical LFS policy is not fail-closed');
if(!api.includes("historicalBaseline.sourceCommit")||api.includes('process.env.VERCEL_GIT_COMMIT_SHA'))throw new Error('Paper runtime must use the immutable corpus source commit');
if(!materializer.includes('entries.length')||!materializer.includes('identitiesVerified:true')||!materializer.includes('fullCorpusDownloaded:false'))throw new Error('Selective source materializer lacks identity/budget controls');

if(index.sourceCommit!==baseline.sourceCommit||index.sourceTreeSha!==baseline.sourceTreeSha||index.objects?.length!==baseline.sourcePdfCount)throw new Error('Pinned corpus index identity/count mismatch');
const year2=index.objects.filter(x=>x.path.startsWith('source/original-icas/year2/'));
if(year2.length!==baseline.year2RuntimePapers)throw new Error(`Selective runtime inventory mismatch: ${year2.length}/${baseline.year2RuntimePapers}`);
const selectedBytes=year2.reduce((sum,x)=>sum+x.size,0);
if(selectedBytes>140*1024*1024)throw new Error(`Ordinary governed source ceiling exceeded: ${selectedBytes}`);
const activeLfs=execFileSync('git',['lfs','ls-files','-n'],{cwd:root,encoding:'utf8'}).trim();
if(activeLfs)throw new Error(`Active release tree still contains Git LFS objects: ${activeLfs.split('\n').length}`);

console.log(JSON.stringify({release:'6.19.3',lfsBudgetGate:'PASS',activeLfsObjects:0,pinnedCorpusPdfs:index.objects.length,pinnedUniqueObjects:index.uniqueObjects,ordinarySourcePdfs:year2.length,ordinarySourceMiB:Number((selectedBytes/1048576).toFixed(2)),fullCorpusCheckout:'MANUAL_ONLY',runtimeSource:'IMMUTABLE_SHA'}));
