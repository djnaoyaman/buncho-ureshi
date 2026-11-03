import test from 'node:test';import assert from 'node:assert/strict';import {createGameMusic,MUSIC_TRACKS} from '../src/game-music.js';
function fixture(options={}){let contexts=[],requests=[],started=[];const values=new Map();class Context{constructor(){this.state='suspended';this.currentTime=0;this.destination={};contexts.push(this);}resume(){this.state='running';return Promise.resolve();}suspend(){this.state='suspended';return Promise.resolve();}close(){this.state='closed';return Promise.resolve();}decodeAudioData(){return Promise.resolve({duration:12});}createGain(){return{gain:{value:.18,cancelScheduledValues(){},setValueAtTime(){},linearRampToValueAtTime(){},setTargetAtTime(){}},connect(){},disconnect(){}};}createBufferSource(){const s={connect(){},disconnect(){},start(){started.push(s);s.live=true;},stop(){s.live=false;s.onended?.();}};return s;}}
 const storage={getItem:k=>values.get(k),setItem:(k,v)=>values.set(k,v)};const player=createGameMusic({Context,storage,fetcher:async(url)=>{requests.push(url);return{ok:true,arrayBuffer:async()=>new ArrayBuffer(4)};},...options});return{player,contexts,requests,started,values,Context};}
test('construction is silent with four exact named assets',()=>{const f=fixture();assert.equal(f.contexts.length,0);assert.equal(f.requests.length,0);assert.equal(f.player.state().volume,.18);assert.equal(MUSIC_TRACKS.length,4);});
test('WAV loops full buffer, one selected fetch',async()=>{const f=fixture();assert.equal(await f.player.playFromGesture('orchard'),true);assert.deepEqual(f.requests,['audio/02_little_orchard.wav']);assert.equal(f.started[0].loop,true);assert.equal(f.started[0].loopEnd,12);f.player.dispose();});
test('switch leaves one live source',async()=>{const f=fixture();await f.player.playFromGesture();await f.player.playFromGesture('village');assert.equal(f.started.filter(x=>x.live).length,1);assert.equal(f.player.state().selected,'village');f.player.dispose();});
test('OFF immediately stops and persists',async()=>{const f=fixture();await f.player.playFromGesture();f.player.off();assert.equal(f.started.filter(x=>x.live).length,0);assert.equal(JSON.parse(f.values.get('buncho.music.v1')).enabled,false);assert.equal(f.player.state().status,'off');f.player.dispose();});
test('OFF during fetch prevents stale playback',async()=>{let finish;const f=fixture({fetcher:()=>new Promise(r=>finish=r)});const p=f.player.playFromGesture();await new Promise(r=>setTimeout(r,0));f.player.off();finish({ok:true,arrayBuffer:async()=>new ArrayBuffer(1)});assert.equal(await p,false);assert.equal(f.started.length,0);f.player.dispose();});
test('rapid switches only latest result starts',async()=>{let resolves=[];const f=fixture({fetcher:()=>new Promise(r=>resolves.push(r))});const a=f.player.playFromGesture();await new Promise(r=>setTimeout(r,0));const b=f.player.playFromGesture('village');await new Promise(r=>setTimeout(r,0));assert.equal(resolves.length,1);resolves[0]({ok:true,arrayBuffer:async()=>new ArrayBuffer(1)});await a;await new Promise(r=>setTimeout(r,0));resolves[1]({ok:true,arrayBuffer:async()=>new ArrayBuffer(1)});await b;assert.equal(f.started.length,1);assert.equal(f.player.state().selected,'village');f.player.dispose();});
test('pause stops and requires another explicit gesture',async()=>{const f=fixture();await f.player.playFromGesture();f.player.pause();assert.equal(f.player.state().status,'paused');assert.equal(f.started.filter(x=>x.live).length,0);assert.equal(f.contexts[0].state,'suspended');await f.player.playFromGesture();assert.equal(f.requests.length,1);f.player.dispose();});
test('disposed cannot resume',async()=>{const f=fixture();await f.player.playFromGesture();f.player.dispose();assert.equal(await f.player.playFromGesture(),false);assert.equal(f.contexts[0].state,'closed');assert.equal(f.started.filter(x=>x.live).length,0);});
test('404 reports honest error without playback',async()=>{const f=fixture({fetcher:async()=>({ok:false})});assert.equal(await f.player.playFromGesture(),false);assert.equal(f.player.state().status,'error');assert.match(f.player.state().error,/読み込めません/);assert.equal(f.started.length,0);f.player.dispose();});
test('volume clamped, invalid input ignored',()=>{const f=fixture();f.player.setVolume(9);assert.equal(f.player.state().volume,.6);f.player.setVolume(NaN);assert.equal(f.player.state().volume,.6);f.player.setVolume(-1);assert.equal(f.player.state().volume,0);f.player.dispose();});
test('saved on never autoplays',()=>{const f=fixture({storage:{getItem:()=>JSON.stringify({enabled:true,selected:'village',volume:.2})}});assert.equal(f.player.state().enabled,true);assert.equal(f.player.state().status,'paused');assert.equal(f.contexts.length,0);f.player.dispose();});
test('unavailable context and malformed storage fail safely',async()=>{const f=fixture({Context:null,storage:{getItem:()=>'{',setItem(){throw Error('blocked');}}});assert.equal(await f.player.playFromGesture(),false);assert.equal(f.player.state().status,'error');f.player.dispose();});
test('never-resolving unlock times out',async()=>{const f=fixture();class Locked extends f.Context {resume(){return new Promise(()=>{});}}const p=createGameMusic({Context:Locked,activationTimeout:5});assert.equal(await p.playFromGesture(),false);assert.match(p.state().error,/タップ/);p.dispose();});
test('invalid selection performs no work',async()=>{const f=fixture();assert.equal(await f.player.playFromGesture('fake'),false);assert.equal(f.contexts.length,0);});

