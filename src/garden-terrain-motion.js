import { terrainFor, terrainLayout, terrainPlan, terrainFrame, TERRAIN_PERIOD, inside } from './garden-terrain-plan.js';

const reset = 'display:block;position:absolute;margin:0;padding:0;border:0;border-radius:0;background:none;box-shadow:none;pointer-events:none;max-width:none;transform:none;';
const selector = ':scope > .finch-garden-friend,:scope > .finch-garden-household,:scope > .finch-garden-visitor';
/** Presentation state only. Owned styles are restored on exit; native button,
 * image, label, handlers and focus are never replaced. */
export function createGardenTerrainMotion(root) {
  let stage = null, planeNode = null, roster = [], layout = null, plan = null, cycle = -1, signature = '', key = '', geometry = null, routeClockStart = null, flightWait = 0;
  const owned = new Map(), decorations = new Set();
  const decoded = new Map();
  const set = (node, property, value) => {
    if (!owned.has(node)) owned.set(node, new Map());
    if (!owned.get(node).has(property)) owned.get(node).set(property, node.style.getPropertyValue(property));
    if(node.style.getPropertyValue(property)!==value)node.style.setProperty(property, value);
  };
  const restore = () => {
    for (const [node, props] of owned) for (const [property, value] of props) value ? node.style.setProperty(property, value) : node.style.removeProperty(property);
    for (const node of owned.keys()) node.removeAttribute('data-terrain-flight-active');
    owned.clear(); for (const node of decorations) node.remove(); decorations.clear();
  };
  const rect = node => { const r = node.getBoundingClientRect(); return { left:r.left, top:r.top, right:r.right, bottom:r.bottom, width:r.width, height:r.height }; };
  const wing = (actor, frame) => {
    const sprite = actor.node.querySelector('.garden-bird-sprite'), pose = sprite?.querySelector('.garden-bird-pose-window');
    if (!sprite || !pose) return;
    let parts = sprite.querySelector('.garden-terrain-flight');
    if (frame?.wing && !parts) {
      parts = root.ownerDocument.createElement('span'); parts.className = 'garden-terrain-flight'; parts.setAttribute('aria-hidden','true');
      parts.style.cssText = reset + 'left:-26.470588%;top:-8%;width:152.941176%;height:120%;transform-origin:52.615385% 87.916667%;';
      const atlas = pose.querySelector('img');
      const base = new URL('garden-flight/', atlas.src);
      for (const [name, x, y] of [['far',177.6,124],['body',136.8,211],['near',130,126],['feet',136.8,185]]) {
        const url=new URL('white-'+name+'.webp',base).href;
        if(!decoded.has(url)){
          const image=new root.ownerDocument.defaultView.Image();decoded.set(url,{image,ready:false});
          image.onload=()=>{image.decode().then(()=>{decoded.get(url).ready=true;},()=>{});};image.src=url;
        }
        const part = root.ownerDocument.createElement('span'); part.dataset.flightPart=name;part.dataset.flightSource=url;
        part.style.cssText=reset+`left:0;top:0;width:100%;height:100%;background-image:url("${url}");background-size:100% 100%;transform-origin:${x/2.6}% ${y/2.4}%;`;
        parts.append(part);
      }
      sprite.append(parts); decorations.add(parts);
    }
    // Keep the already decoded native pose visible if any auxiliary image fails.
    const ready = parts && [...parts.children].every(i=>decoded.get(i.dataset.flightSource)?.ready);
    set(pose,'visibility',frame?.wing && ready ? 'hidden' : 'visible');
    pose.toggleAttribute('data-terrain-flight-active',!!(frame?.wing&&ready));
    if (!parts) return;
    parts.style.visibility=frame?.wing && ready?'visible':'hidden';
    if (!frame?.wing) return;
    const flap=Math.cos((frame.phase*4.25+.18)*Math.PI*2);
    parts.style.transform=frame.pose==='left'?'scaleX(-1)':'none';
    parts.querySelector('[data-flight-part=near]').style.transform=`rotate(${5+49*flap}deg) scaleY(${.74+.2*Math.abs(flap)})`;
    parts.querySelector('[data-flight-part=far]').style.transform=`rotate(${-7-44*flap}deg) scaleY(${.74+.2*Math.abs(flap)})`;
  };
  const initialize = (nextStage, nodes, nextGeometry, nextKey) => {
    const previous = key === nextKey ? layout : null;
    restore(); stage=nextStage; planeNode=stage.querySelector('.finch-garden-image-plane'); geometry=nextGeometry; key=nextKey;
    const { plane, clip, obstacles }=geometry;
    roster=nodes.map((node,i)=>{
      const r=rect(node),sprite=node.querySelector('.garden-bird-sprite'),label=node.querySelector('.finch-friend-name')||node.lastElementChild,l=label?rect(label):null;
      return {node,id:sprite?.dataset.gardenBirdId||'visitor:'+i,width:r.width,height:r.height,labelWidth:l?.width||0,labelHeight:l?.height||0,
        point:[(r.left+r.width*.54-plane.left)/plane.width,(r.top+r.height*.975-plane.top)/plane.height],
        movable:!!sprite,flight:node.dataset.gardenFlight==='white-adult'};
    });
    const retained=previous&&terrainFor(stage.dataset.gardenId).graph&&previous.length===roster.length&&previous.every(a=>roster.some(b=>a.id===b.id&&b.labelWidth<=a.labelWidth&&b.labelHeight<=a.labelHeight))
      ? roster.map(a=>{const before=previous.find(b=>b.id===a.id);return {...a,width:before.width,height:before.height,point:before.point,surface:before.surface};}) : null;
    layout=retained||terrainLayout(stage.dataset.gardenId,roster,plane,clip,obstacles);
    // Routine saved-world redraws do not restart a route or reshuffle birds.
    if (previous && layout && previous.every(a=>layout.some(b=>b.id===a.id))) {
      layout=layout.map(a=>{const before=previous.find(b=>b.id===a.id);return {...a,point:before.point,surface:before.surface,width:before.width,height:before.height};});
    } else {plan=null;cycle=-1;routeClockStart=null;flightWait=0;}
    if (!layout) {stage.dataset.terrainMotion='static';return;}
    stage.dataset.terrainMotion='grounded';
    const terrain=terrainFor(stage.dataset.gardenId);
    if (terrain.mask) {
      const source=planeNode.querySelector('.finch-garden-background'),mask=root.ownerDocument.createElement('span');
      mask.className='garden-terrain-mask';mask.setAttribute('aria-hidden','true');
      mask.style.cssText=reset+`inset:0;width:100%;height:100%;background-image:url("${source.src}");background-size:100% 100%;z-index:${Math.round(terrain.maskLayer*1000)};clip-path:polygon(${terrain.mask.map(p=>p.map(n=>n*100+'%').join(' ')).join(',')});`;
      planeNode.append(mask);decorations.add(mask);
    }
    for(const a of layout){
      set(a.node,'width',a.width+'px');set(a.node,'height',a.height+'px');
      const shadow=root.ownerDocument.createElement('span');shadow.className='garden-terrain-shadow';shadow.setAttribute('aria-hidden','true');
      shadow.style.cssText=reset+`left:28%;top:94%;width:54%;height:8%;border-radius:50%;background:rgba(40,36,27,${terrain.light[2]});z-index:-1;`;
      a.node.append(shadow);decorations.add(shadow);
    }
  };
  return {
    step(elapsed, active, overrides) {
      const nextStage=root.querySelector('.finch-garden-stage'),terrain=terrainFor(nextStage?.dataset.gardenId);
      if (!terrain) {restore();stage=null;layout=null;key='';return false;}
      const plane=nextStage.querySelector('.finch-garden-image-plane'),slide=nextStage.querySelector('.finch-garden-slide');
      if (!plane || !slide) return false;
      const nodes=[...plane.querySelectorAll(selector)],p=rect(plane),s=rect(slide),r=rect(nextStage);
      const clip={left:Math.max(s.left,r.left),top:Math.max(s.top,r.top),right:Math.min(s.right,r.right),bottom:Math.min(s.bottom,r.bottom)};
      const obstacles=[...root.querySelectorAll('.finch-garden > header,.finch-garden-selector-wrap,.finch-garden-dock,.finch-garden-family')].map(rect);
      const garden=root.matches('.finch-garden')?root:root.querySelector('.finch-garden');
      const nextKey=JSON.stringify([garden?.dataset.gardenWorld,nextStage.dataset.gardenId,nodes.map(n=>{
        const sprite=n.querySelector('.garden-bird-sprite');
        return [sprite?.dataset.gardenBirdId||n.dataset.encounterOpen||n.dataset.encounterPage,sprite?.dataset.color,n.dataset.gardenFlight];
      })]);
      const nextSignature=JSON.stringify([p,clip,nodes.length]);
      if(nextStage!==stage||nextSignature!==signature||nextKey!==key){
        if(nextSignature!==signature)key='';signature=nextSignature;
        initialize(nextStage,nodes,{plane:p,clip,obstacles},nextKey);
      }
      if(!layout)return false;
      const blocked=nextStage.dataset.sceneState!=='ready'||!!root.querySelector('[data-crow-phase],.finch-raptor-scale-scene,.finch-crow-scale-scene');
      if(terrain.graph&&active&&!blocked&&routeClockStart===null)routeClockStart=elapsed;
      const routeElapsed=terrain.graph?Math.max(0,elapsed-(routeClockStart??elapsed)):elapsed;
      const nextCycle=Math.floor(routeElapsed/TERRAIN_PERIOD);
      if(active&&!blocked&&cycle!==nextCycle){
        // A resize or newly usable crop must not join a flight halfway through.
        plan=routeElapsed%TERRAIN_PERIOD<(terrain.graph?1000:3000)?terrainPlan(stage.dataset.gardenId,layout,p,clip,obstacles,nextCycle):null;cycle=nextCycle;
        if(plan?.flight){
          const actor=layout.find(a=>a.id===plan.id);
          wing(actor,{wing:true,phase:0,pose:'right'});
          const images=actor.node.querySelectorAll('[data-flight-source]');
          if(images.length!==4||![...images].every(i=>decoded.get(i.dataset.flightSource)?.ready)){
            if(terrain.graph&&flightWait++<2){
              // Decode on a stationary native pose, then start from phase zero.
              // Never join a flight midway or wait a complete 26-second cycle.
              plan=null;cycle=-1;routeClockStart=null;
            }else plan=terrainPlan(stage.dataset.gardenId,layout.map(a=>({...a,flight:false})),p,clip,obstacles,nextCycle);
          }
        }
      }
      const frame=terrainFrame(plan,routeElapsed);
      for(const a of layout){
        const f=plan?.id===a.id?frame:null,point=f?.point||a.point;
        // Motion holds at its exact point while hovered/focused or paused.
        const anchor=terrain.graph?a.point:point;
        set(a.node,'left',(anchor[0]*100)+'%');set(a.node,'top',(anchor[1]*100)+'%');
        set(a.node,'transform',terrain.graph?`translate(-54%,-97.5%) translate(${(point[0]-anchor[0])*p.width}px,${(point[1]-anchor[1])*p.height-(f?.lift||0)}px)`:`translate(-54%,-97.5%) translateY(${- (f?.lift||0)}px)`);
        set(a.node,'z-index',String(Math.round(point[1]*1000)));
        const shadow=a.node.querySelector('.garden-terrain-shadow');
        if(shadow){
          shadow.style.transform=`translateY(${f?.lift||0}px)`;
          shadow.style.opacity=String(Math.max(.2,1-(f?.lift||0)/Math.max(1,a.width)));
          shadow.style.visibility=Object.values(terrain.surfaces).some(polygon=>inside(point,polygon))?'visible':'hidden';
        }
        if(f&&active&&!blocked){const sprite=a.node.querySelector('.garden-bird-sprite');if(sprite)overrides.set(sprite,{pose:f.pose});}
        wing(a,f);
      }
      // Wake before the sub-second flight; a one-second idle poll must not skip
      // an entire takeoff/landing window.
      const local=routeElapsed%TERRAIN_PERIOD;
      return active&&!blocked&&!!plan&&(terrain.graph ? ((local>=0&&local<5000)||(local>=13000&&local<18000)) : ((local>=3000&&local<6000)||(local>=13000&&local<16000)));
    },
    dispose(){restore();if(stage)delete stage.dataset.terrainMotion;stage=null;layout=null;plan=null;key='';signature='';cycle=-1;routeClockStart=null;flightWait=0;},
  };
}
