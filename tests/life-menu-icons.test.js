import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { Window } from 'happy-dom';
import sharp from 'sharp';
import { LIFE_MENU_ITEMS, renderLifeMenuIcon } from '../src/life-menu-icons.js';

const approved = JSON.parse(await readFile(new URL('./fixtures/life-menu-icons-approved.json', import.meta.url), 'utf8'));
const expected = ['health','profile','relations','family','roster','notebook','diary','memorial','settings','help'];
function resolvedSvg(svg) {
  return svg.replaceAll('var(--menu-icon-paper, #fffaf1)', '#fffaf1').replaceAll('var(--menu-icon-apricot, #e8b69f)', '#e8b69f').replaceAll('var(--menu-icon-sage, #b5cbb3)', '#b5cbb3').replaceAll('currentColor', '#705b49');
}
test('the approved ten IDs, labels and order remain frozen', () => {
  assert.deepEqual(LIFE_MENU_ITEMS.map(([id]) => id), expected);
  assert.deepEqual(LIFE_MENU_ITEMS.map(([,label]) => label), ['健康・お留守番','文鳥の紹介','関係図','家系図','名簿','庭の鳥図鑑','日記','思い出の庭','保存・設定','あそびかた']);
  assert.ok(Object.isFrozen(LIFE_MENU_ITEMS));
  assert.ok(LIFE_MENU_ITEMS.every(Object.isFrozen));
});
for (const [id] of LIFE_MENU_ITEMS) {
  test(`${id}: decorative SVG retains the approved shapes and no active content`, async () => {
    const window = new Window();
    try {
      const parse = text => new window.DOMParser().parseFromString(text, 'image/svg+xml');
      const doc = parse(resolvedSvg(renderLifeMenuIcon(id))), reference = parse(resolvedSvg(approved[id]));
      assert.equal(doc.querySelector('parsererror'), null);
      const svg = doc.documentElement;
      assert.equal(svg.getAttribute('viewBox'), '0 0 32 32');
      assert.equal(svg.getAttribute('aria-hidden'), 'true');
      assert.equal(svg.getAttribute('focusable'), 'false');
      assert.equal(svg.getAttribute('stroke-width'), '1.65');
      assert.equal(svg.getAttribute('stroke-linecap'), 'round');
      assert.equal(svg.getAttribute('stroke-linejoin'), 'round');
      assert.equal(svg.querySelectorAll('script,image,use,foreignObject,style,[id],[href],[tabindex]').length, 0);
      const geometry = root => [...root.querySelectorAll('path,rect,circle')].map(el => [el.tagName,[...el.attributes].map(a=>[a.name,a.value]).sort()]);
      assert.deepEqual(geometry(svg),geometry(reference), 'reuse the approved vector geometry and colors');
    } finally { await window.happyDOM.close(); }
  });
  for (const size of [24,28,36]) test(`${id}: ${size}px has visible geometry without clipped edges`, async () => {
    const {data,info} = await sharp(Buffer.from(resolvedSvg(renderLifeMenuIcon(id)))).resize(size,size).ensureAlpha().raw().toBuffer({resolveWithObject:true});
    let pixels=0;const bounds={minX:size,minY:size,maxX:-1,maxY:-1};
    for(let y=0;y<size;y++)for(let x=0;x<size;x++)if(data[(y*size+x)*info.channels+3]>24){pixels++;bounds.minX=Math.min(bounds.minX,x);bounds.maxX=Math.max(bounds.maxX,x);bounds.minY=Math.min(bounds.minY,y);bounds.maxY=Math.max(bounds.maxY,y);}
    assert.ok(pixels>size*size*.12);
    assert.ok(bounds.minX>0&&bounds.minY>0&&bounds.maxX<size-1&&bounds.maxY<size-1,JSON.stringify(bounds));
  });
}
test('unknown and inherited keys cannot enter SVG markup', () => {
  for(const key of ['<script>','constructor','__proto__','toString',''])assert.throws(()=>renderLifeMenuIcon(key),RangeError);
});
test('production cache version covers the icon source and versioned import', async () => {
  const build=await readFile(new URL('../scripts/build.mjs',import.meta.url),'utf8');
  const inputs=build.slice(build.indexOf('const gameVersion ='),build.indexOf('const securityPolicy ='));
  assert.ok(inputs.includes('"life-menu-icons.js"'));
  assert.ok(build.includes('.replaceAll("./life-menu-icons.js", `./life-menu-icons.js?v=${gameVersion}`)'));
});
