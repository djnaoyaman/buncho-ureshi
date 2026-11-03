import test from 'node:test';
import assert from 'node:assert/strict';
import { Window } from 'happy-dom';
import { createWorld, renameBird } from '../src/engine.js';
import { GARDENS } from '../src/data/gardens.js';
import { encounterSystem } from '../src/encounters.js';
import { renderGardenStage, renderFinchGarden } from '../src/encounter-ui.js';
import { mountEncounterPanel } from '../src/encounter-controller.js';

function fixture(t) {
  const window = new Window();
  t.after(() => window.happyDOM.close());
  return window.document.body;
}

test('every garden visibly renders the original household bird without changing the save', t => {
  const root = fixture(t), world = createWorld(1000);
  for (const garden of GARDENS) {
    world.encounters.garden.id = garden.id;
    const before = structuredClone(world);
    root.innerHTML = renderGardenStage(world);
    const lead = root.querySelector('[data-garden-household]');
    assert.ok(lead, `${garden.id} has a household protagonist`);
    assert.equal(lead.dataset.gardenHousehold, world.birds[0].id);
    assert.match(lead.textContent, /おもち/);
    assert.equal(lead.querySelector('.garden-bird-sprite').dataset.gardenBirdId, world.birds[0].id);
    assert.equal(root.querySelectorAll('.finch-garden-friend').length, 4);
    assert.deepEqual(world, before);
  }
});

test('selection and renamed identities are rendered from save data rather than an Omochi constant', t => {
  const root = fixture(t), world = createWorld(1000);
  renameBird(world, world.birds[0].id, 'しろまる');
  const second = structuredClone(world.birds[0]);
  Object.assign(second, { id: 'saved-resident-42', name: 'あずき<&>', color: 'cinnamon' });
  world.birds.push(second);
  const before = structuredClone(world);
  for (const render of [renderGardenStage, renderFinchGarden]) {
    root.innerHTML = render(world, { selectedBirdId: second.id });
    const lead = root.querySelector('[data-garden-household]');
    assert.equal(lead.dataset.gardenHousehold, second.id);
    assert.ok(lead.textContent.includes(second.name));
    assert.equal(lead.querySelector('.garden-bird-sprite').dataset.color, 'cinnamon');
    assert.doesNotMatch(lead.textContent, /おもち/);
    assert.equal(lead.querySelectorAll('script').length, 0);
  }
  assert.deepEqual(world, before);
});

test('invalid, departed and nest-only selections fall back to an eligible resident', t => {
  const root = fixture(t), world = createWorld(1000);
  for (const excluded of [{id:'missing'}, {id:'away',home:'departed',stage:'adult'}, {id:'egg',home:'resident',stage:'egg'}, {id:'chick',home:'resident',stage:'chick'}, {id:'visitor',home:'visitor',stage:'adult'}]) {
    if (excluded.home) world.birds.push({...structuredClone(world.birds[0]), ...excluded});
    root.innerHTML = renderGardenStage(world, {selectedBirdId:excluded.id});
    assert.equal(root.querySelector('[data-garden-household]').dataset.gardenHousehold, world.birds[0].id);
  }
  world.birds = world.birds.filter(b => b.id !== world.birds[0].id);
  root.innerHTML = renderGardenStage(world);
  assert.equal(root.querySelector('[data-garden-household]'), null);
});

test('guest and protagonist coexist and tapping the protagonist only calls the host', t => {
  const root = fixture(t), world = createWorld(1000), calls = [];
  world.paused = true;
  const guest = encounterSystem.catalog.find(e => e.gardenEvent.gardenIds.includes('komorebi'));
  assert.ok(guest);
  world.encounters.garden.id = world.encounters.garden.guestGardenId = 'komorebi';
  world.encounters.queue = [guest.id];
  const before = structuredClone(world);
  const panel = mountEncounterPanel(root, {
    getWorld: () => world,
    transact: () => assert.fail('Opening a household bird must not transact'),
    initialMode: 'garden',
    onHouseholdBird: id => calls.push(id),
  });
  t.after(() => panel.destroy());
  assert.equal(root.querySelector('.finch-garden-visitor').dataset.encounterOpen, guest.id);
  assert.equal(root.querySelectorAll('.finch-garden-friend').length, 4);
  root.querySelector('[data-garden-household]').click();
  assert.deepEqual(calls, [world.birds[0].id]);
  assert.deepEqual(world, before);
});

test('selected family member is the lead and other companions remain individually tappable', t => {
  const root = fixture(t), world = createWorld(1000), calls = [];
  world.paused = true;
  const second = {...structuredClone(world.birds[0]), id:'family-second', name:'こまめ', color:'silver'};
  world.birds.push(second);
  world.encounters.gardenFriends.companions = [world.birds[0].id, second.id];
  const before = structuredClone(world);
  let selected = second.id;
  const panel = mountEncounterPanel(root, {
    getWorld:()=>world, getSelectedBirdId:()=>selected, initialMode:'garden',
    transact:()=>assert.fail('Selection must not transact'),
    onHouseholdBird:id=>{calls.push(id);selected=id;},
  });
  t.after(()=>panel.destroy());
  assert.equal(root.querySelector('.finch-garden-household').dataset.gardenHousehold,second.id);
  assert.equal(root.querySelectorAll('[data-garden-household]').length,2);
  const companion = root.querySelector(`[data-garden-household="${world.birds[0].id}"]`);
  assert.equal(companion.dataset.gardenHousehold,world.birds[0].id);
  companion.click();
  panel.refresh();
  assert.equal(root.querySelector('.finch-garden-household').dataset.gardenHousehold,world.birds[0].id);
  assert.deepEqual(calls,[world.birds[0].id]);
  assert.deepEqual(world,before);
});
