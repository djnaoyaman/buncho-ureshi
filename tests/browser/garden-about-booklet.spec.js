// Prepared only. Run against the integrated actual application, never a synthetic page.
import {test,expect} from '@playwright/test';
import {writeFile} from 'node:fs/promises';
import {NOW,at,cases,worldFor,GARDENS,engine} from '../fixtures/garden-about-world.js';
async function raw(page,value){
 return page.evaluate(({value,write})=>new Promise((resolve,reject)=>{
 const req=indexedDB.open('buncho-ureshi-garden-v1',1);
 req.onupgradeneeded=()=>req.result.createObjectStore('world');
 req.onerror=()=>reject(req.error);
 req.onsuccess=()=>{const db=req.result,tx=db.transaction('world',write?'readwrite':'readonly'),s=tx.objectStore('world');let out;
 const r=write?s.put(value,'current'):s.get('current');r.onsuccess=()=>out=r.result;
 tx.oncomplete=()=>{db.close();resolve(out)};tx.onerror=()=>reject(tx.error);};
 }),{value,write:value!==undefined});
}
async function setup(page,kind='solo',garden=GARDENS[0].id){
 await page.addInitScript(()=>{localStorage.setItem('buncho.music.v1',JSON.stringify({enabled:false}));localStorage.setItem('buncho.care-sound-choice.v1',JSON.stringify({explicit:true,enabled:false}));});
 await page.goto('');await page.clock.install({time:at(kind)});await page.clock.pauseAt(at(kind)+1000);
 await raw(page,worldFor(kind,garden));await page.goto('game/');
 await enterVisibleGarden(page);
}
async function enterVisibleGarden(page){
 await expect.poll(()=>page.locator('body').getAttribute('data-game-intro')).toMatch(/shown|done/);
 if(await page.locator('body').getAttribute('data-game-intro')==='shown')await page.clock.runFor(2000);
 await expect(page.locator('body')).toHaveAttribute('data-game-intro','done');
 const outdoors=page.locator('.game-field-nav [data-game-panel=outdoors]');
 if(!await outdoors.isVisible())await page.locator('.game-scene-controls-toggle').click();
 if(await outdoors.getAttribute('aria-pressed')!=='true')await outdoors.click();
 await expect(page.locator('.finch-garden-stage')).toHaveAttribute('data-scene-state','ready');
}
const about=page=>page.locator('.finch-garden-dock > [data-garden-details=about]');
async function open(page){const a=about(page);await a.locator(':scope > summary').focus();await page.keyboard.press('Enter');await expect(a).toHaveAttribute('open','');return a;}
const layouts=[...GARDENS.map(g=>({garden:g,size:[320,740]})),...[ [390,844],[844,390],[1440,1000] ].map(size=>({garden:GARDENS.find(g=>g.id==='kazaguruma'),size}))];
for(const {garden,size} of layouts)test('layout '+garden.id+' '+size.join('x'),async({page},info)=>{
 await page.setViewportSize({width:size[0],height:size[1]});await setup(page,'solo',garden.id);const a=await open(page);
 await expect(a.locator('h4')).toHaveText(garden.name);await expect(a).toContainText(garden.description);
 const img=a.locator('img');await expect(img).toHaveCount(1);await img.scrollIntoViewIfNeeded();await img.evaluate(i=>i.decode());expect(await img.evaluate(i=>i.naturalWidth)).toBeGreaterThan(0);
 await page.screenshot({path:info.outputPath('01-identity.png')});
 await a.locator('.garden-about-booklet__warning > p').first().scrollIntoViewIfNeeded();await expect(a.locator('.garden-about-booklet__warning > p').first()).toBeInViewport({ratio:1});
 await page.screenshot({path:info.outputPath('02-warning.png')});
 await a.locator('[data-garden-details=about-rules] > summary').click();
 await page.screenshot({path:info.outputPath('03-rules.png')});
 expect(await a.evaluate(e=>e.scrollWidth<=e.clientWidth+1)).toBe(true);
});
for(const kind of cases.filter(k=>k!=='crow-warning'))test('exact saves and actual notices '+kind,async({page})=>{
 await setup(page,kind);const before=await raw(page),bytes=engine.serializeWorld(before),a=await open(page);
 await a.locator('[data-garden-details=about-rules] > summary').click();await a.evaluate(e=>e.scrollTop=e.scrollHeight);
 const summary=a.locator(':scope > summary');await summary.scrollIntoViewIfNeeded();
 const box=await summary.boundingBox(),closePoint={x:box.width-24,y:box.height/2};
 expect(await summary.evaluate((e,p)=>{const b=e.getBoundingClientRect();return e.contains(document.elementFromPoint(b.x+p.x,b.y+p.y));},closePoint)).toBe(true);
 await summary.click({position:closePoint});await a.locator(':scope > summary').focus();await page.keyboard.press('Space');
 await expect(a).toHaveAttribute('open','');expect(await raw(page)).toEqual(before);expect(engine.serializeWorld(await raw(page))).toBe(bytes);
 const notice=page.locator('.game-panel-overlay > [data-raptor-notice]');
 if(['raptor-hostile','settings-after-warning','legacy-warning'].includes(kind)){await expect(notice).toHaveAttribute('data-raptor-phase','warning');await expect(notice.locator('[data-game-raptor-home]')).toBeVisible();}
 if(['raptor-targetless','raptor-friendly','osprey'].includes(kind)){
  await expect(notice).toHaveAttribute('data-raptor-phase','visiting');await expect(notice).not.toContainText('事故死');
 }
 if(kind==='raptor-targetless')expect((await raw(page)).encounters.raptor.active.targetBirdId).toBeNull();
 if(['raptor-hostile','settings-after-warning','legacy-warning'].includes(kind))expect((await raw(page)).encounters.raptor.active.targetBirdId).toBe('b1');
 if(kind.startsWith('crow-')){const crow=page.locator('.finch-garden > [data-crow-phase]');await expect(crow).toHaveCount(kind==='crow-cooldown'?0:1);
  if(kind==='crow-targetless'){await expect(crow).not.toContainText('元気は半分');expect((await raw(page)).encounters.crow.arrivalBirdId).toBeNull();}
 }
 await expect(a.locator('[role=status],[role=alert],[data-game-raptor-home]')).toHaveCount(0);
 await page.locator('[data-garden-details=observe] > summary').click();await expect(a).not.toHaveAttribute('open','');
});
test('polling focus scroll and close/reopen navigation',async({page})=>{
 await setup(page);const a=await open(page);await a.locator('[data-garden-details=about-rules] > summary').click();
 await a.locator('[data-garden-details=about-rules] > summary').focus();
 const top=await a.evaluate(e=>{e.scrollTop=e.scrollHeight;return e.scrollTop;});expect(top).toBeGreaterThan(0);
 await page.clock.runFor(7000);await expect(a).toHaveAttribute('open','');await expect(a.locator('[data-garden-details=about-rules]')).toHaveAttribute('open','');
 expect(await a.evaluate(e=>e.scrollTop)).toBeGreaterThanOrEqual(top-2);
 await expect(a.locator('[data-garden-details=about-rules] > summary')).toBeFocused();
 await page.locator('[data-garden-select=kazaguruma]').click();await expect(page.locator('#finch-garden-title')).toHaveText(GARDENS.find(g=>g.id==='kazaguruma').name);
 await page.locator('.game-overlay-head [data-game-close-panel]').click();await expect(page.locator('.game-room')).toBeVisible();
 await page.locator('.game-field-nav [data-game-panel=outdoors]').click();await expect(about(page)).toHaveCount(1);
 await page.reload();await enterVisibleGarden(page);await expect(about(page)).toHaveCount(1);
});

