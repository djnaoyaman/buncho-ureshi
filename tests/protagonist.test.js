// These scenarios intentionally exercise active health deadlines, not returning from absence.
const advanceTo=(w,at)=>advanceActiveClock(w,at,{present:true});
import {stripGrowthPace,seedLegacyGrowth} from './fixtures/growth-legacy.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {IDBFactory} from 'fake-indexeddb';
import {createWorld,createBird,validateWorld,readCompatibleWorld,advanceTo as advanceActiveClock,advanceTicks,serializeWorld,parseSave,prepareWorldReplacement,renameBird,endHomeVisits,economyToken} from '../src/engine.js';
import {lifeStatus,isAlive} from '../src/life-care.js';
import {getProtagonistId,getProtagonistBird,protagonistStatus} from '../src/protagonist.js';
import {openGameStore,DB_NAME} from '../src/game-store.js';
import {renderGardenStage} from '../src/encounter-ui.js';
import {gardenCompanionRoster,GARDEN_IDS} from '../src/data/gardens.js';
import {renderMemorialPanel,renderProtagonistSummary} from '../src/life-care-ui.js';
const NOW=Date.UTC(2026,10,4),DAY=86400000;
const clone=x=>structuredClone(x);
function family({sex='female',stage='adult',home='resident'}={}){
 const w=createWorld(NOW,42);w.paused=true;w.settings.motion=false;const father=createBird(w,{sex:'male',home:'resident'});
 w.tick=10;const elder=createBird(w,{sex,stage,home,parents:['b1',father.id],generation:1});
 w.tick=20;const younger=createBird(w,{sex:sex==='female'?'male':'female',home:'resident',parents:['b1',father.id],generation:1});
 seedLegacyGrowth(w);return {w,father,elder,younger};
}
function illness(w,birdId,at=NOW){lifeStatus(w,birdId).condition={kind:'injury',sinceAt:at,deadlineAt:at+DAY};}
function die(w,birdId='b1',at=NOW){illness(w,birdId,at);advanceTo(w,at+DAY);validateWorld(w);}
function oldV8(w){const x=clone(w);x.version=8;stripGrowthPace(x);if(x.economy){x.economy.version=1;delete x.economy.household;}for(const k of ['clock','archive','journal'])delete x[k];for(const e of x.events)e.at=x.epoch+e.tick*15000;delete x.decor?.duplicateStreaks;delete x.protagonist;x.events=x.events.filter(e=>e.kind!=='succession');x.nextEvent=Number(x.events.at(-1).id.slice(1))+1;for(const b of x.birds)b.memories=b.memories.filter(m=>m.kind!=='succession');return x;}
async function raw(db,value){const connection=await new Promise((resolve,reject)=>{const r=db.open(DB_NAME,1);r.onupgradeneeded=()=>r.result.createObjectStore('world');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});try{return await new Promise((resolve,reject)=>{const tx=connection.transaction('world',value?'readwrite':'readonly'),r=value?tx.objectStore('world').put(value,'current'):tx.objectStore('world').get('current');tx.oncomplete=()=>resolve(r.result);tx.onerror=()=>reject(tx.error);});}finally{connection.close();}}

