import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import sharp from 'sharp';
import {gameCareBirdSvg,gameBirdSvg,gameSpriteGeometry} from '../src/game.js';

test('egg silhouette is a rounded ovoid rather than an elongated pointed drop',async()=>{
 const svg=await readFile(new URL('../public/game-art/egg.svg',import.meta.url));
 const {data,info}=await sharp(svg).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 const rows=[];
 for(let y=0;y<info.height;y++){
  const xs=[];for(let x=0;x<info.width;x++)if(data[(y*info.width+x)*4+3]>127)xs.push(x);
  if(xs.length)rows.push({y,left:xs[0],right:xs.at(-1),width:xs.length});
 }
 const height=rows.length,width=Math.max(...rows.map(r=>r.width));
 assert(width/height>.72&&width/height<.80,'natural broad egg proportions');
 assert.equal(rows.at(-1).y,974,'existing bottom contact stays unchanged');
 // A rounded base widens quickly just above the pole, unlike the old cusp.
 assert(rows.at(-11).width/width>.25,'base is round, not a pointed teardrop');
 assert(rows[Math.floor(height*.75)].width>rows[Math.floor(height*.25)].width,'lower half is fuller than the upper half');
 for(const r of rows)assert(Math.abs((r.left+r.right)/2-458.5)<=1,'left/right contour is balanced');
 assert.deepEqual(gameSpriteGeometry('white','egg').footY,975);
});
test('care and all regular egg portraits share one corrected asset without state changes',()=>{
 for(const color of ['white','sakura','silver','cinnamon']){
  assert.equal(gameCareBirdSvg(color,'egg'),gameBirdSvg(color,'egg'));
  assert.match(gameCareBirdSvg(color,'egg'),/game-art\/egg\.svg/);
 }
});

test('one through ten eggs and chicks stay inside the fixed nest opening',async()=>{
 const {fieldPositions}=await import('../src/field-visuals.js');
 for(const variant of ['tall','wide'])for(const stage of ['egg','chick'])for(let count=1;count<=10;count++){
  const birds=Array.from({length:count},(_,i)=>({id:`b${i+1}`,stage,action:{kind:'rest'}}));
  const copy=structuredClone(birds),positions=fieldPositions(birds,variant,'home'),aspect=variant==='tall'?.75:1.6;
  for(const p of positions.values()){
   assert.equal(p.interactive,false);assert.equal(p.zone,'nest');
   assert(p.x-p.width*.54>.78&&p.x+p.width*.46<.89,`${variant}/${stage}/${count} inside nest horizontally`);
   assert(p.y-p.width/.85*aspect*.975>.52&&p.y+p.width/.85*aspect*.025<.60,`${variant}/${stage}/${count} inside nest vertically`);
  }
  assert.deepEqual(birds,copy);
 }
});
