// Fixtures for birds that existed before save14. Future births still use the
// current engine's default pace; these helpers never alter production rules.
export function stripGrowthPace(world){if(world.version<16)delete world.careRules;if(world.version<15)delete world.away;for(const b of [...(world.birds||[]),...(world.archive||[])])delete b.growthPace;return world;}
export function seedLegacyGrowth(world){for(const b of [...(world.birds||[]),...(world.archive||[])])b.growthPace='legacy';return world;}
export function withLegacyGrowth(birds){return birds.map(b=>({...structuredClone(b),growthPace:'legacy'}));}
