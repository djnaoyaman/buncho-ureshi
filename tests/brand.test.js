import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { BRAND_ASSET, BRAND_SIZE, SITE_NAME, logoSvg } from '../src/visuals.js';
import { IMAGE_ALT } from '../src/metadata.js';
const read=path=>readFile(new URL('../'+path,import.meta.url));
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const approved='543193b35d04c436e1370303b5d64a26de63cf282bc6fddc2dc5a52011c5a82a';

test('selected 04 master is byte-exact and every checked-in derivative matches its provenance manifest',async()=>{
  const manifest=JSON.parse(await read('public/brand/manifest.json'));
  assert.equal(manifest.approvedMasterSHA256,approved);
  assert.equal(hash(await read('public/brand/selected-04-master.png')),approved);
  assert.deepEqual(manifest.masterSize,[1774,887]);
  assert.deepEqual(manifest.wordmarkCrop,[345,125,1465,770]);
  assert.equal(manifest.rasterArtwork,true);
  assert.equal(Object.keys(manifest.files).length,17);
  for(const [path,file] of Object.entries(manifest.files)){
    const bytes=await read(path);assert.equal(bytes.length,file.bytes,path);assert.equal(hash(bytes),file.sha256,path);
  }
  assert.ok((await read('public/'+BRAND_ASSET)).length<350000);
  assert.ok((await read('public/ogp.png')).length<100000);
});

test('header and home use the approved bitmap with full accessible name and explicit intrinsic ratio',async()=>{
  assert.deepEqual(BRAND_SIZE,{width:1120,height:645});
  const markup=logoSvg('header-logo');
  assert.match(markup,/<img /);assert.doesNotMatch(markup,/<svg|<text/);
  assert.ok(markup.includes(`alt="${SITE_NAME}"`));
  assert.ok(markup.includes(`src="${BRAND_ASSET}"`));
  assert.match(markup,/width="1120" height="645"/);
  assert.ok(logoSvg('hero-logo').includes('hero-logo'));
  for(const path of ['dist/index.html','dist/game/index.html','dist/studio/index.html','dist/colors/index.html','dist/404.html']){
    const html=(await read(path)).toString();assert.ok(html.includes(markup),path);
    assert.ok(html.includes(path === 'dist/game/index.html' ? 'ゲームタイトル' : '採用ロゴ'),path);
  }
  assert.match(IMAGE_ALT,/赤いくちばしの白文鳥と深緑/);assert.doesNotMatch(IMAGE_ALT,/植物/);
});


test('all page shells request the exact current logo-fit stylesheet version',async()=>{
  const version=hash(await read('src/style.css')).slice(0,12);
  for(const path of ['dist/index.html','dist/game/index.html','dist/studio/index.html','dist/colors/index.html','dist/404.html']){
    assert.ok((await read(path)).toString().includes(`href="src/style.css?v=${version}"`),path);
  }
});


test('brand module URL changes propagate from HTML through app and studio imports',async()=>{
  const version=hash(await read('src/visuals.js')).slice(0,12);
  assert.ok((await read('dist/index.html')).toString().includes(`src="src/app.js?v=${version}-`));
  for(const file of ['app.js','studio.js','metadata.js'])assert.ok((await read('dist/src/'+file)).toString().includes(`./visuals.js?v=${version}`),file);
  assert.ok((await read('dist/src/app.js')).toString().includes(`./studio.js?v=${version}`));
});
