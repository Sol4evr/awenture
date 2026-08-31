import { test, expect } from '@playwright/test';

test('feature-complete learner shell and dynamic premium assessment flow', async ({ page }) => {
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  await page.goto('/');

  await expect(page.getByText('Hello Alistair')).toBeVisible();
  await expect(page.getByText('My Collection')).toBeVisible();
  await expect(page.locator('.love')).toContainText('Made with');
  await expect(page.locator('.aw-heart')).toHaveText('♥');
  await expect(page.locator('.stats')).toHaveCount(0);
  await expect(page.locator('.aw-learning-line')).toBeVisible();
  await expect(page.locator('.aw-path-step.active')).toContainText('ICAS Grade 2');
  await expect(page.locator('.aw-path-step.locked')).toHaveCount(3);
  await expect(page.getByText(/stable calibrated core/i)).toHaveCount(0);
  await expect(page.locator('link[href*="premium.css"]')).toHaveCount(1);
  await expect(page.locator('link[href*="practice-flow.css"]')).toHaveCount(1);
  await expect(page.locator('link[href*="home-insights.css"]')).toHaveCount(1);

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

  let foundText=false, foundVisual=false, foundEmpty=false;
  const dots=page.locator('.progressdot');
  const count=await dots.count();
  for(let i=0;i<count && !(foundText&&foundVisual&&foundEmpty);i++){
    await dots.nth(i).dispatchEvent('click');
    const visualCount=await page.locator('.stimulus-pane .stimulus-visual').count();
    const textCount=await page.locator('.stimulus-pane .stimulus-text').count();
    const emptyCount=await page.locator('.stimulus-pane .stimulus-empty').count();
    if(visualCount){
      foundVisual=true;
      await expect(page.locator('.testworkspace')).toHaveClass(/aw-visual-stimulus/);
      await expect(page.locator('.stimulus-pane')).toBeVisible();
    } else if(textCount){
      foundText=true;
      await expect(page.locator('.testworkspace')).toHaveClass(/aw-question-only/);
      await expect(page.locator('.stimulus-pane')).toBeHidden();
      await expect(page.locator('.aw-inline-stimulus')).toBeVisible();
    } else if(emptyCount){
      foundEmpty=true;
      await expect(page.locator('.testworkspace')).toHaveClass(/aw-question-only/);
      await expect(page.locator('.stimulus-pane')).toBeHidden();
      await expect(page.locator('.aw-inline-stimulus')).toHaveCount(0);
      await expect(page.getByText('Read the question carefully.')).toBeHidden();
    }
  }
  expect(foundText).toBeTruthy();
  expect(foundVisual).toBeTruthy();
  expect(foundEmpty).toBeTruthy();

  const option=page.locator('.opt').first();
  await expect(option).toBeVisible();
  const optionMetrics=await option.evaluate(el=>({radius:parseFloat(getComputedStyle(el).borderRadius),height:el.getBoundingClientRect().height}));
  expect(optionMetrics.radius).toBeGreaterThanOrEqual(14);
  expect(optionMetrics.height).toBeGreaterThanOrEqual(58);
  const choiceGap=await page.locator('.test-options').evaluate(el=>parseFloat(getComputedStyle(el).rowGap||getComputedStyle(el).gap));
  expect(choiceGap).toBeGreaterThanOrEqual(12);

  await page.locator('[data-a="home"]').first().click();
  await page.locator('[data-a="daily"]').click();
  await expect(page.getByText(/Question 1 of 12/i)).toBeVisible();
  await expect(page.locator('[data-a="flag"]')).toBeHidden();
  expect(errors).toEqual([]);
});
