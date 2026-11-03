/** Test-only invitation fixture: transition/UI unit tests isolate an already-arrived guest.
 * This is NOT the production arrival scheduler; its frequency/conditions have dedicated tests.
 */
export function inviteFixture(system,w,id=system.catalog[0]?.id){
 if(!id)throw new Error('Fixture needs a bird');
 system.enterGarden(w,{worldId:w.worldId,revision:w.revision});
 if(!w.encounters.active){w.encounters.queue=[id];w.encounters.garden.guestGardenId=w.encounters.garden.id;}
}
