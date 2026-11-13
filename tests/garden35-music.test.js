import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {GARDEN35_MUSIC,GARDEN_MUSIC_ASSETS} from '../src/data/garden35-music.js';
import {GARDEN35_PLAN} from '../src/data/garden35-plan.js';
import {GARDENS,OLD_GARDENS,gardenAudioIntent} from '../src/data/gardens.js';
import {gardenMusicTracks,createGameMusic} from '../src/game-music.js';

test('all 35 gardens have distinct complete matching music assets and exact loop boundaries',()=>{
 assert.equal(Object.keys(GARDEN35_MUSIC).length,35);
 const tracks=gardenMusicTracks();assert.equal(tracks.length,35);
 assert.equal(new Set(tracks.map(t=>t.asset)).size,35);
 assert.equal(new Set(tracks.map(t=>t.id)).size,35);
 for(const row of GARDEN35_PLAN){
  const m=GARDEN35_MUSIC[row.id],t=tracks.find(t=>t.gardenId===row.id);
  assert.ok(m,row.id);assert.equal(t.title,row.name);assert.equal(m.loopStartSeconds,0);
  assert.ok(m.loopEndSeconds>0);assert.equal(m.loopEndSeconds,m.loopSamples/m.sampleRate);
  const bytes=readFileSync(new URL('../public/'+m.asset,import.meta.url));
  assert.equal(createHash('sha256').update(bytes).digest('hex'),m.sha256);
  assert.deepEqual(GARDENS.find(g=>g.id===row.id).music,m);
  assert.equal(gardenAudioIntent({gardenId:row.id,mode:'auto',enabled:true}).asset,m.asset);
 }
});
test('legacy fixed selections, disabled preference and volume survive new garden music catalogue',()=>{
 for(const g of OLD_GARDENS){
  assert.equal(GARDEN_MUSIC_ASSETS[g.id].music.themeId,g.music.themeId);
  const original=JSON.stringify({selected:g.music.themeId,mode:'fixed',volume:.31,enabled:false});
  const writes=[];const p=createGameMusic({storage:{getItem:()=>original,setItem:(...v)=>writes.push(v)}});
  assert.equal(p.state().fixedSelected,g.music.themeId);assert.equal(p.state().mode,'fixed');
  assert.equal(p.state().enabled,false);assert.equal(p.state().volume,.31);assert.equal(writes.length,0);p.dispose();
 }
});
test('every new garden remains silent and unfetched until a user gesture, including saved OFF',async()=>{
 const requests=[];const p=createGameMusic({fetcher:async u=>requests.push(u),storage:{getItem:()=>'{"enabled":false}'}});
 for(const g of GARDENS){await p.setGarden(g.id,'test-world');assert.equal(p.state().enabled,false);}
 assert.equal(requests.length,0);p.dispose();
});
