(()=>{'use strict';
const SUBJECTS=['English','Mathematics','Science'];
const qs=(s,r=document)=>r.querySelector(s);
function transformTests(){
  const h1=[...document.querySelectorAll('h1')].find(x=>(x.textContent||'').trim()==='Subject tests');
  if(!h1)return;
  const card=h1.closest('.card'),grid=card&&qs('.grid',card);if(!grid||grid.dataset.awFormal==='1')return;
  const forms=window.__AW_FORMAL_FORMS;if(!forms)return;
  grid.dataset.awFormal='1';grid.classList.add('aw-form-grid');
  grid.innerHTML=SUBJECTS.map(subject=>{
    const cfg=forms.conditions[subject],subjectForms=forms.forms[subject];
    return `<section class="aw-form-subject"><div class="aw-form-heading"><b>${subject}</b><span>${cfg.questions} questions · ${cfg.minutes} min</span></div><div class="aw-form-choices">${['A','B','C'].map(id=>`<button class="tile aw-form-tile" data-aw-form-subject="${subject}" data-aw-form-id="${id}"><b>Paper ${id}</b><span>Formal timed test</span></button>`).join('')}</div></section>`;
  }).join('');
  const p=card.querySelector('p');if(!p){const note=document.createElement('p');note.className='aw-form-note';note.textContent='Choose a fixed Paper A, B or C. Answers are marked only after submission, and the paper submits automatically when time expires.';h1.insertAdjacentElement('afterend',note)}
}
function sync(){transformTests()}
document.addEventListener('click',e=>{const b=e.target.closest('[data-aw-form-id]');if(!b)return;e.preventDefault();e.stopPropagation();window.__AW_FORMAL_API?.start?.(b.dataset.awFormSubject,b.dataset.awFormId)},true);
new MutationObserver(()=>queueMicrotask(sync)).observe(document.documentElement,{subtree:true,childList:true});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',sync);else sync();
})();