import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createWorld,createBird,advanceTicks,advanceTo,travelTo,fieldBirds,inviteFriend,drawDecoration,equipDecoration,decorLevel,decorOdds,DECOR_SLOTS,DECOR_COLORS,DECOR_TIERS,parseSave,serializeWorld,validateWorld,readCompatibleWorld,isRelated} from '../src/engine.js';
const clone=structuredClone;
function v2(w){const x=clone(w);x.version=2;delete x.field;delete x.decor;delete x.gems;delete x.careSchedule;for(const b of x.birds){delete b.gemCare;delete b.naming;}return x;}
test('v1 and v2 migrate purely preserving every old field, with one welcome gift',()=>{
 const old=v2(createWorld(100));advanceTicks(old,0);const before=JSON.stringify(old),m=readCompatibleWorld(old);
 assert.equal(m.version,5);assert.deepEqual(v2(m),old);assert.equal(JSON.stringify(old),before);assert.equal(m.decor.points,20);assert.equal(m.decor.inventory.length,9);
 for(let i=0;i<4;i++)assert.deepEqual(parseSave(serializeWorld(m)),m);
 const legacy=JSON.parse(readFileSync(new URL('./fixtures/v1-world.json',import.meta.url)));const upgraded=readCompatibleWorld(legacy);assert.equal(upgraded.version,5);assert.deepEqual(upgraded.events,legacy.events);assert.deepEqual(upgraded.birds.map(b=>b.name),legacy.birds.map(b=>b.name));
});
test('travel is real co-presence, roundtrip is idempotent, and young stay home',()=>{
 const w=createWorld(100);advanceTicks(w,1);const friend=w.birds[1];const egg=createBird(w,{stage:'egg',home:'resident'});
 assert.ok(fieldBirds(w).includes(egg));travelTo(w,'park');assert.ok(!fieldBirds(w).includes(egg));assert.ok(fieldBirds(w).includes(friend));
 travelTo(w,'friend',friend.id);assert.ok(fieldBirds(w).includes(w.birds[0]));assert.ok(fieldBirds(w).includes(friend));assert.ok(!fieldBirds(w).includes(egg));
 assert.equal(travelTo(w,'friend',friend.id).changed,false);travelTo(w,'home');assert.ok(fieldBirds(w).includes(egg));assert.equal(travelTo(w,'home').changed,false);validateWorld(w);
 assert.throws(()=>travelTo(w,'friend','missing'));assert.throws(()=>travelTo(w,'friend',egg.id));
});
test('departed friends can be visited and invited once without duplicating birds or resetting visits',()=>{
 const w=createWorld(100);advanceTicks(w,1);const b=w.birds[1];b.home='departed';travelTo(w,'friend',b.id);const n=w.birds.length;assert.ok(fieldBirds(w).includes(b));
 assert.equal(inviteFriend(w,b.id).changed,true);const arrived=b.arrivedTick;assert.equal(inviteFriend(w,b.id).changed,false);assert.equal(b.arrivedTick,arrived);assert.equal(w.birds.length,n);travelTo(w,'home');validateWorld(w);
});
test('selected-slot draw has deterministic finite outcomes, cooldown and atomic insufficient-points failure',()=>{
 const a=createWorld(100),b=clone(a);const r=drawDecoration(a,'swing');assert.deepEqual(drawDecoration(b,'swing'),r);assert.equal(r.item.slot,'swing');assert.deepEqual(a,b);
 const snapshot=clone(a);assert.equal(drawDecoration(a,'toy').changed,false);assert.deepEqual(a,snapshot);
 advanceTicks(a,1);const poor=clone(a);poor.decor.points=0;const before=clone(poor);assert.throws(()=>drawDecoration(poor,'toy'));assert.deepEqual(poor,before);
 assert.throws(()=>drawDecoration(a,'bad'));assert.equal(equipDecoration(a,r.item.id).changed,r.item.id!==snapshot.decor.equipped.swing);assert.equal(equipDecoration(a,r.item.id).changed,false);assert.throws(()=>equipDecoration(a,'bad'));validateWorld(a);
});
test('catalog, level thresholds and disclosed probabilities match tier draws; colors are diverse',()=>{
 assert.equal(DECOR_SLOTS.length,9);assert.equal(DECOR_COLORS.length,8);assert.equal(DECOR_TIERS.length,3);
 const w=createWorld(100);assert.equal(decorLevel(w),1);assert.deepEqual(decorOdds(w),[{tierId:'cozy',probability:1}]);w.decor.lifetimePoints=160;assert.equal(decorLevel(w),3);assert.deepEqual(decorOdds(w).map(x=>x.probability),[.65,.35]);w.decor.lifetimePoints=400;assert.equal(decorLevel(w),6);assert.deepEqual(decorOdds(w).map(x=>x.probability),[.65,.25,.1]);
 const seen=new Set();w.decor.points=w.decor.lifetimePoints=100000;
 for(let i=0;i<2000;i++){w.tick++;const r=drawDecoration(w,DECOR_SLOTS[i%9].id);seen.add(r.item.color);assert.ok(w.decor.inventory.length<=216);}
 assert.equal(seen.size,8);assert.ok(w.decor.inventory.some(x=>x.tier==='special'));validateWorld(w);
});
test('points advance with social and family life, never replay on paused time or import',()=>{
 const w=createWorld(100);advanceTicks(w,300);assert.ok(w.decor.lifetimePoints>20);assert.ok(w.birds.some(b=>b.parents.length));
 const pts=w.decor.points;w.paused=true;advanceTicks(w,100);assert.equal(w.decor.points,pts);const m=parseSave(serializeWorld(w));assert.equal(m.decor.points,pts);advanceTo(m,m.lastUpdated);assert.equal(m.decor.points,pts);validateWorld(m);
});
test('long male visits build mutual relationships then pair, hatch and grow without bypassing kinship',()=>{
 const w=createWorld(100);advanceTicks(w,1);const male=w.birds[1];assert.equal(male.sex,'male');assert.equal(male.home,'visitor');const start=male.arrivedTick;
 advanceTicks(w,250);const female=w.birds[0];assert.ok(female.partner);assert.ok(female.pairTick-start>=16);assert.ok(!isRelated(w,female.id,female.partner));assert.ok(w.birds.some(b=>b.parents.includes(female.id)&&b.stage!=='egg'));validateWorld(w);
});
test('v3 invalid fields fail closed without source mutation or getter execution',()=>{
 for(const change of [w=>w.field.place='internet',w=>w.field.hostId='b2',w=>w.decor.points=-1,w=>w.decor.points=1.5,w=>w.decor.inventory.push(w.decor.inventory[0]),w=>w.decor.equipped.toy='perch-mint-cozy',w=>w.decor.inventory[0].tier='special',w=>w.decor.lastDrawTick=w.tick+1,w=>w.decor.extra=true]){
 const w=createWorld(100);change(w);const before=JSON.stringify(w);assert.throws(()=>validateWorld(w));assert.equal(JSON.stringify(w),before);}
 const w=createWorld(100);let touched=false;Object.defineProperty(w.decor,'points',{get(){touched=true;return 20;},enumerable:true});assert.throws(()=>validateWorld(w));assert.equal(touched,false);
});
test('visiting a friend does not develop relationships with absent home visitors',()=>{
 const w=createWorld(100);advanceTicks(w,1);const visitor=w.birds[1];const host=createBird(w,{home:'departed',sex:'male'});travelTo(w,'friend',host.id);
 const prior=clone(w.birds[0].relations[visitor.id]||null);advanceTicks(w,8);assert.deepEqual(w.birds[0].relations[visitor.id]||null,prior);assert.ok(w.birds[0].relations[host.id]);validateWorld(w);
});
