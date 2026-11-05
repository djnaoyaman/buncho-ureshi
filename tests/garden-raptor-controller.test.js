import test from 'node:test';
import assert from 'node:assert/strict';
import {Window} from 'happy-dom';
import {createWorld,validateWorld,serializeWorld,parseSave} from '../src/engine.js';
import {mountGardenRaptors} from '../src/garden-raptor-controller.js';
import {arriveGardenRaptor,raptorToken,escapeGardenRaptor,petGardenRaptor} from '../src/garden-raptors.js';
import {lifeStatus} from '../src/life-care.js';
import {renderRaptorNotice,renderRaptorCatalog,renderRaptorNotebook} from '../src/garden-raptor-ui.js';
import {mountEncounterPanel} from '../src/encounter-controller.js';
const NOW=Date.UTC(2026,10,4,9),sleep=ms=>new Promise(r=>setTimeout(r,ms));
function fixture(active=false){const w=createWorld(NOW);w.field.place='park';w.encounters.garden.open=true;if(active)arriveGardenRaptor(w,'black-kite',NOW,{...raptorToken(w),gardenId:w.encounters.garden.id});return w;}
function setup(w=fixture(),options={}){
 const win=new Window();win.document.body.innerHTML='<main id="root"><div class="finch-garden-stage" data-scene-state="ready"></div></main>';const root=win.document.querySelector('#root');
 let elapsed=0,n=0;const timers=new Map(),originalNow=Date.now;Date.now=()=>NOW+elapsed;win.setTimeout=fn=>{timers.set(++n,fn);return n;};win.clearTimeout=n=>timers.delete(n);Object.defineProperty(win.performance,'now',{value:()=>elapsed,configurable:true});
 const changes=[];const controller=mountGardenRaptors(root,{getWorld:()=>w,earlyPredatorVisits:false,random:()=>0,transact:async fn=>fn(w),onChange:x=>changes.push(x),...options});
 const tick=async(ms=1000)=>{elapsed+=ms;const [id,fn]=timers.entries().next().value||[];assert.ok(fn);timers.delete(id);const flight=fn();await Promise.resolve();return {flight};};
 const run=async n=>{for(let i=0;i<n;i++)await (await tick()).flight;};
 const close=()=>{controller.destroy();Date.now=originalNow;win.happyDOM.abort();};return {win,root,controller,tick,run,close,timers,changes,world:w};
}
test('visible ready dwell commits one warning at 2min then exactly one accident after 60s',async()=>{
 const w=fixture(),s=setup(w);try{await s.run(120);assert.equal(w.encounters.raptor.active,null);await s.run(1);assert.equal(w.encounters.raptor.active.remainingMs,60000);await s.run(59);assert.equal(lifeStatus(w,'b1').death,null);await s.run(1);assert.equal(lifeStatus(w,'b1').death.cause,'accident');assert.equal(w.events.filter(e=>e.kind==='death').length,1);assert.equal(s.changes.filter(x=>x.structural).length,2);validateWorld(w);}finally{s.close();}
});
test('hidden, offline, paused and suspended time never consumes the saved warning',async()=>{
 for(const kind of ['hidden','offline','paused','suspended']){const w=fixture(true),s=setup(w);try{await s.run(10);const before=w.encounters.raptor.active.remainingMs;
 if(kind==='hidden'){Object.defineProperty(s.win.document,'visibilityState',{value:'hidden',configurable:true});s.win.document.dispatchEvent(new s.win.Event('visibilitychange'));}if(kind==='offline'){Object.defineProperty(s.win.navigator,'onLine',{value:false,configurable:true});s.win.dispatchEvent(new s.win.Event('offline'));}if(kind==='paused')w.paused=true;
 await (await s.tick(100000)).flight;assert.equal(w.encounters.raptor.active.remainingMs,before);
 if(kind==='hidden')Object.defineProperty(s.win.document,'visibilityState',{value:'visible',configurable:true});if(kind==='offline')Object.defineProperty(s.win.navigator,'onLine',{value:true,configurable:true});w.paused=false;await s.run(2);assert.ok(w.encounters.raptor.active.remainingMs>=before-2000);assert.equal(lifeStatus(w,'b1').death,null);
 }finally{s.close();}}
});
test('notebook and menus do not dismiss a warning; explicit home escape prevents death',async()=>{
 const w=fixture(true),s=setup(w);try{await s.run(10);s.root.innerHTML='<section>図鑑と保存設定</section>';w.encounters.garden.open=false;await s.run(10);assert.equal(w.encounters.raptor.active.remainingMs,41000);escapeGardenRaptor(w,raptorToken(w));await s.run(100);assert.equal(lifeStatus(w,'b1').death,null);assert.equal(w.field.place,'home');assert.equal(w.encounters.raptor.visits.length,1);}finally{s.close();}
});
test('reload preserves remaining seconds and does not deliver offline catch-up',async()=>{
 let w=fixture(true),s=setup(w);try{await s.run(20);w=parseSave(serializeWorld(w));}finally{s.close();}const remaining=w.encounters.raptor.active.remainingMs;s=setup(w);try{await s.run(1);assert.equal(w.encounters.raptor.active.remainingMs,remaining);assert.match(renderRaptorNotice(w),/41/);validateWorld(w);}finally{s.close();}
});
test('queued arrival invalidates on hidden, destruction, other garden or replacement world',async()=>{
 for(const change of ['hidden','destroy','garden','world']){let w=fixture(),release;const s=setup(w,{getWorld:()=>w,transact:fn=>new Promise(resolve=>{release=()=>resolve(fn(w));})});try{await s.run(120);const {flight}=await s.tick();assert.ok(release);const old=w;if(change==='hidden')s.win.document.dispatchEvent(new s.win.Event('visibilitychange'));if(change==='destroy')s.controller.destroy();if(change==='garden')w.encounters.garden.id='komugi';if(change==='world'){w=fixture();w.worldId+='new';}release();await flight;assert.equal(old.encounters.raptor.active,null);assert.equal(w.encounters.raptor.active,null);}finally{s.close();}}
});
test('queued final countdown cannot undo a successful escape or mutate a replacement world',async()=>{
 for(const change of ['escape','world','hide']){let w=fixture(true),release;w.encounters.raptor.active.remainingMs=1000;const old=w,s=setup(w,{getWorld:()=>w,transact:fn=>new Promise(resolve=>{release=()=>resolve(fn(w));})});try{await s.run(1);const {flight}=await s.tick();assert.ok(release);if(change==='escape')escapeGardenRaptor(w,raptorToken(w));if(change==='world')w=fixture();if(change==='hide')s.win.document.dispatchEvent(new s.win.Event('visibilitychange'));release();await flight;assert.equal(lifeStatus(old,'b1').death,null);assert.equal(lifeStatus(w,'b1').death,null);}finally{s.close();}}
});
test('failed persistence leaves the one minute warning intact and retry is safe',async()=>{
 const w=fixture(true),before=structuredClone(w),s=setup(w,{transact:async()=>{throw new Error('full disk');}});try{await s.run(3);assert.deepEqual(w,before);assert.ok(s.changes.some(x=>x.error));assert.equal(lifeStatus(w,'b1').death,null);}finally{s.close();}
});
test('catalog uses true species silhouettes; osprey has its separate harmless section',()=>{
 const w=fixture(),html=renderRaptorCatalog(w);assert.equal((html.match(/is-silhouette/g)||[]).length,9);assert.match(html,/水辺の仲間 · 襲わない鳥/);assert.equal((html.match(/data-raptor-entry/g)||[]).length,9);assert.doesNotMatch(html,/<strong>トビ/);
 arriveGardenRaptor(w,'black-kite',NOW,{...raptorToken(w),gardenId:w.encounters.garden.id});assert.match(renderRaptorNotebook(w,{id:'black-kite'}),/data-encounter-rub="black-kite"/);assert.match(renderRaptorNotice(w),/事故死/);
});
test('raptor notebook keyboard petting updates this species and retains focus',async()=>{
 const w=fixture(true),win=new Window();win.document.body.innerHTML='<div id="root"></div>';const root=win.document.querySelector('#root');const panel=mountEncounterPanel(root,{getWorld:()=>w,transact:async fn=>fn(w)});try{root.querySelector('[data-crow-notebook]').click();root.querySelector('[data-raptor-entry="black-kite"]').click();const target=root.querySelector('[data-encounter-rub]');target.focus();target.dispatchEvent(new win.KeyboardEvent('keydown',{key:'Enter',bubbles:true}));await sleep(10);assert.equal(w.encounters.raptor.visits[0].petPoints,1);assert.equal(root.querySelector('[data-raptor-points]').textContent,'1');assert.equal(win.document.activeElement,root.querySelector('[data-encounter-rub]'));validateWorld(w);}finally{panel.destroy();win.happyDOM.abort();}
});

