import { test, expect } from '@playwright/test';

test('feature-complete learner shell and practice smoke test', async ({ page }) => {
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  await page.goto('/');
  await expect(page.getByText('Hello Alistair')).toBeVisible();
  await expect(page.getByText('My Collection')).toBeVisible();
  await expect(page.getByText(/Made with love by Arthur Wang/)).toBeVisible();

  await page.getByRole('button', { name: /Parent/i }).click();
  await expect(page.getByText('Alistair at a glance')).toBeVisible();
  await page.getByRole('button', { name: /AWenture/i }).click();

  const start = page.getByRole('button', { name: /Start today/i });
  await expect(start).toBeEnabled();
  await start.click();
  await expect(page.getByText(/Question 1 of 12/i)).toBeVisible();
  await expect(page.locator('.option').first()).toBeVisible();
  expect(errors).toEqual([]);
});
