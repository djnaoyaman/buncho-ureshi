import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createWorld,createBird,serializeWorld,parseSave,prepareWorldReplacement,travelTo,fieldBirds} from '../src/engine.js';
import {friendCage,FRIEND_CAGES} from '../src/friend-cages.js';
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
 const journey=JSON.parse(await read('docs/qa/garden-home-journey-scope.json'));
 assert.deepEqual(Object.keys(journey.changedSource),['src/game.js']);
 const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
 assert.deepEqual(rollout.enabledFriendCages,FRIEND_CAGES.map(c=>c.id));
 assert.deepEqual(Object.keys(rollout.changedSource),['src/game.js','src/game.css']);
 for(const [file,digest] of Object.entries(rollout.changedSource)){
  assert.equal(digest.before,pilot.changedSource[file].after,file);
  const successor=journey.changedSource[file];
  if(successor)assert.equal(successor.before,digest.after,file);
  assert.equal(sha(await read(file)),successor?.after||digest.after,file);
 }
 assert.deepEqual(Object.keys(rollout.media),FRIEND_CAGES.map(c=>'public/game-art/'+c.file));
 for(const [file,digest] of Object.entries(rollout.media))assert.equal(sha(await read(file)),digest,file);
 for(const [file,digest] of Object.entries(pilot.media))assert.equal(rollout.media[file],digest,file);
});
