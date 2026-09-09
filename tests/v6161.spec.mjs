import {test,expect} from '@playwright/test';

async function openSubject(section){
  await expect(section).toHaveJSProperty('tagName','DETAILS');
  const summary=section.locator(':scope > summary.aw-stage-subject-summary');
  const choices=section.locator(':scope > .aw-form-choices');
  await expect(summary).toBeVisible();
  if(!(await section.evaluate(el=>el.open)))await summary.click();
  await expect.poll(()=>section.evaluate(el=>el.open)).toBeTruthy();
  await expect(choices).toBeVisible();
}

test('v6.16.1 runs the authentic 2016 Spelling Section B paper',async({page})=>{
  await page.route('**/released-bank',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({release:'aw-dynamic-bank-1',count:0,items:[]})}));
  await page.goto('/');
  await page.locator('[data-a="tests"]').click();
  const spelling=page.locator('.aw-form-subject').filter({hasText:'Spelling'});
  await expect(spelling).toBeVisible();
  await expect(spelling).toContainText('Spelling');
  await expect(spelling).toContainText('15 questions · 25 min · 1 paper');
  await openSubject(spelling);
  const tile=spelling.locator('[data-aw-original-subject="Spelling"][data-aw-original-year="2016"]');
  await expect(tile).toBeVisible();
  await tile.click();
  const instruction=page.locator('.aw-instruction-overlay');
  await expect(instruction).toContainText('2016 Spelling');
  await expect(instruction).toContainText('15 questions');
  await expect(instruction).toContainText('25 minutes');
  await expect(instruction).toContainText('Section B only');
  await page.locator('[data-aw-start-original]').click();
  await expect(page.locator('[data-aw-original-timer]')).toBeVisible();
  await expect(page.locator('[data-aw-page-select]')).toBeEnabled({timeout:15000});
  const rows=page.locator('[data-aw-answer-row]');
  await expect(rows).toHaveCount(15);
  await expect(rows.first().locator('> span')).toHaveText('16');
  await expect(rows.last().locator('> span')).toHaveText('30');
  const response=await page.request.get('/original-icas/year2/spelling/2016-questions.pdf');
  expect(response.ok()).toBeTruthy();
});

test('v6.16.1 makes all Parent subskill labels roll-safe without truncation',async({page})=>{
  await page.route('**/released-bank',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({release:'aw-dynamic-bank-1',count:0,items:[]})}));
  await page.goto('/');
  await page.locator('[data-a="parent"]').click();
  const panel=page.locator('.aw-subskill-details').first();
  await panel.locator('summary').click();
  const labels=panel.locator('.aw-subskill-spectrum .aw-spectrum-copy b');
  await expect(labels.first()).toBeVisible();
  const state=await labels.evaluateAll(xs=>xs.map(x=>({text:x.textContent,roll:x.classList.contains('aw-roll-label'),span:!!x.querySelector('span'),distance:x.style.getPropertyValue('--aw-roll-distance')})));
  expect(state.length).toBeGreaterThan(0);
  expect(state.every(x=>x.span&&x.roll&&x.distance)).toBeTruthy();
});
