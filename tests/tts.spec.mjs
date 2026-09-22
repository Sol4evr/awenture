import {test,expect} from '@playwright/test';

async function disableWebSpeech(page){
  await page.addInitScript(()=>{
    Object.defineProperty(window,'SpeechSynthesisUtterance',{configurable:true,value:undefined});
    Object.defineProperty(window,'speechSynthesis',{configurable:true,value:undefined});
  });
}

async function openDaily(page){
  await page.route('**/released-bank',route=>route.fulfill({status:503,contentType:'application/json',body:'{}'}));
  await page.goto('/');
  await page.locator('[data-a="daily"]').click();
  await expect(page.locator('[data-a="read"]')).toBeVisible();
}

async function expectBundledAudio(page){
  await expect.poll(()=>page.evaluate(()=>window.__AW_AUDIO_HEALTH?.state)).toMatch(/playing|ended/);
  const health=await page.evaluate(()=>window.__AW_AUDIO_HEALTH);
  expect(health.mode).toBe('bundled-media');
  expect(health.questionId).toBeTruthy();
  expect(health.error).toBeNull();
}

test('Daily Practice Read and Listen play real bundled media without Web Speech',async({page})=>{
  await disableWebSpeech(page);
  await openDaily(page);
  const dots=page.locator('[data-q]');
  let normalChecked=false,spellingChecked=false;
  for(let i=0;i<await dots.count();i++){
    await dots.nth(i).click();
    const button=page.locator('[data-a="read"]');
    const label=(await button.textContent())||'';
    if(label.includes('Listen to word')&&!spellingChecked){
      const responsePromise=page.waitForResponse(response=>response.url().includes('/audio/tts-v1/')&&response.status()===200);
      await button.click();
      expect((await responsePromise).headers()['content-type']).toContain('audio/mpeg');
      await expectBundledAudio(page);
      await page.locator('[data-a="read"]').click();
      spellingChecked=true;
    }else if(label.includes('Read')&&!normalChecked){
      const responsePromise=page.waitForResponse(response=>response.url().includes('/audio/tts-v1/')&&response.status()===200);
      await button.click();
      expect((await responsePromise).headers()['content-type']).toContain('audio/mpeg');
      await expectBundledAudio(page);
      await page.locator('[data-a="read"]').click();
      normalChecked=true;
    }
    if(normalChecked&&spellingChecked)break;
  }
  expect(normalChecked).toBe(true);
  expect(spellingChecked).toBe(true);
});

test('Read survives repeated navigation without multiplying or leaking players',async({page})=>{
  await disableWebSpeech(page);
  await openDaily(page);
  for(let i=0;i<Math.min(5,await page.locator('[data-q]').count());i++){
    await page.locator('[data-q]').nth(i).click();
    await page.locator('[data-a="read"]').click();
    await expectBundledAudio(page);
    await page.locator('[data-a="read"]').click();
    await expect.poll(()=>page.evaluate(()=>window.__AW_AUDIO_HEALTH?.state)).toBe('stopped');
  }
});

test('Generated subject-test Read controls use bundled media in every subject',async({page})=>{
  await disableWebSpeech(page);
  await page.route('**/formal-tests.js*',route=>route.fulfill({status:200,contentType:'application/javascript',body:''}));
  await page.route('**/stage-formal-tests.js*',route=>route.fulfill({status:200,contentType:'application/javascript',body:''}));
  await page.goto('/');
  await page.locator('[data-a="tests"]').click();
  const subjects=await page.locator('[data-s]').evaluateAll(nodes=>nodes.map(node=>node.dataset.s));
  expect(subjects).toEqual(expect.arrayContaining(['English','Mathematics','Science']));
  for(const subject of subjects){
    await page.locator(`[data-s="${subject}"]`).click();
    await page.locator('[data-a="read"]').click();
    await expectBundledAudio(page);
    await page.locator('[data-a="read"]').click();
    await page.locator('[data-a="home"]').first().click();
    await page.locator('[data-a="tests"]').click();
  }
});

test('audio delivery failure is visible and accessible instead of silent',async({page})=>{
  await disableWebSpeech(page);
  await page.route('**/audio/tts-v1/*.mp3*',route=>route.abort());
  await openDaily(page);
  await page.locator('[data-a="read"]').click();
  const status=page.locator('[role="status"]');
  await expect(status).toHaveText('Audio is unavailable on this device.');
  await expect.poll(()=>page.evaluate(()=>window.__AW_AUDIO_HEALTH?.state)).toBe('error');
});
