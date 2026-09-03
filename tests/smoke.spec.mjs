import { test, expect } from '@playwright/test';

test('hardened learner shell, governed top-up, historical tests and bonus isolation', async ({ page }) => {
  const errors=[];page.on('pageerror',e=>errors.push(String(e)));
  let posted=null;
  await page.route('https://yvvwjdnazxzhzrfhudwx.supabase.co/functions/v1/released-bank',route=>route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({error:'offline'})}));
  await page.route('https://yvvwjdnazxzhzrfhudwx.supabase.co/functions/v1/topup-request*',async route=>{
    const req=route.request();
    if(req.method()==='POST'){
      posted=JSON.parse(req.postData()||'{}');
      await route.fulfill({status:202,contentType:'application/json',body:JSON.stringify({created:true,request:{request_key:posted.requestKey,status:'queued',created_at:new Date().toISOString(),updated_at:new Date().toISOString(),required_by_subject:posted.requiredBySubject}})});
    }else{
      const key=new URL(req.url()).searchParams.get('request_key');
      await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({request:{request_key:key,status:'queued',updated_at:new Date().toISOString(),required_by_subject:{English:10,Mathematics:10,Science:10}}})});
    }
  });
  await page.goto('/');
  await expect(page.getByText('Hello Alistair')).toBeVisible();
  await expect(page.getByText('My Collection')).toBeVisible();
  await expect(page.locator('[data-a="progress"]')).toHaveCount(0);
  await expect(page.locator('.stats')).toHaveCount(0);
  await expect(page.locator('.aw-learning-line')).toBeVisible();
  for(const label of ['ICAS Y2','ICAS Y3','NAPLAN Y3','ICAS Y4','OC'])await expect(page.locator('.aw-path-label',{hasText:label})).toBeVisible();
  await expect(page.getByText(/stable calibrated core/i)).toHaveCount(0);

  await page.locator('[data-a="parent"]').click();
  await expect(page.getByText('Parent insights')).toBeVisible();
  await expect(page.getByText('Subject performance')).toBeVisible();
  await expect(page.getByText('Subskill performance').first()).toBeVisible();
  await expect(page.locator('.aw-subject-spectrum .aw-spectrum-row')).toHaveCount(4);
  await expect(page.locator('.aw-subject-panel')).toHaveCount(4);
  await expect(page.locator('[data-parent-subskills="Spelling"]')).toBeVisible();
  await expect(page.locator('.aw-unseen-grid > div')).toHaveCount(4);
  await page.locator('[data-aw-topup]').click();
  await expect(page.getByRole('button',{name:'Queued for generation'})).toBeVisible();
  const topup=await page.evaluate(()=>({request:JSON.parse(localStorage.getItem('awenture-topup-request-v3')),api:window.__AW_TOPUP_API&&{endpoint:window.__AW_TOPUP_API.endpoint,payload:window.__AW_TOPUP_API.payload(window.__AW_TOPUP_API.load())}}));
  expect(topup.request.schema).toBe('awenture-topup-v2');
  expect(topup.request.backendStatus).toBe('queued');
  expect(topup.request.bankSize).toBe(203);
  expect(topup.request.unseen.Spelling).toBeGreaterThan(0);
  expect(topup.request.qualityPolicy.expertReviewRequired).toBe(true);
  expect(topup.request.qualityPolicy.releaseGateRequired).toBe(true);
  expect(topup.request.qualityPolicy.noBankMutationInLearnerRuntime).toBe(true);
  expect(topup.request.requestId).toMatch(/^aw-topup-/);
  expect(topup.api.endpoint).toContain('yvvwjdnazxzhzrfhudwx.supabase.co/functions/v1/topup-request');
  expect(posted.requestKey).toBe(topup.request.requestId);
  expect(posted.targetUnseenPerSubject).toBe(30);
  expect(Object.keys(posted.unseenBySubject)).toEqual(['English','Mathematics','Science']);
  expect(Object.keys(posted.requiredBySubject)).toEqual(['English','Mathematics','Science']);
  expect(posted.qaPolicy.learnerRuntimeDirectPublish).not.toBe(true);
  await page.locator('[data-a="home"]').last().click();

  await page.locator('[data-a="tests"]').click();
  await expect(page.locator('.aw-form-subject')).toHaveCount(3);
  await expect(page.locator('[data-aw-original-year]')).toHaveCount(21);
  await expect(page.locator('[data-aw-form-id]')).toHaveCount(0);
  const english=page.locator('.aw-form-subject').filter({hasText:'English'});
  await expect(english).toContainText('35 questions · 35 min · 8 papers');
  await english.locator('[data-aw-original-year="2013"]').click();
  await expect(page.locator('.aw-instruction-overlay').getByText('Historical ICAS paper')).toBeVisible();
  await page.locator('[data-aw-start-original]').click();
  await expect(page.locator('[data-aw-original-timer]')).toBeVisible();
  await expect(page.locator('iframe')).toHaveCount(0);
  await expect(page.locator('[data-aw-page-select]')).toBeEnabled({timeout:15000});
  await expect(page.locator('[data-aw-answer-row]')).toHaveCount(35);
  await page.locator('[data-aw-answer-choice="1"][data-value="D"]').click();
  await page.locator('[data-aw-submit-original]').click();
  await expect(page.getByText('Historical formal test')).toBeVisible();
  const formalAttempt=await page.evaluate(()=>JSON.parse(localStorage.getItem('oc-ready-progress-v1')).attempts.at(-1));
  expect(formalAttempt.type).toBe('icas-original');expect(formalAttempt.subject).toBe('English');expect(formalAttempt.sourceYear).toBe(2013);expect(formalAttempt.correct).toBe(1);
  await page.locator('[data-aw-result-done]').click();

  const perfectDate=new Date().toISOString();
  await page.evaluate(({perfectDate})=>localStorage.setItem('oc-ready-progress-v1',JSON.stringify({attempts:[{date:perfectDate,score:100,subject:'Daily',type:'practice'}],seenIds:[],reviewQueue:[],recentFamilies:[],xp:0,streak:1,skillStats:{},lastActiveDate:null})),{perfectDate});
  await page.reload();
  await expect(page.locator('[data-aw-bonus-card]')).toContainText('Unlocked');
  const coreBefore=await page.evaluate(()=>JSON.parse(localStorage.getItem('oc-ready-progress-v1')).attempts.length);
  await page.locator('[data-aw-bonus-start]').click();
  const selected=await page.evaluate(()=>{const stem=document.querySelector('.question-pane .q')?.textContent||'';const q=(window.AW_BONUS_BANK||[]).find(x=>x.question===stem);return q?{answer:q.answer,difficulty:q.difficulty}:null});
  expect(selected.difficulty).toBe(5);
  await page.locator(`[data-o="${selected.answer}"]`).click();await page.locator('[data-a="check"]').click();await page.locator('[data-c="3"]').click();await page.locator('[data-a="next"]').click();
  await expect(page.getByText('Challenge complete!')).toBeVisible();
  const state=await page.evaluate(()=>({core:JSON.parse(localStorage.getItem('oc-ready-progress-v1')),bonus:JSON.parse(localStorage.getItem('awenture-bonus-v1'))}));
  expect(state.core.attempts.length).toBe(coreBefore);expect(state.bonus.attempts).toHaveLength(1);
  await page.locator('[data-a="home"]').last().click();await page.locator('[data-a="collection"]').click();
  await expect(page.getByText('6 achievements')).toBeVisible();await expect(page.locator('.aw-ach')).toHaveCount(6);
  expect(errors).toEqual([]);
});