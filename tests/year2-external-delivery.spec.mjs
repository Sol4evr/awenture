import {test,expect} from '@playwright/test';
import fs from 'node:fs';
const manifest=JSON.parse(fs.readFileSync(new URL('../baseline/year2-question-delivery-v1.json',import.meta.url)));
async function start(page,a){
  await page.goto('/');await page.locator('[data-a="tests"]').click();
  const section=page.locator('.aw-form-subject').filter({hasText:a.subject});
  await expect(section).toBeVisible();if(!(await section.evaluate(el=>el.open)))await section.locator(':scope > summary').click();
  await section.locator(`[data-aw-original-subject="${a.subject}"][data-aw-original-year="${a.year}"]`).click();await page.locator('[data-aw-start-original]').click();
}
test('all 22 external Year 2 question papers retain the real page-by-page viewer',async({page})=>{
  test.setTimeout(180000);
  for(const a of manifest.assets){
    await start(page,a);await expect(page.locator('[data-aw-page-select]')).toBeEnabled({timeout:15000});await expect(page.locator('[data-aw-paper-status]')).toHaveText('',{timeout:15000});await expect(page.locator('[data-aw-page-select] option')).toHaveCount(a.pages);
    const visible=await page.locator('[data-aw-paper-canvas]').evaluate(canvas=>{const ctx=canvas.getContext('2d');const d=ctx.getImageData(0,0,canvas.width,canvas.height).data;let marked=0;for(let i=0;i<d.length;i+=400)if(d[i]<240||d[i+1]<240||d[i+2]<240)marked++;return {width:canvas.width,height:canvas.height,marked}});expect(visible.width).toBeGreaterThan(200);expect(visible.height).toBeGreaterThan(200);expect(visible.marked).toBeGreaterThan(5);
    page.once('dialog',d=>d.accept());await page.locator('[data-aw-exam-exit]').click();await expect(page.locator('[data-aw-exam-exit]')).toHaveCount(0);
  }
});
test('a failed external PDF load recovers after exit and reopening without stale viewer state',async({page})=>{
 const a=manifest.assets.find(a=>a.subject==='Spelling');const route='**/'+a.path;
 await page.route(route,r=>r.abort('failed'));await start(page,a);await expect(page.locator('[data-aw-paper-status]')).toContainText(/Unable|unable/,{timeout:15000});
 page.once('dialog',d=>d.accept());await page.locator('[data-aw-exam-exit]').click();await page.unroute(route);await start(page,a);await expect(page.locator('[data-aw-page-select]')).toBeEnabled({timeout:15000});await expect(page.locator('[data-aw-paper-status]')).toHaveText('',{timeout:15000});
});
