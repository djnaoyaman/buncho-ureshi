import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createWorld,createBird,renameBird,serializeWorld,parseSave,advanceTicks,SAVE_VERSION} from '../src/engine.js';
import {DIRECT_LINE_BIRD_NAMES,DEFAULT_BIRD_NAMES,directLineNameFields,newDefaultNameFields,chooseDefaultBirdName} from '../src/bird-names.js';
import {createWorld as createV4,serializeWorld as serializeV4} from './fixtures/engine-v4.js';


test('only a newly created founder is Ed, with unchanged identity and naming schema',()=>{
 const w=createWorld(1000,842911);
 assert.equal(w.birds[0].name,'エド');
 assert.deepEqual(w.birds[0].naming,{version:1,source:'automatic',assignedName:'エド'});
 assert.equal(SAVE_VERSION,19);assert.equal(w.birds[0].id,'b1');
 assert.deepEqual(w.protagonist.lineage,['b1']);
 assert.deepEqual(parseSave(serializeWorld(w)),w);
});
test('all current names including automatic numeric names survive load without rewritten records',()=>{
 const w=createWorld(1000);renameBird(w,'b1','おもち');
 createBird(w,{name:'すず7',automaticName:true});
 createBird(w,{name:'おもち'});
 const before=structuredClone(w);
 assert.deepEqual(parseSave(serializeWorld(w)),before);
 assert.deepEqual(w,before);
});
test('legacy founder and every preexisting name survive v4 migration',()=>{
 const w=createV4(1000);const next=parseSave(serializeV4(w));
 assert.equal(next.birds[0].name,'おもち');
 assert.deepEqual(next.birds.map(b=>[b.id,b.name,b.parents]),w.birds.map(b=>[b.id,b.name,b.parents]));
 assert.deepEqual(next.events,w.events);
});
test('manual rename of new founder survives ticks and serialization',()=>{
 const w=createWorld(1000);renameBird(w,'b1','おもちちゃん');advanceTicks(w,12);
 assert.equal(parseSave(serializeWorld(w)).birds[0].name,'おもちちゃん');
 assert.equal(w.birds[0].naming.source,'manual');
});
test('game title remains Omochi while reset labels describe the new founder',()=>{
 const ui=readFileSync(new URL('../src/game.js',import.meta.url),'utf8');
 assert.ok(ui.includes('おもちの文鳥ぐらし'));
 assert.ok(ui.includes('エド1羽'));assert.ok(!ui.includes('おもち1羽'));
});

test('short Katakana pool has lifetime capacity and does not mutate or consume RNG',()=>{
 assert.ok(DIRECT_LINE_BIRD_NAMES.length>128);assert.equal(new Set(DIRECT_LINE_BIRD_NAMES).size,DIRECT_LINE_BIRD_NAMES.length);
 for(const name of DIRECT_LINE_BIRD_NAMES)assert.match(name,/^[ァ-ヶー]{2,4}$/u);
 const w={worldId:'names',seed:123,birds:[]};
 for(let i=1;i<=128;i++)w.birds.push({id:`b${i}`,...directLineNameFields(w,`b${i}`)});
 assert.equal(new Set(w.birds.map(b=>b.name)).size,128);assert.equal(w.seed,123);
 const before=structuredClone(w);assert.deepEqual(directLineNameFields(w,'b128'),directLineNameFields(JSON.parse(JSON.stringify(w)),'b128'));assert.deepEqual(w,before);
});
test('both maternal and paternal descendants receive names, unrelated branches and partners do not',()=>{
 const w=createWorld(1000),partner=createBird(w),other=createBird(w);
 const child=createBird(w,{parents:['b1',partner.id],stage:'egg',skipNameDraw:true});
 const grandchild=createBird(w,{parents:[other.id,child.id],stage:'egg',skipNameDraw:true});
 const unrelated=createBird(w,{parents:[partner.id,other.id],stage:'egg',skipNameDraw:true});
 for(const bird of [child,grandchild])assert.ok(DIRECT_LINE_BIRD_NAMES.includes(bird.name));
 for(const bird of [partner,other,unrelated])assert.ok(DEFAULT_BIRD_NAMES.includes(bird.name));
 const names=w.birds.map(b=>b.name);advanceTicks(w,12);assert.deepEqual(w.birds.slice(0,names.length).map(b=>b.name),names);
});
test('non-blood protagonist selection does not change the founder-based naming boundary',()=>{
 const w=createWorld(1000),a=createBird(w),b=createBird(w);
 // Naming depends only on parent links, not protagonist history. This unit fixture
 // deliberately isolates that predicate rather than constructing a lifecycle death.
 w.protagonist.birdId=a.id;w.protagonist.lineage.push(a.id);
 const child=createBird(w,{parents:[a.id,b.id],stage:'egg'});
 assert.ok(DEFAULT_BIRD_NAMES.includes(child.name));
});
test('explicit names override defaults and existing duplicate/departed names stay intact',()=>{
 const w=createWorld(1000),partner=createBird(w);
 const preview=directLineNameFields(w,`b${w.nextId+1}`).name;
 const reserved=createBird(w,{name:preview,home:'departed'});
 const child=createBird(w,{parents:['b1',partner.id],stage:'egg'});
 assert.notEqual(child.name,reserved.name);assert.equal(reserved.name,preview);
 const manual=createBird(w,{parents:['b1',partner.id],name:'おもち'});assert.equal(manual.name,'おもち');
 renameBird(w,child.id,'おもち');assert.equal(child.name,'おもち');assert.equal(child.naming.source,'manual');
});
test('future birth in an existing Omochi save keeps all prior names and round-trips the child',()=>{
 const w=createWorld(1000);w.birds[0].name=w.birds[0].naming.assignedName='おもち';
 const partner=createBird(w,{sex:'male',home:'resident'});
 const loaded=parseSave(serializeWorld(w)),before=loaded.birds.map(b=>[b.id,b.name,b.naming]);
 const child=createBird(loaded,{stage:'egg',home:'resident',parents:['b1',partner.id],generation:1,skipNameDraw:true});
 assert.ok(DIRECT_LINE_BIRD_NAMES.includes(child.name));
 assert.deepEqual(loaded.birds.slice(0,before.length).map(b=>[b.id,b.name,b.naming]),before);
 assert.deepEqual(parseSave(serializeWorld(loaded)),loaded);
});
test('all reserved short names fail explicitly without numeric suffix or side effects',()=>{
 const w={worldId:'all-reserved',seed:42,birds:DIRECT_LINE_BIRD_NAMES.map((name,i)=>({id:`b${i}`,name}))};
 const before=structuredClone(w);const n=directLineNameFields(w,'new').name;assert.ok(!DIRECT_LINE_BIRD_NAMES.includes(n));assert.ok(!/[0-9]/.test(n));assert.ok(n.length<=16);assert.deepEqual(w,before);
});

