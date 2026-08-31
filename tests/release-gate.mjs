import fs from 'node:fs';
const html=fs.readFileSync(new URL('../dist/index.html',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../dist/premium.css',import.meta.url),'utf8');
const ui=fs.readFileSync(new URL('../dist/premium.js',import.meta.url),'utf8');
const must=['content="6.10.0"',"RELEASE='6.10.0'",'oc-ready-progress-v1','My Collection','Made with love by Arthur Wang (daddy), 2026','data-a="parent"','subjectTest(subject)','Confidence Champion','speechSynthesis','window.AW_BANK=[]','legacy-v3.8-static','for(let i=b.length-1;i>0;i--)','/premium.css?v=6100','/premium.js?v=6100'];
for(const x of must)if(!html.includes(x))throw new Error(`Missing ${x}`);
const ids=[...html.matchAll(/"id":"([EMS]\d+)"/g)].map(m=>m[1]);
if(new Set(ids).size!==126)throw new Error(`Expected 126, got ${new Set(ids).size}`);
const visuals=(html.match(/legacy-v3\.8-static/g)||[]).length;
if(visuals<50)throw new Error(`Expected >=50 visuals, got ${visuals}`);
if(/DecompressionStream|atob\(parts\.join|Release integrity check failed/.test(html))throw new Error('Browser deployment envelope detected');
if(!css.includes('body.aw-daily-practice [data-a="flag"]'))throw new Error('Daily flag presentation rule missing');
for(const forbidden of ['localStorage','sessionStorage','AW_BANK','skillStats','reviewQueue','recentFamilies','subjectTest(','dailyFast(','finish(','save(']){
  if(ui.includes(forbidden))throw new Error(`UI module crossed logic boundary: ${forbidden}`);
}
console.log(JSON.stringify({release:'6.10.0',baseline:'6.9.0',bank:126,visualMarkers:visuals,featureRegression:'PASS',uiIsolation:'PASS'}));
