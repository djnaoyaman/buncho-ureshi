import test from 'node:test';
import assert from 'node:assert/strict';
import{readFile}from'node:fs/promises';
import{createHash}from'node:crypto';
import{PAGE_CATALOG}from'../src/metadata.js';
test('renewal preserves every original game and shared output byte-for-byte',async()=>{const baseline=JSON.parse(await readFile('site/game-protected-baseline.json'));for(const[p,h]of Object.entries(baseline.files))assert.equal(createHash('sha256').update(await readFile('dist/'+p)).digest('hex'),h,p);});
test('all 52 non-game documents isolate their new entry and styling; game keeps original',async()=>{for(const[r]of PAGE_CATALOG){const h=await readFile('dist/'+r+'index.html','utf8');if(r==='game/'){assert.doesNotMatch(h,/data-site-renewal|site\/renewal|src\/site-app/);}else{assert.match(h,/data-site-renewal="1"/);assert.match(h,/site\/renewal.css/);assert.match(h,/src\/site-app.js/);}}});
test('renewed static home preserves GAME above EXPLORE, original logo and truthful hero label',async()=>{const h=await readFile('dist/index.html','utf8');assert.ok(h.indexOf('home-game-title')<h.indexOf('EXPLORE'));assert.match(h,/白文鳥のイメージイラスト/);assert.match(h,/game-art\/game-title.png/);assert.match(h,/data-static-content/);assert.match(h,/cover-title/);assert.match(h,/<ruby>/);});
