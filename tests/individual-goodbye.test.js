import test from 'node:test';
import assert from 'node:assert/strict';
import {IDBFactory} from 'fake-indexeddb';
import {createWorld,createBird,dismissHomeFriend,endHomeVisits,homeVisitsClosed,economyToken,validateWorld,advanceTicks,advanceTo,parseSave,serializeWorld,inviteFriend,readCompatibleWorld,LIMITS} from '../src/engine.js';
import {encounterSystem,encounterFriendship,cageVisitorCount} from '../src/encounters.js';
import {lifeStatus} from '../src/life-care.js';
import {getProtagonistId} from '../src/protagonist.js';
import {openGameStore,DB_NAME} from '../src/game-store.js';
import {GARDEN_IDS} from '../src/data/gardens.js';

const now=Date.parse('2026-11-04T12:00:00+09:00'),midnight=Date.parse('2026-11-05T00:00:00+09:00'),day=86400000;
const clone=x=>structuredClone(x);
function foreign(w,n=2){
 const ids=[];
 for(const entry of encounterSystem.catalog.slice(0,n)){
  w.encounters.discoveries.push({id:entry.id,firstTick:0,lastTick:0,visits:10,instanceId:w.encounters.nextId++});
  assert.equal(encounterSystem.inviteCage(w,entry.id,economyToken(w)).changed,true);ids.push(entry.id);
 }
 return ids;
}
function fixture(){
 const w=createWorld(now),father=createBird(w,{home:'resident',sex:'male'});
 const friend=createBird(w,{name:'こめ',home:'visitor',sex:'female',parents:['b1',father.id],generation:1});
 const partner=createBird(w,{name:'あわ',home:'visitor',sex:'male'});
 const egg=createBird(w,{home:'resident',stage:'egg',parents:['b1',father.id],generation:1});
 friend.partner=partner.id;partner.partner=friend.id;friend.pairTick=partner.pairTick=0;
 friend.relations[partner.id]={affection:85,trust:80,compatibility:70,meetings:12,lastTick:0};
 partner.relations[friend.id]=clone(friend.relations[partner.id]);
 friend.memories.push({kind:'play',otherId:partner.id,tick:0});
 friend.milestones.push({kind:'pair',otherId:partner.id,tick:0});
 friend.action={kind:'play',target:partner.id,startedTick:0};
 partner.action={kind:'play',target:friend.id,startedTick:0};
 w.birds[0].action={kind:'talk',target:friend.id,startedTick:0};
 egg.action={kind:'nest',target:father.id,startedTick:0};
 const foreignIds=foreign(w);w.adoption.pending={birdId:friend.id,arrivedTick:0};
 validateWorld(w);return {w,friend,partner,egg,foreignIds};
}
async function raw(indexedDB,value){
 const db=await new Promise((resolve,reject)=>{const req=indexedDB.open(DB_NAME,1);req.onupgradeneeded=()=>req.result.createObjectStore('world');req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});
 try{return await new Promise((resolve,reject)=>{const tx=db.transaction('world',value?'readwrite':'readonly');const req=value?tx.objectStore('world').put(value,'current'):tx.objectStore('world').get('current');tx.oncomplete=()=>resolve(req.result);tx.onerror=()=>reject(tx.error);});}finally{db.close();}
}

test('one native friend goes home while identity, family, bonds, history, wallet and gardens stay intact',()=>{
 const {w,friend,partner,egg}=fixture(),before=clone(w),token=economyToken(w);
 const result=dismissHomeFriend(w,friend.id,token,now);
 assert.equal(result.changed,true);assert.equal(result.birdId,friend.id);assert.match(result.message,/こめ.*自分のおうち/);
 const expected=clone(before);expected.revision++;
 expected.encounters.homeGoodbyes=[{birdId:friend.id,until:midnight}];expected.adoption.pending=null;
 for(const bird of expected.birds){if(bird.id===friend.id)bird.home='departed';if(bird.id===friend.id||bird.action.target===friend.id)bird.action={kind:'rest',target:null,startedTick:expected.tick};}
 assert.deepEqual(w,expected);assert.equal(cageVisitorCount(w),3);assert.equal(partner.home,'visitor');assert.deepEqual(egg,before.birds.find(b=>b.id===egg.id));
 assert.equal(homeVisitsClosed(w,now),false);assert.deepEqual(parseSave(serializeWorld(w)),w);validateWorld(w);
 const committed=clone(w);assert.equal(dismissHomeFriend(w,friend.id,token,now).reason,'stale');assert.equal(dismissHomeFriend(w,friend.id,economyToken(w),now).changed,false);assert.deepEqual(w,committed);
});

