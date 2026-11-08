import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';

test('every reachable built module import carries a cache version and resolves', async () => {
  const visited = new Set();
  async function visit(file) {
    if (visited.has(file)) return;
    visited.add(file);
    const source = await readFile(file, 'utf8');
    for (const match of source.matchAll(/(?:from\s*|import\s*\(?\s*)["'](\.[^"']+\.js(?:\?[^"']*)?)["']/g)) {
      const specifier = match[1];
      assert.match(specifier, /\?v=[a-f0-9-]+$/, `${file}: ${specifier} must refresh with its source`);
      const dependency = path.resolve(path.dirname(file), specifier.split('?')[0]);
      assert.ok((await stat(dependency)).isFile(), specifier);
      await visit(dependency);
    }
  }
  await visit(path.resolve('dist/src/app.js'));
  assert.ok(visited.size > 40, 'walk the actual site and game dependency graph');
});

test('metadata importer refreshes when its article and photo data change', async () => {
  const app = await readFile('dist/src/app.js', 'utf8');
  const metadata = await readFile('dist/src/metadata.js', 'utf8');
  const dataVersion = app.match(/\.\/data\/articles\.js\?v=([a-f0-9]+)["']/)?.[1];
  const metadataVersion = app.match(/\.\/metadata\.js\?v=([a-f0-9-]+)["']/)?.[1];
  assert.ok(dataVersion);
  assert.ok(metadataVersion?.endsWith('-' + dataVersion), 'the importer must change with the data URL it contains');
  assert.ok(metadata.includes('./data/articles.js?v=' + dataVersion));
  assert.ok(metadata.includes('./data/photos.js?v=' + dataVersion));
});
