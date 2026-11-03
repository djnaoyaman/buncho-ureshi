import {sampleMotion, createActiveClock} from './omochi-motion-plan.js';
/** Opt-in bridge for an identified bird. Caller must reserve this actor from the
 * existing social scheduler. No inference from white colour or displayed name.
 * Rendering receives a decorative sprite only; host buttons are never replaced.
 */
export function mountGardenFlight({root, birdId, plan, renderFrame, enabled=()=>true, isLocked=()=>false}) {
 if(!root || !birdId || !plan || typeof renderFrame!=='function')throw new TypeError('Explicit actor, plan and renderer required');
 const doc=root.ownerDocument,win=doc.defaultView,media=win.matchMedia?.('(prefers-reduced-motion: reduce)');
 const clock=createActiveClock();let raf=null,dead=false,actor=null,sprite=null,original=null,spriteSnapshot=null,frame=null,press=false,hover=false;
 const find=()=>[...root.querySelectorAll('[data-garden-household]')].find(n=>n.dataset.gardenHousehold===birdId);
 function restore(){if(sprite&&spriteSnapshot){sprite.replaceChildren(...spriteSnapshot.children.map(n=>n.cloneNode(true)));for(const attr of [...sprite.attributes])sprite.removeAttribute(attr.name);for(const [name,value] of spriteSnapshot.attrs)sprite.setAttribute(name,value)}if(actor&&original){for(const [key,value] of Object.entries(original)){if(value)actor.style.setProperty(key,value);else actor.style.removeProperty(key)}}actor=sprite=original=spriteSnapshot=null;frame=null;}
 function resolve(){const next=find();if(next===actor)return;restore();actor=next;sprite=actor?.querySelector('.garden-bird-sprite');if(sprite)spriteSnapshot={children:[...sprite.childNodes].map(n=>n.cloneNode(true)),attrs:[...sprite.attributes].map(a=>[a.name,a.value])};if(actor)original={translate:actor.style.getPropertyValue('translate'),'z-index':actor.style.getPropertyValue('z-index')};press=hover=false;}
 const locked=()=>press||hover||isLocked()||actor?.contains(doc.activeElement)||!!root.querySelector('details[open],dialog[open]');
 function tick(now){if(dead)return;resolve();const active=!!actor&&!!sprite&&root.isConnected&&!doc.hidden&&!media?.matches&&enabled()&&!locked();const elapsed=clock.tick(now,active);if(active){const s=sampleMotion(plan,elapsed);actor.style.setProperty('translate',`${s.x-plan.from.x}px ${s.y-plan.from.y}px`);actor.style.setProperty('z-index',s.y<plan.from.y?'4':'2');if(s.frame!==frame){renderFrame(sprite,s.frame);frame=s.frame;}}raf=win.requestAnimationFrame(tick);}
 const down=e=>{if(actor?.contains(e.target))press=true},up=()=>{press=false},over=e=>{if(e.pointerType!=='touch'&&actor?.contains(e.target))hover=true},out=e=>{if(actor?.contains(e.target)&&!actor.contains(e.relatedTarget))hover=false};
 root.addEventListener('pointerdown',down);root.addEventListener('pointerover',over);root.addEventListener('pointerout',out);doc.addEventListener('pointerup',up);doc.addEventListener('pointercancel',up);raf=win.requestAnimationFrame(tick);
 return ()=>{if(dead)return;dead=true;win.cancelAnimationFrame(raf);root.removeEventListener('pointerdown',down);root.removeEventListener('pointerover',over);root.removeEventListener('pointerout',out);doc.removeEventListener('pointerup',up);doc.removeEventListener('pointercancel',up);restore()};
}
/** Reserve full actor and label envelope, rejecting rather than flying through UI.
 * Deliberately conservative: existing overlaps and crossing obstacles defer flight.
 */
export function flightEnvelopeSafe(rect,plan,clip,obstacles=[]){
 const finite=r=>r&&['left','right','top','bottom'].every(k=>Number.isFinite(r[k]))&&r.right>r.left&&r.bottom>r.top;
 if(!finite(rect)||!finite(clip)||!plan)return false;
 const dx=plan.to.x-plan.from.x,dy=plan.to.y-plan.from.y;
 const r={left:rect.left+Math.min(0,dx),right:rect.right+Math.max(0,dx),top:rect.top+Math.min(0,dy)-plan.lift,bottom:rect.bottom+Math.max(0,dy)};
 if(r.left<clip.left||r.right>clip.right||r.top<clip.top||r.bottom>clip.bottom)return false;
 return obstacles.every(o=>finite(o)&&!(r.left<o.right+6&&r.right+6>o.left&&r.top<o.bottom+6&&r.bottom+6>o.top));
}
