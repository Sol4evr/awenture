import { test, expect } from '@playwright/test';

test('feature-complete learner shell, premium flow and gated bonus challenge', async ({ page }) => {
  const errors=[];page.on('pageerror',e=>errors.push(String(e)));await page.goto('/');
  await expect(page.getByText('Hello Alistair')).toBeVisible();
  await expect(page.getByText('My Collection')).toBeVisible();
  await expect(page.locator('.love')).toContainText('Made with');
  await expect(page.locator('.aw-heart')).toHaveText('♥');
  await expect(page.locator('.stats')).toHaveCount(0);
  await expect(page.locator('.aw-learning-line')).toBeVisible();
  await expect(page.locator('.aw-path-step.active')).toContainText('ICAS Grade 2');
  await expect(page.locator('.aw-path-step.locked')).toHaveCount(3);
  await expect(page.getByText(/stable calibrated core/i)).toHaveCount(0);
  await expect(page.locator('link[href*="challenge.css"]')).toHaveCount(1);
  await expect(page.locator('[data-aw-bonus-card]')).toBeVisible();
  await expect(page.locator('[data-aw-bonus-card]')).toContainText('Locked');
  await expect(page.locator('[data-aw-bonus-start]')).toHaveCount(0);

  await page.locator('[data-a="parent"]').click();
  await expect(page.getByText('Parent insights')).toBeVisible();
  await expect(page.getByText('Strongest skills')).toBeVisible();
  await expect(page.getByText('Needs practice')).toBeVisible();
  await expect(page.getByText('Unseen question inventory')).toBeVisible();
  await expect(page.locator('.aw-unseen-grid > div')).toHaveCount(3);
  await page.locator('[data-aw-topup]').click();
  await expect(page.getByRole('button',{name:'Top-up requested'})).toBeVisible();
  await page.locator('[data-a="home"]').last().click();

  await page.locator('[data-a="tests"]').click();
  await page.locator('[data-s="English"]').click();
  await expect(page.getByText(/Question 1 of 35/i)).toBeVisible();
  await expect(page.locator('[data-a="flag"]')).toBeVisible();
  let foundText=false,foundVisual=false,foundEmpty=false;const dots=page.locator('.progressdot');const count=await dots.count();
  for(let i=0;i<count&&!(foundText&&foundVisual&&foundEmpty);i++){
    await dots.nth(i).dispatchEvent('click');
    const visualCount=await page.locator('.stimulus-pane .stimulus-visual').count(),textCount=await page.locator('.stimulus-pane .stimulus-text').count(),emptyCount=await page.locator('.stimulus-pane .stimulus-empty').count();
    if(visualCount){foundVisual=true;await expect(page.locator('.testworkspace')).toHaveClass(/aw-visual-stimulus/);await expect(page.locator('.stimulus-pane')).toBeVisible()}
    else if(textCount){foundText=true;await expect(page.locator('.testworkspace')).toHaveClass(/aw-question-only/);await expect(page.locator('.stimulus-pane')).toBeHidden();await expect(page.locator('.aw-inline-stimulus')).toBeVisible()}
    else if(emptyCount){foundEmpty=true;await expect(page.locator('.testworkspace')).toHaveClass(/aw-question-only/);await expect(page.locator('.stimulus-pane')).toBeHidden();await expect(page.locator('.aw-inline-stimulus')).toHaveCount(0)}
  }
  expect(foundText&&foundVisual&&foundEmpty).toBeTruthy();
  const option=page.locator('.opt').first();await expect(option).toBeVisible();const metrics=await option.evaluate(el=>({radius:parseFloat(getComputedStyle(el).borderRadius),height:el.getBoundingClientRect().height}));expect(metrics.radius).toBeGreaterThanOrEqual(14);expect(metrics.height).toBeGreaterThanOrEqual(58);

  await page.locator('[data-a="home"]').first().click();
  const perfectDate=new Date().toISOString();
  await page.evaluate(({perfectDate})=>localStorage.setItem('oc-ready-progress-v1',JSON.stringify({attempts:[{date:perfectDate,score:100,subject:'Daily',type:'practice'}],seenIds:[],reviewQueue:[],recentFamilies:[],xp:0,streak:1,skillStats:{},lastActiveDate:null})),{perfectDate});
  await page.reload();
  await expect(page.locator('[data-aw-bonus-card]')).toContainText('Unlocked');
  await expect(page.locator('[data-aw-bonus-start]')).toBeVisible();
  const coreBefore=await page.evaluate(()=>JSON.parse(localStorage.getItem('oc-ready-progress-v1')).attempts.length);
  await page.locator('[data-aw-bonus-start]').click();
  await expect(page.getByText(/Question 1 of 1/i)).toBeVisible();
  await expect(page.getByText(/Bonus Challenge/i).first()).toBeVisible();
  const selected=await page.evaluate(()=>{const stem=document.querySelector('.question-pane .q')?.textContent||'';const q=(window.AW_BONUS_BANK||[]).find(x=>x.question===stem);return q?{answer:q.answer,kind:q.kind,difficulty:q.difficulty,visual:!!q.visual,stimulus:!!q.stimulus}:null});
  expect(selected).toBeTruthy();expect(selected.difficulty).toBe(5);expect(selected.answer).toMatch(/^[ABCD]$/);
  if(selected.kind==='visual'){
    await expect(page.locator('.stimulus-visual')).toBeVisible();
    await expect(page.locator('.testworkspace')).toHaveClass(/aw-visual-stimulus/);
  }else if(selected.stimulus){
    await expect(page.locator('.testworkspace')).toHaveClass(/aw-question-only/);
    await expect(page.locator('.aw-inline-stimulus')).toBeVisible();
  }else{
    await expect(page.locator('.testworkspace')).toHaveClass(/aw-question-only/);
  }
  await page.locator(`[data-o="${selected.answer}"]`).click();
  await page.locator('[data-a="check"]').click();
  await page.locator('[data-c="3"]').click();
  await page.locator('[data-a="next"]').click();
  await expect(page.getByText('Challenge complete!')).toBeVisible();
  const state=await page.evaluate(()=>({core:JSON.parse(localStorage.getItem('oc-ready-progress-v1')),bonus:JSON.parse(localStorage.getItem('awenture-bonus-v1'))}));
  expect(state.core.attempts.length).toBe(coreBefore);expect(state.bonus.streak).toBe(1);expect(state.bonus.attempts).toHaveLength(1);expect(state.bonus.attempts[0].correct).toBe(true);
  await page.locator('[data-a="home"]').last().click();
  await expect(page.locator('[data-aw-bonus-card]')).toContainText('Complete');
  await page.locator('[data-a="collection"]').click();
  await expect(page.getByText('11 achievements')).toBeVisible();
  await expect(page.getByText('Bonus Challenger',{exact:true})).toBeVisible();
  await expect(page.getByText(/Gold in the main collection now represents sustained effort/i)).toBeVisible();
  expect(errors).toEqual([]);
});
