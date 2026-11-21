import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
import {Window} from 'happy-dom';
import {createActorFlight} from '../src/garden-actor-flight.js';
const hash=b=>createHash('sha256').update(b).digest('hex');
const manifest=JSON.parse(readFileSync(new URL('../docs/qa/white-flight-21-manifest.json',import.meta.url)));
test('approved 21 frames retain exact bytes, dimensions and alpha',async()=>{
 assert.equal(manifest.approvedPrototype.sha256,'161ec5b0f5da0d5646439d2a85a4b91954cbe3e3db29de74a6924d0c7d972368');
 assert.equal(manifest.frames.length,21);const all=[];
 for(const f of manifest.frames){const bytes=readFileSync(new URL('../public/game-art/garden-flight/white-connected/'+f.file.split('/').at(-1),import.meta.url));assert.equal(bytes.length,f.size);assert.equal(hash(bytes),f.sha256);const m=await sharp(bytes).metadata();assert.equal(m.width,280);assert.equal(m.height,258);assert.equal(m.hasAlpha,true);all.push(bytes);}
 assert.equal(hash(Buffer.concat(all)),manifest.framesSha256);
});
function fixture(){const window=new Window({url:'https://example.test/game/'}),pending=[];let now=0;window.performance={now:()=>now};window.HTMLImageElement.prototype.decode=function(){if(this.src.includes('white-connected'))return new Promise((resolve,reject)=>pending.push({image:this,resolve,reject}));return Promise.resolve()};
 const make=(color='white')=>{const sprite=window.document.createElement('span');sprite.innerHTML=`<span class="garden-bird-pose-window"><img src="https://example.test/game-art/${color}-poses.webp"></span>`;window.document.body.append(sprite);return {sprite,flight:createActorFlight(sprite,color)}};
 return {window,pending,make,clock:value=>{now=value;}};}
const actor=(phase='flap',since=0,left=false,height=.04)=>({state:'fly',phase,since,height,route:{from:[.3,.7],to:[left?.1:.6,.7]}});
const flush=async()=>{for(let i=0;i<6;i++)await Promise.resolve()};
test('within cold budget all decodes precede readiness; one shared preload; no mid-flight switch; next flight animates',async()=>{
 const {make,pending}=fixture(),a=make(),b=make();assert.equal(pending.length,21);assert.equal(a.flight.ready,false);
 a.flight.paint(actor(),300);for(const p of pending.slice(0,20))p.resolve();await flush();assert.equal(a.flight.ready,false);pending[20].resolve();await flush();assert.equal(a.flight.ready,true);assert.equal(b.flight.ready,true);
 a.flight.paint(actor(),430);assert.equal(a.flight.node.style.visibility,'hidden');
 a.flight.paint(actor('flap',3000),3430);assert.equal(a.flight.node.style.visibility,'visible');assert.equal(a.flight.node.querySelector('[data-white-flight-frame]').dataset.frame,'wing6');assert.equal(a.flight.node.querySelectorAll('[data-part]').length,0);
});
test('approved frame sampling, both directions, phases and contact; no per-frame DOM growth',async()=>{
 const {make,pending}=fixture(),{sprite,flight}=make();pending.forEach(p=>p.resolve());await flush();const count=sprite.querySelectorAll('*').length,image=flight.node.querySelector('[data-white-flight-frame]');
 for(const left of [false,true])for(const phase of ['push','rise','flap','brake','feet'])for(const time of [350,430,500,650,900,1900,2300]){
  flight.paint(actor(phase,0,left),time);const flap=Math.cos(time/1000*Math.PI*14),brake=['brake','feet'].includes(phase),angle=(brake?24:4)+(brake?20:43)*flap,mode=phase==='feet'?'feet':phase==='brake'?'brake':'wing',min=mode==='wing'?-39:4,max=mode==='wing'?47:44,index=Math.max(0,Math.min(6,Math.round((angle-min)*6/(max-min))));assert.equal(image.dataset.frame,mode+index);assert.equal(flight.node.style.transform,left?'scaleX(-1)':'none');assert.equal(sprite.querySelectorAll('*').length,count);assert.equal(flight.node.querySelector('[data-whole-bird]').style.visibility,'hidden');
 }
 for(const phase of ['contact','fold']){flight.paint(actor(phase,0,false,0),2500);assert.equal(flight.node.style.visibility,'hidden');assert.equal(image.style.visibility,'hidden');assert.equal(sprite.querySelector('.garden-bird-pose-window').style.visibility,'visible');}
});
test('failed decode chooses only intact fallback; pending and failed atlas never claim frames ready',async()=>{
 const {make,pending}=fixture(),{flight}=make();pending.forEach((p,i)=>i===4?p.reject(new Error('decode')):p.resolve());await flush();assert.equal(flight.ready,true);flight.paint(actor(),430);assert.equal(flight.node.querySelector('[data-whole-bird]').style.visibility,'visible');assert.equal(flight.node.querySelector('[data-white-flight-frame]').style.visibility,'hidden');assert.equal(flight.node.querySelectorAll('[data-part]').length,0);
});
test('other three colours keep their existing four-part renderer without white preload',async()=>{
 const {make,pending}=fixture();for(const color of ['sakura','cinnamon','silver']){const {flight}=make(color);await flush();flight.paint(actor(),430);assert.equal(flight.node.querySelectorAll('[data-part]').length,4);assert.equal(flight.node.querySelectorAll('[data-white-flight-frame]').length,0);}assert.equal(pending.length,0);
});
test('hung last frame falls back at shared deadline and late success animates next flight only',async()=>{
 const {make,pending,clock}=fixture(),a=make(),b=make();assert.equal(pending.length,21);
 for(const p of pending.slice(0,20))p.resolve();await flush();
 clock(1799);assert.equal(a.flight.ready,false);assert.equal(b.flight.ready,false);
 clock(1800);assert.equal(a.flight.ready,true);assert.equal(b.flight.ready,true);
 a.flight.paint(actor('crouch',1800,false,0),1800);
 a.flight.paint(actor('flap',1800,false,.04),2200);
 const whole=a.flight.node.querySelector('[data-whole-bird]'),img=a.flight.node.querySelector('[data-white-flight-frame]');
 assert.equal(whole.style.visibility,'visible');assert.equal(img.style.visibility,'hidden');
 clock(2300);pending[20].resolve();await flush();
 a.flight.paint(actor('brake',1800,false,.04),2400);
 assert.equal(whole.style.visibility,'visible');assert.equal(img.style.visibility,'hidden');
 a.flight.paint(actor('flap',5100,true,.04),5550);
 assert.equal(whole.style.visibility,'hidden');assert.equal(img.style.visibility,'visible');
 assert.equal(a.flight.node.style.transform,'scaleX(-1)');assert.ok(img.dataset.frame);
});
test('a failed frame permits safe fallback even while a different required frame is hung',async()=>{
 const {make,pending}=fixture(),a=make();pending[4].reject(new Error('rejected while remaining frames pending'));await flush();
 assert.equal(a.flight.ready,true);
 a.flight.paint(actor(),430);assert.equal(a.flight.node.querySelector('[data-whole-bird]').style.visibility,'visible');
});
