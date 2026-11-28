import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {createHash} from 'node:crypto';
import {GARDEN35_MUSIC} from '../src/data/garden35-music.js';import {gardenMusicTracks} from '../src/game-music.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url)),hash=b=>createHash('sha256').update(b).digest('hex'),r=JSON.parse(read('docs/qa/garden31-runway.json'));
const trail=JSON.parse(read('docs/qa/garden-trail-public-scope.json'));
const flat=JSON.parse(read('docs/qa/garden-flat-seven-scope.json'));
const remaining=JSON.parse(read('docs/qa/garden-flat-remaining-scope.json'));
const shelves=JSON.parse(read('docs/qa/garden-flat-phase2-scope.json'));
const platforms=JSON.parse(read('docs/qa/garden-mossy-log-scope.json'));
const levels=JSON.parse(read('docs/qa/garden-flat-platforms-scope.json'));
const courtyard=JSON.parse(read('docs/qa/garden-flat-onsen-scope.json'));
const homeCamera=JSON.parse(read('docs/qa/home-camera-scope.json'));
const friendCamera=JSON.parse(read('docs/qa/friend-camera-pilot-scope.json'));
const friendRollout=JSON.parse(read('docs/qa/friend-camera-rollout-scope.json'));
const raptorCapacity=JSON.parse(read('docs/qa/garden-raptor-capacity-scope.json'));
const homeJourney=JSON.parse(read('docs/qa/garden-home-journey-scope.json'));
const friendshipFilm=JSON.parse(read('docs/qa/garden-friendship-movie-scope.json'));
const moreFriendshipFilms=JSON.parse(read('docs/qa/garden-friendship-movie-expansion-scope.json'));
const friendshipLogo=JSON.parse(read('docs/qa/garden-friendship-movie-logo09-scope.json'));
const siskin=JSON.parse(read('docs/qa/friendship-movie-eurasian-siskin-scope.json'));
const doubleBarred=JSON.parse(read('docs/qa/friendship-movie-double-barred-finch-scope.json'));
const pine=JSON.parse(read('docs/qa/friendship-movie-pine-grosbeak-scope.json'));
const brambling=JSON.parse(read('docs/qa/friendship-movie-brambling-scope.json'));
const evening=JSON.parse(read('docs/qa/friendship-movie-evening-grosbeak-scope.json'));
const parrot=JSON.parse(read('docs/qa/friendship-movie-red-throated-parrotfinch-scope.json'));
const diamond=JSON.parse(read('docs/qa/friendship-movie-diamond-firetail-scope.json'));
const zebra=JSON.parse(read('docs/qa/friendship-movie-zebra-finch-scope.json'));
const redpoll=JSON.parse(read('docs/qa/friendship-movie-common-redpoll-scope.json'));
const avadavat=JSON.parse(read('docs/qa/friendship-movie-red-avadavat-scope.json'));
const newFriendship=JSON.parse(read('docs/qa/garden-friendship-movie-gouldian-crossbill-scope.json'));
const friendScale=JSON.parse(read('docs/qa/friend-cage-scale-scope.json'));
function afterFriendScale(file,prior){
 const change=friendScale.changedSource[file];
 if(change)assert.equal(change.before,prior,file);
 return change?.after??prior;
}
function afterEvening(file,prior){
 const change=evening.changedSource[file];
 if(change)assert.equal(change.before,prior,file);
 const doubleBarredChange=doubleBarred.changedSource[file];
 const next=change?.after??prior;
 if(doubleBarredChange)assert.equal(doubleBarredChange.before,next,file);
 const afterDouble=doubleBarredChange?.after??next;
 const pineChange=pine.changedSource[file];
 if(pineChange)assert.equal(pineChange.before,afterDouble,file);
 const afterPine=pineChange?.after??afterDouble;
 const bramblingChange=brambling.changedSource[file];
 if(bramblingChange)assert.equal(bramblingChange.before,afterPine,file);
 return bramblingChange?.after??afterPine;
}
function afterFriendshipMovie(file,prior){
 const change=friendshipFilm.changedSource[file];
 if(change)assert.equal(change.before,prior,file);
 return afterEvening(file,afterFriendScale(file,parrot.changedSource[file]?.after??change?.after??prior));
}
function afterHomeJourney(file,prior){
 const change=homeJourney.changedSource[file];
 if(change)assert.equal(change.before,prior,file);
 return change?.after||prior;
}
function afterRaptorCapacity(file,prior){
 const change=raptorCapacity.changedSource[file];
 if(change)assert.equal(change.before,prior,file);
 return change?.after||prior;
}
function afterLevels(file,prior){
 const next=levels.changedSource[file];
 if(next)assert.equal(next.before,prior,file);
 const base=next?.after||prior, layer=courtyard.changedSource[file];
 if(layer)assert.equal(layer.before,base,file);
 const released=layer?.after||base,home=homeCamera.changedSource[file];
 if(home)assert.equal(home.before,released,file);
 const own=home?.after||released,friend=friendCamera.changedSource[file];
 if(friend)assert.equal(friend.before,own,file);
 const pilot=friend?.after||own, rollout=friendRollout.changedSource[file];
 if(rollout)assert.equal(rollout.before,pilot,file);
 return afterFriendshipMovie(file,afterHomeJourney(file,afterRaptorCapacity(file,rollout?.after||pilot)));
}

