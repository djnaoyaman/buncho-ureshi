/** Settle the dial before arriving through the existing transaction controller. */
export function mountGardenJog(root,{items,getCommitted,isBusy=()=>false,onCommit,onGesture=()=>{},onStep=()=>{},onSettled=()=>{},onCancel=()=>{}}){
 const doc=root.ownerDocument,win=doc.defaultView;
 let preview=null,committed=null,drag=null,suppressUntil=0,timer=null,disposed=false,pending=false;
 const wrap=n=>items.length?((n%items.length)+items.length)%items.length:0;
 const index=()=>Math.max(0,items.findIndex(x=>x.id===preview));
 function paint(){
  const face=root.querySelector('[data-garden-jog]');if(!face)return;
  const current=getCommitted();if(current!==committed){committed=current;preview=current;drag=null;}
  if(!items.some(x=>x.id===preview))preview=items[0]?.id;
  const n=index(),item=items[n],center=face.querySelector('[data-jog-center]');
  if(!item){center.textContent='選べる庭がありません';center.disabled=true;return;}
  center.disabled=isBusy();center.dataset.gardenSelect=current;
  center.setAttribute('aria-current','page');
  center.textContent=item.name;
  center.setAttribute('aria-label',`${item.name}、${n+1} / ${items.length}。${preview===current?'現在の庭':'この庭へ移動'}`);
  for(const [key,delta] of [['before',-1],['after',1]])face.querySelector(`[data-jog-${key}]`).textContent=items.length>1?items[wrap(n+delta)].name:'';
  face.querySelector('[data-jog-count]').textContent=`${n+1} / ${items.length}`;
  face.dataset.preview=preview;
 }
 function select(id){if(!items.some(item=>item.id===id)||id===preview)return;preview=id;paint();onStep();}
 function step(delta){if(disposed||pending||isBusy()||items.length<2)return;select(items[wrap(index()+delta)].id);}
 function arrive(){
  if(disposed||pending||isBusy()||!preview||preview===getCommitted())return;
  const target=preview;const settled=()=>{if(!disposed&&root.isConnected&&getCommitted()===target)onSettled();};
  try{const result=onCommit(target);if(result&&typeof result.then==='function'){pending=true;Promise.resolve(result).then(ok=>{if(ok===false&&!disposed){preview=getCommitted();paint();}else if(ok!==false)settled();},()=>{if(!disposed){preview=getCommitted();paint();}}).finally(()=>{pending=false;});}else {paint();if(result!==false)settled();}}
  catch{preview=getCommitted();paint();}
 }
 function click(e){const wrapEl=e.target.closest('.finch-garden-selector-wrap');if(!wrapEl||!root.contains(wrapEl))return;
  const arrow=e.target.closest('[data-garden-scroll]'),center=e.target.closest('[data-jog-center]');
  if(!arrow&&!center)return;e.preventDefault();e.stopImmediatePropagation();
  if(pending||isBusy()||Date.now()<suppressUntil)return;onGesture(e);
  if(arrow){step(arrow.dataset.gardenScroll==='next'?1:-1);arrive();}
  else arrive();
 }
 function key(e){if(!e.target.closest('[data-garden-jog]')||pending||isBusy())return;
  const delta={ArrowUp:-1,ArrowDown:1,ArrowLeft:-1,ArrowRight:1,PageUp:-1,PageDown:1}[e.key];
  if(delta){e.preventDefault();onGesture(e);step(delta);arrive();}
  else if(e.key==='Home'||e.key==='End'){e.preventDefault();onGesture(e);select(items[e.key==='Home'?0:items.length-1]?.id);arrive();}
 }
 function down(e){const face=e.target.closest('[data-garden-jog]');if(!face||pending||isBusy()||e.button>0||items.length<2)return;
  onGesture(e);drag={id:e.pointerId,y:e.clientY,last:e.clientY,time:Date.now(),velocity:0,moved:false,face};
 }
 function move(e){if(!drag||e.pointerId!==drag.id)return;
  const dy=e.clientY-drag.y;if(Math.abs(dy)<8&&!drag.moved)return;
  e.preventDefault();if(!drag.moved)drag.face.setPointerCapture?.(e.pointerId);drag.moved=true;
  const elapsed=Math.max(1,Date.now()-drag.time);drag.velocity=Math.max(-1,Math.min(1,(e.clientY-drag.last)/elapsed));drag.last=e.clientY;drag.time=Date.now();
  const steps=Math.trunc(dy/24);if(steps){step(-Math.max(-3,Math.min(3,steps)));drag.y=e.clientY;}
  const angle=win.matchMedia?.('(prefers-reduced-motion: reduce)').matches?0:Math.max(-18,Math.min(18,(e.clientY-drag.y)*.65));
  drag.face.style.setProperty('--jog-angle',`${angle}deg`);
 }
 function stop(e){if(!drag||(e?.pointerId!=null&&e.pointerId!==drag.id))return;
  const previous=drag;drag=null;previous.face.style.setProperty('--jog-angle','0deg');
  if(previous.moved){suppressUntil=Date.now()+350;
   if(e?.type==='pointerup'&&Math.abs(previous.velocity)>.6&&!win.matchMedia?.('(prefers-reduced-motion: reduce)').matches){clearTimeout(timer);timer=win.setTimeout(()=>{timer=null;if(!disposed&&previous.face.isConnected){step(previous.velocity>0?-1:1);arrive();}},70);}
   else if(e?.type==='pointerup')arrive();
   else {preview=getCommitted();paint();onCancel();}
  }
 }
 function cancel(){stop();clearTimeout(timer);timer=null;onCancel();}
 function wheel(e){if(!e.target.closest('[data-garden-jog]')||pending||isBusy()||items.length<2)return;e.preventDefault();if(timer||!e.deltaY)return;onGesture(e);step(e.deltaY>0?1:-1);timer=win.setTimeout(()=>{timer=null;arrive();},120);}
 root.addEventListener('click',click,true);root.addEventListener('keydown',key);root.addEventListener('pointerdown',down);
 doc.addEventListener('pointermove',move,{passive:false});doc.addEventListener('pointerup',stop);doc.addEventListener('pointercancel',stop);
 root.addEventListener('wheel',wheel,{passive:false});win.addEventListener('blur',cancel);win.addEventListener('pagehide',cancel);doc.addEventListener('visibilitychange',cancel);
 return {refresh(){stop();clearTimeout(timer);timer=null;paint();},destroy(){disposed=true;cancel();root.removeEventListener('click',click,true);root.removeEventListener('keydown',key);root.removeEventListener('pointerdown',down);doc.removeEventListener('pointermove',move);doc.removeEventListener('pointerup',stop);doc.removeEventListener('pointercancel',stop);root.removeEventListener('wheel',wheel);win.removeEventListener('blur',cancel);win.removeEventListener('pagehide',cancel);doc.removeEventListener('visibilitychange',cancel);}};
}
