import test from 'node:test';
import assert from 'node:assert/strict';
import {createGardenPredatorClock,PREDATOR_ENTRY_RULES} from '../src/garden-predator-clock.js';
import {createGardenCrowClock,CROW_RULES} from '../src/garden-crows.js';
import {createGardenRaptorClock,RAPTOR_RULES} from '../src/garden-raptors.js';
const sample=(clock,now,extra={})=>clock.sample({key:'one',gardenId:'komorebi',now,eligible:true,...extra});
const run=(clock,from,to,extra={})=>{let result;for(let t=from;t<=to;t+=1000)result=sample(clock,t,extra)||result;return result;};
test('one shared lottery starts after exactly three ready foreground seconds',()=>{
 const c=createGardenPredatorClock({random:()=>0});sample(c,0);sample(c,1000);sample(c,2000);assert.equal(sample(c,2999),null);assert.deepEqual(sample(c,3000),{kind:'crow',id:'large-billed-crow'});assert.equal(run(c,4000,20000),undefined);
});
test('combined probability boundary is35%, never two separate draws',()=>{
 for(const probability of [0,.349999,.35,.999999]){let calls=0;const c=createGardenPredatorClock({random:()=>++calls===1?probability:0});const result=run(c,0,3000);assert.equal(!!result,probability<.35);assert.equal(calls,probability<.35?3:1);}
 let total=0,crows=0,raptors=0;
 for(let i=0;i<1200;i++){const values=[(i+.5)/1200,((i%6)+.5)/6,0],c=createGardenPredatorClock({random:()=>values.shift()}),result=run(c,0,3000);if(result){total++;if(result.kind==='crow')crows++;else raptors++;}}
 assert.equal(total,420);assert.equal(crows,210);assert.equal(raptors,210);
});
test('eligible crow and raptor families split the shared draw equally at the half boundary',()=>{
 assert.equal(PREDATOR_ENTRY_RULES.crowWeight,PREDATOR_ENTRY_RULES.raptorWeight);
 for(const [choice,kind] of [[0,'crow'],[.499999,'crow'],[.5,'raptor'],[.999999,'raptor']]){
  const values=[0,choice,0],c=createGardenPredatorClock({random:()=>values.shift()});
  assert.equal(run(c,0,3000).kind,kind);
 }
});
test('one cooling family does not suppress the other and unavailable scenes spend no RNG',()=>{
 for(const [crowAvailable,raptorAvailable,kind] of [[true,false,'crow'],[false,true,'raptor']]){const c=createGardenPredatorClock({random:()=>0});assert.equal(run(c,0,3000,{crowAvailable,raptorAvailable}).kind,kind);}
 for(const extra of [{available:false},{crowAvailable:false,raptorAvailable:false}]){let calls=0;const c=createGardenPredatorClock({random:()=>{calls++;return 0;}});run(c,0,20000,extra);assert.equal(calls,0);assert.equal(sample(c,21000)?.kind,'crow');}
});
test('shared last draw survives garden changes, overlay resets and cancellation',()=>{
 let calls=0;const c=createGardenPredatorClock({random:()=>{calls++;return 1;}});run(c,0,3000);assert.equal(calls,1);
 for(let start=4000;start<60000;start+=4000){c.reset();run(c,start,start+3000,{key:`garden${start}`});}assert.equal(calls,1);
 c.reset();run(c,64000,67000);assert.equal(calls,2);
});
test('hidden, loading, backward and suspended time never catch up',()=>{
 for(const interrupt of [c=>sample(c,2100,{eligible:false}),c=>sample(c,15000),c=>sample(c,100)]){const c=createGardenPredatorClock({random:()=>0});run(c,0,2000);interrupt(c);assert.equal(sample(c,20000),null);assert.equal(sample(c,21000),null);assert.equal(sample(c,22000),null);assert.equal(sample(c,23000)?.kind,'crow');}
});
test('ready prime starts the clock without drawing or advancing from loading',()=>{
 const c=createGardenPredatorClock({random:()=>0});c.prime({key:'one',now:0,eligible:false});c.prime({key:'one',now:5000,eligible:true});assert.equal(sample(c,6000),null);assert.equal(sample(c,7000),null);assert.equal(sample(c,8000)?.kind,'crow');
});
test('water-only harmless species remains restricted to its garden',()=>{
 for(const gardenId of ['komorebi','mizukagami']){const values=[0,.9999],c=createGardenPredatorClock({random:()=>values.shift()??.9999});const event=run(c,0,3000,{crowAvailable:false,gardenId});assert.equal(event.id==='osprey',gardenId==='mizukagami');}
});
test('legacy family clocks have no20s draw and preserve the sustained2min rules',()=>{
 for(const [create,rules,kind] of [[createGardenCrowClock,CROW_RULES,'warning'],[createGardenRaptorClock,RAPTOR_RULES,'arrive']]){let calls=0;const c=create({random:()=>{calls++;return 0;}});assert.equal(run(c,0,119000),undefined);assert.equal(calls,0);assert.equal(sample(c,120000)?.kind,kind);assert.equal(rules.dwellMs,120000);}
 assert.equal(CROW_RULES.warningMs,6000);assert.equal(RAPTOR_RULES.warningMs,60000);assert.equal(PREDATOR_ENTRY_RULES.retryMs,60000);
 assert.equal(CROW_RULES.cooldownMs,600000);assert.equal(RAPTOR_RULES.visitCooldownMs,120000);
});

