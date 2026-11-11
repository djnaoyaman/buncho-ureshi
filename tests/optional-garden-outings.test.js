// Deliberate active-clock deadline setup; return protection is covered separately.
const advanceTo=(w,at)=>advanceActiveClock(w,at,{present:true});
import test from 'node:test';
import assert from 'node:assert/strict';
import {IDBFactory} from 'fake-indexeddb';
import {
  createWorld, createBird, economyToken, validateWorld, readCompatibleWorld,
  serializeWorld, parseSave, advanceTo as advanceActiveClock, advanceGardenRaptor,
} from '../src/engine.js';
import {createEncounterSystem, encounterFriendship} from '../src/encounters.js';
import {ENCOUNTER_CANDIDATES} from '../src/data/encounter-catalog.js';
import {
  GARDEN_IDS, gardenCompanionRoster, gardenFriendRoster, closeGardenAcquaintance,
} from '../src/data/gardens.js';
import {rememberGardenAcquaintances} from '../src/garden-friends.js';
import {lifeStatus, accidentLifeBird} from '../src/life-care.js';
import {getProtagonistId} from '../src/protagonist.js';
import {arriveGardenCrow, crowTarget, crowScene} from '../src/garden-crows.js';
import {
  arriveGardenRaptor, raptorToken, raptorTarget, raptorScene, escapeGardenRaptor,
} from '../src/garden-raptors.js';
import {openGameStore, DB_NAME, STORAGE_KEY} from '../src/game-store.js';

const NOW = Date.UTC(2026, 10, 6), DAY = 86400000;
const clone = structuredClone;
const system = createEncounterSystem(ENCOUNTER_CANDIDATES);
const fresh = () => createWorld(NOW, 842911);
const guard = w => economyToken(w);
const predatorGuard = w => ({...raptorToken(w), gardenId:w.encounters.garden.id});
const select = (w, id='komorebi', s=system) => s.selectGarden(w, id, guard(w));
const leave = (w, s=system) => s.leaveGarden(w, guard(w));
const snapshot = (w, id=w.encounters.garden.id) => w.encounters.gardenFriends.visits.find(v => v.gardenId === id);
const attendees = w => gardenCompanionRoster(w).map(row => row.birdId);
const friends = (w, id=w.encounters.garden.id) => gardenFriendRoster(w, id).map(row => row.friendId);
const protectedState = w => clone(Object.fromEntries([
  'worldId', 'seed', 'tick', 'nextId', 'nextEvent', 'birds', 'events', 'gems', 'decor',
  'economy', 'care', 'careSchedule', 'lifecycle', 'protagonist', 'adoption', 'field',
].map(key => [key, w[key]])));

function relation(w, bird, affection=66, trust=51) {
  w.birds.find(b => b.id === getProtagonistId(w)).relations[bird.id] = {
    affection, trust, compatibility:70, meetings:1, lastTick:w.tick,
  };
  return bird;
}
function departed(w, options={}) {
  return relation(w, createBird(w, {home:'departed', stage:'adult', ...options}));
}
function reference(w, bird, affinity=0) {
  const record = {
    id:`known-${bird.id}`, birdId:bird.id, primaryGardenId:'komorebi',
    affinity, lastInteractionTick:null, memories:[],
  };
  w.encounters.gardenFriends.references.push(record);
  return record;
}
function discover(w, id, points=60) {
  w.encounters.discoveries.push({id, firstTick:w.tick, lastTick:w.tick, visits:1, instanceId:w.encounters.nextId++});
  w.encounters.friendship.push({id, petPoints:points-10});
}
function accompany(w, ids=['b1']) {
  assert.equal(system.chooseCompanions(w, ids, guard(w)).changed, true);
  assert.equal(system.chooseAccompaniment(w, true, guard(w)).changed, true);
}
function legacyV11(w) {
  const old = clone(w);
  old.encounters.version = 11;
  old.encounters.gardenFriends.version = 1;
  for (const key of ['accompany', 'attendees', 'visits']) delete old.encounters.gardenFriends[key];
  return old;
}
function visitWith(w, friendId) {
  for (let i=0; i<40; i++) {
    leave(w); select(w);
    if (friends(w).includes(friendId)) return;
  }
  assert.fail(`Close friend ${friendId} never appeared across 40 real visits`);
}
async function raw(indexedDB, value) {
  const db = await new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore('world');
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction('world', value === undefined ? 'readonly' : 'readwrite');
      const req = value === undefined ? tx.objectStore('world').get('current') : tx.objectStore('world').put(value, 'current');
      tx.oncomplete = () => resolve(req.result);
      tx.onerror = tx.onabort = () => reject(tx.error);
    });
  } finally { db.close(); }
}

