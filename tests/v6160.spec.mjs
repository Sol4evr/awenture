import {test,expect} from '@playwright/test';

test('v6.16.0 Daily Practice contains 15 questions with three audio spelling items',async({page})=>{
  await page.route('**/released-bank',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({release:'aw-dynamic-bank-1',count:0,items:[]})}));
  await page.addInitScript(()=>{
    class U{constructor(text){this.text=text;this.voice=null;this.rate=1;this.pitch=1;this.onend=null;this.onerror=null}}
    Object.defineProperty(window,'SpeechSynthesisUtterance',{configurable:true,value:U});
    Object.defineProperty(window,'speechSynthesis',{configurable:true,value:{cancel(){},getVoices(){return[{name:'Karen',lang:'en-AU'}]},speak(u){window.__awSpoken={text:u.text,rate:u.rate,pitch:u.pitch};}}});
  });
  await page.goto('/');
  await page.evaluate(()=>localStorage.setItem('oc-ready-progress-v1',JSON.stringify({attempts:[],seenIds:[],reviewQueue:[],recentFamilies:[],xp:0,streak:0,skillStats:{},lastActiveDate:null})));
  await page.reload();await page.locator('[data-a="daily"]').click();await expect(page.locator('.test-player')).toBeVisible();
  await expect(page.locator('.progressdot')).toHaveCount(15);
  let spelling=0,spellingIndex=-1;
  for(let i=0;i<15;i++){
    await page.locator(`[data-q="${i}"]`).click();
    const isSpelling=await page.locator('[data-a="read"]').textContent().then(x=>x.includes('Listen to word'));
    if(isSpelling){spelling++;if(spellingIndex<0)spellingIndex=i;await expect(page.locator('.aw-spelling-listen')).toContainText('Listen to word');await expect(page.locator('.question-pane .q')).toHaveText('Listen to the word. Which spelling is correct?');}
  }
  expect(spelling).toBe(3);expect(spellingIndex).toBeGreaterThanOrEqual(0);
  await page.locator(`[data-q="${spellingIndex}"]`).click();
  const optionText=await page.locator('.opt').allTextContents();
  const stimulusText=await page.locator('.stimulus-pane').innerText();
  for(const raw of optionText){const word=raw.replace(/^[A-D]\s*/,'').trim();expect(stimulusText).not.toContain(word)}
  await page.locator('[data-a="read"]').click();
  const spoken=await page.evaluate(()=>window.__awSpoken);
  expect(spoken).toBeTruthy();expect(spoken.rate).toBe(.82);expect(spoken.text.split('.').filter(Boolean).length).toBeGreaterThanOrEqual(3);expect(spoken.text).not.toContain('A. ');expect(spoken.text).not.toContain('B. ');expect(spoken.text).not.toContain('C. ');expect(spoken.text).not.toContain('D. ');
});

test('v6.16.0 Parent View includes isolated Spelling insights without adding spelling to top-up backend scope',async({page})=>{
  await page.route('**/released-bank',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({release:'aw-dynamic-bank-1',count:0,items:[]})}));
  await page.goto('/');await page.locator('[data-a="parent"]').click();
  const panels=page.locator('.aw-subskill-details');await expect(panels).toHaveCount(4);await expect(page.locator('[data-parent-subskills="Spelling"]')).toBeVisible();
  const spelling=page.locator('[data-parent-subskills="Spelling"]'),maths=page.locator('[data-parent-subskills="Mathematics"]');
  await spelling.locator('summary').click();await expect(spelling).toHaveAttribute('open','');await maths.locator('summary').click();await expect(maths).toHaveAttribute('open','');await expect(spelling).not.toHaveAttribute('open','');
  const payload=await page.evaluate(()=>window.__AW_TOPUP_API?.prepare?.());
  expect(Object.keys(payload.requested).sort()).toEqual(['English','Mathematics','Science']);expect(payload.unseen.Spelling).toBeGreaterThan(0);
});
