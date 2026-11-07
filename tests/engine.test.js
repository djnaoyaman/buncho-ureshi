import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorld as createBaseWorld, createBird, advanceTicks, advanceTo, TICK_MS, MAX_SAVE_BYTES, LIMITS, isRelated, canPair, renameBird, talkToBird, adoptBird, parseSave, serializeWorld, validateWorld, eventText } from '../src/engine.js';

test('begins with the female white Ed and an unrelated male visitor', () => {
  const w = createWorld(100); assert.equal(w.birds.length,1); assert.equal(w.birds[0].name,'エド'); assert.equal(w.birds[0].sex,'female'); assert.equal(w.birds[0].color,'white');
  advanceTicks(w,1); const v = w.birds[1]; assert.equal(v.sex,'male'); assert.equal(v.home,'visitor'); assert.equal(isRelated(w,'b1',v.id),false);
  adoptBird(w,v.id,'こめ'); assert.equal(v.name,'こめ'); assert.equal(v.home,'resident');
});
test('autonomous relationships lead to eggs, hatchlings and unrelated families within six slots', () => {
  const w = createWorld(0); const seen = new Set();
  for(let i=0;i<1500;i++){ advanceTicks(w,1); for(const e of w.events) seen.add(e.kind); validateWorld(w); }
  for(const kind of ['pair','egg','hatch','grow','depart','revisit']) assert.ok(seen.has(kind),kind);
  assert.ok(Math.max(...w.birds.map(b=>b.generation))>=1);
  for(const b of w.birds) if(b.partner) assert.equal(isRelated(w,b.id,b.partner),false);
});
test('blocks siblings, parent-child, grandparents and first cousins', () => {
  const w=createWorld(0), a=w.birds[0], b=createBird(w,{sex:'male'}), c=createBird(w,{parents:[a.id,b.id],generation:1,sex:'female'}), d=createBird(w,{parents:[a.id,b.id],generation:1,sex:'male'});
  const x=createBird(w,{sex:'male'}), y=createBird(w,{sex:'female'}), e=createBird(w,{parents:[c.id,x.id],generation:2,sex:'female'}), f=createBird(w,{parents:[d.id,y.id],generation:2,sex:'male'});
  for(const [one,two] of [[a,c],[a,e],[c,d],[e,f]]) { assert.ok(isRelated(w,one.id,two.id)); assert.equal(canPair(w,one,two),false); }
  assert.equal(isRelated(w,x.id,y.id),false);
});
test('time progression is deterministic, bounded and does not punish absence', () => {
  const a=createWorld(0), b=createWorld(0); advanceTo(a,TICK_MS*40); advanceTicks(b,40); assert.equal(a.tick,b.tick); assert.deepEqual(a.birds,b.birds);
  const long=createWorld(0); advanceTo(long,TICK_MS*100000); assert.equal(long.tick,LIMITS.offlineTicks); assert.equal(long.lastUpdated,TICK_MS*100000); assert.ok(long.offlineSummary.skipped>0); const tick=long.tick; advanceTo(long,TICK_MS*100000); assert.equal(long.tick,tick);
  assert.ok(long.birds.every(b=>b.mood>=35 && b.needs.energy>=12));
});
test('pause does not catch up paused time on resume; backwards clock does not create duplicate ticks', () => {
  const w=createWorld(100); w.paused=true; advanceTo(w,999999); assert.equal(w.tick,0); w.paused=false; advanceTo(w,1000000); assert.equal(w.tick,0); const watermark=w.lastUpdated; advanceTo(w,0); assert.equal(w.tick,0); assert.equal(w.lastUpdated,watermark); advanceTo(w,watermark+TICK_MS); assert.equal(w.tick,1);
  const replay=createWorld(0); advanceTo(replay,TICK_MS*2); advanceTo(replay,TICK_MS); advanceTo(replay,TICK_MS*2); assert.equal(replay.tick,2); advanceTo(replay,TICK_MS*3); assert.equal(replay.tick,3);
});
test('save roundtrip restores all names, relationships, families, memories, settings and dates', () => {
  const w=createWorld(0); advanceTicks(w,300); w.settings.motion=false; const restored=parseSave(serializeWorld(w)); assert.deepEqual(restored,w);
});
test('invalid saves are rejected without mutating the existing world', () => {
  const w=createWorld(0); advanceTicks(w,50); const before=serializeWorld(w);
  for(const mutate of [x=>x.version=999,x=>x.birds[0].parents=['b1','b2'],x=>x.birds[0].needs.energy=-1,x=>x.birds.push(x.birds[0]),x=>x.birds[0].partner='missing',x=>x.birds[0].stage='__proto__',x=>x.events[0].ids=['missing']]) { const bad=JSON.parse(before); mutate(bad); assert.throws(()=>parseSave(JSON.stringify(bad))); }
  assert.throws(()=>parseSave('{broken')); assert.equal(serializeWorld(w),before);
});
test('renaming retains IDs and resolves names dynamically in diary', () => {
  const w=createWorld(0); const oldId=w.birds[0].id; renameBird(w,oldId,'しらたま'); assert.equal(w.birds[0].id,oldId); assert.match(eventText(w,w.events[0]),/しらたま/); assert.doesNotMatch(eventText(w,w.events[0]),/おもち/);
});
test('conversation reflects personality and history while sharing bounded care energy', () => {
 const w=createWorld(0),b=w.birds[0];b.needs.energy=10;assert.match(talkToBird(w,b.id,'あそぼう',0).answer,/休みたい/);b.needs.energy=60;b.personality.curiosity=90;assert.match(talkToBird(w,b.id,'あそぼう',0).answer,/探検/);const before=b.needs.energy;talkToBird(w,b.id,'おやすみ',0);assert.equal(b.needs.energy,Math.min(100,before+20));assert.equal(b.action.kind,'rest');assert.ok(b.memories.at(-1).kind.startsWith('user-'));b.needs.energy=60;assert.match(talkToBird(w,b.id,'むずかしい未対応の質問',0).answer,/まだわからない/);
});
test('relationships are directional and social events have causes/results/memories', () => {
  const w=createWorld(0); advanceTicks(w,8); const a=w.birds[0], b=w.birds[1]; assert.notEqual(a.relations[b.id].affection,b.relations[a.id].affection); assert.ok(w.events.some(e=>e.condition && e.result)); assert.ok(a.memories.length>0);
});
test('long-term world is bounded and every lineage and name remains addressable', () => {
  const w=createWorld(0); advanceTicks(w,20000); validateWorld(w);
  assert.ok(w.birds.length<=LIMITS.birds); assert.ok(w.birds.filter(b=>b.home==='resident').length<=LIMITS.residents); assert.ok(w.birds.filter(b=>b.home==='visitor').length<=LIMITS.visitors); assert.ok(w.events.length<=LIMITS.events); assert.ok(w.birds.every(b=>b.memories.length<=LIMITS.memories)); const ids=new Set(w.birds.map(b=>b.id)); assert.ok(w.birds.every(b=>b.parents.every(id=>ids.has(id)))); assert.ok(w.birds.length>20);
});