test('new worlds leave every family bird home by default, even with a saved selection', () => {
  const w = fresh();
  assert.equal(w.encounters.version, 13);
  assert.equal(w.encounters.gardenFriends.version, 2);
  assert.equal(w.encounters.gardenFriends.accompany, false);
  assert.deepEqual(w.encounters.gardenFriends.attendees, []);
  assert.deepEqual(w.encounters.gardenFriends.companions, []);
  assert.equal(system.chooseCompanions(w, ['b1'], guard(w)).changed, true);
  const before = protectedState(w);
  for (const id of GARDEN_IDS) {
    select(w, id);
    assert.deepEqual(attendees(w), []);
    assert.equal(friends(w).length, 4);
    assert.ok(friends(w).every(id => id.startsWith('gf-')));
  }
  assert.deepEqual(protectedState(w), before);
  assert.deepEqual(parseSave(serializeWorld(w)), w);
});

for (const entry of ['selectGarden', 'enterGarden']) test(`${entry} freezes only eligible selected family when a real outing starts`, () => {
  const w = fresh(), second = createBird(w, {home:'resident', stage:'juvenile'});
  accompany(w, ['b1', second.id]);
  const before = protectedState(w);
  const enter = () => entry === 'selectGarden' ? select(w) : system.enterGarden(w, guard(w));
  enter();
  assert.deepEqual(attendees(w), ['b1', second.id]);
  assert.equal(system.chooseCompanions(w, [second.id], guard(w)).changed, true);
  assert.equal(system.chooseAccompaniment(w, false, guard(w)).changed, true);
  assert.deepEqual(w.encounters.gardenFriends.attendees, ['b1', second.id]);
  const savedVisit = clone(snapshot(w)), count = w.encounters.garden.visits.komorebi;
  assert.equal(enter().resumed, true);
  assert.deepEqual(snapshot(w), savedVisit);
  assert.equal(w.encounters.garden.visits.komorebi, count);
  select(w, 'mizukagami');
  assert.deepEqual(attendees(w), ['b1', second.id], 'changing gardens is not returning home');
  leave(w);
  assert.deepEqual(attendees(w), []);
  enter();
  assert.deepEqual(attendees(w), [], 'the off preference takes effect only on departure');
  system.chooseAccompaniment(w, true, guard(w));
  assert.deepEqual(attendees(w), []);
  leave(w); enter();
  assert.deepEqual(attendees(w), [second.id]);
  assert.deepEqual(protectedState(w), before);
  assert.deepEqual(parseSave(serializeWorld(w)), w);
});

test('eligibility is rechecked at departure without replacing unavailable selected birds', () => {
  const w = fresh(), second = createBird(w, {home:'resident'});
  accompany(w, ['b1', second.id]);
  second.home = 'departed';
  const third = createBird(w, {home:'resident'}), before = protectedState(w);
  select(w);
  assert.deepEqual(w.encounters.gardenFriends.companions, ['b1', second.id]);
  assert.deepEqual(attendees(w), ['b1']);
  assert.ok(!attendees(w).includes(third.id));
  assert.deepEqual(protectedState(w), before);
  validateWorld(w);
});

test('invalid preferences and stale world or revision guards are immutable no-ops', () => {
  const w = fresh(), visitor = createBird(w, {home:'visitor'}), away = departed(w);
  const egg = createBird(w, {home:'resident', stage:'egg'}), chick = createBird(w, {home:'resident', stage:'chick'});
  const dead = createBird(w, {home:'resident'});
  accidentLifeBird(w, dead.id, NOW);
  for (const ids of [null, 'b1', ['missing'], ['b1', 'b1'], [visitor.id], [away.id], [egg.id], [chick.id], [dead.id], Array(5).fill('b1')]) {
    const before = clone(w);
    assert.equal(system.chooseCompanions(w, ids, guard(w)).reason, 'companion');
    assert.deepEqual(w, before);
  }
  for (const enabled of [null, 0, 1, 'true', [], {}]) {
    const before = clone(w);
    assert.equal(system.chooseAccompaniment(w, enabled, guard(w)).reason, 'companion');
    assert.deepEqual(w, before);
  }
  select(w);
  for (const stale of [{...guard(w), revision:w.revision+1}, {...guard(w), worldId:'another-world'}]) {
    const before = clone(w);
    for (const operation of [
      () => system.chooseCompanions(w, ['b1'], stale),
      () => system.chooseAccompaniment(w, true, stale),
      () => system.enterGarden(w, stale),
      () => system.selectGarden(w, 'mizukagami', stale),
      () => system.leaveGarden(w, stale),
      () => system.meetGardenFriend(w, friends(w)[0], 'chat', stale),
    ]) assert.equal(operation().reason, 'stale');
    assert.deepEqual(w, before);
  }
  validateWorld(w);
});

test('companion selections copy caller arrays instead of retaining mutable input', () => {
  const w = fresh(), ids = ['b1'];
  system.chooseCompanions(w, ids, guard(w));
  ids.push('b999');
  assert.deepEqual(w.encounters.gardenFriends.companions, ['b1']);
  system.chooseAccompaniment(w, true, guard(w)); select(w);
  w.encounters.gardenFriends.companions.length = 0;
  assert.deepEqual(w.encounters.gardenFriends.attendees, ['b1']);
  validateWorld(w);
});

