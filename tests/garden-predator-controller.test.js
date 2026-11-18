import test from 'node:test';
import assert from 'node:assert/strict';
import {Window} from 'happy-dom';
import {createWorld} from '../src/engine.js';
import {arriveGardenCrow} from '../src/garden-crows.js';
import {arriveGardenRaptor} from '../src/garden-raptors.js';
import {mountEncounterPanel} from '../src/encounter-controller.js';
import {mountGardenRaptors} from '../src/garden-raptor-controller.js';
const NOW=Date.UTC(2026,10,5),sleep=()=>new Promise(r=>setTimeout(r,1));
async function setup({random=()=>0,reverse=false,attends=true,legacyRandom=()=>1,failures=0,beforeCommit=null,journal=null}={}){
 const w=createWorld(NOW);w.encounters.garden.open=true;w.encounters.gardenFriends.attendees=attends?['b1']:[];w.field.place='park';
 const win=new Window();win.document.body.innerHTML='<main id="root"><div class="game-app" data-panel="outdoors"><div id="panel"></div></div></main>';
 if(journal)Object.defineProperty(win,'sessionStorage',{value:journal});
 const root=win.document.querySelector('#root');let panel,elapsed=0,n=0;const timers=new Map(),originalNow=Date.now;Date.now=()=>NOW+elapsed;
 Object.defineProperty(win.performance,'now',{value:()=>elapsed,configurable:true});win.setTimeout=(fn,delay)=>{timers.set(++n,{fn,delay});return n;};win.clearTimeout=id=>timers.delete(id);
 const transact=async fn=>{if(failures>0){failures--;throw new Error('simulated disk failure');}if(beforeCommit){const hook=beforeCommit;beforeCommit=null;hook(w);}const next=structuredClone(w);fn(next);Object.assign(w,next);};
 const mount=()=>{panel=mountEncounterPanel(root.querySelector('#panel'),{getWorld:()=>w,initialMode:'garden',sharedPredatorClock:true,crowRandom:legacyRandom,transact});};mount();
 const ready=async()=>{const stage=root.querySelector('.finch-garden-stage');if(stage)stage.dataset.sceneState='ready';await sleep();};await ready();
 const mountController=()=>mountGardenRaptors(root,{getWorld:()=>w,random:legacyRandom,predatorRandom:random,canStartCrowWarning:()=>panel?.canStartCrowWarning()||false,startCrowWarning:id=>panel?.startCrowWarning(id)||false,hasCrowPending:()=>panel?.hasCrowPending()||false,transact});
 let controller=mountController();
 const tick=async()=>{await ready();elapsed+=1000;const due=[...timers].filter(([,t])=>['poll','pollCrow'].includes(t.fn.name));if(reverse)due.reverse();for(const [id,t]of due){if(!timers.has(id))continue;timers.delete(id);await t.fn();}await sleep();};
 const run=async n=>{for(let i=0;i<n;i++)await tick();};
 const remount=async()=>{panel.destroy();root.querySelector('#panel').remove();const p=win.document.createElement('div');p.id='panel';root.querySelector('.game-app').append(p);win.document.dispatchEvent(new win.CustomEvent('buncho-game-panel',{detail:'garden'}));mount();win.document.dispatchEvent(new win.CustomEvent('buncho-game-panel',{detail:'outdoors'}));await ready();};
 return {w,root,win,run,remount,async reload(){controller.destroy();await remount();controller=mountController();},get panel(){return panel;},close(){controller.destroy();panel.destroy();Date.now=originalNow;win.happyDOM.abort();}};
}
for(const reverse of [false,true])test(`shared crow win grants six seconds and never races a raptor, reverse=${reverse}`,async()=>{
 let calls=0;const s=await setup({reverse,random:()=>{calls++;return 0;}});try{await s.run(2);assert.equal(s.panel.hasCrowPending(),false);await s.run(1);assert.equal(s.panel.hasCrowPending(),true);assert.equal(calls,3);await s.run(5);assert.equal(s.w.encounters.crow.visits.length,0);await s.run(1);assert.equal(s.w.encounters.crow.visits.length,1);assert.equal(s.w.encounters.raptor.visits.length,0);}finally{s.close();}
});
test('shared half-boundary raptor win starts its saved warning at a full60 seconds',async()=>{
 const values=[0,.5,0],s=await setup({random:()=>values.shift()??1});try{await s.run(2);assert.equal(s.w.encounters.raptor.active,null);await s.run(1);assert.equal(s.w.encounters.raptor.active.remainingMs,60000);assert.equal(s.panel.hasCrowPending(),false);assert.equal(s.w.encounters.crow.visits.length,0);}finally{s.close();}
});
test('real panel destruction and remount cannot buy another early lottery',async()=>{
 let calls=0;const s=await setup({random:()=>{calls++;return .35;}});try{await s.run(3);assert.equal(calls,1);await s.remount();await s.run(4);assert.equal(calls,1);await s.remount();await s.run(4);assert.equal(calls,1);}finally{s.close();}
});
test('canceling a winning crow warning resumes the same bird without a fresh draw',async()=>{
 let calls=0;const s=await setup({random:()=>{calls++;return 0;}});try{await s.run(3);assert.equal(s.panel.hasCrowPending(),true);await s.remount();await s.run(4);assert.equal(calls,3);assert.equal(s.panel.hasCrowPending(),true);assert.equal(s.w.encounters.crow.visits.length,0);await s.run(6);assert.equal(s.w.encounters.crow.visits[0].id,'large-billed-crow');assert.equal(calls,3);}finally{s.close();}
});
for(const reverse of [false,true])for(const kind of ['crow','raptor'])test(`shared entry permits targetless ${kind} visits, reverse=${reverse}`,async()=>{
 const values=[0,kind==='crow'?0:.5,0],s=await setup({attends:false,reverse,random:()=>values.shift()??1});
 const before=structuredClone({birds:s.w.birds,lifecycle:s.w.lifecycle,economy:s.w.economy,decor:s.w.decor,seed:s.w.seed});
 try{
  await s.run(kind==='crow'?9:3);
  if(kind==='crow'){
   assert.equal(s.w.encounters.crow.visits.length,1);assert.equal(s.w.encounters.crow.arrivalBirdId,null);assert.equal(s.w.encounters.crow.lastHostile,false);
   assert.equal(s.w.encounters.raptor.active,null);
  }else{
   assert.equal(s.w.encounters.raptor.active.targetBirdId,null);assert.equal(s.w.encounters.raptor.active.hostile,false);assert.equal(s.w.encounters.raptor.active.remainingMs,18000);
   assert.equal(s.w.encounters.crow.visits.length,0);
  }
  assert.deepEqual({birds:s.w.birds,lifecycle:s.w.lifecycle,economy:s.w.economy,decor:s.w.decor,seed:s.w.seed},before);
  assert.deepEqual(s.w.encounters.gardenFriends.attendees,[]);
 }finally{s.close();}
});

 test('real shared host never uses the old family lotteries after two minutes',async()=>{
 let calls=0;const s=await setup({attends:false,random:()=>{calls++;return 1;},legacyRandom:()=>0});
 try{await s.run(245);assert.equal(calls,5);assert.equal(s.w.encounters.crow.visits.length,0);assert.equal(s.w.encounters.raptor.visits.length,0);}finally{s.close();}
 });
 test('same mounted garden allows a second crow after its ten-minute cap',async()=>{
 const s=await setup({attends:false,random:()=>Date.now()<NOW+10000||Date.now()>=NOW+620000?0:1});
 try{await s.run(9);assert.equal(s.w.encounters.crow.visits[0].count,1);await s.run(600);assert.equal(s.w.encounters.crow.visits[0].count,1);await s.run(120);assert.equal(s.w.encounters.crow.visits[0].count,2);assert.equal(s.w.encounters.raptor.visits.length,0);}finally{s.close();}
 });