test('only the matching adoption question is cleared and another visitor stays available',()=>{
 const {w,friend,partner}=fixture();w.adoption.pending={birdId:partner.id,arrivedTick:partner.arrivedTick};const pending=clone(w.adoption.pending);
 dismissHomeFriend(w,friend.id,economyToken(w),now);assert.deepEqual(w.adoption.pending,pending);assert.equal(partner.home,'visitor');validateWorld(w);
});

test('same-day automatic return at tick 84 skips only the dismissed friend, including after reload',()=>{
 const w=createWorld(now),friend=createBird(w,{home:'visitor'}),other=createBird(w,{home:'departed'});
 dismissHomeFriend(w,friend.id,economyToken(w),now);const restored=parseSave(serializeWorld(w));advanceTicks(restored,84,now);
 assert.equal(restored.birds.find(b=>b.id===friend.id).home,'departed');assert.equal(restored.birds.find(b=>b.id===other.id).home,'visitor');
 assert.equal(restored.events.some(e=>e.kind==='revisit'&&e.ids.includes(friend.id)),false);assert.ok(restored.events.some(e=>e.kind==='revisit'&&e.ids.includes(other.id)));
 assert.ok(restored.birds.length>w.birds.length);assert.equal(homeVisitsClosed(restored,now),false);validateWorld(restored);
 const cooldown=clone(restored.encounters.homeGoodbyes);assert.equal(inviteFriend(restored,friend.id).changed,true);assert.equal(restored.birds.find(b=>b.id===friend.id).home,'visitor');assert.deepEqual(restored.encounters.homeGoodbyes,cooldown);validateWorld(restored);
});

test('automatic return eligibility resumes exactly at Japanese midnight',()=>{
 const w=createWorld(now),friend=createBird(w,{home:'visitor'});dismissHomeFriend(w,friend.id,economyToken(w),now);advanceTicks(w,83,now);
 const before=clone(w),after=clone(w);advanceTicks(before,1,midnight-1);advanceTicks(after,1,midnight);
 assert.equal(before.birds.find(b=>b.id===friend.id).home,'departed');assert.equal(after.birds.find(b=>b.id===friend.id).home,'visitor');validateWorld(before);validateWorld(after);
});

test('repeated send-home updates one saved cooldown and respects saved wall-clock high-water marks',()=>{
 for(const clock of ['lastUpdated','careSchedule','economy']){
  const w=createWorld(now),friend=createBird(w,{home:'visitor'});
  if(clock==='lastUpdated')w.lastUpdated=midnight+1000;else w[clock].seenAt=midnight+1000;
  dismissHomeFriend(w,friend.id,economyToken(w),now);assert.deepEqual(w.encounters.homeGoodbyes,[{birdId:friend.id,until:midnight+day}]);
  inviteFriend(w,friend.id);dismissHomeFriend(w,friend.id,economyToken(w),now-1000);assert.deepEqual(w.encounters.homeGoodbyes,[{birdId:friend.id,until:midnight+day}]);
 }
});

test('stale or missing tokens, other worlds, locations and unavailable birds are no-ops',()=>{
 const {w,friend,foreignIds}=fixture();
 for(const token of [undefined,null,{...economyToken(w),revision:w.revision-1},{...economyToken(w),worldId:'another-world'}]){
  const before=clone(w);assert.equal(dismissHomeFriend(w,friend.id,token,now).reason,'stale');assert.deepEqual(w,before);
 }
 for(const place of ['park','friend']){
  const other=clone(w);other.field={place,hostId:place==='friend'?friend.id:null,enteredTick:0};const before=clone(other);
  assert.equal(dismissHomeFriend(other,friend.id,economyToken(other),now).reason,'location');assert.deepEqual(other,before);
 }
 for(const id of [w.birds[0].id,w.birds[1].id,foreignIds[0],'b999',null]){
  const before=clone(w);assert.equal(dismissHomeFriend(w,id,economyToken(w),now).reason,'unavailable');assert.deepEqual(w,before);
 }
 for(const mutate of [x=>{x.birds.find(b=>b.id===friend.id).home='departed';},x=>{lifeStatus(x,friend.id).death={cause:'illness',at:now,tick:0};},x=>{x.protagonist.birdId=friend.id;}]){
  const other=clone(w);mutate(other);const before=clone(other);assert.equal(dismissHomeFriend(other,friend.id,economyToken(other),now).reason,'unavailable');assert.deepEqual(other,before);
 }
});

