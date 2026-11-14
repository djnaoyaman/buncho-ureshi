import test from 'node:test';
import assert from 'node:assert/strict';
import {GARDENS,gardenStageGeometry} from '../src/data/gardens.js';
import {BOOKMARK_PLACEMENTS,bookmarkPlacement,planGardenBookmark} from '../src/garden-keepsake-layout.js';
import {renderLeafKeepsake} from '../src/garden-leaf-event-ui.js';
test('all 35 real garden backgrounds have surveyed original-art contact points',()=>{
 assert.equal(BOOKMARK_PLACEMENTS.length,35);
 for(const g of GARDENS){const p=bookmarkPlacement(g.id);assert.ok(p);assert.ok(p.x>0&&p.x<.3);assert.ok(p.y>.5&&p.y<.8);}
});
test('portrait source knot uses the same cover offsets as the birds',()=>{
 const width=390,height=740,p=planGardenBookmark({gardenId:'komorebi',width,height}),g=gardenStageGeometry('komorebi',width,height);
 assert.equal(p.mode,'hanging');assert.equal(p.left+p.width/2,g.offsetX+.20*g.drawWidth);assert.equal(p.top,g.offsetY+.22*g.drawHeight);
});
test('blocked knot falls back to a standing keepsake; complete obstruction hides safely',()=>{
 const args={gardenId:'komorebi',width:390,height:740};const first=planGardenBookmark(args);
 assert.equal(planGardenBookmark({...args,obstacles:[first.rect]}).mode,'standing');
 assert.equal(planGardenBookmark({...args,obstacles:[{left:0,top:0,right:390,bottom:740}]}),null);
});
test('all viewports return a bounded object or safe absence; landscape never floats from missing branch',()=>{
 for(const garden of GARDENS)for(const [width,height] of [[320,568],[375,667],[390,740],[667,375],[1024,768]]){
  const p=planGardenBookmark({gardenId:garden.id,width,height});if(!p)continue;
  assert.ok(p.rect.left>=8&&p.rect.right<=width-8&&p.rect.top>=8&&p.rect.bottom<=height-8);
  if(width>height)assert.equal(p.mode,'standing');
 }
});
test('display is render-only, labelled accessibly, asset-based, and only in its saved garden',()=>{
 const w={leafEvent:{entry:{displayed:true,gardenId:'komorebi'}},encounters:{garden:{id:'komorebi'}}},before=JSON.stringify(w);
 const html=renderLeafKeepsake(w,{base:'/preview/'});assert.match(html,/pressed-leaf.webp/);assert.match(html,/aria-label="おもいでの はっぱの しおり"/);assert.match(html,/hidden/);assert.doesNotMatch(html,/<span>おもいで/);assert.match(html,/src="\/preview\/game-art/);assert.equal(JSON.stringify(w),before);
 w.encounters.garden.id='mizukagami';assert.equal(renderLeafKeepsake(w),'');
});

test('375px portrait keeps all gardens visible beside a crowded left bird lane without raising the ground',()=>{
 for(const garden of GARDENS){
  const width=375,height=667,obstacles=[{left:54,top:0,right:375,bottom:667}];
  const p=planGardenBookmark({gardenId:garden.id,width,height,obstacles});
  assert.ok(p,`${garden.id}: narrow safe lane remains available`);
  assert.ok(p.rect.right+8<=54,`${garden.id}: 8px bird separation`);
  assert.ok(p.rect.left>=8);
  assert.equal(p.source.y,bookmarkPlacement(garden.id).y,'same surveyed contact row, not floating higher');
 }
});
