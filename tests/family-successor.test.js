// Deliberate active-clock deadline setup; return protection is covered separately.
const advanceTo=(w,at)=>advanceActiveClock(w,at,{present:true});
import {stripGrowthPace} from './fixtures/growth-legacy.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {IDBFactory} from 'fake-indexeddb';
import {
 createWorld,createBird,adoptBird,advanceTo as advanceActiveClock,advanceTicks,chooseFamilyProtagonist,
 economyToken,feedBird,renameBird,validateWorld,readCompatibleWorld,
 serializeWorld,parseSave,prepareWorldReplacement,LIMITS,TICK_MS,
} from '../src/engine.js';
import {lifeStatus,isAlive} from '../src/life-care.js';
import {familySuccessorCandidates,getProtagonistId,protagonistStatus} from '../src/protagonist.js';
import {openGameStore,DB_NAME} from '../src/game-store.js';

const NOW=Date.UTC(2026,10,4),DAY=86400000;
const MAX_LIFE_TIME=253402268399999;
const clone=value=>structuredClone(value);
const token=w=>({...economyToken(w),fromId:getProtagonistId(w)});
const candidates=w=>familySuccessorCandidates(w).map(({bird,reason})=>({id:bird.id,reason}));
const successions=w=>w.events.filter(event=>event.kind==='succession');
function world(){const w=createWorld(NOW,42);w.paused=true;w.settings.motion=false;return w;}
function sick(w,birdId,at=w.lifecycle.seenAt){lifeStatus(w,birdId).condition={kind:'injury',sinceAt:at,deadlineAt:at+DAY};}
function die(w,birdId='b1',at=w.lifecycle.seenAt){sick(w,birdId,at);advanceTo(w,at+DAY);validateWorld(w);}
function resident(w,options={}){return createBird(w,{sex:'male',home:'resident',...options});}
function formerFamily(w,options={}){
 const bird=createBird(w,{sex:'male',home:'departed',...options});
 bird.milestones.push({kind:'adopt',otherId:null,tick:bird.bornTick});return bird;
}
function choiceFixture(){const w=world(),chosen=resident(w);die(w);return {w,chosen};}
function choose(w,birdId,now=w.lifecycle.seenAt){return chooseFamilyProtagonist(w,birdId,token(w),now);}
function oldV9(w){const old=clone(w);old.version=9;stripGrowthPace(old);if(old.economy){old.economy.version=1;delete old.economy.household;}for(const k of ['clock','archive','journal'])delete old[k];for(const e of old.events)e.at=old.epoch+e.tick*15000;delete old.decor?.duplicateStreaks;old.protagonist.version=1;delete old.protagonist.familySelections;return old;}
function fillHome(w){while(w.birds.filter(bird=>bird.home==='resident').length<6)resident(w);}
function pruneSuccession(w){
 w.events=w.events.filter(event=>event.kind!=='succession');
 w.nextEvent=Math.max(Number(w.events.at(-1).id.slice(1)),...(w.journal||[]).filter(e=>/^e[1-9]\d*$/.test(e.id)).map(e=>Number(e.id.slice(1))))+1;
 for(const bird of w.birds)bird.memories=bird.memories.filter(memory=>memory.kind!=='succession');
}
async function raw(indexedDB,value){
 const db=await new Promise((resolve,reject)=>{
  const request=indexedDB.open(DB_NAME,1);
  request.onupgradeneeded=()=>request.result.createObjectStore('world');
  request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);
 });
 try{return await new Promise((resolve,reject)=>{
  const tx=db.transaction('world',value===undefined?'readonly':'readwrite');
  const request=value===undefined?tx.objectStore('world').get('current'):tx.objectStore('world').put(value,'current');
  tx.oncomplete=()=>resolve(request.result);tx.onerror=tx.onabort=()=>reject(tx.error);
 });}finally{db.close();}
}

test('new saves have an empty v2 family selection ledger and round trip exactly',()=>{
 const w=world();assert.equal(w.version,18);
 assert.deepEqual(w.protagonist,{version:2,birdId:'b1',lineage:['b1'],familySelections:[]});
 assert.deepEqual(parseSave(serializeWorld(w)),w);
});

test('childless death, inspection, reload and time advancement never choose family automatically',()=>{
 const {w,chosen}=choiceFixture(),before=clone(w);
 assert.deepEqual(candidates(w),[{id:chosen.id,reason:null}]);
 assert.equal(protagonistStatus(w).waiting,'no-child');
 assert.deepEqual(w,before,'listing candidates is read-only');
 const loaded=readCompatibleWorld(w,NOW+DAY);advanceTo(loaded,NOW+DAY);
 assert.equal(getProtagonistId(loaded),'b1');assert.deepEqual(loaded.protagonist.familySelections,[]);
 assert.equal(successions(loaded).length,0);assert.deepEqual(w,before);
});

