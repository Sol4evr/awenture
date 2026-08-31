import { test, expect } from '@playwright/test';

test('feature-complete learner shell and premium practice smoke test', async ({ page }) => {
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  await page.goto('/');

  await expect(page.getByText('Hello Alistair')).toBeVisible();
  await expect(page.getByText('My Collection')).toBeVisible();
  await expect(page.getByText(/Made with love by Arthur Wang/)).toBeVisible();
  await expect(page.locator('link[href*="premium.css"]')).toHaveCount(1);

  const tileRadius=await page.locator('[data-a="tests"]').evaluate(el=>getComputedStyle(el).borderRadius);
  expect(parseFloat(tileRadius)).toBeGreaterThanOrEqual(16);

  await page.locator('[data-a="parent"]').click();
  await expect(page.getByText('Alistair at a glance')).toBeVisible();
  await page.locator('[data-a="home"]').first().click();

  await page.locator('[data-a="tests"]').click();
  await expect(page.getByText('Subject tests')).toBeVisible();
  await expect(page.locator('[data-s="English"]')).toBeVisible();
  await expect(page.locator('[data-s="Mathematics"]')).toBeVisible();
  await expect(page.locator('[data-s="Science"]')).toBeVisible();
  await page.locator('[data-s="English"]').click();
  await expect(page.getByText(/Question 1 of 35/i)).toBeVisible();
  await expect(page.locator('[data-a="flag"]')).toBeVisible();
  await page.locator('[data-a="home"]').first().click();

  await page.locator('[data-a="collection"]').click();
  await expect(page.getByText('10 achievements')).toBeVisible();
  await page.locator('[data-a="home"]').first().click();

  const start = page.locator('[data-a="daily"]');
  await expect(start).toBeEnabled();
  await start.click();
  await expect(page.getByText(/Question 1 of 12/i)).toBeVisible();
  await expect(page.locator('.opt').first()).toBeVisible();
  await expect(page.locator('.progressdot')).toHaveCount(12);
  await expect(page.locator('[data-a="flag"]')).toBeHidden();

  const optionRadius=await page.locator('.opt').first().evaluate(el=>getComputedStyle(el).borderRadius);
  expect(parseFloat(optionRadius)).toBeGreaterThanOrEqual(12);
  expect(errors).toEqual([]);
});