test('only living departed close adults or juveniles are newly enrolled, including descendants', () => {
  const w = fresh(), father = createBird(w, {home:'resident', sex:'male'});
  const adult = departed(w), juvenile = departed(w, {stage:'juvenile'});
  const descendant = departed(w, {parents:['b1', father.id], generation:1});
  const exactAffection = departed(w), exactTrust = departed(w), stranger = departed(w);
  relation(w, exactAffection, 65, 80); relation(w, exactTrust, 80, 50); relation(w, stranger, 0, 0);
  const visitor = relation(w, createBird(w, {home:'visitor'}));
  const resident = relation(w, createBird(w, {home:'resident'}));
  const egg = departed(w, {stage:'egg'}), chick = departed(w, {stage:'chick'});
  const dead = relation(w, createBird(w, {home:'resident'})); accidentLifeBird(w, dead.id, NOW);
  const before = protectedState(w);
  rememberGardenAcquaintances(w);
  assert.deepEqual(w.encounters.gardenFriends.references.map(r => r.birdId), [adult.id, juvenile.id, descendant.id]);
  for (const b of [exactAffection, exactTrust, stranger, visitor, resident, egg, chick, dead]) assert.equal(closeGardenAcquaintance(w, b), false, b.id);
  const refs = clone(w.encounters.gardenFriends.references);
  rememberGardenAcquaintances(w);
  assert.deepEqual(w.encounters.gardenFriends.references, refs, 'enrollment is idempotent');
  assert.deepEqual(protectedState(w), before);
  validateWorld(w);
});

test('a retained garden bond of 60 qualifies an old friend while 59 and weak newcomers do not', () => {
  const w = fresh(), oldFriend = departed(w), weak = departed(w), newcomer = departed(w);
  for (const b of [oldFriend, weak, newcomer]) relation(w, b, 0, 0);
  reference(w, oldFriend, 60); reference(w, weak, 59);
  assert.equal(closeGardenAcquaintance(w, oldFriend, w.encounters.gardenFriends.references[0]), true);
  assert.equal(closeGardenAcquaintance(w, weak, w.encounters.gardenFriends.references[1]), false);
  const before = protectedState(w), seen = new Set();
  for (let i=0; i<24; i++) {
    leave(w); select(w);
    friends(w).forEach(id => seen.add(id));
    assert.ok(!friends(w).includes(`known-${weak.id}`));
    assert.ok(!friends(w).includes(`known-${newcomer.id}`));
  }
  assert.ok(seen.has(`known-${oldFriend.id}`));
  assert.equal(w.encounters.gardenFriends.references.length, 2);
  assert.deepEqual(protectedState(w), before);
  validateWorld(w);
});

test('close friends are sampled across real visits, with stable saved IDs and no family PRNG or economy changes', () => {
  const w = fresh(), known = departed(w), before = protectedState(w), seen = new Set(), rosters = new Set();
  for (let i=0; i<24; i++) {
    leave(w); select(w);
    const ids = friends(w), stored = clone(snapshot(w));
    assert.equal(ids.length, 4); assert.equal(new Set(ids).size, 4);
    assert.deepEqual(ids, stored.friendIds);
    assert.deepEqual(friends(parseSave(serializeWorld(w))), ids);
    assert.deepEqual(snapshot(w), stored);
    ids.forEach(id => seen.add(id)); rosters.add(ids.join(','));
  }
  assert.ok(seen.has(`known-${known.id}`)); assert.ok(rosters.size > 1);
  assert.deepEqual(protectedState(w), before);
});

test('relationship changes cannot remove or add guests to an already sampled visit', () => {
  const w = fresh(), oldFriend = departed(w), nextFriend = createBird(w, {home:'departed'});
  visitWith(w, `known-${oldFriend.id}`);
  const saved = clone(snapshot(w)), original = friends(w);
  relation(w, oldFriend, 0, 0); relation(w, nextFriend);
  rememberGardenAcquaintances(w);
  assert.deepEqual(friends(w), original);
  assert.deepEqual(snapshot(w), saved);
  assert.ok(!friends(w).includes(`known-${nextFriend.id}`));
  select(w); system.enterGarden(w, guard(w));
  assert.deepEqual(friends(w), original, 'same-garden resume is not a redraw lottery');
  assert.deepEqual(friends(parseSave(serializeWorld(w))), original);
  leave(w); select(w);
  assert.ok(!friends(w).includes(`known-${oldFriend.id}`));
  assert.ok(snapshot(w).visit > saved.visit);
});

for (const unavailable of ['resident', 'visitor', 'death']) test(`${unavailable} removes an unavailable snapshotted friend without replacement or reshuffle`, () => {
  const w = fresh(), bird = departed(w);
  visitWith(w, `known-${bird.id}`);
  const saved = clone(snapshot(w)), original = friends(w);
  if (unavailable === 'death') {
    bird.home = 'resident'; accidentLifeBird(w, bird.id, NOW);
  } else bird.home = unavailable;
  const before = clone(w), expected = original.filter(id => id !== `known-${bird.id}`);
  assert.equal(expected.length, 3);
  assert.deepEqual(friends(w), expected);
  assert.deepEqual(friends(parseSave(serializeWorld(w))), expected);
  assert.deepEqual(snapshot(w), saved);
  assert.equal(system.meetGardenFriend(w, `known-${bird.id}`, 'chat', guard(w)).reason, 'friend');
  assert.deepEqual(w, before);
  validateWorld(w);
});