function assertScopedCurrent(file,prior){
 const step=trail.changedSource[file];
 if(step)assert.equal(step.before,prior,file);
 const successor=flat.changedSource[file];
 if(successor)assert.equal(successor.before,step?.after||prior,file);
 const platform=platforms.changedSource[file];
 if(platform)assert.equal(platform.before,successor?.after||step?.after||prior,file);
 assert.equal(hash(read(file)),afterLevels(file,platform?.after||successor?.after||step?.after||prior),file);
}
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
 for(const [file,expected] of Object.entries(audit.unchangedSource)){const successor=ui.changedSource[file];if(successor)assert.equal(successor.before,expected,file);const next=motion.changedSource[file];if(next)assert.equal(next.before,successor?.after||expected,file);const actor=actors.changedSource[file];if(actor)assert.equal(actor.before,next?.after||successor?.after||expected,file);const prior=actor?.after||next?.after||successor?.after||expected;const rotationStep=rotation.changedSource[file];if(rotationStep)assert.equal(rotationStep.before,prior,file);const intermediate=rotationStep?.after||prior;const fitStep=fit.changedSource[file];if(fitStep)assert.equal(fitStep.before,intermediate,file);assertScopedCurrent(file,fitStep?.after||intermediate);}
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
  assertScopedCurrent(file,step.after);
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
  assertScopedCurrent(file,fitStep?.after||step.after);
 }
});

test('Type II formal candidate source successor pins the exact reviewed files and preserves historic ledger chain',()=>{
 assert.equal(trail.baseCommit,'41736e849645a97ad334a731a0044ce1e5814f0e');
 assert.equal(trail.baseTree,'7d15ce555a5e6a840bc43cc14e246e2d0116d6d1');
 assert.deepEqual(Object.keys(trail.changedSource),['src/encounter-ui.js', 'src/garden-actor-flight.js', 'src/garden-actor-motion.js', 'src/garden-actor-state.js', 'src/garden-bird-motion.js']);
 assert.deepEqual(trail.gardens,[7,8,10,12,14,28,34]);
 assert.deepEqual(Object.keys(trail.newSource),['src/data/garden-trail-terrain.js', 'src/garden-actor-path.js', 'src/garden-trail-adapter.js', 'src/garden-trail-clearance.js', 'src/garden-trail-lane.js', 'src/garden-trail-runtime.js']);
 for(const [f,digest] of Object.entries(trail.newSource))assert.equal(hash(read(f)),digest,f);
 for(const [f,entry] of Object.entries(trail.changedSource)){
  assert.deepEqual(Object.keys(entry),['before','after'],f);
  assert.match(entry.before,/^[0-9a-f]{64}$/);
  assert.notEqual(entry.before,entry.after,f);
  const successor=flat.changedSource[f];
  if(successor)assert.equal(successor.before,entry.after,f);
  const platform=platforms.changedSource[f];
  if(platform)assert.equal(platform.before,successor?.after||entry.after,f);
  assert.equal(hash(read(f)),afterLevels(f,platform?.after||successor?.after||entry.after),f);
 }
});

