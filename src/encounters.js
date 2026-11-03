import {initialGardenFriends,validateGardenFriends,rememberGardenAcquaintances,setGardenCompanions,bondGardenFriend} from './garden-friends.js';
/** Pure encounter state. Other species never enter Java Sparrow birds[] or consume its PRNG. */
import {GARDEN_IDS,gardenById,gardenFriendRoster} from './data/gardens.js';
import { ENCOUNTER_CATALOG, ENCOUNTER_CANDIDATES } from './data/encounter-catalog.js';
export const ENCOUNTER_LIMITS=Object.freeze({catalog:160,queue:1,activity:1000000,visits:1000000});
const ACTIVITIES=['park','talk','decorate','friend','read','garden'];
export const GARDEN_SCENES=Object.freeze(['grass','water','branch','song','quiet']);
export function initialGardenState(){return {open:false,id:'komorebi',scene:'quiet',turn:0,nextTurn:1,nextTick:0,lastGuest:null,guestGardenId:null,visits:Object.fromEntries(GARDEN_IDS.map(id=>[id,0])),moments:[]};}
const own=(x,k)=>Object.prototype.hasOwnProperty.call(x,k);
const shape=(x,keys)=>x&&typeof x==='object'&&!Array.isArray(x)&&Object.keys(x).length===keys.length&&keys.every(k=>own(x,k));
const integer=(x,min=0,max=Number.MAX_SAFE_INTEGER)=>Number.isSafeInteger(x)&&x>=min&&x<=max;
const bump=w=>{w.revision=w.revision===Number.MAX_SAFE_INTEGER?0:w.revision+1;};
export function initialEncounterState(){return {version:4,gardenFriends:initialGardenFriends(),garden:initialGardenState(),nextId:1,cursor:0,activities:Object.fromEntries(ACTIVITIES.map(k=>[k,0])),queue:[],active:null,discoveries:[]};}
export function createEncounterSystem(catalog=ENCOUNTER_CATALOG,{knownCatalog=catalog}={}){
  if(!Array.isArray(catalog)||catalog.length>ENCOUNTER_LIMITS.catalog)throw new Error('出会いの図鑑が不正です。');
  const byId=new Map();
  for(const entry of catalog){
    if(!/^[a-z][a-z0-9-]{1,63}$/.test(entry.id)||byId.has(entry.id)||!integer(entry.scriptVersion,1,1000)||!Array.isArray(entry.steps)||entry.steps.length<1||entry.steps.length>6||entry.steps.some(s=>!s||!/^[-a-z]{1,30}$/.test(s.action))||new Set(entry.steps.map(s=>s.action)).size!==entry.steps.length)throw new Error('出会いの図鑑が不正です。');
    byId.set(entry.id,entry);
  }
  const knownById=new Map(knownCatalog.map(e=>[e.id,e]));
  const guard=(w,expected)=>expected&&expected.worldId===w.worldId&&expected.revision===w.revision;
  const stale=()=>({changed:false,reason:'stale',message:'庭が変わったよ。もう一度ひらいてね。'});
  function validate(state,tick){
    const fail=()=>{throw new Error('出会いの記録が不正です。');};
    if(!integer(tick)||!shape(state,['version','gardenFriends','garden','nextId','cursor','activities','queue','active','discoveries'])||state.version!==4||!integer(state.nextId,1)||!integer(state.cursor,0,ENCOUNTER_LIMITS.catalog)||!shape(state.activities,ACTIVITIES)||ACTIVITIES.some(k=>!integer(state.activities[k],0,ENCOUNTER_LIMITS.activity))||!Array.isArray(state.queue)||state.queue.length>1||new Set(state.queue).size!==state.queue.length||state.queue.some(id=>!knownById.has(id))||!Array.isArray(state.discoveries)||state.discoveries.length>knownCatalog.length)fail();
    validateGardenFriends(state.gardenFriends,tick);
    const g=state.garden;if(!shape(g,['open','id','scene','turn','nextTurn','nextTick','lastGuest','guestGardenId','visits','moments'])||!(g.guestGardenId===null||GARDEN_IDS.includes(g.guestGardenId))||((state.queue.length||state.active)&&g.guestGardenId===null)||typeof g.open!=='boolean'||!GARDEN_IDS.includes(g.id)||!shape(g.visits,GARDEN_IDS)||GARDEN_IDS.some(id=>!integer(g.visits[id],0,ENCOUNTER_LIMITS.visits))||!Array.isArray(g.moments)||g.moments.length>64||g.moments.some(m=>!shape(m,['gardenId','birdId','kind','tick'])||!GARDEN_IDS.includes(m.gardenId)||!/^b[1-9][0-9]*$/.test(m.birdId)||!['chat','watch','play'].includes(m.kind)||!integer(m.tick,0,tick))||!GARDEN_SCENES.includes(g.scene)||!integer(g.turn,0,ENCOUNTER_LIMITS.activity)||!integer(g.nextTurn,1,ENCOUNTER_LIMITS.activity)||!integer(g.nextTick)||!(g.lastGuest===null||knownById.has(g.lastGuest))||(state.active&&state.queue.length))fail();
    const seen=new Set(), instances=new Set();
    for(const d of state.discoveries){if(!shape(d,['id','firstTick','lastTick','visits','instanceId'])||!knownById.has(d.id)||seen.has(d.id)||instances.has(d.instanceId)||!integer(d.firstTick,0,tick)||!integer(d.lastTick,d.firstTick,tick)||!integer(d.visits,1,ENCOUNTER_LIMITS.visits)||!integer(d.instanceId,1,state.nextId-1))fail();seen.add(d.id);instances.add(d.instanceId);}
    // Returning acquaintances are permitted, but only one invitation can exist.
    if(state.active!==null){const a=state.active,e=knownById.get(a.id);if(!shape(a,['id','instanceId','scriptVersion','step','createdTick'])||!e||!integer(a.instanceId,1,state.nextId-1)||instances.has(a.instanceId)||a.scriptVersion!==e.scriptVersion||!integer(a.step,0,e.steps.length-1)||!integer(a.createdTick,0,tick)||state.queue.includes(a.id))fail();}
    return state;
  }
  function fillQueue(w){
    const s=w.encounters,g=s.garden;
    if(!g.open||!catalog.length||s.active||s.queue.length||g.turn<g.nextTurn||w.tick<g.nextTick)return;
    const eligible=catalog.filter(e=>(e.gardenEvent?.gardenIds||[]).includes(g.id)&&(e.gardenEvent?.scene||'grass')===g.scene);
    // Unmet guests first; one stable returning acquaintance only once all in this scene are known.
    const unseen=eligible.filter(e=>!s.discoveries.some(d=>d.id===e.id));
    const pool=unseen.length?unseen:eligible.filter(e=>e.id!==g.lastGuest);
    const entry=pool[0]||(!unseen.length?eligible[0]:null);
    if(entry){s.queue.push(entry.id);g.guestGardenId=g.id;}
  }
  function enterGarden(w,expected){
    if(!guard(w,expected))return stale();validate(w.encounters,w.tick);
    if(w.encounters.garden.open)return {changed:false,resumed:true};
    rememberGardenAcquaintances(w);w.encounters.garden.open=true;const g=w.encounters.garden;g.visits[g.id]=Math.min(ENCOUNTER_LIMITS.visits,g.visits[g.id]+1);bump(w);return {changed:true};
  }
  function selectGarden(w,id,expected){
    if(!guard(w,expected))return stale();validate(w.encounters,w.tick);const entry=gardenById(id),g=w.encounters.garden;
    if(!entry)return {changed:false,reason:'garden'};
    if(g.open&&g.id===id)return {changed:false,resumed:true};
    rememberGardenAcquaintances(w);g.id=id;g.scene=entry.scene;g.open=true;g.visits[id]=Math.min(ENCOUNTER_LIMITS.visits,g.visits[id]+1);bump(w);return {changed:true,gardenId:id};
  }
  function meetGardenFriend(w,friendId,kind,expected){
    if(!guard(w,expected))return stale();validate(w.encounters,w.tick);const g=w.encounters.garden;
    if(!g.open||!gardenFriendRoster(w,g.id).some(b=>b.friendId===friendId))return {changed:false,reason:'friend'};
    const result=bondGardenFriend(w,friendId,kind);if(result.changed)bump(w);return result;
  }
  function chooseCompanions(w,ids,expected){
    if(!guard(w,expected))return stale();validate(w.encounters,w.tick);
    if(!setGardenCompanions(w,ids))return {changed:false,reason:'companion'};
    bump(w);return {changed:true};
  }
  function leaveGarden(w,expected){
    if(!guard(w,expected))return stale();validate(w.encounters,w.tick);
    if(!w.encounters.garden.open)return {changed:false};
    w.encounters.garden.open=false;bump(w);return {changed:true};
  }
  function observeGarden(w,scene,expected){
    if(!guard(w,expected))return stale();validate(w.encounters,w.tick);
    const s=w.encounters,g=s.garden;
    if(!g.open||!GARDEN_SCENES.includes(scene))return {changed:false,reason:'place'};
    if(s.active||s.queue.length)return {changed:false,reason:'guest'};
    if(g.turn>=ENCOUNTER_LIMITS.activity-3)return {changed:false,reason:'limit'};
    g.scene=scene;g.turn++;s.activities.garden=Math.min(ENCOUNTER_LIMITS.activity,s.activities.garden+1);
    fillQueue(w);bump(w);return {changed:true,arrived:s.queue.length>0};
  }
  function noteActivity(w,activity){
    if(!ACTIVITIES.includes(activity))return {changed:false};
    validate(w.encounters,w.tick);const s=w.encounters;
    if(s.activities[activity]<ENCOUNTER_LIMITS.activity)s.activities[activity]++;
    bump(w);return {changed:true};
  }
  function open(w,id,expected){
    if(!guard(w,expected))return stale();validate(w.encounters,w.tick);
    const s=w.encounters,e=byId.get(id);
    if(!e)return {changed:false,reason:'unknown'};
    if(!s.garden.open||s.garden.guestGardenId!==s.garden.id)return {changed:false,reason:'place',message:'お客さまの待つ庭へ行こう。'};
    if(s.active)return s.active.id===id?{changed:false,resumed:true,active:{...s.active}}:{changed:false,reason:'active',message:'いまのお客さまとの時間を、先に楽しもう。'};
    if(!s.queue.includes(id))return {changed:false,reason:'locked'};
    if(s.nextId>=Number.MAX_SAFE_INTEGER)return {changed:false,reason:'limit'};
    s.queue=s.queue.filter(x=>x!==id);s.active={id,instanceId:s.nextId++,scriptVersion:e.scriptVersion,step:0,createdTick:w.tick};bump(w);
    return {changed:true,active:{...s.active}};
  }
  function act(w,instanceId,actionId,expected){
    if(!guard(w,expected))return stale();validate(w.encounters,w.tick);const s=w.encounters,a=s.active,e=a&&byId.get(a.id);
    if(!a||!e||a.instanceId!==instanceId||e.steps[a.step].action!==actionId)return {changed:false,reason:'action'};
    if(!s.garden.open||s.garden.guestGardenId!==s.garden.id)return {changed:false,reason:'place'};
    if(a.step<e.steps.length-1){a.step++;bump(w);return {changed:true,revealed:false,step:a.step};}
    const old=s.discoveries.find(d=>d.id===a.id),first=!old;
    if(old){old.lastTick=w.tick;old.visits=Math.min(ENCOUNTER_LIMITS.visits,old.visits+1);}else s.discoveries.push({id:a.id,firstTick:w.tick,lastTick:w.tick,visits:1,instanceId:a.instanceId});
    s.cursor=(catalog.findIndex(e=>e.id===a.id)+1)%Math.max(1,catalog.length);const id=a.id;s.active=null;s.garden.lastGuest=id;s.garden.nextTurn=Math.min(ENCOUNTER_LIMITS.activity,s.garden.turn+3);s.garden.nextTick=w.tick+8;bump(w);
    return {changed:true,revealed:true,first,id,message:first?`${e.name}との出会いを、図鑑に記録したよ。`:'また会えたね。'};
  }
  function status(w,id){const discovery=w.encounters.discoveries.find(d=>d.id===id);return {discovered:!!discovery,discovery:discovery?{...discovery}:null,ready:w.encounters.queue.includes(id),active:w.encounters.active?.id===id};}
  return Object.freeze({catalog,validate,noteActivity,enterGarden,selectGarden,meetGardenFriend,chooseCompanions,leaveGarden,observeGarden,open,act,status});
}
export const encounterSystem=createEncounterSystem(ENCOUNTER_CATALOG,{knownCatalog:ENCOUNTER_CANDIDATES});
export function validateEncounterState(state,tick){return encounterSystem.validate(state,tick);}
