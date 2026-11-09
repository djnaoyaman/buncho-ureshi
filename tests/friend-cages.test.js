import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createWorld,createBird,serializeWorld,parseSave,prepareWorldReplacement} from '../src/engine.js';
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
