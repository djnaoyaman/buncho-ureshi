import {GARDEN_IDS,gardenFriendRoster} from './data/gardens.js';
import {GARDEN_REGULARS} from './garden-friends.js';
import {crowScene} from './garden-crows.js';

/** Release 1 is a single, persistent story, not a repeatable currency job. */
export const LEAF_EVENT_ENABLED=true;
export const LEAF_REWARDS=Object.freeze({gold:3,affinity:2});
export const initialLeafEvent=()=>({version:1,entry:null});
const shape=(v,keys)=>v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).length===keys.length&&keys.every(k=>Object.hasOwn(v,k));
const int=(n,min=0,max=Number.MAX_SAFE_INTEGER)=>Number.isSafeInteger(n)&&n>=min&&n<=max;
const bump=w=>{w.revision=w.revision===Number.MAX_SAFE_INTEGER?0:w.revision+1;};
const definition=id=>GARDEN_REGULARS.find(r=>r.id===id);
const actor=r=>r?{...r,color:r.appearance.color}:null;
export const leafEventToken=w=>({worldId:w.worldId,revision:w.revision});
const current=(w,t)=>t?.worldId===w.worldId&&t.revision===w.revision;
const safe=w=>LEAF_EVENT_ENABLED&&!w.paused&&!w.encounters.raptor.active&&!w.encounters.active&&!crowScene(w)?.retreat;
const visit=(w,id)=>w.encounters.garden.visits[id]||0;
export function validateLeafEvent(w){
 const s=w.leafEvent,fail=()=>{throw Error('落ち葉のおくりものの記録が不正です。');};
 if(!shape(s,['version','entry'])||s.version!==1)fail();
 const e=s.entry;if(e===null)return s;
 if(!shape(e,['id','gardenId','sourceId','recipientId','branch','choice','startedTick','choiceTick','completedTick','visit','displayed','goldAward','diary'])||e.id!=='leaf-gift-1'||!GARDEN_IDS.includes(e.gardenId)||!definition(e.sourceId)||definition(e.sourceId).favorite!=='watch'||!definition(e.recipientId)||e.sourceId===e.recipientId||e.branch!==definition(e.recipientId).favorite||!['chat','watch','play'].includes(e.branch)||![null,'deliver','display'].includes(e.choice)||!int(e.startedTick,0,w.tick)||!int(e.visit,0,visit(w,e.gardenId))||typeof e.displayed!=='boolean'||!int(e.goldAward,0,LEAF_REWARDS.gold)||!Array.isArray(e.diary)||e.diary.length>3)fail();
 if(e.choice===null){if(e.choiceTick!==null||e.completedTick!==null||e.displayed||e.goldAward!==0||e.diary.length!==1)fail();}
 else if(!int(e.choiceTick,e.startedTick,w.tick))fail();
 if(e.completedTick!==null){if(!e.choice||!int(e.completedTick,e.choiceTick,w.tick)||e.diary.length!==3)fail();}
 else if(e.choice&&(e.diary.length!==2||e.displayed||e.goldAward!==0))fail();
 const kinds=['found',e.choice,'thanks'];
 for(let i=0;i<e.diary.length;i++){const d=e.diary[i];if(!shape(d,['kind','tick'])||d.kind!==kinds[i]||d.tick!==[e.startedTick,e.choiceTick,e.completedTick][i])fail();}
 return s;
}
export function leafEventStatus(w){
 const e=w.leafEvent?.entry||null;
 if(e){
  const phase=e.completedTick!==null?'complete':e.choice===null?'choice':w.encounters.garden.open&&w.encounters.garden.id===e.gardenId&&visit(w,e.gardenId)>e.visit?'ready':'waiting';
  return {phase,entry:e,source:actor(definition(e.sourceId)),recipient:actor(definition(e.recipientId)),available:false,ready:phase==='ready',safe:safe(w)};
 }
 const g=w.encounters.garden;
 const present=g.open?gardenFriendRoster(w,g.id).map(r=>definition(r.friendId)).filter(Boolean):[];
 // The quiet observer finds it. Do not invent a bird or change the existing roster.
 const source=present.find(r=>r.favorite==='watch');
 const recipient=present.find(r=>r.id!==source?.id);
 const available=!!source&&!!recipient&&safe(w);
 return {phase:available?'available':'unavailable',entry:null,source:actor(source),recipient:actor(recipient),available,ready:false,safe:safe(w)};
}
export function startLeafEvent(w,token){
 if(!current(w,token))return {changed:false,reason:'stale'};
 const s=leafEventStatus(w);if(!s.available)return {changed:false,reason:'unavailable'};
 w.leafEvent.entry={id:'leaf-gift-1',gardenId:w.encounters.garden.id,sourceId:s.source.id,recipientId:s.recipient.id,branch:s.recipient.favorite,choice:null,startedTick:w.tick,choiceTick:null,completedTick:null,visit:visit(w,w.encounters.garden.id),displayed:false,goldAward:0,diary:[{kind:'found',tick:w.tick}]};
 bump(w);return {changed:true};
}
export function chooseLeafEvent(w,choice,token){
 if(!current(w,token))return {changed:false,reason:'stale'};
 const e=w.leafEvent.entry;
 if(!e||e.choice||!safe(w)||!w.encounters.garden.open||w.encounters.garden.id!==e.gardenId)return {changed:false,reason:'unavailable'};
 if(choice==='later')return {changed:false,reason:'later'};
 if(!['deliver','display'].includes(choice))return {changed:false,reason:'choice'};
 e.choice=choice;e.choiceTick=w.tick;e.visit=visit(w,e.gardenId);e.diary.push({kind:choice,tick:w.tick});bump(w);return {changed:true};
}
export function completeLeafEvent(w,token){
 if(!current(w,token))return {changed:false,reason:'stale'};
 const s=leafEventStatus(w);if(!s.ready||!safe(w))return {changed:false,reason:'unavailable'};
 const e=s.entry;
 // Exact regular IDs only. Never apply these points to household/wild-bird schemas.
 for(const id of [e.sourceId,e.recipientId]){const r=w.encounters.gardenFriends.regulars.find(r=>r.id===id);if(r)r.affinity=Math.min(100,r.affinity+LEAF_REWARDS.affinity);}
 e.goldAward=Math.max(0,Math.min(LEAF_REWARDS.gold,1000000000-w.economy.gold,1000000000-w.economy.lifetimeGold));
 w.economy.gold+=e.goldAward;w.economy.lifetimeGold+=e.goldAward;e.completedTick=w.tick;e.displayed=true;e.diary.push({kind:'thanks',tick:w.tick});bump(w);
 return {changed:true,goldAward:e.goldAward,affinityAward:LEAF_REWARDS.affinity};
}
export function setLeafKeepsakeDisplay(w,displayed,token){
 if(!current(w,token))return {changed:false,reason:'stale'};
 const e=w.leafEvent.entry;if(!LEAF_EVENT_ENABLED||!e||e.completedTick===null||typeof displayed!=='boolean'||e.displayed===displayed)return {changed:false,reason:'unavailable'};
 e.displayed=displayed;bump(w);return {changed:true};
}
