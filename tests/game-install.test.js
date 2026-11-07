import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { Window } from 'happy-dom';
import { PAGE_CATALOG, routeMetadata, BASE_PATH, PRODUCTION_ORIGIN, GAME_INSTALL_ICON } from '../src/metadata.js';
import { SITE_NAME } from '../src/visuals.js';

const base = PRODUCTION_ORIGIN + BASE_PATH;
const read = path => readFile(new URL('../' + path, import.meta.url), 'utf8');

test('game and site manifests retain distinct launch identities, valid scope and existing icons', async () => {
  const site = JSON.parse(await read('dist/manifest.webmanifest'));
  const game = JSON.parse(await read('dist/game.webmanifest'));
  assert.equal(site.id, './');
  assert.equal(site.start_url, './');
  assert.equal(site.name, SITE_NAME);
  assert.equal(game.id, '/buncho-ureshi/game/');
  assert.equal(game.start_url, './game/');
  assert.equal(game.name, '文鳥ぐらし');
  assert.equal(game.short_name, '文鳥ぐらし');
  assert.notDeepEqual(game.icons, site.icons);
  assert.ok(game.icons.every(icon => icon.src.startsWith('game-icons/')));
  assert.ok(site.icons.every(icon => !icon.src.startsWith('game-icons/')));
  for (const [name, manifest, route] of [['manifest.webmanifest', site, ''], ['game.webmanifest', game, 'game/']]) {
    const manifestURL = new URL(name, base);
    const startURL = new URL(manifest.start_url, manifestURL);
    const scope = new URL(manifest.scope, manifestURL);
    assert.equal(startURL.href, base + route);
    assert.equal(scope.href, base, 'related help and exit navigation stays within the app');
    assert.ok(startURL.href.startsWith(scope.href));
    assert.equal(new URL(manifest.id, startURL.origin).href, route ? base + route : PRODUCTION_ORIGIN + '/');
    assert.equal(manifest.display, 'standalone');
    for (const icon of manifest.icons) {
      const path = new URL(icon.src, manifestURL).pathname;
      assert.ok(path.startsWith(BASE_PATH));
      const bytes = await readFile(new URL('../dist/' + path.slice(BASE_PATH.length), import.meta.url));
      assert.equal(bytes.subarray(1, 4).toString(), 'PNG');
    }
  }
});

test('every static route has the right install metadata even without JavaScript', async () => {
  for (const route of [...PAGE_CATALOG.map(([route]) => route), '404.html']) {
    const window = new Window({ url: base + route, settings: { disableJavaScriptEvaluation: true, disableJavaScriptFileLoading: true, disableCSSFileLoading: true } });
    try {
      window.document.write(await read('dist/' + (route === '404.html' ? route : route + 'index.html')));
      const d = window.document, isGame = route === 'game/';
      const name = isGame ? '文鳥ぐらし' : SITE_NAME;
      assert.equal(d.querySelectorAll('link[rel="apple-touch-icon"]').length, 1);
      assert.equal(d.querySelector('link[rel="apple-touch-icon"]').getAttribute('href'), isGame ? GAME_INSTALL_ICON : 'apple-touch-icon.png');
      assert.equal(d.querySelectorAll('link[rel="manifest"]').length, 1);
      const documentBase = new URL(d.querySelector('base').getAttribute('href'), base + route);
      assert.equal(new URL(d.querySelector('link[rel="manifest"]').getAttribute('href'), documentBase).href, base + (isGame ? 'game.webmanifest' : 'manifest.webmanifest'));
      assert.equal(d.querySelector('meta[name="application-name"]').content, name);
      assert.equal(d.querySelector('meta[name="apple-mobile-web-app-title"]').content, name);
    } finally { await window.happyDOM.close(); }
  }
});

test('search, missing routes and ordinary site pages do not inherit the game installation target', () => {
  assert.equal(routeMetadata('game/').installIcon, GAME_INSTALL_ICON);
  assert.equal(routeMetadata('game/', { query: '文鳥' }).installIcon, GAME_INSTALL_ICON);
  assert.equal(routeMetadata('game/').installManifest, 'game.webmanifest');
  assert.equal(routeMetadata('game/', { query: '文鳥' }).installManifest, 'game.webmanifest', 'search parameters never change the game document installation identity');
  for (const metadata of [routeMetadata(''), routeMetadata('help/'), routeMetadata('game/', { notFound: true }), routeMetadata('game/not-real/')]) {
    assert.equal(metadata.installManifest, 'manifest.webmanifest');
    assert.equal(metadata.installName, SITE_NAME);
    assert.equal(metadata.installIcon, 'apple-touch-icon.png');
  }
});
