import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import sharp from 'sharp';
import {gameCareBirdSvg} from '../src/game.js';

test('all nine care illustrations are real transparent, decodable WebP assets',async()=>{
  const names=['white','sakura','silver','cinnamon'].flatMap(color=>[`${color}-adult`,`${color}-juvenile`]).concat('chick');
  for(const name of names){
    const file=new URL(`../public/game-art/care-illustrations/${name}.webp`,import.meta.url),bytes=await readFile(file);
    const meta=await sharp(bytes).metadata();
    assert.equal(meta.format,'webp',name);assert.equal(meta.hasAlpha,true,name);
    assert(meta.width>=400&&meta.height>=400,`${name} has enough detail at enlarged size`);
    assert(meta.width<=2048&&meta.height<=2048,`${name} stays bounded for small devices`);
    assert(bytes.length<1024*1024,`${name} stays below 1 MiB`);
    const [color,stage]=name==='chick'?['white','chick']:name.split('-');
    assert(gameCareBirdSvg(color,stage).includes(`care-illustrations/${name}.webp`));
  }
});
