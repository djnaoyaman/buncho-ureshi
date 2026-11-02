import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { HABITAT_ANCHORS, HABITAT_NEST, SPRITE_CONTACT, habitatPositions, spriteBounds } from '../src/habitat-layout.js';
import { habitatPositions as beforeSocial, HABITAT_ANCHORS as originalAnchors } from './fixtures/habitat-layout-before-social.js';

const fixture=JSON.parse(readFileSync(new URL('./fixtures/tick-261-residents.json',import.meta.url)));
const kinds=['rest','eat','bath','nest','play','talk','explore','visit'];
const population=(count,young,salt=0)=>Array.from({length:count},(_,i)=>({id:`b${i+1}`,home:'resident',stage:i<young?(i%2?'egg':'chick'):(i%3?'adult':'juvenile'),action:{kind:kinds[(i+salt)%8],target:null,startedTick:12}}));
const stable=map=>[...map].sort(([a],[b])=>a.localeCompare(b,'en',{numeric:true}));
const separation=(map,a,b,variant)=>{const p=map.get(a),q=map.get(b);return Math.hypot(p.x-q.x,(p.y-q.y)/(variant==='tall'?.75:1.6));};
function assertGeometry(birds,variant,width,context='') {
  const positions=habitatPositions(birds,variant),active=birds.filter(b=>b.home==='resident');
  assert.equal(positions.size,active.length,context);
  const rectangles=[...positions].map(([id,p])=>({id,...spriteBounds(p,variant,width)}));
  for(const bird of active){
    const p=positions.get(bird.id);
    if(['egg','chick'].includes(bird.stage)){
      assert.equal(p.interactive,false,context);assert.match(p.id,/^nest-/);
      const nest=HABITAT_NEST[variant];
      assert.ok(Math.abs(p.x-nest.x)<nest.width/2&&Math.abs(p.y-nest.y)<=nest.height/2,context);
    }else{
      assert.equal(p.interactive,true,context);
      const anchor=HABITAT_ANCHORS[variant].find(a=>a.id===p.id);assert.ok(anchor,context);
      assert.equal(p.x,anchor.x);assert.equal(p.y,anchor.y);assert.equal(p.depth,anchor.depth);
      const r=rectangles.find(r=>r.id===bird.id);assert.ok((r.right-r.left)*width>=46-1e-8,context);
    }
  }
  for(const r of rectangles)assert.ok(r.left>=0&&r.right<=1&&r.top>=0&&r.bottom<=1,`${context}: ${r.id} out of scene`);
  for(let i=0;i<rectangles.length;i++)for(let j=i+1;j<rectangles.length;j++){
    const a=rectangles[i],b=rectangles[j];
    assert.equal(Math.min(a.right,b.right)>Math.max(a.left,b.left)&&Math.min(a.bottom,b.bottom)>Math.max(a.top,b.top),false,`${context}: ${a.id}/${b.id} overlap`);
  }
  return positions;
}
function socialPopulation(count,young,mode) {
  const birds=population(count,young),mature=birds.filter(b=>!['egg','chick'].includes(b.stage));
  mature.forEach((b,i)=>{
    b.action.kind=mode===6?(Math.floor(i/2)%2?'bath':'play'):mode%2?'bath':'play';
    if(mature.length<2)return;
    let other;
    if(mode<2||mode===6)other=mature[i%2?i-1:i+1];
    else if(mode<4)other=mature[(i+1)%mature.length];
    else if(mode===4)other=mature[i===0?1:0];
    else if(mode===5)other=mature[i===mature.length-1?i-1:mature.length-1];
    else {other=mature[(i+1)%mature.length];b.action.startedTick=12-(i%2);}
    b.action.target=other?.id||null;
  });
  return birds;
}

// Only the reviewed singleton food enlargement changes in the pose release.
function expectedPriorLayout(birds,variant){
 const prior=beforeSocial(birds,variant);
 if(prior.size===1){const [id,p]=[...prior][0];if(p.zone==='eat'&&p.interactive)prior.set(id,{...p,width:Math.min(p.width,variant==='tall'?.21:.132)});}
 return prior;
}

test('all 3,120 original geometry cases preserve prior target-free layouts except reviewed singleton food clearance',()=>{
  assert.deepEqual(HABITAT_ANCHORS,originalAnchors);
  let cases=0;
  for(const variant of ['wide','tall'])for(const width of variant==='tall'?[284,339,375]:[568,732,960])for(let count=1;count<=10;count++)for(let young=0;young<=count;young++)for(let salt=0;salt<8;salt++){
    const birds=population(count,young,salt),context=`${variant}/${width}/${count}/${young}/${salt}`;
    const positions=assertGeometry(birds,variant,width,context);
    assert.deepEqual(stable(positions),stable(expectedPriorLayout(birds,variant)),context);cases++;
  }
  assert.equal(cases,3120);
});

test('3,120 additional social-chain/pair populations preserve real anchors, nest-only young and no overlap',()=>{
  let cases=0;
  for(const variant of ['wide','tall'])for(const width of variant==='tall'?[284,339,375]:[568,732,960])for(let count=1;count<=10;count++)for(let young=0;young<=count;young++)for(let mode=0;mode<8;mode++){
    const birds=socialPopulation(count,young,mode),context=`social ${variant}/${width}/${count}/${young}/${mode}`;
    const snapshot=structuredClone(birds),positions=assertGeometry(birds,variant,width,context);
    assert.deepEqual(birds,snapshot,'layout must not mutate simulation state');
    assert.deepEqual(stable(positions),stable(habitatPositions([...birds].reverse(),variant)),context);cases++;
  }
  assert.equal(cases,3120);
});