test('all twelve gardens keep independently bounded friend and returning snapshots', () => {
  const w = fresh(); departed(w);
  discover(w, ENCOUNTER_CANDIDATES[0].id, 60);
  for (const id of GARDEN_IDS) {
    const existing = clone(w.encounters.gardenFriends.visits);
    select(w, id);
    for (const old of existing.filter(v => v.gardenId !== id)) assert.deepEqual(snapshot(w, old.gardenId), old);
    assert.equal(snapshot(w, id).visit, w.encounters.garden.visits[id]);
  }
  assert.equal(w.encounters.gardenFriends.visits.length, GARDEN_IDS.length);
  assert.equal(new Set(w.encounters.gardenFriends.visits.map(v => v.gardenId)).size, GARDEN_IDS.length);
  const before = clone(w);
  select(w, w.encounters.garden.id); system.enterGarden(w, guard(w));
  assert.deepEqual(w, before);
  assert.deepEqual(parseSave(serializeWorld(w)), w);
});

for (const resumeLastGuest of [false, true]) test(`inviting ${resumeLastGuest ? 'the previous guest' : 'a different guest'} into a closed garden starts one new outing and snapshot`, () => {
  const w = fresh(), ids = ENCOUNTER_CANDIDATES.slice(0, 2).map(e => e.id);
  ids.forEach(id => discover(w, id, 60));
  select(w);
  if (resumeLastGuest) assert.equal(system.inviteGarden(w, ids[0], guard(w)).changed, true);
  const previous = clone(snapshot(w));
  leave(w); accompany(w);
  const before = protectedState(w), meetings = encounterFriendship(w, ids[0]).visits;
  assert.equal(system.inviteGarden(w, ids[0], guard(w)).changed, true);
  assert.equal(w.encounters.garden.open, true);
  assert.deepEqual(attendees(w), ['b1']);
  assert.equal(w.encounters.garden.visits.komorebi, previous.visit+1);
  assert.equal(snapshot(w).visit, previous.visit+1);
  assert.notDeepEqual(snapshot(w).friendIds, previous.friendIds);
  assert.deepEqual(new Set(snapshot(w).returningIds), new Set(ids));
  assert.equal(encounterFriendship(w, ids[0]).visits, meetings+(resumeLastGuest ? 0 : 1));
  assert.deepEqual(protectedState(w), before);
  const exact = clone(w);
  assert.equal(system.inviteGarden(w, ids[0], guard(w)).resumed, true);
  assert.deepEqual(w, exact, 'repeating the open-garden invitation cannot redraw or increment anything');
  assert.deepEqual(parseSave(serializeWorld(w)), w);
});

test('inviting a different guest into an already open garden preserves attendance and both snapshots', () => {
  const w = fresh(), ids = ENCOUNTER_CANDIDATES.slice(0, 2).map(e => e.id);
  ids.forEach(id => discover(w, id, 60));
  select(w);
  const saved = clone(snapshot(w)), count = w.encounters.garden.visits.komorebi;
  accompany(w);
  const before = protectedState(w);
  for (const id of ids) {
    assert.equal(system.inviteGarden(w, id, guard(w)).changed, true);
    assert.deepEqual(snapshot(w), saved);
    assert.equal(w.encounters.garden.visits.komorebi, count);
    assert.deepEqual(attendees(w), [], 'an invitation does not teleport newly selected family out of the home');
  }
  assert.deepEqual(protectedState(w), before);
  assert.deepEqual(parseSave(serializeWorld(w)), w);
});

for (const {label, points, garden, arrived} of [
  {label:'unmet regional guests', points:null, garden:'komugi', arrived:true},
  {label:'discovered regional guests at 59', points:59, garden:'komugi', arrived:false},
  {label:'close regional friends at 60', points:60, garden:'komugi', arrived:true},
  {label:'close friends at 60 in a different garden', points:60, garden:'komorebi', arrived:true},
]) test(`natural arrivals admit ${label}: ${arrived}`, () => {
  const w = fresh(), entry = {...ENCOUNTER_CANDIDATES[0], gardenEvent:{gardenIds:['komugi'], scene:'grass'}};
  const s = createEncounterSystem([entry], {knownCatalog:ENCOUNTER_CANDIDATES});
  if (points !== null) discover(w, entry.id, points);
  const before = protectedState(w);
  select(w, garden, s);
  assert.deepEqual(snapshot(w).returningIds, points >= 60 ? [entry.id] : []);
  assert.equal(s.observeGarden(w, garden === 'komugi' ? 'grass' : 'quiet', guard(w)).arrived, arrived);
  assert.deepEqual(w.encounters.queue, arrived ? [entry.id] : []);
  assert.deepEqual(protectedState(w), before);
  assert.deepEqual(parseSave(serializeWorld(w)), w);
});

