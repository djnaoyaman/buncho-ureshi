import {test,expect} from '@playwright/test';
const now=1795089600000;
const nav='.game-field-nav';
const targets=['garden','outdoors','friends'];
const names=['おうちへ','おにわへ遊びに行く','友だちのおうちへ'];
async function snapshot(page){return page.evaluate(async()=>{const {openGameStore}=await import(new URL('src/game-store.js',document.baseURI));const s=await openGameStore();try{return JSON.parse(await s.exportSnapshot());}finally{s.close();}});}
async function seed(page){await page.goto('credits/');await page.evaluate(async now=>{const base=new URL('.',document.baseURI);const [{createWorld},{openGameStore}]=await Promise.all([import(new URL('src/engine.js',base)),import(new URL('src/game-store.js',base))]);const w=createWorld(now);w.settings.motion=false;const s=await openGameStore();await s.transact(()=>w);s.close();localStorage.setItem('buncho.music.v1',JSON.stringify({enabled:false}));localStorage.setItem('buncho.analytics.disabled','1');},now);}
async function closePanel(page){if(await page.locator('.game-panel-overlay').isVisible())await page.locator('[data-game-close-panel]').click();}
async function geometry(page){return page.locator(nav+' button').evaluateAll(bs=>bs.map(b=>{const r=b.getBoundingClientRect(),s=getComputedStyle(b);return {x:r.x,y:r.y,w:r.width,h:r.height,label:b.getAttribute('aria-label'),pressed:b.getAttribute('aria-pressed'),underline:s.textDecorationLine,offset:s.textUnderlineOffset,color:s.color};}));}
for(const width of [320,375,390,430])test(`small-world actual navigation, baseline geometry and saved state ${width}px`,async({page},info)=>{
 test.setTimeout(90000);await page.setViewportSize({width,height:844});await page.addInitScript(n=>{Date.now=()=>n;},now);await seed(page);const initial=await snapshot(page);
 // Compare against the exact previous presentation: remove only this patch's decorative markup/CSS.
 let baseline=true;
 await page.route('**/src/game.js*',async route=>{const r=await route.fetch();let body=await r.text();if(baseline)body=body.replace(/<img class="game-nav-miniature"[^>]*>/g,'').replace(/<span class="game-nav-miniature-label">([^<]*)<\/span>/g,'$1');await route.fulfill({response:r,body});});
 await page.route('**/src/game.css*',async route=>{const r=await route.fetch();let body=await r.text();if(baseline)body=body.split('/* B: 小さな世界')[0];await route.fulfill({response:r,body});});
 const records=[],saved=[];
 for(const variant of ['baseline','B']){
  baseline=variant==='baseline';await page.goto('credits/');await page.evaluate(async w=>{const {openGameStore}=await import(new URL('src/game-store.js',document.baseURI));const s=await openGameStore();await s.transact(()=>w);s.close();},initial);await page.goto('game/');await expect(page.locator('body')).toHaveAttribute('data-game-intro','done');await page.locator('.game-scene-controls-toggle').click();
  const states=[];
  for(let i=0;i<3;i++){
   await closePanel(page);const b=page.locator(nav+' button').nth(i);await b.click();await expect(page.locator('.game-app')).toHaveAttribute('data-panel',targets[i]);await expect(b).toHaveAttribute('aria-pressed','true');await expect(b).toBeEnabled();
   const g=await geometry(page);states.push(g);expect(g.map(x=>x.label)).toEqual(names);
   if(!baseline){
    for(const img of await page.locator(nav+' img').all()){await expect(img).toHaveJSProperty('complete',true);expect(await img.evaluate(e=>e.naturalWidth)).toBe(64);}
    for(const row of g){expect(row.h).toBeGreaterThanOrEqual(44);expect(row.x).toBeGreaterThanOrEqual(0);expect(row.x+row.w).toBeLessThanOrEqual(width);}
    expect(await page.locator(nav+' button').evaluateAll(bs=>bs.every(b=>b.scrollWidth<=b.clientWidth))).toBe(true);
    const label=b.locator('span');expect(await label.evaluate(e=>getComputedStyle(e).textDecorationLine)).toContain('underline');expect(await label.evaluate(e=>getComputedStyle(e).textUnderlineOffset)).toBe(g[i].offset);
    await info.attach(`B-${width}-${targets[i]}`,{body:await page.screenshot({path:info.outputPath(`B-${width}-${targets[i]}.png`)}),contentType:'image/png'});
   }
  }
  await closePanel(page);await page.locator(nav+' button').first().click();await expect(page.locator(nav+' button').first()).toBeEnabled();states.push(await page.locator('.game-bottom-dock').evaluate(e=>({html:e.innerHTML,box:e.getBoundingClientRect().toJSON()})));records.push(states);
 for(let round=0;round<2;round++)for(let i=0;i<3;i++){await closePanel(page);const b=page.locator(nav+' button').nth(i);await b.focus();await expect(b).toBeFocused();await page.keyboard.press('Tab');await page.keyboard.press('Shift+Tab');expect(await b.evaluate(e=>getComputedStyle(e).outlineStyle)).not.toBe('none');await b.press(round?'Space':'Enter');await expect(page.locator('.game-app')).toHaveAttribute('data-panel',targets[i]);}
 await closePanel(page);await page.locator(nav+' button').first().click();await expect(page.locator(nav+' button').first()).toBeEnabled();
 const controls=page.locator('.game-scene-controls-toggle');await controls.click();await controls.click();
 // Icon centre and label end activate the same existing button, with no image event handler.
 await page.locator(nav+' button').nth(1).click();await expect(page.locator('.game-app')).toHaveAttribute('data-panel','outdoors');
 await closePanel(page);await page.locator(nav+' button').nth(2).click();await expect(page.locator('.game-app')).toHaveAttribute('data-panel','friends');await closePanel(page);await page.locator(nav+' button').first().click();await expect(page.locator(nav+' button').first()).toBeEnabled();
 const beforeReload=await snapshot(page);await page.reload();await expect(page.locator('.game-app')).toHaveAttribute('data-panel','garden');expect(await snapshot(page)).toEqual(beforeReload);saved.push(await snapshot(page));await page.locator('.game-scene-controls-toggle').click();
 await page.locator('.game-world-exit').click();await page.goBack();await page.locator('.game-scene-controls-toggle').click();await expect(page.locator(nav+' img')).toHaveCount(baseline?0:3);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 }
 expect(records[1]).toEqual(records[0]);expect(saved[1]).toEqual(saved[0]);
 // The image and label are hit areas of the same button.
 const icon=await page.locator(nav+' button').nth(1).locator('img').boundingBox();await page.mouse.click(icon.x+icon.width/2,icon.y+icon.height/2);await expect(page.locator('.game-app')).toHaveAttribute('data-panel','outdoors');await closePanel(page);await page.locator(nav+' button').nth(2).locator('span').click();await expect(page.locator('.game-app')).toHaveAttribute('data-panel','friends');
});
test('decorative image failure retains accessible navigation and labels',async({page})=>{
 await page.setViewportSize({width:320,height:844});await page.route('**/nav-mini/*.svg',r=>r.abort());await page.goto('game/');await page.locator('.game-scene-controls-toggle').click();
 for(let i=0;i<3;i++){await closePanel(page);const b=page.locator(nav+' button').nth(i);await expect(b).toHaveAccessibleName(names[i]);await b.click();await expect(page.locator('.game-app')).toHaveAttribute('data-panel',targets[i]);}
});
