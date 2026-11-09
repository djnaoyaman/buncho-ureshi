import test from 'node:test';import assert from 'node:assert/strict';
import {createWorld,createBird,advanceTicks,advanceTo,readCompatibleWorld,validateWorld,serializeWorld,parseSave,inviteFriend,talkToBird,TICK_MS,pairProposals,resolvePairProposal,economyToken,canPair,travelTo,fieldBirds} from '../src/engine.js';
import {allBirds} from '../src/world-birds.js';
import {lifeStatus,ageTicks} from '../src/life-care.js';
const now=Date.parse('2026-11-09T00:00:00Z');
test('old clock migration preserves age, names, gauges and exact historical dates once',()=>{
 const old=createWorld(now-3600000);advanceTicks(old,10,now-3600000);old.version=11;delete old.clock;delete old.archive;delete old.journal;for(const e of old.events)e.at=old.epoch+e.tick*15000;
 const before=structuredClone(old),next=readCompatibleWorld(old,now);assert.equal(TICK_MS,60000);assert.deepEqual(old,before);assert.deepEqual(next.birds,before.birds);assert.deepEqual(next.events,before.events);assert.deepEqual(next.lifecycle,before.lifecycle);assert.equal(ageTicks(next,next.birds[0]),10);advanceTo(next,now+60000);assert.equal(next.tick,11);assert.deepEqual(parseSave(serializeWorld(next)),next);
});
test('hundreds of identities no longer exhaust active capacity or natural names',()=>{
 const w=createWorld(now);for(let i=0;i<400;i++)assert.ok(createBird(w,{home:'departed'}));assert.equal(allBirds(w).length,401);assert.ok(w.birds.length<128);assert.ok(w.archive.length>128);assert.equal(new Set(allBirds(w).map(b=>b.name)).size,401);
 const id=w.archive[0].id;inviteFriend(w,id);assert.ok(w.birds.some(b=>b.id===id&&b.home==='visitor'));assert.ok(!w.archive.some(b=>b.id===id));assert.deepEqual(parseSave(serializeWorld(w)),w);
});
test('important diary survives routine logs and family rewards have their own budget',()=>{
 const w=createWorld(now);w.settings.adoptionMode='auto';advanceTicks(w,1000,now);assert.ok(w.journal.some(e=>e.kind==='pair'));assert.ok(w.journal.some(e=>e.kind==='hatch'));assert.equal(w.economy.reserved,30);assert.ok(w.decor.points>50);assert.equal(w.events.length,240);assert.ok(!w.events.some(e=>e.kind==='pair'));validateWorld(w);
});
test('full energy permits a real answer with no additional care reward',()=>{
 const w=createWorld(now);w.birds[0].needs.energy=100;const gems=w.decor.points,gold=w.economy.gold;const r=talkToBird(w,'b1','ともだちは？',now);assert.equal(r.topic,'friend');assert.equal(r.gemAward,0);assert.equal(r.goldAward,0);assert.equal(w.decor.points,gems);assert.equal(w.economy.gold,gold);validateWorld(w);
});
test('absence grows an existing egg without manufacturing visitors',()=>{
 const w=createWorld(now),father=createBird(w,{home:'resident',sex:'male'}),egg=createBird(w,{home:'resident',stage:'egg',parents:['b1',father.id],generation:1});advanceTo(w,now+84*60000);assert.equal(egg.stage,'adult');assert.equal(w.tick,84);assert.equal(allBirds(w).length,3);validateWorld(w);
});
test('real deadline date remains separate from a paused story clock',()=>{
 const w=createWorld(now);w.paused=true;advanceTo(w,now+4*86400000);const death=w.journal.find(e=>e.kind==='death');assert.equal(death.at,now+3*86400000);assert.equal(death.tick,0);validateWorld(w);
});
test('death releases the living partner while preserving the recorded marriage',()=>{
 const w=createWorld(now);w.settings.adoptionMode='auto';advanceTicks(w,20,now);const partner=w.birds.find(b=>b.id===w.birds[0].partner);assert.ok(partner);w.paused=true;lifeStatus(w,partner).condition={kind:'injury',sinceAt:now,deadlineAt:now+86400000};advanceTo(w,now+86400000);assert.equal(w.birds[0].partner,null);assert.ok(w.journal.some(e=>e.kind==='pair'&&e.ids.includes(partner.id)));assert.ok(w.journal.some(e=>e.kind==='death'&&e.ids.includes(partner.id)));validateWorld(w);
});

