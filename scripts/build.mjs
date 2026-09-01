import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const m=JSON.parse(fs.readFileSync(path.join(root,'baseline/manifest.json'),'utf8'));
let b64=''; for(let i=1;i<=m.parts;i++) b64+=fs.readFileSync(path.join(root,`baseline/v6.9.0.part${String(i).padStart(2,'0')}`),'utf8').trim();
const baseline=zlib.gunzipSync(Buffer.from(b64,'base64'));
const sha=crypto.createHash('sha256').update(baseline).digest('hex');
if(sha!==m.sha256) throw new Error(`AWenture baseline integrity failure: ${sha}`);
if(baseline.length!==m.decodedBytes) throw new Error(`AWenture baseline size mismatch: ${baseline.length}`);

const release='6.13.0';
const expansionSource=JSON.parse(fs.readFileSync(path.join(root,'bank/v6.11.0-approved.json'),'utf8'));
const corrections=JSON.parse(fs.readFileSync(path.join(root,'bank/v6.11.0-corrections.json'),'utf8'));
const bonus=JSON.parse(fs.readFileSync(path.join(root,'bank/v6.12.0-bonus.json'),'utf8'));
const formalForms=JSON.parse(fs.readFileSync(path.join(root,'bank/v6.13.0-test-forms.json'),'utf8'));
const knownIds=new Set(expansionSource.map(q=>q.id));
for(const id of Object.keys(corrections))if(!knownIds.has(id))throw new Error(`Unknown expansion correction id: ${id}`);
const expansionRaw=expansionSource.map(q=>({...q,...(corrections[q.id]||{})}));
const LETTERS='ABCD';
const expansion=expansionRaw.map((q,i)=>{
  const answerIndex=LETTERS.indexOf(q.answer),targetIndex=i%4;
  const shift=(answerIndex-targetIndex+4)%4;
  const options=[...q.options.slice(shift),...q.options.slice(0,shift)];
  return {...q,options,answer:LETTERS[targetIndex]};
});
const answerMix=Object.fromEntries(LETTERS.split('').map(l=>[l,expansion.filter(q=>q.answer===l).length]));
if(Math.max(...Object.values(answerMix))-Math.min(...Object.values(answerMix))>1)throw new Error(`Expansion answer distribution imbalance: ${JSON.stringify(answerMix)}`);

let html=baseline.toString('utf8');
html=html.replace('content="6.9.0"',`content="${release}"`);
html=html.replace("RELEASE='6.9.0'",`RELEASE='${release}'`);
const runtimeMarker="\n\n(()=>{'use strict';\nconst A=";
if(!html.includes(runtimeMarker))throw new Error('Core runtime injection marker not found');
html=html.replace(runtimeMarker,`\n\n/* v6.11.0 approved build-time bank expansion; immutable core questions remain unchanged */\nwindow.AW_BANK.push(...${JSON.stringify(expansion)});${runtimeMarker}`);

