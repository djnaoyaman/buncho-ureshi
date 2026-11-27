import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createWorld,createBird,serializeWorld,parseSave,prepareWorldReplacement,travelTo,fieldBirds} from '../src/engine.js';
import {friendCage,FRIEND_CAGES,friendCagePositions} from '../src/friend-cages.js';
test('nine real cage assets and identity assignments survive whole-world replacement',async()=>{
 const w=createWorld(1794182400000),ids=Array.from({length:90},()=>createBird(w,{home:'departed'}).id),before=serializeWorld(w);
 const chosen=ids.map(id=>friendCage(w,id).id);assert.equal(new Set(chosen).size,9);
 assert.equal(serializeWorld(w),before);
 const restored=prepareWorldReplacement(createWorld(w.epoch+100),parseSave(before),w.epoch+100,'new-import-id');
 assert.deepEqual(ids.map(id=>friendCage(restored,id).id),chosen);
 for(const cage of FRIEND_CAGES)assert.ok((await readFile(new URL(`../public/game-art/${cage.file}`,import.meta.url))).length>1000);
 assert.equal(friendCage(w,'missing'),null);
});

test('archiving a friend preserves its cage, visit and entire saved world',()=>{
 const world=createWorld(1794182400000),friend=createBird(world,{home:'departed'});
 const cage=friendCage(world,friend.id);
 for(let i=0;i<150;i++)createBird(world,{home:'departed'});
 assert.ok(world.archive.some(b=>b.id===friend.id));
 travelTo(world,'friend',friend.id);
 const before=serializeWorld(world);
 assert.ok(fieldBirds(world).some(b=>b.id===friend.id));
 assert.deepEqual(friendCage(world,friend.id),cage);
 assert.equal(serializeWorld(world),before);
 assert.deepEqual(friendCage(parseSave(before),friend.id),cage);
});

test('camera rollout keeps the exact nine original friend cage art files',async()=>{
 const read=file=>readFile(new URL('../'+file,import.meta.url));
 const pilot=JSON.parse(await read('docs/qa/friend-camera-pilot-scope.json')),rollout=JSON.parse(await read('docs/qa/friend-camera-rollout-scope.json'));
 const film=JSON.parse(await read('docs/qa/garden-friendship-movie-scope.json'));
 const journey=JSON.parse(await read('docs/qa/garden-home-journey-scope.json'));
 const scale=JSON.parse(await read('docs/qa/friend-cage-scale-scope.json'));
 const evening=JSON.parse(await read('docs/qa/friendship-movie-evening-grosbeak-scope.json'));
 assert.deepEqual(Object.keys(journey.changedSource),['src/game.js']);
 const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
 assert.deepEqual(rollout.enabledFriendCages,FRIEND_CAGES.map(c=>c.id));
 assert.deepEqual(Object.keys(rollout.changedSource),['src/game.js','src/game.css']);
 for(const [file,digest] of Object.entries(rollout.changedSource)){
  assert.equal(digest.before,pilot.changedSource[file].after,file);
  const successor=journey.changedSource[file];
  if(successor)assert.equal(successor.before,digest.after,file);
  const previous=successor?.after||digest.after,next=film.changedSource[file];
  if(next)assert.equal(next.before,previous,file);
  assert.equal(scale.changedSource[file].before,next?.after||previous,file);
  const independentCover=evening.changedSource[file];
  if(independentCover)assert.equal(independentCover.before,scale.changedSource[file].after,file);
  assert.equal(sha(await read(file)),independentCover?.after??scale.changedSource[file].after,file);
 }
 assert.deepEqual(Object.keys(scale.changedSource),['src/game.js','src/game.css','src/friend-cages.js']);
 assert.equal(sha(await read('src/friend-cages.js')),scale.changedSource['src/friend-cages.js'].after);
 assert.deepEqual(scale.unchangedMedia,rollout.media);
 assert.deepEqual(Object.keys(rollout.media),FRIEND_CAGES.map(c=>'public/game-art/'+c.file));
 for(const [file,digest] of Object.entries(rollout.media))assert.equal(sha(await read(file)),digest,file);
 for(const [file,digest] of Object.entries(pilot.media))assert.equal(rollout.media[file],digest,file);
});

test('source-plane scale survives occupancy, viewport and juvenile presentation for all friend cages',()=>{
 const birds=Array.from({length:12},(_,i)=>({id:'b'+i,stage:i===11?'juvenile':'adult',action:{kind:'rest'}}));
 for(const cage of FRIEND_CAGES){
  const solo=friendCagePositions(birds.slice(0,1),cage).get('b0'),group=[...friendCagePositions(birds,cage).values()];
  assert.equal(solo.x,.5);assert.equal(solo.y,.814);
  assert.equal(new Set(group.map(p=>p.x+'|'+p.y)).size,12);
  assert.ok(group.slice(0,11).every(p=>p.width===solo.width));
  assert.equal(group[11].width,.92*solo.width);
  for(const size of [[320,568],[390,844],[844,390],[1280,800]]){
   const width=Math.max(size[0],size[1]*1.6);
   for(const a of group){
    assert.ok(a.x-a.width/2>=.2&&a.x+a.width/2<=.8);
    const relative=(a.width*width)/(cage.survey[0]/1600*width);
    assert.ok(relative>=.52&&relative<=.69);
    for(const b of group.filter(p=>p.id!==a.id))
     assert.ok(Math.abs(a.x-b.x)>Math.max(a.width,b.width)||Math.abs(a.y-b.y)>Math.max(a.width,b.width)*1.6*1000/850);
   }
  }
 }
});
