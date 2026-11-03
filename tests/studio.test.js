import test from 'node:test';
import assert from 'node:assert/strict';
import { applyStudioMasterGain, mountStudio, makeStudioTemplate, validateStudioState, STUDIO_BACKGROUNDS, STUDIO_PALETTES, STUDIO_TEMPLATES } from '../src/studio.js';
import { photos } from '../src/data/photos.js';

const KEY = 'buncho-ureshi-studio-v1';

test('studio has six distinct valid templates, eleven backgrounds and eight palettes', () => {
  assert.equal(STUDIO_TEMPLATES.length, 6);
  assert.equal(STUDIO_BACKGROUNDS.length, 11);
  assert.equal(STUDIO_PALETTES.length, 8);
  const layouts = new Set();
  for (let i = 0; i < 6; i++) {
    const state = makeStudioTemplate(i);
    assert(validateStudioState(state));
    assert(state.items.length > 0);
    assert.equal(new Set(state.items.map(o => o.id)).size, state.items.length);
    layouts.add(JSON.stringify([state.format, state.background, state.palette, state.items.map(o => o.kind)]));
  }
  assert.equal(layouts.size, 6);
});

test('all four game feather colors and four growth stages survive family handoff with visible names', () => {
  for (const color of ['white', 'sakura', 'silver', 'cinnamon']) {
    for (const stage of ['egg', 'chick', 'juvenile', 'adult']) {
      const state = makeStudioTemplate(2, { title: '家族の記念日', birds: [{ name: 'こめ', color, stage }, { name: 'おもち', color: 'white', stage: 'adult' }], names: ['こめ', 'おもち'], event: 'hatch', date: '第3日' });
      assert(validateStudioState(state));
      assert(state.items.some(o => o.kind === 'bird' && o.birdName === 'こめ' && o.birdColor === color && o.birdStage === stage));
      assert(state.items.some(o => o.kind === 'text' && o.text === 'こめ'));
      assert(state.items.some(o => o.kind === 'text' && o.text === 'おもち'));
      assert(state.items.some(o => o.kind === 'text' && o.text.includes('第3日')));
    }
  }
});

test('storage validation rejects malformed state, duplicate IDs, unsupported references, and oversized input', () => {
  const state = makeStudioTemplate(0);
  const mutations = [
    s => { s.version = 99; }, s => { s.background = 11; }, s => { s.palette = -1; },
    s => { s.items[0].x = NaN; }, s => { s.items[0].y = -1; }, s => { s.items[0].w = 10000; },
    s => { s.items[0].r = Infinity; }, s => { s.items[0].color = '<script>'; },
    s => { s.items.push(s.items[0]); }, s => { s.title = 'あ'.repeat(37); },
    s => { s.items[0].kind = 'iframe'; }, s => { s.items[0].tint = 1; },
    s => { s.items = Array.from({ length: 37 }, (_, i) => ({ ...s.items[0], id: String(i) })); },
    s => { s.items[1].birdStage = 'dragon'; }, s => { s.items[1].birdColor = 'ultraviolet'; },
    s => { s.items[1].birdName = 'あ'.repeat(17); }
  ];
  for (const mutate of mutations) { const value = structuredClone(state); mutate(value); assert.equal(validateStudioState(value), false); }
  const picture = structuredClone(state);
  picture.items[0] = { ...picture.items[0], kind: 'photo', photoId: 'approved-photo', clip: 'oval' };
  assert.equal(validateStudioState(picture), false);
  assert(validateStudioState(picture, ['approved-photo']));
  picture.items[0].clip = 'remote-mask';
  assert.equal(validateStudioState(picture, ['approved-photo']), false);
  const tooMany = structuredClone(state);
  tooMany.items = Array.from({ length: 7 }, (_, i) => ({ ...picture.items[0], id: String(i), photoId: String(i), clip: 'rectangle' }));
  assert.equal(validateStudioState(tooMany, Array.from({ length: 7 }, (_, i) => String(i))), false);
});

