import test from 'node:test';
import assert from 'node:assert/strict';
import {Window} from 'happy-dom';
import {createWorld,serializeWorld,parseSave} from '../src/engine.js';
import {mountEncounterPanel} from '../src/encounter-controller.js';
import {mountGardenRaptors} from '../src/garden-raptor-controller.js';
import {createGardenRaptorClock,RAPTOR_RULES} from '../src/garden-raptors.js';

const sample=(clock,now,extra={})=>clock.sample({key:'garden',now,eligible:true,gardenId:'komorebi',...extra});
const run=(clock,from,to,extra=()=>({}))=>{
  const events=[];
  for(let now=from;now<=to;now+=1000){const event=sample(clock,now,extra(now));if(event)events.push({now,...event});}
  return events;
};

test('short periodic save work defers only a due raptor draw, not its deadline',()=>{
  const draws=[];let now=0;
  const clock=createGardenRaptorClock({random:()=>{draws.push(now);return .01;}});
  run(clock,0,119000,t=>{now=t;return {busy:t%3000===0};});
  assert.deepEqual(draws,[],'the full two-minute dwell still applies');
  now=120000;assert.equal(sample(clock,now,{busy:true}),null);assert.deepEqual(draws,[]);
  now=121000;assert.equal(sample(clock,now),null);assert.deepEqual(draws,[121000]);
  run(clock,122000,301000,t=>{now=t;return {busy:t%3000===0};});
  assert.deepEqual(draws,[121000,181000,241000,301000]);
  assert.equal(clock.elapsed,301000);
});

test('a long busy interval consumes no randomness and never catches up missed draws',()=>{
  let calls=0;const clock=createGardenRaptorClock({random:()=>{calls++;return .01;}});
  run(clock,0,900000,()=>({busy:true}));assert.equal(calls,0);
  sample(clock,901000);assert.equal(calls,1);
  run(clock,902000,960000);assert.equal(calls,1);
  sample(clock,961000);assert.equal(calls,2);
});

test('scene exclusions retain their existing delay even when a save is also busy',()=>{
  let calls=0;const clock=createGardenRaptorClock({random:()=>{calls++;return .01;}});
  run(clock,0,119000);
  sample(clock,120000,{available:false,busy:true});
  run(clock,121000,179000);assert.equal(calls,0);
  sample(clock,180000);assert.equal(calls,1);
});

test('busy never qualifies hidden, suspended or changed-garden time',()=>{
  for(const {interrupt,restart,key='garden'} of [
    {interrupt:clock=>sample(clock,120000,{eligible:false,busy:true}),restart:121000},
    {interrupt:clock=>sample(clock,130000,{busy:true}),restart:130000},
    {interrupt:clock=>sample(clock,120000,{key:'other-garden',busy:true}),restart:120000,key:'other-garden'},
  ]){
    let calls=0;const clock=createGardenRaptorClock({random:()=>{calls++;return .01;}});
    run(clock,0,119000);interrupt(clock);
    sample(clock,restart,{key});run(clock,restart+1000,restart+119000,()=>({key}));assert.equal(calls,0);
    sample(clock,restart+120000,{key});assert.equal(calls,1);
  }
});

test('a due draw still uses the exact one-percent boundary and fires only once',()=>{
  for(const chance of [.009999,.01]){
    const values=[chance,0],clock=createGardenRaptorClock({random:()=>values.shift()??0});
    run(clock,0,120000,()=>({busy:true}));
    const event=sample(clock,121000);
    assert.equal(!!event,chance<RAPTOR_RULES.chance);
    if(event)assert.deepEqual(run(clock,122000,300000),[]);
  }
  assert.equal(RAPTOR_RULES.dwellMs,120000);
  assert.equal(RAPTOR_RULES.checkMs,60000);
  assert.equal(RAPTOR_RULES.chance,.01);
  assert.equal(RAPTOR_RULES.visitCooldownMs,120000);
});

async function mounted({arrives=false}={}){
  const initialTime=Date.UTC(2026,10,7),world=createWorld(initialTime),window=new Window();
  world.encounters.garden.open=true;world.encounters.gardenFriends.attendees=['b1'];world.field.place='park';
  window.document.body.innerHTML='<main id="root"><div class="game-app" data-panel="outdoors"><div id="panel"></div></div></main>';
  const root=window.document.querySelector('#root'),timers=new Map(),draws=[];
  let elapsed=0,timerId=0;const originalNow=Date.now;
  Date.now=()=>initialTime+elapsed;
  Object.defineProperty(window.performance,'now',{value:()=>elapsed,configurable:true});
  window.setTimeout=(fn,delay)=>{timers.set(++timerId,{fn,delay});return timerId;};
  window.clearTimeout=id=>timers.delete(id);
  const panel=mountEncounterPanel(root.querySelector('#panel'),{getWorld:()=>world,initialMode:'garden',crowRandom:()=>1,transact:async fn=>fn(world)});
  const ready=async()=>{const stage=root.querySelector('.finch-garden-stage');if(stage)stage.dataset.sceneState='ready';await new Promise(resolve=>setTimeout(resolve,1));};
  await ready();
  const controller=mountGardenRaptors(root,{
    getWorld:()=>world,earlyPredatorVisits:false,
    random:()=>{draws.push(elapsed);return arrives?0:.01;},
    isAvailable:()=>elapsed%3000!==0,
    hasCrowPending:()=>panel.hasCrowPending(),
    transact:async fn=>fn(world),
  });
  return {world,draws,async run(seconds){
    for(let i=0;i<seconds;i++){
      await ready();elapsed+=1000;
      for(const [id,timer]of [...timers].filter(([,timer])=>['poll','pollCrow'].includes(timer.fn.name))){
        if(!timers.has(id))continue;timers.delete(id);await timer.fn();
      }
    }
  },close(){controller.destroy();panel.destroy();Date.now=originalNow;window.happyDOM.abort();}};
}

test('host save work every three seconds cannot starve the mounted sustained lottery',async()=>{
  const host=await mounted(),before=structuredClone(host.world);
  try{
    await host.run(181);
    assert.deepEqual(host.draws,[121000,181000]);
    assert.deepEqual(host.world,before,'failed lottery checks never mutate saved state');
    assert.deepEqual(parseSave(serializeWorld(host.world)),host.world);
  }finally{host.close();}
});

test('a draw deferred by host save work records one unchanged full warning',async()=>{
  const host=await mounted({arrives:true});
  try{
    await host.run(120);assert.equal(host.world.encounters.raptor.active,null);
    await host.run(1);
    assert.deepEqual(host.draws,[121000,121000]);
    assert.equal(host.world.encounters.raptor.active.remainingMs,60000);
    assert.equal(host.world.encounters.raptor.active.targetBirdId,'b1');
    assert.equal(host.world.encounters.raptor.visits.length,1);
    assert.equal(host.world.encounters.raptor.visits[0].count,1);
    assert.deepEqual(parseSave(serializeWorld(host.world)),host.world);
  }finally{host.close();}
});
