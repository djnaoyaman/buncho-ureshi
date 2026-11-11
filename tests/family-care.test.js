import test from 'node:test';
import assert from 'node:assert/strict';
import {IDBFactory} from 'fake-indexeddb';
import {createWorld,createBird,feedBird,petBird,economyToken,validateWorld,serializeWorld,parseSave,hireCaretaker,householdIncomeStatus} from '../src/engine.js';
import {careFamily,familyCareStatus} from '../src/family-care.js';
import {openGameStore} from '../src/game-store.js';
const NOW=Date.parse('2026-11-11T12:00:00+09:00');
function family(count=6){const w=createWorld(NOW);w.paused=true;for(let i=1;i<count;i++)createBird(w,{home:'resident',stage:i===1?'juvenile':'adult'});for(const b of w.birds)b.needs.food=b.needs.energy=40;return w;}
for(const count of [1,2,6,10])for(const kind of ['feed','pet'])test(`${kind} for${count} birds exactly matches one individual action each`,()=>{
 const w=family(count),expected=structuredClone(w),op=kind==='feed'?feedBird:petBird;let gems=0;
 for(const b of expected.birds)gems+=op(expected,b.id,NOW,economyToken(expected)).gemAward;
 const result=careFamily(w,kind,economyToken(w),NOW);assert.equal(result.results.length,count);assert.equal(result.gemAward,gems);assert.equal(result.goldAward,0);assert.deepEqual(w,expected);assert.deepEqual(parseSave(serializeWorld(w)),w);
});
test('guests, eggs, chicks, departed, graves and identities are preserved exactly',()=>{
 const w=family(2);for(const [home,stage] of [['resident','egg'],['resident','chick'],['visitor','adult'],['departed','adult']])createBird(w,{home,stage});const dead=createBird(w,{home:'departed'});w.lifecycle.birds.find(b=>b.birdId===dead.id).death={cause:'illness',at:NOW,tick:0};
 const excluded=structuredClone(w.birds.slice(2)),before=structuredClone(w);assert.equal(familyCareStatus(w,'feed').count,2);careFamily(w,'feed',economyToken(w),NOW);careFamily(w,'pet',economyToken(w),NOW);assert.deepEqual(w.birds.slice(2),excluded);
 for(const key of ['seed','archive','protagonist'])assert.deepEqual(w[key],before[key]);assert.equal(w.version,before.version);assert.deepEqual(w.economy,before.economy);validateWorld(w);
});
test('repeated care keeps ordinary recovery increments, finite rewards and day receipt unchanged',()=>{
 const w=family(2),expected=structuredClone(w);for(let n=0;n<5;n++)for(const kind of ['feed','pet']){careFamily(w,kind,economyToken(w),NOW);for(const b of expected.birds)(kind==='feed'?feedBird:petBird)(expected,b.id,NOW,economyToken(expected));}
 assert.deepEqual(w,expected);assert.equal(familyCareStatus(w,'feed').count,0);assert.equal(familyCareStatus(w,'pet').count,0);assert.equal(householdIncomeStatus(w).ready,true);assert.equal(w.economy.gold,0);assert.equal(w.economy.household.lastClaimedDay,null);
});
test('stale token, wrong world, away and malformed operation cannot change the world',()=>{
 for(const token of [null,{worldId:'other',revision:0},{worldId:family().worldId,revision:100}]){const w=family(),before=structuredClone(w);assert.equal(careFamily(w,'feed',token,NOW).changed,false);assert.deepEqual(w,before);}
 const w=family();w.field.place='park';const before=structuredClone(w);assert.equal(careFamily(w,'pet',economyToken(w),NOW).changed,false);assert.deepEqual(w,before);for(const kind of ['all','__proto__',null]){assert.throws(()=>careFamily(w,kind,economyToken(w),NOW));assert.deepEqual(w,before);}assert.throws(()=>careFamily(w,'feed',economyToken(w),NaN));assert.deepEqual(w,before);
});
test('care window changes and Gem cap retain the exact individual semantics',()=>{
 for(const offset of [0,5*3600000]){const w=family(2);for(const b of w.birds)b.needs.food=b.needs.energy=100;w.decor.points=w.decor.lifetimePoints=999999995;const expected=structuredClone(w);careFamily(w,'feed',economyToken(w),NOW+offset);for(const b of expected.birds)feedBird(expected,b.id,NOW+offset,economyToken(expected));assert.deepEqual(w,expected);validateWorld(w);}
});
test('caretaker and real illness deadlines keep ordinary care outcomes',()=>{
 const w=family(2);w.economy.gold=w.economy.lifetimeGold=200;hireCaretaker(w,1,economyToken(w),NOW);const expected=structuredClone(w);careFamily(w,'feed',economyToken(w),NOW+3600000);for(const b of expected.birds)feedBird(expected,b.id,NOW+3600000,economyToken(expected));assert.deepEqual(w,expected);
 const ill=family(2);ill.lifecycle.birds[0].condition={kind:'injury',sinceAt:NOW,deadlineAt:NOW+86400000};const manual=structuredClone(ill);careFamily(ill,'pet',economyToken(ill),NOW+86400000);for(const b of manual.birds)petBird(manual,b.id,NOW+86400000,economyToken(manual));assert.deepEqual(ill,manual);validateWorld(ill);
});
test('two stores commit only one stale-token batch; an aborted batch leaves all data intact',async()=>{
 const indexedDB=new IDBFactory(),a=await openGameStore({indexedDB}),b=await openGameStore({indexedDB}),w=family(6);await a.transact(()=>w);const token=economyToken(w);let one,two;
 await Promise.all([a.transact(x=>{one=careFamily(x,'feed',token,NOW);return x;}),b.transact(x=>{two=careFamily(x,'feed',token,NOW);return x;})]);assert.equal([one,two].filter(r=>r.changed).length,1);
 const expected=structuredClone(w);careFamily(expected,'feed',token,NOW);const saved=await a.transact(x=>x);assert.deepEqual(saved,expected);await assert.rejects(a.transact(x=>{careFamily(x,'pet',economyToken(x),NOW);throw Error('abort');}));assert.deepEqual(await b.transact(x=>x),saved);a.close();b.close();
});
test('family care and its engine dependency share the production cache version',async()=>{
 const {readFile}=await import('node:fs/promises');const ui=await readFile(new URL('../dist/src/game.js',import.meta.url),'utf8'),module=await readFile(new URL('../dist/src/family-care.js',import.meta.url),'utf8');const version=ui.match(/family-care\.js\?v=([a-f\d]+)/)?.[1];assert(version);assert(module.includes(`engine.js?v=${version}`));assert(module.includes(`life-care.js?v=${version}`));
});

test('a returning ill family member receives grace and family care stays identical to individual care',()=>{
 const w=family(3),patient=w.birds[1],at=NOW+86400000;w.lifecycle.birds.find(b=>b.birdId===patient.id).condition={kind:'injury',sinceAt:NOW,deadlineAt:at};const expected=structuredClone(w),ids=expected.birds.map(b=>b.id);
 for(const id of ids){const bird=expected.birds.find(b=>b.id===id);if(bird.home==='resident'&&!expected.lifecycle.birds.find(b=>b.birdId===id).death)feedBird(expected,id,at,economyToken(expected));}
 const result=careFamily(w,'feed',economyToken(w),at);assert.equal(result.results.filter(r=>r.changed).length,3);assert.deepEqual(w,expected);assert.equal(w.lifecycle.birds.find(b=>b.birdId===patient.id).death,null);assert.equal(w.careRules.birds.find(b=>b.birdId===patient.id).healthGraceUntil,at+86400000);validateWorld(w);
});
