import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,access} from 'node:fs/promises';
const read=name=>readFile(new URL('../'+name,import.meta.url),'utf8');
test('published game no longer imports or mounts character editor and has no entry',async()=>{
 const game=await read('src/game.js');assert.doesNotMatch(game,/from ['"]\.\/owner-(?:profile|peek)\.js|mountOwnerProfile|renderOwnerPortrait|data-owner-editor-slot|finishOwnerEdit|ownerReturn|ownerCleanup|ownerEditor|game-owner-setting|キャラクター設定/);
 assert.doesNotMatch(game,/localStorage\.(?:removeItem|clear)\(/);
 assert.match(game,/\['settings','help','music'\]\.includes\(event\.detail\)/);
});
test('build excludes archived editor scripts and styles but retains character artwork',async()=>{
 const build=await read('scripts/build.mjs');assert.match(build,/filter: source => !\/\[\/\\\\\]owner-profile/);
 assert.doesNotMatch(build,/<link[^>]*owner-profile\.css/);
 for(const name of ['owner-profile.js','owner-profile.css','owner-profile-data.js','owner-peek.js'])await access(new URL('../src/'+name,import.meta.url));
 for(const name of ['owner-heads-soft-v3.webp','owner-clothes-watercolor.webp'])await access(new URL('../public/game-art/'+name,import.meta.url));
});
test('normal build has no withdrawn editor files and retains original art',async t=>{
 // npm test builds first. Direct source-only runs intentionally skip this aggregate condition.
 try{await access(new URL('../dist/game/index.html',import.meta.url));}catch{t.skip('Source-only run: normal CI build verifies distribution');return;}
 for(const name of ['owner-profile.js','owner-profile.css'])await assert.rejects(access(new URL('../dist/src/'+name,import.meta.url)),{code:'ENOENT'});
 for(const name of ['owner-heads-soft-v3.webp','owner-clothes-watercolor.webp'])await access(new URL('../dist/game-art/'+name,import.meta.url));
 assert.doesNotMatch(await read('dist/game/index.html'),/owner-profile\.css/);
});
