(()=>{'use strict';
const PROGRESS_KEY='oc-ready-progress-v1',BONUS_KEY='awenture-bonus-v1';
const qs=(s,r=document)=>r.querySelector(s);
function load(key,fallback){try{return Object.assign({},fallback,JSON.parse(localStorage.getItem(key)||'{}'))}catch(_){return {...fallback}}}
function dayOf(value){const d=new Date(value);if(Number.isNaN(+d))return null;return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
function today(){return dayOf(new Date())}
function uniqueDays(items,pred=()=>true){return [...new Set((items||[]).filter(pred).map(x=>dayOf(x.date)).filter(Boolean))].sort()}
function consecutiveEndingToday(days){const set=new Set(days),d=new Date();let n=0;for(;;){const k=dayOf(d);if(!set.has(k))break;n++;d.setDate(d.getDate()-1)}return n}
function latestDailyPerfect(p){const t=today();return [...(p.attempts||[])].reverse().some(a=>a.type==='practice'&&a.subject==='Daily'&&dayOf(a.date)===t&&Number(a.score)===100)}
function bonusState(){return load(BONUS_KEY,{attempts:[],streak:0,bestStreak:0})}
function bonusToday(b){return (b.attempts||[]).find(a=>a.date===today())||null}
function bonusCard(){
  const h1=[...document.querySelectorAll('h1')].find(x=>/Hello Alistair/i.test(x.textContent||''));if(!h1)return;
  const hero=h1.closest('.card');if(!hero||document.querySelector('[data-aw-bonus-card]'))return;
  const p=load(PROGRESS_KEY,{attempts:[]}),b=bonusState(),done=bonusToday(b),unlocked=latestDailyPerfect(p);
  let state='locked',pill='Locked',copy='Get every question correct in today’s 12-question practice to unlock one Difficulty 5 Bonus Challenge.',button='';
  if(done){state=done.correct?'complete':'attempted';pill=done.correct?'Complete':'Attempted';copy=done.correct?`Excellent work — today’s challenge is complete. Current bonus streak: ${b.streak||1} day${(b.streak||1)===1?'':'s'}.`:'Today’s challenge is finished. A new challenge can be earned tomorrow.'}
  else if(unlocked){state='unlocked';pill='Unlocked';copy='Perfect practice! One harder reasoning challenge is ready. It is scored separately from normal practice.';button='<button class="aw-bonus-action" data-aw-bonus-start>Start Bonus Challenge</button>'}
  const streak=b.streak||0;
  const el=document.createElement('section');el.className=`aw-bonus-card ${state}`;el.dataset.awBonusCard='';
  el.innerHTML=`<div class="aw-bonus-top"><div class="aw-bonus-title"><span class="aw-bonus-orb">✦</span><span>Bonus Challenge</span></div><span class="aw-bonus-pill">${pill}</span></div><p>${copy}</p>${button}<div class="aw-bonus-progress" aria-label="Bonus challenge achievement progress"><span class="${streak>=3?'on':''}"></span><span class="${streak>=5?'on':''}"></span><span class="${streak>=7?'on':''}"></span></div>`;
  hero.insertAdjacentElement('afterend',el);
}
function metricLevel(v,[b,s,g],activeDays,{goldDays=30,bonus=false}={}){if(v>=g&&(bonus||activeDays>=goldDays))return'gold';if(v>=s)return'silver';if(v>=b)return'bronze';return'grey'}
function renderAwards(){
  const collection=qs('.collection');if(!collection||collection.dataset.awV2==='1')return;
  const p=load(PROGRESS_KEY,{attempts:[],skillStats:{}}),b=bonusState(),attempts=p.attempts||[];
  const days=uniqueDays(attempts),activeDays=days.length,currentStreak=consecutiveEndingToday(days),perfectDays=uniqueDays(attempts,a=>Number(a.score)===100).length;
  const stats=Object.values(p.skillStats||{}),conf=stats.filter(x=>(x.a||0)>=3&&(x.c||0)/(x.a||1)>=.8&&(x.guess||0)/(x.a||1)<.2).length;
  const totalFull=attempts.filter(x=>x.type==='icas-test').length;
  const awards=[
    ['🧭','Adventure Streak',currentStreak,[7,14,30],'days',{}],
    ['🌱','Practice Explorer',activeDays,[7,14,30],'active days',{}],
    ['🎯','Perfect Practice',perfectDays,[3,10,25],'perfect days',{}],
    ['🧠','Confidence Champion',conf,[2,5,8],'confident skills',{}],
    ['🏆','ICAS Challenger',totalFull,[3,9,18],'papers',{}],
    ['✦','Bonus Challenger',b.streak||0,[3,5,7],'consecutive days',{bonus:true,goldDays:0}]
  ];
  const names={grey:'Locked',bronze:'Bronze',silver:'Silver',gold:'Gold'};
  collection.dataset.awV2='1';
  collection.insertAdjacentHTML('beforebegin',`<div class="aw-awards-note">Gold in the main collection represents sustained effort: it cannot unlock before 30 distinct active practice days. Bonus Challenger follows its own 3 / 5 / 7 consecutive-day ladder.</div>`);
  collection.innerHTML=awards.map(([ic,n,v,t,u,rule])=>{const level=metricLevel(v,t,activeDays,rule),next=level==='grey'?t[0]:level==='bronze'?t[1]:level==='silver'?t[2]:null,goldBlocked=!rule.bonus&&v>=t[2]&&activeDays<30;return `<div class="ach aw-ach ${goldBlocked?'locked-gold':''}"><div class="row"><div class="icon ${level}">${ic}</div><div><b>${n}</b><br><small>${names[level]}</small></div></div><div class="mile"><i class="${v>=t[0]?'on b':''}"></i><i class="${v>=t[1]?'on s':''}"></i><i class="${v>=t[2]&&(rule.bonus||activeDays>=30)?'on g':''}"></i></div><small class="aw-ach-meta">${next?`${v}/${next} ${u}${level==='silver'&&!rule.bonus?' · Gold also needs 30 active days':''}`:`${v} ${u} · Gold achieved ✨`}</small></div>`}).join('');
  const h1=qs('h1',collection.closest('.card'));if(h1)h1.textContent='6 achievements';
}
function sync(){bonusCard();renderAwards()}
document.addEventListener('click',e=>{const b=e.target.closest('[data-aw-bonus-start]');if(!b)return;b.disabled=true;const ok=window.__AW_BONUS_API?.start?.();if(!ok)b.disabled=false});
new MutationObserver(()=>queueMicrotask(sync)).observe(document.documentElement,{subtree:true,childList:true});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',sync);else sync();
})();