test('imports reject discontinuous ID counters and invalid breeding parentage', () => {
  const w=createWorld(0); advanceTicks(w,300); const save=serializeWorld(w);
  const ids=JSON.parse(save); ids.nextId=9007199254740991; assert.throws(()=>parseSave(JSON.stringify(ids)),/基本情報|ID/);
  const discontinuous=JSON.parse(save); discontinuous.nextId++; assert.throws(()=>parseSave(JSON.stringify(discontinuous)),/ID/);
  const family=JSON.parse(save), child=family.birds.find(b=>b.parents.length===2);
  const mother=family.birds.find(b=>b.id===child.parents[0]), father=family.birds.find(b=>b.id===child.parents[1]);
  mother.partner=null; father.partner=null; father.sex=mother.sex;
  assert.throws(()=>parseSave(JSON.stringify(family)),/親|つがい/);
  assert.equal(serializeWorld(w),save);
});

test('invalid wall clocks and tick counts cannot corrupt a valid world', () => {
  const w=createWorld(0), before=serializeWorld(w);
  for(const now of [-1, NaN, Infinity, -Infinity, 1e300, 1.5]) { advanceTo(w,now); assert.equal(serializeWorld(w),before); }
  for(const count of [-1,NaN,Infinity,-Infinity,'5']) { advanceTicks(w,count); assert.equal(serializeWorld(w),before); }
  advanceTicks(w,1.9); assert.equal(w.tick,1);
  const edge=createWorld(8640000000000000); advanceTicks(edge,2); assert.equal(edge.tick,0); validateWorld(edge);
});

test('imports enforce UTF-8 byte bounds and reject unknown nested payloads without modifying the world', () => {
  const w=createWorld(0); advanceTicks(w,150); const before=serializeWorld(w);
  assert.throws(()=>parseSave(' '.repeat(MAX_SAVE_BYTES+1)),/4MB/);
  const multibyte='{"padding":"'+'鳥'.repeat(1400000)+'"}'; assert.ok(multibyte.length<MAX_SAVE_BYTES); assert.throws(()=>parseSave(multibyte),/4MB/);
  for(const mutate of [x=>x.extra='padding',x=>x.settings.constructor='bad',x=>x.birds[0].needs.extra='padding',x=>x.events[0].data.extra={deep:['arbitrary']},x=>x.events[0].kind='constructor',x=>x.events[0].ids=[],x=>x.birds[0].memories.push(null),x=>x.birds[0].milestones[0].kind='constructor']) {
    const bad=JSON.parse(before); mutate(bad); assert.throws(()=>parseSave(JSON.stringify(bad)));
  }
  const pollution=JSON.parse(before); Object.defineProperty(pollution.settings,'__proto__',{value:{polluted:true},enumerable:true});assert.throws(()=>parseSave(JSON.stringify(pollution)));assert.equal({}.polluted,undefined);
  assert.equal(serializeWorld(w),before);
});

