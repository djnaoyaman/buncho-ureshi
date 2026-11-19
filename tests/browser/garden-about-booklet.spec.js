// Prepared only. Run against the integrated actual application, never a synthetic page.
import {test,expect} from '@playwright/test';
import {GARDEN_TRACK_CREDITS} from '../../src/data/garden-track-credits.js';
import {writeFile} from 'node:fs/promises';
import {NOW,at,cases,worldFor,GARDENS,engine,raptor} from '../fixtures/garden-about-world.js';
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
async function setup(page,kind='solo',garden=GARDENS[0].id,music={enabled:false}){
 await page.addInitScript(music=>{localStorage.setItem('buncho.music.v1',JSON.stringify(music));localStorage.setItem('buncho.care-sound-choice.v1',JSON.stringify({explicit:true,enabled:false}));},music);
 await page.goto('');await page.clock.install({time:at(kind)});await page.clock.pauseAt(at(kind)+1000);
 await raw(page,worldFor(kind,garden));await page.goto('game/');
 await enterVisibleGarden(page);
}
async function enterVisibleGarden(page){
 await expect.poll(()=>page.locator('body').getAttribute('data-game-intro')).toMatch(/shown|done/);
 if(await page.locator('body').getAttribute('data-game-intro')==='shown')await page.clock.runFor(2000);
 await expect(page.locator('body')).toHaveAttribute('data-game-intro','done');
 // A restored hostile visit requires a real choice before the garden is
 // interactive. This test deliberately stays to inspect the live warning;
 // it never dismisses the modal or edits its saved pending flag directly.
 const returnDialog=page.locator('.game-raptor-return-dialog[open]');
 if(await returnDialog.count()){
  const before=await raw(page),expected=structuredClone(before),choiceAt=await page.evaluate(()=>Date.now());
  expect(before.encounters.raptor.active.hostile).toBe(true);
  expect(before.encounters.raptor.active.returnChoicePending).toBe(true);
  expect(raptor.remainWithGardenRaptor(expected,choiceAt,raptor.raptorToken(expected)).changed).toBe(true);
  await returnDialog.locator('[data-raptor-choice=stay]').click();
  await expect(returnDialog).toHaveCount(0);
  expect(await raw(page)).toEqual(expected);
  expect(expected.encounters.raptor.active.targetBirdId).toBe(before.encounters.raptor.active.targetBirdId);
  expect(expected.encounters.raptor.active.remainingMs).toBe(before.encounters.raptor.active.remainingMs);
 }
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
 const credit=GARDEN_TRACK_CREDITS[garden.music.themeId],block=a.locator('[data-garden-track-credit]');
 await expect(block).toHaveAttribute('data-garden-track-credit',garden.music.themeId);
 const text=await block.evaluate(e=>{const c=e.cloneNode(true);c.querySelectorAll('rt').forEach(r=>r.remove());return c.textContent;});
 for(const value of [credit.trackTitle,'制作：みやざきなおや',credit.description])expect(text).toContain(value);
 expect(await block.evaluate(e=>e.nextElementSibling.tagName)).toBe('FIGURE');
 const img=a.locator('img');await expect(img).toHaveCount(1);await img.scrollIntoViewIfNeeded();await img.evaluate(i=>i.decode());expect(await img.evaluate(i=>i.naturalWidth)).toBeGreaterThan(0);
 await page.screenshot({path:info.outputPath('01-identity.png')});
 await a.locator('.garden-about-booklet__warning ol > li').first().scrollIntoViewIfNeeded();await expect(a.locator('.garden-about-booklet__warning ol > li').first()).toBeInViewport({ratio:1});
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
 await setup(page,'navigation-cooldown');const a=await open(page);await a.locator('[data-garden-details=about-frequency] > summary').click();await a.locator('[data-garden-details=about-rules] > summary').click();
 await a.locator('[data-garden-details=about-rules] > summary').focus();
 const top=await a.evaluate(e=>{e.scrollTop=e.scrollHeight;return e.scrollTop;});expect(top).toBeGreaterThan(0);
 await page.clock.runFor(7000);await expect(a).toHaveAttribute('open','');await expect(a.locator('[data-garden-details=about-rules]')).toHaveAttribute('open','');await expect(a.locator('[data-garden-details=about-frequency]')).toHaveAttribute('open','');
 expect(await a.evaluate(e=>e.scrollTop)).toBeGreaterThanOrEqual(top-2);
 await expect(a.locator('[data-garden-details=about-rules] > summary')).toBeFocused();
 // The garden picker is now a single jog dial, not one button per garden.
 // Close the booklet and operate the visible keyboard controls, waiting for
 // each real transaction before sending another key.
 await a.locator(':scope > summary').focus();await page.keyboard.press('Enter');await expect(a).not.toHaveAttribute('open','');
 const center=page.locator('[data-jog-center]');await center.focus();await page.keyboard.press('Home');
 await expect(center).toHaveAttribute('data-garden-select',GARDENS[0].id);
 const targetIndex=GARDENS.findIndex(g=>g.id==='kazaguruma');expect(targetIndex).toBeGreaterThan(0);
 for(let index=1;index<=targetIndex;index++){
  await center.focus();await page.keyboard.press('ArrowDown');
  await expect(center).toHaveAttribute('data-garden-select',GARDENS[index].id);
 }
 await expect(page.locator('#finch-garden-title')).toHaveText(GARDENS[targetIndex].name);
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
 const a=await open(page),outer=a.locator(':scope > summary'),frequency=a.locator('[data-garden-details=about-frequency]'),frequencySummary=frequency.locator(':scope > summary'),rules=a.locator('[data-garden-details=about-rules]'),inner=rules.locator(':scope > summary');
 await expect(outer).toBeFocused();await page.keyboard.press('Tab');await expect(frequencySummary).toBeFocused();
 await page.keyboard.press('Enter');await expect(frequency).toHaveAttribute('open','');
 await page.keyboard.press('Space');await expect(frequency).not.toHaveAttribute('open','');
 await page.keyboard.press('Tab');await expect(inner).toBeFocused();
 await page.keyboard.press('Enter');await expect(rules).toHaveAttribute('open','');
 await page.keyboard.press('Space');await expect(rules).not.toHaveAttribute('open','');
 await page.keyboard.press('Shift+Tab');await expect(frequencySummary).toBeFocused();await page.keyboard.press('Shift+Tab');await expect(outer).toBeFocused();
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
 await expect(a.locator('.garden-about-booklet__warning')).toContainText('事故で命をなくします');
 await page.screenshot({path:info.outputPath('text-enlargement-200-percent.png')});
 await page.emulateMedia({forcedColors:'active'});await inner.focus();
 await expect(inner).toBeFocused();expect(await inner.evaluate(e=>getComputedStyle(e).outlineStyle)).not.toBe('none');
 await page.screenshot({path:info.outputPath('forced-colors-focus.png')});
 expect(await raw(page)).toEqual(before);
 // Native browser zoom remains untested; scoped measured text enlargement does not claim native zoom coverage. No manual check is required.
});

