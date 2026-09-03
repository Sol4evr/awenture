(()=>{
'use strict';
const SOURCE={year:2016,subject:'Spelling',title:'Spelling Year 2 - With Answer',registered:true,assetReady:false};
function transformTests(){
  const h1=[...document.querySelectorAll('h1')].find(x=>(x.textContent||'').trim()==='Subject tests');
  if(!h1)return;
  const card=h1.closest('.card'),grid=card?.querySelector('.grid,.aw-form-grid');
  if(!grid||grid.querySelector('[data-aw-spelling-module]'))return;
  const section=document.createElement('section');
  section.className='aw-form-subject';section.dataset.awSpellingModule='1';
  section.innerHTML=`<div class="aw-form-heading"><b>Spelling</b><span>Year 2 · authorised 2016 source registered</span></div><div class="aw-form-choices"><button class="tile aw-form-tile aw-year-tile" type="button" disabled aria-disabled="true"><b>2016 paper</b><span>Source PDF asset required before activation</span></button></div>`;
  grid.appendChild(section);
  const note=card.querySelector('.aw-form-note');
  if(note)note.insertAdjacentHTML('beforeend',' Spelling is registered from the authorised 2016 Year 2 corpus; its original-paper player remains locked until the source PDF asset is present.');
}
function sync(){transformTests()}
let queued=false;function schedule(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;sync()})}
new MutationObserver(schedule).observe(document.getElementById('app')||document.body,{childList:true,subtree:true});sync();
window.__AW_SPELLING_MODULE={source:SOURCE,dailyGeneratedCount:3,targetDailyQuestionCount:15,status:'GENERATED_DAILY_READY_ORIGINAL_ASSET_PENDING'};
})();
