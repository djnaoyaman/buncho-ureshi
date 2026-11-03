import { normalizeOwnerProfile, OWNER_CHOICES } from './owner-profile.js';

// Original modular painted sprites, with wardrobe selections applied to the
// same two views. Sources are local; no profile information leaves the device.
const HEADS=new URL('../game-art/owner-heads.webp',import.meta.url).href;
const CLOTHES=new URL('../game-art/owner-clothes.webp',import.meta.url).href;
const CELL=396.6, ROW=396.5;
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
const sprite=(src,col,row,x,y,w,h,extra='')=>`<svg x="${x}" y="${y}" width="${w}" height="${h}" viewBox="${(col*CELL).toFixed(1)} ${(row*ROW).toFixed(1)} ${CELL} ${ROW}" preserveAspectRatio="xMidYMid meet" overflow="hidden" ${extra}><image href="${src}" x="0" y="0" width="1983" height="793"/></svg>`;
export function renderOwnerPeek(value){
  const p=normalizeOwnerProfile(value);
  const hairIndex=['crop','bob','wave','bun','sweep'].indexOf(p.hair);
  const outfitIndex=['apron','cardigan','smock','dress','overalls'].indexOf(p.outfit);
  const hair=colorFor('hairColor',p.hairColor),skin=colorFor('skin',p.skin),cloth=colorFor('palette',p.palette),trim=colorFor('palette',p.palette,3);
  const head=(row)=>`<g clip-path="url(#peek-head-bounds)">${sprite(HEADS,hairIndex,row,14,2,112,112,'filter="url(#peek-hair-tint)"')}</g>`;
  // The small skin region is recoloured separately, preserving the selected
  // complexion instead of shifting it with the hair tint.
  const skinLayer=(row,mask)=>`<g mask="url(#${mask})" filter="url(#peek-skin-tint)">${sprite(HEADS,hairIndex,row,14,2,112,112)}</g>`;
  const eyes=p.eyes==='smile'?`<g fill="none" stroke="#62483e" stroke-width="1.3" stroke-linecap="round"><path d="M53 51q2-2 4 0m6 1q2-2 4 0"/></g>`:p.eyes==='bright'?'<g fill="#fff9ed" opacity=".85"><circle cx="55" cy="50" r=".7"/><circle cx="65" cy="51" r=".7"/></g>':'';
  const accessory={none:'',birdpin:`<g transform="translate(93 136)"><ellipse rx="4.8" ry="4" fill="#f9f2df" stroke="#d9c4a0" stroke-width=".8"/><path d="M3-1l5 2-5 2" fill="#cf8277"/><circle cx="1" cy="-1" r=".6" fill="#53493f"/></g>`,leafbag:`<path d="M42 102l51 79" stroke="#8d785e" stroke-width="3.5" fill="none"/><path d="M87 170q15-4 17 8q-1 14-17 15q-11-9 0-23" fill="#748c69" stroke="#617b5a" stroke-width="1"/><path d="M91 174l7 13" stroke="#d5dfbe" stroke-width="1"/>`,beret:`<path d="M35 28q2-19 35-20q31 0 38 19q-24 10-73 1" fill="${trim}" stroke="#6b6251" stroke-opacity=".4"/><path d="M68 9q-1-5 4-6" fill="none" stroke="${trim}" stroke-width="3"/><path d="M41 22q26-10 53-2" fill="none" stroke="#fff7e8" opacity=".22" stroke-width="2"/>`,scarf:`<path d="M52 96q17 7 34-1l3 9q-20 9-40 0Z" fill="${trim}"/><path d="M80 101l12 23-10 4-9-24" fill="${trim}"/><path d="M78 104l9 17" stroke="#fff5df" opacity=".25" stroke-width="2"/>`}[p.accessory];
  const faceClip=p.face==='oval'?'M47 42Q58 34 68 40Q80 47 79 65Q76 79 63 84Q50 80 45 65Z':p.face==='soft'?'M44 42Q57 32 71 40Q83 48 81 67Q77 82 62 85Q47 81 43 65Z':'M46 42Q57 34 69 40Q81 47 80 66Q76 80 62 84Q49 80 44 65Z';
  const headBounds=p.hair==='wave'?'M35 5Q67-2 104 8Q123 25 118 62L123 107H22L24 59Q19 27 35 5Z':p.hair==='bun'?'M35 6Q52-1 75 5Q101 0 112 19Q121 44 111 78L100 106H32L24 78Q19 34 35 6Z':'M34 6Q67-1 101 7Q119 20 118 54Q117 79 106 95L93 105H40L27 92Q20 65 23 42Q24 19 34 6Z';
  return `<svg class="owner-peek-art" viewBox="0 0 140 200" aria-hidden="true" focusable="false" data-hair-color="${hair}" data-skin-color="${skin}"><defs>
    ${tintFilter('peek-hair-tint',hair,'#624a3e')}${tintFilter('peek-skin-tint',skin,'#e8b89c')}${tintFilter('peek-cloth-tint',cloth,'#b7c7a8')}
    <clipPath id="peek-head-bounds"><path d="${headBounds}"/></clipPath><clipPath id="peek-body-bounds"><path d="M22 94Q33 78 69 80Q105 78 118 94L127 200H12Z"/></clipPath><filter id="peek-feather"><feGaussianBlur stdDeviation="3"/></filter><mask id="peek-face-clip" maskUnits="userSpaceOnUse" x="0" y="0" width="140" height="200"><path d="${faceClip}" fill="white" filter="url(#peek-feather)"/></mask><mask id="peek-neck-clip" maskUnits="userSpaceOnUse" x="0" y="0" width="140" height="200"><ellipse cx="69" cy="91" rx="13" ry="10" fill="white" filter="url(#peek-feather)"/></mask>
  </defs><g class="owner-peek-body"><g clip-path="url(#peek-body-bounds)">${sprite(CLOTHES,outfitIndex,0,2,75,136,136,'filter="url(#peek-cloth-tint)"')}</g>
    <g class="owner-peek-back">${head(0)}${skinLayer(0,'peek-neck-clip')}</g>
    <g class="owner-peek-glance">${head(1)}${skinLayer(1,'peek-face-clip')}${eyes}</g>${accessory}</g></svg>`;
}
