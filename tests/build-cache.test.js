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
