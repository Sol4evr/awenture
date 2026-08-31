(()=>{
  'use strict';
  const DAILY_LABEL='ICAS-style Grade 2 Practice';
  function syncPresentationState(){
    const player=document.querySelector('.test-player');
    const brandText=document.querySelector('.testbrand span')?.textContent||'';
    document.body.classList.toggle('aw-assessment',!!player);
    document.body.classList.toggle('aw-daily-practice',!!player&&brandText.includes(DAILY_LABEL));
    document.body.classList.toggle('aw-formal-test',!!player&&!brandText.includes(DAILY_LABEL));

    const flag=document.querySelector('[data-a="flag"]');
    if(flag){
      flag.title='Mark this question to revisit during this test';
      flag.setAttribute('aria-label','Mark question for review');
    }
    document.querySelectorAll('.tile').forEach(el=>{
      if(!el.hasAttribute('aria-label')){
        const label=el.querySelector('b')?.textContent?.trim();
        if(label)el.setAttribute('aria-label',label);
      }
    });
  }
  const observer=new MutationObserver(syncPresentationState);
  observer.observe(document.getElementById('app')||document.body,{childList:true,subtree:true});
  syncPresentationState();
})();
