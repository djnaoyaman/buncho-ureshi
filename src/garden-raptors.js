import {crowScene} from './garden-crows.js';
import {RAPTOR_SPECIES} from './data/raptor-species.js';
import {getProtagonistBird} from './protagonist.js';
import {isAlive} from './life-care.js';
export {RAPTOR_SPECIES};
export const RAPTOR_RULES=Object.freeze({earlyMs:1000,earlyChance:.01,earlyCooldownMs:120000,dwellMs:120000,checkMs:60000,chance:.01,warningMs:60000,dailyCooldownMs:86400000,friendPoints:100,maxSampleGapMs:2500,visitMs:18000,maxPetPoints:1000000});
const MAX_TIME=253402268399999;
const int=(n,min=0,max=Number.MAX_SAFE_INTEGER)=>Number.isSafeInteger(n)&&n>=min&&n<=max;
const shape=(v,keys)=>v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).length===keys.length&&keys.every(k=>Object.hasOwn(v,k));
const bump=w=>{w.revision=w.revision===Number.MAX_SAFE_INTEGER?0:w.revision+1;};
const current=(w,t)=>t&&t.worldId===w.worldId&&t.revision===w.revision;
export const raptorSpecies=id=>RAPTOR_SPECIES.find(s=>s.id===id)||null;
export const initialRaptorState=()=>({lastArrivalAt:null,active:null,visits:[]});
export function raptorTarget(w){const b=getProtagonistBird(w);return b&&b.home==='resident'&&['juvenile','adult'].includes(b.stage)&&isAlive(w,b)?b:null;}
export function raptorFriendship(w,id){const v=w.encounters?.raptor?.visits.find(v=>v.id===id),points=v?.petPoints||0;return {discovered:!!v,points,friendly:!!v&&points>=RAPTOR_RULES.friendPoints};}
export function raptorCoolingDown(w,now=Date.now()){const at=w.encounters?.raptor?.lastArrivalAt;return at!=null&&now-at<RAPTOR_RULES.dailyCooldownMs;}
export function raptorToken(w){const a=w.encounters?.raptor?.active;return {worldId:w.worldId,revision:w.revision,eventId:a?.eventId??null,remainingMs:a?.remainingMs??null,lastProgressAt:a?.lastProgressAt??null};}
const activeCurrent=(w,t)=>{const a=w.encounters?.raptor?.active;return current(w,t)&&a&&t.eventId===a.eventId&&t.remainingMs===a.remainingMs&&t.lastProgressAt===a.lastProgressAt;};
export function validateRaptorState(s,tick,gardenIds){
 const fail=()=>{throw new Error('猛禽との出会いの記録が不正です。');};
 if(!shape(s,['lastArrivalAt','active','visits'])||!Array.isArray(s.visits)||s.visits.length>RAPTOR_SPECIES.length||new Set(s.visits.map(v=>v?.id)).size!==s.visits.length)fail();
 if(s.lastArrivalAt===null){if(s.active!==null||s.visits.length)fail();}else if(!int(s.lastArrivalAt,0,MAX_TIME)||!s.visits.length)fail();
 for(const v of s.visits)if(!shape(v,['id','firstTick','lastTick','count','petPoints'])||!raptorSpecies(v.id)||!int(v.firstTick,0,tick)||!int(v.lastTick,v.firstTick,tick)||!int(v.count,1,1000000)||!int(v.petPoints,0,RAPTOR_RULES.maxPetPoints))fail();
 const a=s.active;if(a!==null){const species=raptorSpecies(a.speciesId),visit=s.visits.find(v=>v.id===a.speciesId);
  if(!shape(a,['eventId','speciesId','gardenId','targetBirdId','hostile','remainingMs','lastProgressAt'])||!species||!visit||!gardenIds.includes(a.gardenId)||!/^b[1-9][0-9]*$/.test(a.targetBirdId)||a.eventId!==`${a.speciesId}:${s.lastArrivalAt}:${a.targetBirdId}`||typeof a.hostile!=='boolean'||!int(a.remainingMs,1,a.hostile?RAPTOR_RULES.warningMs:RAPTOR_RULES.visitMs)||!int(a.lastProgressAt,s.lastArrivalAt,MAX_TIME)||(species.waterOnly&&a.gardenId!=='mizukagami')||(a.hostile!==(!species.harmless&&visit.petPoints<RAPTOR_RULES.friendPoints)))fail();
 }
 return s;
}
/** Every mutation must run inside the host's atomic fresh-state transaction. */
export function arriveGardenRaptor(w,id,now,expected){
 const s=w.encounters?.raptor,g=w.encounters?.garden,b=raptorTarget(w),species=raptorSpecies(id);
 if(!current(w,expected)||expected.gardenId!==g?.id)return {changed:false,reason:'stale'};
 if(!s||!g.open||w.paused||!b||!species||!int(now,0,MAX_TIME)||(species.waterOnly&&g.id!=='mizukagami'))return {changed:false,reason:'inactive'};
 if(crowScene(w,now))return {changed:false,reason:'busy'};
 if(s.active||raptorCoolingDown(w,now))return {changed:false,reason:'cooldown'};
 const hostile=!species.harmless&&!raptorFriendship(w,id).friendly;
 s.lastArrivalAt=now;s.active={eventId:`${id}:${now}:${b.id}`,speciesId:id,gardenId:g.id,targetBirdId:b.id,hostile,remainingMs:hostile?RAPTOR_RULES.warningMs:RAPTOR_RULES.visitMs,lastProgressAt:now};
 const v=s.visits.find(v=>v.id===id);if(v){v.lastTick=w.tick;v.count=Math.min(1000000,v.count+1);}else s.visits.push({id,firstTick:w.tick,lastTick:w.tick,count:1,petPoints:0});
 bump(w);return {changed:true,id,hostile,message:hostile?`${species.name}が近づいています。1分以内におうちへ帰ってね。`:`${species.name}が遊びに来たよ。安心して眺められるよ。`};
}
export function raptorScene(w){const a=w.encounters?.raptor?.active;if(!a||raptorTarget(w)?.id!==a.targetBirdId||(!a.hostile&&a.gardenId!==w.encounters.garden.id))return null;return {...a,species:raptorSpecies(a.speciesId),phase:a.hostile?'warning':'visiting'};}
export function escapeGardenRaptor(w,expected){
 if(!activeCurrent(w,expected))return {changed:false,reason:'stale'};
 w.encounters.raptor.active=null;w.encounters.garden.open=false;w.field={place:'home',hostId:null,enteredTick:w.tick};bump(w);return {changed:true,escaped:true,message:'おうちに帰って、安全に過ごせるよ。'};
}
export function petGardenRaptor(w,id,amount,expected){
 if(!current(w,expected))return {changed:false,reason:'stale'};
 const s=w.encounters?.raptor,v=s?.visits.find(v=>v.id===id);if(!raptorSpecies(id)||!v||!int(amount,1,8))return {changed:false,reason:'locked'};
 const gain=Math.min(amount,RAPTOR_RULES.maxPetPoints-v.petPoints);if(!gain)return {changed:false,reason:'full'};
 v.petPoints+=gain;const friendly=v.petPoints>=RAPTOR_RULES.friendPoints;
 if(friendly&&s.active?.speciesId===id){s.active.hostile=false;s.active.remainingMs=Math.min(s.active.remainingMs,RAPTOR_RULES.visitMs);}
 bump(w);return {changed:true,points:v.petPoints,friendly,message:friendly?'なかよしになったよ。もう文鳥を襲わないよ。':`親しみ +${gain} ♪`};
}
/** Internal state step. Engine wrapper resolves accident and succession in the same transaction.
 * elapsed is a continuous visible sample, not wall-clock catch-up. The wall interval
 * intersection prevents overlapping samples from two tabs from counting twice. */
