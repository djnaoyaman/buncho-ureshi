import {allBirds,activateBird} from './world-birds.js';
import {isAlive,lifeStatus,LIFE_RULES} from './life-care.js';

/** Identity belongs to the save, never to a name or the currently selected bird. */
export const getProtagonistId = world => world?.protagonist?.birdId ?? 'b1';
export const getProtagonistBird = world => world?.birds?.find(b=>b.id===getProtagonistId(world)) ?? null;
export function initializeProtagonist(world){
 if(world.protagonist)return false;
 world.protagonist=world.version>=10?{version:2,birdId:'b1',lineage:['b1'],familySelections:[]}:{version:1,birdId:'b1',lineage:['b1']};return true;
}
export function protagonistStatus(world){
 const bird=getProtagonistBird(world),generation=world.protagonist?.lineage.length??1;
 if(!bird||isAlive(world,bird))return {bird,generation,waiting:null,heir:null};
 const children=allBirds(world).filter(b=>b.parents.includes(bird.id)&&isAlive(world,b)).sort((a,b)=>a.bornTick-b.bornTick||Number(a.id.slice(1))-Number(b.id.slice(1)));
 const heir=children[0]??null;
 return {bird,generation,heir,waiting:!heir?'no-child':heir.stage==='egg'?'hatch':heir.home!=='resident'&&allBirds(world).filter(b=>b.home==='resident').length>=6?'room':'ready'};
}
/** Called after every bird's death has been resolved, so a same-batch death never inherits. */
export function syncProtagonist(world,{residentOnly=false}={}){
 initializeProtagonist(world);
 const {bird,heir,waiting}=protagonistStatus(world);
 if(waiting!=='ready'||residentOnly&&heir.home!=='resident')return null;
 return transitionProtagonist(world,bird,heir);
}
/** Family membership is checked at choice time, never reconstructed from later deaths. */
export function familySuccessorCandidates(world){
 if(protagonistStatus(world).waiting!=='no-child')return [];
 const count=allBirds(world).filter(b=>b.home==='resident').length,now=world.lifecycle.seenAt;
 return allBirds(world).filter(b=>isAlive(world,b)&&!world.protagonist.lineage.includes(b.id)&&(b.home==='resident'||b.parents.length===2||b.milestones.some(m=>['welcome','adopt','movein'].includes(m.kind))))
  .map(b=>{const condition=lifeStatus(world,b).condition;return {bird:b,reason:b.stage==='egg'?'hatch':b.home!=='resident'&&count>=6?'room':b.home!=='resident'&&condition&&condition.deadlineAt<=now&&now>253402268399999-LIFE_RULES.treatmentMs?'clock':null};});
}
/** Only called after the engine checks the exact choice against fresh lifecycle state. */
export function selectFamilyProtagonist(world,birdId){
 const candidate=familySuccessorCandidates(world).find(c=>c.bird.id===birdId&&!c.reason);
 if(!candidate)return null;
 const from=getProtagonistBird(world),result=transitionProtagonist(world,from,candidate.bird);
 world.protagonist.familySelections.push({...result,tick:world.tick,at:world.lifecycle.seenAt});
 return result;
}
export function recordedFamilySuccession(world,fromId,toId,tick){
 return world.version>=10&&Array.isArray(world.protagonist?.familySelections)&&world.protagonist.familySelections.some(s=>s.fromId===fromId&&s.toId===toId&&s.tick===tick);
}
function transitionProtagonist(world,bird,heir){
 const fromId=bird.id,now=world.lifecycle.seenAt;
 if(heir.home!=='resident'){
  activateBird(world,heir);heir.home='resident';heir.arrivedTick=world.tick;
  if(world.field.place==='friend'&&world.field.hostId===heir.id)world.field={place:'home',hostId:null,enteredTick:world.tick};
  const care=lifeStatus(world,heir);care.lastCareAt=now;care.dirtySinceAt=null;care.lowSinceAt=null;
  // Outside birds are not under household care. Give an overdue condition a visible
  // treatment window on return, without curing it or changing its kind.
  if(care.condition&&care.condition.deadlineAt<=now&&now<=253402268399999-LIFE_RULES.treatmentMs){care.condition.sinceAt=now;care.condition.deadlineAt=now+LIFE_RULES.treatmentMs;}
  if(world.adoption.pending?.birdId===heir.id||allBirds(world).filter(b=>b.home==='resident').length>=6)world.adoption.pending=null;
 }
 world.protagonist.birdId=heir.id;world.protagonist.lineage.push(heir.id);
 const friends=world.encounters?.gardenFriends;
 if(friends)friends.companions=[...new Set(friends.companions.map(id=>id===fromId?heir.id:id))];
 return {fromId,toId:heir.id};
}
export function validateProtagonist(world){
 const p=world.protagonist,fail=()=>{throw new Error('保存データを読み込めません：主人公の代替わり情報が不正です。');};
 const current=world.version>=10,keys=current?['version','birdId','lineage','familySelections']:['version','birdId','lineage'];
 if(!p||typeof p!=='object'||Array.isArray(p)||Object.keys(p).length!==keys.length||keys.some(k=>!Object.hasOwn(p,k))||p.version!==(current?2:1)||!Array.isArray(p.lineage)||!p.lineage.length||p.lineage.length>allBirds(world).length||p.lineage[0]!=='b1'||p.birdId!==p.lineage.at(-1)||new Set(p.lineage).size!==p.lineage.length)fail();
 const selections=current?p.familySelections:[];
 if(!Array.isArray(selections)||selections.length>=p.lineage.length)fail();
 let priorIndex=0,priorTick=0,priorAt=0;
 for(const row of selections){
  if(!row||typeof row!=='object'||Array.isArray(row)||Object.keys(row).length!==4||!['fromId','toId','tick','at'].every(k=>Object.hasOwn(row,k)))fail();
  const index=p.lineage.indexOf(row.toId),from=allBirds(world).find(b=>b.id===row.fromId),to=allBirds(world).find(b=>b.id===row.toId);
  if(index<=priorIndex||p.lineage[index-1]!==row.fromId||!from||!to||to.parents.includes(from.id))fail();
  const death=lifeStatus(world,from).death,laterDeath=lifeStatus(world,to).death;
  if(!death||!Number.isSafeInteger(row.tick)||row.tick<Math.max(priorTick,death.tick,to.bornTick)||row.tick>world.tick||!Number.isSafeInteger(row.at)||row.at<Math.max(priorAt,death.at)||row.at>world.lifecycle.seenAt||laterDeath&&(laterDeath.tick<row.tick||laterDeath.at<row.at))fail();
  const retained=world.events.filter(e=>e.kind==='succession'&&e.ids[1]===row.toId);
  if(retained.length>1||retained.some(e=>e.ids[0]!==row.fromId||e.tick!==row.tick))fail();
  priorIndex=index;priorTick=row.tick;priorAt=row.at;
 }
 for(let i=0;i<p.lineage.length;i++){
  const bird=allBirds(world).find(b=>b.id===p.lineage[i]);
  if(!bird||i&&(!bird.parents.includes(p.lineage[i-1])&&!selections.some(s=>s.fromId===p.lineage[i-1]&&s.toId===bird.id)||bird.stage==='egg')||i<p.lineage.length-1&&isAlive(world,bird))fail();
 }
 return p;
}
