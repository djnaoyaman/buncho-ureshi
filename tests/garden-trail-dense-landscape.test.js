import test from 'node:test';
import assert from 'node:assert/strict';
import {trailTerrainFor} from '../src/data/garden-trail-terrain.js';
import {createTrailClearance,landscapeTrailStandingSeats,surveyedBandTrailSeats} from '../src/garden-trail-clearance.js';
const box=(left,right,top,bottom)=>({left,right,top,bottom});
const clip=box(0,667,0,375),actors=Array.from({length:10},(_,i)=>({id:'bird'+i}));
const footprint={...box(-26,20.24,-50.7,20),parts:[box(-23.76,20.24,-50.7,1.3),box(-26,18,5,16)]};
function input(id,anchor,controlOverride=null){
 const height=667*1672/941,plane={left:0,top:.65*375-anchor*height,width:667,height};
 const controls=controlOverride??[box(8,659,20,108),box(12,655,305,364)];
 const surface=trailTerrainFor(id).surface,footprints=new Map(actors.map(a=>[a.id,footprint]));
 const c=createTrailClearance(id,{plane,clip,controls,footprints});
 const standingPairFits=(a,n,b,m)=>!c.placementConflicts({...a,p:n.p},{...b,p:m.p});
 const canPlace=(a,n,prior)=>c.canStand(a,n.p)&&[...prior].every(([id,b])=>id===a.id||standingPairFits(a,n,{id},b));
 return {actors,plane,clip,surface,footprints,standingPairFits,canPlace,safePoint:p=>c.canStand(actors[0],p)};
}
test('#08/#10 landscape uses the covered dry strip, not the now obscured portrait anchors',()=>{
 for(const [number,id,anchor] of [[8,'bird-red-avadavat',.73],[10,'bird-tricolored-munia',.72]]){
  const config=input(id,anchor);let probes=0;
  if(number===8)assert.equal(surveyedBandTrailSeats(number,{...config,accept:()=>true}),null);
  const result=landscapeTrailStandingSeats(number,{...config,accept(plan){probes++;return plan.size===10;}});
  assert.equal(result?.size,10,'number '+number);
  assert.equal(probes,1);
  assert.ok(actors.every(a=>config.canPlace(a,result.get(a.id),result)));
 }
});
test('landscape cards fail closed on actual control, real native, peer or orientation veto',()=>{
 const id='bird-red-avadavat',config=input(id,.73);let probes=0;
 assert.equal(landscapeTrailStandingSeats(8,{...config,maxProbes:1,accept(){probes++;return false;}}),null);
 assert.equal(probes,1);
 assert.equal(landscapeTrailStandingSeats(8,{...input(id,.73,[clip]),accept:()=>true}),null);
 assert.equal(landscapeTrailStandingSeats(8,{...config,standingPairFits:()=>false,accept:()=>true}),null);
 assert.equal(landscapeTrailStandingSeats(8,{...config,clip:box(0,375,0,667),accept:()=>true}),null);
 assert.equal(landscapeTrailStandingSeats(34,{...config,accept:()=>true}),null);
});