for(const kind of ['crow','raptor'])test(`failed ${kind} save retries selected bird with no early mutation`,async()=>{
 let calls=0;const values=[0,kind==='crow'?0:.5,0],s=await setup({failures:1,attends:false,random:()=>{calls++;return values.shift()??1;}});
 const original=structuredClone(s.w);
 try{await s.run(kind==='crow'?9:3);assert.deepEqual(s.w,original);await s.run(14);assert.equal(s.w.encounters[kind].visits.length,1);assert.equal(s.w.encounters[kind].visits[0].count,1);assert.equal(calls,3);}finally{s.close();}
});
test('host recreation restores pending crow and consumes it only after committed arrival',async()=>{
 let calls=0;const s=await setup({attends:false,random:()=>{calls++;return 0;}});
 try{await s.run(3);assert.equal(s.panel.hasCrowPending(),true);await s.reload();await s.run(12);assert.equal(s.w.encounters.crow.visits[0].count,1);assert.equal(calls,3);await s.reload();await s.run(10);assert.equal(s.w.encounters.crow.visits[0].count,1);assert.equal(calls,3);}finally{s.close();}
});
test('hidden pending warning resumes same species after visible dwell, with no offline catchup',async()=>{
 let calls=0;const s=await setup({attends:false,random:()=>{calls++;return 0;}});
 try{await s.run(3);Object.defineProperty(s.win.document,'visibilityState',{value:'hidden',configurable:true});s.win.document.dispatchEvent(new s.win.Event('visibilitychange'));await s.run(70);assert.equal(s.w.encounters.crow.visits.length,0);Object.defineProperty(s.win.document,'visibilityState',{value:'visible',configurable:true});s.win.document.dispatchEvent(new s.win.Event('visibilitychange'));await s.run(2);assert.equal(s.panel.hasCrowPending(),false);await s.run(11);assert.equal(s.w.encounters.crow.visits[0].count,1);assert.equal(calls,3);}finally{s.close();}
});

