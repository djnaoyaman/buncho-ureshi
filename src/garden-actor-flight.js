import {POSE_ATLASES} from './bird-poses.js';
// Geometry and original per-colour pixels from the approved four-colour HTML.
let serial=0;
const reset='display:block;position:absolute;margin:0;padding:0;border:0;border-radius:0;background:none;box-shadow:none;pointer-events:none;max-width:none;';
export function createActorFlight(sprite,color){
 const document=sprite.ownerDocument,container=document.createElement('span');
 container.className='garden-actor-flight';container.setAttribute('aria-hidden','true');
 container.style.cssText=reset+'left:-26.470588%;top:-8%;width:152.941176%;height:120%;transform-origin:52.615385% 87.916667%;visibility:hidden;';
 const source=sprite.querySelector('img').src, decodeImages=[];
 if(color==='white'){
  const id='garden-fringe-'+serial++,svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
  svg.setAttribute('width','0');svg.setAttribute('height','0');svg.setAttribute('aria-hidden','true');
  svg.innerHTML=`<defs><filter id="${id}" x="-5%" y="-5%" width="110%" height="110%" primitiveUnits="objectBoundingBox" color-interpolation-filters="sRGB"><feMorphology in="SourceAlpha" operator="erode" radius="0.0125 0.01355" result="inside"/><feComposite in="SourceAlpha" in2="inside" operator="out" result="edge"/><feColorMatrix in="SourceGraphic" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  -0.2126 -0.7152 -0.0722 0 0.32" result="dark"/><feComponentTransfer in="dark" result="darkOnly"><feFuncA type="linear" slope="100" intercept="-2"/></feComponentTransfer><feComposite in="darkOnly" in2="edge" operator="in" result="darkEdge"/><feComposite in="SourceGraphic" in2="darkEdge" operator="out"/></filter></defs>`;
  container.append(svg);
  for(const key of ['far','body','near','feet']){
   const image=document.createElement('span');image.dataset.part=key;
   const decoded=new document.defaultView.Image();decoded.src=new URL('garden-flight/white-'+key+'.webp',source).href;decodeImages.push(decoded);
   image.style.backgroundImage=`url("${decoded.src}")`;image.style.backgroundSize='100% 100%';
   if(key!=='feet')image.style.filter=`url(#${id})`;
   container.append(image);
  }
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
 Promise.all(images.map(i=>i.decode())).then(()=>{ready=true;},()=>{});
 return {node:container,get ready(){return ready;},paint(a,time){
  const air=ready&&a.state==='fly'&&a.height>.002;
  container.style.visibility=air?'visible':'hidden';
  const pose=sprite.querySelector('.garden-bird-pose-window');
  pose.style.visibility=air?'hidden':'visible';pose.toggleAttribute('data-terrain-flight-active',air);
  if(!air)return;
  container.style.transform=a.route.to[0]<a.route.from[0]?'scaleX(-1)':'none';
  const flap=Math.cos((time-a.since)/1000*Math.PI*14),brake=['brake','feet'].includes(a.phase);
  for(const part of container.querySelectorAll('[data-part]')){
   const k=part.dataset.part;
   if(k==='near'||k==='far')part.style.transform=`rotate(${(k==='near'?1:-1)*((brake?24:4)+(brake?20:43)*flap)}deg)`;
   if(k==='feet')part.style.transform=`translateY(${brake?5:-2}px)`;
  }
 }};
}
