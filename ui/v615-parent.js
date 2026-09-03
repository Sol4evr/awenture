(()=>{
'use strict';
let pollTimer=0,polling=false;
const ACTIVE=new Set(['queued','generating','review','expert_review','approved']);
function parentRoot(node=document){return node.closest?.('[data-aw-insights="1"]')||document.querySelector('[data-aw-insights="1"]')||document}
function syncExpandedState(root=document){root.querySelectorAll('.aw-subskill-details').forEach(details=>details.querySelector('summary')?.setAttribute('aria-expanded',String(details.open)))}
function wireSubskills(){document.querySelectorAll('.aw-subskill-details').forEach(details=>{if(details.dataset.awCollapsible==='1')return;const summary=details.querySelector('summary');if(!summary)return;details.dataset.awCollapsible='1';summary.setAttribute('aria-expanded',String(details.open));details.addEventListener('toggle',()=>{const root=parentRoot(details);if(details.open)root.querySelectorAll('.aw-subskill-details[open]').forEach(other=>{if(other!==details)other.removeAttribute('open')});syncExpandedState(root)})})}
function schedulePoll(delay=5000){clearTimeout(pollTimer);if(document.querySelector('[data-aw-insights="1"]'))pollTimer=setTimeout(pollStatus,delay)}
async function pollStatus(){if(polling||!document.querySelector('[data-aw-insights="1"]'))return;const api=window.__AW_TOPUP_API,current=api?.load?.();if(!current||!ACTIVE.has(current.backendStatus)){if(current?.backendStatus==='released')window.__AW_RELEASED_BANK_API?.refresh?.();return}polling=true;try{const next=await api.refreshStatus();if(next?.backendStatus!==current.backendStatus)api.render?.();if(next?.backendStatus==='released')await window.__AW_RELEASED_BANK_API?.refresh?.();else if(ACTIVE.has(next?.backendStatus))schedulePoll()}finally{polling=false}}
function sync(){wireSubskills();const status=window.__AW_TOPUP_API?.load?.()?.backendStatus;if(ACTIVE.has(status)&&!pollTimer)schedulePoll(800)}
let q=false;function schedule(){if(q)return;q=true;requestAnimationFrame(()=>{q=false;sync()})}
new MutationObserver(schedule).observe(document.getElementById('app')||document.body,{childList:true,subtree:true});sync();
window.__AW_PARENT_UI={subskillsCollapsedByDefault:true,singleOpenAccordion:true,isolatedSubjectAccordion:true,visualSubjectCues:true,statusPolling:true};
})();