test('cage friendship threshold remains independently fixed at 100 regardless of the 60-point garden threshold', () => {
  for (const points of [59, 60, 99, 100]) {
    const w = fresh(), id = ENCOUNTER_CANDIDATES[0].id;
    discover(w, id, points);
    const before = clone(w), result = system.inviteCage(w, id, guard(w));
    assert.equal(encounterFriendship(w, id).points, points);
    if (points < 100) {
      assert.equal(result.reason, 'friendship'); assert.deepEqual(w, before);
    } else {
      assert.equal(result.changed, true);
      assert.deepEqual(w.encounters.cageVisitors, [{id, arrivedTick:0}]);
      assert.deepEqual(protectedState(w), protectedState(before));
      assert.deepEqual(w.encounters.gardenFriends, before.encounters.gardenFriends);
      assert.equal(w.encounters.garden.open, false);
    }
    validateWorld(w);
  }
});

test('cross-garden returning guests require discovered 60 points at departure, while cage invitations still require 100', () => {
  const w = fresh(), entry = {...ENCOUNTER_CANDIDATES[0], gardenEvent:{gardenIds:['komugi'], scene:'grass'}};
  const s = createEncounterSystem([entry], {knownCatalog:ENCOUNTER_CANDIDATES});
  discover(w, entry.id, 59);
  select(w, 'komorebi', s);
  assert.deepEqual(snapshot(w).returningIds, []);
  assert.equal(s.observeGarden(w, 'quiet', guard(w)).arrived, false);
  s.pet(w, entry.id, 1, guard(w));
  assert.equal(encounterFriendship(w, entry.id).points, 60);
  assert.equal(s.inviteCage(w, entry.id, guard(w)).reason, 'friendship');
  assert.deepEqual(snapshot(w).returningIds, []);
  assert.equal(s.observeGarden(w, 'quiet', guard(w)).arrived, false, 'new friendship cannot change this outing');
  leave(w, s); select(w, 'komorebi', s);
  assert.deepEqual(snapshot(w).returningIds, [entry.id]);
  assert.equal(s.observeGarden(w, 'quiet', guard(w)).arrived, true);
  assert.deepEqual(w.encounters.queue, [entry.id]);
  assert.deepEqual(parseSave(serializeWorld(w)), w);
  s.open(w, entry.id, guard(w));
  for (const step of entry.steps) s.act(w, w.encounters.active.instanceId, step.action, guard(w));
  while (encounterFriendship(w, entry.id).points < 100) {
    s.pet(w, entry.id, Math.min(8, 100-encounterFriendship(w, entry.id).points), guard(w));
  }
  assert.equal(s.inviteCage(w, entry.id, guard(w)).changed, true);
  validateWorld(w);
});

test('returning snapshots exclude cage guests and pending conversations without changing an earlier visit', () => {
  const w = fresh(), ids = ENCOUNTER_CANDIDATES.slice(0, 3).map(e => e.id);
  for (const id of ids) discover(w, id, 100);
  select(w);
  assert.deepEqual(new Set(snapshot(w).returningIds), new Set(ids));
  const original = clone(snapshot(w));
  system.inviteCage(w, ids[0], guard(w));
  w.encounters.queue = [ids[1]]; w.encounters.garden.guestGardenId = w.encounters.garden.id;
  select(w, 'mizukagami');
  assert.deepEqual(snapshot(w, 'komorebi'), original);
  assert.deepEqual(snapshot(w).returningIds, [ids[2]]);
  const before = clone(w);
  assert.equal(system.inviteGarden(w, ids[1], guard(w)).reason, 'guest');
  assert.deepEqual(w, before);
  assert.deepEqual(parseSave(serializeWorld(w)), w);
});

test('absent protagonists and attending nonprotagonists allow visits without household damage', () => {
  for (const otherAttends of [false, true]) {
    const w = fresh(), other = createBird(w, {home:'resident'});
    if (otherAttends) accompany(w, [other.id]);
    select(w);
    const before = protectedState(w);
    assert.equal(crowTarget(w), null); assert.equal(raptorTarget(w), null);
    assert.equal(arriveGardenCrow(w, 'large-billed-crow', NOW, predatorGuard(w)).hostile, false);
    assert.equal(w.encounters.crow.arrivalBirdId, null);
    assert.equal(arriveGardenRaptor(w, 'black-kite', NOW+45000, predatorGuard(w)).hostile, false);
    assert.equal(w.encounters.raptor.active.targetBirdId, null);
    assert.deepEqual(protectedState(w), before);
    assert.deepEqual(attendees(w), otherAttends ? [other.id] : []);
  }
});

test('a selected protagonist is vulnerable only after departure and no other household bird is damaged', () => {
  const w = fresh(), other = createBird(w, {home:'resident'});
  select(w); accompany(w, ['b1', other.id]);
  const absent = protectedState(w);
  assert.equal(arriveGardenCrow(w, 'large-billed-crow', NOW, predatorGuard(w)).hostile, false);
  assert.deepEqual(protectedState(w), absent);
  leave(w); select(w);
  const energy = w.birds.map(b => b.needs.energy), before = protectedState(w);
  assert.equal(arriveGardenCrow(w, 'large-billed-crow', NOW+600000, predatorGuard(w)).hostile, true);
  assert.equal(w.birds[0].needs.energy, energy[0]/2);
  assert.equal(other.needs.energy, energy[1]);
  const expected = clone(before); expected.birds[0].needs.energy = energy[0]/2;
  assert.deepEqual(protectedState(w), expected);
  validateWorld(w);
});

