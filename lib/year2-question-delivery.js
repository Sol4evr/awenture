// Owns only the 22 immutable Year 2 question URLs. No source/answer wildcard routes.
const crypto=require('node:crypto');
const manifest=require('../baseline/year2-question-delivery-v1.json');
const runtime=require('../bank/v6.13.1-original-paper-runtime.json');
const index=require('../baseline/historical-corpus-v1-lfs-index.json');
function validate(value=manifest){
  if(value.schemaVersion!==1||value.learnerOnly!==true||value.repository!=='Sol4evr/awenture-corpus-icas'||!/^[a-f0-9]{40}$/.test(value.commit||'')||value.producerAppSha!=='083fa893905bd3975c8de99ca70c4cddcbbc1156'||!Number.isInteger(value.dpi)||value.dpi<216||!Number.isInteger(value.jpegQuality)||value.jpegQuality<92||value.pixelVerifiedPages!==value.assets?.reduce((n,a)=>n+a.pages,0)||value.assets?.length!==22)throw Error('Invalid Year 2 delivery governance');
  const expected=new Map(runtime.papers.map(p=>[`original-icas/year2/${runtime.conditions[p.subject].folder}/${p.year}-questions.pdf`,p]));
  const seen=new Set();
  for(const a of value.assets){const p=expected.get(a.path);const original=index.objects.find(x=>x.path===a.sourcePath);const pages=p?.subject==='Spelling'&&p.year===2016?2:p?.questionEndPage;
    if(!p||seen.has(a.path)||a.subject!==p.subject||a.year!==p.year||a.pages!==pages||a.learnerOnly!==true||a.corpusPath!==a.path.replace('original-icas/year2/','derived/learner-safe-year2/')||!original||!a.sourcePath.startsWith('source/original-icas/year2/'+runtime.conditions[p.subject].folder+'/')||!a.sourcePath.split('/').pop().startsWith(p.year+' ')||a.sourceSha256!==original.oid||!/^[a-f0-9]{64}$/.test(a.sha256||'')||!Number.isSafeInteger(a.size)||a.size<5)throw Error('Invalid Year 2 learner asset '+a.path);
    seen.add(a.path);
  }
  return value;
}
validate();
const assets=new Map(manifest.assets.map(a=>[a.path,a]));
function location(assetPath){const a=assets.get(assetPath);if(!a)throw Error('Unknown Year 2 question asset');return {...a,url:`https://raw.githubusercontent.com/${manifest.repository}/${manifest.commit}/${a.corpusPath}`};}
function verify(bytes,asset){if(bytes.length!==asset.size||crypto.createHash('sha256').update(bytes).digest('hex')!==asset.sha256||bytes.subarray(0,5).toString('ascii')!=='%PDF-')throw Error('Year 2 question identity mismatch '+asset.path);}
module.exports={manifest,validate,location,verify};