for(const relation of ['spouse','sibling','unrelated adopted family'])test(`a resident ${relation} can explicitly inherit without changing ancestry`,()=>{
 const w=world(),founder=w.birds[0];let chosen;
 if(relation==='spouse'){
  chosen=resident(w);founder.partner=chosen.id;chosen.partner=founder.id;founder.pairTick=chosen.pairTick=w.tick;
 }else if(relation==='sibling'){
  const mother=createBird(w,{sex:'female',home:'departed'}),father=createBird(w,{sex:'male',home:'departed'});
  founder.parents=[mother.id,father.id];founder.generation=1;
  chosen=resident(w,{parents:[mother.id,father.id],generation:1});
 }else{
  chosen=createBird(w,{sex:'female',home:'visitor'});adoptBird(w,chosen.id);
 }
 const ancestry=w.birds.map(bird=>({id:bird.id,parents:clone(bird.parents),generation:bird.generation}));
 die(w);assert.equal(getProtagonistId(w),'b1');assert.equal(choose(w,chosen.id).changed,true);
 assert.equal(getProtagonistId(w),chosen.id);assert.deepEqual(w.protagonist.lineage,['b1',chosen.id]);
 assert.deepEqual(w.protagonist.familySelections,[{fromId:'b1',toId:chosen.id,tick:w.tick,at:NOW+DAY}]);
 assert.deepEqual(w.birds.map(bird=>({id:bird.id,parents:bird.parents,generation:bird.generation})),ancestry);
 assert.deepEqual(successions(w).map(event=>event.ids),[['b1',chosen.id]]);validateWorld(w);
});

for(const kind of ['welcome','adopt','movein'])test(`a departed bird with a retained ${kind} milestone remains family`,()=>{
 const w=world(),chosen=formerFamily(w);chosen.milestones[0].kind=kind;
 die(w);assert.deepEqual(candidates(w),[{id:chosen.id,reason:null}]);
 assert.equal(choose(w,chosen.id).changed,true);assert.equal(chosen.home,'resident');validateWorld(w);
});

test('two recorded parents identify a departed family bird even without admission milestones',()=>{
 const w=world(),mother=createBird(w,{sex:'female',home:'departed'}),father=createBird(w,{sex:'male',home:'departed'});
 const chosen=createBird(w,{sex:'female',home:'departed',parents:[mother.id,father.id],generation:1});
 die(w);assert.deepEqual(candidates(w),[{id:chosen.id,reason:null}]);
 assert.equal(choose(w,chosen.id).changed,true);assert.equal(chosen.home,'resident');validateWorld(w);
});

test('ordinary visitors and departed acquaintances cannot inherit, even with only a recent welcome memory',()=>{
 const w=world(),visitor=createBird(w,{home:'visitor'}),departed=createBird(w,{home:'departed'});
 visitor.memories.push({kind:'welcome',otherId:null,tick:0});die(w);const before=clone(w);
 assert.deepEqual(candidates(w),[]);
 for(const id of [visitor.id,departed.id,'b1','b999'])assert.equal(choose(w,id).changed,false);
 assert.deepEqual(w,before);validateWorld(w);
});

test('a living protagonist cannot be replaced by family',()=>{
 const w=world(),chosen=resident(w),before=clone(w);
 assert.deepEqual(candidates(w),[]);assert.equal(choose(w,chosen.id).changed,false);assert.deepEqual(w,before);
});

test('a family egg is visible but unavailable, without blocking an explicit nonchild adult',()=>{
 const w=world(),egg=resident(w,{stage:'egg'}),adult=resident(w);
 die(w);assert.deepEqual(candidates(w),[{id:egg.id,reason:'hatch'},{id:adult.id,reason:null}]);
 const before=clone(w);assert.equal(choose(w,egg.id).changed,false);assert.deepEqual(w,before);
 assert.equal(choose(w,adult.id).changed,true);assert.equal(egg.stage,'egg');validateWorld(w);
});

test('a living direct-child egg retains priority over every manual family choice',()=>{
 const w=world(),father=resident(w),egg=resident(w,{stage:'egg',parents:['b1',father.id],generation:1});egg.growthPace='legacy';
 die(w);assert.equal(protagonistStatus(w).waiting,'hatch');assert.deepEqual(candidates(w),[]);
 const before=clone(w);assert.equal(choose(w,father.id).changed,false);assert.equal(choose(w,egg.id).changed,false);assert.deepEqual(w,before);
 w.paused=false;advanceTicks(w,12,NOW+DAY);
 assert.equal(egg.stage,'chick');assert.equal(getProtagonistId(w),egg.id);assert.deepEqual(w.protagonist.familySelections,[]);validateWorld(w);
});

test('a living direct child waiting for room cannot be bypassed with a resident family choice',()=>{
 const w=world(),father=resident(w);die(w);
 const child=createBird(w,{home:'departed',parents:['b1',father.id],generation:1});fillHome(w);
 assert.equal(protagonistStatus(w).waiting,'room');assert.deepEqual(candidates(w),[]);
 const before=clone(w);assert.equal(choose(w,father.id).changed,false);assert.deepEqual(w,before);
 w.birds.find(bird=>bird.home==='resident'&&bird.id!==father.id).home='departed';advanceTo(w,NOW+DAY);
 assert.equal(getProtagonistId(w),child.id);assert.deepEqual(w.protagonist.familySelections,[]);validateWorld(w);
});

