import fs from 'node:fs';
const html=fs.readFileSync(new URL('../dist/index.html',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../dist/premium.css',import.meta.url),'utf8');
const flow=fs.readFileSync(new URL('../dist/practice-flow.css',import.meta.url),'utf8');
const homeCss=fs.readFileSync(new URL('../dist/home-insights.css',import.meta.url),'utf8');
const ui=fs.readFileSync(new URL('../dist/premium.js',import.meta.url),'utf8');
const insights=fs.readFileSync(new URL('../dist/insights.js',import.meta.url),'utf8');
const expansion=JSON.parse(fs.readFileSync(new URL('../bank/v6.11.0-approved.json',import.meta.url),'utf8'));
const must=['content="6.11.0"',"RELEASE='6.11.0'",'oc-ready-progress-v1','My Collection','Made with love by Arthur Wang (daddy), 2026','data-a="parent"','subjectTest(subject)','Confidence Champion','speechSynthesis','window.AW_BANK=[]','legacy-v3.8-static','for(let i=b.length-1;i>0;i--)','v6.11.0 approved build-time bank expansion','/premium.css?v=6110','/practice-flow.css?v=6110','/home-insights.css?v=6110','/premium.js?v=6110','/insights.js?v=6110'];
for(const x of must)if(!html.includes(x))throw new Error(`Missing ${x}`);
const ids=[...html.matchAll(/"id":"([EMS]\d+)"/g)].map(m=>m[1]);
const unique=new Set(ids);
if(unique.size!==171)throw new Error(`Expected 171 unique questions, got ${unique.size}`);
for(const prefix of ['E','M','S']){
  const n=[...unique].filter(id=>id.startsWith(prefix)).length;
  if(n!==57)throw new Error(`Expected 57 ${prefix} questions, got ${n}`);
}
for(const q of expansion)if(!html.includes(`"id":"${q.id}"`))throw new Error(`Approved expansion item missing from built runtime: ${q.id}`);
const visuals=(html.match(/legacy-v3\.8-static/g)||[]).length;
if(visuals<60)throw new Error(`Expected >=60 visuals, got ${visuals}`);
if(/DecompressionStream|atob\(parts\.join|Release integrity check failed/.test(html))throw new Error('Browser deployment envelope detected');
if(!css.includes('body.aw-daily-practice [data-a="flag"]'))throw new Error('Daily flag presentation rule missing');
for(const marker of ['aw-question-only','aw-inline-stimulus','stimulus-pane[hidden]','test-options .opt'])if(!flow.includes(marker))throw new Error(`Practice-flow rule missing: ${marker}`);
for(const marker of ['composeAssessmentLayout','aw-visual-stimulus','aw-question-only','aw-inline-stimulus'])if(!ui.includes(marker))throw new Error(`Dynamic layout marker missing: ${marker}`);
for(const forbidden of ['localStorage','sessionStorage','AW_BANK','skillStats','reviewQueue','recentFamilies','subjectTest(','dailyFast(','finish(','save('])if(ui.includes(forbidden))throw new Error(`Premium UI module crossed logic boundary: ${forbidden}`);
for(const marker of ['aw-learning-line','aw-path-step','aw-heart','aw-parent-grid','aw-unseen-grid'])if(!homeCss.includes(marker))throw new Error(`Home/insights style missing: ${marker}`);
for(const marker of ['PROGRESS_KEY','TOPUP_KEY','transformHome','transformParent','skillRows','unseenBySubject','requestTopup'])if(!insights.includes(marker))throw new Error(`Insights module missing: ${marker}`);
for(const forbidden of ['dailyFast(','subjectTest(','finish(','speechSynthesis','recentFamilies'])if(insights.includes(forbidden))throw new Error(`Insights module crossed learner-engine boundary: ${forbidden}`);
console.log(JSON.stringify({release:'6.11.0',baseline:'6.9.0',coreBank:126,approvedExpansion:45,bank:171,subjects:{English:57,Mathematics:57,Science:57},visualMarkers:visuals,featureRegression:'PASS',uiIsolation:'PASS',dynamicStimulus:'PASS',homeSimplification:'PASS',parentInsights:'PASS',qualityBankExpansion:'PASS'}));
