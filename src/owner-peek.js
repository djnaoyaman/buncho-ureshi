import { normalizeOwnerProfile, OWNER_CHOICES } from './owner-profile-data.js';

// Original modular painted sprites, with wardrobe selections applied to the
// three views. Sources are local; no profile information leaves the device.
const HEADS=new URL('../game-art/owner-heads-child-three-view-registered.webp',import.meta.url).href;
const CLOTHES=new URL('../game-art/owner-clothes-child-three-view-registered.webp',import.meta.url).href;
const CELL=324;
let ownerArtId=0;
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const OWNER_GLANCE_CYCLE_MS=12000;
// Rendered scenes are replaced during world updates. Anchor the animation to
// wall time so each replacement resumes at the same point in the cycle.
export function ownerAnimationDelay(now=Date.now()){const phase=Math.floor(Math.max(0,Number.isFinite(now)?now:0))%OWNER_GLANCE_CYCLE_MS;return phase?-phase:0;}
const colorFor=(key,id,index=2)=>OWNER_CHOICES[key].find(row=>row[0]===id)[index];
function channelSlopes(color,reference){
  const rgb=hex=>[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));
  const base=rgb(reference).reduce((a,b)=>a+b,0)/3;
  return rgb(color).map(v=>Math.max(.35,Math.min(1.65,v/base)));
}
function tintFilter(id,color,reference){
  const [r,g,b]=channelSlopes(color,reference);
  return `<filter id="${id}" color-interpolation-filters="sRGB"><feColorMatrix type="saturate" values="0"/><feComponentTransfer><feFuncR type="linear" slope="${r}"/><feFuncG type="linear" slope="${g}"/><feFuncB type="linear" slope="${b}"/></feComponentTransfer></filter>`;
}
// Each atlas cell was registered to the same anatomical neck/collar anchor.
// Keep equal-size cells; centering visible bounds would move the neck when the
// hair, pose, or clothing changes.
const sprite=(src,col,row,x,y,w,h,extra='')=>`<svg x="${x}" y="${y}" width="${w}" height="${h}" viewBox="${col*CELL} ${row*CELL} ${CELL} ${CELL}" style="overflow:hidden" ${extra}><image href="${src}" x="0" y="0" width="1620" height="972"/></svg>`;
export function renderOwnerPortrait(value,options={}){return renderOwnerPeek(value,{decorative:false,...options,portrait:true});}
export function renderOwnerPeek(value,{portrait=false,decorative=true,label='飼い主の試着プレビュー'}={}){
  const uid=`owner-art-${++ownerArtId}`;
  const p=normalizeOwnerProfile(value);
  const hairIndex=['crop','bob','wave','bun','sweep'].indexOf(p.hair);
  const outfitIndex=['apron','cardigan','smock','dress','overalls'].indexOf(p.outfit);
  const hair=colorFor('hairColor',p.hairColor),skin=colorFor('skin',p.skin),cloth=colorFor('palette',p.palette),trim=colorFor('palette',p.palette,3);
  const head=(row)=>sprite(HEADS,hairIndex,row,14,-5,112,112,`filter="url(#${uid}-hair-tint)"`);
  // The small skin region is recoloured separately, preserving the selected
  // complexion instead of shifting it with the hair tint.
  const skinLayer=(row,mask)=>`<g mask="url(#${mask})" filter="url(#${uid}-skin-tint)">${sprite(HEADS,hairIndex,row,14,-5,112,112)}</g>`;
  const eyes=p.eyes==='smile'?`<path d="M51 48q20-3 39 0v10q-19 3-39 0Z" fill="${skin}" opacity=".94"/><g fill="none" stroke="#62483e" stroke-width="1.4" stroke-linecap="round"><path d="M53 53q4-3 8 0m20 0q4-3 8 0"/></g>`:p.eyes==='bright'?'<g fill="#fff9ed" opacity=".9"><circle cx="56" cy="51" r="1"/><circle cx="84" cy="51" r="1"/></g>':'';
  const accessory={none:'',birdpin:`<g data-owner-birdpin transform="translate(92 136)"><path d="M-5 1l-4 2 4 1" fill="#d6cbbb"/><ellipse cx="-1" cy="1" rx="6" ry="4.1" fill="#faf5e9" stroke="#c3b7a2" stroke-width=".65"/><path d="M-4 1q2 3 6 1" fill="none" stroke="#c9c3b8" stroke-width=".8"/><circle cx="3" cy="-1" r="2.8" fill="#f8f3e7"/><circle cx="3.8" cy="-1.7" r=".55" fill="#55483c"/><path d="M5-1.5l3 1.3L5 1Z" fill="#ce8278"/></g>`,leafbag:`<path d="M42 102l51 79" stroke="#8d785e" stroke-width="3.5" fill="none"/><path d="M87 170q15-4 17 8q-1 14-17 15q-11-9 0-23" fill="#748c69" stroke="#617b5a" stroke-width="1"/><path d="M91 174l7 13" stroke="#d5dfbe" stroke-width="1"/>`,beret:`<path d="M35 28q2-19 35-20q31 0 38 19q-24 10-73 1" fill="${trim}" stroke="#6b6251" stroke-opacity=".4"/><path d="M68 9q-1-5 4-6" fill="none" stroke="${trim}" stroke-width="3"/><path d="M41 22q26-10 53-2" fill="none" stroke="#fff7e8" opacity=".22" stroke-width="2"/>`,scarf:`<path d="M52 96q17 7 34-1l3 9q-20 9-40 0Z" fill="${trim}"/><path d="M80 101l12 23-10 4-9-24" fill="${trim}"/><path d="M78 104l9 17" stroke="#fff5df" opacity=".25" stroke-width="2"/>`}[p.accessory];
  // Skin is painted over the hair tint using pose-specific masks. The back
  // wave hides its neck, so it must not tint the hair as skin.
  const body=row=>sprite(CLOTHES,outfitIndex,row,2,80,136,136,`filter="url(#${uid}-cloth-tint)"`);
  const backHead=()=>`${head(0)}${p.hair==='wave'?'':skinLayer(0,`${uid}-neck-clip`)}`;
  const frontHead=()=>`<g transform="translate(70 0) scale(${p.face==='oval'?0.95:p.face==='soft'?1.05:1} 1) translate(-70 0)">${head(1)}${skinLayer(1,`${uid}-face-clip`)}${eyes}</g>`;
  const sideEyes=p.eyes==='smile'?`<path d="M82 47h13v12H82Z" fill="${skin}" opacity=".94"/><path d="M83 53q4-3 8 0" fill="none" stroke="#62483e" stroke-width="1.4" stroke-linecap="round"/>`:p.eyes==='bright'?'<circle cx="87" cy="51" r="1" fill="#fff9ed"/>':'';
  const sideHead=()=>`${head(2)}${skinLayer(2,`${uid}-side-clip`)}${sideEyes}`;
  const poseAccessory=(row)=>p.accessory==='beret'?accessory:`<g ${row===2?'transform="translate(-16 0)"':''}>${accessory}</g>`;
  return `<svg class="owner-peek-art ${portrait?'owner-portrait-art':''}" viewBox="0 0 140 200" ${decorative?'aria-hidden="true"':`role="img" aria-label="${esc(label)}"`} focusable="false" data-hair-color="${hair}" data-skin-color="${skin}" data-hair="${p.hair}" data-outfit="${p.outfit}" data-face="${p.face}" data-eyes="${p.eyes}"><defs>
    ${tintFilter(`${uid}-hair-tint`,hair,'#624a3e')}${tintFilter(`${uid}-skin-tint`,skin,'#e8b89c')}${tintFilter(`${uid}-cloth-tint`,cloth,'#b7c7a8')}
    <filter id="${uid}-feather"><feGaussianBlur stdDeviation="2"/></filter><mask id="${uid}-face-clip" maskUnits="userSpaceOnUse" x="0" y="0" width="140" height="200"><path d="M49 29Q70 20 91 29L96 49Q96 76 84 89L82 103H58L56 89Q44 76 44 49Z" fill="white" filter="url(#${uid}-feather)"/></mask><mask id="${uid}-side-clip" maskUnits="userSpaceOnUse" x="0" y="0" width="140" height="200"><path d="M68 30Q91 24 99 41L105 61Q103 77 89 86L85 103H60L60 83Q53 72 60 58Z" fill="white" filter="url(#${uid}-feather)"/></mask><mask id="${uid}-neck-clip" maskUnits="userSpaceOnUse" x="0" y="0" width="140" height="200"><ellipse cx="70" cy="96" rx="13" ry="10" fill="white" filter="url(#${uid}-feather)"/></mask>
  </defs>${portrait ? `<g>${frontHead()}${body(1)}${poseAccessory(1)}</g>` : `<g class="owner-peek-body"><g class="owner-peek-back">${backHead()}${body(0)}${poseAccessory(0)}</g><g class="owner-peek-glance">${sideHead()}${body(2)}${poseAccessory(2)}</g></g>`}</svg>`;
}
