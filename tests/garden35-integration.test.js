import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
import {Window} from 'happy-dom';
import {GARDENS,GARDEN_IDS,OLD_GARDENS,OLD_GARDEN_IDS,gardenAudioIntent,gardenStageGeometry} from '../src/data/gardens.js';
import {createWorld,readCompatibleWorld,serializeWorld,parseSave} from '../src/engine.js';
import {encounterSystem} from '../src/encounters.js';
import {createEncounterSystem as oldEncounterSystem} from './fixtures/pre-garden35/encounters.js';
import {renderGardenStage} from '../src/encounter-ui.js';
const original=()=>JSON.parse(readFileSync(new URL('./fixtures/pre-garden35/world-v16-enc13.json',import.meta.url),'utf8'));

test('frozen published save adds ending state and 23 zero counters, preserving active conversation and all 11 parked sessions',()=>{
 const old=original(),before=structuredClone(old);
 oldEncounterSystem().validate(old.encounters,old.tick);
 const upgraded=readCompatibleWorld(structuredClone(old),1000),expected=structuredClone(old);
 expected.version=18;expected.leafEvent={version:1,entry:null};expected.collectionEndings={version:1,entries:[]};
 expected.encounters.version=16;expected.encounters.raptor.lastThreatAt=expected.encounters.raptor.lastArrivalAt;expected.encounters.garden.visits=Object.fromEntries(GARDEN_IDS.map(id=>[id,old.encounters.garden.visits[id]??0]));
 assert.deepEqual(upgraded,expected);assert.deepEqual(old,before);
 assert.equal(upgraded.encounters.gardenSessions.length,11);
 const active=[upgraded.encounters,...upgraded.encounters.gardenSessions].map(s=>s.active).find(Boolean);assert.ok(active);assert.equal(active.step,1);
 assert.throws(()=>oldEncounterSystem().validate(upgraded.encounters,upgraded.tick));
 assert.deepEqual(parseSave(serializeWorld(upgraded)),upgraded);
 assert.deepEqual(readCompatibleWorld(structuredClone(upgraded),1000),upgraded);
});

test('old and new schemas reject unknown or missing visit counters before any migration',()=>{
 for(const modern of [false,true])for(const damage of ['missing','unknown']){
  const w=modern?readCompatibleWorld(original(),1000):original();
  if(damage==='missing')delete w.encounters.garden.visits.komorebi;else w.encounters.garden.visits.unexpected=0;
  const before=structuredClone(w);assert.throws(()=>readCompatibleWorld(w,1000));assert.deepEqual(w,before);
 }
});

test('all 35 actual WebPs decode with exact recorded bytes and sizes, without normalizing unequal source dimensions',async()=>{
 const ratios=new Set();
 for(const g of GARDENS){const b=g.background,bytes=readFileSync(new URL('../public/'+b.src,import.meta.url));
  assert.equal(createHash('sha256').update(bytes).digest('hex'),b.sha256);
  const {info}=await sharp(bytes).raw().toBuffer({resolveWithObject:true});assert.equal(info.width,b.width);assert.equal(info.height,b.height);ratios.add(info.width/info.height);
  assert.equal(b.integratedUiReviewed,false);
  for(const [width,height] of [[390,690],[320,420],[740,360]]){const geometry=gardenStageGeometry(g.id,width,height);assert.ok(geometry.drawWidth>=width-1e-6&&geometry.drawHeight>=height-1e-6);assert.ok(geometry.friends[geometry.selectedIndex].visible,g.id);}
 }
 assert.ok(ratios.size>1);assert.equal(GARDENS[0].name,'足立区梅島公園');
});

test('all gardens render only their current background, never preload 35 images or mutate the save',async()=>{
 const window=new Window();try{for(const g of GARDENS){const w=createWorld(1000,42);w.encounters.garden.id=g.id;const before=serializeWorld(w);window.document.body.innerHTML=renderGardenStage(w);
 const images=[...window.document.querySelectorAll('img')].filter(img=>img.getAttribute('src')?.includes('game-art/gardens35/'));
 assert.equal(images.length,1,g.id);assert.ok(images[0].getAttribute('src').endsWith(g.background.src));assert.equal(serializeWorld(w),before);
 }}finally{await window.happyDOM.close();}
});

test('35 arrivals preserve all old visit counters while audio OFF, fixed tracks and music selections retain their contracts',()=>{
 const w=createWorld(1000,42);for(const id of OLD_GARDEN_IDS)w.encounters.garden.visits[id]=7;
 for(const g of GARDENS){const before=w.encounters.garden.visits[g.id];encounterSystem.selectGarden(w,g.id,{worldId:w.worldId,revision:w.revision});assert.equal(w.encounters.garden.visits[g.id],before+1);
 assert.equal(gardenAudioIntent({gardenId:g.id,enabled:true,mode:'off'}).kind,'silence');
 assert.deepEqual(gardenAudioIntent({gardenId:g.id,enabled:true,mode:'fixed',selectedTrackId:'original'}),{kind:'selected-track',trackId:'original',fadeMs:0});
 const old=OLD_GARDENS.find(x=>x.id===g.id);if(old)assert.equal(g.music.themeId,old.music.themeId);assert.equal(gardenAudioIntent({gardenId:g.id,enabled:true,mode:'auto'}).kind,'garden-theme');
 }
 for(const id of OLD_GARDEN_IDS)assert.equal(w.encounters.garden.visits[id],8);
 assert.deepEqual(parseSave(serializeWorld(w)),w);
});
