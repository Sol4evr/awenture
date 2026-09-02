(()=>{
'use strict';
const ENDPOINT='https://yvvwjdnazxzhzrfhudwx.supabase.co/functions/v1/released-bank';
const CACHE_KEY='awenture-released-bank-v1';
const SUBJECTS=new Set(['English','Mathematics','Science']);
const LETTERS=new Set(['A','B','C','D']);
const UNSAFE=new Set(['M09','M18','M19','M23','M26','M31']);
function safeVisual(v){return /<svg\b/i.test(v)&&/role=["']img["']/i.test(v)&&/aria-label=["'][^"']+["']/i.test(v)&&!/<(?:script|foreignObject|iframe|object|embed|audio|video|style)\b/i.test(v)&&!/(?:on\w+\s*=|javascript:|data:text\/html|https?:\/\/|href\s*=|xlink:href\s*=)/i.test(v)}
function valid(q){if(!q||typeof q!=='object'||!/^QF-[EMS]-/.test(String(q.id||''))||UNSAFE.has(String(q.id||'')))return false;if(!SUBJECTS.has(q.subject)||!q.skill||!q.subskill||!q.family)return false;if(String(q.question||'').trim().length<20||!Array.isArray(q.options)||q.options.length!==4||q.options.some(x=>typeof x!=='string')||new Set(q.options.map(x=>x.trim().toLowerCase())).size!==4)return false;if(!LETTERS.has(q.answer)||String(q.explanation||'').trim().length<12)return false;if(!['text','visual'].includes(q.kind)||q.kind==='visual'&&!safeVisual(String(q.visual||'')))return false;return q?.quality?.review==='dual-pass-released'&&q?.quality?.independentSolve===true&&/^aw-content-release-1\.(?:1|2)\./.test(String(q?.quality?.releaseGate||''))}
function sync(items){const bank=Array.isArray(window.AW_BANK)?window.AW_BANK:null;if(!bank)return 0;const staticItems=bank.filter(q=>!String(q?.id||'').startsWith('QF-')),ids=new Set(staticItems.map(q=>q.id)),approved=[];for(const q of Array.isArray(items)?items:[]){if(valid(q)&&!ids.has(q.id)){approved.push(q);ids.add(q.id)}}bank.splice(0,bank.length,...staticItems,...approved);for(const q of approved)window.__AW_REGISTER_DYNAMIC_QUESTION?.(q);if(window.__AW_RUNTIME_HEALTH){window.__AW_RUNTIME_HEALTH.bank=bank.length;window.__AW_RUNTIME_HEALTH.dynamicBank=approved.length;window.__AW_RUNTIME_HEALTH.subjects=Object.fromEntries([...SUBJECTS].map(s=>[s,bank.filter(q=>q.subject===s).length]))}return approved.length}
function cached(){try{return JSON.parse(localStorage.getItem(CACHE_KEY)||'null')}catch(_){return null}}
function save(data){try{localStorage.setItem(CACHE_KEY,JSON.stringify({release:data.release,updatedAt:data.updatedAt,items:(data.items||[]).filter(valid)}))}catch(_){}}
async function refresh(){const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),4500);try{const r=await fetch(ENDPOINT,{cache:'no-store',signal:controller.signal});if(!r.ok)throw new Error(`released bank ${r.status}`);const data=await r.json();if(data?.release!=='aw-dynamic-bank-1'||!Array.isArray(data.items))throw new Error('invalid released bank');save(data);const total=sync(data.items);window.dispatchEvent(new CustomEvent('awenture:released-bank',{detail:{total,updatedAt:data.updatedAt}}));return {ok:true,total}}catch(error){return {ok:false,error:String(error?.message||error)}}finally{clearTimeout(timeout)}}
const initial=cached();if(initial?.items)sync(initial.items);
window.__AW_RELEASED_BANK_API={endpoint:ENDPOINT,refresh,syncCached:()=>{const x=cached();return x?.items?sync(x.items):0},cacheKey:CACHE_KEY};
queueMicrotask(refresh);
setInterval(()=>{if(document.visibilityState==='visible')refresh()},300000);
window.addEventListener('focus',refresh);
})();