import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {createWorld,validateWorld} from '../src/engine.js';
import {encounterSystem} from '../src/encounters.js';
import {renderFriendshipMovieCard,renderFriendshipMovieDiary,unlockedFriendshipMovies,newlyUnlockedFriendshipMovies} from '../src/collection-ending-player.js';
const id='eurasian-tree-sparrow',other='gouldian-finch',at=Date.UTC(2026,10,18,9);
const fixture=(points,bird=id)=>{const w=createWorld(at,2026);w.encounters.nextId=2;w.encounters.discoveries=[{id:bird,firstTick:0,lastTick:0,visits:1,instanceId:1}];w.encounters.friendship=[{id:bird,petPoints:points-10}];return validateWorld(w);};
test('only an earned native friendship crosses the documented milestone',()=>{
 const w=fixture(99),baseline=unlockedFriendshipMovies(w);
 assert.deepEqual(baseline,[]);
 assert.ok(renderFriendshipMovieCard(w,id).includes('100ポイント'));
 assert.ok(!renderFriendshipMovieCard(w,id).includes('data-friendship-movie-open'));
 const response=encounterSystem.pet(w,id,1,{worldId:w.worldId,revision:w.revision});assert.equal(response.changed,true);
 assert.deepEqual(newlyUnlockedFriendshipMovies(baseline,w.worldId,w),[id]);
 assert.deepEqual(newlyUnlockedFriendshipMovies([id],w.worldId,w),[]);
 assert.deepEqual(newlyUnlockedFriendshipMovies([],w.worldId+'other',w),[]);
 const old=structuredClone(w);
 assert.match(renderFriendshipMovieCard(w,id),/城北中央公園.*The Nature Box.*CC BY 4.0/);
 assert.match(renderFriendshipMovieDiary(w),/data-friendship-movie-open="eurasian-tree-sparrow"/);
 assert.deepEqual(w,old);
 assert.deepEqual(unlockedFriendshipMovies(fixture(101,other)),[]);
 assert.equal(renderFriendshipMovieCard(fixture(101,other),other),'');
 assert.deepEqual(unlockedFriendshipMovies(createWorld(at)),[]);
});
test('publishes exactly the approved original mini film',()=>{
 const bytes=readFileSync(new URL('../public/game-endings/friendship-eurasian-tree-sparrow-v2.mp4',import.meta.url));
 assert.equal(bytes.subarray(4,8).toString(),'ftyp');assert.equal(bytes.length,3999033);
 assert.equal(createHash('sha256').update(bytes).digest('hex'),'29c1dcdd5cba472d884916aab2c3d13cd9710fdd594d3fac36c1df3bbcf49f56');
});
for (const [bird,title,license,digest] of [
 ['eurasian-bullfinch','ウソ','3.0','4f6277b8b9990b85abdd1bfb5fb880553b113ef2d3e7eb8cf30c18b9657cd300'],
 ['hawfinch','シメ','3.0','90477ff3ae3eb3bb4d98a7f1de2800977e28815f1d790c02511892f434b4e7c7'],
 ['tricolored-munia','ギンパラ','2.0','95f86d8fb0063630ab551172a21a3e23e5a4759e4c12179283a0cb6952db8cdc'],
])test(title+' uses only its own licensed film at native 100 points',()=>{
 const w=fixture(99,bird);
 assert.deepEqual(unlockedFriendshipMovies(w),[]);
 assert.equal(encounterSystem.pet(w,bird,1,{worldId:w.worldId,revision:w.revision}).changed,true);
 assert.deepEqual(newlyUnlockedFriendshipMovies([],w.worldId,w),[bird]);
 const html=renderFriendshipMovieCard(w,bird);
 assert.ok(html.includes(title+'と なかよしになった記念'));
 assert.ok(html.includes('href="https://creativecommons.org/licenses/by/'+license+'/">CC BY '+license+'</a>'));
 const bytes=readFileSync(new URL('../public/game-endings/friendship-'+bird+'-v1.mp4',import.meta.url));
 assert.equal(bytes.subarray(4,8).toString(),'ftyp');
 assert.equal(createHash('sha256').update(bytes).digest('hex'),digest);
});
