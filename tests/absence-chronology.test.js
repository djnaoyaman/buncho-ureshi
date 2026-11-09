import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {IDBFactory} from 'fake-indexeddb';
import {createWorld,createBird,advanceTo,validateWorld,serializeWorld,parseSave,readCompatibleWorld,hireCaretaker,economyToken,TICK_MS} from '../src/engine.js';
import {allBirds} from '../src/world-birds.js';
import {lifeStatus,LIFE_RULES} from '../src/life-care.js';
import {openGameStore} from '../src/game-store.js';

const NOW=Date.UTC(2026,10,9),DAY=86400000,minute=TICK_MS;
function family(at=NOW){
 const world=createWorld(at),father=createBird(world,{home:'resident',sex:'male'});
 const child=createBird(world,{home:'resident',stage:'egg',parents:['b1',father.id],generation:1});
 return {world,child};
}
// Care bars intentionally open one slot per observation. Compare the durable
// identity/history/health/economy outcomes, without changing that existing rule.
function outcome(world){return {
 tick:world.tick,seed:world.seed,decor:world.decor,gold:world.economy.gold,
 protagonist:world.protagonist,journal:world.journal,
 birds:allBirds(world).map(b=>({id:b.id,name:b.name,parents:b.parents,partner:b.partner,home:b.home,stage:b.stage,stageTick:b.stageTick,death:lifeStatus(world,b).death})),
};}
for(const stops of [[],[100],[50,100],[12,36,84,100]])test(`growth and known deaths are chronological across offline partitions ${stops}`,()=>{
 const {world,child}=family();
 for(const stop of stops)advanceTo(world,NOW+stop*minute);
 advanceTo(world,NOW+4*DAY);
 assert.equal(child.stage,'adult');
 assert.deepEqual(lifeStatus(world,child).death,{cause:'neglect',at:NOW+3*DAY,tick:4320});
 const growth=world.journal.filter(e=>e.ids[0]===child.id&&['hatch','grow'].includes(e.kind));
 assert.deepEqual(growth.map(e=>[e.kind,e.tick,e.at]),[['hatch',12,NOW+12*minute],['grow',36,NOW+36*minute],['grow',84,NOW+84*minute]]);
 assert.equal(world.decor.points,95);assert.equal(world.economy.gold,0);
 const single=family().world;advanceTo(single,NOW+4*DAY);assert.deepEqual(outcome(world),outcome(single));
 const saved=serializeWorld(world);advanceTo(world,NOW+4*DAY);assert.equal(serializeWorld(world),saved);
 assert.deepEqual(parseSave(saved),world);
});

test('partial-minute resume retains its minute anchor and actual growth timestamps',()=>{
 const {world,child}=family();advanceTo(world,NOW+100*minute+37000);
 assert.equal(world.tick,100);assert.equal(world.lastUpdated,NOW+100*minute);
 assert.equal(world.journal.find(e=>e.kind==='hatch'&&e.ids[0]===child.id).at,NOW+12*minute);
 const points=world.decor.points;advanceTo(world,NOW+106*minute+12000);
 assert.equal(world.tick,106);assert.equal(world.lastUpdated,NOW+106*minute);assert.equal(world.decor.points,points);validateWorld(world);
});

test('an existing treatment deadline between story ticks records the completed tick',()=>{
 const world=createWorld(NOW);world.lifecycle.seenAt=NOW+25000;
 lifeStatus(world,'b1').condition={kind:'injury',sinceAt:NOW+25000,deadlineAt:NOW+DAY+25000};
 validateWorld(world);advanceTo(world,NOW+2*DAY+39000);
 assert.deepEqual(lifeStatus(world,'b1').death,{cause:'injury',at:NOW+DAY+25000,tick:1440});
 assert.equal(world.journal.find(e=>e.kind==='death').at,NOW+DAY+25000);validateWorld(world);
});

