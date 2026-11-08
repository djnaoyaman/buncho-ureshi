import {test,expect} from '@playwright/test';
import {eventText,bumpRevision} from '../../src/engine.js';
import {diaryFixture,validated,expectedDiary,detailSelector,summarySelector,FULL,CARD} from '../fixtures/diary-paper.js';

// Match date evidence across the browser and Node assertion environments.
test.use({timezoneId:'UTC'});
async function record(page,value){
  return page.evaluate(value=>new Promise((resolve,reject)=>{
    const request=indexedDB.open('buncho-ureshi-garden-v1',1);
    request.onupgradeneeded=()=>request.result.createObjectStore('world');request.onerror=()=>reject(request.error);
    request.onsuccess=()=>{
      const db=request.result,tx=db.transaction('world',value?'readwrite':'readonly');
      const result=value?tx.objectStore('world').put(value,'current'):tx.objectStore('world').get('current');
      tx.oncomplete=()=>{db.close();resolve(result.result);};
      tx.onerror=()=>{db.close();reject(tx.error);};tx.onabort=()=>{db.close();reject(tx.error);};
    };
  }),value);
}
async function ready(page){
  await expect(page.locator('body')).toHaveAttribute('data-game-intro','done');
  await expect(page.locator('.game-logo-intro')).toHaveCount(0);
  await expect(page.locator('[data-home-role="self"]')).toBeVisible();
}
async function start(page,world,size){
  await page.setViewportSize(size);
  await page.addInitScript(now=>{
    Date.now=()=>now;localStorage.setItem('buncho.music.v1',JSON.stringify({enabled:false}));
    localStorage.setItem('buncho.care-sound-choice.v1',JSON.stringify({explicit:true,enabled:false}));
  },world.lastUpdated);
  await page.route(/youtube|youtu\.be|googlevideo|ytimg/i,route=>route.abort());
  await page.goto('');await record(page,world);await page.goto('game/');await ready(page);
  expect(await record(page)).toEqual(world);
}
async function shot(page,info,label,target){
  await Promise.all([
    expect(page.locator('body')).toHaveAttribute('data-game-intro','done'),
    expect(page.locator('.game-logo-intro')).toHaveCount(0)
  ]);
  await target.scrollIntoViewIfNeeded();await expect(target).toBeInViewport();
  const path=info.outputPath(`${label}.png`);await page.screenshot({path});await info.attach(label,{path,contentType:'image/png'});
}
async function openDiary(page){
 const toggle=page.locator('.game-scene-controls-toggle');if(await toggle.getAttribute('aria-expanded')!=='true')await toggle.click();
 await page.locator('#game-nav-open').click();await page.locator('#game-menu-diary').click();
 await expect(page.locator('.diary-paper-heading h3')).toHaveText('文鳥たちの日記');
 await expect(page.locator('.diary-paper-heading h3')).toBeFocused();
 await expect(page.locator('.diary-paper-heading')).toBeInViewport();
 await expect.poll(()=>page.locator('.diary-paper-portrait img').evaluateAll(images=>images.every(i=>i.complete&&i.naturalWidth>0))).toBe(true);
}
async function fits(page){
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
 for(const selector of ['.game-panel-overlay > .game-panel','.diary-paper','.diary-paper-pages','.diary-paper-all'])expect(await page.locator(selector).evaluate(e=>e.scrollWidth<=e.clientWidth+1),selector).toBe(true);
 expect(await page.locator('.diary-paper-portrait .game-sprite').evaluateAll(images=>images.every(img=>{
  const outer=img.closest('.diary-paper-portrait').getBoundingClientRect(),pose=img.querySelector('.game-pose-window')||img,box=pose.getBoundingClientRect();
  return box.left>=outer.left-1&&box.right<=outer.right+1&&box.top>=outer.top-1&&box.bottom<=outer.bottom+1;
 }))).toBe(true);
}
async function content(page,w){
 const {all,important}=expectedDiary(w);
 await expect(page.locator('.diary-paper-pages > .diary-paper-entry')).toHaveCount(important.length);
 await expect(page.locator('.diary-paper-all > .diary-paper-entry')).toHaveCount(all.length);
 // Batch reading keeps 240 exact entry checks cheap in both Chrome and WebKit.
 for(const [scope,events,selector] of [['milestone',important,'.diary-paper-pages'],['all',all,'.diary-paper-all']]){
  const actual=await page.locator(`${selector} > .diary-paper-entry`).evaluateAll(rows=>rows.map(row=>({
   key:row.querySelector('details').dataset.gameDetails,text:row.querySelector('.diary-paper-event').textContent,
   at:row.querySelector('time').dateTime,date:row.querySelector('.diary-paper-date').textContent,
   card:row.querySelector('[data-game-event-art]')?.dataset.gameEventArt||null,name:row.querySelector('figcaption')?.textContent||null
  })));
  expect(actual).toEqual(events.map(e=>({key:`diary-${scope}-${e.id}`,text:eventText(w,e),at:new Date(e.at).toISOString(),
   date:new Date(e.at).toLocaleString('ja-JP',{timeZone:'UTC'}),card:CARD.has(e.kind)?e.id:null,name:scope==='milestone'?w.birds.find(b=>b.id===e.ids[0]).name:null})));
 }
}
for(const size of [{width:320,height:740},{width:390,height:844},{width:844,height:390},{width:1440,height:1000}])test(`diary C actual app, 12 + 240, native disclosure and navigation ${size.width}x${size.height}`,async({page},info)=>{
 const w=diaryFixture(),{important,all}=expectedDiary(w);await start(page,w,size);await openDiary(page);await content(page,w);await fits(page);
 await shot(page,info,'important-upper',page.locator('.diary-paper-heading'));
 await shot(page,info,'important-lower',page.locator(summarySelector('milestone',important.at(-1).id)));
 const e=important.find(e=>CARD.has(e.kind)),summary=page.locator(summarySelector('milestone',e.id)),detail=page.locator(detailSelector('milestone',e.id));
 await summary.focus();await page.keyboard.press('Enter');await expect(detail).toHaveAttribute('open','');
 await shot(page,info,'important-detail',detail.locator(':scope > p').first());
 await page.keyboard.press('Space');await expect(detail).not.toHaveAttribute('open','');await page.keyboard.press('Enter');
 const full=page.locator(FULL),fullSummary=page.locator(`${FULL} > summary`);
 await shot(page,info,'full-summary',fullSummary);await fullSummary.focus();await page.keyboard.press('Space');await expect(full).toHaveAttribute('open','');
 await page.keyboard.press('Tab');await expect(page.locator(summarySelector('all',all[0].id))).toBeFocused();
 await page.keyboard.press('Shift+Tab');await expect(fullSummary).toBeFocused();
 await shot(page,info,'all-upper',page.locator(summarySelector('all',all[0].id)));
 await shot(page,info,'all-lower',page.locator(summarySelector('all',all.at(-1).id)));
 const lowerSummary=page.locator(summarySelector('all',all.at(-1).id));await lowerSummary.focus();await page.keyboard.press('Enter');
 await expect(page.locator(detailSelector('all',all.at(-1).id))).toHaveAttribute('open','');
 const panel=page.locator('.game-panel-overlay > .game-panel'),scroll=await panel.evaluate(el=>el.scrollTop);
 const peer=structuredClone(w);bumpRevision(peer);validated(peer);
 await page.locator('.diary-paper-heading').evaluate(el=>el.dataset.prePoll='true');await record(page,peer);
 await expect(page.locator('.diary-paper-heading')).not.toHaveAttribute('data-pre-poll','true',{timeout:10000});
 await expect(lowerSummary).toBeFocused();expect(await panel.evaluate(el=>el.scrollTop)).toBeCloseTo(scroll,0);
 await expect(full).toHaveAttribute('open','');await expect(detail).toHaveAttribute('open','');await fits(page);expect(await record(page)).toEqual(peer);
 for(let i=0;i<2;i++){await page.locator('[data-game-close-panel]').click();await expect(page.locator('#game-nav-open')).toBeFocused();await openDiary(page);await content(page,peer);expect(await record(page)).toEqual(peer);}
 const card=page.locator(`.diary-paper-pages [data-game-event-art="${e.id}"]`);await card.focus();await page.keyboard.press('Enter');
 await expect(page).toHaveURL(/\/studio\/$/);await expect(page.locator('#studio-root')).toBeVisible();expect(await record(page)).toEqual(peer);
 await page.goBack();await ready(page);await openDiary(page);await content(page,peer);expect(await record(page)).toEqual(peer);
});
for(const kind of ['historical','manual-omochi','deceased','empty'])test(`diary C real ${kind} identity, stage and long-name evidence`,async({page},info)=>{
 const w=diaryFixture(kind),{important}=expectedDiary(w);await start(page,w,{width:390,height:844});await openDiary(page);await content(page,w);await fits(page);
 await shot(page,info,`${kind}-heading`,page.locator('.diary-paper-heading'));
 if(kind==='empty')await shot(page,info,'empty-important',page.locator('.diary-paper-empty'));
 else for(const e of important){
  const row=page.locator(detailSelector('milestone',e.id)).locator('..');
  const bird=w.birds.find(b=>b.id===e.ids[0]);
  const stage=e.kind==='egg'?'egg':e.kind==='hatch'?'chick':e.kind==='grow'?e.data.stage:bird.stage;
  await Promise.all([
    expect(row.locator('figcaption')).toHaveText(bird.name),
    expect(row.locator('.game-sprite')).toHaveAttribute('data-stage',stage),
    expect(row.locator('.game-sprite')).toHaveAttribute('data-color',bird.color)
  ]);
  await shot(page,info,`${kind}-${e.kind}-${e.id}`,row.locator('.diary-paper-portrait'));
 }
 expect(await record(page)).toEqual(w);await page.reload();await ready(page);await openDiary(page);await content(page,w);expect(await record(page)).toEqual(w);
});
