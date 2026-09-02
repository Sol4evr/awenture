(()=>{
'use strict';
const ENDPOINT='https://yvvwjdnazxzhzrfhudwx.supabase.co/functions/v1/released-bank';
const CACHE_KEY='awenture-released-bank-v1';
const SUBJECTS=new Set(['English','Mathematics','Science']);
const LETTERS=new Set(['A','B','C','D']);
function valid(q){if(!q||typeof q!=='object'||!/^QF-[EMS]-/.test(String(q.id||'')))return false;if(!SUBJECTS.has(q.subject)||!q.skill||!q.subskill||!q.family)return false;if(String(q.question||'').trim().length<20||!Array.isArray(q.options)||q.options.length!==4||new Set(q.options.map(x=>String(x).trim().toLowerCase())).size!==4)return false;if(!LETTERS.has(q.answer)||String(q.explanation||'').trim().length<28)return false;if(!['text','visual'].includes(q.kind))return false;if(q.kind==='visual'&&(!String(q.visual||'').includes('<svg')||!/role=["']img["']/.test(String(q.visual))||!/aria-label=/.test(String(q.visual))))return false;return q?.quality?.review==='dual-pass-released'}
function merge(items){const bank=Array.isArray(window.AW_BANK)?window.AW_BANK:null;if(!bank)return 0;const ids=new Set(bank.map(q=>q.id));let n=0;for(const q of Array.isArray(items)?items:[]){if(valid(q)&&!ids.has(q.id)){bank.push(q);ids.add(q.id);n++}}if(window.__AW_RUNTIME_HEALTH){window.__AW_RUNTIME_HEALTH.bank=bank.length;window.__AW_RUNTIME_HEALTH.dynamicBank=bank.filter(q=>String(q.id).startsWith('QF-')).length}return n}
function cached(){try{return JSON.parse(localStorage.getItem(CACHE_KEY)||'null')}catch(_){return null}}
function save(data){try{localStorage.setItem(CACHE_KEY,JSON.stringify({release:data.release,updatedAt:data.updatedAt,items:(data.items||[]).filter(valid)}))}catch(_){}}
async function refresh(){try{const r=await fetch(ENDPOINT,{cache:'no-store'});if(!r.ok)throw new Error(`released bank ${r.status}`);const data=await r.json();if(data?.release!=='aw-dynamic-bank-1'||!Array.isArray(data.items))throw new Error('invalid released bank');save(data);const added=merge(data.items);window.dispatchEvent(new CustomEvent('awenture:released-bank',{detail:{added,total:data.items.length,updatedAt:data.updatedAt}}));return {ok:true,added,total:data.items.length}}catch(error){return {ok:false,error:String(error?.message||error)}}}
const c=cached();if(c?.items)merge(c.items);
window.__AW_RELEASED_BANK_API={endpoint:ENDPOINT,refresh,mergeCached:()=>{const x=cached();return x?.items?merge(x.items):0},cacheKey:CACHE_KEY};
refresh();
setInterval(()=>{if(document.visibilityState==='visible')refresh()},15000);
window.addEventListener('focus',refresh);
})();