test('approved flat successor pins exactly two runtime files and preserves the old trail record',()=>{
 assert.equal(flat.baseCommit,'8a9194947c0a0bd11c06ee829a677badd0cc97b8');
 assert.deepEqual(flat.gardens,trail.gardens);
 assert.deepEqual(Object.keys(flat.changedSource),['src/encounter-ui.js','src/data/garden-actor-terrain.js']);
 assert.equal(flat.changedSource['src/encounter-ui.js'].before,trail.changedSource['src/encounter-ui.js'].after);
 for(const [file,entry] of Object.entries(flat.changedSource)){
  assert.deepEqual(Object.keys(entry),['before','after'],file);
  assert.match(entry.before,/^[0-9a-f]{64}$/);
  assert.notEqual(entry.before,entry.after,file);
  const latest=remaining.changedSource[file];
  if(latest)assert.equal(latest.before,entry.after,file);
  const shelf=shelves.changedSource[file];
  if(shelf)assert.equal(shelf.before,latest?.after||entry.after,file);
  const platform=platforms.changedSource[file];
  if(platform)assert.equal(platform.before,shelf?.after||latest?.after||entry.after,file);
  assert.equal(hash(read(file)),afterLevels(file,platform?.after||shelf?.after||latest?.after||entry.after),file);
 }
});


test('remaining open-ground release extends the prior ledger for only the surveyed terrain module',()=>{
 const path='src/data/garden-actor-terrain.js';
 assert.equal(remaining.baseCommit,'ff05b8f930c3c55af045056cc9dd1121fa788e01');
 assert.deepEqual(remaining.gardens,[2,5,9,13,17,19,22,23,24,25,30,35]);
 assert.deepEqual(remaining.heldGardens,[16,18,27,32,33]);
 assert.deepEqual(Object.keys(remaining.changedSource),[path]);
 const edge=remaining.changedSource[path];
 assert.deepEqual(Object.keys(edge),['before','after']);
 assert.equal(edge.before,flat.changedSource[path].after);
 assert.notEqual(edge.after,edge.before);
 const successor=shelves.changedSource[path];
 assert.equal(successor.before,edge.after);
 assert.equal(platforms.changedSource[path].before,successor.after);
 assert.equal(hash(read(path)),afterLevels(path,platforms.changedSource[path].after));
});


test('stone-shelf release extends the exact prior terrain ledger only',()=>{
 const path='src/data/garden-actor-terrain.js';
 assert.equal(shelves.baseCommit,'ec0d4142f8e0b676243271d3f51cbcbdcc2ae568');
 assert.deepEqual(shelves.gardens,[18]);
 assert.deepEqual(shelves.heldGardens,[16,27,32,33]);
 assert.deepEqual(Object.keys(shelves.changedSource),[path]);
 const edge=shelves.changedSource[path];
 assert.deepEqual(Object.keys(edge),['before','after']);
 assert.equal(edge.before,remaining.changedSource[path].after);
 assert.notEqual(edge.after,edge.before);
 assert.equal(platforms.changedSource[path].before,edge.after);
 assert.equal(hash(read(path)),afterLevels(path,platforms.changedSource[path].after));
});


