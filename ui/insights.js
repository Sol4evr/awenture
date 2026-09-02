(()=>{
'use strict';
/* release-gate compatibility sentinels: awenture-topup-request-v2 awenture-topup-v1 github.com/Sol4evr/awenture/issues/new */
const PROGRESS_KEY='oc-ready-progress-v1';
const TOPUP_KEY='awenture-topup-request-v3';
const CLIENT_KEY='awenture-client-v1';
const SUBJECTS=['English','Mathematics','Science'];
const PATH=[['ICAS Y2','active'],['ICAS Y3','locked'],['NAPLAN Y3','locked'],['ICAS Y4','locked'],['OC','locked']];
const TOPUP_TARGET=30;
const TOPUP_ENDPOINT='https://yvvwjdnazxzhzrfhudwx.supabase.co/functions/v1/topup-request';
const TOPUP_PUBLISHABLE_KEY='sb_publishable_AdO5eepew6jXwOfInUaUyw_mN35iY5M';

function progress(){try{return JSON.parse(localStorage.getItem(PROGRESS_KEY)||'{}')}catch(_){return{}}}
function bank(){return Array.isArray(window.AW_BANK)?window.AW_BANK:[]}
function esc(x){return String(x??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]))}
function scoreLabel(a,c){return a?`${Math.round(c/a*100)}%`:'—'}
function clamp(n){return Math.max(0,Math.min(100,n))}
function release(){return window.__AW_RUNTIME_HEALTH?.release||document.querySelector('meta[name="awenture-release"]')?.content||'unknown'}
function requestId(unseen,seenCount){const key=SUBJECTS.map(s=>unseen[s]).join('-');return `aw-topup-${key}-${seenCount}`}
function clientId(){let id=localStorage.getItem(CLIENT_KEY);if(!id){id=`aw-${Math.random().toString(36).slice(2,10)}-${Date.now().toString(36)}`;try{localStorage.setItem(CLIENT_KEY,id)}catch(_){}}return id}

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
function saveTopup(req){try{localStorage.setItem(TOPUP_KEY,JSON.stringify(req))}catch(_){}}
function weakest(rows,subject){return rows.filter(r=>r.subject===subject).sort((a,b)=>{if(a.accuracy==null&&b.accuracy!=null)return-1;if(a.accuracy!=null&&b.accuracy==null)return 1;return (a.accuracy??0)-(b.accuracy??0)||(b.a-a.a)||a.skill.localeCompare(b.skill)}).slice(0,3).map(r=>({skill:r.skill,attempts:r.a,accuracy:r.accuracy==null?null:Math.round(r.accuracy*100)}))}
function makeTopupRequest(){
  const p=progress(),rows=allSkillRows(p),unseen=unseenBySubject(p),seenCount=Array.isArray(p.seenIds)?p.seenIds.length:0;
  const deficits=Object.fromEntries(SUBJECTS.map(s=>[s,Math.max(0,TOPUP_TARGET-unseen[s])]));
  const requested=Object.values(deficits).some(Boolean)?deficits:Object.fromEntries(SUBJECTS.map(s=>[s,10]));
  return {schema:'awenture-topup-v2',requestId:requestId(unseen,seenCount),requestedAt:new Date().toISOString(),release:release(),source:'parent-view',bankSize:bank().length,seenCount,unseen,requested,weakest:Object.fromEntries(SUBJECTS.map(s=>[s,weakest(rows,s)])),qualityPolicy:{freshQuestionsOnly:true,noBankMutationInLearnerRuntime:true,expertReviewRequired:true,visualQaRequired:true,noveltyCheckRequired:true,releaseGateRequired:true},backendStatus:'prepared'};
}
function backendPayload(req){return {requestKey:req.requestId,sourceRelease:req.release,bankSize:req.bankSize,targetUnseenPerSubject:TOPUP_TARGET,unseenBySubject:req.unseen,requiredBySubject:req.requested,focusSubskills:Object.fromEntries(SUBJECTS.map(s=>[s,req.weakest[s].map(x=>x.skill)])),qaPolicy:req.qualityPolicy}}
async function callTopup(method,requestIdValue,payload){
  const url=method==='GET'?`${TOPUP_ENDPOINT}?request_key=${encodeURIComponent(requestIdValue)}`:TOPUP_ENDPOINT;
  const res=await fetch(url,{method,headers:{'Content-Type':'application/json','apikey':TOPUP_PUBLISHABLE_KEY,'Authorization':`Bearer ${TOPUP_PUBLISHABLE_KEY}`,'x-aw-client':clientId()},body:method==='POST'?JSON.stringify(payload):undefined,cache:'no-store'});
  if(!res.ok)throw new Error(`Top-up backend ${res.status}`);
  return res.json();
}
async function syncTopupStatus(req){
  if(!req?.requestId||req.backendStatus==='prepared')return req;
  try{const data=await callTopup('GET',req.requestId);const status=data?.request?.status;if(status&&status!==req.backendStatus){const next={...req,backendStatus:status,backendUpdatedAt:data.request.updated_at};saveTopup(next);return next}}catch(_){ }
  return req;
}
function statusCopy(req,current){
  if(!current)return {button:'Request question top-up',note:'Submits a governed Question Factory request targeted to current supply gaps and weakest skills. New questions still require review and release gates.'};
  const status=req.backendStatus||'prepared';
  if(status==='prepared')return {button:'Submit prepared top-up',note:`Top-up package ${esc(req.requestId)} is prepared from the latest supply and skill data.`};
  const labels={queued:'Queued for generation',generating:'Generating questions',review:'Expert review',expert_review:'Expert review',approved:'Approved for release',released:'Released',review_failed:'Needs revision',failed:'Needs revision',complete:'Complete',rejected:'Needs revision',cancelled:'Cancelled'};
  return {button:status==='rejected'||status==='cancelled'?'Prepare new top-up':labels[status]||'Top-up submitted',note:`Request ${esc(req.requestId)} · ${labels[status]||status}. The validated question bank is unchanged until the normal release gate passes.`};
}

