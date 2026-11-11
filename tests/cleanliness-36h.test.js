import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorld,advanceTo,advanceTicks,cleanGarden,serializeWorld,parseSave,validateWorld,householdIncomeStatus,hireCaretaker,feedBird,economyToken,CARE_RULES,SAVE_VERSION,TICK_MS} from '../src/engine.js';
import {lifeStatus,LIFE_RULES} from '../src/life-care.js';
const NOW=Date.parse('2026-11-10T12:00:00+09:00'),HOUR=3600000;
const world=()=>createWorld(NOW);
test('100 to20 takes36 hours; integer boundaries remain exact',()=>{
 assert.equal(CARE_RULES.soilIntervalTicks,27);
 for(const [minutes,expected] of [[26,100],[27,99],[1440,47],[2159,21],[2160,20],[2699,1],[2700,0],[3000,0]]){
  const w=world();advanceTo(w,NOW+minutes*TICK_MS,{present:true});assert.equal(w.care.cleanliness,expected,`${minutes} minutes`);assert(Number.isInteger(w.care.cleanliness));validateWorld(w);
 }
});
test('one long absence, repeated short resumptions and direct steps retain the same fractional interval',()=>{
 const a=world(),b=world(),c=world();advanceTo(a,NOW+241*TICK_MS,{present:true});
 for(let i=1;i<=241;i++)advanceTo(b,NOW+i*TICK_MS,{present:true});
 advanceTicks(c,241,NOW);
 assert.equal(a.care.cleanliness,92);assert.equal(b.care.cleanliness,a.care.cleanliness);assert.equal(c.care.cleanliness,a.care.cleanliness);
});
test('reloading at minute26 cannot postpone the next reduction or invent a save field',()=>{
 let w=world();advanceTo(w,NOW+26*TICK_MS,{present:true});const before=structuredClone(w),restored=parseSave(serializeWorld(w));assert.deepEqual(restored,before);
 advanceTo(restored,NOW+27*TICK_MS,{present:true});assert.equal(restored.care.cleanliness,99);assert.equal(restored.version,SAVE_VERSION);assert.deepEqual(Object.keys(restored.care),['cleanliness','lastCleanTick']);
});
test('manual cleaning starts a fresh27-minute interval even away from the global tick boundary',()=>{
 const w=world();advanceTo(w,NOW+31*TICK_MS,{present:true});assert.equal(w.care.cleanliness,99);assert.equal(cleanGarden(w).changed,true);assert.equal(w.care.lastCleanTick,31);
 advanceTo(w,NOW+57*TICK_MS,{present:true});assert.equal(w.care.cleanliness,100);advanceTo(w,NOW+58*TICK_MS,{present:true});assert.equal(w.care.cleanliness,99);
 advanceTo(w,NOW+(31+2160)*TICK_MS,{present:true});assert.equal(w.care.cleanliness,20);validateWorld(w);
});
test('existing partial cleanliness and cleaning history survive read and resume unchanged until the next boundary',()=>{
 const w=world();advanceTicks(w,31,NOW);w.care.cleanliness=58;w.care.lastCleanTick=5;
 const snapshot=serializeWorld(w),restored=parseSave(snapshot);assert.equal(restored.care.cleanliness,58);assert.equal(restored.care.lastCleanTick,5);assert.equal(serializeWorld(restored),snapshot);
 advanceTicks(restored,1,NOW);assert.equal(restored.care.cleanliness,57);assert.equal(restored.care.lastCleanTick,5);
});
test('pause and clock rollback do not lower cleanliness or lose the partial interval',()=>{
 const w=world();advanceTo(w,NOW+26*TICK_MS,{present:true});w.paused=true;advanceTo(w,NOW+24*HOUR,{present:true});assert.equal(w.care.cleanliness,100);assert.equal(w.tick,26);
 advanceTo(w,NOW,{present:true});assert.equal(w.care.cleanliness,100);w.paused=false;advanceTo(w,NOW+24*HOUR+TICK_MS,{present:true});assert.equal(w.care.cleanliness,99);validateWorld(w);
});
test('daily reward does not require cleaning at24hours, but retains its20 threshold at36hours',()=>{
 const w=world();advanceTo(w,NOW+24*HOUR,{present:true});w.birds[0].needs.food=w.birds[0].needs.energy=100;assert.equal(w.care.cleanliness,47);assert.equal(householdIncomeStatus(w).ready,true);
 advanceTo(w,NOW+36*HOUR,{present:true});w.birds[0].needs.food=w.birds[0].needs.energy=100;assert.equal(householdIncomeStatus(w).reason,'care');assert.match(householdIncomeStatus(w).message,/掃除/);cleanGarden(w);assert.equal(householdIncomeStatus(w).ready,true);
});
test('existing neglect and untreated illness deadlines are unchanged',()=>{
 assert.equal(LIFE_RULES.neglectMs,72*HOUR);assert.equal(LIFE_RULES.treatmentMs,24*HOUR);
 const w=world();w.paused=true;const life=lifeStatus(w,'b1');life.condition={kind:'respiratory',sinceAt:NOW,deadlineAt:NOW+24*HOUR};advanceTo(w,NOW+24*HOUR,{present:true});assert.equal(lifeStatus(w,'b1').death.cause,'illness');assert.equal(w.care.cleanliness,100);
 const unattended=world();advanceTo(unattended,NOW+72*HOUR,{present:true});assert.equal(lifeStatus(unattended,'b1').death.cause,'neglect');assert.equal(lifeStatus(unattended,'b1').death.at,NOW+72*HOUR);
});

