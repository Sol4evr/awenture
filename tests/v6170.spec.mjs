import {test,expect} from '@playwright/test';

test('learning progression renders one functional timeline and starts at ICAS Y2',async({page})=>{
  await page.goto('/');
  await expect(page.locator('.aw-functional-path')).toHaveCount(1);
  const steps=page.locator('.aw-functional-path .aw-stage-step');
  await expect(steps).toHaveCount(4);
  await expect(steps.nth(0)).toContainText('ICAS Year 2');
  await expect(steps.nth(0)).toHaveClass(/current/);
  await expect(steps.nth(1)).toBeDisabled();
});

test('Parent QA cannot unlock ICAS Y3',async({page})=>{
  await page.addInitScript(()=>{
    localStorage.setItem('oc-ready-progress-v1',JSON.stringify({attempts:Array.from({length:60},()=>({type:'parent-qa',score:100})),skillStats:Object.fromEntries(Array.from({length:10},(_,i)=>['s'+i,{a:6,c:6}]))}));
  });
  await page.goto('/');
  const model=await page.evaluate(()=>window.AW_PROGRESSION.model());
  expect(model.progress.unlocked).toEqual(['icas-y2']);
});

test('readiness gate unlocks ICAS Y3 and supports selecting it',async({page})=>{
  await page.addInitScript(()=>{
    const attempts=[...Array.from({length:40},()=>({type:'practice',score:90})),{type:'icas-test',score:90},{type:'formal-paper',score:90}];
    const skillStats=Object.fromEntries(Array.from({length:10},(_,i)=>['s'+i,{a:5,c:5,guess:0,certainWrong:0}]));
    localStorage.setItem('oc-ready-progress-v1',JSON.stringify({attempts,skillStats}));
  });
  await page.goto('/');
  const y3=page.locator('.aw-stage-step[data-stage="icas-y3"]');
  await expect(y3).toBeEnabled();
  await y3.click();
  await expect(y3).toHaveClass(/current/);
  const model=await page.evaluate(()=>window.AW_PROGRESSION.model());
  expect(model.weights['icas-y2']).toBe(.7);
  expect(model.weights['icas-y3']).toBe(.3);
});