test('a living adult child is selected automatically before manual family succession is available',()=>{
 const w=world(),father=resident(w),child=resident(w,{parents:['b1',father.id],generation:1});
 die(w);assert.equal(getProtagonistId(w),child.id);assert.deepEqual(candidates(w),[]);
 const before=clone(w);assert.equal(choose(w,father.id).changed,false);assert.deepEqual(w,before);
 assert.deepEqual(w.protagonist.familySelections,[]);validateWorld(w);
});

test('a resident candidate can inherit in a full home without evicting anyone',()=>{
 const {w,chosen}=choiceFixture();fillHome(w);const homes=w.birds.map(bird=>[bird.id,bird.home]);
 assert.equal(familySuccessorCandidates(w).find(candidate=>candidate.bird.id===chosen.id).reason,null);
 assert.equal(choose(w,chosen.id).changed,true);assert.deepEqual(w.birds.map(bird=>[bird.id,bird.home]),homes);validateWorld(w);
});

test('a departed candidate waits for room and only returns after another resident leaves',()=>{
 const w=world(),chosen=formerFamily(w);die(w);fillHome(w);
 assert.equal(familySuccessorCandidates(w).find(candidate=>candidate.bird.id===chosen.id).reason,'room');
 const before=clone(w);assert.equal(choose(w,chosen.id).changed,false);assert.deepEqual(w,before);
 const departing=w.birds.find(bird=>bird.home==='resident');departing.home='departed';
 assert.equal(choose(w,chosen.id).changed,true);assert.equal(chosen.home,'resident');assert.equal(departing.home,'departed');
 assert.equal(w.birds.filter(bird=>bird.home==='resident').length,6);validateWorld(w);
});

test('returning family keeps illness, resets responsibility, closes its former-home visit and clears its adoption invitation',()=>{
 const w=world(),chosen=formerFamily(w,{home:'visitor'});sick(w,chosen.id,NOW);
 die(w);w.tick=7;w.field={place:'friend',hostId:chosen.id,enteredTick:7};
 w.adoption.pending={birdId:chosen.id,arrivedTick:chosen.arrivedTick};
 lifeStatus(w,chosen).dirtySinceAt=NOW;lifeStatus(w,chosen).lowSinceAt=NOW;
 const ids=w.birds.map(bird=>bird.id),birth=chosen.bornTick;
 assert.equal(choose(w,chosen.id).changed,true);const care=lifeStatus(w,chosen);
 assert.equal(care.lastCareAt,NOW+DAY);assert.equal(care.dirtySinceAt,null);assert.equal(care.lowSinceAt,null);
 assert.deepEqual(care.condition,{kind:'injury',sinceAt:NOW+DAY,deadlineAt:NOW+2*DAY});
 assert.equal(chosen.arrivedTick,7);assert.equal(chosen.bornTick,birth);assert.equal(chosen.home,'resident');
 assert.deepEqual(w.field,{place:'home',hostId:null,enteredTick:7});assert.equal(w.paused,true);
 assert.equal(w.adoption.pending,null);assert.deepEqual(w.birds.map(bird=>bird.id),ids);validateWorld(w);
});

test('returning into the sixth slot clears only the now-invalid invitation and keeps its visitor',()=>{
 const w=world(),chosen=formerFamily(w),visitor=createBird(w,{home:'visitor'});die(w);
 while(w.birds.filter(bird=>bird.home==='resident').length<5)resident(w);
 w.adoption.pending={birdId:visitor.id,arrivedTick:visitor.arrivedTick};
 assert.equal(choose(w,chosen.id).changed,true);assert.equal(w.adoption.pending,null);
 assert.equal(visitor.home,'visitor');assert.equal(w.birds.filter(bird=>bird.home==='resident').length,6);validateWorld(w);
});

test('returning into a nonfull home preserves an unrelated adoption invitation and a future treatment deadline',()=>{
 const w=world(),chosen=formerFamily(w),visitor=createBird(w,{home:'visitor'});die(w);
 sick(w,chosen.id,NOW+DAY);w.adoption.pending={birdId:visitor.id,arrivedTick:visitor.arrivedTick};
 const pending=clone(w.adoption.pending),condition=clone(lifeStatus(w,chosen).condition);
 assert.equal(choose(w,chosen.id,NOW+DAY+1).changed,true);
 assert.deepEqual(w.adoption.pending,pending);assert.deepEqual(lifeStatus(w,chosen).condition,condition);validateWorld(w);
});