test('mossy log extends the prior ledgers for exactly terrain data and shared presentation only',()=>{
 const data='src/data/garden-actor-terrain.js', motion='src/garden-actor-motion.js';
 assert.equal(platforms.baseCommit,'62609c8d7ae4667b028ae01b95dc63c74ac5f0c9');
 assert.deepEqual(platforms.gardens,[16]);assert.deepEqual(platforms.heldGardens,[27,32,33]);
 assert.deepEqual(Object.keys(platforms.changedSource),[data,motion]);
 assert.equal(platforms.changedSource[data].before,shelves.changedSource[data].after);
 assert.equal(platforms.changedSource[motion].before,trail.changedSource[motion].after);
 for(const [f,edge] of Object.entries(platforms.changedSource)){
  assert.deepEqual(Object.keys(edge),['before','after']);assert.notEqual(edge.before,edge.after);
  assert.equal(hash(read(f)),afterLevels(f,edge.after),f);
 }
});


test('stepped surfaces extend the mossy log ledger for exactly the shared presentation and terrain',()=>{
 const data='src/data/garden-actor-terrain.js',motion='src/garden-actor-motion.js';
 assert.equal(levels.baseCommit,'c4efd7dc4aa3fdc281b5508ce1e591aaa76e2f56');
 assert.deepEqual(levels.gardens,[27,33]);assert.deepEqual(levels.heldGardens,[32]);
 assert.deepEqual(Object.keys(levels.changedSource),[data,motion]);
 for(const [f,edge] of Object.entries(levels.changedSource)){
  assert.deepEqual(Object.keys(edge),['before','after']);
  assert.notEqual(edge.before,edge.after);
  assert.equal(edge.before,platforms.changedSource[f].after);
  const layer=courtyard.changedSource[f];
  if(layer)assert.equal(layer.before,edge.after,f);
  assert.equal(hash(read(f)),afterFriendshipMovie(f,afterRaptorCapacity(f,layer?.after||edge.after)),f);
 }
});

test('Yoriso-i courtyard releases only the lower courtyard geometry and decorative foreground',()=>{
 const data='src/data/garden-actor-terrain.js', renderer='src/encounter-ui.js';
 assert.equal(courtyard.baseCommit,'706f71b25579b6841446beb8ac0a93b3b68a9dea');
 assert.deepEqual(courtyard.gardens,[32]);
 assert.deepEqual(courtyard.heldGardens,[]);
 assert.deepEqual(Object.keys(courtyard.changedSource),[renderer,data]);
 assert.equal(courtyard.changedSource[renderer].before,flat.changedSource[renderer].after);
 assert.equal(courtyard.changedSource[data].before,levels.changedSource[data].after);
 for(const [file,edge] of Object.entries(courtyard.changedSource)){
  assert.notEqual(edge.after,edge.before,file);
  assert.equal(hash(read(file)),afterFriendshipMovie(file,afterRaptorCapacity(file,edge.after)),file);
 }
 assert.equal(hash(read('public/game-art/gardens35/bird-garden-32.webp')),courtyard.originalArtSha256);
});


test('only the measured original home camera and egg/chick presentation extend current shared sources',()=>{
 assert.equal(homeCamera.baseCommit,'4ba348598a1f4c87aff07bf35774b31e84ef4311');
 assert.equal(homeCamera.home,'field-home');
 assert.deepEqual(Object.keys(homeCamera.changedSource),['src/game.js','src/game.css','src/field-visuals.js']);
 assert.equal(homeCamera.changedSource['src/game.js'].before,JSON.parse(read('docs/qa/garden-rotation-input-scope.json')).changedSource['src/game.js'].after);
 for(const [f,v]of Object.entries(homeCamera.changedSource)){assert.notEqual(v.before,v.after,f);assert.equal(hash(read(f)),afterFriendshipMovie(f,afterHomeJourney(f,friendRollout.changedSource[f]?.after||friendCamera.changedSource[f]?.after||v.after)),f);}
 for(const [f,v]of Object.entries(homeCamera.media))assert.equal(hash(read(f)),v,f);
 assert.equal(homeCamera.greenAlphaPixelsRemoved,33);
});

