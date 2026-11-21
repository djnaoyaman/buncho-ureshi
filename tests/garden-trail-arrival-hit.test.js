import assert from 'node:assert/strict';
import {test} from 'node:test';
import {assignTrailSeats} from '../src/garden-trail-clearance.js';

const old={id:'kept',p:[.31,.63]};
const first={id:'blocked-target',p:[.51,.73]};
const second={id:'tap-target',p:[.6,.73]};
const actors=[{id:'resident'},{id:'arrival'}];
const retained=new Map([['resident',old]]);

test('later arrivals probe complete native hit plans before using an otherwise clear seat',()=>{
 const seen=[];
 const p=assignTrailSeats({actors,seats:[old,first,second],retained,canPlace:()=>true,accept(plan){
  assert.equal(plan.get('resident'),old);
  seen.push(plan.get('arrival').id);
  return plan.get('arrival')===second;
 }});
 assert.deepEqual(seen,[first.id,second.id]);
 assert.equal(p.get('arrival'),second);
 assert.deepEqual([...retained],[['resident',old]]);
});
test('later-arrival native hit rejection is capped and never changes the retained native plan',()=>{
 let probes=0;
 const p=assignTrailSeats({actors,seats:[old,first,second],retained,canPlace:()=>true,maxProbes:1,accept(){
  probes++;return false;
 }});
 assert.equal(probes,1);assert.equal(p,null);
 assert.deepEqual([...retained],[['resident',old]]);
});
