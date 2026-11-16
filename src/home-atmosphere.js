import {allBirds} from './world-birds.js';
import {lifeStatus} from './life-care.js';
import {presentationSeed} from './bird-poses.js';

const level=n=>Number.isFinite(n)?Math.max(0,Math.min(100,n)):100;
/** A disposable view of the committed world. Never a care/reward predicate.
 * No clock, RNG, cache, saved fields or writes; decoration previews omit it. */
export function homeAtmosphere(world,{selectedId=null,place=world.field?.place,panel='garden',error=false,memory=false,ending=false,hidden=false,motion=true}={}){
 const birds=allBirds(world),family=birds.filter(b=>b.home==='resident'&&!lifeStatus(world,b)?.death);
 const mature=family.filter(b=>['adult','juvenile'].includes(b.stage));
 const selected=birds.find(b=>b.id===selectedId);
 const food=mature.length?mature.reduce((n,b)=>n+level(b.needs.food),0)/mature.length:100;
 const energy=mature.length?Math.min(...mature.map(b=>level(b.needs.energy))):100;
 const cleanliness=level(world.care?.cleanliness),drops=world.gems?.droppings?.length||0;
 const blocked=error||memory?'storage':world.encounters?.raptor?.active?.hostile||family.some(b=>lifeStatus(world,b)?.condition)||selected&&lifeStatus(world,selected)?.condition?'health':ending||panel!=='garden'||place!=='home'||selected&&lifeStatus(world,selected)?.death?'screen':null;
 const state=blocked||(!family.length?'empty':!mature.length?'nest':food<60?'hungry':energy<60?'resting':cleanliness<=20||drops?'lived-in':'quiet');
 // Broad bands preserve a peaceful room through ordinary 100 -> 99 decay.
 const feed=food>=80?'plentiful':food>=60?'shared':'sparse';
 return {state,visible:!blocked,animate:!blocked&&!hidden&&motion&&!world.paused&&!!world.settings.motion,
  feed,grainFraction:feed==='plentiful'?1:feed==='shared'?.72:.44,
  scatter:blocked||!mature.length?0:Math.min(7,Math.floor((100-food)/15)+(cleanliness<=20?2:0)),
  selectedState:!selected?'none':lifeStatus(world,selected)?.death?'memorial':lifeStatus(world,selected)?.condition?'health':['egg','chick'].includes(selected.stage)?'nest':selected.home!=='resident'?'guest':level(selected.needs.food)<60?'hungry':level(selected.needs.energy)<60?'resting':'quiet'};
}

/** Rest follows the real individual's energy, while social/action poses keep priority.
 * Only the existing active presentation clock is consumed; never game RNG/time. */
export function homeIdlePose(world,bird,elapsed=0,visible=true){
 if(!visible||world.field.place!=='home'||bird.home!=='resident'||!['adult','juvenile'].includes(bird.stage)||lifeStatus(world,bird)?.death||lifeStatus(world,bird)?.condition||bird.action?.kind!=='rest'||bird.action?.target)return null;
 if(level(bird.needs.energy)<60)return 'rest';
 if(level(bird.needs.energy)<80||level(bird.needs.food)<80)return null;
 const seed=presentationSeed(world.worldId+':home:'+bird.id),time=Math.max(0,Number.isFinite(elapsed)?elapsed:0);
 return Math.floor((time+seed%26000)/(18000+seed%8000))%3===1?'preen':'rest';
}