test('raptor occupancy repair changes only the renderer, not rules or art',()=>{
 const renderer='src/encounter-ui.js';
 assert.match(raptorCapacity.baseCommit,/^[0-9a-f]{40}$/);
 assert.deepEqual(Object.keys(raptorCapacity.changedSource),[renderer]);
 assert.equal(raptorCapacity.changedSource[renderer].before,courtyard.changedSource[renderer].after);
 assert.equal(hash(read(renderer)),afterFriendshipMovie(renderer,raptorCapacity.changedSource[renderer].after));
 for(const [f,v]of Object.entries(raptorCapacity.unchangedPredatorSources))assert.equal(hash(read(f)),v,f);
});

test('explicit garden return pins only its navigation source, after the unchanged camera rollout',()=>{
 assert.equal(homeJourney.baseCommit,'985f4a022566920f2b5f4388736972cd8dc5ce22');
 assert.deepEqual(Object.keys(homeJourney.changedSource),['src/game.js']);
 const file='src/game.js', edge=homeJourney.changedSource[file];
 assert.deepEqual(Object.keys(edge),['before','after']);
 assert.equal(edge.before,friendRollout.changedSource[file].after);
 assert.notEqual(edge.after,edge.before);
 assert.equal(hash(read(file)),afterFriendshipMovie(file,edge.after),file);
});

test('friendship-film successor pins only the reviewed runtime and approved exact asset',()=>{
 assert.equal(friendshipFilm.baseCommit,'e3865934eb5a574f62b6b92c052d5525cf94fe95');
 assert.deepEqual(Object.keys(friendshipFilm.changedSource),['src/game.js','src/encounter-ui.js','src/collection-ending-player.js','src/game.css']);
 for(const [path,edge] of Object.entries(friendshipFilm.changedSource)){
  assert.deepEqual(Object.keys(edge),['before','after']);assert.match(edge.before,/^[0-9a-f]{64}$/);assert.notEqual(edge.before,edge.after,path);
  const successor=moreFriendshipFilms.changedSource[path];if(successor)assert.equal(successor.before,edge.after,path);
  const logo=friendshipLogo.changedSource[path];if(logo)assert.equal(logo.before,successor?.after??edge.after,path);
  const latest=newFriendship.changedSource[path];if(latest)assert.equal(latest.before,logo?.after??successor?.after??edge.after,path);
  const added=avadavat.changedSource[path];if(added)assert.equal(added.before,latest?.after??logo?.after??successor?.after??edge.after,path);
  const extra=siskin.changedSource[path];if(extra)assert.equal(extra.before,added?.after??latest?.after??logo?.after??successor?.after??edge.after,path);
  const newest=redpoll.changedSource[path];if(newest)assert.equal(newest.before,extra?.after,path);
  const generated=zebra.changedSource[path];if(generated)assert.equal(generated.before,newest?.after,path);
  const newestGenerated=diamond.changedSource[path];if(newestGenerated)assert.equal(newestGenerated.before,generated?.after,path);
  const parrotFilm=parrot.changedSource[path];if(parrotFilm)assert.equal(parrotFilm.before,newestGenerated?.after,path);
  assert.equal(hash(read(path)),afterEvening(path,afterFriendScale(path,parrotFilm?.after??newestGenerated?.after??generated?.after??newest?.after??extra?.after??added?.after??latest?.after??logo?.after??successor?.after??edge.after)),path);
 }
 for(const [path,sha] of Object.entries(friendshipFilm.media))assert.equal(hash(read(path)),sha,path);
});

test('three additional mini films only extend the existing player catalog',()=>{
 assert.equal(moreFriendshipFilms.baseCommit,'39a1d7ea4bf16a6a7cb9697b185f4c267d40a4a1');
 assert.deepEqual(Object.keys(moreFriendshipFilms.changedSource),['src/collection-ending-player.js']);
 assert.equal(Object.keys(moreFriendshipFilms.media).length,3);
 for(const [path,sha] of Object.entries(moreFriendshipFilms.media))assert.equal(hash(read(path)),sha,path);
});

