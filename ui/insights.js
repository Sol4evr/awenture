(()=>{
'use strict';
const PROGRESS_KEY='oc-ready-progress-v1';
const TOPUP_KEY='awenture-topup-request-v2';
const SUBJECTS=['English','Mathematics','Science'];
const PATH=[['ICAS Y2','active'],['ICAS Y3','locked'],['NAPLAN Y3','locked'],['ICAS Y4','locked'],['OC','locked']];
const TOPUP_TARGET=30;
const TOPUP_REPO='https://github.com/Sol4evr/awenture/issues/new';

function progress(){try{return JSON.parse(localStorage.getItem(PROGRESS_KEY)||'{}')}catch(_){return{}}}
function bank(){return Array.isArray(window.AW_BANK)?window.AW_BANK:[]}
function esc(x){return String(x??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]))}
function scoreLabel(a,c){return a?`${Math.round(c/a*100)}%`:'—'}
function clamp(n){return Math.max(0,Math.min(100,n))}
function release(){return window.__AW_RUNTIME_HEALTH?.release||document.querySelector('meta[name="awenture-release"]')?.content||'unknown'}
function requestId(unseen,seenCount){const key=SUBJECTS.map(s=>unseen[s]).join('-');return `topup-${key}-${seenCount}`}

function transformHome(){
  const title=[...document.querySelectorAll('h1')].find(x=>x.textContent.includes('Hello Alistair'));
  if(!title)return;
  const hero=title.closest('.card');
  hero?.querySelector('.ey')?.remove();
  hero?.querySelector('.stats')?.remove();
  document.querySelector('[data-a="progress"]')?.remove();
  const pathCard=[...document.querySelectorAll('.card')].find(x=>x.querySelector('.path')&&x.textContent.includes('Learning path'));
  if(pathCard&&!pathCard.querySelector('.aw-learning-line'))pathCard.innerHTML=`<div class="ey">Learning path</div><div class="aw-learning-line">${PATH.map(([label,state],i)=>`<div class="aw-path-step ${state}"><div class="aw-path-dot">${state==='active'?'✓':'🔒'}</div><div class="aw-path-label">${esc(label)}</div>${i<PATH.length-1?'<div class="aw-path-rail"></div>':''}</div>`).join('')}</div>`;
  const love=document.querySelector('.love');if(love)love.innerHTML='Made with <span class="aw-heart" aria-label="love">♥</span> by Arthur Wang (daddy), 2026';
}

