import fs from 'node:fs';
import path from 'node:path';
import { PDFDocument } from 'pdf-lib';
const SUBJECTS=['English','Mathematics','Science'];

const html=fs.readFileSync(new URL('../dist/index.html',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../dist/premium.css',import.meta.url),'utf8');
const flow=fs.readFileSync(new URL('../dist/practice-flow.css',import.meta.url),'utf8');
const homeCss=fs.readFileSync(new URL('../dist/home-insights.css',import.meta.url),'utf8');
const challengeCss=fs.readFileSync(new URL('../dist/challenge.css',import.meta.url),'utf8');
const formalCss=fs.readFileSync(new URL('../dist/formal-tests.css',import.meta.url),'utf8');
const ui=fs.readFileSync(new URL('../dist/premium.js',import.meta.url),'utf8');
const insights=fs.readFileSync(new URL('../dist/insights.js',import.meta.url),'utf8');
const challenge=fs.readFileSync(new URL('../dist/challenge.js',import.meta.url),'utf8');
const formalUi=fs.readFileSync(new URL('../dist/formal-tests.js',import.meta.url),'utf8');
const expansion=JSON.parse(fs.readFileSync(new URL('../bank/v6.11.0-approved.json',import.meta.url),'utf8'));
const bonus=JSON.parse(fs.readFileSync(new URL('../bank/v6.12.0-bonus.json',import.meta.url),'utf8'));
const runtime=JSON.parse(fs.readFileSync(new URL('../bank/v6.13.1-original-paper-runtime.json',import.meta.url),'utf8'));
const pkg=JSON.parse(fs.readFileSync(new URL('../package.json',import.meta.url),'utf8'));

for(const x of ['content="6.14.1',"RELEASE='6.14.1'",'oc-ready-progress-v1','My Collection','Made with love by Arthur Wang (daddy), 2026','window.AW_BANK=[]','window.AW_BONUS_BANK=','window.__AW_BONUS_API','window.__AW_ORIGINAL_PAPERS=','/formal-tests.css?v=61410','/formal-tests.js?v=61410','visualTarget=3','visualMax=4','unsafeVisualIds=new Set'])if(!html.includes(x))throw new Error(`Missing ${x}`);
for(const legacy of ['window.__AW_FORMAL_FORMS','window.__AW_FORMAL_API','function startFormal(','formalForms:9','Formal ICAS-style test','submit-formal','formal-next'])if(html.includes(legacy))throw new Error(`Superseded generated formal runtime leaked: ${legacy}`);
for(const removed of ['../bank/v6.13.0-test-forms.json','../scripts/copy-original-papers.mjs','../scripts/inspect-original-papers.mjs','../scripts/ocr-original-paper-tails.mjs','../scripts/validate-expansion.mjs','../scripts/validate-expansion-v2.mjs','../scripts/validate-expansion-v3.mjs'])if(fs.existsSync(new URL(removed,import.meta.url)))throw new Error(`Obsolete source remains: ${removed}`);

const ids=[...html.matchAll(/"id":"([EMS]\d+)"/g)].map(m=>m[1]),unique=new Set(ids);
if(unique.size!==171)throw new Error(`Expected 171 normal-bank unique questions, got ${unique.size}`);
for(const prefix of ['E','M','S'])if([...unique].filter(id=>id.startsWith(prefix)).length!==57)throw new Error(`Wrong ${prefix} bank count`);
for(const id of ['M09','M18','M19','M23','M26','M31'])if(!html.includes(`'${id}'`))throw new Error(`Unsafe visual quarantine missing: ${id}`);
const bonusIds=[...html.matchAll(/"id":"(B[EMS]\d+)"/g)].map(m=>m[1]);if(new Set(bonusIds).size!==9)throw new Error('Expected 9 separate bonus questions');
for(const q of bonus)if(!html.includes(`"id":"${q.id}"`))throw new Error(`Bonus item missing: ${q.id}`);
for(const q of expansion)if(!html.includes(`"id":"${q.id}"`))throw new Error(`Expansion item missing: ${q.id}`);

if(/DecompressionStream|atob\(parts\.join|Release integrity check failed/.test(html))throw new Error('Browser deployment envelope detected');
if(!css.includes('body.aw-daily-practice [data-a="flag"]'))throw new Error('Daily flag presentation rule missing');
for(const marker of ['aw-question-only','aw-inline-stimulus','stimulus-pane[hidden]'])if(!flow.includes(marker))throw new Error(`Practice-flow rule missing: ${marker}`);
for(const marker of ['composeAssessmentLayout','aw-visual-stimulus','aw-question-only'])if(!ui.includes(marker))throw new Error(`Dynamic layout missing: ${marker}`);
for(const forbidden of ['localStorage','sessionStorage','skillStats','reviewQueue','subjectTest(','dailyFast(','finish('])if(ui.includes(forbidden))throw new Error(`Premium UI crossed logic boundary: ${forbidden}`);

for(const marker of ['aw-learning-line','aw-path-step','aw-heart','aw-parent-hero','aw-overall-score','aw-performance-card','aw-spectrum-track','aw-spectrum-dot','aw-subject-grid','aw-unseen-grid'])if(!homeCss.includes(marker))throw new Error(`Home/parent style missing: ${marker}`);
for(const marker of ['PROGRESS_KEY','transformHome','transformParent','document.querySelector(\'[data-a="progress"]\')?.remove()','allSkillRows','subjectRows','spectrumRow','subjectSummary','subskillSections','Not attempted yet','ICAS Y2','ICAS Y3','NAPLAN Y3','ICAS Y4','OC','awenture-topup-request-v2','awenture-topup-v1','makeTopupRequest','TOPUP_TARGET=30','weakest(rows,subject)','qualityPolicy','expertReviewRequired:true','releaseGateRequired:true','window.__AW_TOPUP_API','github.com/Sol4evr/awenture/issues/new'])if(!insights.includes(marker))throw new Error(`Insights missing: ${marker}`);
if(insights.includes('awenture-topup-request-v1')||insights.includes('Top-up requested'))throw new Error('Legacy cosmetic top-up state remains');
if(insights.includes('skillRows(p)')||insights.includes('insightList(rows'))throw new Error('Legacy strongest/weakest-only Parent View remains');
for(const marker of ['Bonus Challenger','ICAS Challenger','6 achievements','[3,5,7]','activeDays>=30'])if(!challenge.includes(marker))throw new Error(`Challenge missing: ${marker}`);
for(const marker of ['aw-bonus-card','aw-bonus-progress','aw-awards-note'])if(!challengeCss.includes(marker))throw new Error(`Challenge style missing: ${marker}`);

for(const marker of ['aw-form-grid','aw-form-tile','aw-timer','aw-form-result','aw-exam-overlay','aw-paper-pane','aw-answer-pane','aw-paper-toolbar','aw-paper-stage','aw-pan-controls','touch-action:pan-x pan-y','@media(hover:none) and (pointer:coarse)'])if(!formalCss.includes(marker))throw new Error(`Formal style missing: ${marker}`);
for(const marker of ['Historical ICAS paper','data-aw-original-year','data-aw-paper-frame','data-aw-paper-canvas','data-aw-page-prev','data-aw-page-next','data-aw-zoom-out','data-aw-zoom-in','data-aw-pan-left','data-aw-pan-right','panPaper','awTouchGestures','gesturestart','touchDistance','renderTask','document.createElement(\'canvas\')','data-aw-answer-choice','data-aw-submit-original','icas-original','source-review','responseTypes','timedOut','/pdf.min.mjs','/pdf.worker.min.mjs'])if(!formalUi.includes(marker))throw new Error(`Historical UI missing: ${marker}`);
if(/<iframe|document\.createElement\(['"]iframe/.test(formalUi))throw new Error('Native embedded PDF iframe returned');
if(/skillStats|reviewQueue/.test(formalUi))throw new Error('Historical formal UI crossed mastery boundary');

if(runtime.release!=='6.13.1'||runtime.papers.length!==21)throw new Error('Historical manifest mismatch');
const expectedCounts={English:8,Mathematics:8,Science:5},expectedConditions={English:[35,35],Mathematics:[30,35],Science:[30,45]};
for(const [subject,count] of Object.entries(expectedCounts)){const rows=runtime.papers.filter(p=>p.subject===subject);if(rows.length!==count)throw new Error(`${subject} paper count ${rows.length}`);const c=runtime.conditions[subject],e=expectedConditions[subject];if(c.questions!==e[0]||c.minutes!==e[1])throw new Error(`${subject} conditions mismatch`)}
if(runtime.papers.filter(p=>p.scoring==='verified').length!==9)throw new Error('Expected 9 verified source keys');

const seen=new Set();let questionAssets=0,answerAssets=0;
for(const p of runtime.papers){const key=`${p.subject}|${p.year}`,c=runtime.conditions[p.subject];if(seen.has(key))throw new Error(`Duplicate ${key}`);seen.add(key);const qPath=new URL(`../dist/original-icas/year2/${c.folder}/${p.year}-questions.pdf`,import.meta.url);if(!fs.existsSync(qPath))throw new Error(`Missing question asset ${key}`);const qDoc=await PDFDocument.load(fs.readFileSync(qPath));if(qDoc.getPageCount()!==p.questionEndPage)throw new Error(`Question page count mismatch ${key}`);questionAssets++;const aPath=new URL(`../dist/original-icas/year2/${c.folder}/${p.year}-answers.pdf`,import.meta.url);if(p.answerReference){if(!fs.existsSync(aPath))throw new Error(`Missing answer reference ${key}`);answerAssets++}else if(fs.existsSync(aPath))throw new Error(`Unexpected answer reference ${key}`)}

const assetRoot=path.resolve(new URL('../dist/original-icas/year2',import.meta.url).pathname);for(const folder of fs.readdirSync(assetRoot))for(const file of fs.readdirSync(path.join(assetRoot,folder)))if(!/^\d{4}-(questions|answers)\.pdf$/.test(file))throw new Error(`Raw/unknown PDF leaked: ${folder}/${file}`);
if(!fs.existsSync(new URL('../dist/pdf.min.mjs',import.meta.url))||!fs.existsSync(new URL('../dist/pdf.worker.min.mjs',import.meta.url)))throw new Error('Local PDF.js viewer assets missing');
if(/ocr-original|inspect-original|copy-original-papers/.test(pkg.scripts.build))throw new Error('Temporary QA pipeline remains in shipping build');
if(pkg.devDependencies?.['tesseract.js'])throw new Error('OCR dependency remains');

console.log(JSON.stringify({release:'6.14.1',baseline:'HARDENED',immutableCore:'6.9.0',normalBank:171,bonusBank:9,dailyVisualTarget:3,dailyVisualMax:4,quarantinedVisuals:6,progressTile:'REMOVED',parentView:'FULL_PERFORMANCE_SPECTRUM',parentTopup:'GOVERNED_REQUEST',topupTargetUnseen:30,parentSubjects:SUBJECTS,historicalPapers:21,verifiedAutoScoring:9,questionAssets,answerAssets,legacyGeneratedFormal:'ABSENT',obsoleteUtilities:'ABSENT',pagedViewer:'PASS',touchControls:'GESTURE_FIRST',learningPath:['ICAS Y2','ICAS Y3','NAPLAN Y3','ICAS Y4','OC'],questionOnlyIsolation:'PASS',formalHistoryIsolation:'PASS',featureRegression:'PASS'}));