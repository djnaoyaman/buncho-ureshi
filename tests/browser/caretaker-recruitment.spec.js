import {writeFile} from 'node:fs/promises';
import {test,expect} from '@playwright/test';
import {createWorld,advanceTo,validateWorld,createBird,hireCaretaker,economyToken} from '../../src/engine.js';
import {lifeStatus} from '../../src/life-care.js';
const NOW=Date.UTC(2026,10,4),DAY=86400000;
function seed(){const w=createWorld(NOW,99);w.paused=true;w.settings.motion=false;w.settings.careSound=false;w.economy.gold=w.economy.lifetimeGold=200;return w;}
async function record(page,value){return page.evaluate(value=>new Promise((resolve,reject)=>{const r=indexedDB.open('buncho-ureshi-garden-v1',1);r.onupgradeneeded=()=>r.result.createObjectStore('world');r.onerror=()=>reject(r.error);r.onsuccess=()=>{const db=r.result,tx=db.transaction('world',value?'readwrite':'readonly'),q=value?tx.objectStore('world').put(value,'current'):tx.objectStore('world').get('current');tx.oncomplete=()=>{db.close();resolve(q.result);};tx.onerror=()=>reject(tx.error);};}),value);}
async function start(page,w=seed(),at=NOW){await page.addInitScript(at=>{window.__lifeNow=at;Date.now=()=>window.__lifeNow;localStorage.setItem('buncho.music.v1',JSON.stringify({enabled:false}));localStorage.setItem('buncho.care-sound-choice.v1',JSON.stringify({explicit:true,enabled:false}));},at);await page.goto('');await record(page,w);await page.goto('game/');await expect(page.locator('body')).toHaveAttribute('data-game-intro','done');const toggle=page.locator('.game-scene-controls-toggle');if(await toggle.getAttribute('aria-expanded')!=='true')await toggle.click();}
async function panel(page,id){if(await page.locator('.game-panel-overlay').isVisible())await page.locator('[data-game-close-panel]').click();if(id==='friends')await page.locator('.game-field-nav [data-game-panel=friends]').click();else{await expect(page.locator('#game-nav-open[data-game-open-menu]')).toBeVisible();await page.locator('#game-nav-open[data-game-open-menu]').click();await page.locator(`#game-menu-${id}`).click();}await expect(page.locator('.game-panel-overlay')).toBeVisible();}

function state(kind){
 const w=seed();w.economy.gold=w.economy.lifetimeGold=5000;
 if(kind==='active'||kind==='cap'){let left=kind==='active'?2:29;while(left){const d=left>=7?7:left>=3?3:1;expect(hireCaretaker(w,d,economyToken(w),NOW).changed).toBe(true);left-=d;}}
 if(kind==='expired'){hireCaretaker(w,1,economyToken(w),NOW);advanceTo(w,NOW+2*DAY);}
 w.economy.gold=kind==='poor'?0:kind==='partial'?25:kind==='cap'?5000:200;
 if(kind==='empty')w.birds.forEach(b=>b.home='departed');
 return validateWorld(w);
}
async function recruitment(page){
 await panel(page,'health');if(!await page.locator('.life-caretaker-fold').evaluate(el=>el.open))await page.locator('.life-caretaker-fold > summary').click();
 const section=page.locator('.game-panel-overlay .caretaker-recruitment');
 await expect(section).toHaveCount(1);return section;
}

