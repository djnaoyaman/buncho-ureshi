/** Recreate the exact garden-friends v1 shape when building encounter v4–11 saves.
 * New accompaniment and visit snapshots did not exist in those persisted schemas.
 */
export function useLegacyGardenFriends(world){
 const state=world.encounters.gardenFriends;
 world.encounters.gardenFriends={version:1,regulars:structuredClone(state.regulars),references:structuredClone(state.references),companions:[...state.companions]};
 return world;
}
