import {test,expect} from '@playwright/test';

async function go(page,selector,text,label){
  const start=Date.now();
  await page.locator(selector).last().click();
  await expect(page.getByText(text,{exact:false}).first()).toBeVisible();
  const ms=Date.now()-start;
  expect(ms,`${label} should stay below the primary-navigation budget`).toBeLessThan(2500);
  return ms;
}

test('long-session navigation remains bounded and idempotent',async({page},testInfo)=>{
  await page.route('**/released-bank',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({release:'aw-dynamic-bank-1',count:0,items:[]})}));
  const errors=[];
  page.on('pageerror',e=>errors.push(String(e)));
  await page.goto('/');
  await expect(page.getByText('Hello Alistair')).toBeVisible();

  const timings=[];
  for(let cycle=1;cycle<=6;cycle++){
    timings.push(await go(page,'[data-a="tests"]','Subject tests',`${testInfo.project.name} tests ${cycle}`));
    const subjectDetails=page.locator('details.aw-stage-subject-details');
    expect(await subjectDetails.count(),`subject accordion count cycle ${cycle}`).toBeLessThan(20);

    timings.push(await go(page,'[data-a="home"]','Hello Alistair',`${testInfo.project.name} home ${cycle}`));
    timings.push(await go(page,'[data-a="parent"]','Parent insights',`${testInfo.project.name} parent ${cycle}`));

    // Skills coverage may be absent if the framework has no mapped bank yet, but it must never duplicate.
    expect(await page.locator('[data-aw-skills-coverage="1"]').count(),`skills coverage duplicate cycle ${cycle}`).toBeLessThanOrEqual(1);
    timings.push(await go(page,'[data-a="home"]','Hello Alistair',`${testInfo.project.name} home-parent ${cycle}`));
  }

  const first=Math.max(...timings.slice(0,4));
  const last=Math.max(...timings.slice(-4));
  expect(last-first,`${testInfo.project.name} latency creep across session`).toBeLessThan(1200);
  expect(Math.max(...timings),`${testInfo.project.name} worst soak latency`).toBeLessThan(2500);
  expect(errors).toEqual([]);
});
