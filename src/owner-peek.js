import { normalizeOwnerProfile, OWNER_CHOICES } from './owner-profile-data.js';

// Original modular painted sprites, with wardrobe selections applied to the
// same two views. Sources are local; no profile information leaves the device.
const HEADS=new URL('../game-art/owner-heads-soft-v3.webp',import.meta.url).href;
const CLOTHES=new URL('../game-art/owner-clothes-watercolor.webp',import.meta.url).href;
const HEAD_CELL=396.6, HEAD_ROW=396.5, CLOTH_CELL=384, CLOTH_ROW=409.5;
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
const sprite=(src,col,row,x,y,w,h,extra='')=>{
  const isHead=src===HEADS,cell=isHead?HEAD_CELL:CLOTH_CELL,step=isHead?HEAD_ROW:CLOTH_ROW,iw=isHead?1983:1920,ih=isHead?793:819;
  return `<svg x="${x}" y="${y}" width="${w}" height="${h}" viewBox="${(col*cell).toFixed(1)} ${(row*step).toFixed(1)} ${cell} ${step}" preserveAspectRatio="xMidYMid meet" overflow="hidden" ${extra}><image href="${src}" x="0" y="0" width="${iw}" height="${ih}"/></svg>`;
};
export function renderOwnerPortrait(value,options={}){return renderOwnerPeek(value,{decorative:false,...options,portrait:true});}
export function renderOwnerPeek(value,{portrait=false,decorative=true,label='飼い主の試着プレビュー'}={}){
  const uid=`owner-art-${++ownerArtId}`;
  const p=normalizeOwnerProfile(value);
  const hairIndex=['crop','bob','wave','bun','sweep'].indexOf(p.hair);
  const outfitIndex=['apron','cardigan','smock','dress','overalls'].indexOf(p.outfit);
  const hair=colorFor('hairColor',p.hairColor),skin=colorFor('skin',p.skin),cloth=colorFor('palette',p.palette),trim=colorFor('palette',p.palette,3);
  const head=(row)=>`<g clip-path="url(#${uid}-head-bounds)">${sprite(HEADS,hairIndex,row,14,2,112,112,`filter="url(#${uid}-hair-tint)"`)}</g>`;
  // The small skin region is recoloured separately, preserving the selected
  // complexion instead of shifting it with the hair tint.
  const skinLayer=(row,mask)=>`<g mask="url(#${mask})" filter="url(#${uid}-skin-tint)">${sprite(HEADS,hairIndex,row,14,2,112,112)}</g>`;
  const eyes=p.eyes==='smile'?`<path d="M51 50q19-4 37 1l1 5q-19 3-38-1Z" fill="${skin}" opacity=".9"/><g fill="none" stroke="#62483e" stroke-width="1.3" stroke-linecap="round"><path d="M57 53q3-2 6 0m14 0q3-2 6 0"/></g>`:p.eyes==='bright'?'<g fill="#fff9ed" opacity=".85"><circle cx="60" cy="52" r=".7"/><circle cx="80" cy="52" r=".7"/></g>':'';
  const accessory={none:'',birdpin:`<g data-owner-birdpin transform="translate(92 136)"><path d="M-5 1l-4 2 4 1" fill="#d6cbbb"/><ellipse cx="-1" cy="1" rx="6" ry="4.1" fill="#faf5e9" stroke="#c3b7a2" stroke-width=".65"/><path d="M-4 1q2 3 6 1" fill="none" stroke="#c9c3b8" stroke-width=".8"/><circle cx="3" cy="-1" r="2.8" fill="#f8f3e7"/><circle cx="3.8" cy="-1.7" r=".55" fill="#55483c"/><path d="M5-1.5l3 1.3L5 1Z" fill="#ce8278"/></g>`,leafbag:`<path d="M42 102l51 79" stroke="#8d785e" stroke-width="3.5" fill="none"/><path d="M87 170q15-4 17 8q-1 14-17 15q-11-9 0-23" fill="#748c69" stroke="#617b5a" stroke-width="1"/><path d="M91 174l7 13" stroke="#d5dfbe" stroke-width="1"/>`,beret:`<path d="M35 28q2-19 35-20q31 0 38 19q-24 10-73 1" fill="${trim}" stroke="#6b6251" stroke-opacity=".4"/><path d="M68 9q-1-5 4-6" fill="none" stroke="${trim}" stroke-width="3"/><path d="M41 22q26-10 53-2" fill="none" stroke="#fff7e8" opacity=".22" stroke-width="2"/>`,scarf:`<path d="M52 96q17 7 34-1l3 9q-20 9-40 0Z" fill="${trim}"/><path d="M80 101l12 23-10 4-9-24" fill="${trim}"/><path d="M78 104l9 17" stroke="#fff5df" opacity=".25" stroke-width="2"/>`}[p.accessory];
  const faceClip=p.face==='oval'?'M53 27Q70 20 87 27L94 45L92 80Q83 89 83 103H57Q57 89 48 80L46 45Z':p.face==='soft'?'M50 26Q70 18 90 26L99 45L97 82Q85 91 85 104H55Q55 91 43 82L41 45Z':'M51 27Q70 20 89 27L97 45L95 81Q84 90 84 104H56Q56 90 45 81L43 45Z';
  const headBounds=p.hair==='wave'?'M35 5Q67-2 104 8Q123 25 118 62L123 107H22L24 59Q19 27 35 5Z':p.hair==='bun'?'M35 6Q52-1 75 5Q101 0 112 19Q121 44 111 78L100 106H32L24 78Q19 34 35 6Z':'M34 6Q67-1 101 7Q119 20 118 54Q117 79 106 95L93 105H40L27 92Q20 65 23 42Q24 19 34 6Z';
  // Each pose contains a complete head and garment. The garment overlaps the
  // neck, avoiding a cut edge while allowing all outfit combinations.
  const body=row=>`<path d="M48 92Q70 87 92 92L98 105Q70 111 42 105Z" fill="${cloth}"/><g clip-path="url(#${uid}-body-bounds)">${sprite(CLOTHES,outfitIndex,row,2,75,136,136,`filter="url(#${uid}-cloth-tint)"`)}</g>`;
  const backHead=()=>`${head(0)}${skinLayer(0,`${uid}-neck-clip`)}`;
  const frontHead=()=>`<g transform="translate(70 0) scale(${p.face==='oval'?0.95:p.face==='soft'?1.05:1} 1) translate(-70 0)">${head(1)}${skinLayer(1,`${uid}-face-clip`)}${eyes}</g>`;
  return `<svg class="owner-peek-art ${portrait?'owner-portrait-art':''}" viewBox="0 0 140 200" ${decorative?'aria-hidden="true"':`role="img" aria-label="${esc(label)}"`} focusable="false" data-hair-color="${hair}" data-skin-color="${skin}" data-hair="${p.hair}" data-outfit="${p.outfit}" data-face="${p.face}" data-eyes="${p.eyes}"><defs>
    ${tintFilter(`${uid}-hair-tint`,hair,'#624a3e')}${tintFilter(`${uid}-skin-tint`,skin,'#e8b89c')}${tintFilter(`${uid}-cloth-tint`,cloth,'#b7c7a8')}
    <clipPath id="${uid}-head-bounds"><path d="${headBounds}"/></clipPath><clipPath id="${uid}-body-bounds"><path d="M22 94Q33 78 69 80Q105 78 118 94L127 200H12Z"/></clipPath><filter id="${uid}-feather"><feGaussianBlur stdDeviation="3"/></filter><mask id="${uid}-face-clip" maskUnits="userSpaceOnUse" x="0" y="0" width="140" height="200"><path d="${faceClip}" fill="white" filter="url(#${uid}-feather)"/></mask><mask id="${uid}-neck-clip" maskUnits="userSpaceOnUse" x="0" y="0" width="140" height="200"><ellipse cx="69" cy="91" rx="13" ry="10" fill="white" filter="url(#${uid}-feather)"/></mask>
  </defs>${portrait ? `<g>${frontHead()}${body(1)}${accessory}</g>` : `<g class="owner-peek-body"><g class="owner-peek-back">${backHead()}${body(0)}${accessory}</g><g class="owner-peek-glance">${frontHead()}${body(1)}${accessory}</g></g>`}</svg>`;
}