test('export-enabled photo catalog preserves attribution and excludes share-alike and unsupported glyph attribution', () => {
  const eligible = photos.filter(p => p.artAllowed);
  assert.equal(eligible.length, 26);
  for (const p of eligible) {
    assert(p.author && p.credit && p.title && p.modifications);
    assert.match(p.src, /^\/photos\//);
    assert.match(p.source, /^https:\/\/commons\.wikimedia\.org\/wiki\/File:/);
    assert.match(p.license, /^(CC0|CC BY (2\.0|3\.0|4\.0))$/);
    assert.match(p.licenseUrl, /^https?:\/\/creativecommons\.org\//);
    assert(!/[\uA980-\uA9DF]/.test(p.author));
  }
  assert.equal(photos.find(p => p.id === 'photo-03').artAllowed, false);
});

// Lightweight repeatable DOM/Canvas contract fixture. It observes draw text and
// state transitions; it does not replace real-browser screenshots or PNG pixel QA.
function mockEnvironment(config = {}) {
  const controls = new Map(), storage = new Map(), drawn = [], drawCalls = [], imageCalls = [], old = new Map(), images = [], blobCallbacks = [], signalHandlers = new WeakMap();
  let blobCalls = 0;
  let acceptReset = true;
  const context = new Proxy({ measureText: t => ({ width: [...String(t)].length * 6 }), drawImage: (image,...args)=>imageCalls.push({src:image.src,args}), fillText: (t,x,y) => { drawn.push(String(t)); drawCalls.push({text:String(t),x,y,font:context.font}); } }, {
    get: (o, k) => k in o ? o[k] : (() => {}), set: (o, k, v) => { o[k] = v; return true; }
  });
  class Element {
    constructor(tag = 'div') { this.tagName = tag; this.children = []; this.links = []; this.style = {}; this.dataset = {}; this.listeners = {}; this.value = ''; this.hidden = false; this.width = 1000; this.height = 1000; this.attributes = {}; }
    set innerHTML(html) {
      this.html = html;
      for (const m of html.matchAll(/<([a-z]+)[^>]*data-(studio|action)="([^"]+)"[^>]*>/g)) {
        const e = new Element(m[1]); e.value = m[0].match(/value="([^"]+)"/)?.[1] || ''; e.hidden = m[0].includes('hidden'); controls.set(`[data-${m[2]}="${m[3]}"]`, e);
      }
      const nav = html.match(/<nav class="studio-steps"[\s\S]*?<\/nav>/)?.[0] || '';
      this.links = [...nav.matchAll(/<a href="([^"]+)"/g)].map(m => { const a = new Element('a'); a.attributes.href = m[1]; return a; });
    }
    querySelector(selector) { return controls.get(selector); }
    querySelectorAll(selector) { return selector === '.studio-steps a' ? this.links : this.children.filter(e => selector === 'button' && e.tagName === 'button'); }
    append(...children) { this.children.push(...children); }
    replaceChildren(...children) { this.children = [...children]; }
    addEventListener(type, fn, options = {}) { (this.listeners[type] ??= []).push(fn); if(options.signal){let list=signalHandlers.get(options.signal);if(!list){list=[];signalHandlers.set(options.signal,list);options.signal.addEventListener('abort',()=>{for(const [element,event,callback]of list)element.removeEventListener(event,callback);},{once:true});}list.push([this,type,fn]);} }
    removeEventListener(type,fn){this.listeners[type]=(this.listeners[type]||[]).filter(x=>x!==fn);}
    setAttribute(key, value) { this.attributes[key] = value; }
    getAttribute(key) { return this.attributes[key] ?? null; }
    getContext() { return context; }
    getBoundingClientRect() { return { left: 0, top: 0, width: 500, height: 500 }; }
    setPointerCapture() {}
    focus() {}
    get selectedOptions() { return [{ text: '花のワルツ' }]; }
    toBlob(callback) { blobCalls++; if(config.delayBlob)blobCallbacks.push(callback);else callback(new Blob(['mock-png'], { type: 'image/png' })); }
    async fire(type, extra = {}) { this['on'+type]?.(); for (const fn of [...(this.listeners[type] || [])]) await fn({ button: 0, key: '', preventDefault() {}, ...extra }); }
    async click() { if (!this.disabled) await this.fire('click'); }
  }
  function install(name, value) { old.set(name, Object.getOwnPropertyDescriptor(globalThis, name)); Object.defineProperty(globalThis, name, { configurable: true, writable: true, value }); }
  const document = new Element(); document.baseURI = 'https://example.test/buncho-ureshi/'; document.createElement = tag => new Element(tag); document.fonts = { ready: Promise.resolve() };
  install('document', document);
  install('location', { origin: 'https://example.test', pathname: '/buncho-ureshi/studio/', search: '' });
  install('Image', class extends Element { constructor() { super('img'); this.complete = !config.imageLoading; this.naturalWidth = config.imageLoading?0:1200; this.naturalHeight = config.imageLoading?0:800; images.push(this); } set src(v) { this._src = v; } get src() { return this._src; } });
  install('localStorage', { getItem: key => storage.get(key) || null, setItem: (key, value) => storage.set(key, value) });
  install('navigator', {});
  install('confirm', () => acceptReset);
  install('AudioContext', undefined); install('webkitAudioContext', undefined);
  return {
    root: new Element(), storage, drawn, drawCalls, imageCalls, images, config,
    get blobCalls(){return blobCalls;},finishBlob(){const callback=blobCallbacks.shift();assert(callback,'pending PNG callback');callback(new Blob(['mock-png'],{type:'image/png'}));},
    el: n => controls.get(`[data-studio="${n}"]`), button: n => controls.get(`[data-action="${n}"]`),
    state: () => JSON.parse(storage.get(KEY)), setReset: value => { acceptReset = value; },
    restore() { for (const [name, descriptor] of old) { if (descriptor) Object.defineProperty(globalThis, name, descriptor); else delete globalThis[name]; } }
  };
}

