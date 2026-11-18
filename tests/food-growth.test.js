import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorld,createBird,feedBird,economyToken,validateWorld,growthDuration,GROWTH_RULES,advanceTo,hireCaretaker,readCompatibleWorld,prepareWorldReplacement,reconcileImportedCare,serializeWorld,parseSave} from '../src/engine.js';
import * as old from './fixtures/engine-v21.js';
import {FOOD_CATALOG,FOOD_GROWTH_RULES,foodGrowthStatus} from '../src/food-growth.js';
import {lifeStatus,ageTicks} from '../src/life-care.js';
const NOW=Date.parse('2026-11-18T12:00:00Z'),DAY=86400000;
function setup(){const w=createWorld(NOW,842911),b=createBird(w,{home:'resident',stage:'juvenile',sex:'male'});return {w,b};}
function meal(w,b,food,now=NOW){b.needs.food=80;return feedBird(w,b.id,now,economyToken(w),food);}
test('four free foods produce bounded real growth differences with identical care and money',()=>{
 const durations=[];for(const f of FOOD_CATALOG){const {w,b}=setup(),seed=w.seed,tick=w.tick,age=ageTicks(w,b),money=w.economy.gold;const r=meal(w,b,f.id);assert.equal(r.changed,true);assert.equal(r.growthAwardTicks,Math.floor(4368*f.growthPercent/100));assert.equal(b.needs.food,100);assert.equal(w.seed,seed);assert.equal(w.tick,tick);assert.equal(ageTicks(w,b),age);assert.equal(w.economy.gold,money);assert.equal(lifeStatus(w,b).lastCareAt,NOW);assert.equal(f.gold,0);durations.push(growthDuration(b));validateWorld(w);assert.deepEqual(parseSave(serializeWorld(w)),w);}assert.deepEqual(durations,[4368,4194,4281,4325]);
});
test('full, invalid, stale, repeated and clock rollback meals cannot mint growth',()=>{
 const {w,b}=setup();meal(w,b,'pellet');const s=structuredClone(b.foodGrowth);assert.equal(feedBird(w,b.id,NOW,economyToken(w),'greens').changed,false);assert.deepEqual(b.foodGrowth,s);assert.throws(()=>feedBird(w,b.id,NOW,economyToken(w),'not-a-food'));assert.deepEqual(b.foodGrowth,s);b.needs.food=80;const token=economyToken(w);w.revision++;assert.equal(feedBird(w,b.id,NOW,token,'pellet').changed,false);assert.deepEqual(b.foodGrowth,s);for(const at of [NOW,NOW-1,NOW+DAY-1])assert.equal(meal(w,b,'pellet',at).growthAwardTicks,0);assert.equal(meal(w,b,'pellet',NOW+DAY).growthAwardTicks,174);validateWorld(w);
});
test('all meals retain baseline; daily bonus caps at20 percent and never affects adult age',()=>{
 const {w,b}=setup();assert.equal(meal(w,b,'seed').growthAwardTicks,0);for(let d=0;d<8;d++)meal(w,b,'pellet',NOW+d*DAY);assert.equal(b.foodGrowth.bonusTicks,873);assert.equal(growthDuration(b),3495);assert.equal(foodGrowthStatus(b,4368,NOW+9*DAY).capTicks,873);const adult=w.birds[0],before=ageTicks(w,adult);assert.equal(meal(w,adult,'pellet',NOW+8*DAY).growthAwardTicks,0);assert.equal(ageTicks(w,adult),before);assert.equal(adult.foodGrowth.bonusTicks,0);validateWorld(w);
});
test('eggs and chicks cannot receive food or forged acceleration; visitors cannot receive growth',()=>{
 for(const stage of ['egg','chick']){const w=createWorld(NOW),b=createBird(w,{home:'resident',stage});assert.throws(()=>feedBird(w,b.id,NOW,economyToken(w),'pellet'));b.foodGrowth.bonusTicks=1;b.foodGrowth.lastBonusAt=NOW;b.foodGrowth.lastFood='pellet';assert.throws(()=>validateWorld(w));}const w=createWorld(NOW),b=createBird(w,{home:'visitor',stage:'juvenile'});assert.equal(meal(w,b,'pellet').growthAwardTicks,0);validateWorld(w);
});
test('one long absence and split active progression reach the same accelerated milestone without younger age',()=>{
 const {w,b}=setup();meal(w,b,'pellet');w.economy.gold=w.economy.lifetimeGold=1000;hireCaretaker(w,7,economyToken(w),NOW);const split=structuredClone(w),id=b.id,end=growthDuration(b);advanceTo(w,NOW+(end-1)*60000);assert.equal(w.birds.find(b=>b.id===id).stage,'juvenile');for(let n=60;n<end;n+=60)advanceTo(split,NOW+n*60000);advanceTo(w,NOW+end*60000);advanceTo(split,NOW+end*60000);for(const x of [w,split]){const grown=x.birds.find(b=>b.id===id);assert.equal(grown.stage,'adult');assert.equal(grown.stageTick,end);assert.equal(ageTicks(x,grown),end);validateWorld(x);}assert.equal(w.journal.find(e=>e.kind==='grow'&&e.ids[0]===id).at,split.journal.find(e=>e.kind==='grow'&&e.ids[0]===id).at);
});
test('v21 migration is pure, additive, archive-complete and older reader rejects new saves',()=>{
 const source=old.createWorld(NOW);old.createBird(source,{home:'departed'});const before=structuredClone(source),next=readCompatibleWorld(source,NOW+DAY);assert.deepEqual(source,before);assert.equal(next.version,22);const projection=structuredClone(next);projection.version=21;for(const b of [...projection.birds,...projection.archive])delete b.foodGrowth;assert.deepEqual(projection,before);assert.throws(()=>old.readCompatibleWorld(next));for(const b of [...next.birds,...next.archive])assert.deepEqual(b.foodGrowth,{bonusTicks:0,lastBonusAt:null,lastFood:null});
});
test('restoring snapshot preserves cooldown and does not stack bonus; same-world reconciliation keeps highwater',()=>{
 const {w,b}=setup();meal(w,b,'pellet');const snapshot=structuredClone(w);meal(w,b,'pellet',NOW+DAY);const restored=prepareWorldReplacement(w,snapshot,NOW+2*DAY,'restored');const rb=restored.birds.find(x=>x.id===b.id);assert.equal(rb.foodGrowth.bonusTicks,174);assert.equal(rb.foodGrowth.lastBonusAt,NOW+2*DAY);assert.equal(meal(restored,rb,'pellet',NOW+2*DAY).growthAwardTicks,0);validateWorld(restored);reconcileImportedCare(snapshot,w,NOW+DAY);validateWorld(snapshot);const sb=snapshot.birds.find(x=>x.id===b.id);assert.equal(sb.foodGrowth.bonusTicks,348);assert.equal(sb.foodGrowth.lastBonusAt,NOW+DAY);assert.equal(meal(snapshot,sb,'pellet',NOW+DAY).growthAwardTicks,0);validateWorld(snapshot);
});
test('strict food state rejects unknown fields, fractional or unbounded values and future clocks',()=>{
 for(const mutate of [s=>s.extra=1,s=>s.bonusTicks=-1,s=>s.bonusTicks=.5,s=>s.bonusTicks=874,s=>s.lastFood='bad',s=>s.lastBonusAt=NOW+1]){const {w,b}=setup();meal(w,b,'pellet');mutate(b.foodGrowth);assert.throws(()=>validateWorld(w));}
});
test('caretaker feeding preserves original growth pace and never awards food bonuses',()=>{
 const {w,b}=setup();w.economy.gold=w.economy.lifetimeGold=1000;const before=w.economy.gold;hireCaretaker(w,3,economyToken(w),NOW);assert.equal(w.economy.gold,before-72);advanceTo(w,NOW+2*DAY);const bird=w.birds.find(x=>x.id===b.id);assert.equal(bird.foodGrowth.bonusTicks,0);assert.equal(bird.foodGrowth.lastBonusAt,null);assert.equal(bird.foodGrowth.lastFood,null);assert.equal(growthDuration(bird),4368);validateWorld(w);
});
test('serialized simultaneous tabs allow only one meal and one growth award',async()=>{
 const {IDBFactory}=await import('fake-indexeddb');const {openGameStore}=await import('../src/game-store.js');const indexedDB=new IDBFactory(),a=await openGameStore({indexedDB}),b=await openGameStore({indexedDB});try{const state=setup();await a.transact(()=>state.w);const action=store=>store.transact(w=>{feedBird(w,state.b.id,NOW,economyToken(w),'pellet');return w;});await Promise.all([action(a),action(b)]);const result=await a.transact(w=>w),bird=result.birds.find(x=>x.id===state.b.id);assert.equal(bird.foodGrowth.bonusTicks,174);assert.equal(result.events.filter(e=>e.kind==='user-feed'&&e.ids[0]===bird.id).length,1);validateWorld(result);}finally{a.close();b.close();}
});