test('the real successor cannot be dismissed even if it is marked as a visitor',()=>{
 const w=createWorld(now),father=createBird(w,{home:'resident',sex:'male'}),heir=createBird(w,{home:'resident',parents:['b1',father.id],generation:1});w.paused=true;
 lifeStatus(w,'b1').condition={kind:'injury',sinceAt:now,deadlineAt:now+day};advanceTo(w,now+day);assert.equal(getProtagonistId(w),heir.id);
 heir.home='visitor';const before=clone(w);assert.equal(dismissHomeFriend(w,heir.id,economyToken(w),now+day).reason,'unavailable');assert.deepEqual(w,before);validateWorld(w);
});

test('invalid dates cannot partially dismiss a visitor and revision rollover stays valid',()=>{
 for(const date of [-1,NaN,Infinity,1.5,8640000000000001]){const {w,friend}=fixture(),before=clone(w);assert.throws(()=>dismissHomeFriend(w,friend.id,economyToken(w),date));assert.deepEqual(w,before);}
 const {w,friend}=fixture();w.revision=Number.MAX_SAFE_INTEGER;assert.equal(dismissHomeFriend(w,friend.id,economyToken(w),now).changed,true);assert.equal(w.revision,0);validateWorld(w);
});

test('IndexedDB commits one concurrent goodbye, persists cooldown, and rolls back failed changes',async()=>{
 const indexedDB=new IDBFactory(),a=await openGameStore({indexedDB}),b=await openGameStore({indexedDB});
 try{
  const {w,friend}=fixture();await a.transact(()=>w);const initial=await a.transact(x=>x);
  await assert.rejects(a.transact(x=>{dismissHomeFriend(x,friend.id,economyToken(x),now);throw Error('cancel save');}),/cancel save/);assert.deepEqual(await b.transact(x=>x),initial);
  const token=economyToken(initial),results=[];
  await Promise.all([a,b].map(store=>store.transact(x=>{results.push(dismissHomeFriend(x,friend.id,token,now));return x;})));
  assert.equal(results.filter(r=>r.changed).length,1);assert.equal(results.filter(r=>r.reason==='stale').length,1);
  const committed=await a.transact(x=>x);assert.deepEqual(await b.transact(x=>x),committed);assert.deepEqual(await raw(indexedDB),committed);assert.deepEqual(committed.encounters.homeGoodbyes,[{birdId:friend.id,until:midnight}]);
  await assert.rejects(b.transact(x=>{inviteFriend(x,friend.id);throw Error('cancel invite');}),/cancel invite/);assert.deepEqual(await a.transact(x=>x),committed);
 }finally{a.close();b.close();}
});

test('legacy encounter schemas 4–9 migrate additively with empty cooldowns and untouched input',()=>{
 for(const version of [4,5,6,7,8,9]){
  const w=createWorld(now);w.encounters.version=version;delete w.encounters.gardenSessions;delete w.encounters.homeGoodbyes;
  if(version<9)for(const id of GARDEN_IDS.slice(9))delete w.encounters.garden.visits[id];
  if(version<8)delete w.encounters.raptor;if(version<7)delete w.encounters.crow;if(version<6)delete w.encounters.homeClosedUntil;
  if(version<5){delete w.encounters.friendship;delete w.encounters.cageVisitors;}
  const before=clone(w),next=readCompatibleWorld(w,now);assert.deepEqual(w,before);assert.equal(next.version,10);assert.equal(next.encounters.version,11);assert.deepEqual(next.encounters.homeGoodbyes,[]);
  assert.deepEqual(next.birds,w.birds);assert.deepEqual(next.events,w.events);assert.equal(next.revision,w.revision);assert.deepEqual(parseSave(serializeWorld(next)),next);
  const projected=clone(next);projected.encounters=before.encounters;assert.deepEqual(projected,before);
 }
});