function allSkillRows(p){
  const stats=p.skillStats&&typeof p.skillStats==='object'?p.skillStats:{};
  const map=new Map();
  for(const q of bank()){
    const skill=q.subskill||q.skill||'Other',key=`${q.subject}|${skill}`;
    if(!map.has(key))map.set(key,{subject:q.subject,skill,a:0,c:0});
  }
  for(const [key,v] of Object.entries(stats)){
    const [subject,...rest]=key.split('|'),skill=rest.join('|')||subject,a=Number(v?.a)||0,c=Number(v?.c)||0;
    map.set(key,{subject,skill,a,c});
  }
  return [...map.values()].map(r=>({...r,accuracy:r.a?r.c/r.a:null}));
}
function subjectRows(rows){
  return SUBJECTS.map(subject=>{const r=rows.filter(x=>x.subject===subject),a=r.reduce((n,x)=>n+x.a,0),c=r.reduce((n,x)=>n+x.c,0);return{subject,a,c,accuracy:a?c/a:null}}).sort((a,b)=>(b.accuracy??-1)-(a.accuracy??-1));
}
function spectrumRow(r,rank){
  const value=r.accuracy==null?0:clamp(r.accuracy*100),label=scoreLabel(r.a,r.c);
  return `<div class="aw-spectrum-row ${r.a?'':'empty'}"><div class="aw-spectrum-rank">${rank}</div><div class="aw-spectrum-main"><div class="aw-spectrum-copy"><b>${esc(r.skill||r.subject)}</b><small>${r.a?`${r.c}/${r.a} correct`:'Not attempted yet'}</small></div><div class="aw-spectrum-track"><span class="aw-spectrum-fill" style="width:${value}%"></span><i class="aw-spectrum-dot" style="left:${value}%"></i></div></div><strong>${label}</strong></div>`;
}
function subjectSummary(rows){return `<div class="aw-subject-spectrum">${subjectRows(rows).map((r,i)=>spectrumRow({...r,skill:r.subject},i+1)).join('')}</div>`}
function subskillSections(rows){
  return SUBJECTS.map(subject=>{const ranked=rows.filter(r=>r.subject===subject).sort((a,b)=>{if(a.accuracy==null&&b.accuracy!=null)return 1;if(a.accuracy!=null&&b.accuracy==null)return-1;return (b.accuracy??0)-(a.accuracy??0)||(b.a-a.a)||a.skill.localeCompare(b.skill)});return `<section class="aw-subject-panel"><div class="aw-subject-head"><div><small>${esc(subject)}</small><h3>${esc(subject)} subskills</h3></div><span>${ranked.filter(x=>x.a).length}/${ranked.length} attempted</span></div><div class="aw-subskill-spectrum">${ranked.map((r,i)=>spectrumRow(r,i+1)).join('')}</div></section>`}).join('');
}
function unseenBySubject(p){const seen=new Set(Array.isArray(p.seenIds)?p.seenIds:[]),b=bank();return Object.fromEntries(SUBJECTS.map(s=>[s,b.filter(q=>q.subject===s&&!seen.has(q.id)).length]))}
function topupRequest(){try{return JSON.parse(localStorage.getItem(TOPUP_KEY)||'null')}catch(_){return null}}
function weakest(rows,subject){return rows.filter(r=>r.subject===subject).sort((a,b)=>{if(a.accuracy==null&&b.accuracy!=null)return-1;if(a.accuracy!=null&&b.accuracy==null)return 1;return (a.accuracy??0)-(b.accuracy??0)||(b.a-a.a)||a.skill.localeCompare(b.skill)}).slice(0,3).map(r=>({skill:r.skill,attempts:r.a,accuracy:r.accuracy==null?null:Math.round(r.accuracy*100)}))}
function makeTopupRequest(){
  const p=progress(),rows=allSkillRows(p),unseen=unseenBySubject(p),seenCount=Array.isArray(p.seenIds)?p.seenIds.length:0;
  const deficits=Object.fromEntries(SUBJECTS.map(s=>[s,Math.max(0,TOPUP_TARGET-unseen[s])]));
  const requested=Object.values(deficits).some(Boolean)?deficits:Object.fromEntries(SUBJECTS.map(s=>[s,10]));
  return {schema:'awenture-topup-v1',requestId:requestId(unseen,seenCount),requestedAt:new Date().toISOString(),release:release(),source:'parent-view',bankSize:bank().length,seenCount,unseen,requested,weakest:Object.fromEntries(SUBJECTS.map(s=>[s,weakest(rows,s)])),qualityPolicy:{freshQuestionsOnly:true,noBankMutationInLearnerRuntime:true,expertReviewRequired:true,visualQaRequired:true,releaseGateRequired:true}};
}
function issueUrl(req){
  const total=SUBJECTS.reduce((n,s)=>n+req.requested[s],0);
  const title=`Parent Top Up ${req.requestId}`;
  const lines=[
    '## AWenture governed question top-up',
    '',
    `Request ID: \`${req.requestId}\``,
    `Release: \`${req.release}\``,
    `Requested: ${req.requestedAt}`,
    '',
    '### Supply snapshot',
    ...SUBJECTS.map(s=>`- ${s}: ${req.unseen[s]} unseen; generate ${req.requested[s]} new approved questions`),
    '',
    '### Weak-skill targets',
    ...SUBJECTS.flatMap(s=>[`**${s}**`,...req.weakest[s].map(x=>`- ${x.skill}: ${x.attempts?`${x.accuracy}% across ${x.attempts} attempts`:'not attempted'}`)]),
    '',
    `Total requested: **${total}**`,
    '',
    '### Mandatory controls',
    '- Fresh questions only; no learner-runtime generation or direct bank mutation.',
    '- Run Expert Question Reviewer, duplicate/novelty checks, visual QA and the full release gate.',
    '- Preserve the hardened baseline and existing learner progress.',
    '',
    '<details><summary>Machine-readable request</summary>',
    '',
    '```json',JSON.stringify(req,null,2),'```','',
    '</details>'
  ];
  return `${TOPUP_REPO}?title=${encodeURIComponent(title)}&body=${encodeURIComponent(lines.join('\n'))}`;
}