export function advanceRaptorState(w,elapsed,now,expected){
 if(!activeCurrent(w,expected))return {changed:false,reason:'stale'};
 const s=w.encounters.raptor,a=s.active;
 if(raptorTarget(w)?.id!==a.targetBirdId){s.active=null;bump(w);return {changed:true,ended:true};}
 if(w.paused||!int(elapsed,1,RAPTOR_RULES.maxSampleGapMs)||!int(now,0,MAX_TIME)||now<=a.lastProgressAt)return {changed:false,reason:'inactive'};
 const used=Math.min(elapsed,now-a.lastProgressAt);a.lastProgressAt=now;a.remainingMs=Math.max(0,a.remainingMs-used);
 const due=a.remainingMs===0,deathBirdId=due&&a.hostile?a.targetBirdId:null;
 if(due)s.active=null;bump(w);return {changed:true,remainingMs:a.remainingMs,ended:due,deathBirdId};
}
export function createGardenRaptorClock({random=Math.random,earlyVisit=true}={}){
 let lastEarlyCheck=null,earlyPending=earlyVisit;
 let key=null,last=null,elapsed=0,next=RAPTOR_RULES.dwellMs,fired=false;
 const reset=()=>{earlyPending=earlyVisit;key=null;last=null;elapsed=0;next=RAPTOR_RULES.dwellMs;fired=false;};
 return {reset,get elapsed(){return elapsed;},sample({key:nextKey,now,eligible,available=true,gardenId}){
  if(!eligible||!Number.isFinite(now)){reset();return null;}
  if(key!==nextKey||last===null){reset();key=nextKey;last=now;return null;}
  const delta=now-last;last=now;if(delta<0||delta>RAPTOR_RULES.maxSampleGapMs){reset();key=nextKey;last=now;return null;}
  elapsed+=delta;if(fired)return null;if(!available){next=Math.max(next,elapsed+RAPTOR_RULES.checkMs);return null;}
  const early=earlyPending&&elapsed>=RAPTOR_RULES.earlyMs;
  if(early){
   earlyPending=false;
   if(lastEarlyCheck!==null&&now-lastEarlyCheck<RAPTOR_RULES.earlyCooldownMs)return null;
   lastEarlyCheck=now;
  }else if(elapsed<next)return null;
  if(!early)next=elapsed+RAPTOR_RULES.checkMs;
  if(random()>=(early?RAPTOR_RULES.earlyChance:RAPTOR_RULES.chance))return null;
  const pool=RAPTOR_SPECIES.filter(s=>!s.waterOnly||gardenId==='mizukagami');if(!pool.length)return null;
  const index=Math.min(pool.length-1,Math.max(0,Math.floor(random()*pool.length)));fired=true;return {kind:'arrive',id:pool[index].id};
 }};
}
