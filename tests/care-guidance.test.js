import test from 'node:test';import assert from 'node:assert/strict';
import {createWorld,createBird} from '../src/engine.js';
import {careGuidance,cleaningGuidance} from '../src/care-guidance.js';
const now=Date.parse('2026-11-09T00:00:00Z');
for(const food of [60,80,100])test(`selected food ${food}, no mutation and short guidance`,()=>{
 const w=createWorld(now),b=w.birds[0];b.needs.food=food;b.needs.energy=100;const before=JSON.stringify(w),s=careGuidance(w,b.id);
 assert.match(s,food<100?/ごはん/:/なでてあそぼう/);assert.ok([...s].length<=30);assert.equal(JSON.stringify(w),before);
});
test('energy shares one pool; resting never promises automatic recovery',()=>{const w=createWorld(now);w.birds[0].needs.food=100;assert.match(careGuidance(w,'b1'),/名前を呼ぶ/);assert.doesNotMatch(careGuidance(w,'b1'),/待|回復/);});
for(const stage of ['egg','chick'])test(`${stage} has observation only`,()=>{const w=createWorld(now);w.birds[0].stage=stage;assert.match(careGuidance(w,'b1'),/見守ろう/);});
test('visitor and departed never inherit resident feeding instructions',()=>{const w=createWorld(now),b=createBird(w);assert.match(careGuidance(w,b.id),/お友達/);b.home='departed';assert.match(careGuidance(w,b.id),/別のおうち/);assert.match(careGuidance(w,'b1'),/ごはん/);});
test('death, danger and illness have priority over normal gauges',()=>{const w=createWorld(now),s=w.lifecycle.birds[0];s.condition={kind:'injury'};assert.match(careGuidance(w,'b1'),/病院/);w.encounters.raptor.active={hostile:true,targetBirdId:'b1'};assert.match(careGuidance(w,'b1'),/帰ろう/);s.death={};assert.match(careGuidance(w,'b1'),/思い出/);});
test('only the targeted bird sees the predator instruction',()=>{const w=createWorld(now),b=createBird(w,{home:'resident'});w.encounters.raptor.active={hostile:true,targetBirdId:b.id};assert.doesNotMatch(careGuidance(w,'b1'),/帰ろう/);});
for(const place of ['home','park','friend'])test(`cleaning location ${place}`,()=>{const w=createWorld(now);w.field.place=place;w.care.cleanliness=20;assert.equal(!!cleaningGuidance(w),place==='home');});
test('cleaning respects the actual cooldown and disappears above threshold',()=>{const w=createWorld(now);w.care.cleanliness=20;w.care.lastCleanTick=w.tick;assert.equal(cleaningGuidance(w),'');w.tick++;assert.ok(cleaningGuidance(w));w.care.cleanliness=21;assert.equal(cleaningGuidance(w),'');});
test('unknown selection gives no incorrect task',()=>assert.equal(careGuidance(createWorld(now),'missing'),''));

test('a care break checks the whole living household, illness, dirt and danger without mutation',async()=>{
 const {careIsSettled}=await import('../src/care-guidance.js');
 const w=createWorld(now),b=createBird(w,{home:'resident'});
 for(const bird of w.birds)bird.needs.food=bird.needs.energy=100;
 const before=structuredClone(w);assert.equal(careIsSettled(w),true);assert.deepEqual(w,before);
 b.needs.food=99;assert.equal(careIsSettled(w),false);b.needs.food=100;
 w.lifecycle.birds.find(s=>s.birdId===b.id).condition={kind:'injury'};assert.equal(careIsSettled(w),false);
 w.lifecycle.birds.find(s=>s.birdId===b.id).condition=null;
 w.care.cleanliness=20;assert.equal(careIsSettled(w),false);w.care.cleanliness=100;
 w.encounters.raptor.active={hostile:true};assert.equal(careIsSettled(w),false);
 w.encounters.raptor.active=null;w.gems.droppings=[{birdId:b.id}];assert.equal(careIsSettled(w),false);w.gems.droppings=[];b.stage='chick';b.needs.food=0;assert.equal(careIsSettled(w),true);
 for(const bird of w.birds)bird.home='departed';assert.equal(careIsSettled(w),false);
});
