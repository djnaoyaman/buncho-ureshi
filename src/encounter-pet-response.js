import {createCareAudio} from './care-audio.js';
/** Committed-pet feedback only. No world writes, scoring or game RNG. */
export function createEncounterPetResponse(root,getWorld,{getSound=()=>getWorld().settings?.careSound===true,Context=root.ownerDocument.defaultView.AudioContext||root.ownerDocument.defaultView.webkitAudioContext}={}){
 const doc=root.ownerDocument,win=doc.defaultView,reduced=win.matchMedia?.('(prefers-reduced-motion: reduce)'),audio=createCareAudio({Context});
 let alive=true,epoch=0;const animations=new Set(),notes=new Set();
 const visible=()=>alive&&root.isConnected&&!doc.hidden&&!getWorld().paused&&!doc.body.hasAttribute('data-game-view-blocked')&&!doc.body.hasAttribute('data-game-ending-active');
 function cancelVisual(){for(const a of animations)try{a.cancel();}catch{}animations.clear();for(const n of notes)n.remove();notes.clear();}
 function cancel(){epoch++;cancelVisual();audio.cancel();}
 function gesture(){if(!visible())return;audio.setEnabled(getSound());if(getSound())void audio.unlockFromGesture();}
 function prepare(){
  if(!alive)return;
  for(const target of root.querySelectorAll('[data-encounter-rub]')){
   const img=target.querySelector('img');if(!img||target.querySelector('[data-pet-portrait]'))continue;
   const content=img.parentElement.tagName==='PICTURE'?img.parentElement:img,portrait=doc.createElement('span'),band=doc.createElement('span');
   portrait.dataset.petPortrait='';portrait.style.display='block';content.before(portrait);portrait.append(content);
   band.dataset.petNotes='';band.setAttribute('aria-hidden','true');band.style.cssText='display:block;height:96px;position:relative;pointer-events:none';portrait.before(band);
  }
 }
 function track(element,frames,options,finish=()=>{}){const a=element.animate(frames,options);animations.add(a);a.onfinish=()=>{animations.delete(a);finish();};return a;}
 function play(id){
  cancelVisual();if(!visible())return;
  const target=[...root.querySelectorAll('[data-encounter-rub]')].find(e=>e.dataset.encounterRub===id);if(!target)return;
  const token=epoch,worldId=getWorld().worldId;
  audio.setEnabled(getSound());
  void audio.chime(()=>visible()&&getSound()&&token===epoch&&getWorld().worldId===worldId&&target.isConnected);
  if(getWorld().settings?.motion===false||reduced?.matches)return;
  const portrait=target.querySelector('[data-pet-portrait]'),img=portrait?.querySelector('img'),band=target.querySelector('[data-pet-notes]');
  if(!portrait?.animate||!img?.complete||!img.naturalWidth)return;
  try{
   const original=win.getComputedStyle(portrait).transform,base=original==='none'?'':original;
   track(portrait,[0,-1,1,-.75,.5,0].map(t=>({transform:`${base} translateX(${8*t}px) rotate(${2*t}deg)`})),{duration:540,easing:'ease-in-out'});
   const width=band.getBoundingClientRect().width,spread=Math.max(0,Math.min(85,(width-144)/2));if(width<178)return;
   for(let i=0;i<3;i++){
    const side=i-1,dx=side*38,dy=side===0?-28:-24,n=doc.createElement('span');n.dataset.petNote=String(i);n.textContent='♪';
    n.style.cssText=`position:absolute;pointer-events:none;left:${width/2-17+side*spread}px;top:${side===0?28:34}px;width:34px;font:700 34px/1 sans-serif;text-align:center;color:#56734a`;
    band.append(n);notes.add(n);track(n,[{opacity:0,transform:'translate(0,0)'},{opacity:1,transform:`translate(${dx*.15}px,${dy*.15}px)`,offset:.15},{opacity:1,transform:`translate(${dx*.7}px,${dy*.7}px)`,offset:.7},{opacity:0,transform:`translate(${dx}px,${dy}px)`}],{duration:1100,delay:i*100,fill:'backwards',easing:'ease-out'},()=>{notes.delete(n);n.remove();});
   }
  }catch{cancelVisual();}
 }
 const events=['visibilitychange','buncho-game-view-visibility','buncho-game-will-render'];for(const e of events)doc.addEventListener(e,cancel);
 win.addEventListener('pagehide',cancel);win.addEventListener('resize',cancelVisual);root.addEventListener('scroll',cancelVisual,true);reduced?.addEventListener?.('change',cancelVisual);
 return {prepare,gesture,play,cancel,destroy(){alive=false;cancel();audio.close();for(const e of events)doc.removeEventListener(e,cancel);win.removeEventListener('pagehide',cancel);win.removeEventListener('resize',cancelVisual);root.removeEventListener('scroll',cancelVisual,true);reduced?.removeEventListener?.('change',cancelVisual);}};
}
