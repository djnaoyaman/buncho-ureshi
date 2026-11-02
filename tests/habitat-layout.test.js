import test from 'node:test';
import assert from 'node:assert/strict';
import { HABITAT_ANCHORS, HABITAT_NEST, habitatPositions, spriteBounds } from '../src/habitat-layout.js';
import { gameBirdSvg, gameSpriteGeometry, GAME_SPRITE_ASSETS } from '../src/game.js';
import { Window } from 'happy-dom';

const kinds=['rest','eat','bath','nest','play','talk','explore','visit'];
const population=(count,young,salt=0)=>Array.from({length:count},(_,i)=>({id:`b${i+1}`,home:'resident',stage:i<young?(i%2?'egg':'chick'):(i%3?'adult':'juvenile'),action:{kind:kinds[(i+salt)%8]}}));

test('all 3,120 bounded habitat populations fit, with no intersecting bird rectangles at actual minimum tap sizes',()=>{
  let cases=0;
  for(const variant of ['wide','tall']) for(const width of variant==='tall'?[284,339,375]:[568,732,960]) for(let count=1;count<=10;count++) for(let young=0;young<=count;young++) for(let salt=0;salt<8;salt++){
    const birds=population(count,young,salt),positions=habitatPositions(birds,variant);
    assert.equal(positions.size,count);
    const rectangles=[...positions].map(([id,p])=>({id,...spriteBounds(p,variant,width)}));
    const context=`${variant} ${width}px, ${count} residents/${young} nestlings, action offset ${salt}`;
    for(const r of rectangles)assert.ok(r.left>=0&&r.right<=1&&r.top>=0&&r.bottom<=1,`${context}: ${r.id} out of scene`);
    for(let a=0;a<rectangles.length;a++)for(let b=a+1;b<rectangles.length;b++){
      const r=rectangles[a],s=rectangles[b];
      const overlap=Math.min(r.right,s.right)>Math.max(r.left,s.left)&&Math.min(r.bottom,s.bottom)>Math.max(r.top,s.top);
      assert.equal(overlap,false,`${context}: ${r.id} overlaps ${s.id}`);
    }
    cases++;
  }
  assert.equal(cases,3120);
});

test('physical anchor allocation is deterministic by immutable ID, excludes visitors and reserves the actual right nest',()=>{
  for(const variant of ['wide','tall']){
    assert.equal(HABITAT_ANCHORS[variant].length,10);
    assert.ok(HABITAT_NEST[variant].x>.8);
    const birds=population(10,3);
    const stable=map=>[...map].sort(([a],[b])=>a.localeCompare(b));
    assert.deepEqual(stable(habitatPositions(birds,variant)),stable(habitatPositions([...birds].reverse(),variant)));
    const positions=habitatPositions([...birds,{...birds[0],id:'visitor',home:'visitor'}],variant);
    assert.equal(positions.has('visitor'),false);
    for(const bird of birds){const p=positions.get(bird.id);assert.equal(p.interactive,!['egg','chick'].includes(bird.stage));if(!p.interactive)assert.match(p.id,/^nest-/);}
  }
});

test('opening bird remains prominent but can still visit its food and bath',()=>{
  for(const variant of ['wide','tall']) for(const kind of ['rest','eat','bath']){
    const b={id:'b1',home:'resident',stage:'adult',action:{kind}},p=habitatPositions([b],variant).get('b1');
    assert.equal(p.id,kind==='rest'?'root-center':kind==='eat'?'food-ground':'bath-back-rim');
    assert.ok(p.width>(kind==='eat'?(variant==='tall'?.20:.13):(variant==='tall'?.23:.15)));
    if(kind==='eat')assert.ok(p.width<=(variant==='tall'?.21:.132),'singleton feeding tail clearance');
  }
});

test('photo sprite API uses only local whitelisted stage assets, with no fake SVG anatomy or raw photo',async()=>{
  const window=new Window();
  try{
    for(const color of ['white','sakura','cinnamon','silver'])for(const stage of ['egg','chick','juvenile','adult']){
      const root=window.document.createElement('div');root.innerHTML=gameBirdSvg(color,stage);
      const sprite=root.firstElementChild,img=sprite.querySelector('img');
      assert.equal(root.children.length,1);assert.equal(sprite.tagName,'SPAN');
      assert.equal(sprite.dataset.stage,stage);assert.equal(sprite.dataset.color,color);
      assert.equal(sprite.getAttribute('aria-hidden'),'true');assert.equal(img.getAttribute('alt'),'');
      const expected=stage==='adult'?`${color}-poses`:stage==='juvenile'?`juvenile-${color}-poses`:stage;
      assert.ok(img.src.endsWith(`/game-art/${expected}.${stage==='egg'?'svg':'webp'}`));
      const geometry=gameSpriteGeometry(color,stage);
      assert.equal(geometry.asset,expected);
      assert.equal(Number(img.getAttribute('width')),stage==='adult'?1774:stage==='juvenile'?1536:GAME_SPRITE_ASSETS[expected].width);
      assert.equal(Number(img.getAttribute('height')),stage==='adult'?887:stage==='juvenile'?1024:GAME_SPRITE_ASSETS[expected].height);
      assert.ok(Math.abs((geometry.imageLeft*850+geometry.footX*geometry.scale)-459)<.0001);
      assert.ok(Math.abs((geometry.imageTop*1000+geometry.footY*geometry.scale)-975)<.0001);
      assert.equal(root.querySelectorAll('svg,script,[data-part],[onload],[onclick]').length,0);
      assert.doesNotMatch(root.innerHTML,/IMG_|generated_images|NaN|undefined/);
    }
    assert.equal(gameBirdSvg('bad" onload="evil','bad'),gameBirdSvg('white','adult'));
  }finally{await window.happyDOM.close();}
});