function widow(){const w=createWorld(now);w.settings.adoptionMode='auto';advanceTicks(w,20,now);const lost=w.birds.find(b=>b.id===w.birds[0].partner);lifeStatus(w,lost).condition={kind:'injury',sinceAt:now,deadlineAt:now+86400000};w.paused=true;advanceTo(w,now+86400000);w.paused=false;for(const b of allBirds(w))if(b.id!=='b1')b.home='departed';const mate=createBird(w,{home:'resident',sex:'male'});return {w,mate,deathTick:lifeStatus(w,lost).death.tick};}
for(const accept of [true,false])test(`widowed pairing requires consent and resolves once ${accept}`,()=>{const {w,mate,deathTick}=widow();w.tick=deathTick;assert.equal(canPair(w,w.birds[0],mate),false);w.tick=deathTick+48;assert.equal(canPair(w,w.birds[0],mate),true);for(const [a,b] of [[w.birds[0],mate],[mate,w.birds[0]]])a.relations[b.id]={affection:95,trust:95,meetings:20,compatibility:90,lastTick:w.tick};for(let i=0;i<200&&!pairProposals(w).length;i++)advanceTicks(w,1,now+86400000);const proposal=pairProposals(w)[0];assert.ok(proposal);assert.equal(mate.partner,null);const before=w.decor.points,token=economyToken(w);assert.equal(resolvePairProposal(w,proposal.id,accept,token).changed,true);assert.equal(mate.partner,accept?'b1':null);assert.equal(w.decor.points,before+(accept?30:0));const after=serializeWorld(w);assert.equal(resolvePairProposal(w,proposal.id,accept,token).changed,false);assert.equal(serializeWorld(w),after);assert.equal(pairProposals(w).length,0);if(!accept)assert.equal(canPair(w,w.birds[0],mate),false);validateWorld(w);});
test('archived friend remains visible in its own house',()=>{const w=createWorld(now);for(let i=0;i<150;i++)createBird(w,{home:'departed'});const b=w.archive[0];travelTo(w,'friend',b.id);assert.ok(fieldBirds(w).some(x=>x.id===b.id));});

for(const envelope of [false,true])test(`local migration keeps exact old backup once, including wrapper ${envelope}`,async()=>{const {openGameStore,STORAGE_KEY}=await import('../src/game-store.js');const old=createWorld(now);old.version=11;delete old.clock;delete old.archive;delete old.journal;const raw=JSON.stringify(envelope?{format:'buncho-world-with-reset-backup-v1',current:old,backup:null}:old),values=new Map([[STORAGE_KEY,raw]]),storage={getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,String(v))};const store=await openGameStore({localStorage:storage,navigator:{locks:{request:(_n,fn)=>Promise.resolve().then(fn)}}});const migrated=await store.transact(w=>w);assert.equal(migrated.version,12);assert.deepEqual(await store.migrationBackup(),old);assert.equal(values.get(STORAGE_KEY+'-migration-v11'),raw);await store.transact(w=>{w.settings.motion=false;return w;});assert.deepEqual(await store.migrationBackup(),old);store.close();});

test('permanent journal rejects malformed or conflicting histories',()=>{for(const change of [w=>w.journal[0].ids=[],w=>w.journal[0].data={unknown:true},w=>w.journal[0].at++,w=>w.journal[0].id='arbitrary',w=>w.journal.push(structuredClone(w.journal[0]))]){const w=createWorld(now);change(w);assert.throws(()=>validateWorld(w));}});

test('archived immature identities grow during absence without per-hour replay',()=>{const w=createWorld(now),young=createBird(w,{home:'departed',stage:'juvenile'});for(let i=0;i<150;i++)createBird(w,{home:'departed'});assert.ok(w.archive.some(b=>b.id===young.id));advanceTo(w,now+10000*60000);assert.equal(young.stage,'adult');assert.equal(w.tick,10000);validateWorld(w);});