test('real seed 842911 tick 261 bath encounter stays nearby instead of opposite corners',()=>{
  assert.equal(fixture.seed,842911);assert.equal(fixture.tick,261);
  const birds=fixture.birds,a=birds.find(b=>b.id==='b7'),b=birds.find(b=>b.id==='b11');
  assert.equal(a.action.target,b.id);assert.equal(b.action.target,a.id);
  assert.equal(a.action.kind,'bath');assert.equal(b.action.kind,'bath');
  assert.equal(a.action.startedTick,261);assert.equal(b.action.startedTick,261);
  assert.ok(separation(beforeSocial(birds,'tall'),'b7','b11','tall')>1);
  for(const variant of ['wide','tall']){
    const positions=assertGeometry(birds,variant,variant==='tall'?284:568,'tick 261');
    for(const [a,b] of [['b2','b10'],['b4','b6'],['b7','b11']])assert.ok(separation(positions,a,b,variant)<.35,`${variant}: ${a}/${b} not nearby`);
    assert.match(positions.get('b12').id,/^nest-/);
    const cleared=structuredClone(birds);cleared.forEach(b=>{b.action.target=null;});
    assert.notDeepEqual(stable(positions),stable(habitatPositions(cleared,variant)),'target IDs must affect physical placement');
  }
});

test('five simultaneous reciprocal pairs remain neighbors, including the final assigned pair',()=>{
  for(const variant of ['wide','tall'])for(const mode of [0,1,6]){
    const birds=socialPopulation(10,0,mode),positions=assertGeometry(birds,variant,variant==='tall'?284:568,'five pairs');
    for(let i=0;i<10;i+=2)assert.ok(separation(positions,birds[i].id,birds[i+1].id,variant)<.35,`${variant} pair ${i/2+1}`);
    for(let shift=1;shift<10;shift++)assert.deepEqual(stable(positions),stable(habitatPositions([...birds.slice(shift),...birds.slice(0,shift)],variant)));
  }
});

test('reciprocal encounters override competing one-way chains; conflicts resolve by stable IDs',()=>{
  for(const variant of ['wide','tall']){
    const birds=population(3,0);birds.forEach(b=>{b.action.kind='play';});
    birds[0].action.target='b2';birds[1].action.target='b3';birds[2].action.target=null;
    const oneWay=habitatPositions(birds,variant),onlyFirst=structuredClone(birds);onlyFirst[1].action.target=null;
    assert.deepEqual(stable(oneWay),stable(habitatPositions(onlyFirst,variant)),'stable b1/b2 wins one-way conflict');
    assert.ok(separation(oneWay,'b1','b2',variant)<.35);
    birds[2].action.target='b2';
    const mutual=habitatPositions(birds,variant),onlyMutual=structuredClone(birds);onlyMutual[0].action.target=null;
    assert.deepEqual(stable(mutual),stable(habitatPositions(onlyMutual,variant)),'reciprocal b2/b3 wins over b1 invitation');
    assert.ok(separation(mutual,'b2','b3',variant)<.35);
    assert.deepEqual(stable(mutual),stable(habitatPositions([...birds].reverse(),variant)));
  }
});

test('missing, absent, young, stale, declined and incompatible targets do not pull a bird into an encounter',()=>{
  const cases=[
    b=>{b[0].action.target='missing';},
    b=>{b[1].home='visitor';},b=>{b[1].home='departed';},
    b=>{b[1].stage='egg';},b=>{b[1].stage='chick';},
    ...['rest','eat','nest','explore','visit','talk'].map(kind=>b=>{b[1].action.kind=kind;}),
    b=>{b[0].action.kind=b[1].action.kind='talk';},
    b=>{b[1].action.startedTick=11;},b=>{delete b[0].action.startedTick;},
    b=>{b[0].action.startedTick=NaN;},b=>{b[0].action.startedTick=b[1].action.startedTick=-1;},
    b=>{b[0].action.target='b1';},
  ];
  for(const variant of ['wide','tall'])for(const alter of cases){
    const birds=population(4,0);birds.forEach(b=>{b.action.kind='play';});birds[0].action.target='b2';
    alter(birds);const cleared=structuredClone(birds);cleared.forEach(b=>{b.action.target=null;});
    assert.deepEqual(stable(habitatPositions(birds,variant)),stable(habitatPositions(cleared,variant)));
  }
});

test('solo food/bath/root foot anchors and 46px safety remain, with bounded single-food width',()=>{
  for(const variant of ['wide','tall'])for(const kind of ['rest','play','eat','bath']){
    const bird=population(1,0)[0];bird.action.kind=kind;bird.action.target='missing';
    const positions=habitatPositions([bird],variant),p=positions.get(bird.id);
    assert.equal(p.id,kind==='eat'?'food-ground':kind==='bath'?'bath-back-rim':'root-center');
    assert.deepEqual(stable(positions),stable(expectedPriorLayout([bird],variant)));
  }
  const p={x:.5,y:.5,width:.01,interactive:true},bounds=spriteBounds(p,'tall',284);
  assert.ok(Math.abs((bounds.right-bounds.left)*284-46)<1e-8);
  assert.ok(Math.abs((bounds.bottom-bounds.top)*(284/.75)-46/SPRITE_CONTACT.aspect)<1e-8);
});
