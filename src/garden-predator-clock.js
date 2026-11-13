import {CROW_SPECIES} from './garden-crows.js';
import {RAPTOR_SPECIES} from './garden-raptors.js';

// One recurring foreground lottery for both families, owned by the game host rather
// than the replaceable garden panel. This state never changes a saved world.
export const PREDATOR_ENTRY_RULES=Object.freeze({dwellMs:3000,chance:.25,crowWeight:5,raptorWeight:5,retryMs:120000,maxSampleGapMs:2500});
export function createGardenPredatorClock({random=Math.random}={}){
 let key=null,last=null,elapsed=0,lastDraw=null;
 const reset=()=>{key=null;last=null;elapsed=0;};
 const prime=({key:nextKey,now,eligible})=>{
  if(!eligible||!Number.isFinite(now)){reset();return;}
  if(nextKey!==key||last===null){reset();key=nextKey;last=now;}
 };
 return {reset,prime,get elapsed(){return elapsed;},sample({key:nextKey,now,eligible,available=true,crowAvailable=true,raptorAvailable=true,gardenId}){
  if(!eligible||!Number.isFinite(now)){reset();return null;}
  if(nextKey!==key||last===null){prime({key:nextKey,now,eligible});return null;}
  const delta=now-last;last=now;
  if(delta<0||delta>PREDATOR_ENTRY_RULES.maxSampleGapMs){reset();prime({key:nextKey,now,eligible});return null;}
  elapsed+=delta;
  if(elapsed<PREDATOR_ENTRY_RULES.dwellMs||!available||(!crowAvailable&&!raptorAvailable))return null;
  // Navigation and panel replacement may reset dwell, never this shared limit.
  if(lastDraw!==null&&now-lastDraw<PREDATOR_ENTRY_RULES.retryMs)return null;
  lastDraw=now;
  if(random()>=PREDATOR_ENTRY_RULES.chance)return null;
  const kind=crowAvailable&&(!raptorAvailable||random()<PREDATOR_ENTRY_RULES.crowWeight/(PREDATOR_ENTRY_RULES.crowWeight+PREDATOR_ENTRY_RULES.raptorWeight))?'crow':'raptor';
  const pool=kind==='crow'?CROW_SPECIES:RAPTOR_SPECIES.filter(s=>!s.waterOnly||gardenId==='mizukagami');
  const index=Math.min(pool.length-1,Math.max(0,Math.floor(random()*pool.length)));
  return {kind,id:pool[index].id};
 }};
}
