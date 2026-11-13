import {stripGrowthPace} from './fixtures/growth-legacy.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {IDBFactory} from 'fake-indexeddb';
import * as old from './fixtures/engine-v4.js';
import * as engine from '../src/engine.js';
import {openGameStore} from '../src/game-store.js';
const now=Date.UTC(2026,10,2,0),clone=structuredClone;
function projection(w){const x=clone(w);x.version=4;stripGrowthPace(x);for(const k of ['clock','archive','journal'])delete x[k];for(const e of x.events)e.at=x.epoch+e.tick*15000;delete x.decor?.duplicateStreaks;delete x.careSchedule;delete x.encounters;delete x.economy;delete x.lifecycle;delete x.protagonist;delete x.adoption;delete x.settings.adoptionMode;for(const b of x.birds)delete b.naming;return x;}
test('v4 migration retains every existing value including ambiguous numbered and spaced legacy names',()=>{
 const w=old.createWorld(now);old.advanceTicks(w,300);w.birds[0].name=' おもち7 ';w.birds[1].name='そら2';w.birds[0].needs.food=20;const before=clone(w);
 const next=engine.readCompatibleWorld(w,now+10000);assert.equal(next.version,17);assert.deepEqual(projection(next),w);assert.deepEqual(w,before);assert.equal(next.careSchedule.seenAt,now+10000);assert.ok(next.birds.every(b=>b.naming.source==='legacy'));
 assert.deepEqual(engine.parseSave(engine.serializeWorld(next)),next);const bad=clone(w);bad.birds[0].naming={source:'manual'};assert.throws(()=>engine.readCompatibleWorld(bad));
 const invalid=clone(next);invalid.birds[0].naming.assignedName='別名';assert.throws(()=>engine.validateWorld(invalid));
});
test('care fills shared real-window bars, not fast ticks, and one meal arms only one dropping',()=>{
 const w=engine.createWorld(now),b=w.birds[0];b.needs.food=40;b.needs.energy=40;const gems=w.decor.points;
 for(const award of [6,4,0])assert.equal(engine.feedBird(w,b.id,now).gemAward,award);
 assert.equal(engine.petBird(w,b.id,now).gemAward,0);assert.equal(engine.talkToBird(w,b.id,b.name,now).gemAward,0);assert.equal(engine.talkToBird(w,b.id,'いい天気',now).gemAward,0);
 for(let i=0;i<30;i++){assert.equal(engine.feedBird(w,b.id,now).gemAward,0);assert.equal(engine.petBird(w,b.id,now).gemAward,0);assert.equal(engine.talkToBird(w,b.id,'おやすみ',now).gemAward,0);}
 assert.equal(w.decor.points,gems+10);engine.advanceTicks(w,100);assert.equal(b.needs.food,100);assert.equal(b.needs.energy,100);assert.equal(w.gems.droppings.filter(d=>d.birdId===b.id).length,1);
 engine.collectDropping(w,w.gems.droppings.find(d=>d.birdId===b.id).id,w.revision);engine.advanceTicks(w,100);assert.equal(w.gems.droppings.filter(d=>d.birdId===b.id).length,0);engine.validateWorld(w);
 w.paused=true;engine.advanceTo(w,now+8*3600000);assert.equal(b.needs.food,90);assert.equal(b.needs.energy,90);engine.advanceTo(w,now+8*3600000);assert.equal(b.needs.energy,90);
});
test('IDB concurrent care pays exactly the remaining shared bar and persists clock-only sync',async()=>{
 const platform={indexedDB:new IDBFactory(),navigator:{}};const a=await openGameStore(platform),b=await openGameStore(platform);await a.transact(()=>engine.createWorld(now));
 let awards=0;await Promise.all(Array.from({length:30},(_,i)=>(i%2?a:b).transact(w=>{awards+=engine.petBird(w,'b1',now).gemAward;return w;})));assert.equal(awards,5);
 await a.transact(w=>engine.advanceTo(w,now+1000));const saved=await b.transact(w=>w);assert.equal(saved.careSchedule.seenAt,now+1000);assert.equal(saved.birds[0].needs.energy,100);a.close();b.close();
});
test('same-world stale import cannot refill already-earned care and manual egg names never change',()=>{
 const w=engine.createWorld(now),snapshot=clone(w);engine.feedBird(w,'b1',now);engine.petBird(w,'b1',now);engine.reconcileImportedCare(snapshot,w,now);assert.equal(engine.feedBird(snapshot,'b1',now).gemAward,0);assert.equal(engine.petBird(snapshot,'b1',now).gemAward,0);
 const egg=engine.createBird(w,{stage:'egg',home:'resident'});assert.doesNotMatch(egg.name,/\d/);engine.renameBird(w,egg.id,'たまご1');engine.advanceTicks(w,12);assert.equal(egg.name,'たまご1');assert.equal(egg.naming.source,'manual');engine.validateWorld(w);
});
