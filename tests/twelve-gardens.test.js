import {readFileSync} from 'node:fs';
import test from 'node:test';import assert from 'node:assert/strict';
import {createWorld,readCompatibleWorld,serializeWorld,parseSave} from '../src/engine.js';
import {GARDENS,GARDEN_IDS,gardenFriendRoster,gardenSelectorOffset} from '../src/data/gardens.js';
import {createEncounterSystem} from '../src/encounters.js';
const sys=createEncounterSystem(),guard=w=>({worldId:w.worldId,revision:w.revision});
test('v8 nine-garden saves migrate without losing identity, history, birds, bonds or input',()=>{const old=createWorld(1000);old.encounters.version=8;for(const id of GARDEN_IDS.slice(9))delete old.encounters.garden.visits[id];old.encounters.garden.visits.komorebi=17;old.encounters.gardenFriends.regulars[0].affinity=44;const before=structuredClone(old),next=readCompatibleWorld(old,1000);assert.deepEqual(old,before);assert.equal(next.encounters.version,9);assert.equal(Object.keys(next.encounters.garden.visits).length,12);assert.equal(next.encounters.garden.visits.komorebi,17);assert.equal(next.encounters.gardenFriends.regulars[0].affinity,44);assert.deepEqual(next.birds,old.birds);assert.equal(next.worldId,old.worldId);assert.deepEqual(parseSave(serializeWorld(next)),next);});
test('legacy and current schemas reject missing/unknown garden records rather than silently discard',()=>{for(const version of [8,9]){const w=createWorld(1000);w.encounters.version=version;if(version===8)for(const id of GARDEN_IDS.slice(9))delete w.encounters.garden.visits[id];w.encounters.garden.visits.surprise=1;assert.throws(()=>readCompatibleWorld(w));}const w=createWorld(1000);delete w.encounters.garden.visits['java-rice'];assert.throws(()=>readCompatibleWorld(w));});
test('all twelve gardens draw changing guests only on a new visit and keep the same birds across render/save/notebook',()=>{const w=createWorld(1000);for(const garden of GARDENS){sys.selectGarden(w,garden.id,guard(w));const ids=()=>gardenFriendRoster(w,garden.id).map(x=>x.friendId);const first=ids(),revision=w.revision,seed=w.seed;assert.deepEqual(ids(),first);assert.equal(sys.selectGarden(w,garden.id,guard(w)).resumed,true);assert.equal(w.revision,revision);assert.deepEqual(gardenFriendRoster(parseSave(serializeWorld(w)),garden.id).map(x=>x.friendId),first);sys.leaveGarden(w,guard(w));sys.enterGarden(w,guard(w));assert.notDeepEqual(new Set(ids()),new Set(first));assert.equal(w.seed,seed);assert.equal(new Set(ids()).size,4);}});
test('garden arrows wrap at both ends and keep intermediate page movement',()=>{assert.equal(gardenSelectorOffset(600,300,900,'next'),0);assert.equal(gardenSelectorOffset(0,300,900,'previous'),600);assert.equal(gardenSelectorOffset(0,300,900,'next'),300);assert.equal(gardenSelectorOffset(0,1000,900,'next'),0);});

// Generated and validated with deployed nine-garden engine bd1c804d9d40c0b58e0de0446f74ddaee08e2523.
test('frozen production v8 save preserves its complete data apart from the intentional migration',()=>{
 const old=JSON.parse(readFileSync(new URL('./fixtures/v8-nine-gardens-world.json',import.meta.url),'utf8'));
 const input=structuredClone(old),next=readCompatibleWorld(old,old.lastWallTime);
 const expected=structuredClone(old);expected.encounters.version=9;
 for(const id of GARDEN_IDS.slice(9))expected.encounters.garden.visits[id]=0;
 assert.deepEqual(old,input);assert.deepEqual(next,expected);assert.deepEqual(parseSave(serializeWorld(next)),expected);
});