test('mock DOM contract: editing, photo credits, export fallback, reset cancel/confirm, undo/redo and cleanup', async () => {
  const m = mockEnvironment(); let cleanup;
  try {
    cleanup = mountStudio(m.root, { photos: [{ id: 'p1', src: '/photos/bird.webp', artAllowed: true, alt: '一般の白文鳥', title: 'Java sparrow photograph', author: 'Author A', credit: 'Author A / CC BY 4.0', source: 'https://example.com/photo', license: 'CC BY 4.0', licenseUrl: 'https://creativecommons.org/licenses/by/4.0/', modifications: 'WebP conversion' }] });
    assert.equal(m.state().items.length, 4);
    assert(m.root.links.every(a => a.getAttribute('href').startsWith('/buncho-ureshi/studio/#')));
    m.el('title').value = '新しい作品'; await m.button('title').click(); assert.equal(m.state().title, '新しい作品');
    await m.el('shapes').children[0].click(); assert.equal(m.state().items.length, 5);
    await m.button('undo').click(); assert.equal(m.state().items.length, 4);
    await m.button('redo').click(); assert.equal(m.state().items.length, 5);
    await m.el('photos').children[0].click(); assert.equal(m.state().items.at(-1).photoId, 'p1');
    m.el('clip').value = 'oval'; await m.el('clip').fire('change'); assert.equal(m.state().items.at(-1).clip, 'oval');
    m.el('tint').value = '0.4'; await m.el('tint').fire('change'); assert.equal(m.state().items.at(-1).tint, 0.4);
    m.el('text').value = '<script>alert(1)</script>'; await m.button('text').click(); assert.equal(m.state().items.at(-1).text, '<script>alert(1)</script>');
    m.el('text').value = '安全なことば'; await m.button('apply-text').click(); assert.equal(m.state().items.at(-1).text, '安全なことば');
    await m.button('export').click(); assert.equal(m.el('export-panel').hidden, false); assert.equal(m.button('share').hidden, true);
    const credits = m.drawn.join('');
    for (const value of ['Author A', 'CC BY 4.0', 'https://example.com/photo', 'https://creativecommons.org/licenses/by/4.0/', 'Java sparrow photograph', 'WebP conversion', '色調整', '安全なことば']) assert(credits.includes(value));
    assert(m.el('download').href.startsWith('blob:'));
    const old = m.state(); m.setReset(false); await m.button('reset').click(); assert.deepEqual(m.state(), old);
    m.setReset(true); await m.button('reset').click(); assert.equal(m.state().items.length, 0); assert.equal(m.el('export-panel').hidden, true);
    await m.button('undo').click(); assert.deepEqual(m.state(), old);
    m.el('format').value = 'portrait'; await m.el('format').fire('change'); assert.equal(m.state().format, 'portrait');
    await m.button('play').click(); assert(m.el('audio-status').textContent.includes('対応していません'));
  } finally { cleanup?.(); m.restore(); }
});

