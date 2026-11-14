import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { Window } from 'happy-dom';
import { routeMetadata, IMAGE_ALT, GAME_IMAGE_ALT, BASE_PATH, PRODUCTION_ORIGIN } from '../src/metadata.js';
const read = path => readFile(new URL('../' + path, import.meta.url));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');

test('only the game route receives the game card, including structured data', () => {
  const game = routeMetadata('game/');
  assert.equal(game.imageURL, PRODUCTION_ORIGIN + BASE_PATH + 'game-ogp-v1.png');
  assert.equal(game.imageAlt, GAME_IMAGE_ALT);
  assert.match(game.title, /^おもちの文鳥ぐらし/);
  assert.match(game.description, /無料のブラウザゲーム/);
  const image = game.structuredData['@graph'].find(node => node['@type'] === 'WebPage').primaryImageOfPage;
  assert.deepEqual(image, { '@type': 'ImageObject', url: game.imageURL, width: 1200, height: 630, caption: GAME_IMAGE_ALT });
  for (const [route, options] of [['', {}], ['studio/', {}], ['encyclopedia/', {}], ['missing/', {}], ['game/', {query:'文鳥'}], ['game/', {notFound:true}]]) {
    const meta = routeMetadata(route, options);
    assert.equal(meta.imageURL, PRODUCTION_ORIGIN + BASE_PATH + 'site-brand-v1/ogp-artposter.png');
    assert.equal(meta.imageAlt, IMAGE_ALT);
  }
});

test('crawler HTML ships the same game image and metadata without JavaScript', async () => {
  const window = new Window({ settings: { disableJavaScriptEvaluation:true, disableJavaScriptFileLoading:true, disableCSSFileLoading:true } });
  try {
    window.document.write((await read('dist/game/index.html')).toString());
    const document = window.document, meta = routeMetadata('game/');
    for (const [selector, value] of [
      ['meta[property="og:image"]',meta.imageURL], ['meta[property="og:image:alt"]',meta.imageAlt],
      ['meta[name="twitter:image"]',meta.imageURL], ['meta[name="twitter:image:alt"]',meta.imageAlt],
      ['meta[property="og:title"]',meta.title], ['meta[name="twitter:title"]',meta.title],
      ['meta[property="og:description"]',meta.description], ['meta[name="twitter:description"]',meta.description],
      ['meta[property="og:url"]',meta.canonical], ['meta[name="twitter:card"]','summary_large_image'],
      ['meta[property="og:image:type"]','image/png'], ['meta[property="og:image:width"]','1200'], ['meta[property="og:image:height"]','630']
    ]) {
      assert.equal(document.querySelectorAll(selector).length, 1, selector);
      assert.equal(document.querySelector(selector).content, value, selector);
    }
    assert.equal(document.querySelector('link[rel="canonical"]').href, meta.canonical);
    assert.deepEqual(JSON.parse(document.querySelector('#site-jsonld').textContent), meta.structuredData);
  } finally { await window.happyDOM.close(); }
});

test('game card is a compact real PNG with documented published artwork and no private-photo dependency', async () => {
  const image = await read('public/game-ogp-v1.png');
  assert.equal(image.subarray(0,8).toString('hex'), '89504e470d0a1a0a');
  assert.equal(image.readUInt32BE(16),1200); assert.equal(image.readUInt32BE(20),630);
  assert.ok(image.length < 1000000);
  assert.deepEqual(await read('dist/game-ogp-v1.png'),image);
  const source = (await read('scripts/game-share-card.svg')).toString();
  assert.deepEqual([...source.matchAll(/xlink:href="([^"]+)"/g)].map(match=>match[1]), ['../public/game-art/game-title.png']);
  assert.equal(hash(await read('public/game-art/game-title.png')), 'b214cf45cf7e42ee5ffe26e88e55700c7cd68610ebba90ad7742a37977030cc3');
});

test('metadata changes invalidate both app entry and imported metadata URLs', async () => {
  const metadataVersion = hash(await read('src/metadata.js')).slice(0,12);
  const brandVersion = hash(await read('src/visuals.js')).slice(0,12);
  const app = (await read('dist/src/app.js')).toString();
  assert.ok(app.includes(`./metadata.js?v=${brandVersion}-${metadataVersion}`));
  const build = (await read('scripts/build.mjs')).toString();
  assert.match(build, /const presentationVersion[^\n]+"metadata\.js"/);
});
