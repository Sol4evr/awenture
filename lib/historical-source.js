const crypto=require('node:crypto');
const baseline=require('../baseline/historical-corpus-v1.json');
const index=require('../baseline/historical-corpus-v1-lfs-index.json');
const delivery=require('../baseline/historical-corpus-delivery-v2.json');
const allowed={icas:['source/original-icas/','Sol4evr/awenture-corpus-icas'],naplan:['source/naplan/','Sol4evr/awenture-corpus-naplan'],oc:['source/oc/','Sol4evr/awenture-corpus-oc']};
const identities=new Map(index.objects.map(x=>[x.path,x]));
const indexSha=crypto.createHash('sha256').update(require('node:fs').readFileSync(require.resolve('../baseline/historical-corpus-v1-lfs-index.json'))).digest('hex');
if(delivery.version!=='aw-normal-git-corpus-delivery-v2'||delivery.sourceCommit!==baseline.sourceCommit||delivery.sourceIndexSha256!==indexSha||index.objects.length!==602||identities.size!==602)throw new Error('Historical corpus delivery identity mismatch');
for(const [area,[prefix,repository]] of Object.entries(allowed)){
 const pin=delivery.corpora?.[area];
 if(!pin||pin.prefix!==prefix||pin.repository!==repository||!/^[a-f0-9]{40}$/.test(pin.commit)||pin.verifiedRemoteGitObjects!==true)throw new Error('Invalid immutable normal-Git corpus pin');
 if(index.objects.filter(x=>x.path.startsWith(prefix)).length!==pin.paths)throw new Error('Historical corpus area accounting mismatch');
}
const readablePath='source/original-icas/year4/English yr 4/2019 ICAS English Paper B.pdf';
if(Object.keys(delivery.readableSources||{}).some(p=>p!==readablePath))throw new Error('Unreviewed readable-source exception');
function readableSourceFor(sourcePath){
 const spec=delivery.readableSources?.[sourcePath];if(!spec)return null;
 if(spec.sourceSha256!==identities.get(sourcePath)?.oid||spec.repository!==allowed.icas[1]||!/^[a-f0-9]{40}$/.test(spec.commit)||spec.derivedPath!=='derived/readable-sources/76c70ca554c7a811.bin'||!/^[a-f0-9]{64}$/.test(spec.sha256)||!Number.isSafeInteger(spec.size)||spec.size<1||spec.size>=50*1024*1024||spec.pageCount!==40||spec.emptyPasswordOnly!==true||spec.pageContentStreamsUnchanged!==true||spec.pixelIdenticalPages!==40)throw new Error('Readable source identity mismatch');
 return {...spec,url:`https://raw.githubusercontent.com/${spec.repository}/${spec.commit}/${spec.derivedPath}`};
}
function sourceLocation(sourcePath){
 const identity=identities.get(sourcePath);
 if(!identity||!sourcePath.endsWith('.pdf')||sourcePath.split('/').some(p=>p==='..'||p==='.'||p===''))throw new Error('Unindexed historical source path');
 const area=Object.keys(allowed).find(a=>sourcePath.startsWith(allowed[a][0]));
 if(!area)throw new Error('Unowned historical source path');
 const pin=delivery.corpora[area];
 const encoded=sourcePath.split('/').map(encodeURIComponent).join('/');
 return {readable:readableSourceFor(sourcePath),area,repository:pin.repository,commit:pin.commit,sha256:identity.oid,size:identity.size,url:`https://raw.githubusercontent.com/${pin.repository}/${pin.commit}/${encoded}`};
}
module.exports={sourceLocation,delivery};