for(const at of [MAX_LIFE_TIME-DAY+1,MAX_LIFE_TIME])test(`an overdue returning family bird is rejected when a full treatment day cannot fit at ${at}`,()=>{
 const start=MAX_LIFE_TIME-3*DAY,w=createWorld(start,42);w.paused=true;w.settings.motion=false;
 const chosen=formerFamily(w);sick(w,chosen.id,start);die(w,'b1',start);
 const opened=token(w),identity=clone(w.protagonist),condition=clone(lifeStatus(w,chosen).condition);
 assert.deepEqual(candidates(w),[{id:chosen.id,reason:null}],'the candidate was available when the dialog opened');
 assert.equal(chooseFamilyProtagonist(w,chosen.id,opened,at).changed,false);
 assert.equal(w.lifecycle.seenAt,at);assert.deepEqual(w.protagonist,identity);assert.equal(successions(w).length,0);
 assert.equal(chosen.home,'departed');assert.ok(isAlive(w,chosen));assert.deepEqual(lifeStatus(w,chosen).condition,condition);
 assert.deepEqual(candidates(w),[{id:chosen.id,reason:'clock'}]);validateWorld(w);
 const before=clone(w);assert.equal(choose(w,chosen.id,at).changed,false);assert.deepEqual(w,before);
 advanceTo(w,MAX_LIFE_TIME);
 assert.equal(getProtagonistId(w),'b1');assert.deepEqual(w.protagonist.familySelections,[]);
 assert.ok(isAlive(w,chosen));assert.deepEqual(parseSave(serializeWorld(w)),w);validateWorld(w);
});

test('an overdue returning family bird remains selectable at the exact last full-treatment boundary',()=>{
 const start=MAX_LIFE_TIME-3*DAY,at=MAX_LIFE_TIME-DAY,w=createWorld(start,42);w.paused=true;w.settings.motion=false;
 const chosen=formerFamily(w);sick(w,chosen.id,start);die(w,'b1',start);
 assert.equal(choose(w,chosen.id,at).changed,true);assert.equal(chosen.home,'resident');assert.equal(getProtagonistId(w),chosen.id);
 assert.deepEqual(lifeStatus(w,chosen).condition,{kind:'injury',sinceAt:at,deadlineAt:MAX_LIFE_TIME});
 assert.equal(lifeStatus(w,chosen).lastCareAt,at);
 const ledger=[{fromId:'b1',toId:chosen.id,tick:w.tick,at}];assert.deepEqual(w.protagonist.familySelections,ledger);validateWorld(w);
 advanceTo(w,MAX_LIFE_TIME-1);assert.ok(isAlive(w,chosen));validateWorld(w);
 advanceTo(w,MAX_LIFE_TIME);assert.equal(lifeStatus(w,chosen).death.at,MAX_LIFE_TIME);
 assert.deepEqual(w.protagonist.familySelections,ledger);assert.deepEqual(parseSave(serializeWorld(w)),w);validateWorld(w);
});

test('a resident successor receives no free feeding, treatment or care reset',()=>{
 const {w,chosen}=choiceFixture();sick(w,chosen.id,NOW+DAY);
 lifeStatus(w,chosen).dirtySinceAt=NOW;lifeStatus(w,chosen).lowSinceAt=NOW;
 const care=clone(lifeStatus(w,chosen)),needs=clone(chosen.needs);
 assert.equal(choose(w,chosen.id).changed,true);assert.deepEqual(lifeStatus(w,chosen),care);assert.deepEqual(chosen.needs,needs);validateWorld(w);
});

test('missing, stale, wrong-world and wrong-predecessor tokens are rejected without writes',()=>{
 const {w,chosen}=choiceFixture();const correct=token(w),before=clone(w);
 const invalid=[undefined,null,{},economyToken(w),{...correct,worldId:'another-garden'},{...correct,revision:correct.revision+1},{...correct,fromId:chosen.id}];
 for(const value of invalid){assert.equal(chooseFamilyProtagonist(w,chosen.id,value,NOW+DAY).reason,'stale');assert.deepEqual(w,before);}
});

test('a rename while the selection is open invalidates the old choice rather than overwriting the edit',()=>{
 const {w,chosen}=choiceFixture(),opened=token(w);renameBird(w,chosen.id,'こめ');const before=clone(w);
 assert.equal(chooseFamilyProtagonist(w,chosen.id,opened,NOW+DAY).reason,'stale');assert.deepEqual(w,before);
 assert.equal(choose(w,chosen.id).changed,true);assert.equal(chosen.name,'こめ');validateWorld(w);
});

test('double clicks and freshly retried choices create exactly one transition',()=>{
 const {w,chosen}=choiceFixture(),other=resident(w),original=token(w);
 assert.equal(chooseFamilyProtagonist(w,chosen.id,original,NOW+DAY).changed,true);const after=clone(w);
 assert.equal(chooseFamilyProtagonist(w,chosen.id,original,NOW+DAY).reason,'stale');
 assert.equal(chooseFamilyProtagonist(w,other.id,original,NOW+DAY).reason,'stale');
 assert.equal(choose(w,other.id).changed,false);assert.equal(choose(w,chosen.id).changed,false);
 assert.deepEqual(w,after);assert.equal(successions(w).length,1);assert.equal(w.protagonist.familySelections.length,1);validateWorld(w);
});