const tick=()=>new Promise(r=>setTimeout(r,0));
test('rapid selections serialize native decode and coalesce stale requests',async()=>{
 const f=fixture();let releases=[],decodes=0,live=0,max=0;
 class Slow extends f.Context{decodeAudioData(){decodes++;live++;max=Math.max(max,live);return new Promise(r=>releases.push(()=>{live--;r({duration:12});}));}}
 const p=createGameMusic({Context:Slow,fetcher:async()=>({ok:true,arrayBuffer:async()=>new ArrayBuffer(4)})});
 const first=p.playFromGesture('meadow');await tick();
 const second=p.playFromGesture('orchard');await tick();const third=p.playFromGesture('lakeside');await tick();const fourth=p.playFromGesture('village');await tick();
 assert.equal(decodes,1);releases[0]();await tick();assert.equal(decodes,2);assert.equal(max,1);releases[1]();
 assert.deepEqual(await Promise.all([first,second,third,fourth]),[false,false,false,true]);assert.equal(p.state().selected,'village');p.dispose();
});
test('hung native decode gets honest timeout but never frees its occupied lane',async()=>{
 const f=fixture();let decodes=0;
 class Hung extends f.Context{decodeAudioData(){decodes++;return new Promise(()=>{});}}
 const p=createGameMusic({Context:Hung,loadTimeout:8,fetcher:async()=>({ok:true,arrayBuffer:async()=>new ArrayBuffer(4)})});
 assert.equal(await p.playFromGesture(),false);assert.equal(p.state().status,'error');assert.match(p.state().error,/読み込みが止まり/);
 assert.equal(await p.playFromGesture('orchard'),false);assert.equal(decodes,1);assert.equal(p.state().status,'error');p.dispose();
});
test('hung response body is timed out before any decode',async()=>{
 const f=fixture();let decodes=0;class C extends f.Context{decodeAudioData(){decodes++;return Promise.resolve({duration:1});}}
 const p=createGameMusic({Context:C,loadTimeout:8,fetcher:async()=>({ok:true,arrayBuffer:()=>new Promise(()=>{})})});
 assert.equal(await p.playFromGesture(),false);assert.equal(p.state().status,'error');assert.equal(decodes,0);p.dispose();
});
test('stale response body is not decoded',async()=>{
 const f=fixture();let body,decodes=0;class C extends f.Context{decodeAudioData(){decodes++;return Promise.resolve({duration:1});}}
 const p=createGameMusic({Context:C,fetcher:async()=>({ok:true,arrayBuffer:()=>new Promise(r=>body=r)})});
 const attempt=p.playFromGesture();await tick();p.off();body(new ArrayBuffer(4));assert.equal(await attempt,false);assert.equal(decodes,0);p.dispose();
});
test('cached reselect preserves scheduled old fade and starts replacement only at its end',async()=>{
 const f=fixture();const sources=[];
 class Timed extends f.Context{createBufferSource(){const s={stops:[],starts:[],connect(){},disconnect(){},start(at){this.starts.push(at);},stop(at){this.stops.push(at);}};sources.push(s);return s;}}
 const p=createGameMusic({Context:Timed,fetcher:async()=>({ok:true,arrayBuffer:async()=>new ArrayBuffer(4)})});
 await p.playFromGesture();await p.playFromGesture();assert.deepEqual(sources[0].stops,[.1]);assert.deepEqual(sources[1].starts,[.1]);
 // Third rapid cached tap must not prolong the first fading source or force stop it early.
 await p.playFromGesture();assert.deepEqual(sources[0].stops,[.1]);assert.deepEqual(sources[2].starts,[.1]);p.off();assert.equal(sources[2].stops.at(-1),undefined);p.dispose();
});