test('browser history leaves and restores a single garden disclosure',async({page})=>{
 await setup(page);await open(page);
 await page.goto(new URL('../',page.url()).href);
 await page.goBack();await expect(page).toHaveURL(/\/game\/$/);await enterVisibleGarden(page);await expect(about(page)).toHaveCount(1);
 await page.goForward();await expect(about(page)).toHaveCount(0);
 await page.goBack();await expect(page).toHaveURL(/\/game\/$/);await enterVisibleGarden(page);await expect(about(page)).toHaveCount(1);
});

test('native tab order, scoped long text enlargement, and forced-color focus',async({page},info)=>{
 await page.setViewportSize({width:390,height:844});await setup(page);
 const a=await open(page),outer=a.locator(':scope > summary'),rules=a.locator('[data-garden-details=about-rules]'),inner=rules.locator(':scope > summary');
 await expect(outer).toBeFocused();await page.keyboard.press('Tab');await expect(inner).toBeFocused();
 await page.keyboard.press('Enter');await expect(rules).toHaveAttribute('open','');
 await page.keyboard.press('Space');await expect(rules).not.toHaveAttribute('open','');
 await page.keyboard.press('Shift+Tab');await expect(outer).toBeFocused();
 // Test-only DOM stress: not a garden identity assertion, persisted data change, or app style patch.
 const before=await raw(page);
 await a.locator('h4').evaluate(e=>e.textContent+='・長い案内を読むための折り返し確認'.repeat(3));
 const enlargement=await a.evaluate(e=>{
  const nodes=[e,...e.querySelectorAll('*')];
  const before=nodes.map(n=>parseFloat(getComputedStyle(n).fontSize));
  nodes.forEach((n,i)=>n.style.fontSize=(before[i]*2)+'px');
  return nodes.map((n,i)=>({tag:n.tagName,className:n.className,text:n.textContent.slice(0,80),before:before[i],after:parseFloat(getComputedStyle(n).fontSize)}));
 });
 const measurementPath=info.outputPath('text-enlargement-measurements.json');
 await writeFile(measurementPath,JSON.stringify({kind:'scoped text enlargement, not native browser zoom',viewport:page.viewportSize(),elements:enlargement},null,2));
 await info.attach('text-enlargement-measurements',{path:measurementPath,contentType:'application/json'});
 expect(enlargement.some(row=>row.tag==='STRONG')).toBe(true);
 expect(enlargement.filter(row=>row.className==='garden-about-booklet__number')).toHaveLength(3);
 expect(enlargement.length).toBeGreaterThan(0);
 for(const row of enlargement)expect(row.after).toBeCloseTo(row.before*2,1);
 await a.locator('.garden-about-booklet__warning').scrollIntoViewIfNeeded();
 expect(await a.evaluate(e=>e.scrollWidth<=e.clientWidth+1)).toBe(true);
 await expect(a.locator('.garden-about-booklet__warning')).toContainText('事故死');
 await page.screenshot({path:info.outputPath('text-enlargement-200-percent.png')});
 await page.emulateMedia({forcedColors:'active'});await inner.focus();
 await expect(inner).toBeFocused();expect(await inner.evaluate(e=>getComputedStyle(e).outlineStyle)).not.toBe('none');
 await page.screenshot({path:info.outputPath('forced-colors-focus.png')});
 expect(await raw(page)).toEqual(before);
 // Native browser zoom remains untested; scoped measured text enlargement does not claim native zoom coverage. No manual check is required.
});
