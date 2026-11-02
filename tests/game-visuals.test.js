import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import { Window } from 'happy-dom';
import { gameBirdSvg, gameSpriteGeometry, GAME_SPRITE_ASSETS } from '../src/game.js';

// Tests the actual shipped asset contract, not photorealism or browser layout.
// The independent visual review and Playwright screenshots remain necessary.
test('photo artwork has exact local adult/juvenile colors and real stage assets without fake anatomy groups',async()=>{
  const window=new Window();
  try{
    for(const color of ['white','sakura','silver','cinnamon'])for(const stage of ['egg','chick','juvenile','adult']){
      const root=window.document.createElement('div');root.innerHTML=gameBirdSvg(color,stage);
      assert.equal(root.children.length,1);
      const sprite=root.firstElementChild,img=sprite.querySelector('img');
      assert.equal(sprite.tagName,'SPAN');assert.equal(sprite.getAttribute('aria-hidden'),'true');
      assert.equal(sprite.dataset.stage,stage);assert.equal(sprite.dataset.color,color);
      const g=gameSpriteGeometry(color,stage),asset=stage==='adult'?`${color}-poses`:stage==='juvenile'?`juvenile-${color}-poses`:stage;assert.equal(g.asset,asset);
      assert.equal(sprite.dataset.asset,asset);assert.equal(img.getAttribute('alt'),'');
      assert.ok(img.src.endsWith(`/game-art/${asset}.${stage==='egg'?'svg':'webp'}`));
      assert.equal(img.getAttribute('draggable'),'false');
      assert.equal(root.querySelectorAll('svg,script,foreignObject,[data-part],[onclick],[onload]').length,0);
      assert.doesNotMatch(root.innerHTML,/NaN|Infinity|undefined|IMG_|generated_images/);
      const source=g;
      assert.equal(Number(img.getAttribute('width')),source.width);assert.equal(Number(img.getAttribute('height')),source.height);
      assert.ok(g.imageWidth>0&&Number.isFinite(g.imageLeft)&&Number.isFinite(g.imageTop));
      assert.ok(Math.abs(g.imageLeft*850+source.footX*source.scale-459)<.0001);
      assert.ok(Math.abs(g.imageTop*1000+source.footY*source.scale-975)<.0001);
      assert.ok((await stat(new URL(`../public/game-art/${asset}.${stage==='egg'?'svg':'webp'}`,import.meta.url))).size>100);
    }
    assert.equal(gameBirdSvg('../../private','bad'),gameBirdSvg('white','adult'));
    assert.equal(new Set(['white','sakura','silver','cinnamon'].map(c=>gameSpriteGeometry(c,'juvenile').asset)).size,4);
  }finally{await window.happyDOM.close();}
});

test('egg is a local smooth native shape with a subtle gradient, not a halo bitmap or remote asset',async()=>{
  const source=await readFile(new URL('../public/game-art/egg.svg',import.meta.url),'utf8');
  assert.match(source,/<radialGradient\b/);assert.match(source,/<path\b/);
  assert.doesNotMatch(source,/<image\b|<script\b|foreignObject|stroke=|onload=|href=/);
  assert.doesNotMatch(source,/IMG_|generated_images|data:image/);
});