async function evidence(page,section,info,label,saved){
 await page.evaluate(()=>document.fonts.ready);
 await section.locator('img').evaluateAll(nodes=>Promise.all(nodes.map(img=>img.decode())));
 const scroller=page.locator('.game-panel-overlay > .game-panel');
 const geometry=await section.evaluate(el=>{
  const p=el.closest('.game-panel'),r=el.getBoundingClientRect(),pr=p.getBoundingClientRect();
  return {start:Math.max(0,r.top-pr.top+p.scrollTop),end:r.bottom-pr.top+p.scrollTop,height:p.clientHeight,total:p.scrollHeight,before:p.scrollTop};
 });
 const max=Math.max(0,geometry.total-geometry.height),first=Math.min(max,geometry.start),last=Math.min(max,Math.max(first,geometry.end-geometry.height));
 const offsets=[];for(let y=first;y<last;y+=Math.max(1,Math.floor(geometry.height*.65)))offsets.push(y);offsets.push(last);
 const frames=[];for(const [i,top] of offsets.entries()){
  await scroller.evaluate((el,top)=>{el.scrollTop=top;},top);
  const frame=await scroller.evaluate(el=>({top:el.scrollTop,height:el.clientHeight,total:el.scrollHeight}));
  frames.push(frame);const path=info.outputPath(label+'-'+i+'.png');await page.screenshot({path});await info.attach(label+'-'+i,{path,contentType:'image/png'});
 }
 const path=info.outputPath(label+'.json');
 await writeFile(path,JSON.stringify({project:info.project.name,viewport:page.viewportSize(),geometry,frames,saved},null,2));
 await info.attach(label,{path,contentType:'application/json'});
 expect(frames[0].top).toBeLessThanOrEqual(geometry.start+1);
 expect(frames.at(-1).top+frames.at(-1).height).toBeGreaterThanOrEqual(geometry.end-1);
 for(let i=1;i<frames.length;i++)expect(frames[i].top).toBeLessThanOrEqual(frames[i-1].top+frames[i-1].height);
 await scroller.evaluate((el,top)=>{el.scrollTop=top;},geometry.before);
}
async function saveTransition(info,label,before,expected,actual){
 const path=info.outputPath(label+'-transition.json');await writeFile(path,JSON.stringify({before,expected,actual},null,2));await info.attach(label+'-transition',{path,contentType:'application/json'});
 expect(actual).toEqual(expected);
}