test('approved logo09 only changes the four movie URLs, not the player or original assets',()=>{
 assert.equal(friendshipLogo.baseCommit,'ffc207f9eddf564f849651dc01de50163b38afe1');
 const file='src/collection-ending-player.js';
 assert.deepEqual(Object.keys(friendshipLogo.changedSource),[file]);
 assert.equal(Object.keys(friendshipLogo.media).length,4);
 let reverted=read(file).toString("utf8");
 for(const [asset,sha] of Object.entries(brambling.media))assert.equal(hash(read(asset)),sha,asset);
 if(brambling.changedSource[file]){
  assert.equal(hash(reverted),brambling.changedSource[file].after,file);
  for(const {after,before} of [...brambling.revert[file]].reverse()){
   assert.equal(reverted.split(after).length,2,file);
   reverted=reverted.replace(after,before);
  }
  assert.equal(hash(reverted),brambling.changedSource[file].before,file);
 }
 for(const [asset,sha] of Object.entries(pine.media))assert.equal(hash(read(asset)),sha,asset);
 if(pine.changedSource[file]){
  assert.equal(hash(reverted),pine.changedSource[file].after,file);
  for(const {after,before} of [...pine.revert[file]].reverse()){
   assert.equal(reverted.split(after).length,2,file);
   reverted=reverted.replace(after,before);
  }
  assert.equal(hash(reverted),pine.changedSource[file].before,file);
 }
 for(const [asset,sha] of Object.entries(doubleBarred.media))assert.equal(hash(read(asset)),sha,asset);
 if(doubleBarred.changedSource[file]){
  assert.equal(hash(reverted),doubleBarred.changedSource[file].after,file);
  for(const {after,before} of [...doubleBarred.revert[file]].reverse()){
   assert.equal(reverted.split(after).length,2,file);
   reverted=reverted.replace(after,before);
  }
  assert.equal(hash(reverted),doubleBarred.changedSource[file].before,file);
 }
 assert.equal(hash(reverted),evening.changedSource[file].after,file);
 for(const [asset,sha] of Object.entries(evening.media))assert.equal(hash(read(asset)),sha,asset);
 for(const {after,before} of [...evening.revert[file]].reverse()){
  assert.equal(reverted.split(after).length,2,file);
  reverted=reverted.replace(after,before);
 }
 assert.equal(hash(reverted),evening.changedSource[file].before,file);
 assert.equal(hash(reverted),parrot.changedSource[file].after,file);
 for(const [file,sha] of Object.entries(parrot.media))assert.equal(hash(read(file)),sha,file);
 assert.ok(reverted.includes(parrot.revert));
 reverted=reverted.replace(parrot.revert,"");
 assert.equal(hash(reverted),diamond.changedSource[file].after,file);
 for(const [file,sha] of Object.entries(diamond.media))assert.equal(hash(read(file)),sha,file);
 assert.ok(reverted.includes(diamond.revert));
 reverted=reverted.replace(diamond.revert,"");
 assert.equal(hash(reverted),zebra.changedSource[file].after,file);
 for(const [file,sha] of Object.entries(zebra.media))assert.equal(hash(read(file)),sha,file);
 const [entry,credit,afterMsg,beforeMsg]=zebra.revert;
 assert.ok(reverted.includes(entry)&&reverted.includes(credit)&&reverted.includes(afterMsg));
 reverted=reverted.replace(entry,"").replace(credit,"").replace(afterMsg,beforeMsg);
 assert.equal(hash(reverted),redpoll.changedSource[file].after,file);
 for(const [file,sha] of Object.entries(redpoll.media))assert.equal(hash(read(file)),sha,file);
 reverted=reverted.replace(/,\n 'common-redpoll':Object\.freeze\(\{[\s\S]*?\n \}\)/,'');
 assert.equal(hash(reverted),siskin.changedSource[file].after,file);
 reverted=reverted.replace(/,\n 'eurasian-siskin':Object\.freeze\(\{[\s\S]*?\n \}\)/,'');
 assert.equal(hash(reverted),avadavat.changedSource[file].after,file);
 reverted=reverted.replace(/,\n 'red-avadavat':Object\.freeze\(\{[\s\S]*?\n \}\)/,'');
 assert.equal(hash(reverted),newFriendship.changedSource[file].after,file);
 reverted=reverted.replace(/,\n 'gouldian-finch':Object\.freeze\(\{[\s\S]*?\n \}\),\n 'red-crossbill':Object\.freeze\(\{[\s\S]*?\n \}\)/,'');
 reverted=reverted.replace("\${film.edit??'縦向きに切り出し、文字と音楽を加えています。'}", '縦向きに切り出し、文字と音楽を加えています。');
 assert.equal(hash(reverted),friendshipLogo.changedSource[file].after,file);
 for(const [path,spec] of Object.entries(friendshipLogo.media)){
  const old=spec.original;
  assert.notEqual(path,old);
  const previous=friendshipFilm.media[old]??moreFriendshipFilms.media[old];
  assert.ok(previous,old);
  assert.equal(hash(read(old)),previous,old);
  assert.equal(hash(read(path)),spec.sha256,path);
  const replacement=path.split('/').at(-1);
  assert.equal(reverted.split(replacement).length,2,replacement);
  reverted=reverted.replace(replacement,old.split('/').at(-1));
 }
 assert.equal(hash(reverted),friendshipLogo.changedSource[file].before,file);
});

