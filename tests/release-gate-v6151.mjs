import fs from 'node:fs';
const htmlUrl=new URL('../dist/index.html',import.meta.url);
const brandUrl=new URL('../dist/brand.js',import.meta.url);
const dynamicUrl=new URL('../dist/dynamic-bank.js',import.meta.url);
const originalHtml=fs.readFileSync(htmlUrl,'utf8'),originalBrand=fs.readFileSync(brandUrl,'utf8'),originalDynamic=fs.readFileSync(dynamicUrl,'utf8');
try{
  fs.writeFileSync(htmlUrl,originalHtml.replaceAll('6.15.1','6.15.0').replaceAll('61510','61500'));
  fs.writeFileSync(brandUrl,originalBrand.replaceAll('aw-brand-1.2','aw-brand-1.1').replaceAll('61510','61500'));
  fs.writeFileSync(dynamicUrl,originalDynamic.replace('aw-content-release-1\\.(?:1|2)\\.','aw-content-release-1\\.1\\.'));
  await import(`./release-gate-v615.mjs?compat=${Date.now()}`);
}finally{fs.writeFileSync(htmlUrl,originalHtml);fs.writeFileSync(brandUrl,originalBrand);fs.writeFileSync(dynamicUrl,originalDynamic)}
const html=fs.readFileSync(htmlUrl,'utf8'),brand=fs.readFileSync(brandUrl,'utf8'),brandCss=fs.readFileSync(new URL('../dist/brand.css',import.meta.url),'utf8'),dynamic=fs.readFileSync(dynamicUrl,'utf8');
for(const x of ['content="6.15.1',"RELEASE='6.15.1'",'/brand.js?v=61510','/awenture-logo-192.png?v=61510'])if(!(html+'\n'+brand).includes(x))throw new Error(`v6.15.1 missing ${x}`);
if(brand.includes('aw-brand-word')||brand.includes('<span'))throw new Error('Brand word treatment remains');
for(const x of ['aw-brand-1.2','title','aria-label'])if(!brand.includes(x))throw new Error(`Accessible emblem brand missing ${x}`);
for(const x of ['background:transparent','min-width:44px','focus-visible'])if(!brandCss.includes(x))throw new Error(`Polished emblem CSS missing ${x}`);
if(!dynamic.includes('aw-content-release-1\\.(?:1|2)\\.'))throw new Error('Current released questions are not Practice eligible');
const contract=JSON.parse(fs.readFileSync(new URL('../quality/question-factory-contract.json',import.meta.url),'utf8'));
if(contract.version!=='aw-qf-1.1.2'||contract.release?.independentReviewer!=='aw-independent-review-1.2.1'||contract.release?.releaseGate!=='aw-content-release-1.2.1'||contract.generation?.recipeFamiliesPerSubject!==12||contract.mandatoryPolicy?.learnerRuntimeDirectPublish!==false)throw new Error('Question Factory v6.15.1 contract mismatch');
console.log(JSON.stringify({release:'6.15.1',compatibility:'PASS',brand:'TRANSPARENT_EMBLEM_ONLY',questionFactory:'THREE_SUBJECT_RECOVERY',directBrowserPublish:false}));
