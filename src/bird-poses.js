import { POSE_ATLASES } from './data/pose-atlases.js';
export { POSE_ATLASES };
export const POSE_NAMES=Object.freeze(['left','right','back','preen','peck','tilt','stretch','rest']);
const colors=new Set(['white','sakura','cinnamon','silver']);
const finite=(v)=>Number.isFinite(v);
export function validPoseAtlas(atlas){
 if(!atlas||!/^[-a-z0-9]+\.webp$/.test(atlas.asset)||![atlas.width,atlas.height,atlas.scale].every(v=>finite(v)&&v>0)||atlas.width>8192||atlas.height>8192||atlas.scale>10||!atlas.poses||!atlas.poses.left||!atlas.poses.right)return false;
 return Object.entries(atlas.poses).every(([name,p])=>POSE_NAMES.includes(name)&&Array.isArray(p.crop)&&p.crop.length===4&&p.crop.every(finite)&&Array.isArray(p.foot)&&p.foot.length===2&&p.foot.every(finite)&&p.crop[0]>=0&&p.crop[1]>=0&&p.crop[2]>0&&p.crop[3]>0&&p.crop[0]+p.crop[2]<=atlas.width&&p.crop[1]+p.crop[3]<=atlas.height&&p.foot[0]>=p.crop[0]&&p.foot[0]<=p.crop[0]+p.crop[2]&&p.foot[1]>=p.crop[1]&&p.foot[1]<=p.crop[1]+p.crop[3]&&(p.clip===undefined||Array.isArray(p.clip)&&p.clip.length>=3&&p.clip.length<=256&&p.clip.every(point=>Array.isArray(point)&&point.length===2&&point.every(n=>finite(n)&&n>=0&&n<=100))));
}
export function poseAtlas(color='white',stage='adult',atlases=POSE_ATLASES){
 const safeColor=colors.has(color)?color:'white';
 if(!['adult','juvenile'].includes(stage))return null;
 const atlas=atlases[stage==='juvenile'?`juvenile-${safeColor}`:safeColor];
 return validPoseAtlas(atlas)?atlas:null;
}
/** All native frames share one atlas scale. Crop bounds are independent and feet
 * use absolute atlas pixels; neither direction is produced by mirroring. */
export function poseGeometry(color='white',stage='adult',pose='left',atlases=POSE_ATLASES){
 const atlas=poseAtlas(color,stage,atlases);if(!atlas)return null;
 const name=Object.hasOwn(atlas.poses,pose)?pose:'left',frame=atlas.poses[name];
 const [x,y,w,h]=frame.crop,[footX,footY]=frame.foot,s=atlas.scale;
 return {color:colors.has(color)?color:'white',stage,pose:name,asset:atlas.asset.replace(/\.webp$/,''),extension:'webp',width:atlas.width,height:atlas.height,scale:s,footX,footY,crop:[x,y,w,h],clip:frame.clip,
  imageWidth:atlas.width*s/850,imageLeft:(459-footX*s)/850,imageTop:(975-footY*s)/1000,
  window:{left:(459-(footX-x)*s)/850,top:(975-(footY-y)*s)/1000,width:w*s/850,height:h*s/1000},
  atlasImage:{left:-x/w,top:-y/h,width:atlas.width/w}};
}
export function presentationSeed(value){let h=2166136261;for(const char of String(value)){h^=char.charCodeAt(0);h=Math.imul(h,16777619);}return h>>>0;}
/** Pure presentation choice: no random(), world writes, care changes or persistence. */
export function birdPose(bird,{worldId='',elapsed=0,positions=new Map(),birds=[],atlases=POSE_ATLASES}={}){
 const atlas=poseAtlas(bird?.color,bird?.stage,atlases);if(!atlas)return 'left';
 const seed=presentationSeed(worldId+':'+bird.id),kind=bird.action?.kind||'rest';
 const self=positions.get(bird.id),other=birds.find(b=>b.id===bird.action?.target&&b.home==='resident'&&['adult','juvenile'].includes(b.stage)),target=other&&positions.get(other.id);
 const toward=self&&target?(target.x<self.x?'left':'right'):(seed%2?'left':'right');
 if(target&&['play','talk','bath'].includes(kind))return toward;
 // Long, staggered quiet holds. Short stretches are a single genuine pose,
 // never a continuous flap loop or a whole-image wobble.
 const hold=6200+seed%3900,phase=(Math.max(0,Number.isFinite(elapsed)?elapsed:0)+seed%31000),slot=Math.floor(phase/hold);
 const available=p=>Object.hasOwn(atlas.poses,p)?p:toward;
 const sequences={eat:['peck','peck',toward,'peck'],rest:[toward,'preen','back','rest',toward,'rest'],nest:['rest','back','preen',toward],bath:['preen',toward,'back'],explore:[toward,'back','tilt',toward,'stretch'],visit:[toward,'back','tilt'],talk:[toward,'tilt','preen'],play:[toward,'tilt','back']};
 const sequence=sequences[kind]||sequences.rest;
 const selected=sequence[(slot+(seed>>>8))%sequence.length];
 // A wing stretch is a brief end-of-hold gesture, not a prolonged frozen flap.
 const stretchSafe=self&&self.x>.25&&self.x<.75&&self.y>.2&&self.y<.85;
 return available(selected==='stretch'&&(!stretchSafe||phase%hold<hold-1700)?toward:selected);
}
/** Elapsed active presentation time. Paused/hidden/reduced-motion intervals are
 * discarded, not caught up. Clock discontinuities cannot jump poses. */
export function createPoseClock(now=()=>globalThis.performance?.now?.()??Date.now()){
 let last=now(),elapsed=0,active=false;
 return {get elapsed(){return elapsed;},advance(enabled){const time=now(),delta=time-last;last=time;if(enabled&&active&&finite(delta)&&delta>=0)elapsed+=Math.min(delta,2000);active=!!enabled;return elapsed;},hold(){last=now();active=false;},reset(){last=now();elapsed=0;active=false;}};
}
/** Decorative-only update; never replace a resident button or any form. */
export function refreshPoseSubtrees(root,birds,choose,render){
 let changed=0;const byId=new Map(birds.map(b=>[b.id,b]));
 for(const node of root.querySelectorAll('.game-room-bird')){
  const bird=byId.get(node.dataset.birdId),sprite=node.querySelector('.game-sprite');
  if(!bird||!sprite||!['adult','juvenile'].includes(bird.stage))continue;
  const pose=choose(bird);if(sprite.dataset.pose===pose)continue;
  const template=root.ownerDocument.createElement('template');template.innerHTML=render(bird.color,bird.stage,pose);
  const next=template.content.firstElementChild;
  if(next?.classList.contains('game-sprite')){
   const window=sprite.querySelector('.game-pose-window'),nextWindow=next.querySelector('.game-pose-window'),image=window?.querySelector('img'),nextImage=nextWindow?.querySelector('img');
   if(window&&nextWindow&&image&&nextImage&&image.getAttribute('src')===nextImage.getAttribute('src')){
    // Keep the already-decoded atlas node. Only its clip and presentation offsets change.
    window.setAttribute('style',nextWindow.getAttribute('style')||'');image.setAttribute('style',nextImage.getAttribute('style')||'');
    for(const key of ['pose','footX','footY'])sprite.dataset[key]=next.dataset[key];
   }else sprite.replaceWith(next);
   changed++;
  }
 }
 return changed;
}
