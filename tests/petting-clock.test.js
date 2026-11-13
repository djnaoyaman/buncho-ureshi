import test from 'node:test';
import assert from 'node:assert/strict';
import {createPettingClock} from '../src/petting-clock.js';
function fixture(){let time=0;const clock=createPettingClock(()=>time);return {clock,at(t,key='bird',pointer=true){time=t;return clock.input(key,{pointer});}};}
test('fast rubbing gives one point per active second, independent of event density',()=>{
 for(const interval of [10,20,100,250]){
  const f=fixture();let points=0;
  for(let t=0;t<=90000;t+=interval)points+=Number(f.at(t));
  assert.equal(points,90);
 }
});
test('no initial bonus, holds, long pauses, or idle credit',()=>{
 const f=fixture();assert.equal(f.at(0),false);assert.equal(f.at(10000),false);
 assert.equal(f.at(20000),false);
 for(let t=20250;t<21000;t+=250)assert.equal(f.at(t),false);
 assert.equal(f.at(21000),true);assert.equal(f.at(21000),false);
 assert.equal(f.at(1000000),false);
});
test('keyboard has the same maximum rate without a daily limit',()=>{
 const f=fixture();let points=0;
 for(let t=0;t<=120000;t+=1000)points+=Number(f.at(t,'bird',false));
 assert.equal(points,120);assert.equal(f.at(120001,'bird',false),false);
});
test('different birds and worlds cannot share partial time',()=>{
 const f=fixture();for(let t=0;t<=750;t+=250)assert.equal(f.at(t,'world1:bird1'),false);
 assert.equal(f.at(1000,'world1:bird2'),false);assert.equal(f.at(1000,'world2:bird1'),false);
 assert.equal(f.at(1000,'world1:bird1'),true);
});
test('destroy/reopen or reset grants no free point; backwards clock grants nothing',()=>{
 const f=fixture();for(let t=0;t<=750;t+=250)f.at(t);
 f.clock.reset();assert.equal(f.at(1000),false);assert.equal(f.at(500),false);
 assert.equal(createPettingClock(()=>500).input('bird'),false);
});
test('pointer and keyboard share the same allowance for the same bird',()=>{
 const f=fixture();f.at(0);for(let t=250;t<=750;t+=250)f.at(t);
 assert.equal(f.at(1000,'bird',false),true);assert.equal(f.at(1000),false);
});
test('slow commit completion restarts the second, so two completed saves cannot appear together',()=>{
 const f=fixture();for(let t=0;t<1000;t+=250)f.at(t);assert.equal(f.at(1000),true);
 for(let t=1250;t<=3750;t+=250)f.at(t);
 f.at(3990);f.clock.settle('bird');
 assert.equal(f.at(4000),false);
 for(let t=4250;t<=4750;t+=250)assert.equal(f.at(t),false);
 assert.equal(f.at(4990),true);
});