test('only the two exact finished logo09 films extend the licensed library',()=>{
 assert.equal(newFriendship.baseCommit,'53ea9cef2e28af24d58b5d32104c7cd9b19cb092');
 assert.deepEqual(Object.keys(newFriendship.changedSource),['src/collection-ending-player.js']);
 assert.deepEqual(Object.keys(newFriendship.media),['public/game-endings/friendship-gouldian-finch-logo09.mp4','public/game-endings/friendship-red-crossbill-logo09.mp4']);
 for(const [f,row] of Object.entries(newFriendship.media))assert.equal(hash(read(f)),row.sha256,f);
});

test('independent title card extends only the reviewed ending player and stylesheet',()=>{
 const files=['src/collection-ending-player.js','src/game.css'];
 assert.deepEqual(Object.keys(evening.changedSource),files);
 for(const file of files){
  let source=read(file).toString();
  if(brambling.changedSource[file]){
   assert.equal(hash(source),brambling.changedSource[file].after,file);
   for(const {after,before} of brambling.revert[file]){
    assert.equal(source.split(after).length,2,file);
    source=source.replace(after,before);
   }
   assert.equal(hash(source),brambling.changedSource[file].before,file);
  }
  if(pine.changedSource[file]){
   assert.equal(hash(source),pine.changedSource[file].after,file);
   for(const {after,before} of pine.revert[file]){
    assert.equal(source.split(after).length,2,file);
    source=source.replace(after,before);
   }
   assert.equal(hash(source),pine.changedSource[file].before,file);
  }
  if(doubleBarred.changedSource[file]){
   assert.equal(hash(source),doubleBarred.changedSource[file].after,file);
   for(const {after,before} of doubleBarred.revert[file]){
    assert.equal(source.split(after).length,2,file);
    source=source.replace(after,before);
   }
   assert.equal(hash(source),doubleBarred.changedSource[file].before,file);
  }
  assert.equal(hash(source),evening.changedSource[file].after,file);
  for(const {after,before} of [...evening.revert[file]].reverse()){
   assert.equal(source.split(after).length,2,file);
   source=source.replace(after,before);
  }
  assert.equal(hash(source),evening.changedSource[file].before,file);
 }
});