test('host transaction busy flag does not block its own arrival',async()=>{
 const w=fixture();let busy=false;const s=setup(w,{isAvailable:()=>!busy,transact:async fn=>{busy=true;try{return fn(w);}finally{busy=false;}}});try{await s.run(121);assert.equal(w.encounters.raptor.active.remainingMs,60000);}finally{s.close();}
});
test('external petting changes warning presentation to friendly at the next sample',async()=>{
 const w=fixture(true),s=setup(w);try{for(let i=0;i<13;i++)petGardenRaptor(w,'black-kite',8,raptorToken(w));await s.run(1);assert.ok(s.changes.some(x=>x.structural));assert.equal(w.encounters.raptor.active.hostile,false);assert.doesNotMatch(renderRaptorNotice(w),/事故死/);}finally{s.close();}
});
test('modal and out-and-back menu navigation invalidate queued arrival without dismissing saved threat',async()=>{
 for(const kind of ['modal','menu','notebook','garden']){const w=fixture();let release;const s=setup(w,{transact:fn=>new Promise(resolve=>{release=()=>resolve(fn(w));})});try{await s.run(120);const {flight}=await s.tick();if(kind==='modal'){const modal=s.win.document.createElement('dialog');modal.className='game-bird-sheet';s.win.document.body.append(modal);modal.setAttribute('open','');modal.removeAttribute('open');await sleep(1);}else if(kind==='menu'){s.win.document.dispatchEvent(new s.win.CustomEvent('buncho-game-panel',{detail:'settings'}));s.win.document.dispatchEvent(new s.win.CustomEvent('buncho-game-panel',{detail:'outdoors'}));}else if(kind==='garden'){s.win.document.dispatchEvent(new s.win.CustomEvent('buncho-game-garden',{detail:{gardenId:'komugi'}}));s.win.document.dispatchEvent(new s.win.CustomEvent('buncho-game-garden',{detail:{gardenId:'komorebi'}}));}else{s.win.document.dispatchEvent(new s.win.CustomEvent('buncho-game-encounter-view',{detail:{mode:'notebook'}}));s.win.document.dispatchEvent(new s.win.CustomEvent('buncho-game-encounter-view',{detail:{mode:'garden'}}));}release();await flight;assert.equal(w.encounters.raptor.active,null);}finally{s.close();}}
});

