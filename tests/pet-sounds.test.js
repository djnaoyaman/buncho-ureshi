import test from 'node:test';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';import {readFile} from 'node:fs/promises';import {choosePetSound,getPetSound,petSoundRandom} from '../src/pet-sounds.js';import {PET_SOUND_PCM} from '../src/data/pet-sound-pcm.js';import {createCareAudio} from '../src/care-audio.js';import {audioRig} from './audio-fixture.js';
test('four equal quarter intervals, exact boundaries and no species argument or world writes',()=>{
 for(const [v,index] of [[0,0],[.249999999,0],[.25,1],[.499999999,1],[.5,2],[.749999999,2],[.75,3],[.999999999,3]]){let calls=0;assert.equal(choosePetSound(()=>{calls++;return v}),index);assert.equal(calls,1);}
 const counts=[0,0,0,0];for(let i=0;i<4000;i++)counts[choosePetSound(()=>i/4000)]++;assert.deepEqual(counts,[1000,1000,1000,1000]);for(const invalid of [-1,1,NaN,Infinity])assert.equal(choosePetSound(()=>invalid),0);
});
test('all four PCM sources retain exact approved master hashes and decode without reshaping or gain',async()=>{
 const manifest=JSON.parse(await readFile(new URL('../docs/qa/pet-sound-provenance.json',import.meta.url)));assert.equal(PET_SOUND_PCM.length,4);
 for(let index=0;index<4;index++){const bytes=Buffer.from(PET_SOUND_PCM[index],'base64');assert.equal(createHash('sha256').update(bytes).digest('hex'),manifest.sounds[index].pcmSHA256);const samples=getPetSound(index);assert.equal(samples.length,60000);assert.equal(getPetSound(index),samples);for(let j=0;j<samples.length;j++)assert.equal(samples[j],bytes.readInt16LE(j*2)/32768);assert(Math.max(...samples.map(Math.abs))<.45);}
 assert.throws(()=>getPetSound(4),RangeError);
});
for(let index=0;index<4;index++)test(`approved motif ${index+1} starts exactly once and preserves exact PCM, duration and unity gain`,async()=>{
 const rig=audioRig(),audio=createCareAudio({Context:rig.Context});audio.setEnabled(true);await audio.unlockFromGesture();assert.equal(await audio.chime(()=>true,getPetSound(index)),true);assert.equal(rig.starts,1);const c=rig.contexts[0];assert.deepEqual(c.nodes[0].buffer.getChannelData(0),getPetSound(index));assert.equal(c.nodes[0].buffer.sampleRate,48000);assert.equal(c.nodes[0].stops[0]-c.nodes[0].starts[0],1.25);assert.equal(c.gains[0].gain.events[0][1],1);audio.close();
});
test('built feedback and PCM dependencies share a versioned cache key',async()=>{
 const feedback=await readFile(new URL('../dist/src/encounter-pet-response.js',import.meta.url),'utf8'),sounds=await readFile(new URL('../dist/src/pet-sounds.js',import.meta.url),'utf8');const a=feedback.match(/\.\/pet-sounds\.js\?v=([a-f0-9]+)/),b=sounds.match(/\.\/data\/pet-sound-pcm\.js\?v=([a-f0-9]+)/);assert(a);assert(b);assert.equal(a[1],b[1]);
});

test('default entropy never advances gameplay Math.random, including unavailable crypto',()=>{
 const original=Math.random;Math.random=()=>{throw Error('gameplay RNG must not be called');};try{
  for(const word of [0,1073741824,2147483648,3221225472,4294967295]){const source={getRandomValues(a){a[0]=word;return a;}};assert.equal(petSoundRandom(source),word/4294967296);}
  for(let i=0;i<100;i++){const value=petSoundRandom(null);assert(value>=0&&value<1);}assert([0,1,2,3].includes(choosePetSound()));
 }finally{Math.random=original;}
});
