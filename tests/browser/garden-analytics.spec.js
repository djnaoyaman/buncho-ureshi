import {test,expect} from '@playwright/test';
import {isolatedProduction} from '../fixtures/analytics-network.js';
import {createWorld} from '../../src/engine.js';
import {GARDEN_RULE_VERSION} from '../../src/garden-analytics.js';
const ORIGIN='https://djnaoyaman.github.io/buncho-ureshi/',NOW=Date.UTC(2026,10,18,12);
const events=page=>page.evaluate(()=>(window.dataLayer||[]).filter(x=>x[0]==='event'&&x[1].startsWith('garden_')).map(x=>({name:x[1],params:x[2]})));
async function saved(page){return page.evaluate(()=>new Promise(resolve=>{const r=indexedDB.open('buncho-ureshi-garden-v1',1);r.onsuccess=()=>{const db=r.result,t=db.transaction('world'),q=t.objectStore('world').get('current');q.onsuccess=()=>resolve(q.result);t.oncomplete=()=>db.close();};}));}
async function setup(page,baseURL,{crow=false,safe=false,fail=false}={}){
 await isolatedProduction(page,baseURL);
 await page.goto(ORIGIN+'game/');
 await page.clock.install({time:NOW});await page.clock.pauseAt(NOW+1000);
 // Replace the page app before mounting a deterministic local game fixture.
 await page.goto(ORIGIN);
 const w=createWorld(NOW);w.field.place='park';w.settings.careSound=false;w.settings.motion=false;w.encounters.garden.open=true;w.encounters.gardenFriends.attendees=safe?[]:['b1'];w.encounters.gardenFriends.companions=safe?[]:['b1'];w.encounters.gardenFriends.accompany=!safe;
 await page.evaluate(w=>new Promise((resolve,reject)=>{const r=indexedDB.open('buncho-ureshi-garden-v1',1);r.onupgradeneeded=()=>r.result.createObjectStore('world');r.onsuccess=()=>{const db=r.result,t=db.transaction('world','readwrite');t.objectStore('world').put(w,'current');t.oncomplete=()=>{db.close();resolve();};t.onerror=()=>reject(t.error);};}),w);
 await page.route(ORIGIN+'game/',route=>route.fulfill({body:`<html><head><base href="${ORIGIN}"><link rel="stylesheet" href="src/style.css"><link rel="stylesheet" href="src/game.css"><link rel="stylesheet" href="src/encounter-ui.css"><link rel="stylesheet" href="src/life-care.css"></head><body><main id="root"></main></body></html>`,contentType:'text/html'}));
 await page.goto(ORIGIN+'game/');
 await page.evaluate(async({crow,fail})=>{document.body.dataset.world='buncho';window.dataLayer=[];const {mountGame}=await import('./src/game.js');let draws=0;window.dispose=await mountGame(document.querySelector('#root'),{predatorRandom:()=>{draws++;return draws===2&&!crow?.9:0;}});window.failSaves=()=>{const put=IDBObjectStore.prototype.put;IDBObjectStore.prototype.put=function(...args){if(this.name==='world')throw Error('simulated full disk');return put.apply(this,args);};};},{crow,fail});
 await page.locator('.game-field-nav [data-game-panel=outdoors]').click();await expect(page.locator('.finch-garden-stage')).toHaveAttribute('data-scene-state','ready');
 if(fail)await page.evaluate(()=>window.failSaves());
}
async function tick(page,n){for(let i=0;i<n;i++){await page.clock.runFor(1000);await saved(page);}}
for(const crow of [false,true])for(const safe of [false,true])test(`committed ${crow?'crow':'raptor'} ${safe?'safe':'danger'} and reload`,async({page,baseURL})=>{
 await setup(page,baseURL,{crow,safe});await tick(page,crow?12:5);
 const data=await events(page),arrivals=data.filter(e=>e.name==='garden_predator_arrival');expect(arrivals).toHaveLength(1);expect(arrivals[0].params).toMatchObject({send_to:'G-VVFMFGKXNL',predator_kind:crow?'crow':'raptor',encounter_safety:safe?'safe':'danger',rule_version:GARDEN_RULE_VERSION});
 expect(data.filter(e=>e.name==='garden_first_predator')).toHaveLength(1);
 if(!crow&&!safe){await page.locator('[data-raptor-choice=stay]').click();expect((await events(page)).filter(e=>e.params.outcome==='stay')).toHaveLength(1);}
 await page.evaluate(()=>window.dispose());await page.reload();
 await page.evaluate(async()=>{window.dataLayer=[];document.body.dataset.world='buncho';const {mountGame}=await import('./src/game.js');window.dispose=await mountGame(document.querySelector('#root'),{predatorRandom:()=>1});});
 await tick(page,2);expect((await events(page)).filter(e=>e.name==='garden_predator_arrival')).toHaveLength(0);
});
test('failed save produces no arrival',async({page,baseURL})=>{await setup(page,baseURL,{fail:true});await tick(page,6);expect((await events(page)).filter(e=>e.name.includes('predator'))).toHaveLength(0);expect((await saved(page)).encounters.raptor.active).toBeNull();});
test('local and production QA never load a collector',async({page,baseURL})=>{
 const external=[];await page.context().route('**/*',route=>{if(new URL(route.request().url()).origin!==new URL(baseURL).origin){external.push(route.request().url());return route.abort();}return route.continue();});
 await page.goto(new URL('game/',baseURL).href);await page.evaluate(async moduleURL=>{const {trackEvent}=await import(moduleURL);trackEvent('garden_active_time',{active_seconds:3});},new URL('src/analytics.js',baseURL).href);
 expect(external.filter(u=>/google-analytics|googletagmanager/.test(u))).toHaveLength(0);expect(await events(page)).toHaveLength(0);
 await isolatedProduction(page,baseURL);await page.goto(ORIGIN+'game/?qa=1');expect(await page.locator('script[src*="googletagmanager"]').count()).toBe(0);expect(await events(page)).toHaveLength(0);
 await page.goto(ORIGIN+'game/');await page.evaluate(async()=>{const {trackEvent}=await import('https://djnaoyaman.github.io/buncho-ureshi/src/analytics.js');trackEvent('garden_active_time',{active_seconds:3});});
 expect(await page.locator('script[src*="googletagmanager"]').count()).toBe(0);expect(await events(page)).toHaveLength(0);
});
test('real published GTM encodes GA4 event; every collector request is aborted',async({page,baseURL})=>{
 const blocked=await isolatedProduction(page,baseURL,{realTag:true});
 await page.goto(ORIGIN+'game/');
 await page.evaluate(async ruleVersion=>{const {trackEvent}=await import('https://djnaoyaman.github.io/buncho-ureshi/src/analytics.js');trackEvent('garden_predator_arrival',{site_area:'game',predator_kind:'crow',encounter_safety:'safe',active_seconds:15,rule_version:ruleVersion,measurement_scope:'page'});},GARDEN_RULE_VERSION);
 await expect.poll(()=>blocked.filter(r=>(r.url+'&'+r.body).includes('garden_predator_arrival')).length,{timeout:30000}).toBeGreaterThan(0);
 const candidates=blocked.flatMap(r=>(r.body||'').split('\n').map(line=>({url:r.url,params:new URLSearchParams(new URL(r.url).search+'&'+line)})));
 const hit=candidates.find(r=>r.params.get('en')==='garden_predator_arrival');expect(hit).toBeTruthy();const params=hit.params;
 expect(new URL(hit.url).hostname).toMatch(/(^|\.)google-analytics\.com$/);expect(params.get('tid')).toBe('G-VVFMFGKXNL');expect(params.get('en')).toBe('garden_predator_arrival');expect(params.get('ep.predator_kind')).toBe('crow');expect(params.get('epn.active_seconds')).toBe('15');expect(params.get('ep.rule_version')).toBe(GARDEN_RULE_VERSION);
});
