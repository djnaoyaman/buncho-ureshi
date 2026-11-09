import {gachaMachine} from './gacha-machines.js';
let lastVariant=-1;
export function primeGachaAudio(win,enabled){if(!enabled)return null;const Context=win.AudioContext||win.webkitAudioContext;try{const c=Context?new Context():null;c?.resume()?.catch(()=>{});return c;}catch{return null;}}

/** Presentation after a durable draw. Never mutates a world, balance, or story seed. */
export function mountGachaMotion(dialog,{machineId='house',base='',getSound=()=>false,motion=true,audioContext=null}={}){
 const doc=dialog.ownerDocument,win=doc.defaultView,machine=gachaMachine(machineId);
 const root=doc.createElement('section');root.className=`gacha-mechanism gacha-mechanism-${machineId}`;root.setAttribute('aria-label',`${machine.name}の抽選演出`);
 let variant=(globalThis.crypto?.getRandomValues?.(new Uint32Array(1))[0]??Date.now())%9;if(variant===lastVariant)variant=(variant+1)%9;lastVariant=variant;
 const colors=['mint','peach','blue','yellow'],color=colors[variant%4];
 root.innerHTML=`<div class="gacha-stage"><img class="gacha-fixed-body" src="${base}${machineId==='round'?'body-v1.webp':machine.image}" alt="" width="1199" height="1312"><div class="gacha-chamber">${[['peach',26,18],['yellow',65,12],['blue',74,45],['mint',46,43],['blue',18,59],['yellow',43,76],['peach',72,77]].map(([c,x,y],i)=>`<img class="gacha-internal-capsule${i===6?' gacha-dispensed':''}" src="${base}${c}-v1.webp" alt="" style="left:${x}%;top:${y}%">`).join('')}</div><span class="gacha-fixed-plate" aria-hidden="true"></span><img class="gacha-handle" src="${base}handle-v1.webp" alt=""><span class="gacha-outlet" aria-hidden="true"></span><img class="gacha-exit-capsule" src="${base}${color}-v1.webp" alt=""><img class="gacha-flap" src="${base}hatch-v1.webp" alt=""></div><button type="button" class="gacha-skip">演出を省略</button>`;
 dialog.insertBefore(root,dialog.firstChild);
 const animations=[];let context=audioContext,timer=null,frame=null,done=false;
 const stopAudio=()=>{const c=context;context=null;try{c?.close()?.catch(()=>{});}catch{}};
 function finish(){if(done)return;done=true;for(const a of animations){try{a.cancel();}catch{}}win.clearTimeout(timer);win.cancelAnimationFrame(frame);stopAudio();root.dataset.finished='true';root.querySelector('.gacha-skip').hidden=true;}
 const hide=()=>{if(doc.hidden)finish();};
 const destroy=()=>{finish();doc.removeEventListener('visibilitychange',hide);win.removeEventListener('pagehide',finish);root.remove();};
 root.querySelector('button').addEventListener('click',finish);doc.addEventListener('visibilitychange',hide);win.addEventListener('pagehide',finish);
 if(!motion||win.matchMedia?.('(prefers-reduced-motion: reduce)').matches){finish();return {destroy,finish};}
 const animate=(selector,frames,options)=>{const el=root.querySelector(selector);if(el?.animate){const a=el.animate(frames,{fill:'both',...options});a.finished?.catch(()=>{});animations.push(a);}};
 // The body has no animation or transform; the shaft and top hinge stay fixed.
 animate('.gacha-handle',[{transform:'translate(-50%,-50%) rotate(0deg)'},{transform:'translate(-50%,-50%) rotate(360deg)'}],{delay:400,duration:1400,easing:'cubic-bezier(.4,0,.2,1)'});
 animate('.gacha-dispensed',[{transform:'translate(-50%,-50%)',opacity:1},{transform:'translate(-80%,65%)',opacity:0}],{delay:1600,duration:650,easing:'ease-in'});
 animate('.gacha-flap',[{transform:'rotateX(0deg)'},{transform:'rotateX(-60deg)',offset:.35},{transform:'rotateX(-60deg)',offset:.6},{transform:'rotateX(0deg)'}],{delay:2200,duration:1200});
 animate('.gacha-exit-capsule',[{transform:'translate(-50%,0) rotate(0deg)',opacity:0},{transform:'translate(-50%,0) rotate(0deg)',opacity:1,offset:.05},{transform:'translate(-20%,50%) rotate(10deg)',opacity:1,offset:.55},{transform:`translate(${22+variant*2}%,62%) rotate(${65+variant*3}deg)`,opacity:1}],{delay:2300,duration:1150,easing:'cubic-bezier(.45,.05,.55,1)'});
 const Context=win.AudioContext||win.webkitAudioContext;
 if(getSound()&&Context){try{context=context||new Context();const c=context;c.resume()?.catch(()=>{});const start=c.currentTime;
  const tone=(offset,freq,duration,level)=>{const o=c.createOscillator(),g=c.createGain();o.type='sine';o.frequency.setValueAtTime(freq,start+offset);g.gain.setValueAtTime(0,start+offset);g.gain.linearRampToValueAtTime(level,start+offset+.005);g.gain.exponentialRampToValueAtTime(.0001,start+offset+duration);o.connect(g);g.connect(c.destination);o.start(start+offset);o.stop(start+offset+duration);};
  for(let i=0;i<12;i++)tone(.4+i*.105,420+(i%3)*45+variant*6,.025,.035);
  tone(2.3,220+variant*4,.13,.06);tone(3.35,145,.10,.06);
  for(let i=0;i<3;i++)tone(3.65+i*.12,[523.25,659.25,783.99][i]*(1+variant*.003),.18,.025);
 }catch{stopAudio();}}
 const soundGuard=()=>{if(done)return;if(!getSound())stopAudio();frame=win.requestAnimationFrame(soundGuard);};frame=win.requestAnimationFrame(soundGuard);
 timer=win.setTimeout(finish,4400);return {destroy,finish};
}