test('dense bounded relationship graphs export below the same import byte limit', () => {
  const w=createWorld(0); advanceTicks(w,20000);
  w.tick=500000000000;
  for(const b of w.birds){renameBird(w,b.id,'鳥'.repeat(16));for(const other of w.birds)if(other.id!==b.id)b.relations[other.id]={affection:1.0000000000000002e-100,trust:1.0000000000000002e-100,compatibility:1.0000000000000002e-100,meetings:Number.MAX_SAFE_INTEGER,lastTick:w.tick};}
  for(const e of w.events){e.condition='鳥'.repeat(120);e.result='鳥'.repeat(120);}
  const text=serializeWorld(w); assert.ok(Buffer.byteLength(text,'utf8')<=MAX_SAVE_BYTES);assert.deepEqual(parseSave(text),w);
});

test('imported diary counters, timestamps and family chronology cannot become duplicate future events', () => {
  const w=createWorld(0);advanceTicks(w,300);const before=serializeWorld(w);
  for(const mutate of [x=>x.nextEvent=Number(x.events.at(-1).id.slice(1)),x=>x.nextEvent++,x=>x.events[0].at++,x=>x.events.reverse(),x=>{const b=x.birds.find(b=>b.partner);b.pairTick=null;},x=>{const b=x.birds.find(b=>b.parents.length);b.stageTick=b.bornTick-1;},x=>{const child=x.birds.find(b=>b.parents.length);x.birds.find(b=>b.id===child.parents[0]).stageTick=child.bornTick+1;},x=>x.offlineSummary={ticks:5,skipped:0,newBirds:0,fromTick:0,toTick:4}]){
    const bad=JSON.parse(before);mutate(bad);assert.throws(()=>parseSave(JSON.stringify(bad)));
  }
  const restored=parseSave(before);advanceTicks(restored,50);validateWorld(restored);assert.equal(new Set(restored.events.map(e=>e.id)).size,restored.events.length);assert.equal(serializeWorld(w),before);
});

test('numeric counter edges stay safe across an engine update', () => {
  const w=createWorld(0);advanceTicks(w,10);w.revision=Number.MAX_SAFE_INTEGER;
  const start=Number.MAX_SAFE_INTEGER-w.events.length;
  w.events.forEach((e,i)=>e.id=`e${start+i}`);w.nextEvent=Number.MAX_SAFE_INTEGER;
  for(const b of w.birds)for(const r of Object.values(b.relations))r.meetings=Number.MAX_SAFE_INTEGER;
  validateWorld(w);advanceTicks(w,20);validateWorld(w);assert.ok(Number.isSafeInteger(w.revision));assert.ok(Number.isSafeInteger(w.nextEvent));assert.deepEqual(parseSave(serializeWorld(w)),w);
});


test('direct stored objects are bounded before clone and do not invoke serialization hooks', () => {
  const oversized=createWorld(0);oversized.extra={toJSON(){throw new Error('should not execute');}};
  assert.throws(()=>validateWorld(oversized),/保存の項目/);
  const accessor=createWorld(0);Object.defineProperty(accessor,'worldId',{enumerable:true,get(){throw new Error('should not execute');}});
  assert.throws(()=>validateWorld(accessor),/JSONの項目/);
  const nested=createWorld(0);nested.events[0].data.extra={toJSON(){throw new Error('should not execute');}};
  assert.throws(()=>validateWorld(nested),/JSONの構造/);
  const cyclic=createWorld(0);cyclic.events[0].data.loop=cyclic;
  assert.throws(()=>validateWorld(cyclic),/JSONの構造/);
  const many=createWorld(0);many.birds=new Array(1000000).fill(null);
  assert.throws(()=>validateWorld(many),/鳥や日記/);
  const sparse=createWorld(0);sparse.birds[0].memories=new Array(1000000000);
  assert.throws(()=>validateWorld(sparse),/JSONの配列/);
  const nonfinite=createWorld(0);nonfinite.birds[0].needs.energy=NaN;
  assert.throws(()=>validateWorld(nonfinite),/数値/);
});

// Historical passive simulation tests explicitly retain automatic adoption.
function createWorld(...args){const w=createBaseWorld(...args);w.settings.adoptionMode='auto';return w;}
