import test from 'node:test';
import assert from 'node:assert/strict';
import {Window} from 'happy-dom';
import {createWorld,validateWorld} from '../src/engine.js';
import {mountEncounterPanel} from '../src/encounter-controller.js';
import {arriveGardenCrow,CROW_SPECIES,crowFriendship} from '../src/garden-crows.js';
const id=CROW_SPECIES[0].id,now=Date.UTC(2026,10,4,9),sleep=ms=>new Promise(r=>setTimeout(r,ms));
function fixture(discovered=false){const w=createWorld(now);w.encounters.garden.open=true;w.field.place='park';if(discovered)arriveGardenCrow(w,id,now,{worldId:w.worldId,revision:w.revision,gardenId:w.encounters.garden.id});return w;}
function setup(w,{entry=false,...options}={}){
 const win=new Window();win.document.body.innerHTML='<div id="root"></div>';const root=win.document.querySelector('#root');
 let elapsed=0,sequence=0;const timers=new Map();win.setTimeout=(fn,delay)=>{const key=++sequence;timers.set(key,{fn,delay});return key;};win.clearTimeout=key=>timers.delete(key);
 Object.defineProperty(win.performance,'now',{value:()=>elapsed,configurable:true});
 const panel=mountEncounterPanel(root,{getWorld:()=>w,transact:async fn=>fn(w),initialMode:entry?'notebook':'garden',crowRandom:()=>0,...options});
 if(entry){root.querySelector('[data-crow-notebook]').click();root.querySelector(`[data-crow-entry="${id}"]`).click();}
 const ready=()=>{const stage=root.querySelector('.finch-garden-stage');if(stage)stage.dataset.sceneState='ready';};
 const tick=async({makeReady=true}={})=>{elapsed+=1000;if(makeReady)ready();const timer=[...timers].find(([,v])=>v.fn.name==='pollCrow');assert.ok(timer,'crow timer scheduled');timers.delete(timer[0]);const flight=timer[1].fn();await Promise.resolve();return {flight};};
 const run=async n=>{for(let i=0;i<n;i++){const {flight}=await tick();await flight;}};
 const close=()=>{panel.destroy();win.happyDOM.abort();};
 return {win,root,panel,ready,tick,run,timers,close};
}
test('crow notebook keyboard petting updates and preserves keyboard focus',async()=>{
 const w=fixture(true),s=setup(w,{entry:true});try{const target=s.root.querySelector('[data-encounter-rub]');target.focus();target.dispatchEvent(new s.win.KeyboardEvent('keydown',{key:'Enter',bubbles:true}));await sleep(5);assert.equal(crowFriendship(w,id).points,1);assert.equal(s.root.querySelector('[data-crow-points]').textContent,'1');assert.equal(s.win.document.activeElement,s.root.querySelector('[data-encounter-rub]'));validateWorld(w);}finally{s.close();}
});
test('crow continuous pointer rubbing preserves image while in flight and grants friendship',async()=>{
 const w=fixture(true),s=setup(w,{entry:true});try{const target=s.root.querySelector('[data-encounter-rub]');target.getBoundingClientRect=()=>({left:0,top:0,right:300,bottom:300});target.dispatchEvent(new s.win.PointerEvent('pointerdown',{bubbles:true,button:0,isPrimary:true,pointerId:1,clientX:50,clientY:50}));
 for(let i=0;i<12;i++){s.win.document.dispatchEvent(new s.win.PointerEvent('pointermove',{pointerId:1,clientX:i%2?50:100,clientY:50}));await sleep(2);}
 assert.equal(s.root.querySelector('[data-encounter-rub]'),target);s.win.document.dispatchEvent(new s.win.PointerEvent('pointerup',{pointerId:1}));await sleep(130);assert.ok(crowFriendship(w,id).points>=20);validateWorld(w);}finally{s.close();}
});
test('pending crow petting cannot mutate after notebook navigation, destroy or world replacement',async()=>{
 for(const change of ['notebook','destroy','world']){let current=fixture(true),release;const old=current,s=setup(current,{entry:true,getWorld:()=>current,transact:fn=>new Promise(resolve=>{release=()=>resolve(fn(current));})});try{
 s.root.querySelector('[data-encounter-rub]').dispatchEvent(new s.win.KeyboardEvent('keydown',{key:' ',bubbles:true}));if(change==='world'){current=fixture(true);current.worldId+='new';s.panel.refresh();}else s.panel[change]();release();await sleep(5);assert.equal(crowFriendship(current,id).points,0);assert.equal(crowFriendship(old,id).points,0);
 }finally{s.close();}}
});
test('visible ready garden warns only after continuous120s and applies arrival six seconds later',async()=>{
 const w=fixture(),s=setup(w);try{await s.run(120);assert.equal(s.root.querySelector('[data-crow-phase="warning"]'),null);await s.run(1);assert.ok(s.root.querySelector('[data-crow-phase="warning"]'));await s.run(5);assert.equal(w.encounters.crow.visits.length,0);const before=w.birds[0].needs.energy;await s.run(1);assert.equal(w.birds[0].needs.energy,before/2);assert.equal(w.encounters.crow.visits.length,1);}finally{s.close();}
});
test('loading, modal, pause and hidden interruption reset continuous garden dwell',async()=>{
 for(const change of ['loading','modal','pause','hidden']){const w=fixture(),s=setup(w);try{await s.run(120);
 let modal;if(change==='loading')s.root.querySelector('.finch-garden-stage').dataset.sceneState='loading';if(change==='modal'){modal=s.win.document.createElement('dialog');modal.className='game-bird-sheet';modal.setAttribute('open','');s.win.document.body.append(modal);}if(change==='pause')w.paused=true;if(change==='hidden'){Object.defineProperty(s.win.document,'visibilityState',{configurable:true,value:'hidden'});s.win.document.dispatchEvent(new s.win.Event('visibilitychange'));}
 await (await s.tick({makeReady:change!=='loading'})).flight;modal?.remove();w.paused=false;if(change==='hidden')Object.defineProperty(s.win.document,'visibilityState',{configurable:true,value:'visible'});
 await s.run(120);assert.equal(w.encounters.crow.visits.length,0);assert.equal(s.root.querySelector('[data-crow-phase="warning"]'),null);await s.run(1);assert.ok(s.root.querySelector('[data-crow-phase="warning"]'));
 }finally{s.close();}}
});
test('queued arrival is canceled by navigation, destruction or replaced world',async()=>{
 for(const change of ['notebook','destroy','world']){let current=fixture(),release;const old=current,s=setup(current,{getWorld:()=>current,transact:fn=>new Promise(resolve=>{release=()=>resolve(fn(current));})});try{await s.run(126);const {flight}=await s.tick();assert.ok(release);if(change==='world'){current=fixture();current.worldId+='new';s.panel.refresh();}else s.panel[change]();release();await flight;assert.equal(current.encounters.crow.visits.length,0);assert.equal(old.encounters.crow.visits.length,0);}finally{s.close();}}
});
test('brief offline interruption invalidates already queued arrival even after connection returns',async()=>{
 const w=fixture();let release;const s=setup(w,{transact:fn=>new Promise(resolve=>{release=()=>resolve(fn(w));})});try{await s.run(126);const {flight}=await s.tick();s.win.dispatchEvent(new s.win.Event('offline'));s.ready();release();await flight;assert.equal(w.encounters.crow.visits.length,0);}finally{s.close();}
});
test('failed arrival transaction leaves state unchanged and reports failure, destroy clears crow timer',async()=>{
 const w=fixture(),before=structuredClone(w),s=setup(w,{transact:async()=>{throw new Error('disk full');}});try{await s.run(127);assert.deepEqual(w,before);assert.match(s.root.textContent,/保存できなかった/);s.panel.destroy();assert.equal([...s.timers.values()].filter(v=>v.fn.name==='pollCrow').length,0);s.win.dispatchEvent(new s.win.Event('offline'));assert.equal([...s.timers.values()].filter(v=>v.fn.name==='pollCrow').length,0);}finally{s.close();}
});
test('rejected keyboard pet transaction reports failure without granting friendship or losing controls',async()=>{
 const w=fixture(true),before=structuredClone(w),s=setup(w,{entry:true,transact:async()=>{throw new Error('disk full');}});try{s.root.querySelector('[data-encounter-rub]').dispatchEvent(new s.win.KeyboardEvent('keydown',{key:'Enter',bubbles:true}));await sleep(5);assert.deepEqual(w,before);assert.match(s.root.textContent,/記録できなかった/);assert.equal(s.root.getAttribute('aria-busy'),'false');assert.ok(s.root.querySelector('[data-encounter-rub]'));}finally{s.close();}
});
test('destroy during queued arrival prevents mutation and never reschedules timer',async()=>{
 const w=fixture();let release;const s=setup(w,{transact:fn=>new Promise(resolve=>{release=()=>resolve(fn(w));})});try{await s.run(126);const {flight}=await s.tick();s.panel.destroy();release();await flight;assert.equal(w.encounters.crow.visits.length,0);assert.equal([...s.timers.values()].filter(v=>v.fn.name==='pollCrow').length,0);}finally{s.close();}
});
test('failed save permits a new attempt only after another full continuous garden dwell',async()=>{
 const w=fixture();let attempts=0;const s=setup(w,{transact:async fn=>{attempts++;if(attempts===1)throw new Error('temporary storage failure');return fn(w);}});try{
 await s.run(127);assert.equal(attempts,1);assert.equal(w.encounters.crow.visits.length,0);
 await s.run(120);assert.equal(attempts,1);assert.equal(s.root.querySelector('[data-crow-phase="warning"]'),null);
 await s.run(1);assert.ok(s.root.querySelector('[data-crow-phase="warning"]'));await s.run(6);assert.equal(attempts,2);assert.equal(w.encounters.crow.visits.length,1);
 }finally{s.close();}
});
test('subsecond household modal open-close cancels a queued crow arrival',async()=>{
 const w=fixture();let release;const s=setup(w,{transact:fn=>new Promise(resolve=>{release=()=>resolve(fn(w));})});try{
 const modal=s.win.document.createElement('dialog');modal.className='game-bird-sheet';s.win.document.body.append(modal);await s.run(126);const {flight}=await s.tick();assert.ok(release);
 modal.setAttribute('open','');modal.removeAttribute('open');await sleep(5);s.ready();release();await flight;assert.equal(w.encounters.crow.visits.length,0);
 }finally{s.close();}
});
test('subsecond household modal resets dwell without needing the one-second poll',async()=>{
 const w=fixture(),s=setup(w);try{const modal=s.win.document.createElement('dialog');modal.className='game-bird-sheet';s.win.document.body.append(modal);await s.run(120);
 modal.setAttribute('open','');modal.removeAttribute('open');await sleep(5);await s.run(120);assert.equal(s.root.querySelector('[data-crow-phase="warning"]'),null);await s.run(1);assert.ok(s.root.querySelector('[data-crow-phase="warning"]'));
 }finally{s.close();}
});
