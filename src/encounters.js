import {isAlive} from './life-care.js';
import {initializeGardenVisitSessions,switchGardenVisitSession,pendingGardenGuestLocation,clearCompletedGardenGuest,gardenVisitSessionFields} from './garden-visit-sessions.js';
import {initialRaptorState,validateRaptorState} from './garden-raptors.js';
import {initialCrowState,validateCrowState} from './garden-crows.js';
import {initialGardenFriends,validateGardenFriends,setGardenCompanions,bondGardenFriend,beginGardenOuting,recordGardenVisit} from './garden-friends.js';
/** Pure encounter state. Other species never enter Java Sparrow birds[] or consume its PRNG. */
import {GARDEN_IDS,LEGACY_GARDEN_IDS,gardenById,gardenFriendRoster,shuffleGardenPool} from './data/gardens.js';
import { ENCOUNTER_CATALOG, ENCOUNTER_CANDIDATES } from './data/encounter-catalog.js';
export const ENCOUNTER_LIMITS=Object.freeze({catalog:160,queue:1,activity:1000000,visits:1000000});
export const FRIENDSHIP_RULES=Object.freeze({meetingPoints:10,cagePoints:100,petPoints:1000000,visitors:6,visitTicks:96});
export function encounterFriendship(w,id){
  const d=w.encounters.discoveries.find(d=>d.id===id),pets=w.encounters.friendship?.find(f=>f.id===id)?.petPoints||0;
  const points=(d?.visits||0)*FRIENDSHIP_RULES.meetingPoints+pets;
  const level=points>=100?'大のなかよし':points>=60?'なかよし':points>=30?'顔なじみ':'はじめまして';
  return {visits:d?.visits||0,points,level,canVisit:!!d&&points>=FRIENDSHIP_RULES.cagePoints,inCage:!!w.encounters.cageVisitors?.some(v=>v.id===id)};
}
export function cageVisitorCount(w){return w.birds.filter(b=>b.home==='visitor').length+(w.encounters?.cageVisitors?.length||0);}
/** Called only after the legacy state has passed full schema validation. */
export function upgradeEncounterState(state){if(state.version===4){state.version=5;state.friendship=[];state.cageVisitors=[];}if(state.version===5){state.version=6;state.homeClosedUntil=0;}if(state.version===6){state.version=7;state.crow=initialCrowState();}if(state.version===7){state.version=8;state.raptor=initialRaptorState();}if(state.version===8){state.version=9;for(const id of GARDEN_IDS)if(!Object.hasOwn(state.garden.visits,id))state.garden.visits[id]=0;}if(state.version===9){state.version=10;state.homeGoodbyes=[];}if(state.version===10){initializeGardenVisitSessions(state);state.version=11;}if(state.version===11){state.gardenFriends={...state.gardenFriends,version:2,accompany:false,attendees:[],visits:[]};state.version=12;}if(state.version===12)state.version=13;return state;}
export function expireEncounterVisitors(w){if(w.encounters.cageVisitors)w.encounters.cageVisitors=w.encounters.cageVisitors.filter(v=>w.tick-v.arrivedTick<=FRIENDSHIP_RULES.visitTicks);}
const ACTIVITIES=['park','talk','decorate','friend','read','garden'];
export const GARDEN_SCENES=Object.freeze(['grass','water','branch','song','quiet']);
export function initialGardenState(){return {open:false,id:'komorebi',scene:'quiet',turn:0,nextTurn:1,nextTick:0,lastGuest:null,guestGardenId:null,visits:Object.fromEntries(GARDEN_IDS.map(id=>[id,0])),moments:[]};}
const own=(x,k)=>Object.prototype.hasOwnProperty.call(x,k);
const shape=(x,keys)=>x&&typeof x==='object'&&!Array.isArray(x)&&Object.keys(x).length===keys.length&&keys.every(k=>own(x,k));
const integer=(x,min=0,max=Number.MAX_SAFE_INTEGER)=>Number.isSafeInteger(x)&&x>=min&&x<=max;
const bump=w=>{w.revision=w.revision===Number.MAX_SAFE_INTEGER?0:w.revision+1;};
export function initialEncounterState(){return {version:13,gardenSessions:[],homeGoodbyes:[],raptor:initialRaptorState(),crow:initialCrowState(),homeClosedUntil:0,gardenFriends:initialGardenFriends(),garden:initialGardenState(),nextId:1,cursor:0,activities:Object.fromEntries(ACTIVITIES.map(k=>[k,0])),queue:[],active:null,discoveries:[],friendship:[],cageVisitors:[]};}
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
    if(!integer(tick)||!shape(state,['version','gardenFriends','garden','nextId','cursor','activities','queue','active','discoveries',...(state.version>=5?['friendship','cageVisitors']:[]),...(state.version>=6?['homeClosedUntil']:[]),...(state.version>=7?['crow']:[]),...(state.version>=8?['raptor']:[]),...(state.version>=10?['homeGoodbyes']:[]),...(state.version>=11?['gardenSessions']:[])])||![4,5,6,7,8,9,10,11,12,13].includes(state.version)||!integer(state.nextId,1)||!integer(state.cursor,0,ENCOUNTER_LIMITS.catalog)||!shape(state.activities,ACTIVITIES)||ACTIVITIES.some(k=>!integer(state.activities[k],0,ENCOUNTER_LIMITS.activity))||!Array.isArray(state.queue)||state.queue.length>1||new Set(state.queue).size!==state.queue.length||state.queue.some(id=>!knownById.has(id))||!Array.isArray(state.discoveries)||state.discoveries.length>knownCatalog.length)fail();
    if(state.version>=6&&!integer(state.homeClosedUntil,0,8640000000000000))fail();
    if(state.version>=10&&(!Array.isArray(state.homeGoodbyes)||state.homeGoodbyes.length>128||new Set(state.homeGoodbyes.map(g=>g?.birdId)).size!==state.homeGoodbyes.length||state.homeGoodbyes.some(g=>!shape(g,['birdId','until'])||typeof g.birdId!=='string'||!/^b[1-9]\d{0,8}$/.test(g.birdId)||!integer(g.until,1,8640000000000000))))fail();
    if(state.version>=8)validateRaptorState(state.raptor,tick,GARDEN_IDS,state.version);
    if(state.version>=7)validateCrowState(state.crow,tick,GARDEN_IDS,state.version);
    validateGardenFriends(state.gardenFriends,tick,state.version);
    const allowedGardens=state.version>=9?GARDEN_IDS:LEGACY_GARDEN_IDS;const g=state.garden;if(!shape(g,['open','id','scene','turn','nextTurn','nextTick','lastGuest','guestGardenId','visits','moments'])||!(g.guestGardenId===null||GARDEN_IDS.includes(g.guestGardenId))||((state.queue.length||state.active)&&g.guestGardenId===null)||typeof g.open!=='boolean'||!allowedGardens.includes(g.id)||!shape(g.visits,allowedGardens)||allowedGardens.some(id=>!integer(g.visits[id],0,ENCOUNTER_LIMITS.visits))||!Array.isArray(g.moments)||g.moments.length>64||g.moments.some(m=>!shape(m,['gardenId','birdId','kind','tick'])||!GARDEN_IDS.includes(m.gardenId)||!/^b[1-9][0-9]*$/.test(m.birdId)||!['chat','watch','play'].includes(m.kind)||!integer(m.tick,0,tick))||!GARDEN_SCENES.includes(g.scene)||!integer(g.turn,0,ENCOUNTER_LIMITS.activity)||!integer(g.nextTurn,1,ENCOUNTER_LIMITS.activity)||!integer(g.nextTick)||!(g.lastGuest===null||knownById.has(g.lastGuest))||(state.active&&state.queue.length))fail();
    const seen=new Set(), instances=new Set();
    for(const d of state.discoveries){if(!shape(d,['id','firstTick','lastTick','visits','instanceId'])||!knownById.has(d.id)||seen.has(d.id)||instances.has(d.instanceId)||!integer(d.firstTick,0,tick)||!integer(d.lastTick,d.firstTick,tick)||!integer(d.visits,1,ENCOUNTER_LIMITS.visits)||!integer(d.instanceId,1,state.nextId-1))fail();seen.add(d.id);instances.add(d.instanceId);}
    // Invitations and script instance IDs are unique across every garden.
    const pending=new Set(),locations=new Map();
    function validateVisit(visit,queue,active,gardenId){
      if(!Array.isArray(queue)||queue.length>ENCOUNTER_LIMITS.queue||queue.some(id=>!knownById.has(id))||(active&&queue.length))fail();
      if(state.version>=11&&visit.guestGardenId!==null&&visit.guestGardenId!==gardenId)fail();
      if((queue.length||active)&&visit.guestGardenId!==gardenId&&state.version>=11)fail();
      if(state.version>=11)for(const id of new Set([...queue,...(active?[active.id]:[]),...(visit.lastGuest?[visit.lastGuest]:[])])){if(locations.has(id)&&locations.get(id)!==gardenId)fail();locations.set(id,gardenId);}
      for(const id of queue){if(pending.has(id))fail();pending.add(id);}
      if(active!==null){const a=active,e=knownById.get(a?.id);if(!shape(a,['id','instanceId','scriptVersion','step','createdTick'])||!e||!integer(a.instanceId,1,state.nextId-1)||instances.has(a.instanceId)||a.scriptVersion!==e.scriptVersion||!integer(a.step,0,e.steps.length-1)||!integer(a.createdTick,0,tick)||pending.has(a.id))fail();instances.add(a.instanceId);pending.add(a.id);}
    }
    validateVisit(g,state.queue,state.active,g.id);
    if(state.version>=11){
      if(!Array.isArray(state.gardenSessions)||state.gardenSessions.length>GARDEN_IDS.length-1)fail();
      const gardens=new Set([g.id]);
      for(const visit of state.gardenSessions){
        if(!shape(visit,gardenVisitSessionFields())||!GARDEN_IDS.includes(visit.gardenId)||gardens.has(visit.gardenId)||!GARDEN_SCENES.includes(visit.scene)||!integer(visit.turn,0,ENCOUNTER_LIMITS.activity)||!integer(visit.nextTurn,1,ENCOUNTER_LIMITS.activity)||!integer(visit.nextTick)||!(visit.lastGuest===null||knownById.has(visit.lastGuest)))fail();
        gardens.add(visit.gardenId);validateVisit(visit,visit.queue,visit.active,visit.gardenId);
      }
    }
    if(state.version>=5){
      if(!Array.isArray(state.friendship)||state.friendship.length>knownCatalog.length||new Set(state.friendship.map(f=>f?.id)).size!==state.friendship.length||state.friendship.some(f=>!shape(f,['id','petPoints'])||!seen.has(f.id)||!integer(f.petPoints,0,FRIENDSHIP_RULES.petPoints)))fail();
      if(!Array.isArray(state.cageVisitors)||state.cageVisitors.length>FRIENDSHIP_RULES.visitors||new Set(state.cageVisitors.map(v=>v?.id)).size!==state.cageVisitors.length||state.cageVisitors.some(v=>!shape(v,['id','arrivedTick'])||!seen.has(v.id)||!integer(v.arrivedTick,0,tick)||encounterFriendship({encounters:state},v.id).points<FRIENDSHIP_RULES.cagePoints||pending.has(v.id)||state.garden.lastGuest===v.id||state.gardenSessions?.some(visit=>visit.lastGuest===v.id)))fail();
    }
    if(state.version>=12)for(const visit of state.gardenFriends.visits){
      if(visit.visit!==g.visits[visit.gardenId]||visit.returningIds.some(id=>!knownById.has(id)||!seen.has(id)||encounterFriendship({encounters:state},id).points<60))fail();
    }
    return state;
  }
  function fillQueue(w){
    const s=w.encounters,g=s.garden;
    if(!g.open||!catalog.length||s.active||s.queue.length||g.turn<g.nextTurn||w.tick<g.nextTick)return;
    const returning=new Set(s.gardenFriends.visits.find(v=>v.gardenId===g.id)?.returningIds||[]);
    const eligible=catalog.filter(e=>!pendingGardenGuestLocation(s,e.id)&&!s.cageVisitors?.some(v=>v.id===e.id)&&(returning.has(e.id)||(!s.discoveries.some(d=>d.id===e.id)&&(e.gardenEvent?.gardenIds||[]).includes(g.id)&&(e.gardenEvent?.scene||'grass')===g.scene)));
    // New local guests and the close friends selected for this visit share the draw.
    const unseen=eligible.filter(e=>!s.discoveries.some(d=>d.id===e.id));
    const close=eligible.filter(e=>returning.has(e.id)&&e.id!==g.lastGuest);
    const pool=unseen.length?[...unseen,...close]:eligible.filter(e=>e.id!==g.lastGuest);
    const entry=shuffleGardenPool(pool,`${w.worldId}:${g.id}:${g.visits[g.id]}:${g.turn}`)[0]||(!unseen.length?eligible[0]:null);
    if(entry){clearCompletedGardenGuest(s,entry.id);s.queue.push(entry.id);g.guestGardenId=g.id;}
  }
  function recordVisit(w){
    const ids=catalog.filter(e=>encounterFriendship(w,e.id).points>=60&&!pendingGardenGuestLocation(w.encounters,e.id)&&!w.encounters.cageVisitors.some(v=>v.id===e.id)).map(e=>e.id);
    recordGardenVisit(w,ids);
  }
  function beginVisit(w){
    beginGardenOuting(w);const g=w.encounters.garden;g.open=true;
    g.visits[g.id]=Math.min(ENCOUNTER_LIMITS.visits,g.visits[g.id]+1);recordVisit(w);
  }
  function enterGarden(w,expected){
    if(!guard(w,expected))return stale();validate(w.encounters,w.tick);
    if(w.encounters.garden.open)return {changed:false,resumed:true};
    upgradeEncounterState(w.encounters);beginVisit(w);bump(w);return {changed:true};
  }
  function selectGarden(w,id,expected){
    if(!guard(w,expected))return stale();validate(w.encounters,w.tick);const entry=gardenById(id),g=w.encounters.garden;
    if(!entry)return {changed:false,reason:'garden'};
    if(g.open&&g.id===id)return {changed:false,resumed:true};
    upgradeEncounterState(w.encounters);if(!g.open)beginGardenOuting(w);switchGardenVisitSession(w.encounters,id);g.open=true;g.visits[id]=Math.min(ENCOUNTER_LIMITS.visits,g.visits[id]+1);recordVisit(w);bump(w);return {changed:true,gardenId:id};
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
  function chooseAccompaniment(w,enabled,expected){
    if(!guard(w,expected))return stale();validate(w.encounters,w.tick);
    if(typeof enabled!=='boolean')return {changed:false,reason:'companion'};
    w.encounters.gardenFriends.accompany=enabled;bump(w);return {changed:true};
  }
  // Atomically remember both choices. The current outing and predator state are immutable here.
  function chooseOutingPreferences(w,preferences,expected,previous=null){
    if(!guard(w,expected))return stale();validate(w.encounters,w.tick);
    const state=w.encounters.gardenFriends;
    const same=(a,b)=>a.accompany===b.accompany&&Array.isArray(a.companions)&&a.companions.length===b.companions.length&&a.companions.every(id=>b.companions.includes(id));
    if(previous&&!same(previous,state))return {changed:false,reason:'preferences-changed'};
    if(!preferences||typeof preferences.accompany!=='boolean'||!Array.isArray(preferences.companions)||preferences.accompany&&!preferences.companions.length)return {changed:false,reason:'companion'};
    const ids=preferences.companions;
    if(ids.length>4||new Set(ids).size!==ids.length||ids.some(id=>!w.birds.some(b=>b.id===id&&b.home==='resident'&&isAlive(w,b)&&['juvenile','adult'].includes(b.stage))))return {changed:false,reason:'companion'};
    if(same(preferences,state))return {changed:false,resumed:true};
    state.companions=[...ids];state.accompany=preferences.accompany;bump(w);return {changed:true};
  }
  function leaveGarden(w,expected){
    if(!guard(w,expected))return stale();validate(w.encounters,w.tick);
    if(!w.encounters.garden.open)return {changed:false};
    w.encounters.garden.open=false;w.encounters.gardenFriends.attendees=[];bump(w);return {changed:true};
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
  function pet(w,id,amount,expected){
    if(!guard(w,expected))return stale();validate(w.encounters,w.tick);
    if(!byId.has(id)||!w.encounters.discoveries.some(d=>d.id===id)||!integer(amount,1,8))return {changed:false,reason:'locked'};
    upgradeEncounterState(w.encounters);let f=w.encounters.friendship.find(f=>f.id===id);
    if(!f){f={id,petPoints:0};w.encounters.friendship.push(f);}
    const gain=Math.min(amount,FRIENDSHIP_RULES.petPoints-f.petPoints);if(!gain)return {changed:false,reason:'full',message:'ずっと大のなかよしだよ。'};
    f.petPoints+=gain;bump(w);return {changed:true,points:encounterFriendship(w,id).points,message:`親しみ +${gain} ♪`};
  }
  function inviteGarden(w,id,expected){
    if(!guard(w,expected))return stale();validate(w.encounters,w.tick);const s=w.encounters,d=s.discoveries.find(d=>d.id===id),g=s.garden;
    if(!byId.has(id)||!d)return {changed:false,reason:'locked'};
    if(pendingGardenGuestLocation(s,id)||s.active||s.queue.length)return {changed:false,reason:'guest',message:'今のお客さまとの出会いを終えてから呼ぼう。'};
    if(g.lastGuest===id&&g.guestGardenId===g.id){if(!g.open){beginVisit(w);bump(w);return {changed:true,resumed:true};}return {changed:false,resumed:true,message:'もう庭で待っているよ。'};}
    upgradeEncounterState(s);clearCompletedGardenGuest(s,id);s.cageVisitors=s.cageVisitors.filter(v=>v.id!==id);if(!g.open)beginVisit(w);g.open=true;g.lastGuest=id;g.guestGardenId=g.id;
    d.visits=Math.min(ENCOUNTER_LIMITS.visits,d.visits+1);d.lastTick=w.tick;bump(w);return {changed:true,message:`${byId.get(id).name}が庭に来てくれたよ。`};
  }
  function inviteCage(w,id,expected){
    if(!guard(w,expected))return stale();validate(w.encounters,w.tick);const s=w.encounters;
    if(!byId.has(id)||!encounterFriendship(w,id).canVisit)return {changed:false,reason:'friendship',message:'親しみ100ポイントでおうちに呼べるよ。'};
    if(s.cageVisitors?.some(v=>v.id===id))return {changed:false,resumed:true,message:'もうおうちに遊びに来ているよ。'};
    if(pendingGardenGuestLocation(s,id))return {changed:false,reason:'guest',message:'今の出会いを終えてから呼ぼう。'};
    if(cageVisitorCount(w)>=FRIENDSHIP_RULES.visitors)return {changed:false,reason:'capacity',message:'おうちのお客さまは文鳥も合わせて6羽まで。空いたらまた呼ぼう。'};
    upgradeEncounterState(s);s.cageVisitors.push({id,arrivedTick:w.tick});clearCompletedGardenGuest(s,id);bump(w);return {changed:true,message:`${byId.get(id).name}をおうちに招いたよ。`};
  }
  function dismissCage(w,id,expected){
    if(!guard(w,expected))return stale();validate(w.encounters,w.tick);if(!w.encounters.cageVisitors?.some(v=>v.id===id))return {changed:false};
    w.encounters.cageVisitors=w.encounters.cageVisitors.filter(v=>v.id!==id);bump(w);return {changed:true,message:`${knownById.get(id).name}は自分のおうちに帰ったよ。また図鑑から呼べるよ。`};
  }
  function status(w,id){const s=w.encounters,discovery=s.discoveries.find(d=>d.id===id),gardenId=pendingGardenGuestLocation(s,id),visit=gardenId===s.garden.id?s:s.gardenSessions?.find(visit=>visit.gardenId===gardenId);return {discovered:!!discovery,discovery:discovery?{...discovery}:null,ready:!!visit?.queue.includes(id),active:visit?.active?.id===id,gardenId,...encounterFriendship(w,id)};}
  return Object.freeze({catalog,validate,noteActivity,enterGarden,selectGarden,meetGardenFriend,chooseCompanions,chooseAccompaniment,chooseOutingPreferences,leaveGarden,observeGarden,open,act,status,pet,inviteGarden,inviteCage,dismissCage});
}
export const encounterSystem=createEncounterSystem(ENCOUNTER_CATALOG,{knownCatalog:ENCOUNTER_CANDIDATES});
export function validateEncounterState(state,tick){return encounterSystem.validate(state,tick);}
