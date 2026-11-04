import { furnitureMaterials, styleArtwork } from './furniture-styles.js';
import { furnitureFormIndex, formArtwork } from './furniture-forms.js';
export { furnitureFormName, furnitureFormIndex, FURNITURE_FORMS } from './furniture-forms.js';
/** Original vector furnishings: their color/finish comes from the owned item,
 * never from a filter over the bird. All text stays in accessible HTML. */
export function furnitureSvg(slot, color='#a6c6b2', tier=1) {
  if(!['perch','feed','water','bath','greens','shellgrit','swing','toy','paper'].includes(slot))slot='toy';
  // A small product illustration, not a flat menu glyph. Geometry and material
  // are drawn separately: thick rims, recessed contents, a foot and reflected light.
  const c=/^#[0-9a-f]{6}$/i.test(color)?color:'#a6c6b2';
  const mix=(hex,to,t)=>'#'+[1,3,5].map(i=>Math.round(parseInt(hex.slice(i,i+2),16)*(1-t)+parseInt(('#'+to.replace('#','')).slice(i,i+2),16)*t).toString(16).padStart(2,'0')).join('');
  const level=Math.max(1,Math.min(3,Number(tier)||1));
  const material=furnitureMaterials(furnitureFormIndex(c),c,level),body=material.body;
  const pale=mix(body,'fffbed',level===2?.35:.63),deep=mix(body,level===3?'775119':'40564b',.43),edge=material.edge||mix(c,'79664e',.36),ivory=material.rim;
  const id=`atelier-${String(slot).replace(/[^a-z]/g,'')}-${c.slice(1)}-${level}`;
  const g=n=>`url(#${id}-${n})`;
  const defs=`<defs>
    <linearGradient id="${id}-glaze" x1="0" y1="0" x2=".82" y2="1"><stop stop-color="${ivory}"/><stop offset=".18" stop-color="${pale}"/><stop offset=".5" stop-color="${body}"/><stop offset=".83" stop-color="${deep}"/><stop offset="1" stop-color="${pale}"/></linearGradient>
    <linearGradient id="${id}-rim" x1="0" y1="0" x2="0" y2="1"><stop stop-color="${ivory}"/><stop offset=".45" stop-color="${pale}"/><stop offset="1" stop-color="${edge}"/></linearGradient>
    <linearGradient id="${id}-inner" x1="0" y1="0" x2="0" y2="1"><stop stop-color="${deep}"/><stop offset=".65" stop-color="${body}"/><stop offset="1" stop-color="${ivory}"/></linearGradient>
    <linearGradient id="${id}-water" x1=".2" y1="0" x2=".7" y2="1"><stop stop-color="#739fa3"/><stop offset=".45" stop-color="#a9d8d4"/><stop offset="1" stop-color="#e1eee1"/></linearGradient>
    <linearGradient id="${id}-glass" x1="0" y1="0" x2="1" y2=".1"><stop stop-color="#81aaa0" stop-opacity=".65"/><stop offset=".18" stop-color="#f5fff3" stop-opacity=".8"/><stop offset=".35" stop-color="#e4f1e7" stop-opacity=".4"/><stop offset=".75" stop-color="#b3d2c9" stop-opacity=".5"/><stop offset="1" stop-color="#6f9990" stop-opacity=".75"/></linearGradient>
    <linearGradient id="${id}-wood" x1="0" y1="0" x2=".12" y2="1"><stop stop-color="${material.wood[0]}"/><stop offset=".22" stop-color="${material.wood[1]}"/><stop offset=".55" stop-color="${material.wood[2]}"/><stop offset=".84" stop-color="${material.wood[3]}"/><stop offset="1" stop-color="${material.wood[4]}"/></linearGradient>
    <radialGradient id="${id}-shade"><stop stop-color="#6d6049" stop-opacity=".24"/><stop offset=".55" stop-color="#827054" stop-opacity=".1"/><stop offset="1" stop-color="#827054" stop-opacity="0"/></radialGradient>
    <linearGradient id="${id}-gold" x1="0" y1="0" x2=".75" y2="1"><stop stop-color="#f4deb0"/><stop offset=".4" stop-color="#b89454"/><stop offset=".7" stop-color="#e1c48b"/><stop offset="1" stop-color="#967342"/></linearGradient>
    <linearGradient id="${id}-leaf" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#c2cf89"/><stop offset=".45" stop-color="#8aa769"/><stop offset="1" stop-color="#4f7950"/></linearGradient>
    <linearGradient id="${id}-paper" x1="0" y1="0" x2=".4" y2="1"><stop stop-color="${ivory}"/><stop offset=".55" stop-color="${pale}"/><stop offset="1" stop-color="${body}"/></linearGradient>
  </defs>`;
  const shadow=(cx=100,cy=145,rx=78,ry=17)=>`<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${g('shade')}"/>`;
  const leafPattern=(y,width=102)=>level>1?`<g fill="none" stroke="${level===3?'#cfb073':ivory}" stroke-width="1.25" opacity=".9"><path d="M${100-width/2} ${y}q${width/2} 19 ${width} 0"/>${[-32,-16,0,16,32].map((x,i)=>`<path d="M${100+x} ${y+8-Math.abs(x)*.1}q-7-3-5-8q7 1 7 7m-2 1q7-2 6-7q-6 0-6 6"/>`).join('')}${level===3?`<path d="M${100-width/2} ${y+14}q${width/2} 18 ${width} 0" stroke-width="1.8"/>`:''}</g>`:'';
  const bowl=(kind,rx=70,top=82,bottom=140)=>{
    const wall=level===2?`M${100-rx} ${top}L${100-rx*.76} ${bottom-4}Q100 ${bottom+12} ${100+rx*.76} ${bottom-4}L${100+rx} ${top}Z`:`M${100-rx} ${top}C${103-rx} ${bottom-12} ${100-rx*.62} ${bottom+2} 100 ${bottom+2}S${197-(100-rx)} ${bottom-12} ${100+rx} ${top}Z`;
    const inner=kind==='bath'?g('water'):kind==='feed'?'#dfc99a':kind==='greens'?'#5e7650':'#e6dfc7';
      // Explicit symmetric curves retain the rounded vessel wall at any size.
    return `${shadow(100,bottom+8,rx+15,14)}<ellipse cx="100" cy="${bottom+2}" rx="${rx*.5}" ry="7" fill="${deep}" stroke="${edge}" stroke-width=".8"/><path d="${wall}" fill="${g('glaze')}" stroke="${edge}" stroke-width="1"/>
    <clipPath id="${id}-${kind}-wall"><path d="${wall}"/></clipPath><g clip-path="url(#${id}-${kind}-wall)" opacity=".22">${Array.from({length:78},(_,i)=>{const x=100-rx+(i*37.17)%(rx*2),y=top+10+(i*13.47)%(bottom-top);return `<ellipse cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" rx="${.22+i%3*.12}" ry="${.15+i%2*.11}" fill="${i%3===0?ivory:edge}"/>`;}).join('')}</g>
    <path d="M${107-rx} ${top+14}Q${111-rx} ${bottom-14} ${100-rx*.54} ${bottom-7}" fill="none" stroke="${ivory}" stroke-opacity=".65" stroke-width="3" stroke-linecap="round"/>
    <ellipse cx="100" cy="${top}" rx="${rx}" ry="${rx*.29}" fill="${g('rim')}" stroke="${edge}" stroke-width=".8"/>
    <ellipse cx="100" cy="${top}" rx="${rx-6}" ry="${rx*.29-5}" fill="${g('inner')}"/>
    <ellipse cx="100" cy="${top+3}" rx="${rx-11}" ry="${rx*.29-8}" fill="${inner}"/>
    ${kind==='bath'?`<path d="M${115-rx} ${top+3}q${rx*.4} 10 ${rx*.75} 2m9 0q18-1 28-6" fill="none" stroke="#f5fff0" stroke-width="1.2" opacity=".8"/><ellipse cx="110" cy="${top+4}" rx="23" ry="4" fill="none" stroke="#eaf7ed" stroke-width=".8"/><path d="M62 ${top-2}q12-5 25-3" fill="none" stroke="#fffef0" stroke-width="1.5" stroke-linecap="round"/>`:''}
    ${kind==='feed'?Array.from({length:36},(_,i)=>{const a=i*2.399,r=Math.sqrt(i/36);const x=100+Math.cos(a)*r*(rx-15),y=top+3+Math.sin(a)*r*(rx*.29-10);return `<ellipse cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" rx="${2+i%3*.5}" ry="${1.2+i%2*.4}" transform="rotate(${i*23} ${x.toFixed(2)} ${y.toFixed(2)})" fill="${['#b89355','#f5e4b6','#c7aa71','#968151'][i%4]}" stroke="#a68a5e" stroke-width=".35"/>`;}).join(''):''}
    ${kind==='shellgrit'?Array.from({length:23},(_,i)=>{const a=i*2.399,r=Math.sqrt(i/23),x=100+Math.cos(a)*r*(rx-15),y=top+3+Math.sin(a)*r*(rx*.29-10);return `<path d="M${x} ${y}l${-3-i%3} -2 2 -3 5 1 1 3z" fill="${['#f8f3df','#c6bda1','#e8dfc3'][i%3]}" stroke="#b6ac8d" stroke-width=".45"/>`;}).join(''):''}
    <path d="M${104-rx} ${top-2}C${123-rx} ${top-rx*.32} ${77+rx} ${top-rx*.32} ${96+rx} ${top-2}" fill="none" stroke="${ivory}" stroke-width="2" opacity=".9"/>
    ${level===2?`<path d="M${100-rx*.79} ${bottom-11}Q100 ${bottom+1} ${100+rx*.79} ${bottom-11}" fill="none" stroke="${g('wood')}" stroke-width="8"/>`:leafPattern(bottom-23,rx*1.45)}${level===3?`<ellipse cx="100" cy="${top}" rx="${rx-2}" ry="${rx*.29-1.5}" fill="none" stroke="${g('gold')}" stroke-width="1.4"/>`:''}`;
  };
  const woodGrain=(y=105)=>`<g fill="none" stroke="#805d36" stroke-opacity=".34" stroke-width=".8"><path d="M27 ${y}q28-6 60-2t84-2M26 ${y+6}q25-5 44-2m33-3q24 3 61-1M32 ${y+12}q26-5 56-1t70-5"/><ellipse cx="81" cy="${y+4}" rx="9" ry="2"/><ellipse cx="81" cy="${y+4}" rx="4" ry=".8"/></g>`;
  const accent=g('glaze');
  return `<svg viewBox="0 0 200 180" aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg" data-item-art="atelier-v3" data-form="${furnitureFormIndex(c)}">${defs}${styleArtwork(slot,furnitureFormIndex(c),level,formArtwork(slot,furnitureFormIndex(c),level,{g,c:body,pale,deep,edge,ivory},{bowl,shadow}),{g,c:body,ivory})}</svg>`;
}

/** Twelve intentional foot contacts, not population-dependent rows. Visible
 * perches below provide an exact physical support on both scene backgrounds. */
export function fieldPositions(birds,variant='wide',place='home') {
  const tall=variant==='tall',park=place==='park',positions=new Map();
  let mature=birds.filter(b=>!['egg','chick'].includes(b.stage));
  const paired=[],used=new Set();
  for(const b of mature){const other=mature.find(o=>o.id===b.action.target&&o.action.kind===b.action.kind&&['play','bath'].includes(b.action.kind)&&o.action.startedTick===b.action.startedTick);if(other&&!used.has(b.id)&&!used.has(other.id)){paired.push(b,other);used.add(b.id);used.add(other.id);}}
  mature=[...paired,...mature.filter(b=>!used.has(b.id))];
  const young=birds.filter(b=>['egg','chick'].includes(b.stage));
  const upper=park?(tall?.274:.311):(tall?.371:.379),middle=park?(tall?.451:.501):(tall?.552:.581);
  const lower=tall?[.22,.39,.56,.73]:[.29,.435,.58,.725];
  const anchors=[[.20,upper],[.40,upper],[.60,upper],[.78,upper],...lower.map(x=>[x,middle]),[.21,.79],[.40,park?.76:.79],[.59,park?.76:.79],[.80,.79]];
  // Legacy saves may retain ten residents alongside the new six guest slots.
  const contacts=mature.length>12?Array.from({length:mature.length},(_,i)=>[.15+(i%4)*.23,(tall?.33:.32)+Math.floor(i/4)*.155]):anchors;
  mature.forEach((b,i)=>{const a=mature.length===1?contacts[9]:contacts[i];positions.set(b.id,{id:`field-contact-${i}`,x:a[0],y:a[1],width:mature.length===1?(tall?.24:.17):(tall?.16:.105),depth:1,zone:b.action.kind,interactive:true});});
  const nestY=tall?.590:.635,columns=Math.min(4,Math.max(2,young.length)),rows=Math.ceil(young.length/columns)||1;
  const stepX=.14/(columns+1),stepY=.065/rows;
  const youngWidth=Math.min(tall?.038:.03,stepX*.8,stepY*.85/(tall?.75:1.6)*.75);
  young.forEach((b,i)=>{const row=Math.floor(i/columns),count=Math.min(columns,young.length-row*columns);positions.set(b.id,{id:`nest-${i}`,x:.87+(i%columns-(count-1)/2)*stepX,y:nestY+(row-(rows-1)/2)*stepY,width:youngWidth*(b.stage==='egg'?.8:1),depth:1,zone:'nest',interactive:false});});
  return positions;
}

/** A friend's room has its own repeatable taste, not a recolor of the player. */
export function friendFurnishing(host,slot,colors,tiers) {
  const identity=Number(host.id.slice(1))+Math.round(host.personality.curiosity)+Math.round(host.personality.sociability);
  const detail=[...slot].reduce((n,c)=>n+c.charCodeAt(0),0);
  const color=colors[(identity+detail%3)%colors.length].id;
  const tier=tiers[(identity+detail)%tiers.length].id;
  return {id:`friend-${host.id}-${slot}-${color}-${tier}`,slot,color,tier};
}

/** World-only, softly shaded materials. The inventory uses the simpler icon
 * vocabulary; these vessels have an elliptical rim, inner wall and contact base. */
export function furnitureSceneSvg(slot,color='#8fbea6',tier=1){
 const svg=furnitureSvg(slot,color,tier);
 const box=slot==='perch'?'0 55 200 120':slot==='paper'?'0 32 200 125':'0 0 200 170';
 return svg.replace('viewBox="0 0 200 180"',`viewBox="${box}"`).replace('data-item-art="atelier-v3"','data-item-art="atelier-v3" data-scene-art="true"');
}
