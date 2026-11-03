import {omochiIdentity} from './omochi-identity.js';
import {mountGardenFlight,flightEnvelopeSafe} from './omochi-motion-runtime.js';
/** Opt-in host adapter. Artwork readiness is explicit; prototype images are not
 * bundled or enabled. Only the original protagonist in the current save may fly.
 * choosePlan must return viewport coordinates and reserve the full label/art box.
 */
export function createOmochiFlightMount({ready=false,renderFrame,choosePlan}={}) {
 return ({root,getWorld,enabled=()=>true})=>{
  if(!ready||typeof renderFrame!=='function'||typeof choosePlan!=='function')return {reservedIds:()=>[],destroy(){}};
  const win=root.ownerDocument.defaultView;let dispose=null,key=null,dead=false,reserved=[];
  const stop=()=>{dispose?.();dispose=null;reserved=[];key=null};
  const check=()=>{
   if(dead)return;const identity=omochiIdentity(getWorld()),stage=root.querySelector('.finch-garden-stage'),slide=root.querySelector('.finch-garden-slide');
   const bird=identity&&[...root.querySelectorAll('[data-garden-household]')].find(n=>n.dataset.gardenHousehold===identity.birdId);
   const next=bird&&stage&&slide?JSON.stringify([identity.worldId,identity.birdId,stage.dataset.gardenId]):null;
   if(next===key&&dispose)return;if(next!==key)stop();if(!next)return;
   const rect=bird.getBoundingClientRect(),a=stage.getBoundingClientRect(),b=slide.getBoundingClientRect();
   const clip={left:Math.max(a.left,b.left),right:Math.min(a.right,b.right),top:Math.max(a.top,b.top),bottom:Math.min(a.bottom,b.bottom)};
   const obstacles=[...root.querySelectorAll('.finch-garden-friend,.finch-garden-household,.finch-garden-visitor,.finch-garden-dock,.finch-garden-selector')].filter(n=>n!==bird).map(n=>n.getBoundingClientRect());
   const plan=choosePlan({identity,rect,clip});if(!flightEnvelopeSafe(rect,plan,clip,obstacles))return;
   reserved=[identity.birdId];key=next;
   dispose=mountGardenFlight({root,birdId:identity.birdId,plan,renderFrame,enabled,isLocked:()=>{const current=omochiIdentity(getWorld());return !current||current.worldId!==identity.worldId||current.birdId!==identity.birdId;}});
  };
  check();const timer=win.setInterval(check,500);
  const resize=()=>stop();win.addEventListener('resize',resize);
  return {reservedIds:()=>reserved,destroy(){if(dead)return;dead=true;win.clearInterval(timer);win.removeEventListener('resize',resize);stop()}};
 };
}
