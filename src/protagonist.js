import {isAlive,lifeStatus,LIFE_RULES} from './life-care.js';

/** Identity belongs to the save, never to a name or the currently selected bird. */
export const getProtagonistId = world => world?.protagonist?.birdId ?? 'b1';
export const getProtagonistBird = world => world?.birds?.find(b=>b.id===getProtagonistId(world)) ?? null;
export function initializeProtagonist(world){
 if(world.protagonist)return false;
 world.protagonist={version:1,birdId:'b1',lineage:['b1']};return true;
}
export function protagonistStatus(world){
 const bird=getProtagonistBird(world),generation=world.protagonist?.lineage.length??1;
 if(!bird||isAlive(world,bird))return {bird,generation,waiting:null,heir:null};
 const children=world.birds.filter(b=>b.parents.includes(bird.id)&&isAlive(world,b)).sort((a,b)=>a.bornTick-b.bornTick||Number(a.id.slice(1))-Number(b.id.slice(1)));
 const heir=children[0]??null;
 return {bird,generation,heir,waiting:!heir?'no-child':heir.stage==='egg'?'hatch':heir.home!=='resident'&&world.birds.filter(b=>b.home==='resident').length>=6?'room':'ready'};
}
/** Called after every bird's death has been resolved, so a same-batch death never inherits. */
export function syncProtagonist(world){
 initializeProtagonist(world);
 const {bird,heir,waiting}=protagonistStatus(world);
 if(waiting!=='ready')return null;
 const fromId=bird.id,now=world.lifecycle.seenAt;
 if(heir.home!=='resident'){
  heir.home='resident';heir.arrivedTick=world.tick;
  if(world.field.place==='friend'&&world.field.hostId===heir.id)world.field={place:'home',hostId:null,enteredTick:world.tick};
  const care=lifeStatus(world,heir);care.lastCareAt=now;care.dirtySinceAt=null;care.lowSinceAt=null;
  // Outside birds are not under household care. Give an overdue condition a visible
  // treatment window on return, without curing it or changing its kind.
  if(care.condition&&care.condition.deadlineAt<=now&&now<=253402268399999-LIFE_RULES.treatmentMs){care.condition.sinceAt=now;care.condition.deadlineAt=now+LIFE_RULES.treatmentMs;}
  if(world.adoption.pending?.birdId===heir.id||world.birds.filter(b=>b.home==='resident').length>=6)world.adoption.pending=null;
 }
 world.protagonist.birdId=heir.id;world.protagonist.lineage.push(heir.id);
 const friends=world.encounters?.gardenFriends;
 if(friends)friends.companions=[...new Set(friends.companions.map(id=>id===fromId?heir.id:id))];
 return {fromId,toId:heir.id};
}
export function validateProtagonist(world){
 const p=world.protagonist,fail=()=>{throw new Error('保存データを読み込めません：主人公の代替わり情報が不正です。');};
 if(!p||typeof p!=='object'||Array.isArray(p)||Object.keys(p).length!==3||p.version!==1||!Array.isArray(p.lineage)||!p.lineage.length||p.lineage.length>world.birds.length||p.lineage[0]!=='b1'||p.birdId!==p.lineage.at(-1)||new Set(p.lineage).size!==p.lineage.length)fail();
 for(let i=0;i<p.lineage.length;i++){
  const bird=world.birds.find(b=>b.id===p.lineage[i]);
  if(!bird||i&&(!bird.parents.includes(p.lineage[i-1])||bird.stage==='egg')||i<p.lineage.length-1&&isAlive(world,bird))fail();
 }
 return p;
}
