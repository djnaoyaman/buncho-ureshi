import test from 'node:test';import assert from 'node:assert/strict';
import {createWorld,createBird,feedBird,petBird,talkToBird,cleanGarden,economyToken} from '../src/engine.js';
import {careFamily} from '../src/family-care.js';
import {homeCareResponse,homeResponsePose} from '../src/home-care-response.js';
const NOW=Date.UTC(2026,10,16);
function world(){const w=createWorld(NOW);w.birds[0].needs.food=w.birds[0].needs.energy=40;return w;}
for(const kind of ['feed','pet','talk','name','clean'])test(`${kind}: only committed output, no reward/history/RNG mutation`,()=>{
 const w=world();w.care.cleanliness=20;
 const r=kind==='feed'?feedBird(w,'b1',NOW,economyToken(w)):kind==='pet'?petBird(w,'b1',NOW,economyToken(w)):kind==='clean'?cleanGarden(w,NOW):talkToBird(w,'b1',kind==='name'?w.birds[0].name:'こんにちは',NOW,economyToken(w));
 const before=JSON.stringify(w);const response=homeCareResponse(w,r,{kind,birdId:'b1',saved:true,contact:true});assert(response);assert.equal(JSON.stringify(w),before);assert.equal(homeCareResponse(w,r,{kind,birdId:'b1',saved:false,contact:true}),null);
 if(kind!=='clean'){assert.equal(response.targets[0],'b1');assert.equal(homeResponsePose({...response,phase:'settled'},w.birds[0]),'rest');}
});
test('full pet and speech are contact, full feed and stale/empty speech are not success',()=>{
 const w=world();w.birds[0].needs.food=w.birds[0].needs.energy=100;
 const p=petBird(w,'b1',NOW,economyToken(w));assert(!p.changed);assert.equal(p.gemAward,0);assert(homeCareResponse(w,p,{saved:true}));
 assert.equal(homeCareResponse(w,feedBird(w,'b1',NOW,economyToken(w)),{saved:true}),null);
 const reply=talkToBird(w,'b1','こんにちは',NOW,economyToken(w));assert(!reply.careChanged);assert(homeCareResponse(w,reply,{kind:'talk',birdId:'b1',contact:true,saved:true}));
 assert.equal(homeCareResponse(w,{topic:'hello'},{kind:'talk',birdId:'b1',saved:true}),null);
 assert.equal(homeCareResponse(w,{reason:'stale',answer:'changed'},{kind:'talk',birdId:'b1',contact:true,saved:true}),null);
});
test('family reaction contains only successful eligible individuals',()=>{
 const w=world(),full=createBird(w,{home:'resident'});full.needs.food=100;const r=careFamily(w,'feed',economyToken(w),NOW);const before=JSON.stringify(w);
 assert.deepEqual(homeCareResponse(w,r,{kind:'feed',saved:true}).targets,['b1']);assert.equal(JSON.stringify(w),before);
 w.lifecycle.birds[0].condition={kind:'injury'};assert.equal(homeCareResponse(w,r,{kind:'feed',saved:true}),null);
});
test('drops, failed batches, unrelated actions and non-home screens never fabricate bird care',()=>{
 const w=world(),before=JSON.stringify(w);
 assert.equal(homeCareResponse(w,{changed:false},{kind:'drop',saved:true}),null);
 assert.deepEqual(homeCareResponse(w,{changed:true},{kind:'drop',saved:true}).targets,[]);
 assert.equal(homeCareResponse(w,{results:[]},{kind:'feed',saved:true}),null);
 assert.equal(homeCareResponse(w,{changed:true},{kind:'buy',saved:true}),null);
 assert.equal(JSON.stringify(w),before);
 w.field.place='garden';assert.equal(homeCareResponse(w,{changed:true,birdId:'b1'},{kind:'feed',saved:true}),null);
});
test('nests, departed birds and dead individuals cannot receive a living adult response',()=>{
 for(const variant of ['egg','chick','departed','dead']){
  const w=world(),b=w.birds[0];if(['egg','chick'].includes(variant))b.stage=variant;
  if(variant==='departed')b.home='departed';if(variant==='dead')w.lifecycle.birds[0].death={cause:'illness',at:NOW,tick:0};
  assert.equal(homeCareResponse(w,{changed:true,birdId:b.id},{kind:'feed',saved:true}),null);
 }
});