test('v11 migration preserves every old bond and preference, defaults to solo, and never mutates input', () => {
  const w = fresh(), bird = departed(w), oldRef = reference(w, bird, 72);
  oldRef.lastInteractionTick = 0;
  oldRef.memories.push({kind:'chat', tick:0, gardenId:'komorebi', text:'以前の庭の友達'});
  w.encounters.gardenFriends.regulars[0].affinity = 42;
  accompany(w); select(w);
  const old = legacyV11(w), before = clone(old), migrated = readCompatibleWorld(old, NOW);
  assert.deepEqual(old, before);
  assert.equal(migrated.encounters.version, 13);
  assert.equal(migrated.revision, old.revision);
  assert.equal(migrated.version,16);
  assert.deepEqual(migrated.encounters.gardenFriends, {
    ...old.encounters.gardenFriends, version:2, accompany:false, attendees:[], visits:[],
  });
  assert.deepEqual(protectedState(migrated), protectedState(old));
  for (const key of Object.keys(old.encounters).filter(key => !['version', 'gardenFriends'].includes(key))) {
    assert.deepEqual(migrated.encounters[key], old.encounters[key], key);
  }
  assert.deepEqual(attendees(migrated), []);
  assert.deepEqual(parseSave(serializeWorld(migrated)), migrated);
  const fallback = friends(migrated);
  relation(migrated, bird, 0, 0);
  assert.deepEqual(friends(migrated), fallback, 'legacy fallback is stable until the next real visit');
});

test('migrated warning retains exact target, remaining time, progress and identity across reload and preference changes', () => {
  const w = fresh(), other = createBird(w, {home:'resident'});
  accompany(w); select(w);
  assert.equal(arriveGardenRaptor(w, 'black-kite', NOW, predatorGuard(w)).changed, true);
  advanceGardenRaptor(w, 1000, NOW+1000, predatorGuard(w));
  const old = legacyV11(w), before = clone(old), warning = clone(old.encounters.raptor);
  let loaded = readCompatibleWorld(old, NOW+DAY);
  assert.deepEqual(old, before);
  assert.deepEqual(loaded.encounters.raptor, warning);
  assert.deepEqual(loaded.encounters.gardenFriends.attendees, []);
  assert.equal(loaded.encounters.gardenFriends.accompany, false);
  assert.deepEqual(attendees(loaded), ['b1'], 'the existing warning derives presence without rewriting attendees');
  assert.equal(raptorScene(loaded).targetBirdId, 'b1');
  system.chooseCompanions(loaded, [other.id], guard(loaded));
  system.chooseAccompaniment(loaded, false, guard(loaded));
  select(loaded, 'mizukagami'); leave(loaded);
  assert.deepEqual(loaded.encounters.raptor, warning, 'navigation and preferences do not escape a live warning');
  loaded = parseSave(serializeWorld(loaded));
  assert.deepEqual(loaded.encounters.raptor, warning);
  assert.equal(raptorTarget(loaded).id, 'b1');
  assert.deepEqual(protectedState(loaded), protectedState(old));
  const stale = predatorGuard(loaded);
  advanceGardenRaptor(loaded, 1000, NOW+2000, stale);
  const progressed = clone(loaded);
  assert.equal(advanceGardenRaptor(loaded, 1000, NOW+2000, stale).reason, 'stale');
  assert.deepEqual(loaded, progressed);
  assert.equal(loaded.encounters.raptor.active.remainingMs, 58000);
  assert.equal(escapeGardenRaptor(loaded, predatorGuard(loaded)).escaped, true);
  assert.deepEqual(attendees(loaded), []);
  assert.equal(loaded.encounters.raptor.lastArrivalAt, NOW);
  validateWorld(loaded);
});

