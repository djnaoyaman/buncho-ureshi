import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {createHash} from 'node:crypto';
import {renderGardenStage} from '../src/encounter-ui.js';
import {worldFor,GARDENS} from './fixtures/garden-about-world.js';
import {actorTerrainFor} from '../src/data/garden-actor-terrain.js';
const baseline=JSON.parse(readFileSync(new URL('../docs/qa/garden-actors-native-dom.json',import.meta.url)));
test('all 35 native garden buttons, labels, scene and control markup retain the public base; only scoped presentation identity attributes are added',()=>{
 assert.equal(Object.keys(baseline.rows).length,35);
 for(const g of GARDENS){const w=worldFor('attending',g.id),before=JSON.stringify(w),html=renderGardenStage(w);
  const normalized=html.replace(/ data-garden-actor-(?:id|lead|flight)="[^"]*"/g,'');
  assert.equal(createHash('sha256').update(normalized).digest('hex'),baseline.rows[g.id],g.id);
  assert.equal(JSON.stringify(w),before,g.id+' world/revision/game RNG unchanged');
  assert.equal(html.includes('data-garden-actor-id='),!!actorTerrainFor(g.id),g.id+' scope');
 }
});