for(const [width,mode] of [[320,'auto'],[375,'fixed'],[402,'off']])test('assigned credit and audio continuity '+width+' '+mode,async({page},info)=>{
 await page.setViewportSize({width,height:844});
 await page.addInitScript(()=>{
  const Native=window.AudioContext||window.webkitAudioContext;window.__creditStarts=0;
  class Context extends Native {createBufferSource(){const source=super.createBufferSource(),start=source.start.bind(source);source.start=(...args)=>{window.__creditStarts++;return start(...args);};return source;}}
  window.AudioContext=Context;window.webkitAudioContext=Context;
 });
 await setup(page,'navigation-cooldown','hanadokei',{enabled:mode!=='off',mode:mode==='off'?'auto':mode,selected:'village',volume:.1});
 const a=await open(page),credit=a.locator('[data-garden-track-credit]');
 await expect(a.locator('[data-garden-track-credit]')).toHaveAttribute('data-garden-track-credit','garden-hanadokei');
 if(mode!=='off')await expect.poll(()=>page.evaluate(()=>window.__creditStarts),{timeout:30000}).toBeGreaterThan(0);
 else expect(await page.evaluate(()=>window.__creditStarts)).toBe(0);
 const starts=await page.evaluate(()=>window.__creditStarts),before=await raw(page);
 await credit.scrollIntoViewIfNeeded();await expect(credit).toBeVisible();await expect(credit).not.toContainText('バッハ');
 expect(await a.evaluate(e=>e.scrollWidth<=e.clientWidth+1)).toBe(true);
 await page.screenshot({path:info.outputPath('assigned-credit-'+width+'.png')});
 for(let i=0;i<3;i++){await a.locator(':scope > summary').focus();await page.keyboard.press('Enter');await expect(a).not.toHaveAttribute('open','');await page.keyboard.press('Enter');await expect(a).toHaveAttribute('open','');}
 expect(await page.evaluate(()=>window.__creditStarts)).toBe(starts);expect(await raw(page)).toEqual(before);
 await page.goto('credits/');
 const oldSource=page.locator('a[href*="bach-bwv645-license.html"]');await expect(oldSource).toBeVisible();await oldSource.click();
 await expect(page).toHaveURL(/bach-bwv645-license.html$/);await expect(page.locator('body')).toContainText('Bart Golsteijn');await expect(page.locator('body')).toContainText('CC BY-SA 2.5');
 await page.goBack();await expect(page).toHaveURL(/credits\/$/);await page.goBack();await enterVisibleGarden(page);await open(page);
 await expect(about(page).locator('[data-garden-track-credit]')).toHaveAttribute('data-garden-track-credit','garden-hanadokei');
});
