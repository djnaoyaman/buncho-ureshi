import assert from 'node:assert/strict';
import {createWorld,createBird,renameBird,validateWorld,serializeWorld,parseSave,TICK_MS} from '../../src/engine.js';
import {accidentLifeBird} from '../../src/life-care.js';

export const NOW=Date.UTC(2026,10,8),LONG_NAME='あいうえおかきくけこさしすせそた';
export const IMPORTANT=new Set(['pair','egg','hatch','grow','adopt','movein','depart','death','succession']);
export const CARD=new Set(['egg','hatch','grow','pair']);
export const detailSelector=(scope,id)=>`[data-game-details="diary-${scope}-${id}"]`;
export const summarySelector=(scope,id)=>`${detailSelector(scope,id)} > summary`;
export const FULL='[data-game-details="full-diary"]';
export function validated(world){
  validateWorld(world);const restored=parseSave(serializeWorld(world));assert.deepEqual(restored,world);
  assert.equal(world.version,15);assert.equal(world.encounters.version,13);assert.equal(world.encounters.gardenFriends.version,2);
  return restored;
}
/** Synthetic event history with real engine birds, lifecycle, naming and strict save validation.
 * Dates are derived from the engine epoch/tick relation, never a design prototype. */
export function diaryFixture(kind='mixed'){
  const now=kind==='historical'?Date.UTC(2025,1,3):NOW;
  const w=createWorld(now,418);w.paused=true;w.settings.motion=false;w.settings.careSound=false;
  if(kind==='manual-omochi')renameBird(w,'b1','おもち');
  const mother=w.birds[0];mother.sex='female';
  const father=createBird(w,{sex:'male',home:'visitor'});
  const child=createBird(w,{parents:[mother.id,father.id],generation:1,home:'resident'});
  const long=createBird(w,{name:LONG_NAME,home:'resident',color:'silver'});
  const twin=createBird(w,{name:LONG_NAME,home:'departed',color:'cinnamon'});
  const chick=createBird(w,{name:'ひな<&>',stage:'chick',home:'resident'});
  const egg=createBird(w,{name:'卵の記録',stage:'egg',home:'resident'});
  const juvenile=createBird(w,{name:'LongLatinName123',stage:'juvenile',home:'visitor'});
  if(kind==='deceased')accidentLifeBird(w,long.id,now);
  const history=[
    ['pair',[mother.id,father.id],{}],['egg',[child.id,mother.id,father.id],{}],
    ['hatch',[child.id,mother.id,father.id],{stage:'chick'}],
    ['grow',[child.id,mother.id,father.id],{stage:'juvenile'}],
    ['grow',[child.id,mother.id,father.id],{stage:'adult'}],
    ['adopt',[long.id],{}],['depart',[twin.id],{}],['movein',[juvenile.id],{}],
    ['hatch',[chick.id],{stage:'chick'}],['adopt',[egg.id],{}],['welcome',[mother.id],{}],['adopt',[long.id],{}],
  ];
  const count=kind==='empty'?1:240;w.tick=239;w.epoch=now-w.tick*TICK_MS;
  const empty=kind==='empty';
  w.events=Array.from({length:count},(_,i)=>{const [kind,ids,data]=history[empty?10:i%history.length];return {id:`e${i+1}`,kind,ids:[...ids],data:{...data},tick:i,at:w.epoch+i*TICK_MS,condition:`条件${i+1}：庭での記録`,result:`結果${i+1}：名前とできごとを保存`};});
  w.journal=[];w.nextEvent=count+1;
  return validated(w);
}
export function expectedDiary(w){const all=[...new Map([...(w.journal||[]),...w.events].map(e=>[e.id,e])).values()].sort((a,b)=>b.tick-a.tick||Number(b.id.slice(1))-Number(a.id.slice(1)));return {all,important:all.filter(e=>IMPORTANT.has(e.kind)).slice(0,12)};}
