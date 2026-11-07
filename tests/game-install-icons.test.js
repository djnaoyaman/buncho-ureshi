import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import sharp from 'sharp';
import { GAME_INSTALL_ICONS, GAME_ICON_BACKGROUND } from '../scripts/game-install-icons.mjs';
const read = path => readFile(new URL('../' + path, import.meta.url));

test('Home Screen icons keep the complete approved game logo, opaque and square at each declared size', async () => {
  const source = await read('public/game-art/game-title.png');
  assert.equal(createHash('sha256').update(source).digest('hex'), 'b214cf45cf7e42ee5ffe26e88e55700c7cd68610ebba90ad7742a37977030cc3');
  for (const [name, size, fraction] of GAME_INSTALL_ICONS) {
    const bytes = await read('dist/game-icons/' + name);
    const metadata = await sharp(bytes).metadata();
    assert.equal(metadata.format, 'png');
    assert.equal(metadata.width, size); assert.equal(metadata.height, size);
    const { data, info } = await sharp(bytes).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    for (let i = 3; i < data.length; i += 4) assert.equal(data[i], 255, 'iOS must not fill transparent pixels black');
    assert.deepEqual([...data.subarray(0, 4)], [255, 249, 235, 255]);
    const width = Math.round(size * fraction);
    const resized = await sharp(source).resize({ width, withoutEnlargement: true }).png().toBuffer();
    const { data: logo, info: shape } = await sharp(resized)
      .flatten({ background: GAME_ICON_BACKGROUND }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const left = Math.floor((size - shape.width) / 2), top = Math.floor((size - shape.height) / 2);
    // No crop, distortion or new artwork: each displayed logo pixel comes from
    // the same full source, resized proportionally and placed on the paper.
    const actual = await sharp(bytes).extract({ left, top, width: shape.width, height: shape.height }).ensureAlpha().raw().toBuffer();
    // libvips alpha rounding differs by at most one when flattening before vs
    // after compositing, so compare channels rather than encoded PNG bytes.
    assert.equal(actual.length, logo.length);
    for (let i = 0; i < actual.length; i++) assert.ok(Math.abs(actual[i] - logo[i]) <= 1, `${name} channel ${i}`);
    if (name.includes('maskable')) {
      for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) {
        const i = (y * info.width + x) * 4;
        if (data[i] === 255 && data[i + 1] === 249 && data[i + 2] === 235) continue;
        assert.ok(Math.hypot(x - size / 2, y - size / 2) <= size * 0.4, 'all artwork stays inside the maskable safe circle');
      }
    }
  }
});