test('a candidate that dies while the choice is open is never crowned or replaced automatically',()=>{
 const {w,chosen}=choiceFixture(),survivor=resident(w);sick(w,chosen.id,NOW+DAY);
 const opened=token(w);assert.ok(candidates(w).some(candidate=>candidate.id===chosen.id));
 const result=chooseFamilyProtagonist(w,chosen.id,opened,NOW+2*DAY);
 assert.equal(result.changed,false);assert.ok(!isAlive(w,chosen));assert.equal(getProtagonistId(w),'b1');
 assert.deepEqual(w.protagonist.familySelections,[]);assert.equal(successions(w).length,0);
 assert.equal(choose(w,survivor.id).changed,true);assert.deepEqual(w.protagonist.lineage,['b1',survivor.id]);validateWorld(w);
});

test('all same-batch family deaths settle before a surviving explicit choice',()=>{
 const {w,chosen}=choiceFixture(),other=resident(w),survivor=resident(w);
 sick(w,chosen.id,NOW+DAY);sick(w,other.id,NOW+DAY);
 assert.equal(choose(w,survivor.id,NOW+2*DAY).changed,true);
 assert.ok(!isAlive(w,chosen));assert.ok(!isAlive(w,other));assert.ok(isAlive(w,survivor));
 assert.deepEqual(w.protagonist.lineage,['b1',survivor.id]);
 assert.deepEqual(successions(w).map(event=>event.ids),[['b1',survivor.id]]);
 assert.deepEqual(candidates(w),[]);validateWorld(w);
});

test('the founder and its last child dying in one batch exposes family only for a later explicit choice',()=>{
 const w=world(),father=resident(w),child=resident(w,{parents:['b1',father.id],generation:1});
 sick(w,'b1');sick(w,child.id);advanceTo(w,NOW+DAY);
 assert.ok(!isAlive(w,w.birds[0]));assert.ok(!isAlive(w,child));assert.equal(getProtagonistId(w),'b1');
 assert.equal(successions(w).length,0);assert.deepEqual(candidates(w),[{id:father.id,reason:null}]);
 assert.equal(choose(w,father.id).changed,true);assert.deepEqual(w.protagonist.lineage,['b1',father.id]);validateWorld(w);
});

test('concurrent IndexedDB choices commit one winner and persist one ledger row',async()=>{
 const {w,chosen}=choiceFixture(),other=resident(w),opened=token(w),indexedDB=new IDBFactory();
 await raw(indexedDB,w);const a=await openGameStore({indexedDB}),b=await openGameStore({indexedDB});
 const results=[];
 try{
  const [first,second]=await Promise.all([
   a.transact(fresh=>{results.push(chooseFamilyProtagonist(fresh,chosen.id,opened,NOW+DAY));return fresh;}),
   b.transact(fresh=>{results.push(chooseFamilyProtagonist(fresh,other.id,opened,NOW+DAY));return fresh;}),
  ]);
  assert.equal(results.filter(result=>result.changed).length,1);assert.equal(results.filter(result=>result.reason==='stale').length,1);
  assert.deepEqual(first,second);assert.equal(getProtagonistId(first),chosen.id);
  const saved=await raw(indexedDB);assert.deepEqual(saved,first);assert.equal(saved.protagonist.familySelections.length,1);
  assert.equal(successions(saved).length,1);assert.deepEqual(parseSave(serializeWorld(saved)),saved);
 }finally{a.close();b.close();}
});

test('a failed store transaction rolls back the succession, ledger, event and revision together',async()=>{
 const {w,chosen}=choiceFixture(),indexedDB=new IDBFactory();await raw(indexedDB,w);
 const store=await openGameStore({indexedDB});
 try{
  await assert.rejects(store.transact(fresh=>{assert.equal(choose(fresh,chosen.id).changed,true);fresh.economy.gold=-1;return fresh;}));
  assert.deepEqual(await raw(indexedDB),w);
  const saved=await store.transact(fresh=>{assert.equal(choose(fresh,chosen.id).changed,true);return fresh;});
  assert.equal(saved.protagonist.familySelections.length,1);assert.equal(successions(saved).length,1);
 }finally{store.close();}
});

test('whole-save replacement invalidates an earlier family choice token',()=>{
 const {w,chosen}=choiceFixture(),opened=token(w);
 const replacement=prepareWorldReplacement(w,w,NOW+2*DAY,'replacement-family-world'),before=clone(replacement);
 assert.equal(chooseFamilyProtagonist(replacement,chosen.id,opened,NOW+2*DAY).reason,'stale');assert.deepEqual(replacement,before);
 assert.equal(choose(replacement,chosen.id).changed,true);validateWorld(replacement);
});

