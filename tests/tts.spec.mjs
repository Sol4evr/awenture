import {test,expect} from '@playwright/test';

async function installSpeechProbe(page){
  await page.addInitScript(()=>{
    const events=[];
    class Utterance{
      constructor(text){this.text=text;this.lang='';this.rate=1;this.pitch=1;this.voice=null;this.onend=null;this.onerror=null;this.onstart=null}
    }
    const synth={
      speaking:false,pending:false,paused:false,
      getVoices:()=>[{name:'Matilda',lang:'en-AU'}],
      speak(u){events.push({type:'speak',text:u.text,lang:u.lang,rate:u.rate,voice:u.voice?.name||null});this.speaking=true;u.onstart?.()},
      cancel(){events.push({type:'cancel'});this.speaking=false;this.pending=false},
      resume(){events.push({type:'resume'});this.paused=false}
    };
    Object.defineProperty(window,'SpeechSynthesisUtterance',{configurable:true,value:Utterance});
    Object.defineProperty(window,'speechSynthesis',{configurable:true,value:synth});
    window.__AW_SPEECH_PROBE={events,clear(){events.length=0}};
  });
}

async function openDaily(page){
  await page.route('**/released-bank',route=>route.fulfill({status:503,contentType:'application/json',body:'{}'}));
  await page.goto('/');
  await page.locator('[data-a="daily"]').click();
  await expect(page.locator('[data-a="read"]')).toBeVisible();
}

test('Daily Practice Read and Listen controls queue audible speech directly in Chromium and WebKit',async({page})=>{
  await installSpeechProbe(page);
  await openDaily(page);
  const dots=page.locator('[data-q]');
  let normalChecked=false,spellingChecked=false;
  for(let i=0;i<await dots.count();i++){
    await dots.nth(i).click();
    const button=page.locator('[data-a="read"]');
    const label=await button.textContent();
    if((label||'').includes('Listen to word')&&!spellingChecked){
      await page.evaluate(()=>window.__AW_SPEECH_PROBE.clear());
      await button.click();
      const events=await page.evaluate(()=>window.__AW_SPEECH_PROBE.events);
      expect(events[0]?.type).toBe('speak');
      expect(events[0]?.lang).toBe('en-AU');
      expect(events[0]?.voice).toBe('Matilda');
      expect(events[0]?.rate).toBe(.82);
      const parts=events[0].text.split('. ').filter(Boolean);
      expect(parts.length).toBeGreaterThanOrEqual(3);
      expect(parts[0]).toBe(parts.at(-1));
      await page.locator('[data-a="read"]').click();
      spellingChecked=true;
    }else if((label||'').includes('Read')&&!normalChecked){
      await page.evaluate(()=>window.__AW_SPEECH_PROBE.clear());
      await button.click();
      const events=await page.evaluate(()=>window.__AW_SPEECH_PROBE.events);
      expect(events[0]?.type).toBe('speak');
      expect(events[0]?.lang).toBe('en-AU');
      expect(events[0]?.rate).toBe(.92);
      expect(events[0]?.text.length).toBeGreaterThan(10);
      await page.locator('[data-a="read"]').click();
      normalChecked=true;
    }
    if(normalChecked&&spellingChecked)break;
  }
  expect(normalChecked).toBe(true);
  expect(spellingChecked).toBe(true);
});

test('Read control survives repeated question navigation without speech queue races',async({page})=>{
  await installSpeechProbe(page);
  await openDaily(page);
  for(let i=0;i<Math.min(5,await page.locator('[data-q]').count());i++){
    await page.locator('[data-q]').nth(i).click();
    await page.evaluate(()=>window.__AW_SPEECH_PROBE.clear());
    await page.locator('[data-a="read"]').click();
    const events=await page.evaluate(()=>window.__AW_SPEECH_PROBE.events.map(x=>x.type));
    expect(events[0]).toBe('speak');
    expect(events.slice(0,1)).not.toContain('cancel');
    await page.locator('[data-a="read"]').click();
  }
});

test('Generated subject-test Read controls use the same hardened speech runtime',async({page})=>{
  await installSpeechProbe(page);
  await page.route('**/formal-tests.js*',route=>route.fulfill({status:200,contentType:'application/javascript',body:''}));
  await page.route('**/stage-formal-tests.js*',route=>route.fulfill({status:200,contentType:'application/javascript',body:''}));
  await page.goto('/');
  await page.locator('[data-a="tests"]').click();
  const subjects=page.locator('[data-s]');
  const subjectNames=await subjects.evaluateAll(nodes=>nodes.map(node=>node.dataset.s));
  expect(subjectNames).toEqual(expect.arrayContaining(['English','Mathematics','Science']));
  for(const subject of subjectNames){
    await page.locator(`[data-s="${subject}"]`).click();
    const button=page.locator('[data-a="read"]');
    await expect(button).toBeVisible();
    await page.evaluate(()=>window.__AW_SPEECH_PROBE.clear());
    await button.click();
    const event=await page.evaluate(()=>window.__AW_SPEECH_PROBE.events[0]);
    expect(event?.type).toBe('speak');
    expect(event?.lang).toBe('en-AU');
    expect(event?.rate).toBe(subject==='Spelling'?.82:.92);
    await page.locator('[data-a="home"]').first().click();
    await page.locator('[data-a="tests"]').click();
  }
});