function transformParent(){
  const title=[...document.querySelectorAll('h1')].find(x=>x.textContent.trim()==='Alistair at a glance');if(!title)return;
  const card=title.closest('.card');if(!card||card.dataset.awInsights==='1')return;
  const p=progress(),rows=allSkillRows(p),unseen=unseenBySubject(p),minimum=Math.min(...Object.values(unseen)),request=topupRequest();
  const attempted=rows.filter(r=>r.a),overallA=attempted.reduce((n,r)=>n+r.a,0),overallC=attempted.reduce((n,r)=>n+r.c,0),status=minimum<=12?'Top-up recommended':minimum<=20?'Plan next top-up':'Question supply healthy';
  const requestCurrent=request&&request.requestId===requestId(unseen,Array.isArray(p.seenIds)?p.seenIds.length:0);
  const buttonText=requestCurrent?'Open prepared top-up':'Prepare question top-up';
  card.dataset.awInsights='1';
  card.innerHTML=`<div class="aw-parent-hero"><div><div class="ey">Parent insights</div><h1>Alistair at a glance</h1><p>Performance across subjects and subskills, ranked by question accuracy.</p></div><div class="aw-overall-score"><strong>${overallA?Math.round(overallC/overallA*100)+'%':'—'}</strong><small>overall accuracy</small></div></div><section class="aw-performance-card"><div class="aw-section-title"><div><span>Subject performance</span><small>Ranked strongest to weakest</small></div><b>0 — 100%</b></div>${subjectSummary(rows)}</section><div class="aw-parent-section-title"><div><span>Subskill performance</span><small>Every tracked skill in the current ICAS Y2 bank</small></div></div><div class="aw-subject-grid">${subskillSections(rows)}</div><section class="aw-inventory compact"><div class="aw-insight-head"><span>Question supply</span><b>${status}</b></div><div class="aw-unseen-grid">${SUBJECTS.map(s=>`<div><strong>${unseen[s]}</strong><small>${s} unseen</small></div>`).join('')}</div><button class="secondary aw-topup" data-aw-topup type="button">${buttonText}</button>${requestCurrent?`<small class="aw-request-note">Top-up package ${esc(request.requestId)} is prepared from the latest supply and skill data. Opening it creates the governed processing ticket.</small>`:'<small class="aw-request-note">Creates a governed Question Factory request targeted to current supply gaps and weakest skills. New questions still require review and release gates.</small>'}</section><button class="primary wide" data-a="home">Back</button>`;
}
function requestTopup(){
  const req=makeTopupRequest();
  localStorage.setItem(TOPUP_KEY,JSON.stringify(req));
  const url=issueUrl(req);
  const opened=window.open(url,'_blank','noopener,noreferrer');
  if(!opened)window.location.href=url;
  const card=[...document.querySelectorAll('.card')].find(x=>x.dataset.awInsights==='1');if(card){card.dataset.awInsights='0';transformParent()}
}
document.addEventListener('click',e=>{if(e.target.closest('[data-aw-topup]'))requestTopup()});
window.__AW_TOPUP_API={prepare:makeTopupRequest,issueUrl,load:topupRequest};
let queued=false;function sync(){transformHome();transformParent()}function schedule(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;sync()})}
new MutationObserver(schedule).observe(document.getElementById('app')||document.body,{childList:true,subtree:true});sync();
})();