import {test,expect} from '@playwright/test';

async function transition(page,selector,assertion,label){
  const started=Date.now();
  await page.locator(selector).last().click();
  await assertion();
  const elapsed=Date.now()-started;
  expect(elapsed,`${label} transition should remain responsive`).toBeLessThan(2500);
  return elapsed;
}

test('primary iPad navigation remains responsive through repeated long-session transitions',async({page},testInfo)=>{
  await page.route('**/released-bank',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({release:'aw-dynamic-bank-1',count:0,items:[]})}));
  const pageErrors=[];page.on('pageerror',e=>pageErrors.push(String(e)));
  await page.goto('/');
  await expect(page.getByText('Hello Alistair')).toBeVisible();
  const timings=[];
  for(let i=0;i<4;i++){
    timings.push(await transition(page,'[data-a="tests"]',()=>expect(page.getByText('Subject tests')).toBeVisible(),`tests-${i+1}`));
    timings.push(await transition(page,'[data-a="home"]',()=>expect(page.getByText('Hello Alistair')).toBeVisible(),`home-from-tests-${i+1}`));
    timings.push(await transition(page,'[data-a="parent"]',()=>expect(page.getByText('Parent insights')).toBeVisible(),`parent-${i+1}`));
    timings.push(await transition(page,'[data-a="home"]',()=>expect(page.getByText('Hello Alistair')).toBeVisible(),`home-from-parent-${i+1}`));
  }
  expect(Math.max(...timings),`${testInfo.project.name} worst primary-navigation latency`).toBeLessThan(2500);
  expect(pageErrors).toEqual([]);
});
