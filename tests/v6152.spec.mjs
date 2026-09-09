import { test, expect } from '@playwright/test';
import { PDFDocument } from 'pdf-lib';

async function openSubject(section){
  const heading=section.locator('.aw-form-heading[data-aw-accordion="1"]');
  await expect(heading).toBeVisible();
  if(await heading.getAttribute('aria-expanded')!=='true')await heading.click();
  await expect(heading).toHaveAttribute('aria-expanded','true');
}

test('v6.15.2 landing emblem and Parent subject accordion are polished and accessible',async({page})=>{
  await page.route('**/released-bank',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({release:'aw-dynamic-bank-1',count:0,items:[]})}));
  await page.goto('/');
  const brand=page.locator('.brand.aw-brand-control'),logo=brand.locator('.aw-brand-logo');
  await expect(brand).toHaveClass(/aw-brand-landing/);
  const homeWidth=await logo.evaluate(el=>el.getBoundingClientRect().width);expect(homeWidth).toBeGreaterThanOrEqual(46);
  await page.locator('[data-a="parent"]').click();
  await expect(brand).not.toHaveClass(/aw-brand-landing/);
  const innerWidth=await logo.evaluate(el=>el.getBoundingClientRect().width);expect(innerWidth).toBeLessThan(homeWidth);
  const panels=page.locator('.aw-subskill-details');await expect(panels).toHaveCount(4);await expect(panels.locator('.aw-subject-icon')).toHaveCount(4);await expect(panels.locator('.aw-subject-score')).toHaveCount(4);
  await expect(page.locator('[data-parent-subskills="Spelling"]')).toBeVisible();
  const first=panels.nth(0),second=panels.nth(1);await first.locator('summary').click();await expect(first).toHaveAttribute('open','');await second.locator('summary').click();await expect(second).toHaveAttribute('open','');await expect(first).not.toHaveAttribute('open','');await expect(first.locator('summary')).toHaveAttribute('aria-expanded','false');await expect(second.locator('summary')).toHaveAttribute('aria-expanded','true');
});

test('v6.15.2 serves an upright-normalized 2019 Mathematics paper and renders it in the formal viewer',async({page,request})=>{
  const response=await request.get('/original-icas/year2/mathematics/2019-questions.pdf');expect(response.ok()).toBeTruthy();const pdf=await PDFDocument.load(await response.body());expect(pdf.getPageCount()).toBe(11);expect(pdf.getPages().every(p=>(p.getRotation().angle%360)===180)).toBeTruthy();
  await page.goto('/');await page.locator('[data-a="tests"]').click();const maths=page.locator('.aw-form-subject').filter({hasText:'Mathematics'});await openSubject(maths);const tile=maths.locator('[data-aw-original-year="2019"]');await expect(tile).toBeVisible();await tile.click();await page.locator('[data-aw-start-original]').click();await expect(page.locator('[data-aw-page-select]')).toBeEnabled({timeout:15000});await expect(page.locator('[data-aw-paper-status]')).toHaveText('',{timeout:15000});const stats=await page.locator('[data-aw-paper-canvas]').evaluate(canvas=>({width:canvas.width,height:canvas.height}));expect(stats.width).toBeGreaterThan(200);expect(stats.height).toBeGreaterThan(200);
  page.once('dialog',d=>d.accept());await page.locator('[data-aw-exam-exit]').click();
});