test('new unrelated automatic names exclude Omochi without changing the legacy pool or chooser',()=>{
 assert.equal(DEFAULT_BIRD_NAMES.length,203);assert.ok(DEFAULT_BIRD_NAMES.includes('おもち'));
 let excluded=0;
 for(let i=0;i<1000;i++){
  const w={worldId:`pool-check-${i}`,seed:42,birds:[]},before=structuredClone(w);
  const legacy=chooseDefaultBirdName(w,'b2'),next=newDefaultNameFields(w,'b2');
  assert.doesNotMatch(next.name,/^おもち[0-9０-９]*$/u);assert.ok(DEFAULT_BIRD_NAMES.includes(next.name));
  if(legacy==='おもち')excluded++;else assert.equal(next.name,legacy);
  assert.deepEqual(w,before);
 }
 assert.ok(excluded>0);
});
test('the former Omochi visitor collision now uses the next ordinary candidate with unchanged simulation seed',()=>{
 const w=createWorld(1793610000000,8888);w.settings.adoptionMode='auto';advanceTicks(w,1000);
 assert.equal(w.birds.find(b=>b.id==='b38').name,'しらたま');
 assert.ok(w.birds.every(b=>!/^おもち[0-9０-９]*$/u.test(b.name)));
});
test('existing automatic Omochi and numbered names and new manual Omochi stay permitted',()=>{
 const w=createWorld(1000);w.birds[0].name=w.birds[0].naming.assignedName='おもち';
 for(const name of ['おもち2','おもち２'])createBird(w,{name,automaticName:true});
 const manual=createBird(w,{name:'おもち'});assert.equal(manual.naming.source,'manual');
 const before=structuredClone(w);assert.deepEqual(parseSave(serializeWorld(w)),before);
 renameBird(w,manual.id,'おもち2');assert.equal(w.birds.find(b=>b.id===manual.id).name,'おもち2');
});
test('new automatic selection never falls back to Omochi when other candidates are occupied',()=>{
 const w={worldId:'reserved-ordinary',seed:42,birds:DEFAULT_BIRD_NAMES.filter(name=>name!=='おもち').map((name,i)=>({id:`b${i}`,name}))};
 const before=structuredClone(w);assert.equal(chooseDefaultBirdName(w,'new'),'おもち');
 const n=newDefaultNameFields(w,'new').name;assert.ok(!/^おもち[0-9]*$/.test(n));assert.ok(!/[0-9]/.test(n));assert.ok(n.length<=16);assert.deepEqual(w,before);
});