test('mock DOM family seed retains previous composition in undo and exports every supplied family name', async () => {
  const m = mockEnvironment(); let cleanup;
  try {
    const previous = makeStudioTemplate(0); previous.title = '前の作品'; m.storage.set(KEY, JSON.stringify(previous));
    cleanup = mountStudio(m.root, { seed: { title: '文鳥家族', names: ['こめ', 'おもち', 'わかば'], birds: [{ name: 'こめ', color: 'cinnamon', stage: 'adult' }, { name: 'おもち', color: 'white', stage: 'adult' }, { name: 'わかば', color: 'silver', stage: 'chick' }] } });
    for (const name of ['こめ', 'おもち', 'わかば']) {
      assert(m.state().items.some(o => o.kind === 'text' && o.text === name));
      assert(m.el('layers').children.some(o => o.textContent.includes(name)));
    }
    await m.button('export').click();
    for (const name of ['こめ', 'おもち', 'わかば']) assert(m.drawn.includes(name));
    await m.button('undo').click(); assert.deepEqual(m.state(), previous);
  } finally { cleanup?.(); m.restore(); }
});

const specimen = (id='p1',extra={}) => ({id,src:`/photos/${id}.webp`,artAllowed:true,alt:'一般の白文鳥',title:'Java sparrow',author:'Author A',credit:'Author A / CC BY 4.0',source:`https://example.com/${id}`,license:'CC BY 4.0',licenseUrl:'https://creativecommons.org/licenses/by/4.0/',modifications:'WebP conversion',...extra});
const turn = () => new Promise(resolve=>setImmediate(resolve));

test('strict saves reject hidden oversized fields and preserve corrupt raw data until a confirmed reset',async()=>{
 const state=makeStudioTemplate(0);
 for(const mutate of [s=>{s.unused='x'.repeat(100000);},s=>{s.items[0].unused='x'.repeat(100000);},s=>{s.items[0].text='x'.repeat(100000);},s=>{s.items[0].id='';},s=>{s.title='bad\u0000title';},s=>{s.items[0].birdStage='invented';}]){const value=structuredClone(state);mutate(value);assert.equal(validateStudioState(value),false);}
 assert.equal(validateStudioState(Object.assign(Object.create({polluted:true}),state)),false);
 for(const raw of ['{broken JSON',JSON.stringify({...state,unused:'x'.repeat(100000)}),' '.repeat(64001)+JSON.stringify(state)]){
  const m=mockEnvironment();let cleanup;
  try{m.storage.set(KEY,raw);cleanup=mountStudio(m.root);assert.equal(m.storage.get(KEY),raw);assert.match(m.el('status').textContent,/上書きせず/);await m.el('shapes').children[0].click();assert.equal(m.storage.get(KEY),raw);m.setReset(false);await m.button('reset').click();assert.equal(m.storage.get(KEY),raw);m.setReset(true);await m.button('reset').click();assert(validateStudioState(m.state()));assert.equal(m.state().items.length,0);}finally{cleanup?.();m.restore();}
 }
});

test('photo admission rejects nonlocal/blob/credential sources, duplicate IDs and unsupported licenses without fetching them',()=>{
 const m=mockEnvironment();let cleanup;
 try{cleanup=mountStudio(m.root,{photos:[specimen(),specimen('external',{src:'https://elsewhere.test/p.webp'}),specimen('blob',{src:'blob:https://example.test/token'}),specimen('credential',{src:'https://user:pass@example.test/buncho-ureshi/photos/b.webp'}),specimen('outside',{src:'/unrelated/photo.webp'}),specimen('svg',{src:'/photos/photo.svg'}),specimen('sa',{license:'CC BY-SA 4.0'}),specimen('source-credentials',{source:'https://user:pass@example.com/photo'}),specimen('p1',{src:'/photos/duplicate.webp'}),specimen('huge',{author:'a'.repeat(513)})]});assert.equal(m.el('photos').children.length,1);assert.equal(m.el('photos').children[0].dataset.photo,'p1');assert(m.images.every(img=>img.src?.includes('/buncho-ureshi/photos/p1.webp')||img.src==='https://example.test/buncho-ureshi/brand/wordmark-04-transparent.webp'||['art-nouveau','bauhaus','rinpa'].some(id=>img.src==='https://example.test/buncho-ureshi/studio-backgrounds/'+id+'.png')));}finally{cleanup?.();m.restore();}
});

