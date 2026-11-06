import test from 'node:test';
import assert from 'node:assert/strict';
import { Window } from 'happy-dom';
import { mountGardenBirdMotion, renderGardenBirdSprite } from '../src/garden-bird-motion.js';

const rect = (left, top, width, height) => ({ left, top, right:left+width, bottom:top+height, width, height });

// Real browsers report both the removed stage's zero size and the newly observed
// stage's initial size. Neither notification means presentation time was paused.
for (const width of [320,390]) test(`${width}px friend-only poses advance through repeated stage ResizeObserver notifications`, async t => {
  const window = new Window(), document = window.document, root = document.createElement('section');
  document.body.append(root);
  const intervals = new Map(), notifications = [];
  let now = 0, nextId = 0, observer;
  Object.defineProperty(window.performance, 'now', { value:()=>now, configurable:true });
  Object.defineProperty(document, 'hidden', { value:false, configurable:true });
  window.matchMedia = () => ({ matches:false, addEventListener(){}, removeEventListener(){} });
  window.setInterval = (callback, delay) => { assert.equal(delay,1000); intervals.set(++nextId,callback); return nextId; };
  window.clearInterval = id => intervals.delete(id);
  window.requestAnimationFrame = () => assert.fail('The four distant friends have no safe social pair');
  window.ResizeObserver = class {
    constructor(callback){ this.callback=callback; observer=this; }
    observe(target){ this.target=target; notifications.push(()=>this.callback([{target,contentRect:target.getBoundingClientRect()}])); }
    disconnect(){ this.target=null; }
  };
  const ids = width===320
    ? ['gf-komugi-2','gf-hanadokei-2','gf-komorebi-1','gf-mizukagami-1']
    : ['gf-mizukagami-1','gf-kazaguruma-1','gf-komorebi-2','gf-onsen-2'];
  function render(){
    root.innerHTML=`<section class="finch-garden" data-garden-world="same-world"><div class="finch-garden-stage" data-garden-id="komorebi"><div class="finch-garden-slide"><div class="finch-garden-image-plane">${ids.map(id=>`<button class="finch-garden-friend">${renderGardenBirdSprite('white',id)}</button>`).join('')}</div></div></div></section>`;
    for(const node of root.querySelectorAll('.finch-garden-stage,.finch-garden-slide'))node.getBoundingClientRect=()=>rect(0,0,width,844);
    root.querySelectorAll('button').forEach((node,index)=>{node.getBoundingClientRect=()=>rect(index%2?width-110:40,index<2?240:370,64,75);});
  }
  const poses = () => [...root.querySelectorAll('.garden-bird-sprite')].map(node=>node.dataset.pose).join(',');
  const flushObservers = () => notifications.splice(0).forEach(notify=>notify());
  function redraw(){
    const removed=observer.target;
    render();
    observer.callback([{target:removed,contentRect:rect(0,0,0,0)}]);
  }
  render();
  const dispose=mountGardenBirdMotion(root);
  t.after(async()=>{dispose();await window.happyDOM.close();});
  flushObservers();
  const before=poses();
  // The initial garden transaction redraws before the first motion sample.
  now=500;redraw();
  let changed=false;
  for(let second=1;second<=12;second++){
    // Match the host's normal three-second world refresh, just before the next
    // motion sample. Its semantic garden and four bird identities stay the same.
    if(second%3===0){now=second*1000-100;redraw();}
    now=second*1000;
    for(const callback of [...intervals.values()])callback();
    flushObservers();
    changed ||= poses()!==before;
  }
  assert.equal(changed,true,'Routine stage replacement must not starve the active pose clock');
});
