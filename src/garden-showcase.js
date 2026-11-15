import {GARDEN_IDS} from './data/gardens.js';
import {GARDEN_REGULARS} from './garden-friends.js';
import {crowScene} from './garden-crows.js';

/** Finite souvenirs and a free, replayable celebration. No sale or farming loop. */
export const SHOWCASE_THEMES=Object.freeze(['song','discovery','style']);
export const SHOWCASE_ITEMS=Object.freeze([
 {id:'bell',name:'せせらぎの ベル',description:'うたに ちいさな リズムを そえるよ。',gold:6,path:'brook',theme:'song'},
 {id:'frame',name:'こかげの かざりわく',description:'はっけんした おもいでを かざるよ。',gold:6,path:'grove',theme:'discovery'},
 {id:'ribbon',name:'はないろの リボン',description:'ぶたいを いろどる かざりだよ。',gold:6,path:'flower',theme:'style'}
].map(Object.freeze));
export const initialShowcase=()=>({version:1,entries:[],active:null,purchases:[],gemAward:0});
export const showcaseToken=w=>({worldId:w.worldId,revision:w.revision});
const current=(w,t)=>t?.worldId===w.worldId&&t.revision===w.revision;
const bump=w=>{w.revision=w.revision===Number.MAX_SAFE_INTEGER?0:w.revision+1;};
const bird=id=>GARDEN_REGULARS.find(b=>b.id===id);
const item=id=>SHOWCASE_ITEMS.find(i=>i.id===id);
const known=w=>w.encounters.gardenFriends.regulars.filter(r=>r.lastInteractionTick!==null&&bird(r.id));
const safe=w=>w.encounters.garden.open&&!w.paused&&!w.encounters.active&&!w.encounters.raptor.active&&!crowScene(w)?.retreat;
const discoveries=w=>(w.expedition?.entries||[]).filter(e=>e.completedTick!==null);
const leaf=w=>w.leafEvent?.entry?.completedTick!==null&&w.leafEvent?.entry?.completedTick!==undefined;
const int=(v,min=0,max=Number.MAX_SAFE_INTEGER)=>Number.isSafeInteger(v)&&v>=min&&v<=max;
const shape=(v,keys)=>v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).length===keys.length&&keys.every(k=>Object.hasOwn(v,k));
const state=w=>w.showcase||initialShowcase();
const initialize=w=>w.showcase||(w.showcase=initialShowcase());
const leafMemory=(w,ids)=>leaf(w)&&ids.some(id=>[w.leafEvent.entry.sourceId,w.leafEvent.entry.recipientId].includes(id))?w.leafEvent.entry.choice:null;
const discovery=(w,ids)=>discoveries(w).findLast(e=>e.actorIds.some(id=>ids.includes(id)))||discoveries(w).at(-1)||null;
export function showcaseStatus(w){
 const s=state(w),friends=known(w),allowed=safe(w),unlocked=leaf(w)&&discoveries(w).length>0&&friends.length>=2;
 return {phase:s.active?.completedTick===null?'active':allowed&&unlocked?'available':'unavailable',known:friends,safe:allowed,unlocked,entry:s.active||s.entries.at(-1)||null,completed:s.entries.map(e=>e.theme),owned:s.purchases.map(p=>p.itemId)};
}
export function startShowcase(w,theme,actorIds,itemId,token){
 if(!current(w,token))return {changed:false,reason:'stale'};
 const status=showcaseStatus(w);
 if(status.phase!=='available'||!SHOWCASE_THEMES.includes(theme))return {changed:false,reason:'unavailable'};
 if(!Array.isArray(actorIds)||actorIds.length!==2||new Set(actorIds).size!==2||actorIds.some(id=>!status.known.some(b=>b.id===id)))return {changed:false,reason:'friends'};
 if(itemId!==null&&(!item(itemId)||!status.owned.includes(itemId)))return {changed:false,reason:'item'};
 const s=initialize(w);
 s.active={theme,gardenId:w.encounters.garden.id,actorIds:[...actorIds],itemId,startedTick:w.tick,completedTick:null,leafMemory:leafMemory(w,actorIds),discoveryId:discovery(w,actorIds).id};
 bump(w);return {changed:true,entry:s.active};
}
export function completeShowcase(w,token){
 if(!current(w,token))return {changed:false,reason:'stale'};
 const status=showcaseStatus(w),e=state(w).active;
 if(status.phase!=='active'||!status.safe||!status.unlocked||e.gardenId!==w.encounters.garden.id)return {changed:false,reason:'unavailable'};
 if(e.actorIds.some(id=>!status.known.some(b=>b.id===id)))return {changed:false,reason:'friends'};
 const s=w.showcase,first=!s.entries.some(p=>p.theme===e.theme);let gemAward=0;
 e.completedTick=w.tick;
 if(first){
  s.entries.push(structuredClone(e));
  if(s.entries.length===SHOWCASE_THEMES.length){
   gemAward=Math.max(0,Math.min(5,1e9-w.decor.points,1e9-w.decor.lifetimePoints));
   w.decor.points+=gemAward;w.decor.lifetimePoints+=gemAward;s.gemAward=gemAward;
  }
 }
 bump(w);return {changed:true,first,gemAward,entry:e};
}
export function buyShowcaseItem(w,itemId,payment,token){
 if(!current(w,token))return {changed:false,reason:'stale'};
 const status=showcaseStatus(w),offer=item(itemId);
 if(!status.safe||!status.unlocked||status.phase==='active'||!offer||!['gold','discovery'].includes(payment))return {changed:false,reason:'unavailable'};
 if(status.owned.includes(itemId))return {changed:false,reason:'owned'};
 const found=discoveries(w).find(e=>e.path===offer.path);
 if(payment==='gold'&&w.economy.gold<offer.gold)return {changed:false,reason:'gold'};
 if(payment==='discovery'&&(!found||state(w).purchases.some(p=>p.discoveryId===found.id)))return {changed:false,reason:'discovery'};
 const s=initialize(w),goldPaid=payment==='gold'?offer.gold:0;
 w.economy.gold-=goldPaid;
 s.purchases.push({itemId,payment,discoveryId:payment==='discovery'?found.id:null,goldPaid,tick:w.tick});
 bump(w);return {changed:true,itemId,goldPaid};
}
export function validateShowcase(w){
 if(!Object.hasOwn(w,'showcase'))return initialShowcase();
 const s=w.showcase,fail=()=>{throw Error('はっぴょうかいの記録が不正です。');};
 if(!shape(s,['version','entries','active','purchases','gemAward'])||s.version!==1||!Array.isArray(s.entries)||s.entries.length>3||!Array.isArray(s.purchases)||s.purchases.length>SHOWCASE_ITEMS.length||!int(s.gemAward,0,5))fail();
 const purchased=new Set(),used=new Set();let purchaseTick=0;
 for(const p of s.purchases){
  const offer=item(p?.itemId);
  if(!shape(p,['itemId','payment','discoveryId','goldPaid','tick'])||!offer||purchased.has(p.itemId)||!['gold','discovery'].includes(p.payment)||!int(p.tick,purchaseTick,w.tick)||!int(p.goldPaid,0,offer.gold))fail();
  if(p.payment==='gold'){if(p.goldPaid!==offer.gold||p.discoveryId!==null)fail();}
  else {const found=discoveries(w).find(e=>e.id===p.discoveryId&&e.path===offer.path&&e.completedTick<=p.tick);if(!found||used.has(p.discoveryId)||p.goldPaid!==0)fail();used.add(p.discoveryId);}
  purchaseTick=p.tick;purchased.add(p.itemId);
 }
 const checkEntry=(e,minTick,allowActive)=>{
  if(!shape(e,['theme','gardenId','actorIds','itemId','startedTick','completedTick','leafMemory','discoveryId'])||!SHOWCASE_THEMES.includes(e.theme)||!GARDEN_IDS.includes(e.gardenId)||!Array.isArray(e.actorIds)||e.actorIds.length!==2||new Set(e.actorIds).size!==2||e.actorIds.some(id=>!bird(id))||!int(e.startedTick,minTick,w.tick)||![null,'deliver','display'].includes(e.leafMemory)||e.leafMemory!==leafMemory(w,e.actorIds))fail();
  if(e.completedTick===null){if(!allowActive)fail();}else if(!int(e.completedTick,e.startedTick,w.tick))fail();
  if(!leaf(w)||w.leafEvent.entry.completedTick>e.startedTick||!discoveries(w).some(d=>d.id===e.discoveryId&&d.completedTick<=e.startedTick))fail();
  if(e.itemId!==null&&!s.purchases.some(p=>p.itemId===e.itemId&&p.tick<=e.startedTick))fail();
 };
 const themes=new Set();let last=0;
 for(const e of s.entries){checkEntry(e,last,false);if(themes.has(e.theme))fail();themes.add(e.theme);last=e.completedTick;}
 if(s.active!==null){checkEntry(s.active,0,true);if(s.active.completedTick===null){if(s.active.startedTick<last)fail();}else if(!themes.has(s.active.theme)||s.active.completedTick<last)fail();}
 if(s.entries.length<3&&s.gemAward!==0)fail();
 if((s.entries.length||s.purchases.length||s.active!==null)&&(!leaf(w)||!discoveries(w).length))fail();
 return s;
}
