import {test,expect} from '@playwright/test';
import {createWorld,createBird,validateWorld} from '../../src/engine.js';
const NOW=Date.UTC(2026,10,4);
async function record(page,value){return page.evaluate(value=>new Promise((resolve,reject)=>{const r=indexedDB.open('buncho-ureshi-garden-v1',1);r.onupgradeneeded=()=>r.result.createObjectStore('world');r.onerror=()=>reject(r.error);r.onsuccess=()=>{const db=r.result,tx=db.transaction('world',value?'readwrite':'readonly'),q=value?tx.objectStore('world').put(value,'current'):tx.objectStore('world').get('current');tx.oncomplete=()=>{db.close();resolve(q.result)};tx.onerror=()=>reject(tx.error);};}),value);}
async function start(page,w){await page.setViewportSize({width:390,height:844});await page.addInitScript(now=>{Date.now=()=>now;localStorage.setItem('buncho.music.v1',JSON.stringify({enabled:false}));},NOW);await page.goto('');await record(page,w);await page.goto('game/');await expect(page.locator('body')).toHaveAttribute('data-game-intro','done');}
test('new founder and biological child keep short names across reload while title stays Omochi',async({page},info)=>{
 const w=createWorld(NOW);w.paused=true;const father=createBird(w,{sex:'male',home:'resident'});const child=createBird(w,{stage:'egg',home:'resident',parents:['b1',father.id],generation:1,skipNameDraw:true});validateWorld(w);
 await start(page,w);await expect(page.locator('[data-home-role=self]')).toHaveText('自分＝エド');await expect(page).toHaveTitle(/おもち/);
 const saved=await record(page);expect(saved.birds.find(b=>b.id===child.id).name).toMatch(/^[ァ-ヶー]{2,4}$/u);expect(saved.birds.find(b=>b.id===father.id).name).toBe(father.name);expect(saved.birds.every(b=>!/^おもち[0-9０-９]*$/u.test(b.name))).toBe(true);await page.screenshot({path:info.outputPath('new-ed-and-family.png')});
 await page.reload();expect((await record(page)).birds.map(b=>[b.id,b.name,b.naming])).toEqual(saved.birds.map(b=>[b.id,b.name,b.naming]));
});
test('existing automatic Omochi remains Omochi after load and reload',async({page},info)=>{
 const w=createWorld(NOW);w.paused=true;w.birds[0].name=w.birds[0].naming.assignedName='おもち';validateWorld(w);
 await start(page,w);await expect(page.locator('[data-home-role=self]')).toHaveText('自分＝おもち');expect((await record(page)).birds[0].name).toBe('おもち');
 await page.reload();await expect(page.locator('[data-home-role=self]')).toHaveText('自分＝おもち');expect((await record(page)).birds[0].naming).toEqual(w.birds[0].naming);await page.screenshot({path:info.outputPath('existing-omochi-preserved.png')});
});
