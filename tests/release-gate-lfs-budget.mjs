import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const baseline=JSON.parse(read('baseline/historical-corpus-v1.json'));
const index=JSON.parse(read(baseline.lfsIndex));
const qualityPath=path.join(root,'.github/workflows/quality-gate.yml');
const deepPath=path.join(root,'.github/workflows/historical-corpus-deep-audit.yml');
const quality=fs.existsSync(qualityPath)?fs.readFileSync(qualityPath,'utf8'):null;
const deep=fs.existsSync(deepPath)?fs.readFileSync(deepPath,'utf8'):null;
const api=read('api/paper.js');
const {sourceLocation,delivery}=await import('../lib/historical-source.js').then(x=>x.default);
for(const entry of index.objects){const location=sourceLocation(entry.path);if(location.sha256!==entry.oid||location.size!==entry.size||!location.url.startsWith('https://raw.githubusercontent.com/Sol4evr/awenture-corpus-')||!/^[a-f0-9]{40}$/.test(location.commit))throw new Error('Unpinned normal-Git source identity');}
const readable=sourceLocation('source/original-icas/year4/English yr 4/2019 ICAS English Paper B.pdf').readable;
if(!readable||readable.emptyPasswordOnly!==true||readable.pixelIdenticalPages!==40||readable.sourceSha256!=='109af09fb98f7f36678e98907519f07f27aa399a3ce8791839c01cd3dfa1ae93')throw new Error('Governed encrypted-source readability contract missing');
for(const unsafe of ['source/../private.pdf','source/unknown.pdf','https://example.org/file.pdf']){let denied=false;try{sourceLocation(unsafe)}catch(_){denied=true}if(!denied)throw new Error('Unknown source must fail closed');}
const materializer=read('scripts/materialize-governed-year2-source.mjs');
const packageJson=read('package.json');
const lfsSignature='version https://git-lfs.github.com/spec/v1';
function activeLfsPointers(dir,out=[]){
  for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
    if(entry.name==='.git'||entry.name==='node_modules'||entry.name==='dist')continue;
    const abs=path.join(dir,entry.name);
    if(entry.isDirectory())activeLfsPointers(abs,out);
    else if(entry.isFile()&&fs.statSync(abs).size<1024){
      const head=fs.readFileSync(abs,'utf8').slice(0,lfsSignature.length);
      if(head===lfsSignature)out.push(path.relative(root,abs));
    }
  }
  return out;
}

if((quality===null)!==(deep===null))throw new Error('CI workflow policy files must be present or source-package-omitted together');
if(quality!==null){
  if(quality.includes('lfs: true')||/git lfs (pull|fetch)/.test(quality))throw new Error('Ordinary quality gate must never download the full LFS corpus');
  if(!quality.includes('release-gate-lfs-budget.mjs')||!quality.includes('node_modules/.cache/awenture-historical-corpus-v1'))throw new Error('Ordinary quality gate lacks LFS architecture/cache protection');
  if(!/workflow_dispatch:/.test(deep)||/pull_request:|push:/.test(deep)||deep.includes('lfs: true')||!deep.includes('verify-normal-git-corpora.mjs --materialize'))throw new Error('Deep corpus audit must be manual and SHA-pinned');
  if(!deep.includes('allow_full_corpus_download')||!deep.includes("inputs.allow_full_corpus_download == true"))throw new Error('Deep corpus audit must require explicit full-corpus download approval');
}
if(baseline.policy?.ordinaryBuildsMayDownloadFullLfsCorpus!==false||baseline.policy?.runtimeSourceMustUsePinnedCommit!==true)throw new Error('Historical LFS policy is not fail-closed');
if(baseline.policy?.ordinaryBuildsUseShaPinnedReviewedGovernance!==true)throw new Error('Ordinary release must use SHA-pinned reviewed governance');
for(const spec of Object.values(baseline.reviewedGovernance||{})){
  const actual=crypto.createHash('sha256').update(fs.readFileSync(path.join(root,spec.path))).digest('hex');
  if(actual!==spec.sha256)throw new Error(`Reviewed governance artifact identity mismatch: ${spec.path}`);
}
for(const forbidden of ['auto-verify-stage-paper-boundaries.mjs','auto-verify-stage-paper-question-counts.mjs','apply-v6.18.2-reviewed-source-count-evidence.mjs']){
  if(packageJson.match(new RegExp(`\\"(?:build|test:release)\\"[^\\n]*${forbidden.replaceAll('.','\\.')}`)))throw new Error(`Ordinary release still replays source-binary diagnostic: ${forbidden}`);
}
if(!api.includes("sourceLocation")||api.includes('process.env.VERCEL_GIT_COMMIT_SHA')||api.includes('AW_GITHUB_SOURCE_REF')||api.includes('media.githubusercontent.com')||materializer.includes('media.githubusercontent.com'))throw new Error('Paper runtime must use the immutable corpus source commit');
if(!materializer.includes('entries.length')||!materializer.includes('identitiesVerified:true')||!materializer.includes('fullCorpusDownloaded:false'))throw new Error('Selective source materializer lacks identity/budget controls');

if(index.sourceCommit!==baseline.sourceCommit||index.sourceTreeSha!==baseline.sourceTreeSha||index.objects?.length!==baseline.sourcePdfCount)throw new Error('Pinned corpus index identity/count mismatch');
if(Math.max(...index.objects.map(x=>x.size))>=50*1024*1024)throw new Error('Normal-Git corpus migration file-size contract exceeded');
const year2=index.objects.filter(x=>x.path.startsWith('source/original-icas/year2/'));
if(year2.length!==baseline.year2RuntimePapers)throw new Error(`Selective runtime inventory mismatch: ${year2.length}/${baseline.year2RuntimePapers}`);
const selectedBytes=year2.reduce((sum,x)=>sum+x.size,0);
if(selectedBytes>140*1024*1024)throw new Error(`Ordinary governed source ceiling exceeded: ${selectedBytes}`);
if(/filter\s*=\s*lfs|filter=lfs/.test(read('.gitattributes')))throw new Error('Active release tree still contains a Git LFS tracking rule');
const activeLfs=activeLfsPointers(root);
if(activeLfs.length)throw new Error(`Active release tree still contains Git LFS pointer files: ${activeLfs.length}`);

console.log(JSON.stringify({release:'6.19.3',lfsBudgetGate:'PASS',activeLfsObjects:0,pinnedCorpusPdfs:index.objects.length,pinnedUniqueObjects:index.uniqueObjects,largestSourceMiB:Number((Math.max(...index.objects.map(x=>x.size))/1048576).toFixed(2)),ordinarySourcePdfs:year2.length,ordinarySourceMiB:Number((selectedBytes/1048576).toFixed(2)),ordinaryGovernance:'SHA_PINNED_BINARY_FREE',workflowPolicy:quality===null?'SOURCE_PACKAGE_OMITTED':'VALIDATED',fullCorpusCheckout:'NORMAL_GIT_MANUAL_ONLY',runtimeSource:'IMMUTABLE_SHA'}));