test('literal attribution is preserved, and excess credit text blocks export rather than overlapping the image',async()=>{
 let m=mockEnvironment(),cleanup;
 try{cleanup=mountStudio(m.root,{photos:[specimen('literal',{author:'A <B> & Co;',credit:'A <B> & Co; / CC BY 4.0'})]});await m.el('photos').children[0].click();await m.button('export').click();assert(m.drawn.join('').includes('A <B> & Co;'));assert.equal(m.el('export-panel').hidden,false);}finally{cleanup?.();m.restore();}
 m=mockEnvironment();cleanup=null;
 try{const long=Array.from({length:6},(_,i)=>specimen('long-'+i,{title:'題'.repeat(1000),author:'A'.repeat(500),credit:'C'.repeat(1000),source:'https://example.com/'+('q'.repeat(1900))+i,modifications:'M'.repeat(1000)}));cleanup=mountStudio(m.root,{photos:long});assert.equal(m.el('photos').children.length,6);for(const p of m.el('photos').children)await p.click();const before=m.blobCalls;await m.button('export').click();assert.equal(m.blobCalls,before);assert.equal(m.el('export-panel').hidden,true);assert.match(m.el('status').textContent,/クレジットが長すぎ/);assert(m.drawCalls.every(c=>Number.isFinite(c.x)&&Number.isFinite(c.y)));}finally{cleanup?.();m.restore();}
});

test('six longest real photo credits remain complete and within the square PNG footer',async()=>{
 const longest=photos.filter(p=>p.artAllowed).sort((a,b)=>JSON.stringify(b).length-JSON.stringify(a).length).slice(0,6),m=mockEnvironment();let cleanup;
 try{cleanup=mountStudio(m.root,{photos:longest});for(const p of m.el('photos').children)await p.click();m.drawn.length=0;m.drawCalls.length=0;await m.button('export').click();assert.equal(m.el('export-panel').hidden,false);const text=m.drawn.join('');for(const p of longest){assert(text.includes(p.author));assert(text.includes(decodeURI(p.source)));assert(text.includes(p.licenseUrl));}for(const line of m.drawCalls.filter(c=>c.font==='11px sans-serif'))assert(line.y>=0&&line.y<1000,'credit baseline stays inside square');}finally{cleanup?.();m.restore();}
});

test('held-pointer changes invalidate an in-flight PNG; interrupted drags do not undo later controls',async()=>{
 const m=mockEnvironment({delayBlob:true});let cleanup;
 try{cleanup=mountStudio(m.root);await m.button('reset').click();await m.el('shapes').children[0].click();const canvas=m.el('canvas');const exporting=m.button('export').click();await turn();assert.equal(m.blobCalls,1);await canvas.fire('pointerdown',{pointerId:1,clientX:250,clientY:265});await canvas.fire('pointermove',{pointerId:1,clientX:300,clientY:290});m.finishBlob();await exporting;assert.equal(m.el('export-panel').hidden,true);assert.match(m.el('status').textContent,/作品が変わりました/);await m.button('right').click();const after=m.state();assert(after.items[0].x>.6);await canvas.fire('pointercancel',{pointerId:1});assert.deepEqual(m.state(),after);await m.button('undo').click();assert(m.state().items[0].x<after.items[0].x);m.config.delayBlob=false;await m.button('export').click();assert.equal(m.el('export-panel').hidden,false);await canvas.fire('pointerdown',{pointerId:2,clientX:300,clientY:290});await canvas.fire('pointermove',{pointerId:2,clientX:325,clientY:300});assert.equal(m.el('export-panel').hidden,true);await canvas.fire('pointercancel',{pointerId:2});assert.equal(m.el('export-panel').hidden,true);}finally{cleanup?.();m.restore();}
});

