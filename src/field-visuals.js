/** Original vector furnishings: their color/finish comes from the owned item,
 * never from a filter over the bird. All text stays in accessible HTML. */
export function furnitureSvg(slot, color='#a6c6b2', tier=1) {
  const ink='#786750', light='#fffaf0';
  const shapes={
    perch:`<path d="M10 67Q48 57 91 65" fill="none" stroke="${color}" stroke-width="15"/><path d="M21 61l8-13m41 14 9-12" fill="none" stroke="${color}" stroke-width="7"/><path d="M12 65q40-8 77 1" fill="none" stroke="${light}" stroke-width="2"/>`,
    feed:`<ellipse cx="50" cy="75" rx="36" ry="8" fill="#78675020"/><path d="M15 47h70l-9 27Q50 86 24 74z" fill="${color}"/><ellipse cx="50" cy="47" rx="35" ry="12" fill="#f1ddaf"/>${[24,37,50,63,76,31,44,57,69].map((x,i)=>`<ellipse cx="${x}" cy="${43+i%3*5}" rx="3" ry="2" fill="#b99559"/>`).join('')}`,
    water:`<path d="M32 15q18-8 36 0v51H32z" fill="#d5e6df"/><path d="M35 34h30v30H35z" fill="#83b9bf"/><rect x="29" y="10" width="42" height="10" rx="5" fill="${color}"/><path d="M25 63h50l-5 17H30z" fill="${color}"/><path d="M42 20v33" stroke="white" stroke-width="4" opacity=".8"/>`,
    bath:`<ellipse cx="50" cy="76" rx="44" ry="10" fill="#78675020"/><path d="M7 48q43-22 86 0l-8 22Q50 92 15 70z" fill="${color}"/><ellipse cx="50" cy="47" rx="43" ry="16" fill="#99cdd0"/><path d="M24 45q12-7 25-3m7 10q12 4 22-2" stroke="${light}" stroke-width="3" fill="none"/>`,
    greens:`<path d="M34 62Q12 34 27 20q25 5 23 35M50 59q-7-40 14-49 20 27-8 53M57 64q7-35 30-31 1 29-26 37" fill="#80a66b" stroke="#5d8655" stroke-width="2"/><path d="M25 60h51l-7 25H32z" fill="${color}"/>`,
    shellgrit:`<path d="M17 53h66l-9 24Q50 88 26 77z" fill="${color}"/><ellipse cx="50" cy="53" rx="33" ry="11" fill="#f2ead9"/>${[26,39,51,64,76].map((x,i)=>`<path d="M${x} ${50+i%2*5}l4-4 3 5z" fill="#c4b895"/>`).join('')}`,
    swing:`<path d="M50 7v13M23 72V40a27 27 0 0154 0v32" stroke="${ink}" stroke-width="4" fill="none"/><rect x="15" y="67" width="70" height="12" rx="6" fill="${color}"/><circle cx="50" cy="8" r="5" fill="${color}"/>`,
    toy:`<path d="M50 9v65" stroke="${ink}" stroke-width="3"/><circle cx="50" cy="29" r="13" fill="${color}"/><path d="M50 46l16 14-16 14-16-14z" fill="#e8b0a1"/><path d="M37 82q13-17 26 0z" fill="#dfbd70"/><circle cx="50" cy="85" r="3" fill="${ink}"/>`,
    paper:`<path d="M12 24h70l9 53H20z" fill="${color}"/><path d="M12 24l8 53h71L79 84H9z" fill="#f5eedb" stroke="${ink}" stroke-width="1"/>${[30,46,62].map(x=>`<path d="M${x} 41q7-10 14 0-7 10-14 0" fill="${light}" opacity=".8"/>`).join('')}`,
  };
  const materialId='finish-'+slot+'-'+color.replace('#','')+'-'+tier;
  const flourish=tier>=3?`<path d="m82 12 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1z" fill="#dfb85c"/>`:tier>=2?'<path d="M78 19q10-12 15 0-7 11-15 0" fill="#f3d5bb"/>':'';
  return `<svg viewBox="0 0 100 100" aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="${materialId}" x1="0" y1="0" x2=".2" y2="1"><stop stop-color="${light}" stop-opacity=".65"/><stop offset=".4" stop-color="${color}"/><stop offset="1" stop-color="${ink}" stop-opacity=".32"/></linearGradient></defs>${(shapes[slot]||shapes.toy).replaceAll(`fill="${color}"`,`fill="url(#${materialId})" stroke="${color}" stroke-width="1.2"`)}${flourish}</svg>`;
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
  const anchors=[[.20,upper],[.40,upper],[.60,upper],[.78,upper],[.27,middle],[.47,middle],[.67,middle],[.80,.79],[.21,.79],[.40,park?.76:.79],[.59,park?.76:.79],[.83,middle]];
  mature.slice(0,12).forEach((b,i)=>{const a=mature.length===1?anchors[9]:anchors[i];positions.set(b.id,{id:`field-contact-${i}`,x:a[0],y:a[1],width:mature.length===1?(tall?.24:.17):(tall?.16:.105),depth:1,zone:b.action.kind,interactive:true});});
  const nestY=tall?.590:.635;
  young.forEach((b,i)=>positions.set(b.id,{id:`nest-${i}`,x:.833+(i%4)*.023,y:nestY+Math.floor(i/4)*.019,width:tall?.032:.026,depth:1,zone:'nest',interactive:false}));
  return positions;
}
