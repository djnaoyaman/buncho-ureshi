import assert from 'node:assert/strict';
import {test} from 'node:test';
import {measuredNativeFoot,packTrailStandingSeats} from '../src/garden-trail-clearance.js';
const plane={left:-18,top:-182,width:390,height:1000};
const button={left:51,top:393,width:44,height:52};
test('the existing compact native footprint projects to the same painted foot, not logical grid',()=>{
 const p=measuredNativeFoot(plane,button,()=>true);
 assert.ok(Math.abs(p[0]-(51+44*.54+18)/390)<1e-9);
 assert.ok(Math.abs(p[1]-(393+52*.975+182)/1000)<1e-9);
});
test('a real painted button is not admitted when its projected foot is unsafe or too small',()=>{
 assert.equal(measuredNativeFoot(plane,button,p=>p[1]<.55),null);
 assert.equal(measuredNativeFoot(plane,{...button,width:43},()=>true),null);
 assert.equal(measuredNativeFoot({...plane,width:0},button,()=>true),null);
});
test('preferred measured contacts still yield to peer or full native hit proof',()=>{
 const p=measuredNativeFoot(plane,button,()=>true),raw={id:'native',p};
 const allowed={id:'clear',p:[.6,.7]},take={id:'free',p:[.63,.8]};
 const actors=[{id:'bird'},{id:'visitor'}];
 const plan=packTrailStandingSeats({actors,seats:[raw,allowed,take],preferred:new Map([['bird',raw]]),
  canPlace(a,s,partial){return ![...partial.values()].includes(s)&&(a.id!=='visitor'||s===take);},
  accept(full){return full.get('bird')===allowed&&full.get('visitor')===take;}
 });
 assert.equal(plan.get('bird'),allowed);
 assert.equal(plan.get('visitor'),take);
});
