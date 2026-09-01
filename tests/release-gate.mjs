import fs from 'node:fs';
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
const forms=JSON.parse(fs.readFileSync(new URL('../bank/v6.13.0-test-forms.json',import.meta.url),'utf8'));
const must=['content="6.13.0"',"RELEASE='6.13.0'",'oc-ready-progress-v1','My Collection','Made with love by Arthur Wang (daddy), 2026','data-a="parent"','Confidence Champion','speechSynthesis','window.AW_BANK=[]','legacy-v3.8-static','for(let i=b.length-1;i>0;i--)','v6.11.0 approved build-time bank expansion','v6.12.0 separate Difficulty 5 bonus bank','v6.13.0 governed fixed formal test forms','window.AW_BONUS_BANK=','window.__AW_BONUS_API','window.__AW_FORMAL_FORMS=','window.__AW_FORMAL_API','startFormal','formalTime','updateFormalTimer','submit-formal','formal-next','durationSeconds','timedOut','/formal-tests.css?v=6130','/formal-tests.js?v=6130'];
for(const x of must)if(!html.includes(x))throw new Error(`Missing ${x}`);
const ids=[...html.matchAll(/"id":"([EMS]\d+)"/g)].map(m=>m[1]);
const unique=new Set(ids);if(unique.size!==171)throw new Error(`Expected 171 normal-bank unique questions, got ${unique.size}`);
for(const prefix of ['E','M','S']){const n=[...unique].filter(id=>id.startsWith(prefix)).length;if(n!==57)throw new Error(`Expected 57 ${prefix} questions, got ${n}`)}
const bonusIds=[...html.matchAll(/"id":"(B[EMS]\d+)"/g)].map(m=>m[1]);if(new Set(bonusIds).size!==9)throw new Error(`Expected 9 separate bonus questions, got ${new Set(bonusIds).size}`);
for(const q of bonus)if(!html.includes(`"id":"${q.id}"`))throw new Error(`Bonus item missing: ${q.id}`);
if(bonus.some(q=>q.difficulty!==5))throw new Error('Every bonus item must remain Difficulty 5');
const bonusVisuals=bonus.filter(q=>q.kind==='visual').length;if(bonusVisuals<6)throw new Error(`Expected at least 6 bonus visuals, got ${bonusVisuals}`);
for(const q of expansion)if(!html.includes(`"id":"${q.id}"`))throw new Error(`Approved expansion item missing: ${q.id}`);
if(/DecompressionStream|atob\(parts\.join|Release integrity check failed/.test(html))throw new Error('Browser deployment envelope detected');
if(!css.includes('body.aw-daily-practice [data-a="flag"]'))throw new Error('Daily flag presentation rule missing');
for(const marker of ['aw-question-only','aw-inline-stimulus','stimulus-pane[hidden]','test-options .opt'])if(!flow.includes(marker))throw new Error(`Practice-flow rule missing: ${marker}`);
for(const marker of ['composeAssessmentLayout','aw-visual-stimulus','aw-question-only','aw-inline-stimulus'])if(!ui.includes(marker))throw new Error(`Dynamic layout marker missing: ${marker}`);
for(const forbidden of ['localStorage','sessionStorage','AW_BANK','skillStats','reviewQueue','recentFamilies','subjectTest(','dailyFast(','finish(','save('])if(ui.includes(forbidden))throw new Error(`Premium UI module crossed logic boundary: ${forbidden}`);
for(const marker of ['aw-learning-line','aw-path-step','aw-heart','aw-parent-grid','aw-unseen-grid'])if(!homeCss.includes(marker))throw new Error(`Home/insights style missing: ${marker}`);
for(const marker of ['PROGRESS_KEY','TOPUP_KEY','transformHome','transformParent','skillRows','unseenBySubject','requestTopup'])if(!insights.includes(marker))throw new Error(`Insights module missing: ${marker}`);
for(const forbidden of ['dailyFast(','subjectTest(','finish(','speechSynthesis','recentFamilies'])if(insights.includes(forbidden))throw new Error(`Insights module crossed learner-engine boundary: ${forbidden}`);
for(const marker of ['aw-bonus-card','aw-bonus-progress','aw-awards-note'])if(!challengeCss.includes(marker))throw new Error(`Challenge style missing: ${marker}`);
for(const marker of ['latestDailyPerfect','Bonus Challenger','ICAS Challenger','6 achievements','[3,5,7]','activeDays>=30','__AW_BONUS_API'])if(!challenge.includes(marker))throw new Error(`Challenge module marker missing: ${marker}`);
for(const removed of ['Comeback Kid','English Explorer','Maths Master','Science Star','Visual Detective'])if(challenge.includes(removed))throw new Error(`Removed achievement still present: ${removed}`);
for(const marker of ['aw-form-grid','aw-form-tile','aw-timer','aw-form-result'])if(!formalCss.includes(marker))throw new Error(`Formal test style missing: ${marker}`);
for(const marker of ['Paper ${id}','Formal timed test','__AW_FORMAL_FORMS','__AW_FORMAL_API','data-aw-form-id'])if(!formalUi.includes(marker))throw new Error(`Formal test selector missing: ${marker}`);
const expected={English:{questions:35,minutes:35},Mathematics:{questions:30,minutes:35},Science:{questions:30,minutes:45}};
for(const [subject,cfg] of Object.entries(expected)){
  if(forms.conditions[subject].questions!==cfg.questions||forms.conditions[subject].minutes!==cfg.minutes)throw new Error(`Wrong formal conditions for ${subject}`);
  for(const id of ['A','B','C']){
    const paper=forms.forms[subject][id];if(!Array.isArray(paper)||paper.length!==cfg.questions)throw new Error(`${subject} Paper ${id} wrong length`);
    if(new Set(paper).size!==paper.length)throw new Error(`${subject} Paper ${id} has duplicate questions`);
    for(const qid of paper)if(!unique.has(qid))throw new Error(`${subject} Paper ${id} references missing ${qid}`);
  }
}
const excluded=new Set(forms.excludedFromFormal.Mathematics||[]);for(const id of excluded)for(const paper of Object.values(forms.forms.Mathematics))if(paper.includes(id))throw new Error(`Excluded legacy visual ${id} leaked into a formal Maths paper`);
if(!/!sess\.formal&&ask&&!ck/.test(html)||!/!sess\.formal&&ck/.test(html))throw new Error('Formal mode must suppress question-by-question confidence/feedback');
const bonusFinish=html.slice(html.indexOf('function finishBonus()'),html.indexOf('function finish(){if(sess'));
for(const forbidden of ['skillStats','reviewQueue','seenIds','P.xp','P.attempts.push'])if(bonusFinish.includes(forbidden))throw new Error(`Bonus result contaminated core learning evidence: ${forbidden}`);
console.log(JSON.stringify({release:'6.13.0',baseline:'6.9.0',normalBank:171,bonusBank:9,bonusVisuals,collectionAchievements:6,formalForms:9,formalConditions:expected,excludedLegacyFormal:[...excluded],featureRegression:'PASS',uiIsolation:'PASS',bonusScoreIsolation:'PASS',bonusPerfectUnlock:'PASS',achievementGold30Days:'PASS',bonusAchievement357:'PASS',collectionSimplification:'PASS',formalFixedForms:'PASS',formalTimer:'PASS',formalDeferredMarking:'PASS',formalAutoSubmit:'PASS'}));