test('leaving during photo loading cancels pending listeners and export without waiting for timeout',async()=>{
 const m=mockEnvironment({imageLoading:true});let cleanup;
 try{cleanup=mountStudio(m.root,{photos:[specimen()]});await m.el('photos').children[0].click();const exporting=m.button('export').click();await turn();const loaded=m.images.find(img=>(img.listeners.load||[]).length>0);assert(loaded);cleanup();cleanup=null;await exporting;assert.equal((loaded.listeners.load||[]).length,0);assert.equal((loaded.listeners.error||[]).length,0);assert.equal(m.blobCalls,0);}finally{cleanup?.();m.restore();}
});

test('a loaded image with failed decoding never reaches PNG encoding',async()=>{
 const m=mockEnvironment();let cleanup;
 try{cleanup=mountStudio(m.root,{photos:[specimen()]});await m.el('photos').children[0].click();for(const image of m.images.filter(i=>i.src.includes('/photos/')))image.decode=()=>Promise.reject(new Error('corrupt pixels')); await m.button('export').click();assert.equal(m.blobCalls,0);assert.equal(m.el('export-panel').hidden,true);assert.match(m.el('status').textContent,/写真をすべて読み込めず/);}finally{cleanup?.();m.restore();}
});


test('studio mute cancels queued gain automation and sets native gain immediately even with a frozen audio clock',()=>{
  const calls=[],gain={value:.055,cancelScheduledValues(t){calls.push(['cancel',t]);},setValueAtTime(v,t){calls.push(['set',v,t]);}};
  const master={gain},audio={currentTime:0};
  applyStudioMasterGain(master,audio,true,.25);assert.equal(gain.value,0);assert.deepEqual(calls,[['cancel',0],['set',0,0]]);
  calls.length=0;applyStudioMasterGain(master,audio,false,.5);assert.equal(gain.value,.11);assert.deepEqual(calls,[['cancel',0],['set',.11,0]]);
  applyStudioMasterGain(master,audio,false,NaN);assert.equal(gain.value,0);
  applyStudioMasterGain(null,audio,true,1);
});


test('approved brand bitmap is drawn at its own ratio and missing brand blocks PNG export',async()=>{
 const m=mockEnvironment();let cleanup;
 try{cleanup=mountStudio(m.root);const logo=m.images.find(i=>i.src.endsWith('/brand/wordmark-04-transparent.webp'));assert(logo);assert(m.imageCalls.some(c=>c.src===logo.src&&c.args[2]===295&&Math.abs(c.args[3]-295*645/1120)<.001));await m.button('export').click();assert.equal(m.blobCalls,1);logo.naturalWidth=0;await m.button('export').click();assert.equal(m.blobCalls,1,'must not export without the approved bitmap');assert.match(m.el('status').textContent,/画像を作れません/);}finally{cleanup?.();m.restore();}
});

test('three requested art backgrounds retain IDs across save and draw into export',async()=>{
 for(const index of [8,9,10]){const m=mockEnvironment();let cleanup;try{cleanup=mountStudio(m.root);m.el('background').value=String(index);await m.el('background').fire('change');assert.equal(m.state().background,index);assert(validateStudioState(m.state()));await m.button('export').click();assert.equal(m.el('export-panel').hidden,false);assert(m.images.some(i=>i.src.includes('/studio-backgrounds/')));}finally{cleanup?.();m.restore();}}
});

test('music introduction precedes art-making and changing a track does not reset the composition',async()=>{
 const m=mockEnvironment();let cleanup;
 try{cleanup=mountStudio(m.root);const html=m.root.html;
  assert(!html.includes('音のアトリエ'));
  assert(html.indexOf('studio-music-intro')<html.indexOf('studio-steps'));
  assert.equal((html.match(/data-studio="music"/g)||[]).length,1);
  assert(html.includes('聴きながらつくってね'));assert(html.includes('音なしでもつくれます'));
  const before=JSON.stringify(m.state());m.el('music').value='2';await m.el('music').fire('change');
  assert.equal(JSON.stringify(m.state()),before);assert(m.el('audio-status').textContent.includes('再生を押すと始まります'));
 }finally{cleanup?.();m.restore();}
});
