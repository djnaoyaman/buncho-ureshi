// Deliberate active-clock deadline setup; return protection is covered separately.
const advanceTo=(w,at)=>advanceActiveClock(w,at,{present:true});
import assert from 'node:assert/strict';
import {createWorld,createBird,validateWorld,serializeWorld,parseSave,advanceTo as advanceActiveClock,economyToken,resolveAdoption,acceptIndependence,chooseFamilyProtagonist} from '../../src/engine.js';
import {lifeStatus} from '../../src/life-care.js';
export const NOW=Date.UTC(2026,10,8),LONG_NAME='あいうえおかきくけこさしすせそた';
export function validated(w){validateWorld(w);const restored=parseSave(serializeWorld(w));assert.deepEqual(restored,w);return restored;}
export function consultationFixture(kind,{pair=false,returning=false,long=false}={}){
 const w=createWorld(NOW,718);w.paused=true;w.settings.motion=false;w.settings.careSound=false;
 let bird,ids;
 if(kind==='adoption'){
  bird=createBird(w,{home:'visitor',name:long?LONG_NAME:'ひなた',color:'silver'});
  w.adoption.pending={birdId:bird.id,arrivedTick:bird.arrivedTick};ids=[bird.id];
 }else if(kind==='independence'){
  for(let i=1;i<6;i++)createBird(w,{home:'resident',name:long&&[2,3].includes(i)?LONG_NAME:`家族${i}`,sex:i%2?'male':'female',color:i===2?'silver':'cinnamon'});
  const couple=(a,b)=>{a.partner=b.id;b.partner=a.id;a.pairTick=b.pairTick=0;};couple(w.birds[0],w.birds[1]);if(pair)couple(w.birds[2],w.birds[3]);
  bird=w.birds[2];ids=pair?['b3','b4']:['b3'];
 }else{
  bird=createBird(w,{home:returning?'departed':'resident',name:long?LONG_NAME:'つむぎ',color:'silver'});
  if(returning)bird.milestones.push({kind:'adopt',otherId:null,tick:0});
  lifeStatus(w,'b1').condition={kind:'injury',sinceAt:NOW-86400000,deadlineAt:NOW};advanceTo(w,NOW);ids=[bird.id];
 }
 return {world:validated(w),kind,id:bird.id,ids};
}
export function expectedDecision(before,fixture,choice='accept'){
 const w=structuredClone(before),token={...economyToken(w),fromId:w.protagonist.birdId};
 const result=fixture.kind==='adoption'?resolveAdoption(w,fixture.id,choice,token,NOW):fixture.kind==='independence'?acceptIndependence(w,fixture.ids,token,NOW):chooseFamilyProtagonist(w,fixture.id,token,NOW);
 assert.equal(result.changed,true);return validated(w);
}
