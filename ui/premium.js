(()=>{
  'use strict';
  const DAILY_LABEL='ICAS-style Grade 2 Practice';

  function composeAssessmentLayout(){
    const workspace=document.querySelector('.testworkspace');
    const stimulusPane=workspace?.querySelector('.stimulus-pane');
    const questionPane=workspace?.querySelector('.question-pane');
    if(!workspace||!stimulusPane||!questionPane)return;

    const visual=stimulusPane.querySelector('.stimulus-visual');
    const text=stimulusPane.querySelector('.stimulus-text');
    const hasVisual=!!visual&&!!visual.textContent?.trim()||!!visual?.querySelector('svg,table,img,.visual');
    const hasText=!!text&&!!text.textContent?.trim();

    workspace.classList.toggle('aw-visual-stimulus',hasVisual);
    workspace.classList.toggle('aw-question-only',!hasVisual);

    const oldInline=questionPane.querySelector('.aw-inline-stimulus');
    if(oldInline)oldInline.remove();

    if(hasVisual){
      stimulusPane.hidden=false;
      return;
    }

    stimulusPane.hidden=true;
    if(hasText){
      const inline=document.createElement('div');
      inline.className='aw-inline-stimulus';
      inline.innerHTML=text.innerHTML;
      const q=questionPane.querySelector('.q');
      if(q)questionPane.insertBefore(inline,q);
    }
  }

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
    composeAssessmentLayout();
  }

  let scheduled=false;
  function scheduleSync(){
    if(scheduled)return;
    scheduled=true;
    requestAnimationFrame(()=>{scheduled=false;syncPresentationState();});
  }
  const observer=new MutationObserver(scheduleSync);
  observer.observe(document.getElementById('app')||document.body,{childList:true,subtree:true});
  syncPresentationState();
})();
