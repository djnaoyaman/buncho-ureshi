import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import sharp from 'sharp';
import {CROW_SPECIES} from '../src/garden-crows.js';
import {CROW_ART} from '../src/garden-crow-ui.js';

test('all five crow assets decode with exact transparent measurements used by the shared scale',async()=>{
 const notes=JSON.parse(await readFile(new URL('../docs/CROW-ART-ASSETS.json',import.meta.url),'utf8'));
 assert.deepEqual(notes.species.map(s=>s.id),CROW_SPECIES.map(s=>s.id));
 for(const species of CROW_SPECIES){
  const record=notes.species.find(s=>s.id===species.id),art=CROW_ART[species.id],file=new URL(`../public/game-art/crows/${species.id}.webp`,import.meta.url),bytes=await readFile(file);
  const metadata=await sharp(bytes).metadata();assert.equal(metadata.format,'webp');assert.equal(metadata.hasAlpha,true);assert.equal(metadata.width,record.width);assert.equal(metadata.height,record.height);assert(bytes.length<350000);
  const {data,info}=await sharp(bytes).ensureAlpha().raw().toBuffer({resolveWithObject:true});let left=info.width,right=-1,top=info.height,bottom=-1,transparent=0;
  for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++){const alpha=data[(y*info.width+x)*4+3];if(alpha===0)transparent++;if(alpha>=64){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);}}
  assert(transparent>info.width*info.height*.1,`${species.id} keeps genuine transparent margins`);assert.deepEqual([left,top,right+1,bottom+1],record.bbox,species.id);
  assert.equal(record.bodyLengthCm,species.lengthCm);assert.equal(art.artWidthFraction,(right+1-left)/info.width);assert.equal(art.footY,record.footAnchor.y);assert(art.footY>top/info.height&&art.footY<=(bottom+1)/info.height);
 }
});
