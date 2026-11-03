import {test} from 'node:test';
import assert from 'node:assert/strict';
import {renderOwnerPeek,ownerAnimationDelay,OWNER_GLANCE_CYCLE_MS} from '../src/owner-peek.js';
import {OWNER_CHOICES} from '../src/owner-profile.js';
test('scene observer reflects each wardrobe category without unsafe markup',()=>{
 const normalizeIds=s=>s.replace(/owner-art-\d+/g,'owner-art-X');
 const baseline=normalizeIds(renderOwnerPeek({}));
 for(const [key,choices] of Object.entries(OWNER_CHOICES))for(const [id] of choices){
  const svg=normalizeIds(renderOwnerPeek({[key]:id}));
  assert.match(svg,/owner-peek-back/);assert.match(svg,/owner-peek-glance/);
  assert.doesNotMatch(svg,/<script|onload=|https?:/i);
  if(id!==({hair:'bob',skin:'peach',hairColor:'chestnut',outfit:'apron',palette:'leaf',accessory:'birdpin',eyes:'gentle',face:'round'})[key]) assert.notEqual(svg,baseline,`${key}:${id} changes the scene illustration`);
 }
 assert.equal(normalizeIds(renderOwnerPeek({hair:'<script>'})),baseline);
});


test('animation phase is stable across scene redraws',()=>{
 assert.equal(OWNER_GLANCE_CYCLE_MS,12000);
 assert.equal(ownerAnimationDelay(1000),-1000);
 assert.equal(ownerAnimationDelay(7400),-7400);
 assert.equal(ownerAnimationDelay(13000),-1000);
 assert.equal(ownerAnimationDelay(NaN),0);
});

test('bird brooch is a complete bird; none leaves it out',()=>{
 assert.match(renderOwnerPeek({accessory:'birdpin'}),/data-owner-birdpin/);
 assert.doesNotMatch(renderOwnerPeek({accessory:'none'}),/data-owner-birdpin/);
});

test('glance occupies one tenth of its cycle',async()=>{
 const css=await (await import('node:fs/promises')).readFile(new URL('../src/game.css',import.meta.url),'utf8');
 assert.match(css,/@keyframes owner-glance\{0%,78%,88%,100%\{opacity:0\}79%,87%\{opacity:1\}\}/);
});
