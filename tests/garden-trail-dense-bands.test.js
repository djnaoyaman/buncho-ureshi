import test from 'node:test';
import assert from 'node:assert/strict';
import {trailTerrainFor} from '../src/data/garden-trail-terrain.js';
import {createTrailClearance,pitchTrailStandingSeats,surveyedBandTrailSeats} from '../src/garden-trail-clearance.js';
const box=(left,right,top,bottom)=>({left,right,top,bottom});
const footprint={...box(-26,20.24,-50.7,20),parts:[box(-23.76,20.24,-50.7,1.3),box(-26,18,5,16)]};
const plane={left:0,top:0,width:375,height:667},clip=box(0,375,0,667);
const actors=Array.from({length:10},(_,i)=>({id:'bird'+i}));
function measured(id,controls=[]){
 const surface=trailTerrainFor(id).surface,footprints=new Map(actors.map(a=>[a.id,footprint]));
 const c=createTrailClearance(id,{plane,clip,controls,footprints});
 const standingPairFits=(a,n,b,m)=>!c.placementConflicts({...a,p:n.p},{...b,p:m.p});
 const canPlace=(a,n,prior)=>c.canStand(a,n.p)&&[...prior].every(([id,b])=>id===a.id||standingPairFits(a,n,{id},b));
 return {actors,plane,clip,surface,footprints,baseWidth:44,baseHeight:52,standingPairFits,canPlace,safePoint:p=>c.canStand(actors[0],p)};
}
test('#08 and #10 exact survey bands admit ten ordered native actors, without broad graph search',()=>{
 for(const [number,id] of [[8,'bird-red-avadavat'],[10,'bird-tricolored-munia']]){
  const shape=measured(id);let probes=0;
  if(number===8)assert.equal(pitchTrailStandingSeats({...shape,accept:()=>true}),null);
  const plan=surveyedBandTrailSeats(number,{...shape,accept(full){probes++;return full.size===10;}});
  assert.equal(plan?.size,10);
  assert.equal(probes,1);
  assert.ok(actors.every(a=>shape.canPlace(a,plan.get(a.id),plan)));
  assert.deepEqual(surveyedBandTrailSeats(number,{...shape,accept:()=>true}),plan);
 }
});
test('survey bands never bypass genuine peer, native or control vetoes and are limited to the scoped gardens',()=>{
 const shape=measured('bird-tricolored-munia');let probes=0;
 assert.equal(surveyedBandTrailSeats(10,{...shape,accept(){probes++;return false;},maxProbes:1}),null);
 assert.equal(probes,1);
 assert.equal(surveyedBandTrailSeats(10,{...shape,canPlace:()=>false,accept:()=>true}),null);
 assert.equal(surveyedBandTrailSeats(10,{...shape,standingPairFits:()=>false,accept:()=>true}),null);
 assert.equal(surveyedBandTrailSeats(10,{...measured('bird-tricolored-munia',[clip]),accept:()=>true}),null);
 assert.equal(surveyedBandTrailSeats(34,{...shape,accept:()=>true}),null);
});
