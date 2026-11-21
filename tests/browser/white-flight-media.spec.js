import {test,expect} from '@playwright/test';
import {setup} from '../fixtures/garden-terrain-browser.js';
test.use({hasTouch:true});
function native(page){return new Proxy(page,{get(t,k){if(k==='clock')return {install:({time})=>page.clock.setFixedTime(time),pauseAt:async()=>{},runFor:ms=>page.waitForTimeout(ms)};const v=Reflect.get(t,k);return typeof v==='function'?v.bind(t):v;}})}
const wing='[data-white-flight-frame]',fallback='[data-whole-bird]';
for(const which of ['background','ground'])test(`required ${which} blocks readiness until actual response`,async({page},info)=>{
 let release;const gate=new Promise(r=>release=r);const pattern=which==='background'?/bird-garden-01(?:-landscape)?\.webp/:/white-poses\.webp/;
 await page.route(pattern,async r=>{await gate;await r.continue()});
 const started=setup(native(page),'java-rice',402,true,true);const settled=started.catch(e=>e);
 await expect(page.locator('.finch-garden-stage')).toHaveAttribute('data-scene-state','loading');
 const image=page.locator(which==='background'?'.finch-garden-background':'.garden-bird-pose-window img').first();expect(await image.evaluate(i=>i.complete&&i.naturalWidth>0)).toBe(false);
 release();const result=await settled;if(result instanceof Error)throw result;await expect(page.locator('.finch-garden-stage')).toHaveAttribute('data-scene-state','ready');
});
test('optional failed frames keep garden ready with intact fallback',async({page})=>{
 await page.route(/white-connected\//,r=>r.abort());await setup(native(page),'java-rice',402,true,true);
 await page.waitForFunction(()=>{const f=document.querySelector('[data-whole-bird]');return f&&getComputedStyle(f).visibility==='visible'},{},{timeout:15000});
 await expect(page.locator('.finch-garden-stage')).toHaveAttribute('data-scene-state','ready');expect(await page.locator(wing).evaluate(i=>getComputedStyle(i).visibility)).toBe('hidden');expect(await page.locator('.garden-actor-flight [data-part]').count()).toBe(0);
});
test('optional pending frames allow fallback flight then decoded next flight animates',async({page},info)=>{
 test.setTimeout(60000);let release;const gate=new Promise(r=>release=r);await page.route(/white-connected\//,async r=>{await gate;await r.continue()});await setup(native(page),'java-rice',402,true,true);
 await page.waitForFunction(()=>{const f=document.querySelector('[data-whole-bird]');return f&&getComputedStyle(f).visibility==='visible'},{},{timeout:15000});
 await expect(page.locator('.finch-garden-stage')).toHaveAttribute('data-scene-state','ready');release();
 await page.waitForFunction(()=>{const i=document.querySelector('[data-white-flight-frame]');return i?.complete&&i.naturalWidth===280});
 // Latch must keep the still-airborne fallback until contact; no mid-flight switch.
 const during=await page.locator('.finch-garden-household').evaluate(n=>({state:n.dataset.actorState,img:getComputedStyle(n.querySelector('[data-white-flight-frame]')).visibility}));if(during.state==='fly')expect(during.img).toBe('hidden');
 await page.waitForFunction(()=>{const i=document.querySelector('[data-white-flight-frame]');return i&&getComputedStyle(i).visibility==='visible'},{},{timeout:30000});
 const first=await page.locator(wing).getAttribute('src');await page.waitForFunction(src=>{const i=document.querySelector('[data-white-flight-frame]');return i&&getComputedStyle(i).visibility==='visible'&&i.getAttribute('src')!==src},first,{timeout:10000});
 await expect(page.locator('.finch-garden-stage')).toHaveAttribute('data-scene-state','ready');await page.screenshot({path:info.outputPath('recovered-flight.png')});
});