test('new v9 identity is b1 and name or inspection selection cannot change it',()=>{
 const {w,elder}=family();assert.equal(w.version,19);assert.equal(getProtagonistId(w),'b1');assert.equal(getProtagonistId(oldV8(w)),'b1');renameBird(w,'b1','しらたま');renameBird(w,elder.id,'おもち');assert.equal(getProtagonistBird(w).name,'しらたま');assert.deepEqual(w.protagonist.lineage,['b1']);assert.deepEqual(parseSave(serializeWorld(w)),w);
});
for(const sex of ['male','female'])test(`oldest living ${sex} child inherits, without changing identity, assets or the grave`,()=>{
 const {w,elder}=family({sex});w.economy.gold=w.economy.lifetimeGold=80;const decor=clone(w.decor),ids=w.birds.map(b=>b.id),name=elder.name;die(w);
 assert.equal(getProtagonistId(w),elder.id);assert.deepEqual(w.protagonist.lineage,['b1',elder.id]);assert.equal(getProtagonistBird(w).name,name);assert.equal(w.economy.gold,80);assert.deepEqual(w.decor,decor);assert.deepEqual(w.birds.map(b=>b.id),ids);assert.ok(lifeStatus(w,'b1').death);assert.equal(w.events.filter(e=>e.kind==='succession').length,1);assert.equal(w.events.at(-1).ids.join(),`b1,${elder.id}`);assert.match(renderMemorialPanel(w),/第2代の主人公/);assert.deepEqual(gardenCompanionRoster(w).map(b=>b.birdId),[]);
 const again=clone(w);advanceTo(w,NOW+DAY);assert.deepEqual(w,again);
});
test('all same-batch deaths are resolved before choosing an heir',()=>{
 const {w,elder,younger}=family();illness(w,'b1');illness(w,elder.id);advanceTo(w,NOW+DAY);assert.equal(getProtagonistId(w),younger.id);assert.deepEqual(w.protagonist.lineage,['b1',younger.id]);assert.ok(!isAlive(w,elder));validateWorld(w);
});
test('birth tick decides seniority and ID is the stable same-tick tie breaker',()=>{
 const {w,elder,younger}=family();younger.bornTick=elder.bornTick;lifeStatus(w,younger).ageOriginTick=younger.bornTick;w.birds.reverse();die(w);assert.equal(getProtagonistId(w),elder.id);
});
test('later generations inherit from their own parent, not the original founders other child',()=>{
 const {w,elder}=family();const partner=createBird(w,{sex:'male',home:'departed'});w.tick=30;const grandchild=createBird(w,{sex:'male',home:'resident',parents:[elder.id,partner.id],generation:2});die(w);illness(w,elder.id,NOW+DAY);advanceTo(w,NOW+2*DAY);assert.deepEqual(w.protagonist.lineage,['b1',elder.id,grandchild.id]);assert.equal(w.events.filter(e=>e.kind==='succession').length,2);assert.ok(w.birds.some(b=>b.id==='b1'));validateWorld(w);
});
test('no living child preserves the save and never substitutes an unrelated bird',()=>{
 const w=createWorld(NOW);w.paused=true;const friend=createBird(w,{home:'resident'});const ids=w.birds.map(b=>b.id),money=w.economy.gold;die(w);assert.equal(getProtagonistId(w),'b1');assert.equal(protagonistStatus(w).waiting,'no-child');assert.deepEqual(w.birds.map(b=>b.id),ids);assert.equal(w.economy.gold,money);assert.match(renderProtagonistSummary(w),/次の主人公を選べます/);const stage=renderGardenStage(w,{selectedBirdId:friend.id});assert.ok(!stage.includes('data-garden-household="'+friend.id+'"'));validateWorld(w);
});
test('an egg waits for hatching, then inherits as a chick',()=>{
 const {w,elder,younger}=family({stage:'egg'});younger.home='departed';lifeStatus(w,younger).death={cause:'illness',at:NOW,tick:w.tick};die(w);assert.equal(protagonistStatus(w).waiting,'hatch');assert.equal(getProtagonistId(w),'b1');w.paused=false;advanceTicks(w,2,NOW+DAY);assert.equal(elder.stage,'chick');assert.equal(getProtagonistId(w),elder.id);assert.deepEqual(gardenCompanionRoster(w),[]);validateWorld(w);
});
test('a living departed child returns with its same identity and a fresh responsibility clock',()=>{
 const {w,elder}=family({home:'departed'});die(w);assert.equal(getProtagonistId(w),elder.id);assert.equal(elder.home,'resident');assert.equal(lifeStatus(w,elder).lastCareAt,NOW+DAY);assert.equal(elder.parents[0],'b1');validateWorld(w);
});
test('a full home waits without evicting anyone, then returns the eldest when space opens',()=>{
 const {w,elder}=family({home:'departed'});die(w); // Create the pre-feature shape with an already-dead founder and six residents.
 const old=oldV8(w);old.birds.find(b=>b.id===elder.id).home='departed';for(let i=old.birds.filter(b=>b.home==='resident').length;i<6;i++)createBird(old,{home:'resident'});
 stripGrowthPace(old);const migrated=readCompatibleWorld(old,NOW+DAY);assert.equal(getProtagonistId(migrated),'b1');assert.equal(protagonistStatus(migrated).waiting,'room');assert.equal(migrated.birds.filter(b=>b.home==='resident').length,6);migrated.birds.find(b=>b.home==='resident'&&b.id!==elder.id).home='departed';advanceTo(migrated,NOW+DAY);assert.equal(getProtagonistId(migrated),elder.id);assert.equal(migrated.birds.filter(b=>b.home==='resident').length,6);validateWorld(migrated);
});
test('current protagonist cannot be sent home as a visitor or autonomously move away',()=>{
 const {w,elder}=family();die(w);elder.home='visitor';const result=endHomeVisits(w,economyToken(w),NOW+DAY);assert.notEqual(elder.home,'departed');elder.home='resident';w.paused=false;for(let i=w.birds.filter(b=>b.home==='resident').length;i<6;i++)createBird(w,{home:'resident'});advanceTicks(w,600,NOW+DAY);assert.equal(elder.home,'resident');assert.equal(getProtagonistId(w),elder.id);validateWorld(w);
});
test('v8 migration is additive for living founders and source objects stay untouched',()=>{
 const {w}=family();const old=oldV8(w),before=clone(old),next=readCompatibleWorld(old,NOW+100*DAY);assert.deepEqual(old,before);assert.deepEqual(oldV8(next),{...old,lastUpdated:next.lastUpdated});assert.equal(next.version,19);assert.equal(next.protagonist.birdId,'b1');assert.deepEqual(next.lifecycle,old.lifecycle);
});
test('v8 dead-founder migration chooses a child once across concurrent persistent readers',async()=>{
 const {w,elder}=family();die(w);const old=oldV8(w);old.events=old.events.filter(e=>e.kind!=='succession');old.nextEvent=Number(old.events.at(-1).id.slice(1))+1;for(const b of old.birds)b.memories=b.memories.filter(m=>m.kind!=='succession');old.encounters.gardenFriends.companions=['b1'];const before=clone(old),db=new IDBFactory();await raw(db,old);const a=await openGameStore({indexedDB:db}),b=await openGameStore({indexedDB:db});try{const [x,y]=await Promise.all([a.transact(w=>advanceTo(w,NOW+DAY)),b.transact(w=>advanceTo(w,NOW+DAY))]);assert.deepEqual(x,y);assert.equal(x.protagonist.birdId,elder.id);assert.equal(x.events.filter(e=>e.kind==='succession').length,1);assert.deepEqual((await raw(db)).protagonist,x.protagonist);assert.deepEqual(old,before);}finally{a.close();b.close();}
});
test('malformed lineage, unknown references and forged family events fail without mutating input',()=>{
 const {w,elder,younger}=family();die(w);for(const mutation of [x=>delete x.protagonist,x=>x.protagonist.extra=true,x=>x.protagonist.version=3,x=>x.protagonist.birdId=younger.id,x=>x.protagonist.lineage.push(elder.id),x=>x.protagonist.lineage=['b2',elder.id],x=>x.protagonist.lineage=['b1','b999'],x=>x.lifecycle.birds[0].death=null,x=>x.events.at(-1).ids=['b2','b1']]){const bad=clone(w);mutation(bad);const before=clone(bad);assert.throws(()=>validateWorld(bad));assert.deepEqual(bad,before);}assert.deepEqual(parseSave(serializeWorld(w)),w);const future=clone(w);future.version=999;assert.throws(()=>readCompatibleWorld(future));
});
test('explicit full save restore preserves the successor and lineage with its own grave and wallet',()=>{
 const {w,elder}=family();die(w);w.economy.gold=w.economy.lifetimeGold=31;const restored=prepareWorldReplacement(createWorld(NOW+2*DAY),w,NOW+3*DAY,'restored-family');assert.equal(getProtagonistId(restored),elder.id);assert.deepEqual(restored.protagonist,w.protagonist);assert.equal(restored.economy.gold,31);assert.deepEqual(lifeStatus(restored,'b1').death,lifeStatus(w,'b1').death);validateWorld(restored);
});
test('all nine gardens use the saved successor, independently of inspected sibling',()=>{
 const {w,elder,younger}=family();die(w);w.encounters.gardenFriends.attendees=[elder.id];for(const id of GARDEN_IDS){w.encounters.garden.id=id;const html=renderGardenStage(w,{selectedBirdId:younger.id});assert.ok(html.includes(`data-garden-household="${elder.id}"`),id);assert.ok(!html.includes('data-garden-household="b1"'),id);assert.ok(!html.includes(`data-garden-household="${younger.id}"`),id);}validateWorld(w);
});

