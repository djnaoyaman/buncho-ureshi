import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Window} from 'happy-dom';
const css=readFileSync(new URL('../src/game.css',import.meta.url),'utf8');
const theme=css.slice(css.indexOf('/* COLOR PLAY —'));
const allowed=new Set(['background','color','border-color','border-radius','box-shadow','outline-color','accent-color','filter']);
test('Color Play remains a scoped paint-only layer without layout, artwork or interaction rules',()=>{
 const window=new Window(),style=window.document.createElement('style');style.textContent=theme;window.document.head.append(style);
 assert(theme.includes('/* End COLOR PLAY. */'));
 assert(style.sheet.cssRules.length>65);
 for(const rule of style.sheet.cssRules){
  assert(rule.selectorText?.startsWith('body[data-world="buncho"]'),rule.selectorText);
  for(let i=0;i<rule.style.length;i++){const prop=rule.style[i];assert(prop.startsWith('--play-')||prop.startsWith('--life-')||allowed.has(prop)||/^border-(top|right|bottom|left)-(color|left-radius|right-radius)$/.test(prop)||prop.startsWith('background-'),`${rule.selectorText}: ${prop}`);}
  assert(!/\.game-room-bird|\.game-sprite|\.game-care-pet-bird|\.finch-garden-(friend|household|visitor|image-plane)|\.finch-(crow|raptor)-(actor|java)|\.owner-peek|\.game-family-node/.test(rule.selectorText),rule.selectorText);
 }
 assert(!theme.includes('url('));
 window.happyDOM.abort();
});
function luminance(hex){const c=hex.match(/[\da-f]{2}/g).map(x=>parseInt(x,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return .2126*c[0]+.7152*c[1]+.0722*c[2];}
function contrast(a,b){const x=[luminance(a),luminance(b)].sort((a,b)=>b-a);return(x[0]+.05)/(x[1]+.05);}
test('Color Play text pairs meet WCAG AA for normal-size labels',()=>{
 for(const surface of ['fff8ea','fffdf5','f47769','ffdc64','bee5cd'])assert(contrast('10382f',surface)>=4.5,surface);
 assert(contrast('206558','fffdf5')>=4.5);
});

import {colorPlayWorld} from './fixtures/color-play.js';
import {validateWorld} from '../src/engine.js';
test('Color Play browser fixture is a valid paused save with consistent predator history',()=>{const world=colorPlayWorld();assert.equal(world.paused,true);assert.equal(world.encounters.crow.visits.length,1);assert.equal(world.encounters.raptor.visits.length,1);assert.doesNotThrow(()=>validateWorld(JSON.parse(JSON.stringify(world))));});
