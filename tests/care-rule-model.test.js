import test from 'node:test';
import assert from 'node:assert/strict';
import {projectNeed,simulateCare,DAY} from '../scripts/lib/care-rule-model.mjs';
const options={rate:30,floor:40,joinedAt:0};
const start={value:100,remainder:0,at:0};
test('offline comparison calculates elapsed time, preserves fractions and never writes game saves',()=>{
 assert.equal(projectNeed(start,DAY,options).value,70);assert.equal(projectNeed(start,2*DAY,options).value,40);
 let s=start;for(let i=1;i<=137;i++)s=projectNeed(s,Math.floor(DAY*i/137),options);
 assert.deepEqual(s,projectNeed(start,DAY,options));assert.deepEqual(start,{value:100,remainder:0,at:0});
});
test('20/30/40 per day, low legacy values and the floor do not manufacture care debt',()=>{
 for(const rate of [20,30,40])assert.equal(projectNeed(start,DAY,{...options,rate}).value,100-rate);
 const low={value:20,remainder:0,at:0};assert.equal(projectNeed(low,DAY,options).value,20);
 const atFloor=projectNeed(start,10*DAY,options);assert.equal(atFloor.value,40);assert.equal(atFloor.remainder,0);
 assert.equal(projectNeed({...atFloor,value:100},11*DAY,options).value,70);
});
test('joining, backward clocks, serialized reloads and contract boundaries preserve elapsed-time meaning',()=>{
 assert.equal(projectNeed(start,DAY,{...options,joinedAt:DAY/2}).value,85);
 const once=projectNeed(start,DAY/3,options);assert.deepEqual(projectNeed(JSON.parse(JSON.stringify(once)),DAY,options),projectNeed(start,DAY,options));
 assert.equal(projectNeed(once,0,options).rollback,true);assert.equal(projectNeed(once,0,options).value,once.value);
 const contracts=[{from:DAY/4,until:DAY*3/4}],a=projectNeed(start,DAY,{...options,contracts});
 let s=start;for(let i=1;i<=4;i++)s=projectNeed(s,DAY*i/4,{...options,contracts});assert.deepEqual(s,a);assert.equal(a.value,93);assert.equal(a.remainder,DAY/2);
 assert.equal(projectNeed(start,DAY,{...options,contracts:[{from:0,until:2*DAY}]}).value,100);
 assert.throws(()=>projectNeed(start,DAY,{...options,contracts:[{from:3,until:2}]}));
});
test('daily H base is equal across visits, household size and funded care; proportional R is not caregiver-neutral',()=>{
 for(const days of [7,28])for(const birds of [1,6])for(const visits of [1,3])for(const caretaker of [false,true]){
  const h=simulateCare({days,birds,visits,caretaker,policy:'H'});assert.equal(h.baseGems,days*30);assert(h.extraGems<=days*10);assert.equal(h.netGold,days*(caretaker?6:30));
  if(caretaker){assert.equal(h.extraGems,0);assert.equal(h.contractFunded,true);assert.equal(simulateCare({days,birds,visits,caretaker,policy:'R'}).directGems,0);}
 }
});
test('fractional R payouts agree for equal total recovery, H extra is household-capped and time-of-day gives no base advantage',()=>{
 const a=simulateCare({days:28,birds:1,visits:1}),b=simulateCare({days:28,birds:1,visits:3});assert.equal(a.directGems,b.directGems);assert.equal(a.recovered,b.recovered);
 const morning=simulateCare({days:7,birds:1,visits:1,policy:'H',hours:[7]}),night=simulateCare({days:7,birds:6,visits:3,policy:'H',hours:[1,13,23]});assert.equal(morning.baseGems,night.baseGems);
});
test('weekend/three-day absence flag existing health conflict; low balance never buys a free contract',()=>{
 const weekend=simulateCare({days:28,birds:1,visits:1,policy:'H',weekendOnly:true});assert.equal(weekend.baseGems,8*30);assert.equal(weekend.healthWarning,true);
 const absent=simulateCare({days:7,birds:1,visits:1,absentDays:[1,2,3]});assert.equal(absent.healthWarning,true);
 const low=simulateCare({days:7,birds:1,visits:1,policy:'H',caretaker:true,initialGold:0});assert.equal(low.contractFunded,false);assert.equal(low.caretakerCost,0);assert.equal(low.netGold,210);
});
