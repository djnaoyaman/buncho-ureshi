import {GARDEN_IDS} from './data/gardens.js';
import {GARDEN_REGULARS} from './garden-friends.js';
import {crowScene} from './garden-crows.js';

/** Three finite discoveries, not a repeatable currency grind. */
export const EXPEDITION_ENABLED=true;
export const EXPEDITION_PATHS=Object.freeze(['brook','grove','flower']);
export const EXPEDITION_REWARDS=Object.freeze({gold:2,affinity:1});
export const initialExpedition=()=>({version:1,entries:[]});
export const expeditionToken=w=>({worldId:w.worldId,revision:w.revision});
const current=(w,t)=>t?.worldId===w.worldId&&t.revision===w.revision;
const bump=w=>{w.revision=w.revision===Number.MAX_SAFE_INTEGER?0:w.revision+1;};
const definition=id=>GARDEN_REGULARS.find(r=>r.id===id);
const int=(n,min=0,max=Number.MAX_SAFE_INTEGER)=>Number.isSafeInteger(n)&&n>=min&&n<=max;
const shape=(v,keys)=>v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).length===keys.length&&keys.every(k=>Object.hasOwn(v,k));
const known=w=>w.encounters.gardenFriends.regulars.filter(r=>r.lastInteractionTick!==null&&definition(r.id));
const safe=w=>EXPEDITION_ENABLED&&w.encounters.garden.open&&!w.paused&&!w.encounters.active&&!w.encounters.raptor.active&&!crowScene(w)?.retreat;
const discoveryFor=(path,ids)=>`${path}-${ids.map(id=>definition(id).favorite).sort().join('-')}`;
const leafFor=(w,ids)=>{const e=w.leafEvent?.entry;return e&&e.completedTick!==null&&ids.some(id=>id===e.sourceId||id===e.recipientId)?e.choice:null;};
export function validateExpedition(w){
 const s=w.expedition,fail=()=>{throw Error('ちいさな探検の記録が不正です。');};
 if(!shape(s,['version','entries'])||s.version!==1||!Array.isArray(s.entries)||s.entries.length>3)fail();
 const paths=new Set();let lastTick=0,active=false;
 for(const e of s.entries){
  if(!shape(e,['id','path','gardenId','actorIds','startedTick','completedTick','discovery','leafMemory','goldAward',...(Object.hasOwn(e,'approach')?['approach']:[])])||!EXPEDITION_PATHS.includes(e.path)||e.id!==`expedition-${e.path}`||paths.has(e.path)||!GARDEN_IDS.includes(e.gardenId)||!Array.isArray(e.actorIds)||e.actorIds.length!==2||new Set(e.actorIds).size!==2||e.actorIds.some(id=>!definition(id))||!int(e.startedTick,lastTick,w.tick)||active||e.discovery!==discoveryFor(e.path,e.actorIds)||![null,'deliver','display'].includes(e.leafMemory)||!int(e.goldAward,0,EXPEDITION_REWARDS.gold))fail();
  if(Object.hasOwn(e,'approach')&&![null,'listen','look'].includes(e.approach))fail();
  if(e.completedTick!==null&&e.approach===null)fail();
  if(e.leafMemory!==null&&e.leafMemory!==leafFor(w,e.actorIds))fail();
  if(e.completedTick===null){if(e.goldAward!==0)fail();active=true;lastTick=e.startedTick;}
  else {if(!int(e.completedTick,e.startedTick,w.tick))fail();lastTick=e.completedTick;}
  paths.add(e.path);
 }
 return s;
}
export function expeditionStatus(w){
 const entries=w.expedition?.entries||[],entry=entries.find(e=>e.completedTick===null)||entries.at(-1)||null;
 const remaining=EXPEDITION_PATHS.filter(path=>!entries.some(e=>e.path===path));
 const friends=known(w),allowed=safe(w);
 return {phase:entries.some(e=>e.completedTick===null)?'active':!remaining.length?'complete':allowed&&friends.length>=2?'available':'unavailable',entry,known:friends,remaining,safe:allowed};
}
export function startExpedition(w,path,actorIds,token){
 if(!current(w,token))return {changed:false,reason:'stale'};
 const s=expeditionStatus(w);
 if(s.phase!=='available'||!s.remaining.includes(path))return {changed:false,reason:'unavailable'};
 if(!Array.isArray(actorIds)||actorIds.length!==2||new Set(actorIds).size!==2||actorIds.some(id=>!s.known.some(r=>r.id===id)))return {changed:false,reason:'friends'};
 const ids=[...actorIds];
 w.expedition.entries.push({id:`expedition-${path}`,path,gardenId:w.encounters.garden.id,actorIds:ids,startedTick:w.tick,completedTick:null,discovery:discoveryFor(path,ids),leafMemory:leafFor(w,ids),goldAward:0,approach:null});
 bump(w);return {changed:true};
}
export function chooseExpedition(w,choice,token){
 if(!current(w,token))return {changed:false,reason:'stale'};
 const s=expeditionStatus(w),e=s.entry;
 if(s.phase!=='active'||!s.safe||e.gardenId!==w.encounters.garden.id||e.approach!==null||!['listen','look'].includes(choice))return {changed:false,reason:'unavailable'};
 e.approach=choice;bump(w);return {changed:true};
}
export function completeExpedition(w,token){
 if(!current(w,token))return {changed:false,reason:'stale'};
 const s=expeditionStatus(w),e=s.entry;
 if(s.phase!=='active'||!s.safe||e.gardenId!==w.encounters.garden.id||e.approach===null)return {changed:false,reason:'unavailable'};
 const actors=e.actorIds.map(id=>w.encounters.gardenFriends.regulars.find(r=>r.id===id));
 if(actors.some(r=>!r||r.lastInteractionTick===null))return {changed:false,reason:'friends'};
 e.goldAward=Math.max(0,Math.min(EXPEDITION_REWARDS.gold,1000000000-w.economy.gold,1000000000-w.economy.lifetimeGold));
 w.economy.gold+=e.goldAward;w.economy.lifetimeGold+=e.goldAward;
 for(const r of actors)r.affinity=Math.min(100,r.affinity+EXPEDITION_REWARDS.affinity);
 e.completedTick=w.tick;bump(w);
 return {changed:true,goldAward:e.goldAward,affinityAward:EXPEDITION_REWARDS.affinity,discovery:e.discovery};
}
/** A projection of earned history: ordinary interactions remember the outing without a second payout. */
export function expeditionFriendRecollection(w,id,kind='chat'){
 const e=w.expedition?.entries?.findLast(e=>e.completedTick!==null&&e.actorIds.includes(id));
 if(!e)return '';
 const place={brook:'みずべの こみち',grove:'こかげの こみち',flower:'はなの こみち'}[e.path];
 const partner=definition(e.actorIds.find(actor=>actor!==id))?.name||'ともだち';
 return kind==='watch'?`${partner}と ${place}で みつけたものを おもいだし、きょうも じっと ながめているよ。`:kind==='play'?`${partner}と ${place}を たんけんしたときのように、きょうも あたらしい あそびを さがしているよ。`:`「${partner}と いった ${place}、たのしかったね。いっしょだから みつけられたんだね」`;
}