test('succession during an existing warning ends that target rather than harming or enrolling the heir', () => {
  const w = fresh(), father = createBird(w, {home:'resident', sex:'male'});
  const child = createBird(w, {home:'resident', stage:'adult', parents:['b1', father.id], generation:1});
  accompany(w); select(w);
  arriveGardenRaptor(w, 'black-kite', NOW, predatorGuard(w));
  const target = w.encounters.raptor.active.targetBirdId;
  w.paused = true;
  lifeStatus(w, 'b1').condition = {kind:'injury', sinceAt:NOW, deadlineAt:NOW+DAY};
  advanceTo(w, NOW+DAY);
  w.paused = false;
  assert.equal(getProtagonistId(w), child.id);
  assert.equal(w.encounters.raptor.active.targetBirdId, target);
  assert.equal(raptorTarget(w), null); assert.equal(raptorScene(w), null);
  const before = protectedState(w);
  assert.equal(advanceGardenRaptor(w, 1000, NOW+DAY+1000, predatorGuard(w)).ended, true);
  assert.equal(w.encounters.raptor.active, null);
  assert.equal(lifeStatus(w, child).death, null); assert.equal(lifeStatus(w, father).death, null);
  assert.deepEqual(protectedState(w), before);
  assert.deepEqual(attendees(w), []);
  assert.equal(arriveGardenCrow(w, 'large-billed-crow', NOW+DAY+1000, predatorGuard(w)).hostile, false);
  assert.equal(arriveGardenRaptor(w, 'golden-eagle', NOW+DAY+46000, predatorGuard(w)).hostile, false);
  assert.equal(w.encounters.raptor.active.targetBirdId, null);
  assert.deepEqual(protectedState(w), before);
  assert.deepEqual(parseSave(serializeWorld(w)), w);
});

test('a migrated nearly expired warning can affect only its pinned original target, once', () => {
  const w = fresh(), other = createBird(w, {home:'resident'});
  accompany(w); select(w);
  arriveGardenRaptor(w, 'black-kite', NOW, predatorGuard(w));
  for (let i=1; i<=59; i++) advanceGardenRaptor(w, 1000, NOW+i*1000, predatorGuard(w));
  const loaded = readCompatibleWorld(legacyV11(w), NOW+59000);
  assert.equal(loaded.encounters.raptor.active.remainingMs, 1000);
  assert.equal(loaded.encounters.gardenFriends.accompany, false);
  assert.deepEqual(loaded.encounters.gardenFriends.attendees, []);
  system.chooseCompanions(loaded, [other.id], guard(loaded));
  const originalOther = clone(loaded.birds.find(b => b.id === other.id));
  const originalEconomy = clone({economy:loaded.economy, decor:loaded.decor});
  const seed = loaded.seed, ids = loaded.birds.map(b => b.id), stale = predatorGuard(loaded);
  assert.equal(advanceGardenRaptor(loaded, 1000, NOW+60000, stale).death, true);
  assert.equal(lifeStatus(loaded, 'b1').death.cause, 'accident');
  assert.equal(lifeStatus(loaded, other.id).death, null);
  assert.deepEqual(loaded.birds.find(b => b.id === other.id), originalOther);
  assert.deepEqual({economy:loaded.economy, decor:loaded.decor}, originalEconomy);
  assert.equal(loaded.seed, seed); assert.deepEqual(loaded.birds.map(b => b.id), ids);
  assert.equal(loaded.events.filter(e => e.kind === 'death').length, 1);
  const before = clone(loaded);
  assert.equal(advanceGardenRaptor(loaded, 1000, NOW+60000, stale).reason, 'stale');
  assert.deepEqual(loaded, before);
  assert.deepEqual(parseSave(serializeWorld(loaded)), loaded);
});

test('an old crow encounter never follows an absent successor or damages another resident', () => {
  const w = fresh(), father = createBird(w, {home:'resident', sex:'male'});
  const child = createBird(w, {home:'resident', parents:['b1', father.id], generation:1});
  accompany(w); select(w);
  arriveGardenCrow(w, 'large-billed-crow', NOW, predatorGuard(w));
  const history = clone(w.encounters.crow);
  w.paused = true;
  lifeStatus(w, 'b1').condition = {kind:'injury', sinceAt:NOW, deadlineAt:NOW+DAY};
  advanceTo(w, NOW+DAY); w.paused = false;
  assert.equal(getProtagonistId(w), child.id);
  assert.equal(crowTarget(w), null); assert.equal(crowScene(w, NOW+DAY), null);
  const before = protectedState(w);
  assert.deepEqual(w.encounters.crow, history);
  assert.equal(arriveGardenCrow(w, 'carrion-crow', NOW+DAY, predatorGuard(w)).hostile, false);
  assert.equal(w.encounters.crow.arrivalBirdId, null);
  assert.deepEqual(protectedState(w), before);
  assert.equal(lifeStatus(w, child).death, null);
  validateWorld(w);
});

test('malformed legacy data rejects before migration without repair, mutation or accessor execution', () => {
  const old = legacyV11(fresh());
  const mutations = [
    w => w.encounters.gardenFriends.version = 2,
    w => w.encounters.gardenFriends.accompany = false,
    w => w.encounters.gardenFriends.regulars[0].affinity = 101,
    w => w.encounters.gardenFriends.companions = ['b999'],
    w => w.encounters.gardenFriends.companions = ['b1', 'b1'],
    w => w.encounters.gardenFriends.references.push({id:'known-b999', birdId:'b999', primaryGardenId:'komorebi', affinity:60, lastInteractionTick:null, memories:[]}),
    w => w.encounters.extra = true,
  ];
  for (const mutate of mutations) {
    const bad = clone(old); mutate(bad); const before = clone(bad);
    assert.throws(() => readCompatibleWorld(bad, NOW), mutate.toString());
    assert.deepEqual(bad, before);
  }
  let calls = 0;
  const accessor = clone(old);
  Object.defineProperty(accessor.encounters.gardenFriends, 'companions', {enumerable:true, get(){calls++; return [];}});
  assert.throws(() => readCompatibleWorld(accessor, NOW));
  assert.equal(calls, 0);
});

