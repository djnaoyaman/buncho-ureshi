import {gardenById,gardenStageGeometry} from './data/gardens.js';
// Original-art coordinates: hanging knot / standing foot. Never persisted to a save.
const feet=[.54,.55,.54,.53,.58,.56,.57,.59,.59,.60,.55,.57,.59,.57,.59,.69,.57,.63,.60,.57,.58,.58,.56,.64,.61,.61,.65,.59,.60,.59,.58,.62,.64,.60,.61];
export const BOOKMARK_PLACEMENTS=Object.freeze(feet.map((y,i)=>Object.freeze({number:i+1,x:i===15?.13:.14,y,hang:i===2?{x:.20,y:.22}:i===21?{x:.22,y:.20}:null})));
export function bookmarkPlacement(gardenId){const src=gardenById(gardenId)?.background?.src||'';const n=Number(src.match(/bird-garden-(\d+)/)?.[1]);return BOOKMARK_PLACEMENTS[n-1]||null;}
const overlaps=(a,b)=>a.left<b.right+8&&a.right>b.left-8&&a.top<b.bottom+8&&a.bottom>b.top-8;
/** Terrain-attached, collision-checked layout. Null deliberately leaves the diary as the safe viewing place. */
export function planGardenBookmark({gardenId,width,height,obstacles=[]}){
 const p=bookmarkPlacement(gardenId),g=gardenStageGeometry(gardenId,width,height);if(!p||!g)return null;
 const w=Math.min(36,Math.max(22,width*.065)),h=w*3.7;
 const map=(x,y)=>({x:g.offsetX+x*g.drawWidth,y:g.offsetY+y*g.drawHeight});
 const attempt=(mode,x,y)=>{const a=map(x,y),top=mode==='hanging'?a.y:a.y-h;
 const rect={left:a.x-w/2,right:a.x+w/2,top,bottom:top+h};
 if(rect.left<8||rect.right>width-8||rect.top<8||rect.bottom>height-8||obstacles.some(o=>overlaps(rect,o)))return null;
 return {mode,left:rect.left,top,width:w,height:h,source:{x,y},rect};};
 // Tall art only: a cropped branch must never turn into a floating ribbon.
 if(p.hang&&height/width>1.25){const a=attempt('hanging',p.hang.x,p.hang.y);if(a)return a;}
 // Begin with the surveyed contact point, then a visible left-edge point on the same ground.
 const sourceX=screenX=>(screenX-g.offsetX)/g.drawWidth;
 // Preserve the surveyed ground row when birds occupy the usual 12% lane.
 // The last candidate has exactly 8px breathing room from the visible edge.
 const leftLanes=[sourceX(width*.12),sourceX(width*.08),sourceX(8+w/2)];
 // Wide crops may remove the surveyed distant ground entirely. The existing
 // bird-foot anchor is an art-authored terrain contact point, not an arbitrary
 // screen height. Use that ground row only as a landscape fallback.
 const terrainY=(g.friends[g.selectedIndex].y-g.offsetY)/g.drawHeight;
 const rows=[p.y,p.y+.04,p.y+.08,...(width>=height?[terrainY]:[])];
 for(const y of rows)for(const x of [p.x,...leftLanes]){
  if(x<.04||x>.30||y>.82)continue;const a=attempt('standing',x,y);if(a)return a;
 }
 // A crowded narrow screen may use the opposite edge, but only on the same
 // surveyed/terrain-contact rows. UI and birds remain hard obstacles.
 const rightLanes=[sourceX(width*.92),sourceX(width-8-w/2)];
 for(const y of rows)for(const x of rightLanes){
  if(x<.70||x>.98||y>.82)continue;const a=attempt('standing',x,y);if(a)return a;
 }
 return null;
}
export function syncGardenKeepsakeLayout(root){
 for(const stage of root.querySelectorAll('.finch-garden-stage')){
  const item=stage.querySelector('[data-garden-bookmark]');if(!item)continue;
  const sr=stage.getBoundingClientRect(),garden=stage.closest('.finch-garden')||stage;
  const selectors='.finch-garden-friend,.finch-garden-household,.finch-garden-visitor,.finch-crow-scale-scene,.finch-raptor-scale-scene,.finch-friend-name,.finch-garden-selector-wrap,.finch-garden-dock,.leaf-gift>summary,.expedition-gift>summary,.finch-garden>header';
  const obstacles=[...garden.querySelectorAll(selectors)].filter(el=>el.getClientRects().length).map(el=>{const r=el.getBoundingClientRect();return {left:r.left-sr.left,right:r.right-sr.left,top:r.top-sr.top,bottom:r.bottom-sr.top};});
  const p=planGardenBookmark({gardenId:stage.dataset.gardenId,width:sr.width,height:sr.height,obstacles});
  item.hidden=!p;if(!p)continue;
  item.dataset.bookmarkMount=p.mode;
  Object.assign(item.style,{left:`${p.left}px`,top:`${p.top}px`,width:`${p.width}px`,height:`${p.height}px`});
 }
}
