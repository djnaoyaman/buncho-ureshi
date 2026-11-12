import {allBirds} from './world-birds.js';
/** Persistent fictional Java Sparrow garden regulars. Not family birds or spawnable cage visitors. */
import {isAlive} from './life-care.js';
import {GARDEN_IDS,gardenById,drawGardenFriendIds,closeGardenAcquaintance} from './data/gardens.js';
const personalities=[
 ['komorebi','しおり','sakura','watch','葉の影を見つけるのが好き','一緒に葉の影を探した'],['komorebi','もく','white','chat','木の椅子で話を聞くのが好き','木の椅子でゆっくり話した'],
 ['mizukagami','みなも','silver','watch','水面の形を眺めるのが好き','同じ波紋を眺めた'],['mizukagami','しずく','white','play','飛び石の模様で遊ぶのが好き','飛び石の模様をたどった'],
 ['komugi','むぎ','cinnamon','play','穂の揺れをまねるのが好き','揺れる穂を一緒にまねた'],['komugi','こなつ','sakura','chat','木柵で会話するのが好き','木柵で小さな話をした'],
 ['hanadokei','すみれ','silver','play','花の輪をたどるのが好き','花の輪を一緒にたどった'],['hanadokei','こはな','white','watch','花びらの向きを見るのが好き','花びらの向きを見つけた'],
 ['kazaguruma','かぜ','sakura','play','丘で風のポーズをするのが好き','丘で風のポーズをした'],['kazaguruma','そよ','silver','watch','風車の回り方を眺めるのが好き','同じ風車を見上げた'],
 ['yuyake','あんず','cinnamon','chat','小さな卓のおしゃべりが好き','小さな卓で話した'],['yuyake','くるみ','sakura','play','木箱のリズムが好き','木箱でリズムをまねた'],
 ['tsukiakari','つき','white','watch','白花と月を眺めるのが好き','白花のそばで月を眺めた'],['tsukiakari','ほたる','silver','chat','灯のそばの小声のおしゃべりが好き','灯のそばで小声で話した'],
 ['shrine-grove','こだま','sakura','chat','石段のあいさつが好き','石段であいさつした'],['shrine-grove','かえで','cinnamon','watch','落ち葉の形を見つけるのが好き','同じ落ち葉を見つけた'],
 ['onsen','ゆげ','white','chat','休憩処で待ち合わせるのが好き','熱いお湯から離れた休憩処で話した'],['onsen','こゆ','cinnamon','play','止まり木でのんびり遊ぶのが好き','待合の止まり木で一緒に過ごした']
];
export const GARDEN_REGULARS=Object.freeze(personalities.map(([primaryGardenId,name,color,favorite,personality,preferredMemory],i)=>Object.freeze({id:`gf-${primaryGardenId}-${i%2+1}`,name,speciesId:'java-sparrow',primaryGardenId,appearance:{color},favorite,personality,preferredMemory})));
const copy=x=>JSON.parse(JSON.stringify(x));
export function initialGardenFriends(){return {version:2,accompany:false,attendees:[],visits:[],regulars:GARDEN_REGULARS.map(d=>({...copy(d),affinity:0,lastInteractionTick:null,memories:[]})),references:[],companions:[]};}
const int=(v,min=0,max=Number.MAX_SAFE_INTEGER)=>Number.isSafeInteger(v)&&v>=min&&v<=max;
const shape=(v,keys)=>v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).length===keys.length&&keys.every(k=>Object.hasOwn(v,k));
function validBond(r,tick,gardenIds=GARDEN_IDS){return int(r.affinity,0,100)&&(r.lastInteractionTick===null||int(r.lastInteractionTick,0,tick))&&Array.isArray(r.memories)&&r.memories.length<=12&&r.memories.every(m=>shape(m,['kind','tick','gardenId','text'])&&['chat','watch','play'].includes(m.kind)&&int(m.tick,0,tick)&&gardenIds.includes(m.gardenId)&&typeof m.text==='string'&&m.text.length<=120);}
export function validateGardenFriends(state,tick,encounterVersion=12,gardenIds=GARDEN_IDS){
 const fail=()=>{throw new Error('庭の友達の記録が不正です。');};
 const modern=encounterVersion>=12;
 if(!shape(state,['version','regulars','references','companions',...(modern?['accompany','attendees','visits']:[])])||state.version!==(modern?2:1)||!Array.isArray(state.regulars)||state.regulars.length!==GARDEN_REGULARS.length||!Array.isArray(state.references)||state.references.length>100000||!Array.isArray(state.companions)||state.companions.length>4||new Set(state.companions).size!==state.companions.length||state.companions.some(id=>!/^b[1-9][0-9]*$/.test(id)))fail();
 const ids=new Set();for(const r of state.regulars){const d=GARDEN_REGULARS.find(x=>x.id===r.id);if(!d||ids.has(r.id)||!shape(r,['id','name','speciesId','primaryGardenId','appearance','favorite','personality','preferredMemory','affinity','lastInteractionTick','memories'])||Object.keys(d).some(k=>JSON.stringify(r[k])!==JSON.stringify(d[k]))||!validBond(r,tick,gardenIds))fail();ids.add(r.id);}
 const refs=new Set();for(const r of state.references){if(!shape(r,['id','birdId','primaryGardenId','affinity','lastInteractionTick','memories'])||!/^b[1-9][0-9]*$/.test(r.birdId)||r.id!==`known-${r.birdId}`||refs.has(r.birdId)||!gardenIds.includes(r.primaryGardenId)||!validBond(r,tick,gardenIds))fail();refs.add(r.birdId);}
 if(modern){
  if(typeof state.accompany!=='boolean'||!Array.isArray(state.attendees)||state.attendees.length>4||new Set(state.attendees).size!==state.attendees.length||state.attendees.some(id=>!/^b[1-9][0-9]*$/.test(id))||!Array.isArray(state.visits)||state.visits.length>gardenIds.length||new Set(state.visits.map(v=>v?.gardenId)).size!==state.visits.length)fail();
  const known=new Set([...ids,...state.references.map(r=>r.id)]);
  for(const v of state.visits)if(!shape(v,['gardenId','visit','friendIds','returningIds'])||!gardenIds.includes(v.gardenId)||!int(v.visit,0,1000000)||!Array.isArray(v.friendIds)||v.friendIds.length>4||new Set(v.friendIds).size!==v.friendIds.length||v.friendIds.some(id=>!known.has(id))||!Array.isArray(v.returningIds)||v.returningIds.length>160||new Set(v.returningIds).size!==v.returningIds.length||v.returningIds.some(id=>typeof id!=='string'||!/^[a-z][a-z0-9-]{1,63}$/.test(id)))fail();
 }
 return state;
}
/** Retain old references and memories; enroll only actual close friends, including descendants. */
export function rememberGardenAcquaintances(world){const state=world.encounters.gardenFriends;for(const b of allBirds(world)){if(!closeGardenAcquaintance(world,b)||state.references.some(r=>r.birdId===b.id)||state.references.length>=100000)continue;const n=Number(b.id.slice(1));state.references.push({id:`known-${b.id}`,birdId:b.id,primaryGardenId:GARDEN_IDS[(n-1)%GARDEN_IDS.length],affinity:0,lastInteractionTick:null,memories:[]});}}
export function setGardenCompanions(world,ids){if(!Array.isArray(ids)||ids.length>4||new Set(ids).size!==ids.length||ids.some(id=>!allBirds(world).some(b=>b.id===id&&b.home==='resident'&&isAlive(world,b)&&['juvenile','adult'].includes(b.stage))))return false;world.encounters.gardenFriends.companions=[...ids];return true;}
export function beginGardenOuting(world){const state=world.encounters.gardenFriends;state.attendees=state.accompany?state.companions.filter(id=>allBirds(world).some(b=>b.id===id&&b.home==='resident'&&isAlive(world,b)&&['juvenile','adult'].includes(b.stage))):[];}
export function recordGardenVisit(world,returningIds=[]){
 const state=world.encounters.gardenFriends,g=world.encounters.garden;
 rememberGardenAcquaintances(world);
 const visit={gardenId:g.id,visit:g.visits[g.id],friendIds:drawGardenFriendIds(world,g.id),returningIds:[...returningIds]};
 state.visits=state.visits.filter(v=>v.gardenId!==g.id);state.visits.push(visit);
}
/** Affinity is garden-only, bounded and once per friend per story tick; no currency. */
export function bondGardenFriend(world,friendId,kind){const state=world.encounters.gardenFriends,r=[...state.regulars,...state.references].find(x=>x.id===friendId);if(!r||!['chat','watch','play'].includes(kind))return {changed:false,reason:'friend'};if(r.lastInteractionTick===world.tick)return {changed:false,reason:'repeat'};const delta=Math.min(100-r.affinity,r.favorite===kind?2:1);r.affinity+=delta;r.lastInteractionTick=world.tick;const place=gardenById(world.encounters.garden.id),label=place.actions.find(([action])=>action===kind)?.[1]||'一緒に過ごす';const text=r.favorite===kind?r.preferredMemory:`${place.name}で「${label}」を一緒に楽しんだ`;r.memories.push({kind,tick:world.tick,gardenId:world.encounters.garden.id,text});r.memories=r.memories.slice(-12);return {changed:true,affinityDelta:delta,affinity:r.affinity,message:text+'よ。'};}
