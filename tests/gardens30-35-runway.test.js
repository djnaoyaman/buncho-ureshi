import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {createHash} from 'node:crypto';
import {GARDEN35_MUSIC} from '../src/data/garden35-music.js';import {gardenMusicTracks} from '../src/game-music.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url)),hash=b=>createHash('sha256').update(b).digest('hex'),rows=JSON.parse(read('docs/qa/gardens30-35-runway.json'));
const trail=JSON.parse(read('docs/qa/garden-trail-public-scope.json'));
const flat=JSON.parse(read('docs/qa/garden-flat-seven-scope.json'));
const platforms=JSON.parse(read('docs/qa/garden-mossy-log-scope.json'));
const levels=JSON.parse(read('docs/qa/garden-flat-platforms-scope.json'));
const courtyard=JSON.parse(read('docs/qa/garden-flat-onsen-scope.json'));
function afterLevels(file,prior){
 const next=levels.changedSource[file];
 if(next)assert.equal(next.before,prior,file);
 const base=next?.after||prior, layer=courtyard.changedSource[file];
 if(layer)assert.equal(layer.before,base,file);
 return layer?.after||base;
}

function assertScopedCurrent(file,prior){
 const step=trail.changedSource[file];
 if(step)assert.equal(step.before,prior,file);
 const successor=flat.changedSource[file];
 if(successor)assert.equal(successor.before,step?.after||prior,file);
 let content=read(file);
 if(file==='public/audio/gardens35/bach-bwv645-license.html'){
  // Only the requested shared telemetry loader may differ from the original license.
  const tag='<script defer src="/buncho-ureshi/src/analytics-loader.js?v=7ac59192e62a"></script>';
  const html=content.toString('utf8');
  assert.equal(html.split(tag).length-1,1,'one shared analytics loader');
  content=html.replace(tag,'');
  assert.ok(!/<script\b/i.test(content),'no other executable additions to the license');
 }
 const platform=platforms.changedSource[file];
 if(platform)assert.equal(platform.before,successor?.after||step?.after||prior,file);
 assert.equal(hash(content),afterLevels(file,platform?.after||successor?.after||step?.after||prior),file);
}
for(const r of rows)test(`approved Runway recording and guarded MP3 routing: ${r.gardenId}`,()=>{
 const m=GARDEN35_MUSIC[r.gardenId],t=gardenMusicTracks().find(t=>t.gardenId===r.gardenId),bytes=read('public/'+r.asset);
 assert.equal(m.asset,r.asset);assert.equal(m.themeId,r.themeId);assert.equal(hash(JSON.stringify(m)),r.catalogSha256);assert.equal(hash(bytes),r.sha256);assert.equal(bytes.length,r.bytes);assert.ok(bytes.length<1_500_000);
 assert.equal(r.original.version,'0');assert.equal(r.original.bundleSha256,'3cf3bbec1e50346dbc59cd8773dc019b12551202b2bbf8d5e4c97c2557f8784b');assert.equal(hash(read('public/'+r.previousAsset)),r.previousAssetSha256);
 assert.equal(t.startOffsetSeconds,.1);assert.equal(t.loopStartSeconds,.1);assert.equal(t.loopEndSeconds,.1+r.loopSamples/44100);assert.equal(r.decodedSamples,r.loopSamples+2*r.guardSamples);
 assert.ok(r.seamPeakDelta<.03);assert.ok(r.boundaryRms>.004);assert.ok(Math.abs(r.integratedLufs+19)<.2);assert.ok(r.truePeakDbfs<0);assert.equal(m.auditionReviewed,false);
});
test('exactly two authorized IDs; other33, explicit booklet successor, Bach sources and gameplay remain unchanged',()=>{
 assert.deepEqual(rows.map(r=>r.gardenId),['paris-unrest','bird-hooded-siskin']);assert.deepEqual(rows.map(r=>r.original.sha256),['4ec15ddf05d0cf72be0a53ae4b3ff6be79a72f753c908a4fe5e01cd3057b1968','0d14e22b099d4324dc16e4713bc831a9378db18c46c6ded0392d75d8c8d588b7']);
 const audit=JSON.parse(read('docs/qa/gardens30-35-scope.json'));assert.equal(Object.keys(audit.otherGardenHashes).length,33);
 for(const [id,expected] of Object.entries(audit.otherGardenHashes))assert.equal(hash(JSON.stringify(GARDEN35_MUSIC[id])),expected,id);
 const ui=JSON.parse(read('docs/qa/garden-track-credit-scope.json')),motion=JSON.parse(read('docs/qa/garden-motion-four-scope.json')),actors=JSON.parse(read('docs/qa/garden-actors-scope.json'));
 const rotation=JSON.parse(read('docs/qa/garden-rotation-input-scope.json'));
 const fit=JSON.parse(read('docs/qa/garden-rotation-fit-scope.json'));
 assert.deepEqual(Object.keys(fit.changedSource),['src/garden-actor-motion.js', 'src/garden-actor-state.js', 'src/garden-bird-motion.js']);
 assert.deepEqual(Object.keys(rotation.changedSource),['src/game.js','src/garden-actor-motion.js','src/garden-bird-motion.js']);
 assert.deepEqual(Object.keys(actors.changedSource),['src/encounter-ui.js','src/garden-bird-motion.js']);
 assert.deepEqual(Object.keys(motion.changedSource),['src/encounter-ui.js','src/garden-bird-motion.js']);
 for(const [file,expected] of Object.entries(audit.unchangedSource)){const successor=ui.changedSource[file];if(successor)assert.equal(successor.before,expected,file);const next=motion.changedSource[file];if(next)assert.equal(next.before,successor?.after||expected,file);const actor=actors.changedSource[file];if(actor)assert.equal(actor.before,next?.after||successor?.after||expected,file);const prior=actor?.after||next?.after||successor?.after||expected;const rotationStep=rotation.changedSource[file];if(rotationStep)assert.equal(rotationStep.before,prior,file);const intermediate=rotationStep?.after||prior;const fitStep=fit.changedSource[file];if(fitStep)assert.equal(fitStep.before,intermediate,file);assertScopedCurrent(file,fitStep?.after||intermediate);}
 assert.match(read('src/garden-about-booklet.js').toString(),/renderGardenTrackCredit/);
});