test('explicit succession preserves currency, RNG, bird IDs, graves, relationships and prior records',()=>{
 const {w,chosen}=choiceFixture();w.economy.gold=w.economy.lifetimeGold=80;
 chosen.relations.b1={affection:80,trust:70,compatibility:90,meetings:5,lastTick:w.tick};
 chosen.memories.push({kind:'play',otherId:'b1',tick:w.tick});
 lifeStatus(w,'b1').incenseCount=1;lifeStatus(w,'b1').lastIncenseAt=NOW+DAY;
 w.encounters.gardenFriends.companions=['b1'];const before=clone(w);
 assert.equal(choose(w,chosen.id).changed,true);
 for(const key of ['seed','nextId','tick','epoch','lastUpdated','economy','decor','gems','lifecycle','careSchedule'])assert.deepEqual(w[key],before[key],key);
 assert.deepEqual(w.events.slice(0,-1),before.events);assert.equal(w.nextEvent,before.nextEvent+1);assert.equal(w.revision,before.revision+1);
 assert.deepEqual(w.encounters.gardenFriends.companions,[chosen.id]);
 for(const bird of w.birds){
  const old=before.birds.find(previous=>previous.id===bird.id),expected=clone(old);
  expected.memories.push({kind:'succession',otherId:bird.id==='b1'?chosen.id:'b1',tick:w.tick});
  assert.deepEqual(bird,expected);
 }
 const row=w.protagonist.familySelections[0];assert.equal(row.at,w.lifecycle.seenAt);
 assert.equal(row.at,successions(w)[0].at,'journal and ledger retain the same real lifecycle timestamp');
 validateWorld(w);
});

test('later children inherit automatically, then another childless generation can choose family',()=>{
 const {w,chosen}=choiceFixture();assert.equal(choose(w,chosen.id).changed,true);
 const mother=resident(w,{sex:'female'});w.tick=10;
 const child=resident(w,{sex:'male',parents:[mother.id,chosen.id],generation:1});
 die(w,chosen.id,NOW+DAY);assert.equal(getProtagonistId(w),child.id);
 assert.deepEqual(w.protagonist.familySelections,[{fromId:'b1',toId:chosen.id,tick:0,at:NOW+DAY}]);
 // Keep the remaining generation fed before the third real day; this is not a succession reward.
 for(const bird of w.birds.filter(bird=>isAlive(w,bird)&&bird.home==='resident'))lifeStatus(w,bird).lastCareAt=NOW+2*DAY;
 die(w,child.id,NOW+2*DAY);assert.equal(getProtagonistId(w),child.id);
 assert.equal(choose(w,mother.id).changed,true);
 assert.deepEqual(w.protagonist.lineage,['b1',chosen.id,child.id,mother.id]);
 assert.deepEqual(w.protagonist.familySelections,[
  {fromId:'b1',toId:chosen.id,tick:0,at:NOW+DAY},
  {fromId:child.id,toId:mother.id,tick:10,at:NOW+3*DAY},
 ]);
 assert.equal(successions(w).length,3);assert.deepEqual(parseSave(serializeWorld(w)),w);
});

for(const dead of [false,true])test(`v9 ${dead?'dead childless':'living'} protagonist migration only adds the new schema and empty ledger`,()=>{
 const w=world();resident(w);if(dead)die(w);const old=oldV9(w),before=clone(old);
 const migrated=readCompatibleWorld(old,NOW+100*DAY),expected=clone(before);
 expected.version=18;expected.leafEvent={version:1,entry:null};expected.collectionEndings=clone(migrated.collectionEndings);expected.careRules=clone(migrated.careRules);expected.away={version:1,seenAt:null,lastDay:null,readDay:null,reports:[]};for(const growthBird of [...expected.birds,...(expected.archive||[])])growthBird.growthPace='legacy';expected.economy.version=2;expected.economy.household=structuredClone(migrated.economy.household);expected.archive=[];expected.journal=migrated.journal;expected.clock=migrated.clock;for(const e of expected.events)e.at=expected.epoch+e.tick*15000;expected.decor.duplicateStreaks=Object.fromEntries(Object.keys(expected.decor.equipped).map(id=>[id,0]));expected.protagonist.version=2;expected.protagonist.familySelections=[];
 assert.deepEqual(migrated,expected);assert.deepEqual(old,before);assert.equal(getProtagonistId(migrated),'b1');
 assert.deepEqual(migrated.lifecycle,before.lifecycle);assert.deepEqual(migrated.events,before.events);validateWorld(migrated);
});

test('v9 strict validation rejects forged unrelated lineages instead of laundering them into a ledger',()=>{
 const {w,chosen}=choiceFixture();assert.equal(choose(w,chosen.id).changed,true);
 for(const retainedEvent of [true,false]){
  const old=oldV9(w);if(!retainedEvent)pruneSuccession(old);const before=clone(old);
  assert.throws(()=>readCompatibleWorld(old,NOW+DAY));assert.deepEqual(old,before);
 }
 const old=oldV9(world());old.protagonist.familySelections=[];const before=clone(old);
 assert.throws(()=>readCompatibleWorld(old));assert.deepEqual(old,before);
});

