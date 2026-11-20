import {POSE_ATLASES} from './bird-poses.js';
// Geometry and original per-colour pixels from the approved four-colour HTML.
// One lazy decode set per document and atlas URL. Assets are the approved HTML bytes.
const whiteFrameCache=new WeakMap(), WHITE_PRELOAD_BUDGET_MS=1800;
function whiteFrames(document,source){
 let sets=whiteFrameCache.get(document);if(!sets)whiteFrameCache.set(document,sets=new Map());
 const root=new URL('garden-flight/white-connected/',source).href;
 if(sets.has(root))return sets.get(root);
 const frames={};
 for(const mode of ['wing','brake','feet'])frames[mode]=Array.from({length:7},(_,i)=>{
  const image=document.createElement('img');image.src=new URL(`${mode}-${i}.webp?v=a99ffb62652a4`,root).href;return image;
 });
 const set={frames,status:'pending',deadline:document.defaultView.performance.now()+WHITE_PRELOAD_BUDGET_MS};sets.set(root,set);
 Promise.all(Object.values(frames).flat().map(image=>image.decode())).then(()=>{set.status='ready';},()=>{set.status='failed';});
 return set;
}
let serial=0;
const reset='display:block;position:absolute;margin:0;padding:0;border:0;border-radius:0;background:none;box-shadow:none;pointer-events:none;max-width:none;';
export function createActorFlight(sprite,color){
 const document=sprite.ownerDocument,container=document.createElement('span');
 container.className='garden-actor-flight';container.setAttribute('aria-hidden','true');
 container.style.cssText=reset+'left:-26.470588%;top:-8%;width:152.941176%;height:120%;transform-origin:52.615385% 87.916667%;visibility:hidden;';
 const source=sprite.querySelector('img').src, decodeImages=[];
 let whiteSet,whiteImage,whiteFallback,flightSince=null,flightMode=null;
 if(color==='white'){
  // Safe whole-bird fallback: one original atlas image, one complete outline.
  // Do not independently rotate wings/feet or apply SVG alpha filters here.
  const atlas=POSE_ATLASES.white,p=atlas.poses.stretch,[x,y,w,h]=p.crop,[fx,fy]=p.foot;
  const scale=atlas.scale/5,ox=45+Math.round((459-(fx-x)*atlas.scale)/5),oy=16+Math.round((975-(fy-y)*atlas.scale)/5);
  const id='garden-whole-'+serial++,svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
  svg.setAttribute('viewBox','0 0 260 240');svg.setAttribute('aria-hidden','true');svg.dataset.wholeBird='white';
  svg.style.cssText=reset+'left:0;top:0;width:100%;height:100%;';
  const outline=p.clip.map(([px,py])=>`${x+px*w/100},${y+py*h/100}`).join(' ');
  svg.innerHTML=`<defs><clipPath id="${id}"><polygon points="${outline}"/></clipPath></defs><g transform="translate(${ox-x*scale} ${oy-y*scale}) scale(${scale})" clip-path="url(#${id})"><image href="${source}" width="${atlas.width}" height="${atlas.height}"/></g>`;
  container.append(svg);decodeImages.push(sprite.querySelector('img'));
  whiteFallback=svg;whiteSet=whiteFrames(document,source);
  whiteImage=document.createElement('img');whiteImage.alt='';whiteImage.dataset.whiteFlightFrame='';
  whiteImage.style.cssText=reset+'left:0;top:0;width:100%;height:100%;object-fit:contain;visibility:hidden;';
  whiteImage.src=whiteSet.frames.wing[0].src;container.append(whiteImage);
 }else{
 const atlas=POSE_ATLASES[color],p=atlas.poses.stretch,[x,y,w,h]=p.crop,[fx,fy]=p.foot;
 const scale=atlas.scale/5,ox=45+Math.round((459-(fx-x)*atlas.scale)/5),oy=16+Math.round((975-(fy-y)*atlas.scale)/5);
 const parts={body:[[0,156],[30,143],[48,130],[61,113],[69,97],[78,79],[78,65],[95,47],[134,45],[168,61],[166,83],[141,94],[139,114],[133,136],[121,153],[106,168],[76,170],[63,167],[32,173],[0,184]],near:[[-43,22],[40,38],[77,53],[83,78],[95,90],[99,104],[88,118],[70,135],[49,151],[25,153],[-36,142]],far:[[125,86],[151,92],[208,121],[208,163],[143,167],[115,154],[117,128]],feet:[[48,164],[88,164],[106,166],[140,179],[142,199],[49,200]]};
 for(const key of ['far','body','near','feet']){
 const id=`garden-flight-${serial++}-${key}`,svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 260 240');svg.setAttribute('aria-hidden','true');svg.dataset.part=key;svg.dataset.texture=color;
 const points=parts[key].map(([x,y])=>`${x+45},${y+16}`).join(' '),outline=p.clip.map(([px,py])=>`${x+px*w/100},${y+py*h/100}`).join(' ');
 svg.innerHTML=`<defs><clipPath id="${id}-part"><polygon points="${points}"/></clipPath><clipPath id="${id}-outline"><polygon points="${outline}"/></clipPath></defs><g clip-path="url(#${id}-part)"><g transform="translate(${ox-x*scale} ${oy-y*scale}) scale(${scale})" clip-path="url(#${id}-outline)"><image href="${source}" width="${atlas.width}" height="${atlas.height}"/></g></g>`;
 container.append(svg);
 }
 }
 for(const part of container.querySelectorAll('[data-part]')){
  const background=part.style.backgroundImage,filter=part.style.filter;
  part.style.cssText=reset+'left:0;top:0;width:100%;height:100%;';
  part.style.backgroundImage=background;part.style.backgroundSize='100% 100%';part.style.filter=filter;
  part.style.transformOrigin=({far:'68.3% 51.7%',near:'50% 52.5%',body:'52.6% 87.9%',feet:'52.6% 77%'})[part.dataset.part];
 }
 sprite.append(container);
 const images=color==='white'?decodeImages:[sprite.querySelector('img')];
 let ready=false;
 // Preload continues in the background without any per-actor timer. Keep the
 // first short cold-start window, but never wait indefinitely on one frame.
 Promise.all(images.map(i=>i.decode())).then(()=>{ready=true;},()=>{});
 const whiteMode=()=>whiteSet.status==='ready'?'ready':whiteSet.status==='failed'||
  document.defaultView.performance.now()>=whiteSet.deadline?'fallback':'pending';
 const flightReady=()=>ready&&(!whiteSet||whiteMode()!=='pending');
 return {node:container,get ready(){return flightReady();},paint(a,time){
  if(whiteSet){
   // Latch at the start of each flight, including its grounded crouch phase.
   if(a.state!=='fly'){flightSince=null;flightMode=null;}
   else if(flightSince!==a.since){flightSince=a.since;flightMode=whiteMode();}
  }
  const air=ready&&a.state==='fly'&&a.height>.002&&(!whiteSet||flightMode!=='pending');
  container.style.visibility=air?'visible':'hidden';
  const pose=sprite.querySelector('.garden-bird-pose-window');
  pose.style.visibility=air?'hidden':'visible';pose.toggleAttribute('data-terrain-flight-active',air);
  if(whiteSet){whiteImage.style.visibility=air&&flightMode==='ready'?'visible':'hidden';whiteFallback.style.visibility=air&&flightMode==='fallback'?'visible':'hidden';}
  if(!air)return;
  container.style.transform=a.route.to[0]<a.route.from[0]?'scaleX(-1)':'none';
  if(whiteSet){
   const useFrames=flightMode==='ready';
   whiteImage.style.visibility=useFrames?'visible':'hidden';whiteFallback.style.visibility=useFrames?'hidden':'visible';
   if(useFrames){
    const flap=Math.cos((time-a.since)/1000*Math.PI*14),brake=['brake','feet'].includes(a.phase);
    const angle=(brake?24:4)+(brake?20:43)*flap,mode=a.phase==='feet'?'feet':a.phase==='brake'?'brake':'wing';
    const min=mode==='wing'?-39:4,max=mode==='wing'?47:44,index=Math.max(0,Math.min(6,Math.round((angle-min)*6/(max-min))));
    if(whiteImage.dataset.frame!==mode+index){whiteImage.src=whiteSet.frames[mode][index].src;whiteImage.dataset.frame=mode+index;}
   }
   return;
  }
  const flap=Math.cos((time-a.since)/1000*Math.PI*14),brake=['brake','feet'].includes(a.phase);
  for(const part of container.querySelectorAll('[data-part]')){
   const k=part.dataset.part;
   if(k==='near'||k==='far')part.style.transform=`rotate(${(k==='near'?1:-1)*((brake?24:4)+(brake?20:43)*flap)}deg)`;
   if(k==='feet')part.style.transform=`translateY(${brake?5:-2}px)`;
  }
 }};
}