for(const kind of ['crow','raptor'])test(`pending ${kind} survives interruption and reload without reroll or save changes`,()=>{
 let calls=0,saved;const values=[0,kind==='crow'?0:.5,.4];
 const options={random:()=>{calls++;return values.shift()??1;},persist:s=>{saved=structuredClone(s);}};
 let c=createGardenPredatorClock(options);const event=run(c,0,3000,{arrivals:'original'});assert.equal(event.kind,kind);assert.equal(calls,3);
 c.reset();assert.deepEqual(run(c,4000,7000,{key:'other-garden',arrivals:'original'}),event);assert.equal(calls,3);
 c=createGardenPredatorClock(options);c.restore(saved);
 assert.deepEqual(run(c,10000,13000,{arrivals:'original'}),event);assert.equal(calls,3);
 assert.equal(run(c,14000,20000,{arrivals:'original'}),undefined);
 c.reconcile('committed',21000);assert.equal(c.snapshot().pending,null);
 c.reset();assert.equal(run(c,22000,80000,{arrivals:'committed'}),undefined);assert.equal(calls,3);
 sample(c,81000,{arrivals:'committed'});assert.equal(calls,4);
});
test('failed journal write never issues a visit and retries the same selection',()=>{
 let writes=false,calls=0;const c=createGardenPredatorClock({random:()=>{calls++;return 0;},persist:()=>writes});
 assert.equal(run(c,0,12000),undefined);assert.equal(calls,3);writes=true;
 assert.deepEqual(sample(c,13000),{kind:'crow',id:'large-billed-crow'});assert.equal(calls,3);
});
test('pending water bird waits for its compatible garden without changing species',()=>{
 const values=[0,.9,.999],c=createGardenPredatorClock({random:()=>values.shift()});
 assert.equal(run(c,0,3000,{gardenId:'mizukagami'}).id,'osprey');c.reset();
 assert.equal(run(c,4000,10000,{gardenId:'komorebi'}),undefined);
 assert.equal(run(c,11000,14000,{key:'water',gardenId:'mizukagami'}).id,'osprey');
});
test('failed arrival retry restarts three seconds, never rerolls a pending species',()=>{
 let calls=0;const c=createGardenPredatorClock({random:()=>{calls++;return 0;}});run(c,0,3000);c.retry();
 assert.equal(run(c,4000,6000),undefined);assert.equal(sample(c,7000).kind,'crow');assert.equal(calls,3);
});
test('miss deadline survives reload and backward wall clock never buys another draw',()=>{
 let saved,calls=0;const opts={random:()=>{calls++;return 1;},persist:s=>{saved=s;}};
 let c=createGardenPredatorClock(opts);run(c,0,3000);c=createGardenPredatorClock(opts);c.restore(saved);
 run(c,4000,62000);assert.equal(calls,1);sample(c,63000);assert.equal(calls,2);
 run(c,64000,68000,{wallNow:0});assert.equal(calls,2);
});
