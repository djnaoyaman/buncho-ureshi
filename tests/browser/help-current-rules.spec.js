import {test,expect} from '@playwright/test';
import {createWorld} from '../../src/engine.js';
const NOW=Date.UTC(2026,10,11,12);
async function record(page,w){return page.evaluate(w=>new Promise((resolve,reject)=>{const r=indexedDB.open('buncho-ureshi-garden-v1',1);r.onupgradeneeded=()=>r.result.createObjectStore('world');r.onsuccess=()=>{const db=r.result,tx=db.transaction('world',w?'readwrite':'readonly'),q=w?tx.objectStore('world').put(w,'current'):tx.objectStore('world').get('current');tx.oncomplete=()=>{db.close();resolve(q.result)};tx.onerror=()=>reject(tx.error)};r.onerror=()=>reject(r.error)}),w);}
async function openHelp(page){await page.evaluate(()=>document.dispatchEvent(new CustomEvent('buncho-world-action',{detail:'help'})));await expect(page.locator('.game-help h3')).toBeFocused();}
async function plain(locator){return locator.evaluate(e=>{const copy=e.cloneNode(true);copy.querySelectorAll('rt').forEach(n=>n.remove());return copy.textContent;});}
for(const [width,height,enlarged] of [[320,568,false],[390,844,true]])test(`plain child help and visual steps preserve saves ${width}x${height}`,async({page},info)=>{
 await page.setViewportSize({width,height});await page.addInitScript(n=>{Date.now=()=>n;localStorage.setItem('buncho.music.v1',JSON.stringify({enabled:false}));localStorage.setItem('buncho.care-sound-choice.v1',JSON.stringify({explicit:true,enabled:false}));},NOW);
 await page.goto('');const w=createWorld(NOW);w.paused=true;await record(page,w);await page.goto('game/');await expect(page.locator('body')).toHaveAttribute('data-game-intro','done');const before=await record(page);await openHelp(page);
 const help=page.locator('.game-help');await expect(help.locator('ol>li')).toHaveCount(5);await expect(help.locator('details')).toHaveCount(8);await expect(help.locator('h3 rt').first()).toHaveCSS('display','ruby-text');
 if(enlarged)await help.evaluate(root=>{const nodes=[root,...root.querySelectorAll('*')],sizes=nodes.map(e=>parseFloat(getComputedStyle(e).fontSize));nodes.forEach((e,i)=>e.style.setProperty('font-size',`${sizes[i]*2}px`,'important'));});
 for(const key of ['help-care','help-life'])await help.locator(`[data-game-details=${key}]>summary`).click();
 const gold=help.locator('[data-help-update=gold]'),growth=help.locator('[data-game-growth-help]'),warning=help.locator('[data-help-update=predators]');
 await expect(gold.locator('[role=listitem]')).toHaveCount(3);await expect(growth.locator('[role=listitem]')).toHaveCount(3);await expect(warning.locator('[role=listitem]')).toHaveCount(2);
 expect(await plain(gold)).toContain('暮らしを確認して受け取る');expect(await plain(growth)).toContain('3日半');expect(await plain(warning)).toContain('残り10秒');
 for(const [name,target] of [['gold',gold],['growth',growth],['warning',warning],['next',help.locator('[data-help-update=next]')]]){
  await target.scrollIntoViewIfNeeded();expect(await target.evaluate(e=>e.scrollWidth<=e.clientWidth+1)).toBe(true);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);await info.attach(name,{body:await page.screenshot(),contentType:'image/png'});
 }
 expect(await record(page)).toEqual(before);await page.locator('[data-game-close-panel]').click();await expect(help).toHaveCount(0);expect(await record(page)).toEqual(before);await page.reload();await expect(page.locator('body')).toHaveAttribute('data-game-intro','done');await openHelp(page);expect(await record(page)).toEqual(before);
});