test('a feeding deadline before hatching leaves the egg unchanged and awards no growth',()=>{
 const {world,child}=family(NOW-3*DAY+6*minute);world.paused=true;advanceTo(world,NOW);world.paused=false;
 const points=world.decor.points;advanceTo(world,NOW+100*minute);
 assert.equal(child.stage,'egg');assert.deepEqual(lifeStatus(world,child).death,{cause:'neglect',at:NOW+6*minute,tick:6});
 assert.equal(world.journal.some(e=>e.kind==='hatch'),false);assert.equal(world.decor.points,points);validateWorld(world);
});

test('caretaker expiry retains the existing extra three days, without charging again',()=>{
 const one=family().world;one.economy.gold=one.economy.lifetimeGold=500;
 hireCaretaker(one,1,economyToken(one),NOW);const split=structuredClone(one);
 advanceTo(one,NOW+6*DAY);advanceTo(split,NOW+2*DAY);advanceTo(split,NOW+6*DAY);
 assert.deepEqual(outcome(one),outcome(split));assert.equal(one.economy.gold,476);
 for(const b of allBirds(one)){assert.equal(lifeStatus(one,b).lastCareAt,NOW+DAY);assert.deepEqual(lifeStatus(one,b).death,{cause:'neglect',at:NOW+4*DAY,tick:5760});}
 validateWorld(one);validateWorld(split);
});

test('lifespan and inheritance occur before later real deadlines',()=>{
 const world=createWorld(NOW);world.tick=LIFE_RULES.lifespanTicks-20;
 world.clock.originTick=world.tick;
 const father=createBird(world,{home:'departed',sex:'male'});
 const child=createBird(world,{home:'resident',stage:'egg',parents:['b1',father.id],generation:1});
 validateWorld(world);advanceTo(world,NOW+100*minute);
 assert.deepEqual(lifeStatus(world,'b1').death,{cause:'lifespan',at:NOW+20*minute,tick:LIFE_RULES.lifespanTicks});
 assert.equal(world.protagonist.birdId,child.id);assert.equal(child.stage,'adult');
 assert.equal(world.journal.find(e=>e.kind==='succession').at,NOW+20*minute);validateWorld(world);
});

test('newly observed illness keeps a full visible treatment day after absence',()=>{
 const world=createWorld(NOW);world.care.cleanliness=0;advanceTo(world,NOW);
 advanceTo(world,NOW+2*DAY);
 assert.equal(lifeStatus(world,'b1').death,null);
 assert.deepEqual(lifeStatus(world,'b1').condition,{kind:'respiratory',sinceAt:NOW+2*DAY,deadlineAt:NOW+3*DAY});validateWorld(world);
});

test('an outside heir returns on observation with its original full care window',()=>{
 const world=createWorld(NOW);world.tick=LIFE_RULES.lifespanTicks-20;world.clock.originTick=world.tick;
 const father=createBird(world,{home:'departed',sex:'male'});
 const child=createBird(world,{home:'departed',stage:'egg',parents:['b1',father.id],generation:1});
 lifeStatus(world,child).condition={kind:'injury',sinceAt:NOW,deadlineAt:NOW+DAY};
 validateWorld(world);advanceTo(world,NOW+2*DAY);
 assert.equal(world.protagonist.birdId,child.id);assert.equal(child.home,'resident');
 assert.equal(lifeStatus(world,child).death,null);assert.equal(lifeStatus(world,child).lastCareAt,NOW+2*DAY);
 assert.deepEqual(lifeStatus(world,child).condition,{kind:'injury',sinceAt:NOW+2*DAY,deadlineAt:NOW+3*DAY});
 assert.equal(world.journal.find(e=>e.kind==='succession').at,NOW+2*DAY);validateWorld(world);
});

test('same-time deaths settle as one batch before choosing a resident heir',()=>{
 const world=createWorld(NOW),father=createBird(world,{home:'resident',sex:'male'});
 const child=createBird(world,{home:'resident',parents:['b1',father.id],generation:1});
 world.tick=LIFE_RULES.lifespanTicks-20;world.clock.originTick=world.tick;
 validateWorld(world);advanceTo(world,NOW+100*minute);
 assert.equal(lifeStatus(world,'b1').death.at,NOW+20*minute);
 assert.equal(lifeStatus(world,child).death.at,NOW+20*minute);
 assert.equal(world.protagonist.birdId,'b1');assert.equal(world.journal.some(e=>e.kind==='succession'),false);validateWorld(world);
});