test('v9 automatic child lineage and lifecycle migrate unchanged with no manual row',()=>{
 const w=world(),father=resident(w),child=resident(w,{parents:['b1',father.id],generation:1});die(w);
 const old=oldV9(w),before=clone(old),migrated=readCompatibleWorld(old,NOW+100*DAY);
 assert.equal(getProtagonistId(migrated),child.id);assert.deepEqual(migrated.protagonist.lineage,before.protagonist.lineage);
 assert.deepEqual(migrated.protagonist.familySelections,[]);assert.deepEqual(oldV9(migrated),before);assert.deepEqual(old,before);
});

test('concurrent readers durably migrate a v9 save without selecting an unrelated resident',async()=>{
 const {w}=choiceFixture(),old=oldV9(w),before=clone(old),indexedDB=new IDBFactory();await raw(indexedDB,old);
 const a=await openGameStore({indexedDB}),b=await openGameStore({indexedDB});
 try{
  const [x,y]=await Promise.all([a.transact(fresh=>fresh),b.transact(fresh=>fresh)]);
  assert.deepEqual(x,y);assert.equal(x.version,18);assert.equal(getProtagonistId(x),'b1');
  assert.deepEqual(x.protagonist.familySelections,[]);assert.deepEqual(await raw(indexedDB),x);assert.deepEqual(old,before);
 }finally{a.close();b.close();}
});

test('malformed family ledgers fail closed without mutating the supplied save',()=>{
 const {w,chosen}=choiceFixture();w.tick=10;assert.equal(choose(w,chosen.id).changed,true);w.tick=20;
 const mutations=[
  ['missing ledger',bad=>delete bad.protagonist.familySelections],
  ['nonarray ledger',bad=>bad.protagonist.familySelections={}],
  ['missing transition row',bad=>bad.protagonist.familySelections=[]],
  ['extra protagonist key',bad=>bad.protagonist.extra=true],
  ['old protagonist version',bad=>bad.protagonist.version=1],
  ['null row',bad=>bad.protagonist.familySelections=[null]],
  ['missing timestamp',bad=>delete bad.protagonist.familySelections[0].at],
  ['extra row field',bad=>bad.protagonist.familySelections[0].reason='family'],
  ['unknown predecessor',bad=>bad.protagonist.familySelections[0].fromId='b999'],
  ['unknown successor',bad=>bad.protagonist.familySelections[0].toId='b999'],
  ['reversed edge',bad=>{bad.protagonist.familySelections[0].fromId=chosen.id;bad.protagonist.familySelections[0].toId='b1';}],
  ['duplicate row',bad=>bad.protagonist.familySelections.push(clone(bad.protagonist.familySelections[0]))],
  ['future tick',bad=>bad.protagonist.familySelections[0].tick=21],
  ['negative tick',bad=>bad.protagonist.familySelections[0].tick=-1],
  ['fractional tick',bad=>bad.protagonist.familySelections[0].tick=10.5],
  ['non-numeric tick',bad=>bad.protagonist.familySelections[0].tick='10'],
  ['before predecessor death',bad=>bad.protagonist.familySelections[0].at=NOW+DAY-1],
  ['future timestamp',bad=>bad.protagonist.familySelections[0].at=bad.lifecycle.seenAt+1],
  ['fractional timestamp',bad=>bad.protagonist.familySelections[0].at+=0.5],
  ['living predecessor',bad=>{lifeStatus(bad,'b1').death=null;bad.birds[0].home='resident';}],
  ['event tick disagrees with ledger',bad=>{const event=successions(bad)[0];event.tick=11;event.at=bad.epoch+11*TICK_MS;}],
 ];
 for(const [label,mutate] of mutations){const bad=clone(w);mutate(bad);const before=clone(bad);assert.throws(()=>validateWorld(bad),label);assert.deepEqual(bad,before,label);}
 validateWorld(w);
});

test('ledger tick cannot precede the selected birds birth even after its succession event is pruned',()=>{
 const w=world();die(w);w.tick=10;const chosen=resident(w);assert.equal(choose(w,chosen.id).changed,true);
 pruneSuccession(w);w.protagonist.familySelections[0].tick=9;const before=clone(w);
 assert.throws(()=>validateWorld(w));assert.deepEqual(w,before);
});

test('a retained succession event must match the ledger predecessor and cannot appear twice',()=>{
 const {w,chosen}=choiceFixture(),other=resident(w);assert.equal(choose(w,chosen.id).changed,true);
 for(const mutate of [
  bad=>successions(bad)[0].ids[0]=other.id,
  bad=>{const event=clone(successions(bad)[0]);event.id=`e${bad.nextEvent++}`;bad.events.push(event);},
 ]){const bad=clone(w);mutate(bad);const before=clone(bad);assert.throws(()=>validateWorld(bad));assert.deepEqual(bad,before);}
});

