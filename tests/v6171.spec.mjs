import {test,expect} from '@playwright/test';

test('Home shows exactly one functional Learning Path in the existing Learning path card',async({page})=>{
  await page.goto('/');
  const path=page.locator('.aw-functional-path');
  await expect(path).toHaveCount(1);
  const card=path.locator('xpath=ancestor::*[contains(concat(" ",normalize-space(@class)," ")," card ")][1]');
  await expect(card).toContainText('Learning path');
  await expect(card.locator('.aw-learning-line')).toHaveCount(0);
  await expect(path.locator('.aw-stage-step')).toHaveCount(5);
});