test('v2 attendance and snapshot validation rejects malformed identities, duplicates and invalid returning eligibility', () => {
  const base = fresh(); accompany(base); discover(base, ENCOUNTER_CANDIDATES[0].id, 60); select(base);
  const mutations = [
    w => w.encounters.gardenFriends.version = 1,
    w => w.encounters.gardenFriends.accompany = 'false',
    w => w.encounters.gardenFriends.attendees = null,
    w => w.encounters.gardenFriends.attendees = ['b1', 'b1'],
    w => w.encounters.gardenFriends.attendees = ['b999'],
    w => w.encounters.gardenFriends.visits = null,
    w => w.encounters.gardenFriends.visits.push(clone(snapshot(w))),
    w => snapshot(w).extra = true,
    w => snapshot(w).gardenId = 'missing',
    w => snapshot(w).visit++,
    w => snapshot(w).friendIds = ['missing'],
    w => snapshot(w).friendIds.push(snapshot(w).friendIds[0]),
    w => snapshot(w).returningIds.push(snapshot(w).returningIds[0]),
    w => snapshot(w).returningIds = ['not-a-species'],
    w => snapshot(w).returningIds = [ENCOUNTER_CANDIDATES[1].id],
    w => w.encounters.friendship[0].petPoints = 49,
  ];
  for (const mutate of mutations) {
    const bad = clone(base); mutate(bad); const before = clone(bad);
    assert.throws(() => validateWorld(bad), mutate.toString());
    assert.throws(() => parseSave(JSON.stringify(bad)), mutate.toString());
    assert.deepEqual(bad, before);
  }
});

test('two atomic stores durably migrate v11 once and stale preference/countdown callbacks cannot overwrite newer state', async () => {
  const indexedDB = new IDBFactory(), w = fresh(); accompany(w); select(w);
  arriveGardenRaptor(w, 'black-kite', NOW, predatorGuard(w));
  advanceGardenRaptor(w, 1000, NOW+1000, predatorGuard(w));
  const old = legacyV11(w); await raw(indexedDB, old);
  const one = await openGameStore({indexedDB}), two = await openGameStore({indexedDB});
  try {
    const [a, b] = await Promise.all([one.transact(x => x), two.transact(x => x)]);
    assert.deepEqual(a, b); assert.equal(a.encounters.version, 13);
    assert.equal(a.revision, old.revision); assert.equal(a.version, old.version);
    assert.deepEqual(await raw(indexedDB), a);
    assert.deepEqual(a.encounters.raptor, old.encounters.raptor);
    const stale = guard(a), staleWarning = predatorGuard(a);
    await one.transact(x => {system.chooseAccompaniment(x, true, guard(x)); return x;});
    let preference, countdown;
    await two.transact(x => {
      preference = system.chooseCompanions(x, [], stale);
      countdown = advanceGardenRaptor(x, 1000, NOW+2000, staleWarning);
      return x;
    });
    assert.equal(preference.reason, 'stale'); assert.equal(countdown.reason, 'stale');
    await Promise.all([one, two].map(store => store.transact(x => {
      advanceGardenRaptor(x, 1000, NOW+2000, predatorGuard(x)); return x;
    })));
    const current = await two.transact(x => x);
    assert.equal(current.encounters.raptor.active.remainingMs, 58000);
    assert.equal(current.encounters.gardenFriends.accompany, true);
    assert.deepEqual(current.encounters.gardenFriends.attendees, []);
    assert.deepEqual(current.encounters.gardenFriends.companions, ['b1']);
    assert.deepEqual(attendees(current), ['b1']);
    assert.deepEqual(await raw(indexedDB), current);
    assert.deepEqual(protectedState(current), protectedState(old));
  } finally { one.close(); two.close(); }
});

test('locked local saves persist the solo migration and preserve an existing warning exactly', async () => {
  const w = fresh(); accompany(w); select(w);
  arriveGardenRaptor(w, 'black-kite', NOW, predatorGuard(w));
  const old = legacyV11(w), memory = new Map([[STORAGE_KEY, JSON.stringify(old)]]);
  const localStorage = {
    getItem:key => memory.get(key) ?? null,
    setItem:(key, value) => memory.set(key, value),
    removeItem:key => memory.delete(key),
  };
  const store = await openGameStore({localStorage, navigator:{locks:{request:async (_name, operation) => operation()}}});
  try {
    const current = await store.transact(x => x), persisted = JSON.parse(memory.get(STORAGE_KEY));
    assert.equal(current.encounters.version, 13);
    assert.deepEqual(current.encounters.gardenFriends.attendees, []);
    assert.equal(current.encounters.gardenFriends.accompany, false);
    assert.deepEqual(current.encounters.raptor, old.encounters.raptor);
    assert.deepEqual(persisted, current);
    assert.deepEqual(attendees(current), ['b1']);
  } finally { store.close(); }
});
