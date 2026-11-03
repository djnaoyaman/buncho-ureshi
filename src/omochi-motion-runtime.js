import {sampleMotion, createActiveClock} from './omochi-motion-plan.js';
/** Presentation only. The host reserves this explicit actor from social motion.
 * Buttons, labels, input state and saved bird state are never replaced. */
export function mountGardenFlight({root,birdId,plan,renderFrame,enabled=()=>true,isLocked=()=>false}) {
 if(!root||!birdId||!plan||typeof renderFrame!=='function')throw new TypeError('Explicit actor, plan and renderer required');
 const doc=root.ownerDocument,win=doc.defaultView,media=win.matchMedia?.('(prefers-reduced-motion: reduce)'),clock=createActiveClock();
 let raf=null,timer=null,dead=false,actor=null,sprite=null,original=null,snapshot=null,frame=null,press=false,hover=false,keyboardFocus=true;
 const now=()=>win.performance.now();
 const find=()=>[...root.querySelectorAll('[data-garden-household]')].find(n=>n.dataset.gardenHousehold===birdId);
 function restore(){
  if(sprite&&snapshot){
   sprite.replaceChildren(...snapshot.children.map(n=>n.cloneNode(true)));
   for(const attr of [...sprite.attributes])sprite.removeAttribute(attr.name);
   for(const [name,value] of snapshot.attrs)sprite.setAttribute(name,value);
  }
  if(actor&&original)for(const [key,value] of Object.entries(original)){if(value)actor.style.setProperty(key,value);else actor.style.removeProperty(key)}
  actor=sprite=original=snapshot=null;frame=null;
 }
 function resolve(){
  const next=find();if(next===actor)return;restore();actor=next;sprite=actor?.querySelector('.garden-bird-sprite');
  if(sprite)snapshot={children:[...sprite.childNodes].map(n=>n.cloneNode(true)),attrs:[...sprite.attributes].map(a=>[a.name,a.value])};
  if(actor)original={translate:actor.style.getPropertyValue('translate'),'z-index':actor.style.getPropertyValue('z-index')};
  press=hover=false;
 }
 const locked=()=>press||hover||isLocked()||(keyboardFocus&&actor?.contains(doc.activeElement))||!!root.querySelector('details[open],dialog[open]')||!!doc.querySelector('.game-bird-sheet[open]');
 function clear(){if(raf!==null)win.cancelAnimationFrame(raf);if(timer!==null)win.clearTimeout(timer);raf=timer=null}
 function schedule(fast){
  clear();if(dead||doc.hidden||media?.matches)return;
  if(fast)raf=win.requestAnimationFrame(tick);else timer=win.setTimeout(()=>tick(now()),1000);
 }
 function tick(time){
  if(dead)return;resolve();
  const active=!!actor&&!!sprite&&root.isConnected&&!doc.hidden&&!media?.matches&&enabled()&&!locked();
  const elapsed=clock.tick(time,active);let done=false;
  if(active){
   const s=sampleMotion(plan,elapsed);done=s.done;
   actor.style.setProperty('translate',`${s.x-plan.from.x}px ${s.y-plan.from.y}px`);
   actor.style.setProperty('z-index',s.y<plan.from.y?'4':'2');
   if(s.frame!==frame){renderFrame(sprite,s.frame);frame=s.frame}
  }
  schedule(active&&!done);
 }
 const wake=()=>{clock.tick(now(),false);schedule(true)};
 const down=e=>{keyboardFocus=false;if(actor?.contains(e.target))press=true;wake()};
 const key=()=>{keyboardFocus=true;wake()};
 const up=()=>{press=false;wake()};
 const over=e=>{if(e.pointerType!=='touch'&&actor?.contains(e.target)){hover=true;wake()}};
 const out=e=>{if(actor?.contains(e.target)&&!actor.contains(e.relatedTarget)){hover=false;wake()}};
 root.addEventListener('pointerdown',down);root.addEventListener('pointerover',over);root.addEventListener('pointerout',out);
 doc.addEventListener('pointerup',up);doc.addEventListener('pointercancel',up);doc.addEventListener('keydown',key);doc.addEventListener('visibilitychange',wake);
 media?.addEventListener?.('change',wake);schedule(true);
 return ()=>{
  if(dead)return;dead=true;clear();
  root.removeEventListener('pointerdown',down);root.removeEventListener('pointerover',over);root.removeEventListener('pointerout',out);
  doc.removeEventListener('pointerup',up);doc.removeEventListener('pointercancel',up);doc.removeEventListener('keydown',key);doc.removeEventListener('visibilitychange',wake);
  media?.removeEventListener?.('change',wake);restore();
 };
}
/** Reject an unsafe complete actor/label envelope rather than crossing UI. */
export function flightEnvelopeSafe(rect,plan,clip,obstacles=[]){
 const finite=r=>r&&['left','right','top','bottom'].every(k=>Number.isFinite(r[k]))&&r.right>r.left&&r.bottom>r.top;
 if(!finite(rect)||!finite(clip)||!plan)return false;
 const dx=plan.to.x-plan.from.x,dy=plan.to.y-plan.from.y;
 const r={left:rect.left+Math.min(0,dx),right:rect.right+Math.max(0,dx),top:rect.top+Math.min(0,dy)-plan.lift,bottom:rect.bottom+Math.max(0,dy)};
 if(r.left<clip.left||r.right>clip.right||r.top<clip.top||r.bottom>clip.bottom)return false;
 return obstacles.every(o=>finite(o)&&!(r.left<o.right+6&&r.right+6>o.left&&r.top<o.bottom+6&&r.bottom+6>o.top));
}