test('a crow warning that appears while a raptor draw waits keeps priority',async()=>{
 const w=fixture();let release;const s=setup(w,{transact:fn=>new Promise(resolve=>{release=()=>resolve(fn(w));})});try{await s.run(120);const {flight}=await s.tick();assert.ok(release);const notice=s.win.document.createElement('div');notice.dataset.crowPhase='warning';s.root.append(notice);release();await flight;assert.equal(w.encounters.raptor.active,null);assert.equal(w.encounters.raptor.visits.length,0);}finally{s.close();}
});

test('pending crow save retains priority even after its warning DOM is replaced',async()=>{
 const w=fixture();let release,pending=false;const s=setup(w,{hasCrowPending:()=>pending,transact:fn=>new Promise(resolve=>{release=()=>resolve(fn(w));})});try{await s.run(120);const {flight}=await s.tick();pending=true;release();await flight;assert.equal(w.encounters.raptor.active,null);assert.equal(w.encounters.raptor.visits.length,0);}finally{s.close();}
});

test('early entry still grants the full minute to escape',async()=>{
 const w=fixture(),s=setup(w,{earlyPredatorVisits:true,predatorRandom:()=>0});try{await s.run(2);assert.equal(w.encounters.raptor.active,null);await s.run(1);assert.equal(w.encounters.raptor.active.remainingMs,60000);await s.run(59);assert.equal(lifeStatus(w,'b1').death,null);escapeGardenRaptor(w,raptorToken(w));await s.run(2);assert.equal(lifeStatus(w,'b1').death,null);}finally{s.close();}
});
