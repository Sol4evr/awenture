import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const manifestPath=path.join(root,'baseline','historical-corpus-v1.json');
const manifest=JSON.parse(fs.readFileSync(manifestPath,'utf8'));
if(manifest.id!=='aw-historical-corpus-v1'||manifest.locked!==true)throw new Error('Historical corpus baseline v1 is not locked');
if(!/^[a-f0-9]{40}$/.test(manifest.sourceCommit||''))throw new Error('Historical corpus source commit is not an immutable SHA');
const index=JSON.parse(fs.readFileSync(path.join(root,manifest.lfsIndex),'utf8'));
if(index.version!=='aw-historical-lfs-index-v1'||index.sourceCommit!==manifest.sourceCommit||index.sourceTreeSha!==manifest.sourceTreeSha)throw new Error('Historical LFS index identity does not match the locked baseline');
if(index.paths!==manifest.sourcePdfCount||index.objects?.length!==manifest.sourcePdfCount)throw new Error(`Historical LFS index changed: ${index.objects?.length}/${manifest.sourcePdfCount}`);
if(index.objects.some(x=>typeof x.path!=='string'||!x.path.startsWith('source/')||!x.path.toLowerCase().endsWith('.pdf')||!/^[a-f0-9]{64}$/.test(x.oid)||!Number.isSafeInteger(x.size)||x.size<1))throw new Error('Historical LFS index contains malformed entries');
const runtime=JSON.parse(fs.readFileSync(path.join(root,'bank','v6.13.1-original-paper-runtime.json'),'utf8'));
if(runtime.papers.length!==manifest.year2RuntimePapers)throw new Error(`Year 2 runtime inventory drifted: ${runtime.papers.length}/${manifest.year2RuntimePapers}`);
console.log(JSON.stringify({historicalBaseline:manifest.id,status:'PASS',sourceCommit:manifest.sourceCommit,sourceTreeSha:manifest.sourceTreeSha,sourcePdfCount:manifest.sourcePdfCount,uniqueLfsObjects:index.uniqueObjects,ordinaryBuild:'LFS_FREE_PINNED_INDEX_MODE'}));