for(const chosen of ['crow','raptor'])for(const peer of ['crow','raptor'])test(`fresh peer ${peer} arrival wins over pending ${chosen} without duplicate or mutation`,async()=>{
 const values=[0,chosen==='crow'?0:.5,0];let calls=0;
 const s=await setup({attends:false,random:()=>{calls++;return values.shift()??1;},beforeCommit:w=>{
  const token={worldId:w.worldId,revision:w.revision,gardenId:w.encounters.garden.id};
  const result=peer==='crow'?arriveGardenCrow(w,'rook',Date.now(),token):arriveGardenRaptor(w,'golden-eagle',Date.now(),token);assert.equal(result.changed,true);
 }});
 try{await s.run(20);assert.equal(s.w.encounters.crow.visits.length+s.w.encounters.raptor.visits.length,1);assert.equal(s.w.encounters[peer].visits[0].count,1);assert.equal(calls,3);await s.reload();await s.run(10);assert.equal(s.w.encounters.crow.visits.length+s.w.encounters.raptor.visits.length,1);assert.equal(calls,3);}finally{s.close();}
});

test('unreadable resume journal blocks fresh draws then recovers without touching the save',async()=>{
 let blocked=true,calls=0;const journal={getItem(){if(blocked)throw Error('blocked');return null;},setItem(){}};
 const s=await setup({attends:false,journal,random:()=>{calls++;return 0;}}),original=structuredClone(s.w);
 try{await s.run(10);assert.equal(calls,0);assert.deepEqual(s.w,original);blocked=false;await s.run(14);assert.equal(s.w.encounters.crow.visits[0].count,1);assert.equal(calls,3);}finally{s.close();}
});
test('journal write failure never presents an unjournaled bird and keeps its selected species',async()=>{
 let blocked=true,calls=0;const journal={getItem(){return null;},setItem(){if(blocked)throw Error('quota');}};
 const s=await setup({attends:false,journal,random:()=>{calls++;return 0;}}),original=structuredClone(s.w);
 try{await s.run(10);assert.deepEqual(s.w,original);assert.equal(s.panel.hasCrowPending(),false);assert.equal(calls,3);blocked=false;await s.run(14);assert.equal(s.w.encounters.crow.visits[0].count,1);assert.equal(calls,3);}finally{s.close();}
});
