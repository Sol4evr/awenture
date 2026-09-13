(()=>{
'use strict';
const FLAG='awSkills619';
function framework(){return window.__AW_SKILLS_FRAMEWORK}
function bank(){return Array.isArray(window.AW_BANK)?window.AW_BANK:[]}
function esc(x){return String(x??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]))}
function activeGrade(){return '2'}
function coverage(){const fw=framework();return fw?fw.coverage(bank(),activeGrade()):null}
function skillFocus(limit=18){const fw=framework(),c=coverage();if(!fw||!c)return[];const ids=[...c.uncoveredSkillIds,...c.undercoveredSkillIds].slice(0,limit);return fw.safeSkills(ids)}
function installTopupExtension(){
  const api=window.__AW_TOPUP_API,fw=framework();if(!api||!fw||api.__skills619)return false;
  const original=api.payload.bind(api);
  api.payload=req=>{const base=original(req),c=coverage(),focus=skillFocus();return {...base,skillsFramework:fw.version,focusSkillIds:focus.map(x=>x.id),focusSkills:focus,skillsCoverage:c?{grade:c.grade,totalSkills:c.totalSkills,coveredSkills:c.coveredSkills,uncoveredCount:c.uncoveredSkillIds.length,undercoveredCount:c.undercoveredSkillIds.length}:null,progressionCredit:false,automaticPromotion:false}};
  api.__skills619=true;return true;
}
function subjectBlock(c,subject){const rows=c.skills.filter(s=>s.subject===subject),covered=rows.filter(s=>s.questionCount>0).length,domains=[...new Set(rows.map(s=>s.domain))];return `<details class="aw-skills-subject" data-aw-skills-subject="${esc(subject)}"><summary role="button" aria-expanded="false"><span class="aw-subject-summary-leading"><span class="aw-subject-copy"><b>${esc(subject==='Mathematics'?'Maths':subject)}</b><small>${covered} of ${rows.length} framework skills have verified metadata matches</small></span></span><strong class="aw-subject-score">${rows.length?Math.round(covered/rows.length*100):0}%</strong><span class="aw-subject-chevron" aria-hidden="true">⌄</span></summary><div class="aw-skills-domains">${domains.map(domain=>{const d=rows.filter(s=>s.domain===domain),dc=d.filter(s=>s.questionCount>0).length;return `<div class="aw-skill-domain"><div><b>${esc(domain)}</b><small>${dc}/${d.length} mapped</small></div><ul>${d.map(s=>`<li class="${s.questionCount?'covered':'gap'}"><span>${esc(s.label)}</span><small>${s.questionCount?`${s.questionCount} mapped question${s.questionCount===1?'':'s'}`:'Top-up gap'}</small></li>`).join('')}</ul></div>`}).join('')}</div></details>`}
function mount(){
  installTopupExtension();
  const title=[...document.querySelectorAll('h1')].find(x=>x.textContent.trim()==='Alistair at a glance');if(!title)return false;
  const card=title.closest('.card');if(!card||card.dataset[FLAG]==='1'||!framework())return false;
  const c=coverage();if(!c)return false;
  const anchor=card.querySelector('.aw-inventory');if(!anchor)return false;
  const section=document.createElement('section');section.className='aw-performance-card aw-skills-coverage';section.dataset.awSkillsCoverage='1';
  const pct=c.totalSkills?Math.round(c.coveredSkills/c.totalSkills*100):0;
  section.innerHTML=`<div class="aw-section-title"><div><span>Skills coverage</span><small>AWenture framework · Year ${esc(c.grade)} · Parent View only</small></div><b>${pct}%</b></div><p class="aw-skills-note">${c.coveredSkills} of ${c.totalSkills} framework skills have a verified metadata match in the current practice bank. Unmapped skills remain gaps and are prioritised for governed Question Factory top-ups; coverage never unlocks progression.</p><div class="aw-subject-grid aw-skills-grid">${framework().subjects.map(s=>subjectBlock(c,s)).join('')}</div>`;
  anchor.parentNode.insertBefore(section,anchor);card.dataset[FLAG]='1';return true;
}
function onParentReady(){requestAnimationFrame(mount)}
window.addEventListener('aw:parent-view-ready',onParentReady);
installTopupExtension();
if(document.querySelector('h1')?.textContent.trim()==='Alistair at a glance')onParentReady();
window.__AW_SKILLS_PARENT={coverage,focus:skillFocus,mount,progressionEnabled:false,parentLifecycleOnly:true};
})();
