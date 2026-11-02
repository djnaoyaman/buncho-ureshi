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
    positions.set(adults[0].id,{...a,width:(variant==='tall'?.25:.17)*a.depth,interactive:true});
    return positions;
  }
  const baseWidth=variant==='tall'?.175:.112;
  for(const bird of adults.slice().sort((a,b)=>a.action.kind.localeCompare(b.action.kind)||a.id.localeCompare(b.id,undefined,{numeric:true}))) {
    const goal=HABITAT_ZONES[variant][bird.action.kind]||HABITAT_ZONES[variant].rest;
    available.sort((a,b)=>{
      const score=v=>Math.hypot(v.x-goal[0],v.y-goal[1])+(v.zone===bird.action.kind?-.22:0);
      return score(a)-score(b)||a.id.localeCompare(b.id);
    });
    const a=available.shift();
    // At most ten residents, and nestlings reserve one adjacent anchor. The number of
    // mature birds is then at most nine; no population-dependent growing room.
    if(!a) throw new Error('庭の止まり場所が足りません。');
    const stageScale=bird.stage==='juvenile'?.9:1;
    positions.set(bird.id,{...a,width:baseWidth*a.depth*stageScale,interactive:true});
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
