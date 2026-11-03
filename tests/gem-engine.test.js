import test from 'node:test';
import assert from 'node:assert/strict';
import {IDBFactory} from 'fake-indexeddb';
import {readFileSync} from 'node:fs';
import * as old from './fixtures/engine-v3.js';
import {createWorld,createBird,advanceTicks,advanceTo,feedBird as feed,petBird as pet,talkToBird as talk,collectDropping,travelTo,validateWorld,parseSave,serializeWorld,readCompatibleWorld,GEM_RULES,TICK_MS} from '../src/engine.js';
import {openGameStore} from '../src/game-store.js';
const clone=structuredClone;
const feedBird=(w,id)=>feed(w,id,100),petBird=(w,id)=>pet(w,id,100),talkToBird=(w,id,text)=>talk(w,id,text,100);
const strip=w=>{const x=clone(w);x.version=3;delete x.gems;delete x.careSchedule;delete x.encounters;delete x.economy;delete x.adoption;delete x.settings.adoptionMode;for(const b of x.birds){delete b.gemCare;delete b.naming;}return x;};
function ready(){const w=createWorld(100);feedBird(w,'b1');advanceTicks(w,2);assert.equal(w.gems.droppings.length,1);return w;}
test('v3 migration is pure additive and preserves all balances inventory names care histories',()=>{
 const legacy=old.createWorld(100);old.advanceTicks(legacy,300);legacy.paused=true;legacy.birds[0].name='大切なおもち';old.drawDecoration(legacy,'swing');const before=clone(legacy),w=readCompatibleWorld(legacy);
 assert.equal(w.version,7);assert.deepEqual(strip(w),legacy);assert.deepEqual(legacy,before);assert.deepEqual(w.gems,{droppings:[],nextDropId:1});assert.ok(w.birds.every(b=>Object.values(b.gemCare).every(v=>v===null)));
 for(let i=0;i<4;i++)assert.deepEqual(parseSave(serializeWorld(w)),w);
});
test('v1 and v2 migrate without losing legacy state or giving extra welcome Gems',()=>{
 const v1=JSON.parse(readFileSync(new URL('./fixtures/v1-world.json',import.meta.url)));const one=readCompatibleWorld(v1);assert.equal(one.version,7);assert.deepEqual(one.events,v1.events);assert.equal(one.decor.points,20);
 const v2=old.createWorld(100);v2.version=2;delete v2.field;delete v2.decor;const two=readCompatibleWorld(v2);assert.deepEqual(two.birds.map(b=>{const x=clone(b);delete x.gemCare;delete x.naming;return x;}),v2.birds);assert.equal(two.decor.points,20);
});
test('feed pet and meaningful chat earn bounded Gems until their real-window bars are full',()=>{
 const w=createWorld(100);w.birds[0].needs.energy=60;const start=w.decor.points;
 assert.equal(feedBird(w,'b1').gemAward,6);assert.equal(petBird(w,'b1').gemAward,5);assert.equal(talkToBird(w,'b1','こんにちは').gemAward,5);assert.equal(w.decor.points,start+16);
 for(let i=0;i<20;i++){assert.equal(feedBird(w,'b1').gemAward,0);assert.equal(petBird(w,'b1').gemAward,0);assert.equal(talkToBird(w,'b1','こんにちは').gemAward,0);}assert.equal(w.decor.points,start+16);
 advanceTicks(w,20);assert.equal(feedBird(w,'b1').gemAward,0);assert.equal(petBird(w,'b1').gemAward,0);validateWorld(w);
});
test('nonempty natural words award without hidden vocabulary penalty; empty young departed do not',()=>{
 const w=createWorld(100);assert.equal(talkToBird(w,'b1','').gemAward,0);assert.equal(talkToBird(w,'b1','今日の空はきれいだね').gemAward,5);w.birds[0].needs.food=100;assert.equal(feedBird(w,'b1').gemAward,0);
 for(const stage of ['egg','chick']){const b=createBird(w,{home:'resident',stage});assert.equal(talkToBird(w,b.id,'こんにちは').gemAward,0);}
 const away=createBird(w,{home:'departed'});assert.equal(talkToBird(w,away.id,'こんにちは').gemAward,0);validateWorld(w);
});
test('full meal schedules delayed natural dropping, collection cleans and rewards exactly once',()=>{
 const w=createWorld(100);feedBird(w,'b1');assert.equal(w.gems.droppings.length,0);advanceTicks(w,1);assert.equal(w.gems.droppings.length,0);advanceTicks(w,1);const [drop]=w.gems.droppings;assert.equal(drop.birdId,'b1');assert.equal(drop.createdTick,2);assert.equal(drop.location,'home');
 const before=w.decor.points;const result=collectDropping(w,drop.id);assert.equal(result.changed,true);assert.equal(result.gemAward,8);assert.equal(w.gems.droppings.length,0);assert.equal(w.decor.points,before+8);const saved=clone(w);for(let i=0;i<30;i++)assert.equal(collectDropping(w,drop.id).gemAward,0);assert.deepEqual(w,saved);validateWorld(w);
});
test('home collection cannot run remotely and no direct-care click creates instant drops',()=>{
 const w=ready(),id=w.gems.droppings[0].id;travelTo(w,'park');const before=clone(w);assert.equal(collectDropping(w,id).changed,false);assert.deepEqual(w,before);travelTo(w,'home');assert.equal(collectDropping(w,id).gemAward,8);
 const x=createWorld(100);petBird(x,'b1');talkToBird(x,'b1','こんにちは');assert.equal(x.gems.droppings.length,0);
});
test('pause and offline are deterministic, bounded and never auto-collect or punish birds',()=>{
 const w=ready();w.paused=true;const gems=clone(w.gems),points=w.decor.points;advanceTicks(w,100);assert.deepEqual(w.gems,gems);assert.equal(w.decor.points,points);w.paused=false;
 const a=clone(w),b=clone(w);advanceTo(a,100+TICK_MS*1000);advanceTo(b,100+TICK_MS*1000);assert.deepEqual(a,b);assert.ok(a.gems.droppings.length<=12);assert.equal(new Set(a.gems.droppings.map(d=>d.birdId)).size,a.gems.droppings.length);assert.ok(a.gems.droppings.some(d=>d.id===gems.droppings[0].id));validateWorld(a);
});
test('new real-care simulation is deterministic with bounded Gems and stable food/energy',()=>{
 for(const seed of [842911,19,420]){const a=createWorld(100,seed),b=createWorld(100,seed);advanceTicks(a,1500,100);advanceTicks(b,1500,100);assert.deepEqual(a,b);assert.equal(a.birds[0].needs.food,80);assert.equal(a.birds[0].needs.energy,80);validateWorld(a);}
});
test('malformed or duplicate dropping saves fail closed without mutation',()=>{
 for(const change of [w=>w.gems.droppings.push(clone(w.gems.droppings[0])),w=>w.gems.droppings[0].id='drop-01',w=>w.gems.droppings[0].birdId='missing',w=>w.gems.droppings[0].location='park',w=>w.gems.droppings[0].createdTick=0,w=>w.gems.nextDropId=1,w=>w.gems.extra=3,w=>w.birds[0].gemCare.lastChatTick=w.tick+1,w=>delete w.birds[0].gemCare,w=>w.version=6]){
 const w=ready();change(w);const before=JSON.stringify(w);assert.throws(()=>readCompatibleWorld(w));assert.equal(JSON.stringify(w),before);}
 const w=ready();let called=false;Object.defineProperty(w.gems,'droppings',{enumerable:true,get(){called=true;return [];}});assert.throws(()=>readCompatibleWorld(w));assert.equal(called,false);
});
test('simultaneous saved collections and care commit once across tabs',async()=>{
 const indexedDB=new IDBFactory(),a=await openGameStore({indexedDB}),b=await openGameStore({indexedDB});const w=ready(),id=w.gems.droppings[0].id;w.paused=true;await a.transact(()=>w);const results=[];
 await Promise.all(Array.from({length:30},(_,i)=>(i%2?a:b).transact(world=>{results.push(collectDropping(world,id));return world;})));
 assert.equal(results.filter(r=>r.changed).length,1);assert.equal((await a.transact(w=>w)).decor.points,w.decor.points+8);assert.equal((await b.transact(w=>w)).gems.droppings.length,0);a.close();b.close();
});
test('stale revision collection after snapshot rollback or another update rejects without mutation',()=>{
 const w=ready(),snapshot=serializeWorld(w),id=w.gems.droppings[0].id,observed=w.revision;collectDropping(w,id,observed);const restored=parseSave(snapshot);restored.revision=w.revision+1;const before=clone(restored);
 assert.equal(collectDropping(restored,id,observed).changed,false);assert.deepEqual(restored,before);assert.equal(collectDropping(restored,id,restored.revision).gemAward,8);
 // A user-requested snapshot import intentionally restores its balance too;
 // there is no backend/permanent claim ledger, and replay is never additive.
 assert.equal(restored.decor.points,w.decor.points);validateWorld(restored);
});
test('pending drops stay bounded per bird and globally while normal collection resumes generation',()=>{
 const w=createWorld(100);while(w.birds.length<12)createBird(w,{home:w.birds.length<10?'resident':'visitor'});for(const b of w.birds)feedBird(w,b.id);advanceTicks(w,2);assert.equal(w.gems.droppings.length,12);
 for(const b of w.birds)b.home='departed';const newcomer=createBird(w,{home:'resident'});feedBird(w,newcomer.id);advanceTicks(w,2);assert.equal(w.gems.droppings.length,12);assert.ok(!w.gems.droppings.some(d=>d.birdId===newcomer.id));
 collectDropping(w,w.gems.droppings[0].id);advanceTicks(w,1);assert.equal(w.gems.droppings.length,12);assert.ok(w.gems.droppings.some(d=>d.birdId===newcomer.id));validateWorld(w);
});
test('Gem cap is safe and cleaning still works without phantom awarded amount',()=>{
 const w=ready();w.decor.points=w.decor.lifetimePoints=1000000000;const r=collectDropping(w,w.gems.droppings[0].id);assert.equal(r.changed,true);assert.equal(r.gemAward,0);assert.equal(w.gems.droppings.length,0);assert.equal(petBird(w,'b1').gemAward,0);assert.equal(talkToBird(w,'b1','こんにちは').gemAward,0);validateWorld(w);
});
