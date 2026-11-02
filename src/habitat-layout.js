/** Normalized physical foot-contact anchors, to tune against final habitat pixels.
 * These are not CSS grid cells. Every point belongs to a branch, nest, or ground.
 * Image assets must be visually reviewed with these anchors before publication.
 */
export const HABITAT_ANCHORS = Object.freeze({
  wide: Object.freeze([
    {id:'branch-upper-left',x:.24,y:.151,depth:.63,zone:'rest'},
    {id:'branch-upper-middle',x:.49,y:.177,depth:.68,zone:'rest'},
    {id:'branch-upper-right',x:.76,y:.185,depth:.69,zone:'explore'},
    {id:'branch-middle-left',x:.20,y:.416,depth:.82,zone:'talk'},
    {id:'branch-middle-center',x:.46,y:.475,depth:.86,zone:'play'},
    {id:'branch-middle-right',x:.73,y:.505,depth:.87,zone:'nest'},
    {id:'root-left',x:.23,y:.638,depth:.92,zone:'explore'},
    {id:'root-center',x:.52,y:.692,depth:.95,zone:'rest'},
    {id:'food-ground',x:.10,y:.893,depth:1.02,zone:'eat'},
    {id:'bath-back-rim',x:.86,y:.750,depth:1.00,zone:'bath'},
  ]),
  tall: Object.freeze([
    {id:'branch-upper-left',x:.20,y:.247,depth:.76,zone:'rest'},
    {id:'branch-upper-middle',x:.51,y:.275,depth:.78,zone:'rest'},
    {id:'branch-upper-right',x:.82,y:.287,depth:.79,zone:'explore'},
    {id:'branch-middle-left',x:.19,y:.466,depth:.86,zone:'talk'},
    {id:'branch-middle-center',x:.49,y:.539,depth:.88,zone:'play'},
    {id:'branch-middle-right',x:.80,y:.592,depth:.90,zone:'nest'},
    {id:'root-left',x:.28,y:.653,depth:.94,zone:'explore'},
    {id:'root-center',x:.58,y:.730,depth:.96,zone:'rest'},
    {id:'food-ground',x:.16,y:.895,depth:1.00,zone:'eat'},
    {id:'bath-back-rim',x:.82,y:.800,depth:1.00,zone:'bath'},
  ]),
});
// These centers/areas were read from the generated habitat pixels: the nest is
// on the RIGHT, not the old prompt's unrendered center-bottom proposal.
export const HABITAT_NEST = Object.freeze({
  wide:{x:.84,y:.421,width:.18,height:.075},
  tall:{x:.86,y:.489,width:.22,height:.070},
});
// Normalized asset-plane contact point. Root should adjust to approved pixels,
// not resize/warp a bird to force it onto a perch.
export const SPRITE_CONTACT = Object.freeze({x:.54,y:.975,aspect:.85});
export const HABITAT_ZONES = Object.freeze({
  wide:{rest:[.49,.18],explore:[.24,.64],talk:[.2,.416],play:[.46,.475],nest:[.84,.421],eat:[.1,.893],bath:[.86,.75],visit:[.76,.185]},
  tall:{rest:[.51,.275],explore:[.28,.653],talk:[.19,.466],play:[.49,.539],nest:[.86,.489],eat:[.16,.895],bath:[.82,.8],visit:[.82,.287]},
});
const compareBirdIds = (a,b) => a.localeCompare(b,'en',{numeric:true});
function currentEncounters(birds) {
  const mature=birds.filter(b=>['juvenile','adult'].includes(b.stage));
  const byId=new Map(mature.map(b=>[b.id,b])),seen=new Set(),candidates=[];
  for(const bird of mature) {
    const other=byId.get(bird.action.target);
    // A non-null target can outlive a refusal or the recipient's next action.
    // Only an overlapping current social action counts as a physical encounter;
    // never pull a sleeping/eating/nesting bird or absent visitor into one.
    // In this engine, a targeted `talk` action means a declined invitation, not
    // a mutually accepted exchange. Successful social actions are play/bath.
    if(!other||other===bird||!['play','bath'].includes(bird.action.kind)||
       bird.action.kind!==other.action.kind||!Number.isSafeInteger(bird.action.startedTick)||
       bird.action.startedTick<0||bird.action.startedTick!==other.action.startedTick)continue;
    const pair=[bird,other].sort((a,b)=>compareBirdIds(a.id,b.id)),key=pair.map(b=>b.id).join(':');
    if(seen.has(key))continue;
    seen.add(key);candidates.push({pair,reciprocal:other.action.target===bird.id});
  }
  // Reciprocal encounters take priority over one-way chains. A bird participates
  // in at most one visible pair; competing requests resolve by immutable IDs.
  candidates.sort((a,b)=>Number(b.reciprocal)-Number(a.reciprocal)||compareBirdIds(a.pair[0].id,b.pair[0].id)||compareBirdIds(a.pair[1].id,b.pair[1].id));
  const used=new Set(),pairs=[];
  for(const {pair} of candidates)if(pair.every(b=>!used.has(b.id))){pairs.push(pair);pair.forEach(b=>used.add(b.id));}
  return pairs;
}
function encounterAnchors(pairs,anchors,variant) {
  if(!pairs.length)return [];
  const aspect=variant==='tall'?.75:1.6;
  const distance=(a,b)=>Math.hypot(a.x-b.x,(a.y-b.y)/aspect);
  const preference=(anchor,bird)=>{
    const goal=HABITAT_ZONES[variant][bird.action.kind];
    return distance(anchor,{x:goal[0],y:goal[1]})-(anchor.zone===bird.action.kind?.22:0);
  };
  // At most ten fixed anchors / five encounters: a small memoized assignment
  // avoids leaving the final pair on opposite corners after greedy allocation.
  // Existing reviewed coordinates and sprite geometry are never changed.
  const memo=new Map();
  function choose(index,mask) {
    if(index===pairs.length)return {score:0,slots:[]};
    if(memo.has(mask))return memo.get(mask);
    let best;
    for(let i=0;i<anchors.length;i++)if(!(mask&(1<<i)))for(let j=i+1;j<anchors.length;j++)if(!(mask&(1<<j))){
      const rest=choose(index+1,mask|(1<<i)|(1<<j));
      const score=4*distance(anchors[i],anchors[j])+.2*(preference(anchors[i],pairs[index][0])+preference(anchors[j],pairs[index][1]))+rest.score;
      if(!best||score<best.score-1e-10)best={score,slots:[[i,j],...rest.slots]};
    }
    memo.set(mask,best);return best;
  }
  return choose(0,0).slots;
}
export function habitatPositions(birds,variant='wide') {
  variant=variant==='tall'?'tall':'wide';
  const active=birds.filter(b=>b.home==='resident').slice(0,10);
  const young=active.filter(b=>['egg','chick'].includes(b.stage)).sort((a,b)=>a.id.localeCompare(b.id,undefined,{numeric:true}));
  const adults=active.filter(b=>!['egg','chick'].includes(b.stage));
  const available=HABITAT_ANCHORS[variant].filter(a=>!young.length||a.zone!=='nest').map(a=>({...a}));
  const positions=new Map();
  // The opening Omochi scene has a genuinely foreground bird, not a tiny icon
  // stranded on a distant top branch. Its feet still meet an actual root.
  if(active.length===1 && adults.length===1){
    const action=adults[0].action.kind;
    const a=HABITAT_ANCHORS[variant].find(a=>['eat','bath'].includes(action)?a.zone===action:a.id==='root-center');
    // The singleton food spot sits close to the left edge. Bound its enlarged
    // contact plane for the widest true side/peck tail, using one width for all
    // frames and keeping feet on the exact physical feeding-ground anchor.
    const width=Math.min((variant==='tall'?.25:.17)*a.depth,a.zone==='eat'?(variant==='tall'?.21:.132):1);
    positions.set(adults[0].id,{...a,width,interactive:true});
    return positions;
  }
  const baseWidth=variant==='tall'?.175:.112;
  const place=(bird,a)=>positions.set(bird.id,{...a,width:baseWidth*a.depth*(bird.stage==='juvenile'?.9:1),interactive:true});
  const encounters=currentEncounters(adults),slots=encounterAnchors(encounters,available,variant),reserved=new Set();
  encounters.forEach((pair,i)=>pair.forEach((bird,j)=>{const slot=slots[i][j];place(bird,available[slot]);reserved.add(slot);}));
  for(let i=available.length-1;i>=0;i--)if(reserved.has(i))available.splice(i,1);
  for(const bird of adults.slice().sort((a,b)=>a.action.kind.localeCompare(b.action.kind)||a.id.localeCompare(b.id,undefined,{numeric:true}))) {
    if(positions.has(bird.id))continue;
    const goal=HABITAT_ZONES[variant][bird.action.kind]||HABITAT_ZONES[variant].rest;
    available.sort((a,b)=>{
      const score=v=>Math.hypot(v.x-goal[0],v.y-goal[1])+(v.zone===bird.action.kind?-.22:0);
      return score(a)-score(b)||a.id.localeCompare(b.id);
    });
    const a=available.shift();
    // At most ten residents, and nestlings reserve one adjacent anchor. The number of
    // mature birds is then at most nine; no population-dependent growing room.
    if(!a) throw new Error('庭の止まり場所が足りません。');
    place(bird,a);
  }
  // Young birds remain inside one reserved nest. They use the outside-scene
  // picker, not a pile of overlapping 44px hit targets. Their actual images are
  // separately placed and never replaced by a shrunken adult image.
  if(young.length) {
    const n=HABITAT_NEST[variant],columns=Math.min(5,Math.max(2,young.length)),rows=Math.ceil(young.length/columns);
    const width=Math.min(baseWidth*.56,n.width/(columns+1)*.76,n.height*(rows===1?.95:.48)/(variant==='tall'?.75:1.6)*SPRITE_CONTACT.aspect);
    young.forEach((b,i)=>{
      const col=i%columns,row=Math.floor(i/columns),onRow=Math.min(columns,young.length-row*columns);
      positions.set(b.id,{id:`nest-${i}`,x:n.x+(col-(onRow-1)/2)*(n.width/(columns+1)),y:n.y+(row-(rows-1)/2)*n.height*.6,depth:.92,width:width*(b.stage==='egg'?.8:1),zone:'nest',interactive:false});
    });
  }
  return positions;
}
export function spriteBounds(position,variant='wide',roomWidth=Infinity) {
  const roomAspect=variant==='tall'?.75:1.6;
  // Match the mature birds' 46px accessible minimum (44px plus a subpixel safety margin) hit target in actual CSS.
  const width=Math.max(position.width,position.interactive?46/roomWidth:0),height=width/SPRITE_CONTACT.aspect*roomAspect;
  return {left:position.x-width*SPRITE_CONTACT.x,right:position.x+width*(1-SPRITE_CONTACT.x),top:position.y-height*SPRITE_CONTACT.y,bottom:position.y+height*(1-SPRITE_CONTACT.y)};
}
