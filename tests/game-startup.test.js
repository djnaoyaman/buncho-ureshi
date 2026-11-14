import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('only game document has an inline startup shell before scripts execute', async () => {
  const game = await readFile(new URL('../dist/game/index.html', import.meta.url), 'utf8');
  assert.match(game, /<html[^>]+data-game-startup="pending"/);
  assert.match(game, /id="game-startup-style"/);
  assert.match(game, /html\[data-game-startup\] \.site-header/);
  assert.match(game, /class="game-startup"/);
  assert.match(game, /ひらかないときは、もういちど/);
  assert.match(game, /JavaScriptを有効にするとあそべます/);
  assert.doesNotMatch(game, /<h2>文鳥の庭をめぐる<\/h2>/);
  assert(game.indexOf('id="game-startup-style"') < game.indexOf('src/analytics-loader.js'));
  for (const path of ['index.html', 'encyclopedia/index.html', 'studio/index.html']) {
    const site = await readFile(new URL('../dist/' + path, import.meta.url), 'utf8');
    assert.doesNotMatch(site, /data-game-startup|id="game-startup-style"|class="game-startup"/);
  }
});