const visualIds=[...html.matchAll(/\{"id":"([EMS]\d+)"(?:(?!\{"id":)[\s\S])*?"kind":"visual"/g)].map(x=>x[1]);
if(visualIds.length<65)throw new Error(`Visual-id extraction unexpectedly low: ${visualIds.length}`);
html=html.replace(runtimeMarker,`\n\n/* v6.12.0 separate Difficulty 5 bonus bank; excluded from normal scoring/mastery */\nwindow.AW_BONUS_BANK=${JSON.stringify(bonus)};\nwindow.__AW_VISUAL_IDS=${JSON.stringify(visualIds)};\n/* v6.13.0 governed fixed formal test forms and authentic Intro timing */\nwindow.__AW_FORMAL_FORMS=${JSON.stringify(formalForms)};${runtimeMarker}`);

const startMarker="function start(items,type='practice',subject=null){busy=false;sess={items,i:0,ans:{},checked:{},confidence:{},ask:{},flagged:{},type,subject};S='practice';render();}";
if(!html.includes(startMarker))throw new Error('Core start marker not found');
html=html.replace(startMarker,`${startMarker}\nlet formalTimer=null;\nfunction formalTime(ms){const s=Math.max(0,Math.ceil(ms/1000)),m=Math.floor(s/60);return String(m).padStart(2,'0')+':'+String(s%60).padStart(2,'0')}\nfunction updateFormalTimer(){if(!sess||!sess.formal||S!=='practice')return;const left=(sess.deadline||0)-Date.now(),el=document.querySelector('[data-aw-timer]');if(el){el.textContent=formalTime(left);el.classList.toggle('warning',left<=300000&&left>60000);el.classList.toggle('danger',left<=60000)}if(left<=0&&!sess.timedOut){sess.timedOut=true;finish()}}\nfunction startFormal(subject,formId){const spec=window.__AW_FORMAL_FORMS,cfg=spec&&spec.conditions&&spec.conditions[subject],ids=spec&&spec.forms&&spec.forms[subject]&&spec.forms[subject][formId];if(!cfg||!Array.isArray(ids))return false;const items=ids.map(id=>BYID.get(id));if(items.some(x=>!x)||items.length!==cfg.questions)return false;start(items,'icas-test',subject);sess.formal=true;sess.formId=formId;sess.minutes=cfg.minutes;sess.startedAt=Date.now();sess.deadline=sess.startedAt+cfg.minutes*60000;if(formalTimer)clearInterval(formalTimer);formalTimer=setInterval(updateFormalTimer,1000);render();updateFormalTimer();return true}`);

const testStatusMarker='<div class="teststatus"><b>Question ${sess.i+1} of ${sess.items.length}</b>';
if(!html.includes(testStatusMarker))throw new Error('Formal timer status marker not found');
html=html.replace(testStatusMarker,'<div class="teststatus"><b>Question ${sess.i+1} of ${sess.items.length}</b>${sess.formal?\'<span class="aw-timer" data-aw-timer>--:--</span>\':\'\'}');
html=html.replace("${ck||ask?'disabled':''}","${sess.formal?'':(ck||ask?'disabled':'')}");
html=html.replace("${ask&&!ck?`<div class=\"confidence\">","${!sess.formal&&ask&&!ck?`<div class=\"confidence\">");
html=html.replace("${ck?`<div class=\"feedback\">","${!sess.formal&&ck?`<div class=\"feedback\">");
const footerAction="${ask&&!ck?'<span></span>':`<button class=\"navbtn primarynav\" data-a=\"${ck?'next':'check'}\" ${!ck&&!sel?'disabled':''}>${ck?(sess.i===sess.items.length-1?'Finish':'Next →'):'Check answer'}</button>`}";
if(!html.includes(footerAction))throw new Error('Formal navigation marker not found');
html=html.replace(footerAction,"${sess.formal?`<button class=\"navbtn primarynav\" data-a=\"${sess.i===sess.items.length-1?'submit-formal':'formal-next'}\">${sess.i===sess.items.length-1?'Submit paper':'Next →'}</button>`:ask&&!ck?'<span></span>':`<button class=\"navbtn primarynav\" data-a=\"${ck?'next':'check'}\" ${!ck&&!sel?'disabled':''}>${ck?(sess.i===sess.items.length-1?'Finish':'Next →'):'Check answer'}</button>`}");

const finishMarker='function finish(){let c=0;';
if(!html.includes(finishMarker))throw new Error('Core finish marker not found');
const bonusHelpers=`function localDay(d=new Date()){return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')}\nfunction bonusLoad(){try{return Object.assign({attempts:[],streak:0,bestStreak:0,lastSuccessDate:null},JSON.parse(localStorage.getItem('awenture-bonus-v1')||'{}'))}catch(_){return{attempts:[],streak:0,bestStreak:0,lastSuccessDate:null}}}\nfunction bonusSave(b){try{localStorage.setItem('awenture-bonus-v1',JSON.stringify(b))}catch(_){}}\nfunction finishBonus(){const q=sess.items[0],correct=sess.ans[0]===q.answer,b=bonusLoad(),t=localDay();if(!(b.attempts||[]).some(a=>a.date===t)){if(correct){const y=new Date();y.setDate(y.getDate()-1);b.streak=b.lastSuccessDate===localDay(y)?(b.streak||0)+1:1;b.lastSuccessDate=t}else b.streak=0;b.bestStreak=Math.max(b.bestStreak||0,b.streak||0);b.attempts=[...(b.attempts||[]),{date:t,at:new Date().toISOString(),id:q.id,subject:q.subject,correct}].slice(-120);bonusSave(b)}sess.result={c:correct?1:0,score:correct?100:0,bonus:true,bonusStreak:b.streak||0};S='results';render()}\nfunction finish(){if(sess&&sess.type==='bonus-challenge')return finishBonus();if(formalTimer&&sess&&sess.formal){clearInterval(formalTimer);formalTimer=null}let c=0;`;
html=html.replace(finishMarker,bonusHelpers);

const attemptMarker="P.attempts.push({date:new Date().toISOString(),score,subject:sess.subject||'Daily',type:sess.type,perfect:c===sess.items.length});";
if(!html.includes(attemptMarker))throw new Error('Attempt history marker not found');
html=html.replace(attemptMarker,"P.attempts.push({date:new Date().toISOString(),score,subject:sess.subject||'Daily',type:sess.type,perfect:c===sess.items.length,formId:sess.formal?sess.formId:null,durationSeconds:sess.formal?Math.max(0,Math.round((Date.now()-(sess.startedAt||Date.now()))/1000)):null,timedOut:!!(sess.formal&&sess.timedOut)});");

const resultMarker='function results(){return shell(`<section class="card"><div class="ey">Complete</div><h1>${Math.round(sess.result.score)}%</h1><h2>${sess.result.c} of ${sess.items.length} correct</h2><button class="primary wide" data-a="home">Done</button></section>`);}';
if(!html.includes(resultMarker))throw new Error('Core result marker not found');
html=html.replace(resultMarker,'function results(){if(sess&&sess.result&&sess.result.bonus){const ok=sess.result.score===100;return shell(`<section class="card"><div class="ey">Bonus Challenge</div><h1>${ok?\'Challenge complete!\':\'Good try!\'}</h1><h2>${ok?`Bonus streak: ${sess.result.bonusStreak} day${sess.result.bonusStreak===1?\'\':\'s\'}`:\'A new challenge can be earned tomorrow.\'}</h2><p>${ok?\'This result is kept separate from normal practice scores and mastery.\':\'Bonus challenges are intentionally harder and do not reduce normal practice results.\'}</p><button class="primary wide" data-a="home">Done</button></section>`)}if(sess&&sess.formal){const used=Math.max(0,Math.round((Date.now()-(sess.startedAt||Date.now()))/1000)),review=sess.items.map((q,i)=>{const a=sess.ans[i]||\'—\',ok=a===q.answer;return `<details><summary>Question ${i+1} · ${ok?\'✓\':\'Review\'}</summary><p><b>Your answer:</b> ${esc(a)} · <b>Correct:</b> ${esc(q.answer)}</p><p>${esc(q.explanation)}</p></details>`}).join(\'\');return shell(`<section class="card"><div class="ey">Formal ICAS-style test</div><h1>${Math.round(sess.result.score)}%</h1><h2>${esc(sess.subject)} · Paper ${esc(sess.formId)} · ${sess.result.c} of ${sess.items.length} correct</h2><div class="aw-form-result"><b>${sess.timedOut?\'Time expired — paper submitted automatically\':\'Paper submitted\'}</b><span>Time used: ${Math.floor(used/60)} min ${used%60} sec</span></div><p>Marking and explanations are shown only now that the formal paper has been submitted.</p>${review}<button class="primary wide" data-a="home">Done</button></section>`)}return shell(`<section class="card"><div class="ey">Complete</div><h1>${Math.round(sess.result.score)}%</h1><h2>${sess.result.c} of ${sess.items.length} correct</h2><button class="primary wide" data-a="home">Done</button></section>`);}');

const eventCheck="if(a==='check'){sess.ask[sess.i]=1;return render()}";
if(!html.includes(eventCheck))throw new Error('Event action marker not found');
html=html.replace(eventCheck,`${eventCheck}if(a==='formal-next'){stopRead();if(sess.i<sess.items.length-1){sess.i++;return render()}}if(a==='submit-formal')return finish();`);
const eventHome="stopRead();S=['tests','progress','parent','collection'].includes(a)?a:'home';render();";
if(!html.includes(eventHome))throw new Error('Home navigation marker not found');
html=html.replace(eventHome,"if(formalTimer){clearInterval(formalTimer);formalTimer=null}stopRead();S=['tests','progress','parent','collection'].includes(a)?a:'home';render();");

const healthMarker="window.__AW_RUNTIME_HEALTH={release:RELEASE,bank:BANK.length,subjects:Object.fromEntries(SUB.map(s=>[s,BANK.filter(q=>q.subject===s).length]))};render();";
if(!html.includes(healthMarker))throw new Error('Runtime health marker not found');
const bridge="window.__AW_BONUS_API={start:()=>{const b=bonusLoad(),t=localDay();if((b.attempts||[]).some(a=>a.date===t))return false;const eligible=(P.attempts||[]).some(a=>a.type==='practice'&&a.subject==='Daily'&&Math.round(Number(a.score))===100&&localDay(new Date(a.date))===t);if(!eligible)return false;const pool=Array.isArray(window.AW_BONUS_BANK)?window.AW_BONUS_BANK:[];if(!pool.length)return false;const q=pool[seed()%pool.length];start([q],'bonus-challenge','Bonus Challenge');return true}};window.__AW_FORMAL_API={start:startFormal};window.__AW_RUNTIME_HEALTH={release:RELEASE,bank:BANK.length,bonusBank:(window.AW_BONUS_BANK||[]).length,formalForms:9,subjects:Object.fromEntries(SUB.map(s=>[s,BANK.filter(q=>q.subject===s).length]))};render();";
html=html.replace(healthMarker,bridge);

html=html.replace('</head>','<link rel="stylesheet" href="/premium.css?v=6130"><link rel="stylesheet" href="/practice-flow.css?v=6130"><link rel="stylesheet" href="/home-insights.css?v=6130"><link rel="stylesheet" href="/challenge.css?v=6130"><link rel="stylesheet" href="/formal-tests.css?v=6130"></head>');
html=html.replace('</body>','<script src="/premium.js?v=6130" defer></script><script src="/insights.js?v=6130" defer></script><script src="/challenge.js?v=6130" defer></script><script src="/formal-tests.js?v=6130" defer></script></body>');

fs.rmSync(path.join(root,'dist'),{recursive:true,force:true});
fs.mkdirSync(path.join(root,'dist'));
for(const f of ['premium.css','practice-flow.css','home-insights.css','challenge.css','formal-tests.css'])fs.copyFileSync(path.join(root,'ui',f),path.join(root,'dist',f));
for(const f of ['premium.js','insights.js','challenge.js','formal-tests.js'])fs.copyFileSync(path.join(root,'ui',f),path.join(root,'dist',f));
fs.writeFileSync(path.join(root,'dist/index.html'),html);
console.log(JSON.stringify({release,baselineRelease:m.release,baselineSha256:sha,baselineBytes:baseline.length,coreBank:126,approvedExpansion:expansion.length,totalCoreBank:126+expansion.length,bonusBank:bonus.length,bonusVisuals:bonus.filter(q=>q.kind==='visual').length,visualIds:visualIds.length,formalForms:9,formalConditions:formalForms.conditions,formalExcluded:formalForms.excludedFromFormal.Mathematics.length,contentCorrections:Object.keys(corrections).length,answerMix,uiModules:['premium-v1','practice-flow-v1','home-insights-v1','challenge-v1','formal-tests-v1'],output:'dist'}));