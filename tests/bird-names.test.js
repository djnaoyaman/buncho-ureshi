import test from 'node:test';
import assert from 'node:assert/strict';
import {DEFAULT_BIRD_NAMES, chooseDefaultBirdName, defaultNameFields, automaticNaming, manualNaming, legacyNaming, isValidNaming, migrateBirdNames, suggestLegacyNumberedNames} from '../src/bird-names.js';
import {createWorld, createBird, eventText, birdName, renameBird, serializeWorld, parseSave, advanceTicks} from './fixtures/engine-v4.js';
const make = () => ({worldId:'garden-known', seed:9876, nextId:1, birds:[], events:[]});
test('203 curated unique bounded natural names, enough for all 128 lifetime birds', () => {
  assert.equal(DEFAULT_BIRD_NAMES.length,203); assert.equal(new Set(DEFAULT_BIRD_NAMES).size,203);
  for(const n of DEFAULT_BIRD_NAMES) assert.ok(n.length<=16 && !/[0-9０-９]/u.test(n));
});
test('128 repeated births and visitors remain distinct including departed birds', () => {
  const w=make(); for(let n=1;n<=128;n++)w.birds.push({id:`b${n}`,stage:n%2?'egg':'adult', home:n%3?'resident':'departed', ...defaultNameFields(w,`b${n}`)});
  assert.equal(new Set(w.birds.map(b=>b.name)).size,128); assert.equal(w.seed,9876);
});
test('different creation runs and reload yield identical names', () => {
  const a=make(),b=make(); for(let n=1;n<=128;n++){a.birds.push({id:`b${n}`,...defaultNameFields(a,`b${n}`)});const reloaded=JSON.parse(JSON.stringify(b)); b.birds.push({id:`b${n}`,...defaultNameFields(reloaded,`b${n}`)});} assert.deepEqual(a,b);
});
test('manual and departed names reserve candidates without changing duplicates', () => {
  const w=make(),name=chooseDefaultBirdName(w,'b3'); w.birds=[{id:'b1',name,home:'departed'},{id:'b2',name,home:'resident'}]; const before=structuredClone(w);assert.notEqual(chooseDefaultBirdName(w,'b3'),name);assert.deepEqual(w,before);
});
test('all candidates occupied fails explicitly, never appends numbers',()=>{
  const w=make();w.birds=DEFAULT_BIRD_NAMES.map((name,i)=>({id:`b${i}`,name}));const n=chooseDefaultBirdName(w,'new');assert.ok(!DEFAULT_BIRD_NAMES.includes(n));assert.ok(!/[0-9]/.test(n));assert.ok(n.length<=16);
});
test('automatic migration requires affirmative metadata, not matching old format',()=>{
  const w=make(); w.birds=[{id:'b17',name:'ひなた17',stage:'adult',parents:['b1','b2'],naming:automaticNaming('ひなた17')},{id:'b4',name:'そら4',stage:'adult',parents:['b1','b2']},{id:'b7',name:'こはく7',naming:manualNaming('こはく7')},{id:'b8',name:'たまご1',stage:'egg'}];
  w.events=[{kind:'hatch',ids:['b4','b1','b2']}];const before=structuredClone(w),next=migrateBirdNames(w);assert.notEqual(next.birds[0].name,'ひなた17');assert.deepEqual(next.birds.slice(1).map(b=>b.name),['そら4','こはく7','たまご1']);assert.deepEqual(w,before);assert.deepEqual(next.events,w.events);assert.deepEqual(next.birds[0].parents,w.birds[0].parents);
});
test('manual rename to same automatic-looking name remains protected',()=>{
  const w=make();w.birds=[{id:'b1',name:'すず1',naming:manualNaming('すず1')}];assert.equal(migrateBirdNames(w).birds[0].name,'すず1');
});
test('stale provenance never overwrites a different current name',()=>{
  const w=make();w.birds=[{id:'b1',name:'おもちちゃん7',naming:automaticNaming('ひなた1')}];const next=migrateBirdNames(w);assert.equal(next.birds[0].name,'おもちちゃん7');assert.equal(next.birds[0].naming.source,'legacy');
});
test('migration is idempotent and stable across JSON reload',()=>{
  const w=make();w.birds=[{id:'b1',name:'すず1',naming:automaticNaming('すず1')}];const once=migrateBirdNames(w);assert.deepEqual(migrateBirdNames(JSON.parse(JSON.stringify(once))),once);
});
test('new eggs already have natural names, no hatch renaming required',()=>{
  const w=make(),egg={id:'b2',stage:'egg',...defaultNameFields(w,'b2')};const before=egg.name;egg.stage='chick';assert.equal(egg.name,before);assert.ok(!/たまご\d/.test(egg.name));
});
test('metadata validation rejects malformed and unknown shapes',()=>{
  assert.ok(isValidNaming(automaticNaming('しずく')));assert.ok(isValidNaming(manualNaming('そら4')));assert.ok(isValidNaming(legacyNaming('たまご1')));
  for(const bad of [null,[],{}, {...automaticNaming('すず'),extra:true},{...automaticNaming('すず'),version:2},{...automaticNaming('すず'),source:'guess'},automaticNaming(''),automaticNaming('a'.repeat(17)),automaticNaming('す\nず')])assert.equal(isValidNaming(bad),false);
});
test('actual v4 save preserves all old names/IDs/relations/events on additive migration',()=>{
  const original=createWorld(1000,842911);advanceTicks(original,1000);renameBird(original,'b1','おもちちゃん7');const validated=parseSave(serializeWorld(original));const next=migrateBirdNames(validated);const stripped=structuredClone(next);for(const b of stripped.birds)delete b.naming;assert.deepEqual(stripped,validated);assert.deepEqual(parseSave(serializeWorld(stripped)),validated);
});
test('actual diary renderer resolves current labels by IDs without string replacement',()=>{
  const w=createWorld(1000,842911),b=createBird(w,{name:'ひなた17'});b.naming=automaticNaming(b.name);const event={kind:'hatch',ids:[b.id,'b1'],tick:0,data:{stage:'chick'}};w.events.push(event);const next=migrateBirdNames(w);assert.ok(eventText(next,event).includes(birdName(next,b.id)));assert.ok(!eventText(next,event).includes('ひなた17'));assert.equal(next.events.at(-1).ids[0],b.id);
});

test('legacy suggestions require exact old prefix plus ID, no changes and no manual names',()=>{
  const w=make();w.birds=[{id:'b17',name:'ひなた17'},{id:'b4',name:'そら4',naming:manualNaming('そら4')},{id:'b7',name:'そら8'},{id:'b8',name:'おもち8'},{id:'b9',name:'すず9',naming:legacyNaming('すず9')}];const before=structuredClone(w);const list=suggestLegacyNumberedNames(w);assert.deepEqual(list.map(s=>s.birdId),['b17','b9']);assert.ok(list.every(s=>s.requiresConfirmation&&!/[0-9]/.test(s.newSuggestion)));assert.equal(new Set(list.map(s=>s.newSuggestion)).size,2);assert.deepEqual(w,before);assert.equal(list[0].oldName,'ひなた17');
});
