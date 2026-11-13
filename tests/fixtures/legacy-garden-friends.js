import {OLD_GARDEN_IDS,LEGACY_GARDEN_IDS} from '../../src/data/gardens.js';
/** Recreate the exact garden-friends v1 shape when building encounter v4–11 saves.
 * New accompaniment and visit snapshots did not exist in those persisted schemas.
 */
export function useLegacyGardenFriends(world){
 if(world.encounters.version<16&&world.encounters.raptor)delete world.encounters.raptor.lastThreatAt;
 const state=world.encounters.gardenFriends;
 const ids=world.encounters.version<9?LEGACY_GARDEN_IDS:OLD_GARDEN_IDS;
 if(world.encounters.version<14)for(const id of Object.keys(world.encounters.garden.visits))if(!ids.includes(id))delete world.encounters.garden.visits[id];
 world.encounters.gardenFriends={version:1,regulars:structuredClone(state.regulars),references:structuredClone(state.references),companions:[...state.companions]};
 return world;
}
