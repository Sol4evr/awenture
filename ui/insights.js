(()=>{
'use strict';
const PROGRESS_KEY='oc-ready-progress-v1';
const TOPUP_KEY='awenture-topup-request-v1';
const SUBJECTS=['English','Mathematics','Science'];
const PATH=[['ICAS Y2','active'],['ICAS Y3','locked'],['NAPLAN Y3','locked'],['ICAS Y4','locked'],['OC','locked']];

function progress(){try{return JSON.parse(localStorage.getItem(PROGRESS_KEY)||'{}')}catch(_){return{}}}
function bank(){return Array.isArray(window.AW_BANK)?window.AW_BANK:[]}
function pct(n){return `${Math.round(n*100)}%`}
function esc(x){return String(x??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]))}

function transformHome(){
  const title=[...document.querySelectorAll('h1')].find(x=>x.textContent.includes('Hello Alistair'));
  if(!title)return;
  const hero=title.closest('.card');
  hero?.querySelector('.ey')?.remove();
  hero?.querySelector('.stats')?.remove();

  const pathCard=[...document.querySelectorAll('.card')].find(x=>x.querySelector('.path')&&x.textContent.includes('Learning path'));
  if(pathCard&&!pathCard.querySelector('.aw-learning-line')){
    pathCard.innerHTML=`<div class="ey">Learning path</div><div class="aw-learning-line">${PATH.map(([label,state],i)=>`<div class="aw-path-step ${state}"><div class="aw-path-dot">${state==='active'?'✓':'🔒'}</div><div class="aw-path-label">${esc(label)}</div>${i<PATH.length-1?'<div class="aw-path-rail"></div>':''}</div>`).join('')}</div>`;
  }
  const love=document.querySelector('.love');
  if(love)love.innerHTML='Made with <span class="aw-heart" aria-label="love">♥</span> by Arthur Wang (daddy), 2026';
}

function skillRows(p){
  const stats=p.skillStats&&typeof p.skillStats==='object'?p.skillStats:{};
  return Object.entries(stats).map(([key,v])=>{
    const a=Number(v?.a)||0,c=Number(v?.c)||0,guess=Number(v?.guess)||0,cw=Number(v?.certainWrong)||0;
    if(!a)return null;
    const [subject,...rest]=key.split('|');
    const skill=rest.join('|')||subject;
    const accuracy=c/a;
    const mastery=Math.max(0,Math.min(1,accuracy-(guess/a)*.08-(cw/a)*.12));
    return{subject,skill,a,c,accuracy,mastery};
  }).filter(Boolean);
}
function insightList(rows,type){
  if(!rows.length)return '<div class="aw-empty-insight">Complete a few practice sessions to build this insight.</div>';
  const sorted=[...rows].sort((a,b)=>type==='strong'?(b.mastery-a.mastery)||(b.a-a.a):(a.mastery-b.mastery)||(b.a-a.a)).slice(0,3);
  return `<div class="aw-skill-list">${sorted.map(r=>`<div class="aw-skill-row"><div><b>${esc(r.skill)}</b><small>${esc(r.subject)} · ${r.a} attempt${r.a===1?'':'s'}</small></div><strong>${pct(r.accuracy)}</strong></div>`).join('')}</div>`;
}
function unseenBySubject(p){
  const seen=new Set(Array.isArray(p.seenIds)?p.seenIds:[]),b=bank();
  return Object.fromEntries(SUBJECTS.map(s=>[s,b.filter(q=>q.subject===s&&!seen.has(q.id)).length]));
}
function topupRequest(){try{return JSON.parse(localStorage.getItem(TOPUP_KEY)||'null')}catch(_){return null}}

function transformParent(){
  const title=[...document.querySelectorAll('h1')].find(x=>x.textContent.trim()==='Alistair at a glance');
  if(!title)return;
  const card=title.closest('.card');
  if(!card||card.dataset.awInsights==='1')return;
  const p=progress(),rows=skillRows(p),unseen=unseenBySubject(p),minimum=Math.min(...Object.values(unseen)),request=topupRequest();
  const status=minimum<=12?'Top-up recommended':minimum<=20?'Plan next top-up':'Question supply healthy';
  card.dataset.awInsights='1';
  card.innerHTML=`<div class="ey">Parent insights</div><h1>Alistair at a glance</h1><div class="aw-parent-grid"><section class="aw-insight-card"><div class="aw-insight-head"><span>Strongest skills</span><b>↗</b></div>${insightList(rows.filter(r=>r.a>=2),'strong')}</section><section class="aw-insight-card"><div class="aw-insight-head"><span>Needs practice</span><b>↘</b></div>${insightList(rows.filter(r=>r.a>=1),'weak')}</section></div><section class="aw-inventory"><div><div class="aw-insight-head"><span>Unseen question inventory</span><b>${status}</b></div><p>Remaining approved questions that Alistair has not yet seen.</p></div><div class="aw-unseen-grid">${SUBJECTS.map(s=>`<div><strong>${unseen[s]}</strong><small>${s}</small></div>`).join('')}</div><button class="secondary aw-topup" data-aw-topup type="button">${request?'Top-up requested':'Request question top-up'}</button>${request?`<small class="aw-request-note">Requested ${new Date(request.requestedAt).toLocaleDateString('en-AU')}. This records a replenishment request; generation runs only when the question factory is connected.</small>`:'<small class="aw-request-note">Creates a replenishment request signal for the next question-bank generation cycle.</small>'}</section><button class="primary wide" data-a="home">Back</button>`;
}

function requestTopup(){
  const p=progress(),unseen=unseenBySubject(p);
  localStorage.setItem(TOPUP_KEY,JSON.stringify({requestedAt:new Date().toISOString(),unseen,source:'parent-view'}));
  const card=[...document.querySelectorAll('.card')].find(x=>x.dataset.awInsights==='1');
  if(card){card.dataset.awInsights='0';transformParent()}
}

document.addEventListener('click',e=>{if(e.target.closest('[data-aw-topup]'))requestTopup()});
let queued=false;
function sync(){transformHome();transformParent()}
function schedule(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;sync()})}
new MutationObserver(schedule).observe(document.getElementById('app')||document.body,{childList:true,subtree:true});
sync();
})();