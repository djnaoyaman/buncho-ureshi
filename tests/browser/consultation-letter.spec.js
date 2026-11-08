import {test,expect} from '@playwright/test';
import {consultationFixture,expectedDecision,NOW} from '../fixtures/consultation-letter.js';
const SIZES=[{width:320,height:740},{width:390,height:844},{width:844,height:390},{width:1440,height:1000}];
async function record(page,value){return page.evaluate(value=>new Promise((resolve,reject)=>{
 const r=indexedDB.open('buncho-ureshi-garden-v1',1);r.onupgradeneeded=()=>r.result.createObjectStore('world');r.onerror=()=>reject(r.error);
 r.onsuccess=()=>{const db=r.result,tx=db.transaction('world',value?'readwrite':'readonly'),q=value?tx.objectStore('world').put(value,'current'):tx.objectStore('world').get('current');tx.oncomplete=()=>{db.close();resolve(q.result);};tx.onerror=tx.onabort=()=>{db.close();reject(tx.error);};};
}),value);}
async function start(page,f,size=SIZES[1]){
 await page.setViewportSize(size);await page.addInitScript(now=>{Date.now=()=>now;localStorage.setItem('buncho.music.v1',JSON.stringify({enabled:false}));localStorage.setItem('buncho.care-sound-choice.v1',JSON.stringify({explicit:true,enabled:false}));},NOW);
 await page.route(/youtube|youtu\.be|googlevideo|ytimg/i,r=>r.abort());await page.goto('');await record(page,f.world);await page.goto('game/');
 await expect(page.locator('body')).toHaveAttribute('data-game-intro','done');await expect(page.locator('.game-logo-intro')).toHaveCount(0);expect(await record(page)).toEqual(f.world);
 if(f.kind!=='adoption'){
  const toggle=page.locator('.game-scene-controls-toggle');if(await toggle.getAttribute('aria-expanded')!=='true')await toggle.click();
  await page.locator('#game-nav-open').click();await page.locator('#game-menu-family').click();
  if(f.kind==='independence')await page.locator('.game-independence > summary').click();
 }
}
function controls(page,f){
 const dialog=page.locator(`.game-${f.kind}-dialog`);
 return {ask:page.locator(f.kind==='adoption'?'[data-adoption-open]':`[data-${f.kind}-open="${f.id}"]`),dialog,cancel:dialog.locator(`[data-${f.kind}-cancel]`),accept:dialog.locator(f.kind==='adoption'?'[data-adoption-decision="accept"]':`[data-${f.kind}-accept]`)};
}
async function open(c){
 // Cancellation starts a store poll. An immediate open may be safely ignored by pollFlight.
 // Retry the read-only request against the current locator until the actual dialog opens.
 await expect(async()=>{
  if(!await c.dialog.isVisible())await c.ask.click();
  await expect(c.dialog).toBeVisible({timeout:250});
 }).toPass({timeout:5000,intervals:[50,100,250]});
}
async function reachable(control,page){
 await control.scrollIntoViewIfNeeded();await expect(control).toBeInViewport();const b=await control.boundingBox(),s=page.viewportSize();
 expect(b.width).toBeGreaterThanOrEqual(44);expect(b.height).toBeGreaterThanOrEqual(44);expect(b.x).toBeGreaterThanOrEqual(-1);expect(b.x+b.width).toBeLessThanOrEqual(s.width+1);expect(b.y).toBeGreaterThanOrEqual(-1);expect(b.y+b.height).toBeLessThanOrEqual(s.height+1);
 expect(await control.evaluate(e=>{const b=e.getBoundingClientRect(),hit=document.elementFromPoint(b.x+b.width/2,b.y+b.height/2);return hit===e||e.contains(hit);})).toBe(true);
}
async function capture(page,info,label,target){
 const offsets=[];
 if(label.endsWith('bottom')){
  const metrics=await target.evaluate(e=>{const d=e.closest('dialog');return {height:d.clientHeight,total:d.scrollHeight};});
  if(metrics.total>2*metrics.height){
   const step=Math.max(1,metrics.height-40),max=metrics.total-metrics.height;
   // Upper and bottom shots already cover the ends; overlap intermediate tiles by 40px.
   for(let offset=step;offset<max-40;offset+=step){
    const actual=await target.evaluate((e,y)=>{const d=e.closest('dialog');d.scrollTop=y;return d.scrollTop;},offset);
    offsets.push(actual);const name=`${label}-middle-${offsets.length}`,path=info.outputPath(`${name}.png`);
    await page.screenshot({path});await info.attach(name,{path,contentType:'image/png'});
   }
  }
 }
 await target.scrollIntoViewIfNeeded();if(label.endsWith('upper'))await target.evaluate(e=>{e.closest('dialog').scrollTop=0;});
 if(label.endsWith('bottom'))await target.evaluate(e=>{const d=e.closest('dialog');d.scrollTop=d.scrollHeight;});
 offsets.push(await target.evaluate(e=>e.closest('dialog').scrollTop));
 const path=info.outputPath(`${label}.png`);await page.screenshot({path});await info.attach(label,{path,contentType:'image/png'});
 await info.attach(`${label}-scroll-offsets`,{body:JSON.stringify(offsets),contentType:'application/json'});
}
async function structure(page,f,c){
 await expect(c.dialog).toBeVisible();await expect(c.cancel).toBeFocused();await expect(c.dialog.locator('.game-consultation-letter')).toHaveCount(1);
 await expect(c.dialog.locator('button')).toHaveCount(f.kind==='adoption'?3:2);
 await expect(c.dialog.locator('.game-consultation-portrait .game-mini-bird')).toHaveCount(f.ids.length);
 await expect.poll(()=>c.dialog.locator('.game-consultation-portrait img').evaluateAll(images=>images.length>0&&images.every(i=>i.complete&&i.naturalWidth>0))).toBe(true);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
 expect(await c.dialog.evaluate(e=>e.scrollWidth<=e.clientWidth+1)).toBe(true);
 expect(await c.dialog.locator('.game-sprite').evaluateAll(sprites=>sprites.every(e=>{const b=e.getBoundingClientRect(),p=e.closest('.game-consultation-portrait').getBoundingClientRect();return b.left>=p.left-1&&b.right<=p.right+1;}))).toBe(true);
}
async function keyboardCancel(page,f,c,before){
 await c.cancel.press('Enter');await expect(c.dialog).not.toBeVisible();await expect(c.ask).toBeFocused();expect(await record(page)).toEqual(before);
 await open(c);await expect(c.cancel).toBeFocused();const next=f.kind==='adoption'?c.dialog.locator('[data-adoption-decision="later"]'):c.accept;
 await c.cancel.press('Tab');await expect(next).toBeFocused();await next.press('Shift+Tab');await expect(c.cancel).toBeFocused();
 await c.cancel.press('Shift+Tab');await expect(c.accept).toBeFocused();await c.accept.press('Tab');await expect(c.cancel).toBeFocused();
 await c.dialog.press('Escape');await expect(c.dialog).not.toBeVisible();await expect(c.ask).toBeFocused();expect(await record(page)).toEqual(before);
 await open(c);await c.cancel.click();await expect(c.dialog).not.toBeVisible();expect(await record(page)).toEqual(before);
}
async function commit(page,f,c,before,choice='accept'){
 const expected=expectedDecision(before,f,choice),button=choice==='later'?c.dialog.locator('[data-adoption-decision="later"]'):c.accept;
 await reachable(button,page);expect(await button.evaluate(e=>{const d=e.closest('dialog');e.click();const locked=[...d.querySelectorAll('button')].every(b=>b.disabled);d.querySelector('[autofocus]').click();e.click();return {locked,open:d.open};})).toEqual({locked:true,open:true});await expect(c.dialog).not.toBeVisible();await expect.poll(()=>record(page)).toEqual(expected);
 await page.reload();await expect(page.locator('body')).toHaveAttribute('data-game-intro','done');expect(await record(page)).toEqual(expected);
}
for(const size of SIZES)for(const kind of ['adoption','independence','successor'])test(`consultation A ${kind} complete letter and safe consent ${size.width}x${size.height}`,async({page},info)=>{
 const f=consultationFixture(kind);await start(page,f,size);const c=controls(page,f),before=await record(page);await open(c);await structure(page,f,c);
 if(size.width===390){
  // Observe native showModal/autofocus before any scroll or element screenshot.
  const initial=await c.dialog.evaluate(d=>{
   const r=d.getBoundingClientRect(),h=d.querySelector('h2').getBoundingClientRect(),active=document.activeElement;
   return {scrollTop:d.scrollTop,scrollHeight:d.scrollHeight,clientHeight:d.clientHeight,headingInView:h.top>=Math.max(0,r.top)&&h.bottom<=Math.min(innerHeight,r.bottom),activeControl:active?.outerHTML,hasSafeFocus:active===d.querySelector('[autofocus]')};
  });
  const path=info.outputPath(`${kind}-initial-native-open.png`);await page.screenshot({path});await info.attach(`${kind}-initial-native-open`,{path,contentType:'image/png'});
  await info.attach(`${kind}-initial-native-state`,{body:JSON.stringify(initial,null,2),contentType:'application/json'});expect(initial.hasSafeFocus).toBe(true);
 }
 await capture(page,info,`${kind}-upper`,c.dialog.locator('h2'));
 // Full portrait evidence remains inspectable when a short viewport cannot show the entire letter.
 await info.attach(`${kind}-full-portrait`,{body:await c.dialog.locator('.game-consultation-portrait').screenshot(),contentType:'image/png'});
 for(const b of await c.dialog.locator('button').all())await reachable(b,page);
 await capture(page,info,`${kind}-bottom`,c.accept);await keyboardCancel(page,f,c,before);await open(c);await commit(page,f,c,before);
});
for(const [kind,options] of [['adoption',{long:true}],['independence',{pair:true,long:true}],['successor',{returning:true,long:true}]])test(`consultation A ${kind} long names, paired identity or same-bird return`,async({page},info)=>{
 const f=consultationFixture(kind,options);await start(page,f,SIZES[0]);const c=controls(page,f),before=await record(page);await open(c);await structure(page,f,c);
 if(kind==='successor')await expect(c.dialog).toContainText('同じ文鳥が、おうちに帰ってきます。');
 if(kind==='independence'){await expect(c.dialog).toContainText('2羽が家族の枠');expect(f.ids).toEqual(['b3','b4']);}
 await capture(page,info,'long-name-upper',c.dialog.locator('h2'));await info.attach('full-portraits',{body:await c.dialog.locator('.game-consultation-portrait').screenshot(),contentType:'image/png'});await capture(page,info,'long-name-bottom',c.accept);
 await commit(page,f,c,before,kind==='adoption'?'later':'accept');
});
for(const kind of ['adoption','independence','successor'])test(`consultation A ${kind} storage failure unlocks and cancellation is exact`,async({page})=>{
 const f=consultationFixture(kind);await start(page,f);const c=controls(page,f);await open(c);const before=await record(page);
 await page.evaluate(()=>{window.__originalConsultPut=IDBObjectStore.prototype.put;IDBObjectStore.prototype.put=function(){throw new DOMException('Consultation persistence test','QuotaExceededError');};});
 await c.accept.click();await expect(c.dialog.locator('[role=status]')).not.toBeEmpty();for(const b of await c.dialog.locator('button').all())await expect(b).toBeEnabled();
 expect(await record(page)).toEqual(before);await page.evaluate(()=>{IDBObjectStore.prototype.put=window.__originalConsultPut;});await c.cancel.click();await expect(c.dialog).not.toBeVisible();expect(await record(page)).toEqual(before);
 await open(c);await commit(page,f,c,before);
});
for(const kind of ['independence','successor'])test(`consultation A ${kind} detached stale consent cannot commit after peer update`,async({page,context})=>{
 const f=consultationFixture(kind);await start(page,f);const c=controls(page,f);await open(c);const stale=await c.accept.elementHandle();
 const peer=await context.newPage();await peer.goto('');await peer.evaluate(async id=>{const {openGameStore}=await import('/buncho-ureshi/src/game-store.js'),{renameBird}=await import('/buncho-ureshi/src/engine.js'),store=await openGameStore();try{await store.transact(w=>{renameBird(w,id,'新しい家族名');return w;});}finally{store.close();}const channel=new BroadcastChannel('buncho-garden-updates');channel.postMessage({updated:true});channel.close();},f.id);await peer.close();await page.bringToFront();
 await expect(c.dialog).not.toBeVisible();const saved=await record(page);await stale.evaluate(e=>e.click());expect(await record(page)).toEqual(saved);await open(c);await expect(c.dialog).toContainText('新しい家族名');await c.cancel.click();expect(await record(page)).toEqual(saved);
});
