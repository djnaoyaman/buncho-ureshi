import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {createHash} from 'node:crypto';
import {renderGardenStage} from '../src/encounter-ui.js';
import {worldFor,GARDENS} from './fixtures/garden-about-world.js';
import {actorTerrainFor} from '../src/data/garden-actor-terrain.js';
import {trailTerrainFor} from '../src/data/garden-trail-terrain.js';
const baseline=JSON.parse(readFileSync(new URL('../docs/qa/garden-actors-native-dom.json',import.meta.url)));
test('all 35 native garden buttons, labels, scene and control markup retain the public base; only scoped presentation identity and the surveyed courtyard foreground are added',()=>{
 assert.equal(Object.keys(baseline.rows).length,35);
 for(const g of GARDENS){const w=worldFor('attending',g.id),before=JSON.stringify(w),html=renderGardenStage(w);
  const isTrail=!actorTerrainFor(g.id)&&!!trailTerrainFor(g.id);
  assert.equal(html.includes('data-garden-trail="true"'),isTrail,g.id);
  const overlays=html.match(/<img class="garden-actor-foreground"[^>]*>/g)||[];
  assert.equal(overlays.length,g.id==='onsen'?1:0,g.id+' sealed foreground scope');
  if(overlays.length){
   const art=html.match(/<img class="finch-garden-background"[^>]* src="([^"]+)"/)[1];
   assert.equal(overlays[0].match(/ src="([^"]+)"/)[1],art);
   assert.match(overlays[0],/aria-hidden="true" alt=""/);
   assert.match(overlays[0],/pointer-events:none;z-index:1100;clip-path:polygon/);
  }
  const normalized=(overlays.length?html.replace(overlays[0],''):html).replace(/ data-garden-actor-(?:id|lead|flight)="[^"]*"/g,'').replace(' data-garden-trail="true"','');
  assert.equal(createHash('sha256').update(normalized).digest('hex'),baseline.rows[g.id],g.id);
  assert.equal(JSON.stringify(w),before,g.id+' world/revision/game RNG unchanged');
  assert.equal(html.includes('data-garden-actor-id='),(isTrail||!!actorTerrainFor(g.id)),g.id+' scope');
 }
});
