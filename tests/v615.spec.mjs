import { test, expect } from '@playwright/test';

test('v6.15 dynamic Practice, static subject tests, Parent collapse and release refresh', async ({page})=>{
  test.setTimeout(45000);
  await page.route('**/formal-tests.js*',route=>route.fulfill({status:200,contentType:'application/javascript',body:''}));
  let feedCalls=0,getCalls=0;
  const dynamic={id:'QF-E-V615TEST',subject:'English',skill:'Text comprehension',subskill:'author purpose',family:'qf-eng-practical-detail',difficulty:3,question:'Why does the notice include the information about the closed path?',options:['To describe a fictional character','To help a visitor make a practical decision','To list the history of the path','To prove every path is closed'],answer:'B',explanation:'The closed-path detail helps a visitor decide which route can be used safely.',stimulus:'Visitor guide — wetland\nPlease check the closed path before beginning your visit. Other areas remain open.',kind:'text',visual:'',quality:{review:'dual-pass-released',independentSolve:true,releaseGate:'aw-content-release-1.2.1'}};
  await page.route('https://yvvwjdnazxzhzrfhudwx.supabase.co/functions/v1/released-bank',async route=>{feedCalls++;await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({release:'aw-dynamic-bank-1',count:1,updatedAt:new Date().toISOString(),items:[dynamic]})})});
  await page.route('https://yvvwjdnazxzhzrfhudwx.supabase.co/functions/v1/topup-request*',async route=>{const req=route.request();if(req.method()==='POST')return route.fulfill({status:202,contentType:'application/json',body:JSON.stringify({request:{request_key:'aw-topup-browser',status:'queued',created_at:new Date().toISOString(),updated_at:new Date().toISOString()}})});getCalls++;return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({request:{request_key:'aw-topup-browser',status:'released',updated_at:new Date().toISOString()},releasedCount:1})})});
  await page.goto('/');
  await expect(page.locator('.aw-brand-control .aw-brand-logo').first()).toBeVisible();
  await expect(page.locator('.aw-brand-control .aw-brand-word')).toHaveCount(0);
  expect(await page.locator('.aw-brand-control').first().evaluate(el=>getComputedStyle(el).backgroundColor)).toBe('rgba(0, 0, 0, 0)');
  await expect.poll(()=>page.evaluate(()=>window.__AW_RUNTIME_HEALTH?.dynamicBank||0)).toBe(1);
  expect(await page.evaluate(()=>window.AW_BANK.filter(q=>q.id==='QF-E-V615TEST').length)).toBe(1);

  await page.locator('[data-a="parent"]').click();
  await expect(page.locator('.aw-subskill-details')).toHaveCount(4);
  await expect(page.locator('.aw-subskill-details[open]')).toHaveCount(0);
  await expect(page.getByText('Subskill performance',{exact:true})).toHaveCount(1);
  for(const subject of ['English','Maths','Science','Spelling'])await expect(page.locator('.aw-subskill-details>summary').filter({hasText:subject})).toHaveCount(1);
  const first=page.locator('.aw-subskill-details').first(),summary=first.locator('summary');
  await expect(summary).toHaveAttribute('aria-expanded','false');await summary.click();await expect(summary).toHaveAttribute('aria-expanded','true');
  await page.locator('[data-aw-topup]').click();
  await expect(page.getByRole('button',{name:'Released'})).toBeVisible({timeout:12000});
  expect(getCalls).toBeGreaterThan(0);await expect.poll(()=>feedCalls).toBeGreaterThan(1);
  await page.locator('[data-a="home"]').last().click();

  await page.evaluate(()=>{const p=JSON.parse(localStorage.getItem('oc-ready-progress-v1')||'{}');p.seenIds=window.AW_BANK.filter(q=>q.subject==='English'&&!String(q.id).startsWith('QF-')).map(q=>q.id);localStorage.setItem('oc-ready-progress-v1',JSON.stringify(p))});
  await page.reload();await expect.poll(()=>page.evaluate(()=>window.__AW_RUNTIME_HEALTH?.dynamicBank||0)).toBe(1);
  await page.locator('[data-a="daily"]').click();await expect(page.locator('.test-player')).toBeVisible();
  const dailyStems=await page.evaluate(()=>{const out=[];for(let i=0;i<15;i++){document.querySelector(`[data-q="${i}"]`)?.click();out.push(document.querySelector('.question-pane .q')?.textContent||'')}return out});
  expect(dailyStems).toContain(dynamic.question);
  await page.locator('.exitbtn').click();await page.locator('[data-a="tests"]').click();
  await page.locator('[data-s="English"]').click();await expect(page.locator('.test-player')).toBeVisible();
  const subjectStems=await page.evaluate(()=>{const out=[];for(let i=0;i<35;i++){document.querySelector(`[data-q="${i}"]`)?.click();out.push(document.querySelector('.question-pane .q')?.textContent||'')}return out});
  expect(subjectStems).not.toContain(dynamic.question);
});