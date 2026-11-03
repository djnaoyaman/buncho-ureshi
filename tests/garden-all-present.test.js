import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Window} from 'happy-dom';
import {createWorld} from '../src/engine.js';
import {GARDENS, gardenFriendRoster} from '../src/data/gardens.js';
import {encounterSystem} from '../src/encounters.js';
import {renderGardenStage} from '../src/encounter-ui.js';

function fixture(t){
 const window=new Window();t.after(()=>window.happyDOM.close());
 const world=createWorld(1000);
 for(let i=1;i<=4;i++)world.birds.push({...structuredClone(world.birds[0]),id:`present-${i}`,name:`家族${i}`,color:'silver'});
 return {root:window.document.body,world};
}

test('every garden renders every actual companion once in the same animated scene, up to ten birds',t=>{
 const {root,world}=fixture(t);
 for(const garden of GARDENS)for(let number=0;number<=4;number++)for(const selectedIsCompanion of [false,true]){
  world.encounters.garden.id=world.encounters.garden.guestGardenId=garden.id;
  world.encounters.queue=[encounterSystem.catalog[0].id];
  world.encounters.gardenFriends.companions=world.birds.slice(1,number+1).map(b=>b.id);
  const selected=selectedIsCompanion&&number?world.birds[1]:world.birds[0];
  const expected=new Set([selected.id,...world.encounters.gardenFriends.companions]);
  const before=structuredClone(world);
  root.innerHTML=renderGardenStage(world,{selectedBirdId:selected.id});
  const plane=root.querySelector('.finch-garden-image-plane');
  const household=[...plane.querySelectorAll('[data-garden-household]')];
  assert.deepEqual(new Set(household.map(b=>b.dataset.gardenHousehold)),expected);
  assert.equal(household.length,expected.size);
  household.forEach(b=>assert.equal(b.querySelector('.garden-bird-sprite').dataset.gardenBirdId,b.dataset.gardenHousehold));
  const friends=gardenFriendRoster(world,garden.id).filter(f=>!expected.has(f.birdId));
  assert.deepEqual([...plane.querySelectorAll('[data-garden-friend]')].map(b=>b.dataset.gardenFriend),friends.map(f=>f.friendId));
  assert.equal(plane.querySelectorAll('.finch-garden-visitor').length,1);
  const count=expected.size+friends.length+1;
  assert.equal(root.querySelector('.finch-garden-stage').dataset.gardenCount,String(count));
  assert.equal(root.querySelector('.finch-garden-stage').dataset.gardenDensity,count>6?'compact':'regular');
  assert.equal(root.querySelector('.finch-garden-family'),null);
  assert.equal(root.querySelectorAll('.finch-garden-slide').length,1);
  assert.equal(new Set([...plane.querySelectorAll('button')].map(b=>b.getAttribute('style'))).size,count);
  assert.deepEqual(world,before);
 }
});

test('known household references are deduplicated without dropping unrelated friends',t=>{
 const {root,world}=fixture(t);
 const template=world.encounters.gardenFriends.regulars[0];
 world.encounters.gardenFriends.references=[{...template,id:'known-lead',birdId:world.birds[0].id,primaryGardenId:'komorebi'}];
 const before=structuredClone(world);
 root.innerHTML=renderGardenStage(world);
 assert.equal(root.querySelector('[data-garden-friend="known-lead"]'),null);
 assert.equal(root.querySelectorAll(`[data-garden-household="${world.birds[0].id}"]`).length,1);
 assert.deepEqual(world,before);
});

test('compact scene CSS declares 44px minimum targets and staggered terrain spacing (not browser geometry)',()=>{
 const css=readFileSync(new URL('../src/encounter-ui.css',import.meta.url),'utf8');
 assert.match(css,/data-garden-density=compact[^}]+--garden-row-gap:clamp\(60px,8cqh,64px\)/);
 assert.match(css,/data-garden-density=compact[^}]+width:44px;height:52px;min-width:44px;min-height:44px/);
 assert.doesNotMatch(css,/\.finch-garden-family/);
});

test('absent guests and unselected non-companions are not invented; duplicate companions stay singular',t=>{
 const {root,world}=fixture(t);
 world.encounters.garden.guestGardenId='mizukagami';
 world.encounters.queue=[encounterSystem.catalog[0].id];
 world.encounters.gardenFriends.companions=[world.birds[1].id,world.birds[1].id];
 const before=structuredClone(world);
 root.innerHTML=renderGardenStage(world,{selectedBirdId:'missing-selected-id'});
 assert.deepEqual([...root.querySelectorAll('[data-garden-household]')].map(b=>b.dataset.gardenHousehold),[world.birds[0].id,world.birds[1].id]);
 assert.equal(root.querySelector('.finch-garden-visitor'),null);
 assert.equal(root.querySelector('.finch-garden-stage').dataset.gardenCount,'6');
 assert.deepEqual(world,before);
});
