import {test,expect} from '@playwright/test';

test('v6.16.1 shows Spelling and 2016 paper source card in Subject tests',async({page})=>{
  await page.route('**/released-bank',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({release:'aw-dynamic-bank-1',count:0,items:[]})}));
  await page.goto('/');
  await page.locator('[data-a="tests"]').click();
  const spelling=page.locator('.aw-form-subject.aw-spelling-subject');
  await expect(spelling).toBeVisible();
  await expect(spelling).toContainText('Spelling');
  await expect(spelling.locator('[data-aw-spelling-paper="2016"]')).toBeVisible();
  await spelling.locator('[data-aw-spelling-paper="2016"]').click();
  await expect(page.locator('.aw-instruction-overlay')).toContainText('2016 Spelling');
  await expect(page.locator('.aw-instruction-overlay')).toContainText('original PDF binary is not yet bundled');
});

test('v6.16.1 rolls overflowing Parent subskill labels instead of truncating them',async({page})=>{
  await page.route('**/released-bank',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({release:'aw-dynamic-bank-1',count:0,items:[]})}));
  await page.goto('/');
  await page.locator('[data-a="parent"]').click();
  const panel=page.locator('.aw-subskill-details').first();
  await panel.locator('summary').click();
  const labels=panel.locator('.aw-subskill-spectrum .aw-spectrum-copy b');
  await expect(labels.first()).toBeVisible();
  const state=await labels.evaluateAll(xs=>xs.map(x=>({text:x.textContent,roll:x.classList.contains('aw-roll-label'),span:!!x.querySelector('span'),scroll:x.scrollWidth,client:x.clientWidth})));
  expect(state.every(x=>x.span)).toBeTruthy();
  const overflowed=state.filter(x=>x.scroll>x.client+4);
  expect(overflowed.every(x=>x.roll)).toBeTruthy();
});