test('v8 migration does not crown a child whose treatment deadline expires before first render',()=>{
 const {w,elder,younger}=family();die(w);const old=oldV8(w);old.encounters.gardenFriends.companions=['b1'];illness(old,elder.id,NOW+DAY);const migrated=readCompatibleWorld(old,NOW+2*DAY);assert.equal(getProtagonistId(migrated),'b1');assert.deepEqual(migrated.lifecycle,old.lifecycle);advanceTo(migrated,NOW+2*DAY);assert.equal(getProtagonistId(migrated),younger.id);assert.deepEqual(migrated.protagonist.lineage,['b1',younger.id]);assert.equal(migrated.events.filter(e=>e.kind==='succession').length,1);validateWorld(migrated);
});
test('returning eldest fills sixth slot and clears only the now-invalid adoption invitation',()=>{
 const {w,elder}=family({home:'departed'});for(let n=w.birds.filter(b=>b.home==='resident').length;n<6;n++)createBird(w,{home:'resident'});const visitor=createBird(w,{home:'visitor'});die(w); // The founder death frees a place, which the heir fills.
 assert.equal(elder.home,'resident');assert.equal(w.birds.filter(b=>b.home==='resident').length,6);
 const old=oldV8(w);old.birds.find(b=>b.id===elder.id).home='departed';old.adoption.pending={birdId:visitor.id,arrivedTick:visitor.arrivedTick};const before=clone(old),m=readCompatibleWorld(old,NOW+DAY);advanceTo(m,NOW+DAY);assert.equal(getProtagonistId(m),elder.id);assert.equal(m.adoption.pending,null);assert.equal(m.birds.find(b=>b.id===visitor.id).home,'visitor');assert.equal(m.birds.length,old.birds.length);assert.deepEqual(old,before);validateWorld(m);
});

test('returning successor also returns a paused visit to that childs former home',()=>{
 const {w,elder}=family({home:'departed'});w.field={place:'friend',hostId:elder.id,enteredTick:w.tick};die(w);assert.equal(getProtagonistId(w),elder.id);assert.deepEqual(w.field,{place:'home',hostId:null,enteredTick:w.tick});assert.equal(w.paused,true);validateWorld(w);
});

test('oldest child keeps birth-order priority even while still an egg',()=>{
 const {w,elder}=family({stage:'egg'});die(w);assert.equal(getProtagonistId(w),'b1');assert.equal(protagonistStatus(w).waiting,'hatch');assert.equal(protagonistStatus(w).heir.id,elder.id);validateWorld(w);
});
test('succession uses no extra randomness or currencies',()=>{
 const {w}=family(),seed=w.seed,points=w.decor.points,gold=w.economy.gold;die(w);assert.equal(w.seed,seed);assert.equal(w.decor.points,points);assert.equal(w.economy.gold,gold);
});
