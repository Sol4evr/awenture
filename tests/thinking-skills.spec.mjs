import {test,expect} from '@playwright/test';
import fs from 'node:fs';
const bank=JSON.parse(fs.readFileSync('bank/thinking-skills-y1.json','utf8'));
test.beforeEach(async({page})=>{await page.goto('/');await expect(page.locator('#ts-home-card')).toBeVisible()});
test('home entry, seven skills, readable visuals and save/resume',async({page})=>{
 await page.getByRole('button',{name:'Explore all 7 skills'}).click();
 await expect(page.locator('.ts-topics button')).toHaveCount(7);
 await page.getByRole('button',{name:'Visual reasoning',exact:false}).click();
 await expect(page.locator('.ts-visual')).toBeVisible();
 await expect(page.locator('.ts-visual text')).toHaveText(['A','B','C','D']);
 await expect(page.locator('.ts-choices button span')).toHaveCount(0);
 await page.locator('.ts-choices button').first().click();
 await page.getByRole('button',{name:'Check answer',exact:true}).click();
 await expect(page.locator('.ts-feedback')).toBeVisible();
 await page.getByRole('button',{name:'Save and leave session'}).click();
 await page.reload();await page.getByRole('button',{name:'Explore all 7 skills'}).click();
 await page.getByRole('button',{name:'Resume saved session'}).click();
 await expect(page.locator('.ts-feedback')).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
});
test('daily three puzzles records once and leaves ICAS history unchanged',async({page})=>{
 const before=await page.evaluate(()=>localStorage.getItem('oc-ready-progress-v1'));
 await page.locator('#ts-home-card [data-ts=daily]').click();
 await expect(page.locator('.ts-nav button')).toHaveCount(3);
 for(let i=0;i<3;i++){
  await page.locator('.ts-choices button').first().click();await page.getByRole('button',{name:'Check answer',exact:true}).click();
  await page.getByRole('button',{name:i===2?'Finish':'Next →',exact:true}).click();
 }
 await expect(page.getByRole('heading',{name:'Adventure complete!'})).toBeVisible();
 const state=await page.evaluate(()=>({old:localStorage.getItem('oc-ready-progress-v1'),ts:JSON.parse(localStorage.getItem('awenture-thinking-y1-v1'))}));
 expect(state.old).toBe(before);expect(state.ts.attempts).toHaveLength(1);expect(Object.keys(state.ts.items)).toHaveLength(3);
 await page.getByRole('button',{name:'← AWenture home',exact:true}).click();await expect(page.locator('#ts-home-card')).toBeVisible();
 await page.getByRole('button',{name:"Start today's practice",exact:true}).click();await expect(page.locator('.progressdot')).toHaveCount(15);
});
test('mixed paper permits review and flags, hides solutions until submitted, marks all 14 correctly',async({page})=>{
 await page.getByRole('button',{name:'Explore all 7 skills'}).click();await page.getByRole('button',{name:'Start without a time limit'}).click();
 await expect(page.locator('.ts-nav button')).toHaveCount(14);await expect(page.locator('[data-ts=read]')).toHaveCount(0);
 const qs=bank.questions.filter(q=>q.pool==='mixed');
 for(let i=0;i<14;i++){
  await page.locator(`.ts-choices button[data-option="${qs[i].options.indexOf(qs[i].answer)}"]`).click();
  await expect(page.locator('.ts-feedback')).toHaveCount(0);
  await page.getByRole('button',{name:i===13?'Review before submitting':'Next →',exact:true}).click();
 }
 await expect(page.getByRole('heading',{name:'Check your paper'})).toBeVisible();await page.getByRole('button',{name:'Submit paper',exact:true}).click();await expect(page.locator('.ts-score')).toHaveText('14 of 14 correct');
 await expect(page.locator('.ts-topic-review button')).toHaveCount(7);
 await expect(page.locator('.ts-topic-review')).toContainText('Every skill was correct');
 await page.locator('.ts-topic-review button').first().click();
 await expect(page.locator('.ts-nav button')).toHaveCount(6);
});
test('timed paper auto-submits when time expires after resuming',async({page})=>{
 await page.getByRole('button',{name:'Explore all 7 skills'}).click();await page.getByRole('button',{name:'Start with a 60-minute limit'}).click();
 await page.evaluate(()=>{const key='awenture-thinking-active-v1',s=JSON.parse(localStorage.getItem(key));s.deadline=Date.now()-100;localStorage.setItem(key,JSON.stringify(s))});
 await page.reload();await page.getByRole('button',{name:'Explore all 7 skills'}).click();await page.getByRole('button',{name:'Resume saved session'}).click();
 await expect(page.getByText('The time limit ended.',{exact:false})).toBeVisible();await expect(page.locator('.ts-score')).toHaveText('0 of 14 correct');
 await expect(page.locator('.ts-topic-review')).toContainText('Start with Patterns');
});
