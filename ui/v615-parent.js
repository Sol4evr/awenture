(()=>{
'use strict';
function collapseSubskills(){document.querySelectorAll('.aw-subject-panel').forEach(panel=>{if(panel.dataset.awCollapsible==='1')return;const spectrum=panel.querySelector('.aw-subskill-spectrum');if(!spectrum)return;panel.dataset.awCollapsible='1';const subject=panel.querySelector('.aw-subject-head small')?.textContent?.trim()||'Subject';const attempted=panel.querySelector('.aw-subject-head>span')?.textContent?.trim()||'';const details=document.createElement('details');details.className='aw-subskill-details';details.dataset.parentSubskills=subject;const summary=document.createElement('summary');summary.innerHTML=`<span><b>Subskill performance</b><small>${attempted}</small></span><i aria-hidden="true">⌄</i>`;details.append(summary,spectrum);panel.append(details)})}
function releasedStatus(){const card=document.querySelector('[data-aw-insights="1"]');if(!card)return;const note=card.querySelector('.aw-request-note');if(note&&/· Released\./.test(note.textContent||'')){note.textContent=note.textContent.replace(/The validated question bank is unchanged until the normal release gate passes\.?/,'Dual-pass released questions are automatically synchronized into Daily Practice.');window.__AW_RELEASED_BANK_API?.refresh?.()}}
function sync(){collapseSubskills();releasedStatus()}
let q=false;function schedule(){if(q)return;q=true;requestAnimationFrame(()=>{q=false;sync()})}
new MutationObserver(schedule).observe(document.getElementById('app')||document.body,{childList:true,subtree:true});sync();
window.__AW_PARENT_UI={subskillsCollapsedByDefault:true};
})();