test('each nonchild edge needs its own ordered adjacent ledger row, including after event pruning',()=>{
 const {w,chosen}=choiceFixture(),next=resident(w);assert.equal(choose(w,chosen.id).changed,true);
 w.tick=10;die(w,chosen.id,NOW+DAY);assert.equal(choose(w,next.id).changed,true);pruneSuccession(w);validateWorld(w);
 for(const mutate of [
  bad=>bad.protagonist.familySelections.shift(),
  bad=>bad.protagonist.familySelections.pop(),
  bad=>bad.protagonist.familySelections.reverse(),
  bad=>bad.protagonist.familySelections[1].fromId='b1',
  bad=>bad.protagonist.familySelections[1].tick=0,
  bad=>bad.protagonist.familySelections[1].at=NOW+DAY-1,
 ]){const bad=clone(w);mutate(bad);const before=clone(bad);assert.throws(()=>validateWorld(bad));assert.deepEqual(bad,before);}
 assert.deepEqual(parseSave(serializeWorld(w)),w);
});

test('automatic child edges cannot be mislabeled as explicit family selections',()=>{
 const w=world(),father=resident(w),child=resident(w,{parents:['b1',father.id],generation:1});die(w);
 w.protagonist.familySelections=[{fromId:'b1',toId:child.id,tick:w.tick,at:w.lifecycle.seenAt}];
 const before=clone(w);assert.throws(()=>validateWorld(w));assert.deepEqual(w,before);
});

test('the durable ledger survives normal diary and memory pruning',()=>{
 const {w,chosen}=choiceFixture();assert.equal(choose(w,chosen.id).changed,true);const ledger=clone(w.protagonist.familySelections);
 for(let i=0;i<LIMITS.events+1;i++){
  w.tick++;chosen.needs.food=40;assert.equal(feedBird(w,chosen.id,NOW+DAY,economyToken(w)).changed,true);
 }
 assert.equal(w.events.length,LIMITS.events);assert.equal(successions(w).length,0);
 assert.ok(!chosen.memories.some(memory=>memory.kind==='succession'));
 assert.deepEqual(w.protagonist.familySelections,ledger);assert.deepEqual(parseSave(serializeWorld(w)),w);validateWorld(w);
});

test('historical family selection remains valid after membership evidence disappears and the chosen bird dies',()=>{
 const {w,chosen}=choiceFixture();assert.equal(choose(w,chosen.id).changed,true);const ledger=clone(w.protagonist.familySelections);
 // Its resident status was sufficient at choice time. Death removes that status.
 assert.deepEqual(chosen.parents,[]);assert.deepEqual(chosen.milestones,[]);
 die(w,chosen.id,NOW+DAY);assert.equal(chosen.home,'departed');assert.equal(getProtagonistId(w),chosen.id);
 assert.deepEqual(w.protagonist.familySelections,ledger);pruneSuccession(w);
 assert.deepEqual(parseSave(serializeWorld(w)),w);validateWorld(w);
});

for(const dead of [false,true])test(`restore ${dead?'after':'before'} the selected birds death preserves historical ledger timestamps exactly`,()=>{
 const {w,chosen}=choiceFixture();assert.equal(choose(w,chosen.id).changed,true);
 w.economy.gold=w.economy.lifetimeGold=31;if(dead)die(w,chosen.id,NOW+DAY);
 const source=clone(w),ledger=clone(w.protagonist.familySelections);
 const restored=prepareWorldReplacement(world(),w,NOW+10*DAY,`restored-family-${dead}`);
 assert.deepEqual(w,source);assert.deepEqual(restored.protagonist,w.protagonist);
 assert.deepEqual(restored.protagonist.familySelections,ledger);assert.equal(restored.lifecycle.seenAt,NOW+10*DAY);
 assert.equal(restored.economy.gold,31);assert.deepEqual(lifeStatus(restored,'b1').death,lifeStatus(w,'b1').death);
 assert.deepEqual(lifeStatus(restored,chosen.id).death,lifeStatus(w,chosen.id).death);
 advanceTo(restored,NOW+10*DAY);assert.equal(isAlive(restored,chosen),!dead);
 assert.deepEqual(restored.protagonist.familySelections,ledger);assert.deepEqual(parseSave(serializeWorld(restored)),restored);
});

test('a retained chosen-bird death cannot be earlier than its historical selection',()=>{
 const {w,chosen}=choiceFixture();w.tick=10;assert.equal(choose(w,chosen.id).changed,true);w.tick=20;die(w,chosen.id,NOW+DAY);
 for(const mutate of [bad=>lifeStatus(bad,chosen.id).death.at=NOW+DAY-1,bad=>lifeStatus(bad,chosen.id).death.tick=9]){
  const bad=clone(w);mutate(bad);const before=clone(bad);assert.throws(()=>validateWorld(bad));assert.deepEqual(bad,before);
 }
});

test('a rolled-back wall clock cannot backdate a family selection before the predecessor died',()=>{
 const {w,chosen}=choiceFixture();assert.equal(choose(w,chosen.id,NOW).changed,true);
 assert.equal(w.protagonist.familySelections[0].at,NOW+DAY);assert.equal(w.lifecycle.seenAt,NOW+DAY);validateWorld(w);
});
