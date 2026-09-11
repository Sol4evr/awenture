import { test, expect } from '@playwright/test';

async function openPaper(page, year='2017') {
  await page.goto('/');
  await page.locator('[data-a="tests"]').click();
  const english=page.locator('.aw-form-subject').filter({hasText:'English'});
  const heading=english.locator('.aw-form-heading[data-aw-accordion="1"]');
  await expect(heading).toBeVisible();
  if(await heading.getAttribute('aria-expanded')!=='true')await heading.click();
  await expect(heading).toHaveAttribute('aria-expanded','true');
  const tile=english.locator(`[data-aw-original-year="${year}"]`);
  await expect(tile).toBeVisible();
  await tile.click();
  await page.locator('[data-aw-start-original]').click();
  const selector=page.locator('[data-aw-page-select]');
  await expect(selector).toBeEnabled({timeout:15000});
  return selector;
}

async function expectRenderedPage(page, selector, pageNo) {
  await selector.selectOption(String(pageNo));
  await expect(page.locator('[data-aw-page-label]')).toHaveText(new RegExp(`Page ${pageNo} of`), {timeout:10000});
  await expect(page.locator('[data-aw-paper-status]')).toHaveText('', {timeout:10000});
  const stats=await page.locator('[data-aw-paper-canvas]').evaluate(canvas=>{
    const ctx=canvas.getContext('2d'),step=Math.max(8,Math.floor(Math.min(canvas.width,canvas.height)/90));
    const data=ctx.getImageData(0,0,canvas.width,canvas.height).data;
    let samples=0,nonWhite=0;
    for(let y=0;y<canvas.height;y+=step)for(let x=0;x<canvas.width;x+=step){const i=(y*canvas.width+x)*4;samples++;if(data[i]<245||data[i+1]<245||data[i+2]<245)nonWhite++}
    return {width:canvas.width,height:canvas.height,ratio:nonWhite/Math.max(1,samples)};
  });
  expect(stats.width).toBeGreaterThan(200);
  expect(stats.height).toBeGreaterThan(200);
  expect(stats.ratio).toBeGreaterThan(0.001);
}

test('English 2017 scanned pages render reliably and do not go blank', async ({ page }) => {
  const selector=await openPaper(page,'2017');
  for(const pageNo of [3,5,9]) await expectRenderedPage(page,selector,pageNo);
  page.once('dialog',d=>d.accept());
  await page.locator('[data-aw-exam-exit]').click();
});

test('historical paper viewer uses responsive desktop controls and touch-first iPad gestures', async ({ page }, testInfo) => {
  const selector=await openPaper(page,'2013');
  const zoomIn=page.locator('[data-aw-zoom-in]');
  const zoomOut=page.locator('[data-aw-zoom-out]');
  const panLeft=page.locator('[data-aw-pan-left]');
  const panRight=page.locator('[data-aw-pan-right]');
  const zoomLabel=page.locator('[data-aw-zoom-label]');
  const stage=page.locator('[data-aw-paper-frame]');
  const status=page.locator('[data-aw-paper-status]');
  await expect(stage).toHaveAttribute('data-aw-touch-gestures','pinch-pan');

  if(testInfo.project.name==='webkit-ipad'){
    await expect(zoomIn).toBeHidden();
    await expect(zoomOut).toBeHidden();
    await expect(panLeft).toBeHidden();
    await expect(panRight).toBeHidden();
    await stage.evaluate(el=>{
      const fire=(type,scale)=>{const e=new Event(type,{bubbles:true,cancelable:true});Object.defineProperty(e,'scale',{value:scale});el.dispatchEvent(e)};
      fire('gesturestart',1);fire('gesturechange',1.3);fire('gestureend',1.3);
    });
    await expect(zoomLabel).toHaveText('130%',{timeout:10000});
    await expect(status).toHaveText('',{timeout:10000});
  }else{
    await expect(zoomIn).toBeVisible();
    await expect(zoomOut).toBeVisible();
    await expect(panLeft).toBeVisible();
    await expect(panRight).toBeVisible();
    const ys=await page.locator('.aw-paper-toolbar > button, .aw-paper-toolbar > span, .aw-paper-toolbar > label').evaluateAll(els=>els.filter(e=>getComputedStyle(e).display!=='none').map(e=>Math.round(e.getBoundingClientRect().top)));
    expect(Math.max(...ys)-Math.min(...ys)).toBeLessThan(18);
    await zoomIn.click();
    await expect(zoomLabel).toHaveText('115%');
    await expect(status).toHaveText('',{timeout:10000});
    const before=await stage.evaluate(el=>({left:el.scrollLeft,width:el.clientWidth,scrollWidth:el.scrollWidth}));
    expect(before.scrollWidth).toBeGreaterThan(before.width);
    await panRight.click();
    await page.waitForTimeout(350);
    const after=await stage.evaluate(el=>el.scrollLeft);
    expect(after).toBeGreaterThan(before.left);
    await panLeft.click();
    await page.waitForTimeout(350);
    const back=await stage.evaluate(el=>el.scrollLeft);
    expect(back).toBeLessThan(after);
  }

  await expect(selector).toBeVisible();
  page.once('dialog',d=>d.accept());
  await page.locator('[data-aw-exam-exit]').click();
});
