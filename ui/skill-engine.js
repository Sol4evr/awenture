(()=>{
'use strict';
/* v6.18.2 invisible skill-aware selector. No child-facing UI. */
const SUBJECT_PREFIX={English:'ENG',Mathematics:'MATH',Science:'SCI',Spelling:'SPELL'};
const UNSAFE_VISUAL_IDS=new Set(['M09','M18','M19','M23','M26','M31']);
const norm=x=>String(x??'').trim().toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'other';
const skillName=q=>String(q?.subskill||q?.skill||q?.strand||'Other').trim()||'Other';
const skillId=q=>`Y2.${SUBJECT_PREFIX[q?.subject]||'GEN'}.${norm(skillName(q)).toUpperCase().replaceAll('-','_')}`;
const family=(q,helpers)=>{try{return helpers?.familyKey?helpers.familyKey(q):String(q?.family||q?.id||'')}catch(_){return String(q?.family||q?.id||'')}};
function statFor(q,p){
  const stats=p?.skillStats&&typeof p.skillStats==='object'?p.skillStats:{};
  const raw=stats[`${q.subject}|${skillName(q)}`]||stats[skillId(q)]||null;
  const a=Number(raw?.a)||0,c=Number(raw?.c)||0;
  return {a,c,accuracy:a?c/a:null};
}
function score(q,p,seen,recent,helpers){
  const s=statFor(q,p),f=family(q,helpers);
  let n=0;
  if(!seen.has(q.id))n+=120; else n-=35;
  if(s.a===0)n+=70;
  else {n+=(1-s.accuracy)*65;n+=Math.max(0,18-Math.min(18,s.a*3));}
  if(recent.has(f))n-=55;
  if(q.kind==='visual')n+=2;
  return n;
}
function eligible(q,slot,chosenFamilies,chosenIds,helpers){
  if(!q||q.subject!==slot.subject||q.kind!==slot.kind)return false;
  if(UNSAFE_VISUAL_IDS.has(q.id))return false;
  if(chosenIds.has(q.id))return false;
  const f=family(q,helpers);if(chosenFamilies.has(f))return false;
  return true;
}
function rebalance(existing,bank,p,sd,helpers={}){
  try{
    if(!Array.isArray(existing)||existing.length!==15||!Array.isArray(bank))return existing;
    const expected={English:4,Mathematics:4,Science:4,Spelling:3};
    for(const [subject,count] of Object.entries(expected))if(existing.filter(q=>q?.subject===subject).length!==count)return existing;
    const seen=new Set(Array.isArray(p?.seenIds)?p.seenIds:[]),recent=helpers?.recent instanceof Set?helpers.recent:new Set();
    const chosen=[],chosenIds=new Set(),chosenFamilies=new Set();
    for(let i=0;i<existing.length;i++){
      const slot=existing[i],pool=bank.filter(q=>eligible(q,slot,chosenFamilies,chosenIds,helpers));
      pool.sort((a,b)=>score(b,p,seen,recent,helpers)-score(a,p,seen,recent,helpers)||String(a.id).localeCompare(String(b.id)));
      const best=pool[0]||slot;
      if(!best||chosenIds.has(best.id)||chosenFamilies.has(family(best,helpers)))return existing;
      chosen.push(best);chosenIds.add(best.id);chosenFamilies.add(family(best,helpers));
    }
    const visualBefore=existing.filter(q=>q?.kind==='visual').length,visualAfter=chosen.filter(q=>q?.kind==='visual').length;
    if(visualBefore!==visualAfter)return existing;
    for(const [subject,count] of Object.entries(expected))if(chosen.filter(q=>q.subject===subject).length!==count)return existing;
    return chosen;
  }catch(_){return existing;}
}
function graph(bank=window.AW_BANK){
  const out=new Map();
  for(const q of Array.isArray(bank)?bank:[]){const id=skillId(q);if(!out.has(id))out.set(id,{id,grade:2,subject:q.subject,name:skillName(q),questionCount:0});out.get(id).questionCount++;}
  return [...out.values()].sort((a,b)=>a.subject.localeCompare(b.subject)||a.name.localeCompare(b.name));
}
window.__AW_SKILL_ENGINE={version:'y2-v1',skillId,skillName,graph,rebalance};
})();
