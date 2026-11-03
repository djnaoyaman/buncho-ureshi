/** The initial protagonist is stable within a save world. Never match by name or
 * apply this artwork to every white bird. World replacement starts a new scope.
 * Historic/imported worlds with a different phenotype safely keep normal art. */
export function omochiIdentity(world) {
 if(!world || typeof world.worldId !== 'string' || !world.worldId || !Array.isArray(world.birds))return null;
 const matches=world.birds.filter(b=>b.id==='b1');
 if(matches.length!==1)return null;
 const bird=matches[0];
 if(bird.home!=='resident'||bird.stage!=='adult'||bird.color!=='white'||bird.sex!=='female'||bird.generation!==0||bird.bornTick!==0||!Array.isArray(bird.parents)||bird.parents.length)return null;
 return {worldId:world.worldId,birdId:bird.id};
}
