/** Read-only feedback on the pettable portrait, never on travelling garden sprites. */
export function createEncounterPetResponse(root,getWorld){
 const doc=root.ownerDocument,win=doc.defaultView,reduced=win.matchMedia?.('(prefers-reduced-motion: reduce)');let current=null,alive=true;
 const cancel=()=>{const old=current;current=null;try{old?.cancel();}catch{/* A visual failure must not affect a committed save. */}};
 const play=id=>{
  cancel();const w=getWorld();
  if(!alive||!root.isConnected||doc.hidden||w.paused||w.settings?.motion===false||reduced?.matches||doc.body.hasAttribute('data-game-view-blocked')||doc.body.hasAttribute('data-game-ending-active'))return;
  const target=[...root.querySelectorAll('[data-encounter-rub]')].find(e=>e.dataset.encounterRub===id),img=target?.querySelector('img');
  if(!img?.animate||!img.complete||!img.naturalWidth)return;
  try{
   const original=win.getComputedStyle(img).transform,base=original==='none'?'':original;
   const animation=img.animate([0,-2,2,-1.5,1,0].map(x=>({transform:`${base} translateX(${x}px) rotate(${x*.25}deg)`})),{duration:420,easing:'ease-in-out'});
   current=animation;animation.onfinish=()=>{if(current===animation)current=null;};
  }catch{/* Unsupported animation never rolls back or repeats the pet action. */}
 };
 const events=['visibilitychange','buncho-game-view-visibility','buncho-game-will-render'];
 for(const event of events)doc.addEventListener(event,cancel);win.addEventListener('pagehide',cancel);reduced?.addEventListener?.('change',cancel);
 return {play,cancel,destroy(){alive=false;cancel();for(const event of events)doc.removeEventListener(event,cancel);win.removeEventListener('pagehide',cancel);reduced?.removeEventListener?.('change',cancel);}};
}
