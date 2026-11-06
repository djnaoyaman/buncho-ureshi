import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
import {RAPTOR_SPECIES} from '../src/data/raptor-species.js';
import {RAPTOR_ART,JAVA_LENGTH_AXIS} from '../src/data/raptor-art.js';
import {createWorld} from '../src/engine.js';
import {arriveGardenRaptor,raptorToken} from '../src/garden-raptors.js';
import {renderRaptorScene} from '../src/garden-raptor-ui.js';
const metadata=JSON.parse(await readFile(new URL('../docs/RAPTOR-ART-ASSETS.json',import.meta.url),'utf8'));
test('nine reviewed transparent artworks match their exact hashes and measured axes',async()=>{
 assert.equal(metadata.assets.length,9);assert.equal(Object.keys(RAPTOR_ART).length,9);
 for(const s of RAPTOR_SPECIES){const a=metadata.assets.find(a=>a.id===s.id),file=await readFile(new URL(`../public/game-art/raptors/${s.id}.webp`,import.meta.url)),info=await sharp(file).metadata();assert.equal(createHash('sha256').update(file).digest('hex'),a.sha256);assert.equal(info.width,900);assert.equal(info.height,900);assert.equal(info.hasAlpha,true);assert.equal(a.bodyLengthCm,s.lengthCm);assert.equal(RAPTOR_ART[s.id].lengthPx,a.referenceLengthAxis.lengthPx);assert.equal(RAPTOR_ART[s.id].footY,a.footAnchor.y);assert.ok(a.fullyTransparentFraction>.35);assert.ok(s.sources.length>0);}
});
test('every Java color uses its measured bill-to-tail axis, not horizontal bounding width',()=>{
 const now=Date.UTC(2026,10,4,9);for(const [color,ratio] of Object.entries(JAVA_LENGTH_AXIS)){const w=createWorld(now);w.birds[0].color=color;w.encounters.garden.open=true;w.encounters.gardenFriends.attendees=['b1'];arriveGardenRaptor(w,'ural-owl',now,{...raptorToken(w),gardenId:w.encounters.garden.id});const html=renderRaptorScene(w);const canvas=Number(html.match(/--raptor-canvas-ratio:([^;]+)/)[1]);assert.ok(Math.abs(canvas*(RAPTOR_ART['ural-owl'].lengthPx/900)/ratio-50/14)<1e-9);assert.match(html,/data-pose="right"/);assert.ok(ratio>1);}
});
