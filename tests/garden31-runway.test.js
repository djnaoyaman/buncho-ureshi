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
 const ui=JSON.parse(read('docs/qa/garden-track-credit-scope.json')),motion=JSON.parse(read('docs/qa/garden-motion-four-scope.json'));
 assert.deepEqual(Object.keys(motion.changedSource),['src/encounter-ui.js','src/garden-bird-motion.js']);
 for(const [file,expected] of Object.entries(audit.unchangedSource)){const successor=ui.changedSource[file];if(successor)assert.equal(successor.before,expected,file);const next=motion.changedSource[file];if(next)assert.equal(next.before,successor?.after||expected,file);assert.equal(hash(read(file)),next?.after||successor?.after||expected,file);}
 assert.match(read('src/garden-about-booklet.js').toString(),/renderGardenTrackCredit/);
});
