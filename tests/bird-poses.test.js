import test from 'node:test';
import assert from 'node:assert/strict';
import { Window } from 'happy-dom';
import { validPoseAtlas,poseGeometry,birdPose,createPoseClock,refreshPoseSubtrees,POSE_ATLASES } from '../src/bird-poses.js';
const names=['left','right','back','preen','peck','tilt','stretch','rest'];
const atlas={asset:'white-poses.webp',width:1774,height:887,scale:1.5,poses:Object.fromEntries(names.map((p,i)=>[p,{crop:[i%4*440+(i%2?7:0),i<4?0:447,400,420],foot:[i%4*440+200,(i<4?0:447)+405]}]))};
const atlases={white:atlas,'juvenile-white':{...atlas,poses:Object.fromEntries(Object.entries(atlas.poses).filter(([p])=>!['tilt','stretch'].includes(p)))}};
const bird=(id,kind='rest',target=null)=>({id,color:'white',stage:'adult',home:'resident',action:{kind,target,startedTick:0}});

test('per-pose uneven crop geometry preserves shared anatomical scale, native aspect and absolute feet',()=>{
 assert(validPoseAtlas(atlas));
 for(const pose of names){const g=poseGeometry('white','adult',pose,atlases),[x,y,w,h]=g.crop;
  assert.equal(g.scale,1.5);assert.equal(g.pose,pose);
  assert.ok(Math.abs(g.imageLeft*850+g.footX*g.scale-459)<1e-8);
  assert.ok(Math.abs(g.imageTop*1000+g.footY*g.scale-975)<1e-8);
  assert.ok(Math.abs(g.window.left*850+(g.footX-x)*g.scale-459)<1e-8);
  assert.ok(Math.abs(g.window.top*1000+(g.footY-y)*g.scale-975)<1e-8);
  assert.ok(Math.abs(g.atlasImage.width*g.window.width*850-g.width*g.scale)<1e-8);
  assert.equal(g.window.width*850/(g.window.height*1000),w/h);
  assert(g.window.width>0&&g.window.height>0);
 }
 assert.notDeepEqual(poseGeometry('white','adult','left',atlases).crop,poseGeometry('white','adult','right',atlases).crop);
 assert.equal(poseGeometry('white','chick','left',atlases),null);
 assert.equal(poseGeometry('white','egg','left',atlases),null);
 for(const bad of [{...atlas,asset:'https://outside.test/a.webp'},{...atlas,scale:NaN},{...atlas,scale:-1},{...atlas,poses:{left:{crop:[0,0,2000,1],foot:[0,0]},right:atlas.poses.right}}])assert.equal(validPoseAtlas(bad),false);
});

test('staggered poses are deterministic, varied, action-driven and do not consume world RNG or mutate birds',()=>{
 const birds=Array.from({length:10},(_,i)=>bird('b'+i)),snapshot=JSON.stringify(birds),options={worldId:'world-1',birds,atlases};
 const initial=birds.map(b=>birdPose(b,options));assert(new Set(initial).size>=3);
 assert.deepEqual(birds.map(b=>birdPose(b,options)),initial);
 const later=birds.map(b=>birdPose(b,{...options,elapsed:8000}));assert.notDeepEqual(later,initial);
 const at500=birds.map(b=>birdPose(b,{...options,elapsed:500}));assert(at500.some((p,i)=>p===initial[i]),'not a synchronized all-bird loop');
 const food=new Set(Array.from({length:40},(_,i)=>birdPose(bird('hungry','eat'),{...options,elapsed:i*1000})));assert(food.has('peck'));assert([...food].every(p=>['left','right','peck'].includes(p)));
 const a=bird('a','play','b'),b=bird('b','play','a'),positions=new Map([['a',{x:.2}],['b',{x:.8}]]);
 assert.equal(birdPose(a,{...options,birds:[a,b],positions}),'right');assert.equal(birdPose(b,{...options,birds:[a,b],positions}),'left');
 for(let i=0;i<100;i++)assert(['left','right','back','preen','peck','rest'].includes(birdPose({...bird('young','explore'),stage:'juvenile'},{...options,elapsed:i*1000})));
 assert.equal(JSON.stringify(birds),snapshot);
});

test('presentation clock holds during pause, hidden or reduced motion and never catches up absence',()=>{
 let now=1000;const clock=createPoseClock(()=>now);
 assert.equal(clock.advance(true),0);now+=600;assert.equal(clock.advance(true),600);
 clock.hold();now+=86400000;assert.equal(clock.advance(false),600);now+=600;assert.equal(clock.advance(true),600);now+=600;assert.equal(clock.advance(true),1200);
 now-=50000;assert.equal(clock.advance(true),1200);now+=100000;assert.equal(clock.advance(true),3200);clock.reset();assert.equal(clock.elapsed,0);
});

test('pose refresh changes only decorative sprite subtrees, preserving button identity, care adornment, focus and drafts',async()=>{
 const window=new Window();try{const d=window.document,root=d.createElement('section');d.body.append(root);
 root.innerHTML='<button class="game-room-bird" data-bird-id="b1"><span class="game-sprite" data-pose="left"></span><span class="game-care-cheer">♪</span></button><form><input value="名前の途中"></form>';
 const button=root.querySelector('button'),input=root.querySelector('input'),cheer=root.querySelector('.game-care-cheer');input.focus();
 const render=(color,stage,pose)=>`<span class="game-sprite" data-pose="${pose}"><span class="game-pose-window"></span></span>`;
 assert.equal(refreshPoseSubtrees(root,[bird('b1')],()=> 'preen',render),1);
 assert.equal(root.querySelector('button'),button);assert.equal(root.querySelector('input'),input);assert.equal(d.activeElement,input);assert.equal(input.value,'名前の途中');assert.equal(root.querySelector('.game-care-cheer'),cheer);
 assert.equal(refreshPoseSubtrees(root,[bird('b1')],()=> 'preen',render),0);
 }finally{await window.happyDOM.close();}
});