test('schema 9 migration is durably stored without changing world revision or existing closure',async()=>{
 const indexedDB=new IDBFactory(),w=createWorld(now);w.encounters.version=9;delete w.encounters.gardenSessions;delete w.encounters.homeGoodbyes;w.encounters.homeClosedUntil=midnight;const before=clone(w);
 await raw(indexedDB,w);const store=await openGameStore({indexedDB});try{const result=await store.transact(x=>x);assert.equal(result.encounters.version,11);assert.equal(result.revision,w.revision);assert.equal(result.encounters.homeClosedUntil,midnight);assert.deepEqual((await raw(indexedDB)).encounters,result.encounters);assert.deepEqual(w,before);}finally{store.close();}
});

test('cooldown schema rejects duplicates, unknown birds, malformed fields, invalid dates and excessive rows',()=>{
 const {w,friend}=fixture();dismissHomeFriend(w,friend.id,economyToken(w),now);
 const changes=[x=>delete x.encounters.homeGoodbyes,x=>x.encounters.homeGoodbyes=null,x=>x.encounters.homeGoodbyes.push(clone(x.encounters.homeGoodbyes[0])),x=>x.encounters.homeGoodbyes[0].birdId='b999',x=>x.encounters.homeGoodbyes[0].birdId=3,x=>x.encounters.homeGoodbyes[0].extra=true,x=>delete x.encounters.homeGoodbyes[0].until,x=>x.encounters.homeGoodbyes.push(null),x=>x.encounters.homeGoodbyes=Array.from({length:129},(_,i)=>({birdId:`b${i+1}`,until:midnight})),x=>x.encounters.version=12,x=>x.encounters.version=9];
 for(const date of [-1,0,NaN,Infinity,1.5,'tomorrow',8640000000000001])changes.push(x=>{x.encounters.homeGoodbyes[0].until=date;});
 for(const change of changes){const bad=clone(w);change(bad);const before=clone(bad);assert.throws(()=>validateWorld(bad));assert.deepEqual(bad,before);}
 let accessed=false;const bad=clone(w);Object.defineProperty(bad.encounters.homeGoodbyes[0],'until',{enumerable:true,get(){accessed=true;return midnight;}});assert.throws(()=>validateWorld(bad));assert.equal(accessed,false);
});

test('six-member and legacy ten-member families remain untouched while exactly one of six guests leaves',()=>{
 assert.equal(LIMITS.residents,6);
 for(const count of [6,7,8,9,10]){
  const w=createWorld(now);for(let i=1;i<count;i++)createBird(w,{home:'resident'});const friend=createBird(w,{home:'visitor'});foreign(w,5);
  const family=clone(w.birds.filter(b=>b.home==='resident')),guests=clone(w.encounters.cageVisitors);assert.equal(cageVisitorCount(w),6);
  dismissHomeFriend(w,friend.id,economyToken(w),now);assert.equal(cageVisitorCount(w),5);assert.deepEqual(w.birds.filter(b=>b.home==='resident'),family);assert.deepEqual(w.encounters.cageVisitors,guests);assert.deepEqual(parseSave(serializeWorld(w)),w);validateWorld(w);
 }
});

test('foreign guest goodbye preserves native visitors and friendship and is repeat-safe',()=>{
 const {w,foreignIds}=fixture(),id=foreignIds[0],before=clone(w),friendship=encounterFriendship(w,id),token=economyToken(w);
 assert.equal(encounterSystem.dismissCage(w,id,token).changed,true);assert.equal(cageVisitorCount(w),3);assert.deepEqual(w.birds,before.birds);assert.deepEqual(encounterFriendship(w,id),{...friendship,inCage:false});
 const expected=clone(before);expected.revision++;expected.encounters.cageVisitors=expected.encounters.cageVisitors.filter(v=>v.id!==id);assert.deepEqual(w,expected);
 const committed=clone(w);assert.equal(encounterSystem.dismissCage(w,id,token).reason,'stale');assert.equal(encounterSystem.dismissCage(w,id,economyToken(w)).changed,false);assert.deepEqual(w,committed);assert.equal(encounterSystem.inviteCage(w,id,economyToken(w)).changed,true);validateWorld(w);
});

test('whole-home closure still sends remaining guests home independently of individual cooldowns',()=>{
 const {w,friend}=fixture();dismissHomeFriend(w,friend.id,economyToken(w),now);const goodbye=clone(w.encounters.homeGoodbyes);
 assert.equal(endHomeVisits(w,economyToken(w),now).count,3);assert.equal(cageVisitorCount(w),0);assert.equal(homeVisitsClosed(w,now),true);assert.deepEqual(w.encounters.homeGoodbyes,goodbye);validateWorld(w);
});
