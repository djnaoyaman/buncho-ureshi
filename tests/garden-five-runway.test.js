import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {GARDEN35_MUSIC} from '../src/data/garden35-music.js';
import {gardenMusicTracks} from '../src/game-music.js';
const rows=['garden-five-runway','homichi-runway','shimashima-runway','garden-batch-two-runway','garden-batch-three-runway','garden-batch-four-runway','garden-batch-five-runway','garden-batch-six-runway'].flatMap(name=>JSON.parse(readFileSync(new URL('../docs/qa/'+name+'.json',import.meta.url))));
for(const row of rows)test(`approved recording, cyclic PCM guards and initial offset: ${row.gardenId}`,()=>{
 const m=GARDEN35_MUSIC[row.gardenId],track=gardenMusicTracks().find(t=>t.gardenId===row.gardenId);
 assert.equal(m.asset,row.asset);assert.equal(track.startOffsetSeconds,.02);assert.equal(track.loopStartSeconds,.02);
 assert.equal(row.original.version,'0');assert.match(row.original.sha256,/^[a-f0-9]{64}$/);
 const b=readFileSync(new URL('../public/'+m.asset,import.meta.url));
 assert.equal(b.toString('ascii',0,4),'RIFF');assert.equal(b.toString('ascii',8,12),'WAVE');
 assert.equal(b.readUInt16LE(20),1);assert.equal(b.readUInt16LE(22),2);assert.equal(b.readUInt32LE(24),44100);assert.equal(b.readUInt16LE(34),16);
 const pcm=b.subarray(44),g=row.guardSamples*4,n=row.loopSamples*4;
 assert.equal(pcm.length,n+2*g);assert.deepEqual(pcm.subarray(0,g),pcm.subarray(n,n+g));assert.deepEqual(pcm.subarray(n+g),pcm.subarray(g,2*g));
 let peak=0,sum=0;for(let i=g;i<g+n;i+=2){const x=pcm.readInt16LE(i)/32768;peak=Math.max(peak,Math.abs(x));sum+=x*x;}
 assert.ok(peak<.98);assert.ok(Math.sqrt(sum/(n/2))>.01);
});
test('guard offset stays absent for the three preserved garden tracks',()=>{
 const selected=new Set([...rows.map(r=>r.gardenId),'hanadokei']);for(const t of gardenMusicTracks())if(!selected.has(t.gardenId)){assert.equal(t.startOffsetSeconds,undefined);assert.equal(t.loopStartSeconds,0);}
});
