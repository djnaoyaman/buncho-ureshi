import {test,expect} from '@playwright/test';
const events=page=>page.evaluate(()=>window.dataLayer.filter(x=>x[0]==='event').map(x=>({name:x[1],params:x[2]})));
test.beforeEach(async({page})=>{await page.route('https://www.googletagmanager.com/**',route=>route.fulfill({body:'',contentType:'application/javascript'}));});
test('container, SPA classification, studio editing and successful PNG export',async({page})=>{
 await page.goto('');
 await expect.poll(async()=> (await events(page)).filter(x=>x.name==='content_view').length).toBe(1);
 await expect(page.locator('script[src*="gtm.js?id=GTM-W9SQSCBT"]')).toHaveCount(1);
 await page.locator('.desktop-nav a[data-nav="studio/"]').click();
 await expect(page.locator('[data-studio="canvas"]')).toBeVisible();
 await page.locator('[data-template="1"]').click();
 await page.locator('[data-action="export"]').click();
 await expect(page.locator('[data-studio="download"]')).toBeVisible();
 const download=page.waitForEvent('download');await page.locator('[data-studio="download"]').click();await download;
 const data=await events(page);
 for(const name of ['navigation_select','studio_open','studio_edit_start','studio_export','studio_download'])expect(data.some(x=>x.name===name),name).toBeTruthy();
 expect(data.filter(x=>x.name==='studio_edit_start')).toHaveLength(1);
 expect(data.filter(x=>x.name==='content_view').map(x=>x.params.site_area)).toEqual(['site','studio']);
 expect(data.some(x=>x.name==='page_view')).toBeFalsy();
});
test('game is ready and panel rerenders do not duplicate views',async({page})=>{
 await page.goto('game/');
 await expect.poll(async()=> (await events(page)).filter(x=>x.name==='game_start').length).toBe(1);
 const before=(await events(page)).filter(x=>x.name==='game_panel_view').length;
 await page.evaluate(()=>{const e=new CustomEvent('buncho-game-panel',{detail:'analytics_test'});document.dispatchEvent(e);document.dispatchEvent(e);});
 expect((await events(page)).filter(x=>x.name==='game_panel_view')).toHaveLength(before+1);
});