test('new music is armed but silent; explicit saved off stays off',()=>{const a=fixture();assert.equal(a.player.state().enabled,true);assert.equal(a.contexts.length,0);a.player.dispose();const b=fixture({storage:{getItem:()=>JSON.stringify({enabled:false})}});assert.equal(b.player.state().enabled,false);assert.equal(b.contexts.length,0);b.player.dispose();});

test('BGM cold device can become ready after the former 1200ms chirp deadline',async()=>{
 const f=fixture();class Cold extends f.Context{resume(){return new Promise(resolve=>setTimeout(()=>{this.state='running';resolve();},1350));}}
 const p=createGameMusic({Context:Cold,fetcher:async()=>({ok:true,arrayBuffer:async()=>new ArrayBuffer(4)})});
 assert.equal(await p.playFromGesture(),true);assert.equal(p.state().status,'playing');assert.equal(f.started.length,1);p.dispose();
});
for(const action of ['off','pause','dispose'])test(`${action} while native activation is pending prevents all delayed audio`,async()=>{
 const f=fixture();let release;class Cold extends f.Context{resume(){return new Promise(resolve=>{release=()=>{this.state='running';resolve();};});}}
 const requests=[];const p=createGameMusic({Context:Cold,fetcher:async url=>{requests.push(url);return{ok:true,arrayBuffer:async()=>new ArrayBuffer(4)};}});
 const attempt=p.playFromGesture();p[action]();release();assert.equal(await attempt,false);assert.equal(requests.length,0);assert.equal(f.started.length,0);if(action!=='dispose')p.dispose();
});
test('activation timeout never revives old playback; explicit later gesture recovers',async()=>{
 const f=fixture();let release;class Cold extends f.Context{resume(){return new Promise(resolve=>{release=()=>{this.state='running';resolve();};});}}
 const p=createGameMusic({Context:Cold,activationTimeout:5,fetcher:async()=>({ok:true,arrayBuffer:async()=>new ArrayBuffer(4)})});
 assert.equal(await p.playFromGesture(),false);assert.equal(p.state().status,'error');release();await tick();assert.equal(f.started.length,0);assert.equal(p.state().status,'error');assert.equal(await p.playFromGesture('orchard'),true);assert.equal(f.started.length,1);p.dispose();
});
test('latest chosen song alone starts after two pending native activations settle',async()=>{
 const f=fixture();const releases=[];class Cold extends f.Context{resume(){return new Promise(resolve=>releases.push(()=>{this.state='running';resolve();}));}}
 const requests=[];const p=createGameMusic({Context:Cold,fetcher:async url=>{requests.push(url);return{ok:true,arrayBuffer:async()=>new ArrayBuffer(4)};}});
 const first=p.playFromGesture('meadow'),last=p.playFromGesture('village');releases[1]();releases[0]();assert.deepEqual(await Promise.all([first,last]),[false,true]);assert.deepEqual(requests,['audio/04_village_waltz.wav']);assert.equal(f.started.length,1);p.dispose();
});
