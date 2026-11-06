import test from 'node:test';
import assert from 'node:assert/strict';
import {Window} from 'happy-dom';
import {createWorld} from '../src/engine.js';
import {mountEncounterPanel} from '../src/encounter-controller.js';
import {mountGardenRaptors} from '../src/garden-raptor-controller.js';
const NOW=Date.UTC(2026,10,5),sleep=()=>new Promise(r=>setTimeout(r,1));
async function setup({random=()=>0,reverse=false}={}){
 const w=createWorld(NOW);w.encounters.garden.open=true;w.encounters.gardenFriends.attendees=['b1'];w.field.place='park';
 const win=new Window();win.document.body.innerHTML='<main id="root"><div class="game-app" data-panel="outdoors"><div id="panel"></div></div></main>';
 const root=win.document.querySelector('#root');let panel,elapsed=0,n=0;const timers=new Map(),originalNow=Date.now;Date.now=()=>NOW+elapsed;
 Object.defineProperty(win.performance,'now',{value:()=>elapsed,configurable:true});win.setTimeout=(fn,delay)=>{timers.set(++n,{fn,delay});return n;};win.clearTimeout=id=>timers.delete(id);
 const mount=()=>{panel=mountEncounterPanel(root.querySelector('#panel'),{getWorld:()=>w,initialMode:'garden',crowRandom:()=>1,transact:async fn=>fn(w)});};mount();
 const ready=async()=>{const stage=root.querySelector('.finch-garden-stage');if(stage)stage.dataset.sceneState='ready';await sleep();};await ready();
 const controller=mountGardenRaptors(root,{getWorld:()=>w,random:()=>1,predatorRandom:random,canStartCrowWarning:()=>panel?.canStartCrowWarning()||false,startCrowWarning:id=>panel?.startCrowWarning(id)||false,hasCrowPending:()=>panel?.hasCrowPending()||false,transact:async fn=>fn(w)});
 const tick=async()=>{await ready();elapsed+=1000;const due=[...timers].filter(([,t])=>['poll','pollCrow'].includes(t.fn.name));if(reverse)due.reverse();for(const [id,t]of due){if(!timers.has(id))continue;timers.delete(id);await t.fn();}await sleep();};
 const run=async n=>{for(let i=0;i<n;i++)await tick();};
 const remount=async()=>{panel.destroy();root.querySelector('#panel').remove();const p=win.document.createElement('div');p.id='panel';root.querySelector('.game-app').append(p);win.document.dispatchEvent(new win.CustomEvent('buncho-game-panel',{detail:'garden'}));mount();win.document.dispatchEvent(new win.CustomEvent('buncho-game-panel',{detail:'outdoors'}));await ready();};
 return {w,root,win,run,remount,get panel(){return panel;},close(){controller.destroy();panel.destroy();Date.now=originalNow;win.happyDOM.abort();}};
}
for(const reverse of [false,true])test(`shared crow win grants six seconds and never races a raptor, reverse=${reverse}`,async()=>{
 let calls=0;const s=await setup({reverse,random:()=>{calls++;return 0;}});try{await s.run(2);assert.equal(s.panel.hasCrowPending(),false);await s.run(1);assert.equal(s.panel.hasCrowPending(),true);assert.equal(calls,3);await s.run(5);assert.equal(s.w.encounters.crow.visits.length,0);await s.run(1);assert.equal(s.w.encounters.crow.visits.length,1);assert.equal(s.w.encounters.raptor.visits.length,0);}finally{s.close();}
});
test('shared half-boundary raptor win starts its saved warning at a full60 seconds',async()=>{
 const values=[0,.5,0],s=await setup({random:()=>values.shift()??1});try{await s.run(2);assert.equal(s.w.encounters.raptor.active,null);await s.run(1);assert.equal(s.w.encounters.raptor.active.remainingMs,60000);assert.equal(s.panel.hasCrowPending(),false);assert.equal(s.w.encounters.crow.visits.length,0);}finally{s.close();}
});
test('real panel destruction and remount cannot buy another early lottery',async()=>{
 let calls=0;const s=await setup({random:()=>{calls++;return .25;}});try{await s.run(3);assert.equal(calls,1);await s.remount();await s.run(4);assert.equal(calls,1);await s.remount();await s.run(4);assert.equal(calls,1);}finally{s.close();}
});
test('canceling a winning crow warning still consumes the shared entry attempt',async()=>{
 let calls=0;const s=await setup({random:()=>{calls++;return 0;}});try{await s.run(3);assert.equal(s.panel.hasCrowPending(),true);await s.remount();await s.run(4);assert.equal(calls,3);assert.equal(s.panel.hasCrowPending(),false);assert.equal(s.w.encounters.crow.visits.length,0);}finally{s.close();}
});
