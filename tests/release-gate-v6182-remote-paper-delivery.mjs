import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {PDFDocument} from 'pdf-lib';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const stageDir=path.join(root,'dist','stage-papers');
const catalogPath=path.join(stageDir,'catalog.json');
const apiPath=path.join(root,'api','paper.js');
const manifestPath=path.join(root,'api','paper-manifest.json');
for(const p of [catalogPath,apiPath,manifestPath])if(!fs.existsSync(p))throw new Error(`remote paper delivery gate missing: ${p}`);
const catalog=JSON.parse(fs.readFileSync(catalogPath,'utf8'));
const delivery='github-source-proxy-v2-allowlist';
if(catalog.delivery!==delivery)throw new Error(`unexpected paper delivery mode: ${catalog.delivery}`);
const papers=[];for(const stage of Object.values(catalog.stages||{}))for(const p of stage.papers||[])papers.push(p);
if(papers.length!==187)throw new Error(`stage paper count regression: ${papers.length}/187`);
const manifest=JSON.parse(fs.readFileSync(manifestPath,'utf8'));
if(manifest.version!=='aw-paper-proxy-manifest-v2'||manifest.delivery!==delivery||manifest.learnerOnly!==true)throw new Error('learner-only paper proxy manifest contract mismatch');
if(Object.keys(manifest.papers||{}).length!==papers.length)throw new Error(`paper proxy allowlist count mismatch: ${Object.keys(manifest.papers||{}).length}/${papers.length}`);
const dangerous=new Map([
  ['186aa4ed88ca7ef9aed01f8ee4678d13808a431f3970de67d285a45cb6615bb8',14],
  ['d84cd62773be0427d05b93facfd5d0b85fea5aeaa3945e0be0e4a5fd2952377e',14],
  ['255e038c2b5b8e41c34b3cf109cf69f132aecd80790f7dc61ad0db4fec26e1f1',13],
  ['7b68fca6f777713d01ca79dfe566e87a077ddbc37f285d7c9c4d935a0a4a11d6',15]
]);
let answerLeakProtectedEntries=0;
for(const p of papers){
  if(!p.sourcePath?.startsWith('source/')||!p.sourcePath.toLowerCase().endsWith('.pdf'))throw new Error(`invalid GitHub source path: ${p.sourcePath}`);
  const expected=`/api/paper?id=${encodeURIComponent(p.id)}`;
  if(p.assetPath!==expected)throw new Error(`paper resolver mismatch: ${p.sourcePath}`);
  if(p.delivery!==delivery)throw new Error(`paper delivery metadata mismatch: ${p.sourcePath}`);
  const m=manifest.papers[p.id];
  if(!m||m.sourcePath!==p.sourcePath||m.deliveryStartPage!==1||m.deliveryEndPage!==p.questionEndPage||m.pageBoundaryVerified!==true)throw new Error(`learner-only proxy boundary mismatch: ${p.id}`);
  if(!Number.isInteger(m.deliveryEndPage)||m.deliveryEndPage<1)throw new Error(`invalid learner delivery end page: ${p.id}`);
  if(/answer|solution|worked|marking|mark scheme|rubric|criteria|commentary|transcript|results/i.test(path.basename(p.sourcePath)))throw new Error(`support/answer resource leaked into learner proxy allowlist: ${p.sourcePath}`);
  const sha=p.governance?.reviewEvidence?.sha256;
  if(sha&&m.sourceSha256!==sha)throw new Error(`reviewed source SHA missing from proxy contract: ${p.sourcePath}`);
  if(sha&&dangerous.has(sha)){
    if(m.deliveryEndPage!==dangerous.get(sha))throw new Error(`Y3 Digital learner-only delivery boundary regression: ${p.sourcePath}`);
    answerLeakProtectedEntries++;
  }
}
if(answerLeakProtectedEntries!==8)throw new Error(`Y3 Digital delivery protection incomplete: ${answerLeakProtectedEntries}/8`);
const deployedPdfs=[];
function walk(dir){if(!fs.existsSync(dir))return;for(const e of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,e.name);if(e.isDirectory())walk(p);else if(e.isFile()&&e.name.toLowerCase().endsWith('.pdf'))deployedPdfs.push(path.relative(root,p).split(path.sep).join('/'))}}
walk(stageDir);
if(deployedPdfs.length)throw new Error(`stage PDFs must not be deployed: ${deployedPdfs.slice(0,5).join(', ')}`);
const api=fs.readFileSync(apiPath,'utf8');
for(const needle of ['AW_GITHUB_SOURCE_TOKEN','VERCEL_GIT_COMMIT_SHA','media.githubusercontent.com/media','cleanRef','sourceUrl','PDFDocument','deliveryEndPage','sourceSha256','Content-Range','X-AW-Paper-Learner-Pages','X-AW-Paper-Safe-Cache','MAX_SAFE_PDF_CACHE=2','paper-manifest.json'])if(!api.includes(needle))throw new Error(`paper proxy contract missing: ${needle}`);
if(api.includes('req.query?.path'))throw new Error('paper proxy must not accept arbitrary repository source paths');
const upstreamStart=api.indexOf('const upstream=await fetch(sourceUrl(entry,ref)');
const upstreamEnd=api.indexOf('const sourceBytes=',upstreamStart);
if(upstreamStart<0||upstreamEnd<0)throw new Error('paper proxy pinned raw download block not found');
const upstreamBlock=api.slice(upstreamStart,upstreamEnd);
if(/\bRange\s*:|req\.headers\.range|req\.headers\[['"]range/i.test(upstreamBlock))throw new Error('learner byte range must never be forwarded to the uncropped source PDF');
if(api.includes('if(!auth)')||api.includes('meta.download_url'))throw new Error('public source delivery must not depend on a runtime token or GitHub metadata API');
if(/gh[pousr]_[A-Za-z0-9_]{20,}/.test(api))throw new Error('GitHub credential must never be embedded in source');

const require=createRequire(import.meta.url);
const handler=require('../api/paper.js');
const helpers=handler._test;
if(!helpers?.learnerPdf||!helpers?.byteRange||!helpers?.cleanRef||!helpers?.sourceUrl)throw new Error('paper proxy test helpers unavailable');
const pinnedRef='0123456789abcdef0123456789abcdef01234567';
if(helpers.cleanRef(pinnedRef)!==pinnedRef||helpers.cleanRef('main')!==null||helpers.cleanRef('release/v6.19.1')!==null)throw new Error('paper source ref must be an immutable 40-character SHA');
for(const paper of papers){
  const entry=manifest.papers[paper.id];
  const url=helpers.sourceUrl(entry,pinnedRef);
  if(!url.startsWith(`https://media.githubusercontent.com/media/Sol4evr/awenture/${pinnedRef}/source/`)||!url.toLowerCase().endsWith('.pdf'))throw new Error(`invalid pinned source URL: ${paper.id}`);
  if(url.includes(' ')||url.includes('?ref='))throw new Error(`unpinned or unencoded source URL: ${paper.id}`);
}
const synthetic=await PDFDocument.create();for(let i=0;i<5;i++)synthetic.addPage([200,200]);
const sourceBytes=Buffer.from(await synthetic.save());
const cropped=await helpers.learnerPdf(sourceBytes,3);
const croppedDoc=await PDFDocument.load(cropped.bytes);
if(cropped.sourcePages!==5||cropped.learnerPages!==3||croppedDoc.getPageCount()!==3)throw new Error('learner PDF crop failed to remove terminal pages');
const total=cropped.bytes.length;
for(const [value,expected] of [['bytes=0-4',{start:0,end:4}],['bytes=5-',{start:5,end:total-1}],['bytes=-5',{start:total-5,end:total-1}]]){
  const got=helpers.byteRange(value,total);if(got?.start!==expected.start||got?.end!==expected.end)throw new Error(`cropped PDF byte range regression: ${value}`);
}
if(!helpers.byteRange(`bytes=${total}-`,total)?.error||!helpers.byteRange('bytes=bad',total)?.error)throw new Error('invalid cropped PDF ranges must fail closed');
if(helpers.MAX_SAFE_PDF_CACHE!==2)throw new Error(`safe PDF cache must remain tightly bounded: ${helpers.MAX_SAFE_PDF_CACHE}`);
helpers.safePdfCache.clear();
for(let i=1;i<=3;i++)helpers.cacheSet(`sha:${i}`,{bytes:Buffer.from([i]),learnerPages:i,sourcePages:i});
if(helpers.safePdfCache.size!==2||helpers.safePdfCache.has('sha:1')||!helpers.safePdfCache.has('sha:2')||!helpers.safePdfCache.has('sha:3'))throw new Error('safe PDF cache LRU bound/eviction regression');
if(!helpers.cacheGet('sha:2'))throw new Error('safe PDF cache hit regression');
helpers.cacheSet('sha:4',{bytes:Buffer.from([4]),learnerPages:4,sourcePages:4});
if(helpers.safePdfCache.has('sha:3')||!helpers.safePdfCache.has('sha:2')||!helpers.safePdfCache.has('sha:4'))throw new Error('safe PDF cache recency regression');
helpers.safePdfCache.clear();

let githubSmoke='LOCAL_SKIP';
if(process.env.VERCEL==='1'){
  const ref=helpers.cleanRef(process.env.AW_GITHUB_SOURCE_REF||process.env.VERCEL_GIT_COMMIT_SHA);
  if(!ref)throw new Error('Vercel paper delivery smoke check requires an immutable source SHA');
  const sample=papers.find(p=>p.sourcePath.includes('Digital AB 2006.pdf'))||papers[0];
  const url=helpers.sourceUrl(manifest.papers[sample.id],ref);
  const bytes=await fetch(url,{headers:{Accept:'application/octet-stream',Range:'bytes=0-4','User-Agent':'AWenture-release-gate'},redirect:'follow'});
  if(!(bytes.ok||bytes.status===206))throw new Error(`Public GitHub paper source smoke check failed: HTTP ${bytes.status}`);
  const head=Buffer.from(await bytes.arrayBuffer()).subarray(0,5).toString('ascii');
  if(head!=='%PDF-')throw new Error(`Public GitHub paper source smoke check returned non-PDF bytes: ${JSON.stringify(head)}`);
  githubSmoke='PASS';
}
console.log(JSON.stringify({release:'6.18.2',remotePaperDelivery:'PASS',delivery,papers:papers.length,proxyAllowlist:papers.length,learnerOnly:true,syntheticCrop:'5_TO_3_PASS',safePdfCache:'LRU_2_PASS',answerLeakProtectedEntries,deployedStagePdfs:0,supportResourcesReachable:false,githubCredentials:'SERVER_SIDE_ONLY',deploymentRef:'PINNED_TO_VERCEL_GIT_COMMIT_SHA',githubSourceSmoke:githubSmoke}));