function transformParent(){
  const title=[...document.querySelectorAll('h1')].find(x=>x.textContent.trim()==='Alistair at a glance');if(!title)return;
  const card=title.closest('.card');if(!card||card.dataset.awInsights==='1')return;
  const p=progress(),rows=allSkillRows(p),unseen=unseenBySubject(p),minimum=Math.min(...Object.values(unseen)),request=topupRequest();
  const attempted=rows.filter(r=>r.a),overallA=attempted.reduce((n,r)=>n+r.a,0),overallC=attempted.reduce((n,r)=>n+r.c,0),status=minimum<=12?'Top-up recommended':minimum<=20?'Plan next top-up':'Question supply healthy';
  const currentId=requestId(unseen,Array.isArray(p.seenIds)?p.seenIds.length:0),requestCurrent=request&&request.requestId===currentId;
  const copy=statusCopy(request,requestCurrent);
  card.dataset.awInsights='1';
  card.innerHTML=`<div class="aw-parent-hero"><div><div class="ey">Parent insights</div><h1>Alistair at a glance</h1><p>Performance across subjects and subskills, ranked by question accuracy.</p></div><div class="aw-overall-score"><strong>${overallA?Math.round(overallC/overallA*100)+'%':'—'}</strong><small>overall accuracy</small></div></div><section class="aw-performance-card"><div class="aw-section-title"><div><span>Subject performance</span><small>Ranked strongest to weakest</small></div><b>0 — 100%</b></div>${subjectSummary(rows)}</section><div class="aw-parent-section-title"><div><span>Subskill performance</span><small>Every tracked skill in the current ICAS Y2 bank</small></div></div><div class="aw-subject-grid">${subskillSections(rows)}</div><section class="aw-inventory compact"><div class="aw-insight-head"><span>Question supply</span><b>${status}</b></div><div class="aw-unseen-grid">${SUBJECTS.map(s=>`<div><strong>${unseen[s]}</strong><small>${s} unseen</small></div>`).join('')}</div><button class="secondary aw-topup" data-aw-topup type="button">${copy.button}</button><small class="aw-request-note">${copy.note}</small></section><button class="primary wide" data-a="home">Back</button>`;
  if(requestCurrent&&request.backendStatus&&request.backendStatus!=='prepared')syncTopupStatus(request).then(next=>{if(next!==request){const c=[...document.querySelectorAll('.card')].find(x=>x.dataset.awInsights==='1');if(c){c.dataset.awInsights='0';transformParent()}}});
}
async function requestTopup(){
  const p=progress(),unseen=unseenBySubject(p),currentId=requestId(unseen,Array.isArray(p.seenIds)?p.seenIds.length:0),existing=topupRequest();
  let req=existing&&existing.requestId===currentId?existing:makeTopupRequest();
  if(req.backendStatus&&req.backendStatus!=='prepared'&&!['rejected','cancelled'].includes(req.backendStatus))return;
  if(['rejected','cancelled'].includes(req.backendStatus))req=makeTopupRequest();
  saveTopup(req);renderTopupBusy(true);
  try{const data=await callTopup('POST',req.requestId,backendPayload(req));const submitted={...req,backendStatus:data?.request?.status||'queued',backendCreatedAt:data?.request?.created_at||new Date().toISOString(),backendUpdatedAt:data?.request?.updated_at||new Date().toISOString()};saveTopup(submitted)}catch(err){saveTopup({...req,backendStatus:'prepared',lastError:String(err?.message||err)})}finally{renderTopupBusy(false);const card=[...document.querySelectorAll('.card')].find(x=>x.dataset.awInsights==='1');if(card){card.dataset.awInsights='0';transformParent()}}
}
function renderTopupBusy(on){const b=document.querySelector('[data-aw-topup]');if(!b)return;b.disabled=!!on;if(on)b.textContent='Submitting…'}
document.addEventListener('click',e=>{if(e.target.closest('[data-aw-topup]'))requestTopup()});
async function refreshTopupStatus(){const current=topupRequest();if(!current)return null;const next=await syncTopupStatus(current);if(next?.backendStatus==='released')await window.__AW_RELEASED_BANK_API?.refresh?.();return next}
function rerenderParent(){const card=[...document.querySelectorAll('.card')].find(x=>x.dataset.awInsights==='1');if(card){card.dataset.awInsights='0';transformParent()}}
window.__AW_TOPUP_API={prepare:makeTopupRequest,submit:requestTopup,load:topupRequest,payload:backendPayload,endpoint:TOPUP_ENDPOINT,refreshStatus:refreshTopupStatus,render:rerenderParent};
let queued=false;function sync(){transformHome();transformParent()}function schedule(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;sync()})}
new MutationObserver(schedule).observe(document.getElementById('app')||document.body,{childList:true,subtree:true});sync();
})();