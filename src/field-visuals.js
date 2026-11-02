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
  const finish=tier>=3?'#c79b48':'#fff8df';
  const patterns={
    perch:`<path d="M19 65q8-9 16 0t16 0t16 0t16 0" fill="none" stroke="${finish}" stroke-width="2"/>`,
    feed:`<path d="M26 68q24 12 48 0" fill="none" stroke="${finish}" stroke-width="3"/><path d="M37 60l4 5 4-5m10 0 4 5 4-5" fill="none" stroke="${finish}" stroke-width="2"/>`,
    bath:`<path d="M20 65q30 18 60 0" fill="none" stroke="${finish}" stroke-width="3"/>`,
    water:`<path d="M32 74h36M35 15h30" stroke="${finish}" stroke-width="2"/>`,
    greens:`<path d="M34 74q16 12 32 0" fill="none" stroke="${finish}" stroke-width="3"/>`,
    shellgrit:`<path d="M28 70q22 12 44 0" fill="none" stroke="${finish}" stroke-width="3"/>`,
    swing:`<path d="M29 61V40a21 21 0 0142 0v21" fill="none" stroke="${finish}" stroke-width="2"/><path d="M22 73h56" stroke="${finish}" stroke-width="2"/>`,
    toy:`<circle cx="50" cy="29" r="8" stroke="${finish}" stroke-width="2" fill="none"/><path d="M42 60h16" stroke="${finish}" stroke-width="2"/>`,
    paper:`<path d="M22 56q8-12 16 0t16 0t16 0M25 66h49" fill="none" stroke="${finish}" stroke-width="2"/>`,
  };
  const flourish=tier>=2?(patterns[slot]||''):'';
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
  const anchors=[[.20,upper],[.40,upper],[.60,upper],[.78,upper],[.27,middle],[.47,middle],[.67,middle],...(young.length?[[.80,.79]]:[[.83,middle]]),[.21,.79],[.40,park?.76:.79],[.59,park?.76:.79],...(young.length?[[.83,middle]]:[[.80,.79]])];
  mature.slice(0,12).forEach((b,i)=>{const a=mature.length===1?anchors[9]:anchors[i];positions.set(b.id,{id:`field-contact-${i}`,x:a[0],y:a[1],width:mature.length===1?(tall?.24:.17):(tall?.16:.105),depth:1,zone:b.action.kind,interactive:true});});
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
 const key=`scene-${slot}-${color.slice(1)}-${tier}`,gold=tier===3?'#bd9755':'#f2e8cc';
 const defs=`<defs><linearGradient id="${key}-glaze" x1="0" y1="0" x2=".15" y2="1"><stop stop-color="#fff9e8"/><stop offset=".25" stop-color="${color}"/><stop offset=".72" stop-color="${color}"/><stop offset="1" stop-color="#857d62"/></linearGradient><linearGradient id="${key}-wood" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#ede2b8"/><stop offset=".3" stop-color="${color}"/><stop offset=".65" stop-color="${color}"/><stop offset="1" stop-color="#79715a"/></linearGradient><radialGradient id="${key}-water"><stop stop-color="#c5e8de"/><stop offset=".8" stop-color="#8bbac0"/><stop offset="1" stop-color="#71999e"/></radialGradient><radialGradient id="${key}-shadow"><stop stop-color="#756047" stop-opacity=".25"/><stop offset="1" stop-color="#756047" stop-opacity="0"/></radialGradient></defs>`;
 const trim=(y,width=47)=>tier>1?`<path d="M${50-width/2} ${y}q${width/2} 10 ${width} 0" stroke="${gold}" stroke-width="1.6" fill="none"/><path d="M38 ${y-6}q3-5 6 0t6 0t6 0t6 0" stroke="${gold}" stroke-width="1" fill="none"/>`:'';
 const bowl=(top=47,rx=35,ry=11,bottom=77,inside='#ddcda5',contents='')=>`<ellipse cx="50" cy="${bottom+3}" rx="${rx+5}" ry="9" fill="url(#${key}-shadow)"/><path d="M${50-rx} ${top}Q${51-rx} ${bottom-7} ${50-rx*.67} ${bottom}Q50 ${bottom+9} ${50+rx*.67} ${bottom}Q${49+rx} ${bottom-7} ${50+rx} ${top}Z" fill="url(#${key}-glaze)" stroke="#9e987c" stroke-width=".7"/><path d="M${50-rx*.63} ${bottom}Q50 ${bottom+7} ${50+rx*.63} ${bottom}" fill="none" stroke="#827a61" stroke-width="1.2"/><ellipse cx="50" cy="${top}" rx="${rx}" ry="${ry}" fill="#f0e7d0" stroke="#a59e85" stroke-width=".65"/><ellipse cx="50" cy="${top+1}" rx="${rx-4}" ry="${ry-3}" fill="${inside}"/><path d="M${54-rx} ${top}Q50 ${top-ry+1} ${46+rx} ${top}" fill="none" stroke="#fff9e8" stroke-width="1.2"/>${contents}${trim(bottom-8,rx*1.3)}<path d="M${54-rx} ${top+8}q2 10 7 15" stroke="#fff8dd" stroke-opacity=".5" stroke-width="2" fill="none"/>`;
 const grains=(y,fill)=>[[-22,-1],[-15,3],[-7,-3],[2,2],[13,-3],[23,1],[-2,6],[15,5]].map(([x,z],i)=>`<path d="M${50+x} ${y+z}q${2+i%2} -3 5 0-2 3-5 0" fill="${fill}" stroke="#a8966d" stroke-width=".4"/>`).join('');
 const shapes={
 feed:bowl(47,35,11,77,'#e6d7ac',grains(47,'#baa16f')),
 shellgrit:bowl(53,30,9,77,'#e9e3cf',grains(53,'#d0c6ab')),
 bath:bowl(47,43,15,73,`url(#${key}-water)`,`<path d="M24 45q10-5 21-2m7 7q13 4 24-3" fill="none" stroke="#f0f9ee" stroke-width="1.8"/><ellipse cx="50" cy="48" rx="24" ry="5" fill="none" stroke="#e8f2e7" stroke-opacity=".5"/>`),
 greens:`<path d="M49 66Q18 46 26 20Q47 19 50 58Q43 23 65 12Q85 30 58 65Q65 31 85 32Q92 52 62 69" fill="#8ba777" stroke="#6d865a" stroke-width="1.2"/><path d="M50 67L29 26m22 37 15-44m-8 48 23-30M35 41l9-5m17 2 10 1" fill="none" stroke="#d7dd9e" stroke-width="1"/>${bowl(66,25,7,84,'#77895a')}`,
 water:`<ellipse cx="50" cy="84" rx="29" ry="6" fill="url(#${key}-shadow)"/><path d="M34 17Q50 11 66 17v50H34Z" fill="#d2e2d9" fill-opacity=".8" stroke="#9db4a8" stroke-width="1"/><path d="M36 38Q50 42 64 38v28H36Z" fill="url(#${key}-water)"/><ellipse cx="50" cy="38" rx="14" ry="3" fill="#c2dfd7"/><path d="M39 21v40m5-38v8" stroke="#fffbed" stroke-width="2" fill="none"/><path d="M31 14Q50 6 69 14v6Q50 25 31 20Z" fill="url(#${key}-wood)" stroke="#9c9878" stroke-width=".6"/>${bowl(69,25,7,82,`url(#${key}-water)`)}${tier>1?`<path d="M35 16h30" stroke="${gold}" fill="none"/>`:''}`,
 swing:`<path d="M50 0v13M23 71V40a27 27 0 0154 0v31" stroke="#a39170" stroke-width="4" fill="none"/><path d="M24 66V40a26 26 0 0152 0v26" stroke="#ded0a6" stroke-width="1.2" fill="none"/><rect x="14" y="68" width="72" height="11" rx="5.5" fill="url(#${key}-wood)" stroke="#8b8165" stroke-width=".65"/><path d="M19 72h62m-58 3q25-3 52 0" stroke="#e7dbad" stroke-opacity=".65" fill="none"/>${tier>1?`<path d="M31 73q5-6 10 0t10 0t10 0t10 0" stroke="${gold}" fill="none" stroke-width="1"/>`:''}`,
 toy:`<path d="M50 0v86" stroke="#a1916b" stroke-width="2"/><circle cx="50" cy="28" r="12" fill="url(#${key}-wood)" stroke="#918368" stroke-width=".7"/><path d="M50 46l14 13-14 14-14-14Z" fill="#d6ad94" stroke="#a68c74" stroke-width=".7"/><path d="M39 81q11-16 22 0q-11 5-22 0" fill="#d6b67a" stroke="#ab905e" stroke-width=".7"/><path d="M43 26q7-6 14 0m-14 33 7-7" stroke="#fff0cd" stroke-width="1" fill="none"/>${tier>1?`<circle cx="50" cy="28" r="7" fill="none" stroke="${gold}" stroke-width="1"/>`:''}`,
 };
 if(slot==='paper')return `<svg viewBox="0 0 300 60" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="${key}-paper" x2="0" y2="1"><stop stop-color="#f6efdb"/><stop offset="1" stop-color="${color}"/></linearGradient></defs><path d="M35 2h230l33 55H2Z" fill="url(#${key}-paper)" stroke="#baad8d" stroke-width="1"/><path d="M43 8h214l26 42H17Z" fill="none" stroke="#fff7e3" stroke-width="1" opacity=".7"/>${tier>1?`<path d="M53 28q10-9 20 0t20 0t20 0t20 0t20 0t20 0t20 0t20 0t20 0" fill="none" stroke="${gold}" stroke-width="1.5"/>`:''}</svg>`;
 if(slot==='perch')return `<svg viewBox="0 0 200 20" xmlns="http://www.w3.org/2000/svg">${defs}<rect x="1" y="1" width="198" height="18" rx="8" fill="url(#${key}-wood)" stroke="#96866a" stroke-width=".8"/><path d="M8 5q40-2 80 0t104 0M8 13q35-3 70 0t115 0m-150-4q18-3 34 0m30 6q20-3 44-1" stroke="#655b40" stroke-opacity=".22" stroke-width=".65" fill="none"/><path d="M9 3h181" stroke="#fff3d5" stroke-opacity=".6" fill="none"/>${tier>1?`<path d="M20 10q8-6 16 0t16 0t16 0t16 0t16 0t16 0t16 0t16 0t16 0t16 0" stroke="${gold}" stroke-width=".8" fill="none"/>`:''}</svg>`;
 return `<svg viewBox="0 0 100 100" aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg">${defs}${shapes[slot]||shapes.toy}</svg>`;
}
