import {test,expect} from '@playwright/test';
// Candidate tests/browser/renewal-stage3.spec.js. Desktop browser viewport checks,
// not iPhone hardware, native share-sheet, audio listening or PDF verification.
// Playwright helper, call after ready selector and before screenshot height calculation.
// Do not open closed details, start video/audio, or change game/storage state.
async function settleReadingImages(page, expect) {
  const images = page.locator('main img');
  for (let i=0;i<await images.count();i++) {
    const img=images.nth(i);
    // isVisible checks layout, not viewport. It excludes closed details/hidden menus.
    if (!await img.isVisible()) continue;
    await img.scrollIntoViewIfNeeded();
    await expect.poll(async()=>img.evaluate(i=>i.complete&&i.naturalWidth>0),
      {timeout:15000,message:`reading image ${i} should load`}).toBe(true);
    await img.evaluate(i=>i.decode());
  }
  await page.evaluate(()=>document.fonts.ready);
  await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
}

const routes=[['challenge/','.quiz-choices'],['studio/','[data-studio="canvas"]'],['help/','.help-layout'],['credits/','.credits-grid'],['?q=文鳥','#search-results-form'],['404.html','.page-heading']];
for(const width of [320,390,768,1440])for(const [route,ready] of routes)test(`renewal activity ${route} ${width}`,async({page},info)=>{
 test.setTimeout(90000);await page.setViewportSize({width,height:844});const errors=[];page.on('pageerror',error=>errors.push(error.message));await page.goto(route);await expect(page.locator(ready)).toBeVisible();
 await settleReadingImages(page,expect);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
 const label=`activity-${route.replace(/[^a-z0-9]/gi,'-')}-${width}`;
 const height=await page.evaluate(()=>document.documentElement.scrollHeight);
 if(height<=15000){await page.screenshot({path:info.outputPath(`${label}.png`),fullPage:true,scale:'css'});}
 else{for(let y=0;y<height;y+=744){await page.evaluate(y=>scrollTo(0,y),y);await page.screenshot({path:info.outputPath(`${label}-${y}.png`),fullPage:false,scale:'css'});}}
 expect(errors).toEqual([]);
});
test('site search links, empty results and browser back remain usable',async({page})=>{
 await page.goto('');await page.locator('#menu-toggle').click();await page.locator('#global-query').fill('アート');await page.locator('#site-search button').click();
 await expect(page.locator('#search-results-form')).toBeVisible();await expect(page.locator('#search-result-status')).toContainText('アート');
 const result=page.locator('#section-results a[href$="/studio/"]');await expect(result).toBeVisible();await result.click();await expect(page.locator('[data-studio="canvas"]')).toBeVisible();
 await page.goBack();await expect(page.locator('#search-results-form')).toBeVisible();await expect(page.locator('#search-query')).toHaveValue('アート');
 await page.locator('#search-query').fill('zzzz-no-matching-bird');await page.locator('#search-results-form button').click();await expect(page.locator('.search-empty')).toBeVisible();await expect(page.locator('#search-result-status')).toContainText('0件');
 await page.goBack();await expect(page.locator('#search-query')).toHaveValue('アート');
});
test('quiz feedback, answer lock and next question survive redesign',async({page})=>{
 await page.setViewportSize({width:320,height:568});await page.goto('challenge/');const first=await page.locator('.quiz-root h2').textContent();
 await page.locator('[data-answer]').first().click();await expect(page.locator('#quiz-feedback h3')).toBeVisible();
 for(const button of await page.locator('[data-answer]').all())await expect(button).toBeDisabled();
 await expect(page.locator('.quiz-choices .correct')).toHaveCount(1);await expect(page.locator('.quiz-learning-result a')).toHaveAttribute('href',/encyclopedia\//);
 await page.locator('#quiz-next').click();await expect(page.locator('.quiz-root h2')).not.toHaveText(first);await expect(page.locator('.quiz-progress')).toContainText('2 /');await expect(page.locator('[data-answer]').first()).toBeEnabled();
});
test('studio composition persists and real PNG downloads without changing canvas contract',async({page},info)=>{
 await page.setViewportSize({width:390,height:844});await page.goto('studio/');const canvas=page.locator('[data-studio="canvas"]');await expect(canvas).toBeVisible();
 expect(await canvas.evaluate(el=>getComputedStyle(el).touchAction)).toBe('none');
 await page.locator('[data-template="1"]').click();
 await page.locator('[data-studio="title"]').fill('文鳥の記念アルバム');await page.locator('[data-action="title"]').click();
 await page.locator('[data-studio="format"]').selectOption('portrait');
 const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('buncho-ureshi-studio-v1')));expect(saved).toBeTruthy();
 await page.reload();await expect(canvas).toBeVisible();expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('buncho-ureshi-studio-v1')))).toEqual(saved);
 await page.locator('[data-action="export"]').click();const preview=page.locator('[data-studio="export-preview"]');await expect(preview).toBeVisible();
 await expect.poll(()=>preview.evaluate(i=>[i.naturalWidth,i.naturalHeight])).toEqual([1400,1750]);
 const pending=page.waitForEvent('download');await page.locator('[data-studio="download"]').click();const download=await pending;
 const stream=await download.createReadStream();expect(stream).toBeTruthy();const chunks=[];for await(const chunk of stream)chunks.push(Buffer.from(chunk));const bytes=Buffer.concat(chunks);
 expect(bytes.subarray(0,8)).toEqual(Buffer.from([137,80,78,71,13,10,26,10]));expect(bytes.readUInt32BE(16)).toBe(1400);expect(bytes.readUInt32BE(20)).toBe(1750);expect(download.suggestedFilename()).toBe('buncho-portrait.png');
 await info.attach('renewal-studio-portrait',{body:bytes,contentType:'image/png'});
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('buncho-ureshi-studio-v1')))).toEqual(saved);
});
test('help settings and credit links remain accessible, 404 returns home',async({page})=>{
 await page.goto('help/');const motion=page.locator('#motion-toggle');await expect(motion).toBeVisible();const before=await motion.isChecked();await motion.setChecked(!before);await page.reload();await expect(page.locator('#motion-toggle')).toBeChecked({checked:!before});
 await page.goto('credits/');await expect(page.locator('.credits-grid figure').first()).toBeVisible();await expect(page.locator('.credits-grid a[href^="https://"]').first()).toBeVisible();
 await page.goto('404.html');await page.locator('#main a.button').click();await expect(page.locator('.renewal-cover')).toBeVisible();
});