test('caretaker cleaning at the paid boundary is identical for one long absence and a midway return',()=>{
 const paid=()=>{const w=world();w.economy.gold=w.economy.lifetimeGold=200;hireCaretaker(w,1,economyToken(w),NOW);return w;};
 const a=paid(),b=paid();advanceTo(a,NOW+36*HOUR,{present:true});advanceTo(b,NOW+24*HOUR,{present:true});advanceTo(b,NOW+36*HOUR,{present:true});
 assert.equal(a.care.cleanliness,73);assert.deepEqual(a.care,b.care);assert.equal(a.care.lastCleanTick,null);
 assert.equal(a.economy.gold,176);assert.equal(b.economy.gold,176);assert.deepEqual(a.lifecycle.birds,b.lifecycle.birds);assert.equal(lifeStatus(a,'b1').lastCareAt,NOW+24*HOUR);validateWorld(a);validateWorld(b);
});
test('short resumption cannot charge dirt to a minute that was covered by caretaker cleaning',()=>{
 const w=world();w.economy.gold=w.economy.lifetimeGold=200;hireCaretaker(w,1,economyToken(w),NOW);advanceTo(w,NOW+24*HOUR-2*TICK_MS,{present:true});w.care.lastCleanTick=1413;
 const a=structuredClone(w),b=structuredClone(w);advanceTo(a,NOW+24*HOUR+TICK_MS,{present:true});advanceTo(b,NOW+24*HOUR,{present:true});advanceTo(b,NOW+24*HOUR+TICK_MS,{present:true});
 assert.equal(a.care.cleanliness,100);assert.deepEqual(a.care,b.care);assert.equal(a.care.lastCleanTick,1413);assert.equal(a.economy.gold,176);assert.deepEqual(a.lifecycle.birds,b.lifecycle.birds);validateWorld(a);validateWorld(b);
});
test('clock rollback never reactivates an expired cleaning contract',()=>{
 const w=world();w.economy.gold=w.economy.lifetimeGold=200;hireCaretaker(w,1,economyToken(w),NOW);advanceTo(w,NOW+36*HOUR,{present:true});w.care.cleanliness=20;
 advanceTicks(w,1,NOW);assert.equal(w.care.cleanliness,20);assert.equal(w.lifecycle.seenAt,NOW+36*HOUR);assert.equal(w.lifecycle.caretaker.until,NOW+24*HOUR);validateWorld(w);
});

test('care before story catch-up cannot erase cleaning already covered by the contract',()=>{
 const paid=()=>{const w=world();w.economy.gold=w.economy.lifetimeGold=200;hireCaretaker(w,1,economyToken(w),NOW);return w;};
 const a=paid(),b=paid();feedBird(a,'b1',NOW+36*HOUR);advanceTo(a,NOW+36*HOUR,{present:true});advanceTo(b,NOW+24*HOUR,{present:true});feedBird(b,'b1',NOW+36*HOUR);advanceTo(b,NOW+36*HOUR,{present:true});
 assert.equal(a.care.cleanliness,73);assert.deepEqual(a.care,b.care);assert.deepEqual(a.lifecycle.birds,b.lifecycle.birds);assert.equal(a.economy.gold,176);assert.equal(a.decor.points,b.decor.points);assert.equal(lifeStatus(a,'b1').lastCareAt,NOW+36*HOUR);validateWorld(a);validateWorld(b);
});
test('a caretaker ending between story ticks retains the same cleaning with either resume pattern',()=>{
 const paid=()=>{const w=world();w.economy.gold=w.economy.lifetimeGold=200;hireCaretaker(w,1,economyToken(w),NOW+30000);return w;};
 const a=paid(),b=paid();advanceTo(a,NOW+36*HOUR+30000,{present:true});advanceTo(b,NOW+24*HOUR+30000,{present:true});advanceTo(b,NOW+36*HOUR+30000,{present:true});
 assert.equal(a.care.cleanliness,73);assert.deepEqual(a.care,b.care);assert.deepEqual(a.lifecycle.birds,b.lifecycle.birds);assert.equal(lifeStatus(a,'b1').lastCareAt,NOW+24*HOUR+30000);validateWorld(a);validateWorld(b);
});