test('an archived young friend grows and ages without replaying social hours',()=>{
 const world=createWorld(NOW),young=createBird(world,{home:'departed',stage:'juvenile'});
 for(let i=0;i<150;i++)createBird(world,{home:'departed'});
 assert.ok(world.archive.some(b=>b.id===young.id));
 advanceTo(world,NOW+100000*minute);
 assert.equal(young.stage,'adult');assert.deepEqual(lifeStatus(world,young).death,{cause:'lifespan',at:NOW+LIFE_RULES.lifespanTicks*minute,tick:LIFE_RULES.lifespanTicks});
 assert.equal(world.nextId,153);assert.equal(allBirds(world).length,152);validateWorld(world);
});

test('existing graves and both daily and permanent histories remain byte-identical',()=>{
 const world=createWorld(NOW);world.paused=true;advanceTo(world,NOW+3*DAY);
 const death=structuredClone(lifeStatus(world,'b1')),journal=structuredClone(world.journal),events=structuredClone(world.events);
 world.paused=false;advanceTo(world,NOW+8*DAY);
 assert.deepEqual(lifeStatus(world,'b1'),death);assert.deepEqual(world.journal,journal);assert.deepEqual(world.events,events);validateWorld(world);
});

test('a frozen pre-fix v12 save is never backfilled, revived or compensated',()=>{
 const original=JSON.parse(readFileSync(new URL('./fixtures/absence-v12-before-chronology.json',import.meta.url),'utf8'));
 const world=readCompatibleWorld(original,NOW+8*DAY);
 assert.equal(world.birds[2].stage,'egg');assert.equal(world.decor.points,20);
 advanceTo(world,NOW+8*DAY);
 assert.deepEqual(world.birds,original.birds);assert.deepEqual(world.events,original.events);assert.deepEqual(world.journal,original.journal);
 assert.deepEqual(world.lifecycle.birds,original.lifecycle.birds);assert.deepEqual(world.decor,original.decor);
 assert.deepEqual(world.protagonist,original.protagonist);assert.equal(world.seed,original.seed);validateWorld(world);
});

test('migrated v11 records and the caller input are never rewritten by future catch-up',()=>{
 const old=createWorld(NOW);old.version=11;delete old.clock;delete old.archive;delete old.journal;
 const original=structuredClone(old),world=readCompatibleWorld(old,NOW+DAY),history=structuredClone(world.events);
 advanceTo(world,NOW+2*DAY);
 assert.deepEqual(old,original);assert.deepEqual(world.events.slice(0,history.length),history);
 assert.deepEqual(world.journal.slice(0,history.length),history);validateWorld(world);
});

test('backwards clock cannot replay a long absence already observed by lifecycle',()=>{
 const world=createWorld(NOW);world.lifecycle.seenAt=NOW+DAY;
 const before=outcome(world);advanceTo(world,NOW+DAY-1);
 assert.deepEqual(outcome(world),before);assert.equal(world.lastUpdated,NOW);
 advanceTo(world,NOW+DAY);assert.equal(world.tick,1440);validateWorld(world);
});

test('concurrent persisted resumptions commit milestone Gems and history once',async()=>{
 const indexedDB=new IDBFactory(),a=await openGameStore({indexedDB}),b=await openGameStore({indexedDB});
 try{
  await a.transact(()=>family().world);
  await Promise.all([a.transact(w=>advanceTo(w,NOW+4*DAY)),b.transact(w=>advanceTo(w,NOW+4*DAY))]);
  const world=await a.transact(w=>w);assert.equal(world.decor.points,95);
  assert.equal(world.journal.filter(e=>e.kind==='hatch').length,1);
  assert.equal(world.journal.filter(e=>e.kind==='death').length,3);validateWorld(world);
 }finally{a.close();b.close();}
});
