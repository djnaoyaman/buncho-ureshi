import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {createHash} from 'node:crypto';
import {GARDEN35_MUSIC} from '../src/data/garden35-music.js';import {gardenMusicTracks} from '../src/game-music.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url)),hash=b=>createHash('sha256').update(b).digest('hex'),r=JSON.parse(read('docs/qa/garden31-runway.json'));
test('hanadokei uses the exact approved Runway-derived MP3 with explicit period and entry guard',()=>{
 const m=GARDEN35_MUSIC.hanadokei,t=gardenMusicTracks().find(t=>t.gardenId==='hanadokei'),bytes=read('public/'+r.asset);
 assert.equal(m.themeId,'garden-hanadokei');assert.equal(m.title,'まるい冠の花庭');assert.equal(m.asset,r.asset);assert.equal(hash(bytes),r.sha256);assert.equal(bytes.length,r.bytes);assert.ok(bytes.length<1_500_000);
 assert.equal(r.original.sha256,'6a95dd548c7d982c340cb91947618b5303c0aa0262901520c5662bdad7925005');assert.equal(r.original.version,'0');assert.equal(t.startOffsetSeconds,.1);assert.equal(t.loopStartSeconds,.1);assert.equal(t.loopEndSeconds,.1+r.loopSamples/44100);
 assert.equal(r.decodedSamples,r.loopSamples+2*r.guardSamples);assert.ok(r.seamPeakDelta<.03);assert.ok(r.boundaryRms>.004);assert.ok(Math.abs(r.integratedLufs+19)<.2);assert.ok(r.truePeakDbfs<0);assert.equal(m.auditionReviewed,false);
});
test('prior garden assignments remain exact except separately verified Runway successors; booklet changes only through its explicit authorized successor',()=>{
 const audit=JSON.parse(read('docs/qa/garden31-scope.json'));
 const successors=JSON.parse(read('docs/qa/gardens30-35-runway.json'));assert.deepEqual(successors.map(r=>r.gardenId),['paris-unrest','bird-hooded-siskin']);
 for(const [id,expected] of Object.entries(audit.otherGardenHashes)){const successor=successors.find(r=>r.gardenId===id);if(successor)assert.equal(successor.previousCatalogSha256,expected,id);assert.equal(hash(JSON.stringify(GARDEN35_MUSIC[id])),successor?.catalogSha256||expected,id);}
 const ui=JSON.parse(read('docs/qa/garden-track-credit-scope.json')),motion=JSON.parse(read('docs/qa/garden-motion-four-scope.json')),actors=JSON.parse(read('docs/qa/garden-actors-scope.json'));
 const rotation=JSON.parse(read('docs/qa/garden-rotation-input-scope.json'));
 const fit=JSON.parse(read('docs/qa/garden-rotation-fit-scope.json'));
 assert.deepEqual(Object.keys(fit.changedSource),['src/garden-actor-motion.js', 'src/garden-actor-state.js', 'src/garden-bird-motion.js']);
 assert.deepEqual(Object.keys(rotation.changedSource),['src/game.js','src/garden-actor-motion.js','src/garden-bird-motion.js']);
 assert.deepEqual(Object.keys(actors.changedSource),['src/encounter-ui.js','src/garden-bird-motion.js']);
 assert.deepEqual(Object.keys(motion.changedSource),['src/encounter-ui.js','src/garden-bird-motion.js']);
 for(const [file,expected] of Object.entries(audit.unchangedSource)){const successor=ui.changedSource[file];if(successor)assert.equal(successor.before,expected,file);const next=motion.changedSource[file];if(next)assert.equal(next.before,successor?.after||expected,file);const actor=actors.changedSource[file];if(actor)assert.equal(actor.before,next?.after||successor?.after||expected,file);const prior=actor?.after||next?.after||successor?.after||expected;const rotationStep=rotation.changedSource[file];if(rotationStep)assert.equal(rotationStep.before,prior,file);const intermediate=rotationStep?.after||prior;const fitStep=fit.changedSource[file];if(fitStep)assert.equal(fitStep.before,intermediate,file);assert.equal(hash(read(file)),fitStep?.after||intermediate,file);}
 assert.match(read('src/garden-about-booklet.js').toString(),/renderGardenTrackCredit/);
});

test('rotation-input and fit successors pin exactly the reviewed raw changes in order',()=>{
 const rotation=JSON.parse(read('docs/qa/garden-rotation-input-scope.json'));
 const fit=JSON.parse(read('docs/qa/garden-rotation-fit-scope.json'));
 assert.equal(fit.baseTree,'74132a50674b3d935e04beed9f861487844ff620');
 assert.equal(fit.productTree,'c07aade1c13964868ba2f8d4f0576eafd0adde9b');
 const fitPrior={
  'src/garden-actor-motion.js':rotation.changedSource['src/garden-actor-motion.js'].after,
  'src/garden-actor-state.js':'b3bcf8cb3c4a52a535a1b5d84c835f680af8d3dbdaadc3ed7c1f287a6ae87fbf',
  'src/garden-bird-motion.js':rotation.changedSource['src/garden-bird-motion.js'].after,
 };
 assert.deepEqual(Object.keys(fit.changedSource),Object.keys(fitPrior));
 for(const [file,before] of Object.entries(fitPrior)){
  const step=fit.changedSource[file];
  assert.deepEqual(Object.keys(step),['before','after'],file);
  assert.equal(step.before,before,file);
  assert.notEqual(step.after,before,file);
  assert.equal(hash(read(file)),step.after,file);
 }
 assert.equal(rotation.baseTree,'30c8cfebf0196ff5d2f6f47385e1c2a1ea01122b');
 assert.equal(rotation.productTree,'ea1b6b972b9551b86f428036f303ddc86f9a355f');
 const prior={
  'src/game.js':'3fe8520c06ede90d45f1f5fc757bbad3ddc5e8aa2ce35216f980de2109880772',
  'src/garden-actor-motion.js':'afb095bc2869bfa2045fca840b31efce1c0750a3c8e03a4e6ee332546ed08400',
  'src/garden-bird-motion.js':JSON.parse(read('docs/qa/garden-actors-scope.json')).changedSource['src/garden-bird-motion.js'].after,
 };
 assert.deepEqual(Object.keys(rotation.changedSource),Object.keys(prior));
 for(const [file,before] of Object.entries(prior)){
  const step=rotation.changedSource[file];
  assert.deepEqual(Object.keys(step),['before','after'],file);
  assert.equal(step.before,before,file);
  assert.notEqual(step.after,before,file);
  const fitStep=fit.changedSource[file];
  if(fitStep)assert.equal(fitStep.before,step.after,file);
  assert.equal(hash(read(file)),fitStep?.after||step.after,file);
 }
});
