import {test,expect} from '@playwright/test';
import {createWorld,validateWorld} from '../../src/engine.js';
import {ENDING_CATALOG} from '../../src/collection-endings.js';

import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';

const now=1794096000000;
const origin='https://djnaoyaman.github.io';
const base=origin+'/buncho-ureshi/';
const movie=base+'game-endings/raptors-v5.mp4';
const species=ENDING_CATALOG.find(x=>x.id==='raptors').ids;
async function save(page,value){
 return page.evaluate(value=>new Promise((resolve,reject)=>{
  const request=indexedDB.open('buncho-ureshi-garden-v1',1);
  request.onupgradeneeded=()=>request.result.createObjectStore('world');
  request.onerror=()=>reject(request.error);
  request.onsuccess=()=>{
   const db=request.result, tx=db.transaction('world',value?'readwrite':'readonly');
   const store=tx.objectStore('world'),op=value?store.put(value,'current'):store.get('current');
   tx.oncomplete=()=>{db.close();resolve(op.result);};
   tx.onabort=tx.onerror=()=>{db.close();reject(tx.error);};
  };
 }),value);
}
async function start(page,count,earned=false){
 await page.setViewportSize({width:402,height:874});
 await page.addInitScript(now=>{
  Date.now=()=>now;
  localStorage.setItem('buncho.care-sound-choice.v1',JSON.stringify({explicit:true,enabled:false}));
  localStorage.setItem('buncho.music.v1',JSON.stringify({enabled:false}));
 },now);
 const w=createWorld(now,418);
 w.paused=true;
 w.settings.motion=false;
 w.settings.careSound=false;
 w.encounters.raptor.lastArrivalAt=now;
 w.encounters.raptor.visits=species.slice(0,count).map(id=>({id,firstTick:0,lastTick:0,count:1,petPoints:0}));
 if(earned)w.collectionEndings.entries.push({id:'raptors',unlockedTick:0,acknowledged:true,lease:null,playback:'completed'});
 validateWorld(w);
 const landing=await page.goto(base+'game/');
 expect(landing?.status()).toBe(200);
 expect(page.url()).toBe(base+'game/');
 await save(page,w);
 await page.reload();
 await expect(page.locator('body')).toHaveAttribute('data-game-intro','done');
 return w;
}
// These are literal release inputs, projected against the exact live Type I base film-only release.
// Reconcile them with the final checked-in release and do not stage on mismatch.
const gameToken='0a383829bd48';
const mediaBytes=19_451_231;
const mediaHash='6dfec74cf2396262a08daddcef163425b2818695822c35898fea2cc3818b6d1b';
const prefixHash='7d44b9499985e3f5a3192652e6c29deddde99ae846d21b3153071773d214c2a7';
const creditHash='ea533ac3a24729cd196d39b40018c62556215c65ad7c90865c7d952de615c29e';
const ledgerHash='4d7a0dca1c30b56b937395d758217c8a05f5b212d369374530c6e28cad502986';
const digest=body=>createHash('sha256').update(body).digest('hex');
const ledger=readFileSync(new URL('../../site/game-protected-baseline.json',import.meta.url));
const manifest=JSON.parse(readFileSync(new URL('../../media-source/ending04/manifest.json',import.meta.url),'utf8'));
const {files}=JSON.parse(ledger);
test('production v5: protected mapping, complete bytes, 206 prefix, exact credits',async({request})=>{
 test.setTimeout(90_000);
 expect(digest(ledger)).toBe(ledgerHash);
 expect([manifest.output,manifest.bytes,manifest.sha256]).toEqual(['raptors-v5.mp4',mediaBytes,mediaHash]);
 expect(files['game-endings/raptors-v5.mp4']).toBe(mediaHash);
 expect(files['game-endings/raptors-v5-credits.txt']).toBe(creditHash);
 async function get(path,status,mime,extra={}){
  const url=new URL(path,base);
  expect(url.origin).toBe(origin);
  expect(url.pathname.startsWith('/buncho-ureshi/')).toBe(true);
  const response=await request.get(url.href,{maxRedirects:0,maxRetries:0,timeout:35_000,headers:{'cache-control':'no-cache',...extra}});
  try{
   expect(response.status(),path).toBe(status);
   expect(response.url(),path).toBe(url.href);
   const headers=response.headers();
   expect(headers['content-type'],path).toMatch(mime);
   return {headers,body:await response.body()};
  }finally{await response.dispose();}
 }
 const js=/^(?:text|application)\/(?:x-)?javascript\b/i;
 await test.step('canonical game, immutable app/game import chain and v5 player',async()=>{
  const protectedGet=async(path,key,mime)=>{
   const {body}=await get(path,200,mime);
   expect(files[key],key).toMatch(/^[a-f0-9]{64}$/);
   expect(digest(body),key).toBe(files[key]);
   return body.toString();
  };
  const html=await protectedGet('game/','game/index.html',/^text\/html\b/i);
  const app=html.match(/\bsrc="(src\/app\.js\?v=[a-f0-9-]+)"/)?.[1];
  expect(app).toBeTruthy();
  expect(app.split('=')[1].split('-')).toContain(gameToken);
  const entry=await protectedGet(app,'src/app.js',js);
  expect(entry).toContain('./game.js?v='+gameToken);
  const game=await protectedGet('src/game.js?v='+gameToken,'src/game.js',js);
  expect(game).toContain('./collection-ending-player.js?v='+gameToken);
  const player=await protectedGet('src/collection-ending-player.js?v='+gameToken,'src/collection-ending-player.js',js);
  expect(player).toMatch(/\braptors\s*:\s*['"]raptors-v5\.mp4['"]/);
 });
 await test.step('full MP4 SHA256, range 206 equals approved prefix, and credits',async()=>{
  const {body}=await get(movie,200,/^video\/mp4\b/i);
  expect(body.length).toBe(mediaBytes);
  expect(digest(body)).toBe(mediaHash);
  const partial=await get(movie,206,/^video\/mp4\b/i,{Range:'bytes=0-65535','Accept-Encoding':'identity'});
  expect(partial.headers['content-range']).toBe('bytes 0-65535/'+mediaBytes);
  expect(partial.body.length).toBe(65536);
  expect(digest(partial.body)).toBe(prefixHash);
  expect(partial.body.equals(body.subarray(0,65536))).toBe(true);
  const credits=await get('game-endings/raptors-v5-credits.txt',200,/^text\/plain\b/i);
  expect(digest(credits.body)).toBe(creditHash);
 });
});
test('published native diary replay decodes and seeks the exact approved v5',async({page})=>{
 const saved=await start(page,9,true);
 await expect(page.locator('.game-ending-dialog')).toHaveCount(0);
 expect((await save(page)).collectionEndings.entries).toEqual(saved.collectionEndings.entries);
 if(await page.locator('.game-scene-controls-toggle').getAttribute('aria-expanded')!=='true')await page.locator('.game-scene-controls-toggle').click();
 await page.locator('#game-nav-open').click();await page.locator('#game-menu-diary').click();
 await page.locator('[data-ending-replay="raptors"]').click();
 const dialog=page.locator('.game-ending-dialog'),video=dialog.locator('video');
 await expect(dialog).toBeVisible();
 await expect(video).toHaveAttribute('src',movie);
 await video.evaluate(v=>{v.framesObserved=0;const observed=()=>{v.framesObserved++;if(v.isConnected)v.requestVideoFrameCallback(observed);};v.requestVideoFrameCallback(observed);});
 if(await video.evaluate(v=>v.paused))await dialog.locator('[data-ending-play]').click();
 await expect.poll(()=>video.evaluate(v=>v.framesObserved),{timeout:20000}).toBeGreaterThan(10);
 expect(await video.evaluate(v=>[v.videoWidth,v.videoHeight,v.error?.code??null])).toEqual([720,1280,null]);
 expect(await video.evaluate(v=>v.duration)).toBeCloseTo(66.375,2);
 await video.evaluate(v=>{window.endedNative=false;v.addEventListener('ended',e=>{window.endedNative=e.isTrusted;},{once:true});v.currentTime=v.duration-.8;});
 await expect(dialog).toHaveCount(0,{timeout:30000});
 expect(await page.evaluate(()=>window.endedNative)).toBe(true);
 expect((await save(page)).collectionEndings.entries).toEqual(saved.collectionEndings.entries);
});