test('every delivered pose atlas validates and its crop windows retain the shared foot plane',()=>{
 assert.equal(Object.keys(POSE_ATLASES).length,8,'all four adult and four juvenile atlases must be delivered');
 for(const [key,a] of Object.entries(POSE_ATLASES)){assert(validPoseAtlas(a),key);const juvenile=key.startsWith('juvenile-'),color=key.replace('juvenile-','');assert.equal(Object.keys(a.poses).length,juvenile?6:8);for(const p of Object.keys(a.poses)){const g=poseGeometry(color,juvenile?'juvenile':'adult',p),v=g.window;assert(Object.values(v).every(Number.isFinite)&&v.width>0&&v.height>0,`${key}/${p} invalid crop window`);assert.equal(g.scale,a.scale);}}
});


test('pose shifts retain the already-decoded atlas image instead of restarting downloads',async()=>{
 const window=new Window();try{const root=window.document.createElement('div');window.document.body.append(root);
 const markup=pose=>`<span class="game-sprite" data-asset="white-poses" data-pose="${pose}" data-foot-x="10" data-foot-y="20"><span class="game-pose-window" style="left:${pose==='left'?1:2}%"><img src="white-poses.webp" style="left:-25%"></span></span>`;
 root.innerHTML='<button class="game-room-bird" data-bird-id="b1">'+markup('left')+'</button>';const image=root.querySelector('img'),sprite=root.querySelector('.game-sprite');
 assert.equal(refreshPoseSubtrees(root,[bird('b1')],()=> 'right',(_c,_s,p)=>markup(p)),1);assert.equal(root.querySelector('img'),image);assert.equal(root.querySelector('.game-sprite'),sprite);assert.equal(sprite.dataset.pose,'right');assert.equal(root.querySelector('.game-pose-window').style.left,'2%');
 }finally{await window.happyDOM.close();}
});

test('six thousand varied resident pose windows stay inside the actual wide/tall habitat, without shrinking anatomical scale',async()=>{
 const {createWorld,createBird}=await import('../src/engine.js'),{habitatPositions}=await import('../src/habitat-layout.js');
 const kinds=['rest','eat','bath','explore','talk','play','nest','visit'];let tested=0;
 for(let seed=0;seed<30;seed++){const w=createWorld(1793611200000,seed);while(w.birds.length<10)createBird(w,{home:'resident'});
  w.birds.forEach((b,i)=>{b.action={kind:kinds[(i+seed)%8],target:null,startedTick:0};if((seed+i)%3===0)b.stage='juvenile';});
  for(const variant of ['wide','tall']){const positions=habitatPositions(w.birds,variant),aspect=variant==='wide'?1.6:.75;
   for(let elapsed=0;elapsed<50000;elapsed+=5000)for(const b of w.birds){const p=positions.get(b.id),pose=birdPose(b,{worldId:w.worldId,birds:w.birds,positions,elapsed}),g=poseGeometry(b.color,b.stage,pose),v=g.window,h=p.width/.85*aspect;
    const bounds=[p.x+(v.left-.54)*p.width,p.y+(v.top-.975)*h,p.x+(v.left+v.width-.54)*p.width,p.y+(v.top+v.height-.975)*h];
    assert(bounds[0]>=0&&bounds[1]>=0&&bounds[2]<=1&&bounds[3]<=1,`${seed}/${variant}/${b.id}/${pose}: ${bounds}`);tested++;
   }
  }
 }
 assert.equal(tested,6000);
});

test('singleton feeding, resting and bathing fit every adult/juvenile color and source direction without moving physical feet',async()=>{
 const {createWorld}=await import('../src/engine.js'),{habitatPositions,HABITAT_ANCHORS}=await import('../src/habitat-layout.js');let tested=0;
 for(const color of ['white','sakura','silver','cinnamon'])for(const stage of ['adult','juvenile'])for(const kind of ['eat','rest','bath'])for(const variant of ['wide','tall']){
  const w=createWorld(1793611200000),b=w.birds[0];Object.assign(b,{color,stage,action:{kind,target:null,startedTick:0}});
  const positions=habitatPositions(w.birds,variant),p=positions.get(b.id),anchor=HABITAT_ANCHORS[variant].find(a=>a.id===p.id),aspect=variant==='wide'?1.6:.75;
  assert.equal(p.x,anchor.x);assert.equal(p.y,anchor.y);
  const poses=new Set(Object.keys(POSE_ATLASES[stage==='adult'?color:'juvenile-'+color].poses));
  for(let elapsed=0;elapsed<60000;elapsed+=500)poses.add(birdPose(b,{worldId:w.worldId,birds:w.birds,positions,elapsed}));
  for(const pose of poses){const g=poseGeometry(color,stage,pose),v=g.window,h=p.width/.85*aspect,bounds=[p.x+(v.left-.54)*p.width,p.y+(v.top-.975)*h,p.x+(v.left+v.width-.54)*p.width,p.y+(v.top+v.height-.975)*h];
   assert(bounds[0]>=0&&bounds[1]>=0&&bounds[2]<=1&&bounds[3]<=1,`${color}/${stage}/${kind}/${variant}/${pose}: ${bounds}`);tested++;
  }
 }
 assert.equal(tested,336);
});
