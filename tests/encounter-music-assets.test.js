import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {createHash} from 'node:crypto';
const evidence=JSON.parse(readFileSync('docs/qa/encounter-music-pcm.json'));
for(const id of ['crow','raptor'])test(`${id}: approved derivative has bounded PCM, no silent loop gap and exact asset identity`,()=>{
 const file=readFileSync(`public/audio/encounters/${id}.wav`);assert.equal(createHash('sha256').update(file).digest('hex'),evidence[id].assetSHA256);
 assert.equal(file.toString('ascii',0,4),'RIFF');assert.equal(file.readUInt32LE(24),44100);assert.equal(file.readUInt16LE(22),2);assert.equal(file.readUInt16LE(34),16);
 const pcm=file.subarray(44),frames=pcm.length/4;assert.equal(frames/44100,evidence[id].duration);
 let min=Infinity,peak=0;for(let start=0;start<frames;start+=882){let sum=0;for(let i=0;i<882;i++)for(let c=0;c<2;c++){const value=pcm.readInt16LE(((start+i)%frames)*4+c*2)/32768;sum+=value*value;peak=Math.max(peak,Math.abs(value));}min=Math.min(min,Math.sqrt(sum/1764));}
 assert.ok(min>.004);assert.ok(peak<.42);for(let c=0;c<2;c++)assert.ok(Math.abs(pcm.readInt16LE(c*2)-pcm.readInt16LE(pcm.length-4+c*2))/32768<.02);
});