test('layout, exact artwork, native actions and cancellation',async({page},info)=>{
 const w=state('normal');await start(page,w);const before=await record(page),section=await recruitment(page);
 await expect(section.locator('button[data-life-hire]')).toHaveCount(3);
 await expect(section.locator('input,select,textarea')).toHaveCount(0);
 await expect(section.locator('[data-life-hire] strong')).toHaveText(['24 Gold','72 Gold','168 Gold']);
 const img=section.locator('.caretaker-recruitment-sign img');
 await expect(img).toHaveJSProperty('naturalWidth',1199);await expect(img).toHaveJSProperty('naturalHeight',1312);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
 expect(await section.evaluate(el=>el.scrollWidth<=el.clientWidth+1)).toBe(true);
 // All copy must fit inside its overlay, and the overlay inside the artwork.
 const metrics=await section.evaluate(section=>{
  const copy=section.querySelector('.caretaker-recruitment-sign-copy'),rect=el=>{const r=el.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height};};
  const copyRect=rect(copy),art=rect(copy.parentElement),inside=(b,r)=>b.left>=r.left-1&&b.right<=r.right+1&&b.top>=r.top-1&&b.bottom<=r.bottom+1;
  const paragraphs=[...copy.children].map(el=>{const s=getComputedStyle(el);return {class:el.className,rect:rect(el),marginTop:s.marginTop,marginBottom:s.marginBottom,fontSize:s.fontSize,lineHeight:s.lineHeight};});
  const options=section.querySelector('.caretaker-recruitment-options'),cards=[...options.children].map(el=>({rect:rect(el),day:rect(el.querySelector('.caretaker-recruitment-days')),price:rect(el.querySelector('strong')),action:rect(el.querySelector('.caretaker-recruitment-action')),direction:getComputedStyle(el).flexDirection}));
  return {copyRect,art,paragraphs,cards,columns:getComputedStyle(options).gridTemplateColumns,inside:copyRect.left>=art.left&&copyRect.right<=art.right&&copyRect.top>=art.top&&copyRect.bottom<=art.bottom&&paragraphs.every(p=>inside(p.rect,copyRect))};
 });
 const metricsPath=info.outputPath('caretaker-layout-metrics.json');await writeFile(metricsPath,JSON.stringify(metrics,null,2));await info.attach('caretaker-layout-metrics',{path:metricsPath,contentType:'application/json'});
 expect(metrics.inside).toBe(true);
 expect(metrics.paragraphs.every(p=>p.marginTop==='0px'&&p.marginBottom==='0px')).toBe(true);
 expect(metrics.cards.every((c,i)=>c.direction==='column'&&Math.abs(c.rect.top-metrics.cards[0].rect.top)<1&&c.day.bottom<=c.price.top+1&&c.price.bottom<=c.action.top+1&&(i===metrics.cards.length-1||c.rect.right<=metrics.cards[i+1].rect.left+1))).toBe(true);
 await evidence(page,section,info,'caretaker-panel',before);
 const button=section.getByRole('button',{name:/1日.*お願いする.*24 Gold/});
 // Observe the unmodified native Tab path, including periodic render replacement.
 await page.evaluate(()=>{
  const ids=new WeakMap();let next=0;
  const node=el=>el?{id:ids.has(el)?ids.get(el):(ids.set(el,++next),next),tag:el.tagName,domId:el.id,class:el.className,text:el.textContent?.slice(0,90),connected:el.isConnected,hire:el.dataset?.lifeHire}:null;
  const events=[],snapshot=(type,ev)=>{if(events.length<200)events.push({type,time:performance.now(),key:ev?.key,prevented:ev?.defaultPrevented,target:node(ev?.target),active:node(document.activeElement),summary:node(document.querySelector('.life-caretaker-fold > summary')),open:document.querySelector('.life-caretaker-fold')?.open});};
  const listeners=['focusin','focusout','keydown','keyup'].map(type=>{const fn=ev=>snapshot(type,ev);document.addEventListener(type,fn,true);return [type,fn];});
  const observer=new MutationObserver(records=>snapshot('mutation:'+records.filter(r=>r.type==='childList').length));observer.observe(document.querySelector('.game-panel-overlay'),{childList:true,subtree:true,attributes:true,attributeFilter:['open']});
  window.__caretakerFocus={snapshot,finish:()=>{snapshot('finish');observer.disconnect();for(const [type,fn] of listeners)document.removeEventListener(type,fn,true);return events;}};
 });
 try{
  await page.locator('.life-caretaker-fold > summary').focus();
  await page.evaluate(()=>window.__caretakerFocus.snapshot('after-summary-focus'));
  await page.keyboard.press('Tab');
  await page.evaluate(()=>window.__caretakerFocus.snapshot('after-tab'));
  await expect(button).toBeFocused();
  expect(await button.evaluate(b=>getComputedStyle(b).outlineStyle)).not.toBe('none');
 }finally{
  const events=await page.evaluate(()=>window.__caretakerFocus.finish()),path=info.outputPath('caretaker-keyboard-focus.json');
  await writeFile(path,JSON.stringify(events,null,2));await info.attach('caretaker-keyboard-focus',{path,contentType:'application/json'});
 }
 await page.keyboard.press('Escape');await expect(page.locator('.game-panel-overlay')).not.toBeVisible();
 expect(await record(page)).toEqual(before);
 await recruitment(page);await page.locator('.caretaker-recruitment [data-life-hire="3"]').evaluate(b=>{b.querySelector('strong').click();b.click();});
 const expected=structuredClone(before);hireCaretaker(expected,3,economyToken(expected),NOW);
 await expect.poll(async()=>(await record(page)).economy.gold).toBe(128);
 await saveTransition(info,'caretaker',before,expected,await record(page));
 await page.reload();await saveTransition(info,'caretaker-reload',before,expected,await record(page));
});
for(const kind of ['active','expired','cap','poor','partial','empty'])test('state '+kind,async({page},info)=>{
 const w=state(kind),at=kind==='expired'?NOW+2*DAY:NOW;
 await start(page,w,at);const before=await record(page),section=await recruitment(page);
 const disabled=await section.locator('[data-life-hire]').evaluateAll(bs=>bs.map(b=>b.disabled));
 expect(disabled).toEqual(kind==='poor'||kind==='empty'?[true,true,true]:kind==='partial'||kind==='cap'?[false,true,true]:[false,false,false]);
 await expect(section.locator('.life-bird-title .life-badge')).toHaveText(kind==='active'||kind==='cap'?'契約中':'前払い');
 expect(await record(page)).toEqual(before);
 await evidence(page,section,info,'caretaker-'+kind,before);
 if(kind==='active'||kind==='expired'||kind==='cap'){
  const expected=structuredClone(before);hireCaretaker(expected,1,economyToken(expected),at);
  await section.locator('[data-life-hire="1"]').click();await expect.poll(async()=>(await record(page)).economy.gold).toBe(before.economy.gold-24);
  await saveTransition(info,'caretaker',before,expected,await record(page));
 }
});
