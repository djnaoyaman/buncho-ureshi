import {advanceRaptorState} from './garden-raptors.js';
import {getProtagonistId,initializeProtagonist,syncProtagonist,validateProtagonist} from './protagonist.js';
import {accidentLifeBird,rebaseLifecycleClock,initializeLifecycle,registerLifeBird,syncLifecycle,validateLifecycle,isAlive,lifeStatus,noteLifeFeeding,noteLifeConflict,treatLifeBird,hireLifeCaretaker,honorLifeBird} from './life-care.js';
import {initialEncounterState,validateEncounterState,encounterSystem,upgradeEncounterState,cageVisitorCount,expireEncounterVisitors} from './encounters.js';
import {initialEconomy,validateEconomy,syncEconomy,reserveAutomaticGems,awardCareGold,ECONOMY_RULES} from './economy.js';
/** A deterministic, offline story simulation with fictional lifecycle rules. No real husbandry advice. */
import { initializeCareSchedule, validateCareSchedule, syncCareSchedule, applyScheduledCare, reconcileImportedCare, careWindow } from './care-schedule.js';
import { defaultNameFields, automaticNaming, manualNaming, legacyNaming, isValidNaming } from './bird-names.js';
export const SAVE_VERSION = 9;
const careTime = now => Math.max(0, Math.min(253402268399999, now));
export { reconcileImportedCare, careWindow };
export const TICK_MS = 15000;
export const MAX_SAVE_BYTES = 4000000;
const MAX_DATE_MS = 8640000000000000;
const LEGACY_EVENT_KINDS = ['welcome','visit','revisit','adopt','movein','pair','egg','hatch','grow','declined','play','bath','reconcile','depart'];
const EVENT_KINDS = [...LEGACY_EVENT_KINDS, 'user-feed', 'user-pet', 'illness', 'death', 'treatment', 'caretaker-treatment', 'succession'];
const MILESTONE_KINDS = ['welcome','adopt','movein','pair','egg','hatch','grow','depart'];
const LEGACY_MEMORY_KINDS = [...LEGACY_EVENT_KINDS, ...['hello','rest','bath','friend','play','food','unknown'].map(kind => `user-${kind}`)];
const MEMORY_KINDS = [...LEGACY_MEMORY_KINDS, 'user-feed', 'user-pet', 'illness', 'death', 'treatment', 'caretaker-treatment', 'succession'];
export const CARE_RULES = Object.freeze({ feedGain: 20, petMoodGain: 4, feedCooldownTicks: 2, petCooldownTicks: 1, cleanCooldownTicks: 1, soilPerTick: 1 });
export const LIMITS = Object.freeze({ residents: 6, visitors: 6, birds: 128, events: 240, memories: 16, offlineTicks: 576 });
export const STAGES = Object.freeze({ egg: '卵', chick: 'ひな', juvenile: '幼鳥', adult: '成鳥' });
export const ACTIONS = Object.freeze({ rest: 'ひとやすみ', eat: 'ごはん', bath: '水浴び', explore: 'たんけん', talk: 'おしゃべり', play: 'いっしょに遊ぶ', nest: '巣で過ごす', visit: 'あそびに来たよ' });
const clamp = (n, min = 0, max = 100) => Math.max(min, Math.min(max, n));
const COLORS = ['white', 'sakura', 'silver', 'cinnamon'];
const PREFERENCES = ['水浴び', 'おしゃべり', '探検', '静かな枝'];
const names = ['こはく', 'すず', 'わかば', 'こむぎ', 'つむぎ', 'そら', 'ふたば', 'ひなた', 'あんず', 'しずく', 'なずな', 'くるみ'];
const clone = value => JSON.parse(JSON.stringify(value));
function random(w) { w.seed = (Math.imul(w.seed, 1664525) + 1013904223) >>> 0; return w.seed / 4294967296; }
function pick(w, list) { return list[Math.floor(random(w) * list.length)]; }

const SLOT_LABELS = Object.freeze({perch:'止まり木',feed:'エサ入れ',water:'水入れ',bath:'水浴び容器',greens:'青菜入れ',shellgrit:'ボレー粉入れ',swing:'ブランコ',toy:'おもちゃ',paper:'底に敷く紙'});
const COLOR_HEX = Object.freeze({mint:'#8fbea6',rose:'#e8a8b5',sky:'#94c6df',lemon:'#edd88a',lavender:'#beb0dc',peach:'#e9ba97',cream:'#e9dfc5',aqua:'#8ecdc8'});
export const DECOR_SLOTS = Object.freeze(Object.entries(SLOT_LABELS).map(([id,label])=>Object.freeze({id,label})));
export const DECOR_COLORS = Object.freeze(Object.entries(COLOR_HEX).map(([id,hex],i)=>Object.freeze({id,hex,label:['ミント','さくら','空色','レモン','ラベンダー','ピーチ','クリーム','アクア'][i]})));
export const DECOR_TIERS = Object.freeze([{id:'cozy',label:'ほっこり',level:1},{id:'lovely',label:'とっておき',level:3},{id:'special',label:'きらめき',level:6}]);
export const DECOR_DRAW_COST = 20;
const POINT_CAP = 1000000000;

export const GEM_RULES = Object.freeze({feed:6,pet:5,chat:5,collect:8,chatCooldownTicks:1,fullnessThreshold:90,droppingDelayTicks:2,droppingIntervalTicks:4,maxDroppings:12});
function initialGemCare(){return {lastChatTick:null,fullSinceTick:null,lastDropTick:null};}
function grantGems(w,amount){const before=w.decor.points;w.decor.points=Math.min(POINT_CAP,before+amount);w.decor.lifetimePoints=Math.min(POINT_CAP,w.decor.lifetimePoints+amount);return w.decor.points-before;}
function fullMeal(w,b){if(b.needs.food>=GEM_RULES.fullnessThreshold&&b.gemCare.fullSinceTick===null)b.gemCare.fullSinceTick=w.tick;}
function produceDroppings(w){
  if(w.field.place!=='home')return;
  for(const b of w.birds){
    const c=b.gemCare;
    if(b.home==='departed'||!['juvenile','adult'].includes(b.stage)||c.fullSinceTick===null||w.tick-c.fullSinceTick<GEM_RULES.droppingDelayTicks)continue;
    if(c.lastDropTick!==null&&w.tick-c.lastDropTick<GEM_RULES.droppingIntervalTicks||w.gems.droppings.some(d=>d.birdId===b.id)||w.gems.droppings.length>=GEM_RULES.maxDroppings||w.gems.nextDropId>=Number.MAX_SAFE_INTEGER)continue;
    w.gems.droppings.push({id:`drop-${w.gems.nextDropId++}`,birdId:b.id,createdTick:w.tick,location:'home'});
    c.lastDropTick=w.tick;c.fullSinceTick=null;
  }
}
export function collectDropping(w,droppingId,expectedRevision){
  if(expectedRevision!==undefined&&expectedRevision!==w.revision)return {changed:false,gemAward:0,droppingId,message:'おうちが変わったよ。もう一度見つけてね。'};
  const index=w.gems.droppings.findIndex(d=>d.id===droppingId);
  if(index<0||w.field.place!=='home')return {changed:false,gemAward:0,droppingId,message:index<0?'もうきれいになっているよ。':'おうちで見つけてね。'};
  const [drop]=w.gems.droppings.splice(index,1),gemAward=grantGems(w,GEM_RULES.collect);
  bumpRevision(w);return {changed:true,gemAward,droppingId,birdId:drop.birdId,message:`きれいになったよ。${gemAward} Gems！`};
}

function initialField() { return {place:'home',hostId:null,enteredTick:0}; }
function initialDecor() {
  const inventory=Object.keys(SLOT_LABELS).map(slot=>({id:`${slot}-mint-cozy`,slot,color:'mint',tier:'cozy'}));
  return {points:20,lifetimePoints:20,inventory,equipped:Object.fromEntries(inventory.map(item=>[item.slot,item.id])),draws:0,lastDrawTick:null};
}
export function decorLevel(w) { return Math.min(20,1+Math.floor(w.decor.lifetimePoints/80)); }
export function fieldBirds(w) {
  const resident=w.birds.filter(b=>b.home==='resident'&&['juvenile','adult'].includes(b.stage));
  if(w.field.place==='home')return w.birds.filter(b=>b.home!=='departed');
  if(w.field.place==='park')return [...w.birds.filter(b=>b.home!=='departed'&&['juvenile','adult'].includes(b.stage)),...w.birds.filter(b=>b.home==='departed'&&b.stage==='adult'&&isAlive(w,b))].slice(0,12);
  const host=findBird(w,w.field.hostId);
  return [...resident,...w.birds.filter(b=>isAlive(w,b)&&!resident.includes(b)&&(b.id===host?.id||b.id===host?.partner))].slice(0,12);
}
export function travelTo(w,place,hostId=null) {
  if(!['home','park','friend'].includes(place))throw new Error('行き先を選んでね。');
  const host=place==='friend'?findBird(w,hostId):null;
  if(place==='friend'&&(!host||!isAlive(w,host)||host.home==='resident'||host.stage!=='adult'))throw new Error('お友達の成鳥のおうちを選んでね。');
  if(w.field.place===place&&w.field.hostId===(host?.id||null))return {changed:false,message:'いまここにいるよ。'};
  w.field={place,hostId:host?.id||null,enteredTick:w.tick};bumpRevision(w);
  return {changed:true,message:place==='home'?'自分たちのおうちに帰ったよ。':place==='park'?'文鳥公園に着いたよ。':`${host.name}のおうちに遊びに来たよ。`};
}
export function inviteFriend(w,birdId) {
  const b=findBird(w,birdId);
  if(!b||!isAlive(w,b)||b.home==='resident'||b.stage!=='adult')throw new Error('お友達の成鳥を選んでね。');
  if(b.home==='visitor')return {changed:false,message:'もう遊びに来ているよ。'};
  if(cageVisitorCount(w)>=LIMITS.visitors)throw new Error('お客さんは6羽まで。今いる友達と過ごそう。');
  b.home='visitor';b.arrivedTick=w.tick;setAction(w,b,'visit');record(w,'revisit',[b.id],'お友達を自分たちのおうちへ招いた','いっしょに過ごす時間が始まった');bumpRevision(w);
  return {changed:true,message:`${b.name}を招いたよ。おうちに帰って一緒に過ごそう。`};
}
/** Send only this visiting friend home, without changing its identity or history.
 * Its automatic return waits until Japanese midnight; an explicit invite still works.
 */
export function dismissHomeFriend(w,birdId,expectedToken,now=Date.now()) {
  if(!currentToken(w,expectedToken))return {...staleEconomy(),reason:'stale'};
  if(w.field.place!=='home')return {changed:false,reason:'location',message:'おうちでお友達を見送ろう。'};
  const bird=findBird(w,birdId);
  if(!bird||bird.home!=='visitor'||bird.id===getProtagonistId(w)||!isAlive(w,bird))return {changed:false,reason:'unavailable',message:'今おうちに遊びに来ているお友達を選んでね。'};
  if(!Number.isSafeInteger(now)||now<0||now>MAX_DATE_MS)throw new Error('端末の日時を確認してください。');
  const at=Math.max(now,w.lastUpdated,w.careSchedule.seenAt,w.economy.seenAt),day=86400000,offset=9*3600000;
  const until=Math.min(MAX_DATE_MS,(Math.floor((at+offset)/day)+1)*day-offset);
  upgradeEncounterState(w.encounters);
  const goodbye=w.encounters.homeGoodbyes.find(g=>g.birdId===bird.id);
  if(goodbye)goodbye.until=Math.max(goodbye.until,until);
  else w.encounters.homeGoodbyes.push({birdId:bird.id,until});
  bird.home='departed';setAction(w,bird,'rest');
  for(const other of w.birds)if(other.action.target===bird.id)setAction(w,other,'rest');
  if(w.adoption.pending?.birdId===bird.id)w.adoption.pending=null;
  bumpRevision(w);
  return {changed:true,birdId:bird.id,message:`${bird.name}は自分のおうちに帰ったよ。また「友達」から招けるよ。`};
}
/** Closing the home affects presence only. Friendships, family and belongings stay intact.
 * Automatic arrivals resume at the next Japanese midnight, independently of story ticks.
 * Explicit invitations remain available, including while automatic visits are closed.
 */
export function homeVisitsClosed(w,now=Date.now()) {
  const at=Math.max(now,w.lastUpdated,w.careSchedule.seenAt,w.economy.seenAt);
  return (w.encounters.homeClosedUntil||0)>at;
}
export function endHomeVisits(w,expectedToken,now=Date.now()) {
  if(!currentToken(w,expectedToken))return staleEconomy();
  if(w.field.place!=='home')return {changed:false,reason:'location',message:'おうちでお客さまを見送ろう。'};
  if(!Number.isSafeInteger(now)||now<0||now>MAX_DATE_MS)throw new Error('端末の日時を確認してください。');
  const visitors=w.birds.filter(b=>b.home==='visitor'&&b.id!==getProtagonistId(w)),foreign=w.encounters.cageVisitors||[];
  if(!visitors.length&&!foreign.length&&homeVisitsClosed(w,now))return {changed:false,reason:'closed',message:'今日はお開きにしたよ。家族とゆっくり過ごそう。'};
  const count=visitors.length+foreign.length,leaving=new Set(visitors.map(b=>b.id));
  for(const bird of visitors){bird.home='departed';setAction(w,bird,'rest');}
  for(const bird of w.birds)if(leaving.has(bird.action.target))setAction(w,bird,'rest');
  if(w.adoption.pending&&leaving.has(w.adoption.pending.birdId))w.adoption.pending=null;
  upgradeEncounterState(w.encounters);w.encounters.cageVisitors=[];
  const at=Math.max(now,w.lastUpdated,w.careSchedule.seenAt,w.economy.seenAt),day=86400000,offset=9*3600000;
  w.encounters.homeClosedUntil=Math.min(MAX_DATE_MS,(Math.floor((at+offset)/day)+1)*day-offset);
  bumpRevision(w);
  return {changed:true,count,message:count?`${count}羽のお友達を見送ったよ。今日は家族とゆっくり過ごそう。`:'今日は家族とゆっくり過ごそう。'};
}
export function decorOdds(w) { const n=DECOR_TIERS.filter(t=>decorLevel(w)>=t.level).length;return DECOR_TIERS.slice(0,n).map((t,i)=>({tierId:t.id,probability:(n===1?[1]:n===2?[.65,.35]:[.65,.25,.1])[i]})); }
export function drawDecoration(w,slot='perch') {
  if(!Object.hasOwn(SLOT_LABELS,slot))throw new Error('9種類の道具から選んでね。');
  if(w.decor.lastDrawTick===w.tick)return {changed:false,message:'さっきのお飾りを楽しもう。次のゲーム時間にまた引けるよ。'};
  if(w.decor.points<DECOR_DRAW_COST)throw new Error('20 Gemsで1回。友達との交流や家族の成長を見守ろう。');
  const available=DECOR_TIERS.filter(t=>decorLevel(w)>=t.level);
  const roll=random(w),tier=available.length===3&&roll>=.9?available[2]:available.length>=2&&roll>=.65?available[1]:available[0];
  const color=pick(w,Object.keys(COLOR_HEX)),id=`${slot}-${color}-${tier.id}`;
  const item={id,slot,color,tier:tier.id},duplicate=w.decor.inventory.some(x=>x.id===id);
  w.decor.points-=DECOR_DRAW_COST;
  if(duplicate)w.decor.points=Math.min(POINT_CAP,w.decor.points+8);else w.decor.inventory.push(item);
  w.decor.draws=Math.min(POINT_CAP,w.decor.draws+1);w.decor.lastDrawTick=w.tick;bumpRevision(w);
  return {changed:true,item,duplicate,message:duplicate?'同じお飾りだったので8 Gemsを返したよ。':`${SLOT_LABELS[slot]}のお飾りが仲間入り！`};
}
export function equipDecoration(w,itemId) {
  const item=w.decor.inventory.find(x=>x.id===itemId);if(!item)throw new Error('持っているお飾りを選んでね。');
  if(w.decor.equipped[item.slot]===itemId)return {changed:false,message:'もう飾ってあるよ。'};
  w.decor.equipped[item.slot]=itemId;bumpRevision(w);return {changed:true,message:`${SLOT_LABELS[item.slot]}を飾ったよ。`};
}
function awardEvent(w,kind) { reserveAutomaticGems(w.economy,kind); }

export function economyToken(w){return {worldId:w.worldId,revision:w.revision};}
function currentToken(w,token){return token&&token.worldId===w.worldId&&token.revision===w.revision;}
const staleEconomy=()=>({changed:false,gemAward:0,goldAward:0,goldSpent:0,message:'おうちが変わったよ。もう一度選んでね。'});
export function claimAutomaticGift(w,giftId,expectedToken,now=Date.now()){
 if(!currentToken(w,expectedToken))return staleEconomy();
 const synced=syncEconomy(w.economy,careTime(now)),gift=w.economy.pending;
 if(!gift||gift.id!==giftId){if(synced)bumpRevision(w);return {changed:false,gemAward:0,message:'もう受け取っているよ。'};}
 const gemAward=grantGems(w,Math.min(gift.amount,POINT_CAP-w.decor.points));
 if(gemAward){gift.amount-=gemAward;if(!gift.amount)w.economy.pending=null;}
 if(synced||gemAward)bumpRevision(w);
 return {changed:gemAward>0,gemAward,message:gemAward?`${gemAward} Gemsを受け取ったよ。`:'お財布がいっぱい。贈り物はここに残しておくね。'};
}
export function ordinaryFurnitureCatalog(w){return DECOR_SLOTS.flatMap(({id:slot})=>DECOR_COLORS.map(({id:color})=>({id:`${slot}-${color}-cozy`,slot,color,tier:'cozy',gold:ECONOMY_RULES.ordinaryFurnitureGold,owned:w.decor.inventory.some(i=>i.id===`${slot}-${color}-cozy`)})));}
export function buyOrdinaryFurniture(w,itemId,expectedToken,now=Date.now()){
 if(!currentToken(w,expectedToken))return staleEconomy();
 const item=ordinaryFurnitureCatalog(w).find(i=>i.id===itemId);
 if(!item)throw new Error('お店にある道具を選んでね。');
 if(item.owned)return {changed:false,goldSpent:0,message:'この道具はもう持っているよ。'};
 if(w.economy.gold<item.gold)return {changed:false,goldSpent:0,message:'16 Goldで選べるよ。お世話をしながら貯めよう。'};
 syncEconomy(w.economy,careTime(now));w.economy.gold-=item.gold;
 const owned={id:item.id,slot:item.slot,color:item.color,tier:item.tier};w.decor.inventory.push(owned);bumpRevision(w);
 return {changed:true,goldSpent:item.gold,item:owned,message:'新しい道具を選んだよ。'};
}

export function findBird(w, id) { return w.birds.find(b => b.id === id); }
export function birdName(w, id) { return findBird(w, id)?.name || '文鳥'; }
function id(w) { return `b${w.nextId++}`; }
// Revision tokens are compared for equality, so rollover is safe and stays serializable.
export function bumpRevision(w) { w.revision = w.revision >= Number.MAX_SAFE_INTEGER ? 0 : w.revision + 1; return w.revision; }
export function createBird(w, options = {}) {
  if (w.birds.length >= LIMITS.birds) return null;
  const birdId = id(w);
  // Preserve the old story PRNG draw independently from human-readable naming.
  if (!options.name && !options.skipNameDraw) random(w);
  const namingFields = options.name ? {name:options.name,naming:options.automaticName?automaticNaming(options.name):manualNaming(options.name)} : defaultNameFields(w,birdId);
  const b = { id: birdId, ...namingFields, sex: options.sex || (random(w) < .5 ? 'female' : 'male'), color: options.color || pick(w, COLORS), stage: options.stage || 'adult', bornTick: w.tick, stageTick: w.tick, arrivedTick: w.tick, parents: options.parents || [], generation: options.generation || 0, partner: null, pairTick: null, eggsLaid: 0, lastEggTick: -1000, home: options.home || 'visitor', personality: { curiosity: 25 + Math.floor(random(w) * 65), sociability: 35 + Math.floor(random(w) * 55), caution: 15 + Math.floor(random(w) * 65) }, preference: pick(w, PREFERENCES), mood: 70, needs: { energy: 80, food: 80, play: 60 }, care: { lastFedTick: null, lastPetTick: null }, gemCare: initialGemCare(), relations: {}, memories: [], milestones: [], action: { kind: 'rest', target: null, startedTick: w.tick }, lastSocialTick: -1 };
  w.birds.push(b); registerLifeBird(w,b); return b;
}
function remember(w, b, kind, otherId = null) { const memory = { kind, otherId, tick: w.tick }; b.memories.push(memory); if (b.memories.length > LIMITS.memories) b.memories.shift(); if (['welcome','adopt','movein','pair','egg','hatch','grow','depart'].includes(kind) && !b.milestones.some(m => m.kind === kind && m.otherId === otherId)) { b.milestones.push(memory); if (b.milestones.length > LIMITS.memories) b.milestones.shift(); } }
function record(w, kind, ids, condition, result, data = {}) {
  const prior = w.events.at(-1);
  if (!['user-feed', 'user-pet'].includes(kind) && prior && prior.kind === kind && prior.ids.join() === ids.join() && w.tick - prior.tick < 3) return;
  // An imported astronomic counter must not lose numeric precision. Bird IDs never change.
  if (w.nextEvent >= Number.MAX_SAFE_INTEGER) { w.events.forEach((event, i) => { event.id = `e${i + 1}`; }); w.nextEvent = w.events.length + 1; }
  const e = { id: `e${w.nextEvent++}`, kind, ids, condition, result, data, tick: w.tick, at: w.epoch + w.tick * TICK_MS };
  awardEvent(w,kind);
  w.events.push(e); if (w.events.length > LIMITS.events) w.events.shift();
  for (const bid of ids) { const b = findBird(w, bid); if (b) remember(w, b, kind, ids.find(i => i !== bid) || null); }
}
function lifeEvent(w,event){
 const text=event.kind==='death'?{accident:'ゲーム内の猛禽との遭遇で事故にあい、旅立った',lifespan:'ゲーム内の10年を生き、静かに旅立った',neglect:'現実の3日間、ごはんが届かなかった',illness:'ゲームの病気を治療しないまま時間が過ぎた',injury:'けんかのけがを治療しないまま時間が過ぎた'}[event.cause]:event.kind==='illness'?'体調の変化に気づいた。病院で診てもらおう':event.kind==='caretaker-treatment'?'飼育員さんが病院へ連れていった':'病院で治療を受けて元気になった';
 record(w,event.kind,[event.birdId],text,event.kind==='death'?'名前と家族と思い出は、お墓にずっと残る':text);
}
function synchronizeProtagonist(w){const succession=syncProtagonist(w);if(succession){record(w,'succession',[succession.fromId,succession.toId],'先代の子が家族の物語を引き継ぐ',`${birdName(w,succession.toId)}が第${w.protagonist.lineage.length}代の主人公になった`);bumpRevision(w);}return succession;}
function synchronizeLife(w,now,story=false){const result=syncLifecycle(w,now,{story});for(const event of result.events)lifeEvent(w,event);if(result.changed)bumpRevision(w);synchronizeProtagonist(w);return result;}
/** Visible raptor countdown, death, diary and succession commit together. */
export function advanceGardenRaptor(w,elapsed,now,expected){
 const result=advanceRaptorState(w,elapsed,now,expected);
 if(result.deathBirdId){const event=accidentLifeBird(w,result.deathBirdId,now);if(event){lifeEvent(w,event);synchronizeProtagonist(w);result.death=true;result.message='事故で旅立ちました。名前と家族と思い出は、お墓に残ります。';}}
 return result;
}
export function treatBird(w,birdId,token,now=Date.now()){
 if(!currentToken(w,token))return staleEconomy();synchronizeLife(w,careTime(now));
 const result=treatLifeBird(w,birdId,economyToken(w),careTime(now));if(result.event)lifeEvent(w,result.event);if(result.changed)bumpRevision(w);return result;
}
export function hireCaretaker(w,days,token,now=Date.now()){
 if(!currentToken(w,token))return staleEconomy();synchronizeLife(w,careTime(now));
 const result=hireLifeCaretaker(w,days,economyToken(w),careTime(now));if(result.changed){synchronizeLife(w,careTime(now));bumpRevision(w);}return result;
}
export function honorBird(w,birdId,kind,token,now=Date.now()){
 if(!currentToken(w,token))return staleEconomy();synchronizeLife(w,careTime(now));
 const result=honorLifeBird(w,birdId,kind,economyToken(w),careTime(now));if(result.changed)bumpRevision(w);return result;
}
export function createWorld(now = Date.now(), seed = 842911) {
  const w = { version: SAVE_VERSION, revision: 0, worldId: `garden-${now}-${seed}`, epoch: now, lastUpdated: now, seed: seed >>> 0, tick: 0, nextId: 1, nextEvent: 1, paused: false, settings: { motion: true, careSound: true, adoptionMode:'ask' }, care: { cleanliness: 100, lastCleanTick: null }, birds: [], events: [], offlineSummary: null, field: initialField(), decor: initialDecor(), gems: {droppings:[],nextDropId:1}, encounters:initialEncounterState(), economy:initialEconomy(careTime(now)), adoption:{pending:null,dismissed:[]} };
  initializeCareSchedule(w,careTime(now)); initializeLifecycle(w,careTime(now));
  const b = createBird(w, { name: 'おもち', automaticName:true, sex: 'female', color: 'white', home: 'resident' });
  initializeProtagonist(w);
  b.personality = { curiosity: 65, sociability: 75, caution: 30 };
  record(w, 'welcome', [b.id], '新しい庭', '物語が始まった'); return w;
}
function relation(w, a, b) {
  if (!a.relations[b.id]) a.relations[b.id] = { affection: 10, trust: 10, compatibility: clamp(100 - Math.abs(a.personality.sociability - b.personality.sociability) * .55 - Math.abs(a.personality.curiosity - b.personality.curiosity) * .3 + (a.preference === b.preference ? 10 : 0), 25, 100), meetings: 0, lastTick: w.tick };
  return a.relations[b.id];
}
export function ancestors(w, birdId, out = new Set()) {
  const b = findBird(w, birdId); if (!b) return out;
  for (const p of b.parents) if (!out.has(p)) { out.add(p); ancestors(w, p, out); }
  return out;
}
/** Conservatively excludes any known shared ancestry, including first cousins. */
export function isRelated(w, aId, bId) {
  if (aId === bId) return true;
  const a = ancestors(w, aId), b = ancestors(w, bId);
  return a.has(bId) || b.has(aId) || [...a].some(x => b.has(x));
}
export function canPair(w, a, b) { return !!a && !!b && isAlive(w,a) && isAlive(w,b) && a.id !== b.id && a.stage === 'adult' && b.stage === 'adult' && a.sex !== b.sex && !a.partner && !b.partner && a.home !== 'departed' && b.home !== 'departed' && !isRelated(w, a.id, b.id); }
export function relationshipLabel(w, a, b) {
  if (a.partner === b.id) return 'つがい';
  if (isRelated(w, a.id, b.id)) return a.parents.includes(b.id) ? '親' : b.parents.includes(a.id) ? '子' : '親せき';
  const r = a.relations[b.id]; if (!r) return '初対面';
  if (r.affection < 8 && r.meetings > 2) return '少し距離をおく';
  if (r.affection > 70 && r.trust > 55 && canPair(w, a, b)) return '気になる相手';
  if (r.affection > 65 && r.trust > 50) return '仲のよい友達';
  if (r.affection > 35) return '友達';
  return '顔見知り';
}
function setAction(w, b, kind, target = null) { b.action = { kind, target, startedTick: w.tick }; }
function chooseTarget(w, b, active) {
  const choices = active.filter(o => o.id !== b.id && o.stage !== 'egg' && o.stage !== 'chick').map(o => {
    const r = b.relations[o.id];
    const previous = b.memories.slice(-4).filter(m => m.otherId === o.id && m.kind === 'declined').length;
    return { b: o, score: 10 + (r ? r.affection * .22 + r.compatibility * .3 : b.personality.curiosity * .5 - b.personality.caution * .15) + (b.partner === o.id ? 22 : 0) - previous * 16 + random(w) * 28 };
  });
  choices.sort((a, c) => c.score - a.score); return choices[0]?.b;
}
function interact(w, a, b) {
  const ar = relation(w, a, b), br = relation(w, b, a);
  ar.meetings = Math.min(Number.MAX_SAFE_INTEGER, ar.meetings + 1); br.meetings = Math.min(Number.MAX_SAFE_INTEGER, br.meetings + 1); ar.lastTick = br.lastTick = w.tick;
  const sleepy = b.needs.energy < 32;
  const wary = br.meetings < 3 && b.personality.caution > 62;
  const needsSpace = b.action.kind === 'rest' && b.needs.energy < 50;
  if (sleepy || wary || needsSpace) {
    ar.affection = clamp(ar.affection - (wary ? 1 : 3)); br.trust = clamp(br.trust + 1);
    setAction(w, a, 'talk', b.id);
    const injury=noteLifeConflict(w,a,b);if(injury)lifeEvent(w,injury);
    record(w, 'declined', [a.id, b.id], sleepy || needsSpace ? '相手は眠かった' : '相手はまだ慎重だった', '今日は休んで、また今度');
    return;
  }
  const recentRefusal = a.memories.slice(-6).some(m => m.kind === 'declined' && m.otherId === b.id);
  const bath = a.preference === '水浴び' || b.preference === '水浴び';
  const kind = bath && w.tick % 3 === 0 ? 'bath' : 'play';
  const gain = 3 + ar.compatibility / 35 + a.personality.sociability / 65;
  ar.affection = clamp(ar.affection + gain); br.affection = clamp(br.affection + gain * (.55 + b.personality.sociability / 160));
  ar.trust = clamp(ar.trust + 4); br.trust = clamp(br.trust + 3);
  a.mood = clamp(a.mood + 5); b.mood = clamp(b.mood + 4);
  a.needs.play = clamp(a.needs.play + 22); b.needs.play = clamp(b.needs.play + 14);
  // Real care energy is independent of fast autonomous social turns.
  setAction(w, a, kind, b.id); setAction(w, b, kind, a.id);
  record(w, recentRefusal ? 'reconcile' : kind, [a.id, b.id], recentRefusal ? '前は休んだけれど、今日は元気だった' : `${bath ? '水浴びの好み' : '遊びたい気分'}と相性が合った`, '親しさと信頼が少し育った');
  for (const visitor of [a, b].filter(x => x.home === 'visitor')) {
    const vr = visitor.relations[visitor.id === a.id ? b.id : a.id];
    if (!w.adoption.dismissed.includes(visitor.id) && (!visitor.partner || findBird(w, visitor.partner)?.home === 'resident') && vr.affection >= 32 && vr.meetings >= 4 && w.birds.filter(x => x.home === 'resident').length < LIMITS.residents) {
      if(w.settings.adoptionMode==='auto'){visitor.home = 'resident'; const life=lifeStatus(w,visitor);if(life)life.lastCareAt=w.lifecycle.seenAt; record(w, 'movein', [visitor.id], '何度も会って親しくなった', '庭の仲間になった');}
      else if(!w.adoption.pending&&!w.adoption.dismissed.includes(visitor.id))w.adoption.pending={birdId:visitor.id,arrivedTick:visitor.arrivedTick};
    }
  }
  if (canPair(w, a, b) && ar.affection > 74 && br.affection > 70 && ar.trust > 55 && br.trust > 55 && ar.meetings >= 10 && w.tick - Math.max(a.arrivedTick, b.arrivedTick) >= 16 && ar.compatibility >= 55) {
    a.partner = b.id; b.partner = a.id; a.pairTick = b.pairTick = w.tick;
    record(w, 'pair', [a.id, b.id], '成鳥で、血縁がなく、双方の信頼が育った', 'つがいになった');
  }
}
function grow(w) {
  for (const b of w.birds.filter(b=>isAlive(w,b))) {
    const age = w.tick - b.stageTick;
    const next = b.stage === 'egg' && age >= 12 ? 'chick' : b.stage === 'chick' && age >= 24 ? 'juvenile' : b.stage === 'juvenile' && age >= 48 ? 'adult' : null;
    if (next) { b.stage = next; b.stageTick = w.tick; if (next === 'chick' && (b.naming.source === 'automatic' || b.naming.source === 'legacy' && /^たまご[12]$/.test(b.name))) random(w); record(w, next === 'chick' ? 'hatch' : 'grow', [b.id, ...b.parents], '成長の時間がたった', `${STAGES[next]}になった`, { stage: next }); }
  }
}
function births(w) {
  for (const mother of w.birds.filter(b => b.sex === 'female' && b.stage === 'adult' && b.partner && b.home === 'resident')) {
    const father = findBird(w, mother.partner); if (!father || father.home !== 'resident' || isRelated(w, mother.id, father.id)) continue;
    const r = mother.relations[father.id], rr = father.relations[mother.id];
    if (!r || !rr || r.trust < 60 || rr.trust < 60 || mother.mood < 55 || father.mood < 55 || mother.needs.energy < 35 || mother.eggsLaid >= 2 || w.tick - mother.pairTick < 20 || w.tick - mother.lastEggTick < 65 || w.birds.filter(b => b.home === 'resident').length >= LIMITS.residents || w.birds.length >= LIMITS.birds) continue;
    if (w.tick % 7 !== 0) continue;
    const egg = createBird(w, { skipNameDraw:true, stage: 'egg', parents: [mother.id, father.id], generation: Math.max(mother.generation, father.generation) + 1, home: 'resident' });
    mother.eggsLaid++; mother.lastEggTick = w.tick; setAction(w, mother, 'nest', egg.id);
    record(w, 'egg', [egg.id, mother.id, father.id], '成鳥・信頼・気分・時間・空き場所がそろった', '巣に卵が生まれた');
  }
}
function visits(w, now=Date.now()) {
  if (!homeVisitsClosed(w,now) && (w.tick === 1 || w.tick % 28 === 0)) {
    const resident = w.birds.filter(b => b.home === 'resident');
    const visitors = w.birds.filter(b => b.home === 'visitor');
    if (cageVisitorCount(w) < LIMITS.visitors && w.birds.length < LIMITS.birds) {
      const single = resident.filter(b => b.stage === 'adult' && !b.partner).sort((a, b) => b.generation - a.generation)[0];
      const v = createBird(w, { skipNameDraw:w.tick === 1, sex: single ? (single.sex === 'female' ? 'male' : 'female') : undefined });
      if (w.tick === 1) { v.personality.sociability = 70; v.personality.caution = 25; }
      setAction(w, v, 'visit'); record(w, 'visit', [v.id], '庭の外からやって来た', '新しい出会い');
    }
    if (w.tick % 84 === 0) {
      const at=Math.max(now,w.lastUpdated,w.careSchedule.seenAt,w.economy.seenAt);
      const away = w.birds.filter(b => b.home === 'departed' && b.stage === 'adult' && isAlive(w,b) && !w.encounters.homeGoodbyes?.some(g=>g.birdId===b.id&&g.until>at));
      if (away.length && cageVisitorCount(w) < LIMITS.visitors) {
        const v = pick(w, away); v.home = 'visitor'; v.arrivedTick = w.tick; setAction(w, v, 'visit'); record(w, 'revisit', [v.id], '昔の庭のことを覚えていた', 'また遊びに来た');
      }
    }
  }
  // Resident independence is always a separate, explicitly accepted consultation.
  for (const b of w.birds.filter(b => b.home === 'visitor' && w.tick - b.arrivedTick > 96)) { b.home = 'departed'; record(w, 'depart', [b.id], '外の庭にも暮らしがある', 'また会う約束をした'); }
}
export function stepWorld(w, now=w.lifecycle?.seenAt??Date.now()) {
  const economySynced=syncEconomy(w.economy,careTime(now));if(economySynced)bumpRevision(w);
  if (w.paused || !Number.isSafeInteger(w.tick + 1) || w.epoch + (w.tick + 1) * TICK_MS > MAX_DATE_MS) return w;
  w.tick++; synchronizeLife(w,careTime(now),true); w.care.cleanliness = Math.max(0, w.care.cleanliness - CARE_RULES.soilPerTick); grow(w); synchronizeProtagonist(w); expireEncounterVisitors(w); visits(w,now);
  if(w.field.place==='friend'&&findBird(w,w.field.hostId)?.home==='resident')w.field={place:'home',hostId:null,enteredTick:w.tick};
  const active = fieldBirds(w).filter(b => b.stage !== 'egg');
  for (const b of active) {
    b.needs.play = clamp(b.needs.play - 4, 8, 100);
    b.mood = clamp(b.mood + (b.needs.energy > 40 ? .3 : -.3), 35, 100);
    if (b.stage === 'chick') { setAction(w, b, 'nest'); b.needs.food = 85; b.needs.energy = 90; continue; }
    if (b.needs.energy < 33 || b.action.kind === 'rest' && b.needs.energy < 65) { setAction(w, b, 'rest'); continue; }
    if (b.needs.food < 35) { b.mood = clamp(b.mood + 2); setAction(w, b, 'eat'); continue; }
    const social = (b.needs.play < 48 ? .68 : .42) + b.personality.sociability / 350;
    if (random(w) < social && b.lastSocialTick !== w.tick) {
      const target = chooseTarget(w, b, active);
      if (target) { b.lastSocialTick = w.tick; target.lastSocialTick = w.tick; interact(w, b, target); continue; }
    }
    const repeat = b.action.kind;
    const options = ['bath', 'explore', 'rest'].filter(k => k !== repeat);
    const kind = pick(w, options); setAction(w, b, kind);
    if (kind !== 'rest') { b.needs.play = clamp(b.needs.play + 12); if ((kind === 'bath' && b.preference === '水浴び') || (kind === 'explore' && b.personality.curiosity > 60)) b.mood = clamp(b.mood + 4); }
  }
  births(w); refreshAdoption(w); produceDroppings(w); bumpRevision(w); return w;
}
export function advanceTicks(w, count, now=w.lifecycle?.seenAt??Date.now()) { if (!Number.isFinite(count) || count <= 0) return w; for (let i = 0; i < Math.min(Math.floor(count), 100000); i++) stepWorld(w,now); return w; }
export function advanceTo(w, now = Date.now()) {
  if (!Number.isSafeInteger(now) || now < 0 || now > MAX_DATE_MS) return w;
  if(syncEconomy(w.economy,careTime(now)))bumpRevision(w);
  const careSync=syncCareSchedule(w,careTime(now));
  if(careSync.renewed)bumpRevision(w);
  synchronizeLife(w,careTime(now));
  // Keep a high-water mark: moving the wall clock back must not replay an interval.
  if (now < w.lastUpdated) return w;
  if (w.paused) { w.lastUpdated = now; return w; }
  const due = Math.floor((now - w.lastUpdated) / TICK_MS);
  if (!due) return w;
  const count = Math.min(due, LIMITS.offlineTicks, Math.max(0, Math.floor((MAX_DATE_MS - w.epoch) / TICK_MS) - w.tick)), before = { birds: w.birds.length, tick: w.tick };
  advanceTicks(w, count, now);
  w.lastUpdated = due > LIMITS.offlineTicks ? now : w.lastUpdated + count * TICK_MS;
  if (due > 4) w.offlineSummary = { ticks: w.tick - before.tick, skipped: Math.max(0, due - (w.tick - before.tick)), newBirds: w.birds.length - before.birds, fromTick: before.tick, toTick: w.tick };
  return w;
}
export function renameBird(w, birdId, name) {
  const b = findBird(w, birdId); const clean = typeof name === 'string' ? name.trim().slice(0, 16) : '';
  if (!b || !clean || /[\u0000-\u001f\u007f]/.test(clean)) throw new Error('名前を1〜16文字で入力してね。');
  b.name = clean; b.naming=manualNaming(clean); bumpRevision(w); return b;
}
/** Read-only proposals. Household capacity never authorizes an automatic move. */
export function independenceCandidates(w){
  if(w.birds.filter(b=>b.home==='resident').length<LIMITS.residents||w.field.place!=='home'||w.encounters.garden.open||w.encounters.raptor?.active)return [];
  const protagonist=findBird(w,getProtagonistId(w));
  const safe=b=>!!b&&b.home==='resident'&&b.stage==='adult'&&isAlive(w,b)&&!lifeStatus(w,b)?.condition&&b.id!==protagonist?.id&&b.id!==protagonist?.partner&&!w.birds.some(child=>child.parents.includes(b.id)&&isAlive(w,child)&&child.stage!=='adult');
  const seen=new Set(),groups=[];
  for(const bird of w.birds){
    if(!safe(bird)||seen.has(bird.id))continue;
    const partner=bird.partner&&findBird(w,bird.partner),together=partner&&isAlive(w,partner);
    if(together&&!safe(partner))continue;
    const members=together?[bird,partner]:[bird];
    members.forEach(b=>seen.add(b.id));groups.push({ids:members.map(b=>b.id),names:members.map(b=>b.name)});
  }
  return groups;
}
/** Apply the exact approved group in one fresh-state transaction; never erase a bird. */
export function acceptIndependence(w,ids,expectedToken,now=Date.now()){
  if(!currentToken(w,expectedToken))return {...staleEconomy(),reason:'stale'};
  const same=g=>Array.isArray(ids)&&ids.length===g.ids.length&&new Set(ids).size===ids.length&&g.ids.every(id=>ids.includes(id));
  const unavailable=()=>({changed:false,reason:'unavailable',message:'今は独立の相談をお休みするよ。おうちで家族の様子を見てね。'});
  if(!independenceCandidates(w).some(same))return unavailable();
  if(!Number.isSafeInteger(now)||now<0||now>MAX_DATE_MS)throw new Error('端末の日時を確認してください。');
  // A long-open confirmation cannot bypass real care deadlines or succession.
  synchronizeLife(w,careTime(now));
  const group=independenceCandidates(w).find(same);if(!group)return unavailable();
  const leaving=new Set(group.ids);
  for(const bird of w.birds){
    if(leaving.has(bird.id)){
      bird.home='departed';setAction(w,bird,'rest');
      if(!w.adoption.dismissed.includes(bird.id))w.adoption.dismissed.push(bird.id);
    }else if(leaving.has(bird.action.target))setAction(w,bird,'rest');
  }
  w.encounters.gardenFriends.companions=w.encounters.gardenFriends.companions.filter(id=>!leaving.has(id));
  record(w,'depart',group.ids,'成鳥の独立の相談を利用者が承諾した','名前・家系・思い出を残して別のおうちで暮らし始めた');
  bumpRevision(w);
  return {changed:true,ids:group.ids,message:`${group.names.join('と')}が新しいおうちへ独立したよ。家系図と名簿に残り、友達としてまた招けるよ。`};
}
export function adoptBird(w, birdId, name) {
  const b = findBird(w, birdId); if (!b || b.home !== 'visitor') throw new Error('今来ている文鳥を選んでね。');
  if (w.birds.filter(x => x.home === 'resident').length >= LIMITS.residents) throw new Error('家族は6羽まで。今いる仲間を見守ろう。');
  if (name) renameBird(w, b.id, name);
  b.home = 'resident'; const life=lifeStatus(w,b);if(life)life.lastCareAt=w.lifecycle.seenAt; refreshAdoption(w); record(w, 'adopt', [b.id], '利用者が迎え入れた', 'この庭で暮らし始めた'); bumpRevision(w); return b;
}
function refreshAdoption(w){
 const p=w.adoption.pending,b=p&&findBird(w,p.birdId);
 if(p&&(!b||b.home!=='visitor'||b.arrivedTick!==p.arrivedTick||w.birds.filter(b=>b.home==='resident').length>=LIMITS.residents))w.adoption.pending=null;
}
export function setAdoptionMode(w,mode,expectedToken){
 if(!currentToken(w,expectedToken))return staleEconomy();
 if(!['ask','auto'].includes(mode))throw new Error('お迎えの方法を選んでね。');
 if(w.settings.adoptionMode===mode)return {changed:false,message:'今の設定だよ。'};
 w.settings.adoptionMode=mode;if(mode==='auto')w.adoption.pending=null;bumpRevision(w);
 return {changed:true,message:mode==='ask'?'お迎えの前に相談するよ。':'仲良くなったら自然にお迎えするよ。'};
}
export function resolveAdoption(w,birdId,choice,expectedToken,now=Date.now()){
 if(!currentToken(w,expectedToken))return staleEconomy();
 if(!['accept','later'].includes(choice))throw new Error('お迎えするか、また遊ぶかを選んでね。');
 const p=w.adoption.pending,b=findBird(w,birdId);
 if(!p||p.birdId!==birdId||!b||b.home!=='visitor'||b.arrivedTick!==p.arrivedTick)return {changed:false,message:'また会えるときを待とう。'};
 if(choice==='accept'&&w.birds.filter(b=>b.home==='resident').length>=LIMITS.residents)return {changed:false,message:'家族は6羽まで。また遊ぼう。'};
 if(choice==='later'){if(!w.adoption.dismissed.includes(b.id))w.adoption.dismissed.push(b.id);w.adoption.pending=null;bumpRevision(w);return {changed:true,message:'また遊ぼうね。お友達のままだよ。'};}
 synchronizeLife(w,careTime(now));syncEconomy(w.economy,careTime(now));w.adoption.pending=null;b.home='resident';lifeStatus(w,b).lastCareAt=w.lifecycle.seenAt;record(w,'movein',[b.id],'利用者がお迎えの相談にこたえた','いっしょに暮らし始めた');bumpRevision(w);
 return {changed:true,message:`${b.name}といっしょに暮らし始めたよ。`};
}
// Care and health are fictional game rules, not biological or veterinary advice.
// Tick-based stamps survive memory eviction and are committed in the same store transaction.
export function getFullness(w, birdId) {
  const bird = findBird(w, birdId);
  if (!bird) throw new Error('文鳥を選んでね。');
  return bird.needs.food; // Higher always means more full, never hunger.
}
export function getCleanliness(w) { return w.care.cleanliness; }
function careBird(w, birdId) {
  const bird = findBird(w, birdId);
  if (!bird || bird.home === 'departed') throw new Error('いま庭にいる文鳥を選んでね。');
  if (!['juvenile', 'adult'].includes(bird.stage)) throw new Error('卵やひなは巣で育つ時間。そっと見守ろう。');
  return bird;
}
function remaining(lastTick, tick, interval) { return lastTick === null ? 0 : Math.max(0, interval - (tick - lastTick)); }
function careResult(kind, birdId, changed, before, after, cooldownTicks, message, reason) {
  return { kind, birdId, changed, before, after, cooldownTicks, message, reason, gemAward:0, goldAward:0 };
}
export function feedBird(w, birdId, now=w.lifecycle?.seenAt??Date.now(), expectedToken) {
  if(expectedToken&&!currentToken(w,expectedToken))return staleEconomy();
  const bird=careBird(w,birdId);synchronizeLife(w,careTime(now));
  if(!isAlive(w,bird))return {...staleEconomy(),reason:'unavailable',message:'思い出の庭で会えるよ。'};
  const result=applyScheduledCare(w,birdId,'feed',careTime(now));
  if(!result.changed)return {...careResult('feed',birdId,false,result.before,result.after,0,`${bird.name}は、おなかいっぱい。`,'full'),nextAt:result.nextAt};
  noteLifeFeeding(w,bird,careTime(now));bird.care.lastFedTick=w.tick;fullMeal(w,bird);setAction(w,bird,'eat');
  const gemAward=grantGems(w,result.gemAward),goldAward=awardCareGold(w.economy);
  record(w,'user-feed',[birdId],'利用者がゲームのごはんを選んだ','おなかの満ちぐあいが増えた');bumpRevision(w);
  return {...careResult('feed',birdId,true,result.before,result.after,0,`${bird.name}がごはんを食べたよ。`,'success'),gemAward,goldAward,nextAt:result.nextAt};
}
export function petBird(w, birdId, now=w.lifecycle?.seenAt??Date.now(), expectedToken) {
  if(expectedToken&&!currentToken(w,expectedToken))return staleEconomy();
  const bird=careBird(w,birdId);synchronizeLife(w,careTime(now));
  if(!isAlive(w,bird))return {...staleEconomy(),reason:'unavailable',message:'思い出の庭で会えるよ。'};
  const result=applyScheduledCare(w,birdId,'pet',careTime(now));
  if(!result.changed)return {...careResult('pet',birdId,false,result.before,result.after,0,`${bird.name}は、元気いっぱい。`,'full'),nextAt:result.nextAt};
  bird.mood=clamp(bird.mood+CARE_RULES.petMoodGain);bird.care.lastPetTick=w.tick;setAction(w,bird,'talk');
  const gemAward=grantGems(w,result.gemAward),goldAward=awardCareGold(w.economy);
  record(w,'user-pet',[birdId],'利用者がゲームのふれあいを選んだ','元気が少し増えた');bumpRevision(w);
  return {...careResult('pet',birdId,true,result.before,result.after,0,`${bird.name}「ぴっ♪」`,'success'),gemAward,goldAward,nextAt:result.nextAt};
}
export function cleanGarden(w) {
  const before = w.care.cleanliness;
  const wait = remaining(w.care.lastCleanTick, w.tick, CARE_RULES.cleanCooldownTicks);
  const droppingCount = w.field.place === 'home' ? w.gems.droppings.length : 0;
  if ((before === 100 && !droppingCount) || wait) return careResult('clean', null, false, before, before, wait, '庭の床はきれいだよ。のんびり過ごそう。', wait ? 'cooldown' : 'clean');
  // The clean action collects the same home drops as individual taps, once.
  // Keep the existing per-drop reward and never collect remotely from a park.
  const gemAward = droppingCount ? grantGems(w, droppingCount * GEM_RULES.collect) : 0;
  if (droppingCount) w.gems.droppings = [];
  w.care.cleanliness = 100;
  w.care.lastCleanTick = w.tick;
  bumpRevision(w);
  return {...careResult('clean', null, true, before, 100, CARE_RULES.cleanCooldownTicks, '庭の床をきれいにしたよ。文鳥の羽の色は変わらないよ。', 'success'), gemAward, collectedDroppings:droppingCount};
}
export function talkToBird(w, birdId, text, now=w.lifecycle?.seenAt??Date.now(), expectedToken) {
  if(expectedToken&&!currentToken(w,expectedToken))return {...staleEconomy(),answer:"おうちが変わったよ。もう一度話しかけてね。",careChanged:false};
  const b = findBird(w, birdId); if (!b) throw new Error('文鳥を選んでね。');
  synchronizeLife(w,careTime(now));
  if(!isAlive(w,b))return {answer:'思い出の庭で、いっしょに過ごした日々を想おう。',gemAward:0,goldAward:0,careChanged:false};
  const input = String(text).trim().slice(0, 100);
  const care=applyScheduledCare(w,birdId,'talk',careTime(now),input);
  if(care.reason==='empty'||care.reason==='full')return {answer:care.reason==='full'?`${b.name}は、元気いっぱい。またあとで遊ぼう。`:'ことばを入れてね。',topic:'hello',gemAward:0,goldAward:0,careChanged:false,nextAt:care.nextAt};
  const friend = Object.entries(b.relations).sort((a, c) => c[1].affection - a[1].affection).find(([bid]) => findBird(w, bid));
  const near = friend ? birdName(w, friend[0]) : '庭のみんな';
  const last = b.memories.at(-1);
  let topic = 'hello', answer;
  if (b.stage === 'egg') answer = `${b.name}は、巣のなかで静かに育っているよ。`;
  else if (/(おやすみ|ねむ|眠|休)/.test(input)) { topic = 'rest'; setAction(w, b, 'rest'); answer = `${b.name}だよ。${b.needs.energy < 50 ? 'ちょうど眠かったんだ。' : '静かな時間もいいね。'}枝でひとやすみするね。`; }
  else if (/(水|みず|おふろ|浴)/.test(input)) { topic = 'bath'; b.needs.play = clamp(b.needs.play - 10); b.preference === '水浴び' && (b.mood = clamp(b.mood + 6)); setAction(w, b, 'bath'); answer = `${b.name}だよ。${b.preference === '水浴び' ? '水浴びの話、大好き！' : '花びらの水場を見にいこうかな。'}${near}も来るかな？`; }
  else if (/(ともだち|友|家族|なかよし|好き)/.test(input)) { topic = 'friend'; b.needs.play = clamp(b.needs.play - 8); answer = `${b.name}だよ。${friend ? `${near}とは「${relationshipLabel(w, b, findBird(w, friend[0]))}」。会うたび少しずつ知っていくんだ。` : 'まだ出会ったばかり。少しずつ仲良くなりたいな。'}`; }
  else if (/(あそ|遊|探検|たんけん)/.test(input)) { topic = 'play'; b.needs.play = clamp(b.needs.play - 12); b.mood = clamp(b.mood + 5); answer = `${b.name}だよ。${b.needs.energy < 35 ? 'いまは少し休みたいな。元気になったらね。' : b.personality.curiosity > 60 ? '新しい葉っぱの向こうを探検したい！' : 'いつもの枝で、ゆっくり遊ぼう。'}`; }
  else if (/(ごはん|食|おいし|たべ)/.test(input)) { topic = 'food'; answer = `${b.name}だよ。ごはんは自分でも食べられるよ。あげたいときは、ごはんのボタンを選んでね。`; }
  else if (/(今日|きょう|げんき|元気|どう|おは|こん|よん|呼)/.test(input) || input.includes(b.name)) {
    answer = `${b.name}だよ。いまは${b.needs.energy < 40 ? 'のんびりしたい気分' : b.mood > 75 ? 'わくわくした気分' : 'おだやかな気分'}。${last?.otherId ? `さっきは${birdName(w, last.otherId)}のことを考えていたよ。` : `${b.preference}が気になるな。`}`;
  } else { topic = 'unknown'; answer = `${b.name}だよ。そのお話はまだわからないけれど、声は届いたよ。「遊ぼう」「水浴び」「友達」「おやすみ」のお話ならできるよ。`; }
  let gemAward=0,goldAward=0;
  if(care.changed){b.gemCare.lastChatTick=w.tick;gemAward=grantGems(w,care.gemAward);goldAward=awardCareGold(w.economy);}
  b.mood = clamp(b.mood + 2); remember(w, b, `user-${topic}`); bumpRevision(w); return { answer, topic, gemAward, goldAward, careChanged:care.changed, nextAt:care.nextAt };
}
export function eventText(w, e) {
  const n = e.ids.map(i => birdName(w, i));
  const phrases = { 'user-feed': `${n[0]}がゲームのごはんを食べた。`, 'user-pet': `${n[0]}「ぴっ♪」ふれあいに明るくこたえた。（ゲームの表現）`, welcome: `${n[0]}の文鳥ぐらしが始まった。`, visit: `${n[0]}が庭へ遊びに来た。`, revisit: `${n[0]}が久しぶりに遊びに来た。`, adopt: `${n[0]}を庭の仲間に迎えた。`, movein: `${n[0]}が、この庭で暮らすことにした。`, pair: `${n[0]}と${n[1]}がつがいになった。`, egg: `${n[1]}と${n[2]}の巣に、${n[0]}が生まれた。`, hatch: `${n[0]}が卵からかえった。`, grow: `${n[0]}が${STAGES[e.data.stage] || '次の段階'}になった。`, declined: `${n[0]}「遊ぼう」 ${n[1]}「今日は休むね。また今度！」`, play: `${n[0]}「いっしょに遊ぼう」 ${n[1]}「いいね！」`, bath: `${n[0]}「水場へいこう」 ${n[1]}「いっしょにいこう！」`, reconcile: `${n[0]}と${n[1]}は、今日は元気に遊べた。`, depart: `${n.join('と')}が別の庭へ巣立った。また会えるね。` };
  return phrases[e.kind] || `${n.join('と')}：${e.result}`;
}
function validateVersion(input, version) {
  const fail = msg => { throw new Error(`保存データを読み込めません：${msg}`); };
  if (!input || typeof input !== 'object' || Array.isArray(input)) fail('形式が違います。');
  const shape = (value, keys) => value !== null && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key));
  const worldKeys = ['version','revision','worldId','epoch','lastUpdated','seed','tick','nextId','nextEvent','paused','settings','birds','events','offlineSummary', ...(version >= 2 ? ['care'] : []), ...(version >= 3 ? ['field','decor'] : []), ...(version >= 4 ? ['gems'] : []), ...(version >= 5 ? ['careSchedule'] : []), ...(version >= 6 ? ['encounters'] : []), ...(version >= 7 ? ['economy','adoption'] : []), ...(version >= 8 ? ['lifecycle'] : []), ...(version >= 9 ? ['protagonist'] : [])];
  if (!shape(input, worldKeys)) fail('保存の項目が不正です。');
  // Check bounded input before JSON cloning, including direct IndexedDB values.
  // Descriptors avoid invoking getters/toJSON on malformed non-JSON objects.
  const rootFields = Object.getOwnPropertyDescriptors(input);
  if (!Array.isArray(rootFields.birds.value) || rootFields.birds.value.length > LIMITS.birds || !Array.isArray(rootFields.events.value) || rootFields.events.value.length > LIMITS.events) fail('鳥や日記が多すぎます。');
  let nodes = 0;
  const path = new Set();
  function preflight(value, depth = 0) {
    if (++nodes > 250000 || depth > 8) fail('JSONの構造が大きすぎます。');
    if (value === null || typeof value === 'boolean') return;
    if (typeof value === 'string') { if (value.length > 120) fail('文字列が長すぎます。'); return; }
    if (typeof value === 'number') { if (!Number.isFinite(value)) fail('数値が不正です。'); return; }
    if (typeof value !== 'object' || path.has(value)) fail('JSONの構造が不正です。');
    if (Array.isArray(value) && value.length > LIMITS.events) fail('JSONの配列が大きすぎます。');
    if (!Array.isArray(value) && ![Object.prototype,null].includes(Object.getPrototypeOf(value))) fail('JSONの形式が不正です。');
    path.add(value);
    for (const [key, descriptor] of Object.entries(Object.getOwnPropertyDescriptors(value))) {
      if (Array.isArray(value) && key === 'length') continue;
      if (['__proto__','constructor','prototype'].includes(key) || !Object.hasOwn(descriptor,'value')) fail('JSONの項目が不正です。');
      preflight(descriptor.value, depth + 1);
    }
    path.delete(value);
  }
  preflight(input);
  if (input.version !== version) fail('対応していない版です。元の保存はそのままです。');
  let w; try { w = clone(input); } catch { fail('JSONの構造が不正です。'); }
  if (!shape(w.settings, version >= 7 ? ['motion','careSound','adoptionMode'] : version >= 2 ? ['motion', 'careSound'] : ['motion'])) fail('保存の項目が不正です。');
  const num = (n, lo = 0, hi = Number.MAX_SAFE_INTEGER) => typeof n === 'number' && Number.isFinite(n) && n >= lo && n <= hi;
  const integer = (n, lo = 0, hi = Number.MAX_SAFE_INTEGER) => Number.isInteger(n) && num(n, lo, hi);
  const str = (v, max = 100) => typeof v === 'string' && v.length > 0 && v.length <= max && !/[\u0000-\u001f\u007f]/.test(v);
  if (version >= 2 && (!shape(w.care, ['cleanliness', 'lastCleanTick']) || !integer(w.care.cleanliness, 0, 100) || !(w.care.lastCleanTick === null || integer(w.care.lastCleanTick, 0, w.tick)) || typeof w.settings.careSound !== 'boolean')) fail('お世話の情報が不正です。');
  const validEvents = version >= 9 ? EVENT_KINDS : version >= 8 ? EVENT_KINDS.filter(k=>k!=='succession') : version >= 2 ? [...LEGACY_EVENT_KINDS,'user-feed','user-pet'] : LEGACY_EVENT_KINDS, validMemories = version >= 9 ? MEMORY_KINDS : version >= 8 ? MEMORY_KINDS.filter(k=>k!=='succession') : version >= 2 ? [...LEGACY_MEMORY_KINDS,'user-feed','user-pet'] : LEGACY_MEMORY_KINDS;
  if (!str(w.worldId) || !integer(w.revision) || !integer(w.seed, 0, 4294967295) || !integer(w.tick) || !integer(w.nextId, 1, LIMITS.birds + 1) || !integer(w.nextEvent, 2) || !integer(w.epoch, 0, MAX_DATE_MS) || !integer(w.lastUpdated, 0, MAX_DATE_MS) || !integer(w.epoch + w.tick * TICK_MS, 0, MAX_DATE_MS) || typeof w.paused !== 'boolean' || !w.settings || typeof w.settings.motion !== 'boolean') fail('基本情報が不正です。');
  if (!Array.isArray(w.birds) || !w.birds.length || w.birds.length > LIMITS.birds || !Array.isArray(w.events) || !w.events.length || w.events.length > LIMITS.events) fail('鳥や日記が多すぎます。');
  if (w.birds.some(b => !shape(b, ['id','name','sex','color','stage','bornTick','stageTick','arrivedTick','parents','generation','partner','pairTick','eggsLaid','lastEggTick','home','personality','preference','mood','needs','relations','memories','milestones','action','lastSocialTick', ...(version >= 2 ? ['care'] : []), ...(version >= 4 ? ['gemCare'] : []), ...(version >= 5 ? ['naming'] : [])]))) fail('文鳥の項目が不正です。');
  const ids = new Set(w.birds.map(b => b.id));
  if (ids.size !== w.birds.length) fail('同じIDが重なっています。');
  if (w.nextId !== w.birds.length + 1 || w.birds.some((_, i) => !ids.has(`b${i + 1}`))) fail('文鳥のIDの順序が不正です。');
  const ref = (bid, optional = false) => optional && bid === null || typeof bid === 'string' && ids.has(bid);
  for (const b of w.birds) {
    if(version>=5&&(!isValidNaming(b.naming)||b.naming.assignedName!==b.name))fail('名前の情報が不正です。');
    if (!/^b[1-9]\d{0,8}$/.test(b.id) || Number(b.id.slice(1)) >= w.nextId || !str(b.name, 16) || !b.name.trim() || !['female', 'male'].includes(b.sex) || !COLORS.includes(b.color) || !Object.hasOwn(STAGES, b.stage) || !['resident','visitor','departed'].includes(b.home) || !PREFERENCES.includes(b.preference)) fail('文鳥の情報が不正です。');
    for (const k of ['bornTick', 'stageTick', 'arrivedTick']) if (!integer(b[k], 0, w.tick) || k !== 'bornTick' && b[k] < b.bornTick) fail('成長の時刻が不正です。');
    if (!integer(b.generation, 0, LIMITS.birds) || !integer(b.eggsLaid, 0, 2) || !integer(b.lastEggTick, -1000, w.tick) || !integer(b.lastSocialTick, -1, w.tick) || !(b.pairTick === null || integer(b.pairTick, 0, w.tick)) || !num(b.mood, 0, 100) || !b.personality || !b.needs) fail('状態が不正です。');
    if (version >= 2 && (!shape(b.care, ['lastFedTick', 'lastPetTick']) || ['lastFedTick', 'lastPetTick'].some(key => !(b.care[key] === null || integer(b.care[key], b.bornTick, w.tick))) || ['egg', 'chick'].includes(b.stage) && Object.values(b.care).some(value => value !== null))) fail('文鳥のお世話時刻が不正です。');
    if(version>=4&&(!shape(b.gemCare,['lastChatTick','fullSinceTick','lastDropTick'])||Object.values(b.gemCare).some(value=>value!==null&&!integer(value,b.bornTick,w.tick))||['egg','chick'].includes(b.stage)&&Object.values(b.gemCare).some(value=>value!==null)))fail('Gemのお世話時刻が不正です。');
    if (!shape(b.personality, ['curiosity','sociability','caution']) || !shape(b.needs, ['energy','food','play']) || ['curiosity','sociability','caution'].some(k => !num(b.personality[k], 0, 100)) || ['energy','food','play'].some(k => !num(b.needs[k], 0, 100))) fail('気分や欲求が不正です。');
    if (!Array.isArray(b.parents) || ![0,2].includes(b.parents.length) || b.parents.some(p => !ref(p) || p === b.id) || new Set(b.parents).size !== b.parents.length || !ref(b.partner, true) || b.partner === b.id) fail('家族の参照が不正です。');
    if (!shape(b.action, ['kind','target','startedTick']) || !Object.hasOwn(ACTIONS, b.action.kind) || !ref(b.action.target, true) || !integer(b.action.startedTick, b.bornTick, w.tick)) fail('行動が不正です。');
    if (!b.relations || typeof b.relations !== 'object' || Array.isArray(b.relations) || Object.keys(b.relations).length > LIMITS.birds) fail('関係が不正です。');
    for (const [other, r] of Object.entries(b.relations)) if (!ref(other) || other === b.id || !shape(r, ['affection','trust','compatibility','meetings','lastTick']) || ['affection','trust','compatibility'].some(k => !num(r[k], 0, 100)) || !integer(r.meetings) || !integer(r.lastTick, 0, w.tick)) fail('関係の数値が不正です。');
    for (const list of [b.memories, b.milestones]) if (!Array.isArray(list) || list.length > LIMITS.memories || list.some(m => !shape(m, ['kind','otherId','tick']) || !(list === b.milestones ? MILESTONE_KINDS : validMemories).includes(m.kind) || !ref(m.otherId, true) || !integer(m.tick, b.bornTick, w.tick))) fail('記憶が不正です。');
  }
  // Detect parent cycles before recursive ancestry checks.
  const visiting = new Set(), done = new Set();
  function visit(bid) { if (visiting.has(bid)) fail('家系が循環しています。'); if (done.has(bid)) return; visiting.add(bid); for (const p of findBird(w,bid).parents) visit(p); visiting.delete(bid); done.add(bid); }
  for (const b of w.birds) visit(b.id);
  if (w.birds.filter(b => b.home === 'resident').length > 10 || cageVisitorCount(w) > LIMITS.visitors) fail('庭の定員を超えています。');
  for (const b of w.birds) {
    if (b.parents.length && (b.generation !== Math.max(...b.parents.map(p => findBird(w,p).generation)) + 1 || b.parents.some(p => findBird(w,p).bornTick > b.bornTick))) fail('世代の順序が不正です。');
    if (b.parents.length && (findBird(w, b.parents[0]).sex !== 'female' || findBird(w, b.parents[1]).sex !== 'male' || b.parents.some(id => { const p = findBird(w, id); return p.stage !== 'adult' || p.stageTick > b.bornTick; }) || isRelated(w, b.parents[0], b.parents[1]))) fail('親の血縁または性別が不正です。');
    if (!b.partner && b.pairTick !== null) fail('つがいの時刻が不正です。');
    if (b.partner) { const p = findBird(w, b.partner); if (b.pairTick === null || b.pairTick !== p.pairTick || b.pairTick < Math.max(b.stageTick, p.stageTick) || p.partner !== b.id || p.sex === b.sex || b.stage !== 'adult' || p.stage !== 'adult' || isRelated(w,b.id,p.id)) fail('つがいの情報が不正です。'); }
  }
  const eventIds = new Set();
  let previousId = 0, previousTick = 0;
  for (const e of w.events) {
    if (!shape(e, ['id','kind','ids','condition','result','data','tick','at']) || !/^e[1-9]\d*$/.test(e.id) || !Number.isSafeInteger(Number(e.id.slice(1))) || Number(e.id.slice(1)) <= previousId || Number(e.id.slice(1)) >= w.nextEvent || eventIds.has(e.id) || !validEvents.includes(e.kind) || !Array.isArray(e.ids) || !e.ids.length || e.ids.length > 3 || new Set(e.ids).size !== e.ids.length || e.ids.some(x => !ref(x)) || !str(e.condition, 120) || !str(e.result, 120) || !integer(e.tick, previousTick, w.tick) || !integer(e.at, 0, MAX_DATE_MS) || e.at !== w.epoch + e.tick * TICK_MS || e.ids.some(id => findBird(w,id).bornTick > e.tick)) fail('日記が不正です。');
    const expectedIds = ['pair','declined','play','bath','reconcile','succession'].includes(e.kind) ? 2 : e.kind === 'egg' ? 3 : ['grow','hatch'].includes(e.kind) ? 1 + findBird(w,e.ids[0]).parents.length : e.kind === 'depart' ? e.ids.length : 1;
    if (e.ids.length !== expectedIds || e.kind === 'depart' && e.ids.length > 2) fail('日記の文鳥の組み合わせが不正です。');
    if(e.kind==='succession'&&!findBird(w,e.ids[1]).parents.includes(e.ids[0]))fail('代替わりの家族が不正です。');
    if (['egg','hatch','grow'].includes(e.kind) && e.ids.slice(1).join() !== findBird(w,e.ids[0]).parents.join()) fail('日記の家族が不正です。');
    if (['hatch','grow'].includes(e.kind)) {
      if (!shape(e.data, ['stage']) || !(e.kind === 'hatch' ? ['chick'] : ['juvenile','adult']).includes(e.data.stage)) fail('日記の成長段階が不正です。');
    } else if (!shape(e.data, [])) fail('日記の追加情報が不正です。');
    eventIds.add(e.id); previousId = Number(e.id.slice(1)); previousTick = e.tick;
  }
  if (w.nextEvent !== previousId + 1) fail('日記IDの順序が不正です。');
  if (w.offlineSummary !== null && (!shape(w.offlineSummary, ['ticks','skipped','newBirds','fromTick','toTick']) || !integer(w.offlineSummary.ticks, 0, LIMITS.offlineTicks) || !integer(w.offlineSummary.skipped) || !integer(w.offlineSummary.newBirds, 0, LIMITS.birds) || !integer(w.offlineSummary.fromTick,0,w.tick) || !integer(w.offlineSummary.toTick,w.offlineSummary.fromTick,w.tick) || w.offlineSummary.toTick - w.offlineSummary.fromTick !== w.offlineSummary.ticks)) fail('おかえり情報が不正です。');
  if(version>=3){
    if(!shape(w.field,['place','hostId','enteredTick'])||!['home','park','friend'].includes(w.field.place)||!integer(w.field.enteredTick,0,w.tick)||!(w.field.place==='friend'?ref(w.field.hostId)&&findBird(w,w.field.hostId).stage==='adult':w.field.hostId===null))fail('行き先の情報が不正です。');
    const d=w.decor;
    if(!shape(d,['points','lifetimePoints','inventory','equipped','draws','lastDrawTick'])||!integer(d.points,0,POINT_CAP)||!integer(d.lifetimePoints,d.points,POINT_CAP)||!integer(d.draws,0,POINT_CAP)||!(d.lastDrawTick===null||integer(d.lastDrawTick,0,w.tick))||!Array.isArray(d.inventory)||d.inventory.length<9||d.inventory.length>216||!shape(d.equipped,Object.keys(SLOT_LABELS)))fail('お飾りの情報が不正です。');
    const itemIds=new Set();
    for(const item of d.inventory){
      if(!shape(item,['id','slot','color','tier'])||!Object.hasOwn(SLOT_LABELS,item.slot)||!Object.hasOwn(COLOR_HEX,item.color)||!DECOR_TIERS.some(t=>t.id===item.tier&&t.level<=decorLevel(w))||item.id!==`${item.slot}-${item.color}-${item.tier}`||itemIds.has(item.id))fail('お飾りの種類が不正です。');
      itemIds.add(item.id);
    }
    for(const [slot,itemId] of Object.entries(d.equipped))if(!d.inventory.some(item=>item.id===itemId&&item.slot===slot))fail('飾っている道具が不正です。');
  }
  if(version>=4){
    if(!shape(w.gems,['droppings','nextDropId'])||!integer(w.gems.nextDropId,1)||!Array.isArray(w.gems.droppings)||w.gems.droppings.length>GEM_RULES.maxDroppings)fail('Gemのひろいものが不正です。');
    const drops=new Set(),owners=new Set();let previous=0;
    for(const d of w.gems.droppings){
      const n=typeof d.id==='string'&&/^drop-[1-9]\d*$/.test(d.id)?Number(d.id.slice(5)):NaN;
      if(!shape(d,['id','birdId','createdTick','location'])||!integer(n,previous+1,w.gems.nextDropId-1)||drops.has(d.id)||owners.has(d.birdId)||!ref(d.birdId)||d.location!=='home'||!integer(d.createdTick,0,w.tick))fail('Gemのひろいものが不正です。');
      const b=findBird(w,d.birdId);if(!['juvenile','adult'].includes(b.stage)||d.createdTick<b.bornTick+GEM_RULES.droppingDelayTicks||b.gemCare.lastDropTick!==d.createdTick)fail('Gemのひろいものの時刻が不正です。');
      drops.add(d.id);owners.add(d.birdId);previous=n;
    }
  }
  if(version>=5)validateCareSchedule(w.careSchedule);
  const legacyHomeLimits=version<6||w.encounters.version<6;
  if(version>=6){validateEncounterState(w.encounters,w.tick);upgradeEncounterState(w.encounters);if(w.encounters.homeGoodbyes.some(g=>!ref(g.birdId)))fail('お友達のお見送り情報が不正です。');if(w.encounters.raptor?.active&&!ref(w.encounters.raptor.active.targetBirdId))fail('猛禽と会った文鳥の情報が不正です。');if(w.encounters.crow?.arrivalBirdId&&!ref(w.encounters.crow.arrivalBirdId))fail('カラスと会った文鳥の情報が不正です。');}
  if(version>=7){
   validateEconomy(w.economy);
   if(w.economy.firstMeetingClaimed.some(id=>!w.encounters.discoveries.some(d=>d.id===id)))fail('初出会いの記録が不正です。');
   if(!['ask','auto'].includes(w.settings.adoptionMode)||!shape(w.adoption,['pending','dismissed'])||!Array.isArray(w.adoption.dismissed)||w.adoption.dismissed.length>LIMITS.birds||new Set(w.adoption.dismissed).size!==w.adoption.dismissed.length||w.adoption.dismissed.some(id=>!ref(id)))fail('お迎え相談の情報が不正です。');
   const p=w.adoption.pending;
   if(p!==null){const b=findBird(w,p?.birdId);if(!shape(p,['birdId','arrivedTick'])||w.settings.adoptionMode!=='ask'||!b||b.home!=='visitor'||b.stage!=='adult'||p.arrivedTick!==b.arrivedTick||w.adoption.dismissed.includes(b.id)||w.birds.filter(b=>b.home==='resident').length>=(legacyHomeLimits?10:LIMITS.residents))fail('お迎え相談の相手が不正です。');}
   if(legacyHomeLimits&&w.birds.filter(b=>b.home==='resident').length>=LIMITS.residents)w.adoption.pending=null;
  }
  if(version>=8)validateLifecycle(w);
  if(version>=9)validateProtagonist(w);
  return w;
}
/** Strict current-version validator for transactions; use compatibility only at read boundaries. */
export function validateWorld(input) { return validateVersion(input, SAVE_VERSION); }
/** Historical export retained: validates v1, applies v2 care, then upgrades to current. */
export function migrateV1ToV2(input, now=Date.now()) {
  const world = validateVersion(input, 1); // Validate the complete legacy object before adding anything.
  world.version = 2;
  world.settings.careSound = true;
  world.care = { cleanliness: 100, lastCleanTick: null };
  for (const bird of world.birds) bird.care = { lastFedTick: null, lastPetTick: null };
  return migrateV2ToV3(validateVersion(world,2),now);
}
export function migrateV2ToV3(input, now=Date.now()) {
  const world=validateVersion(input,2);world.version=3;world.field=initialField();world.decor=initialDecor();return migrateV3ToV4(validateVersion(world,3),now);
}
export function migrateV3ToV4(input, now=Date.now()){
  const world=validateVersion(input,3);world.version=4;world.gems={droppings:[],nextDropId:1};
  for(const b of world.birds)b.gemCare=initialGemCare();
  return migrateV4ToV5(validateVersion(world,4),now);
}
export function migrateV4ToV5(input, now=Date.now()) {
  const world=validateVersion(input,4);world.version=5;
  initializeCareSchedule(world,careTime(now));
  for(const b of world.birds)b.naming=legacyNaming(b.name);
  return migrateV5ToV6(world,now);
}
export function migrateV5ToV6(input, now=Date.now()) {
 const world=validateVersion(input,5);world.version=6;world.encounters=initialEncounterState();return migrateV6ToV7(world,now);
}
export function migrateV6ToV7(input, now=Date.now()) {
 const world=validateVersion(input,6);world.version=7;world.economy=initialEconomy(careTime(now));world.settings.adoptionMode='auto';world.adoption={pending:null,dismissed:[]};world.economy.firstMeetingClaimed=world.encounters.discoveries.map(d=>d.id);return migrateV7ToV8(world,now);
}
export function migrateV7ToV8(input,now=Date.now()){
 const world=validateVersion(input,7);world.version=8;initializeLifecycle(world,careTime(Math.max(now,world.careSchedule.seenAt,world.economy.seenAt)),true);return migrateV8ToV9(world,now);
}
export function migrateV8ToV9(input,now=Date.now()){
 const world=validateVersion(input,8);world.version=9;initializeProtagonist(world);return validateWorld(world);
}
export function readCompatibleWorld(input, now=Date.now()) {
  // Do not execute an accessor even to discover the version of an untrusted object.
  const descriptor = input && typeof input === 'object' ? Object.getOwnPropertyDescriptor(input, 'version') : null;
  if (!descriptor || !Object.hasOwn(descriptor, 'value')) throw new Error('保存データを読み込めません：版の形式が違います。');
  if (descriptor.value === 1) return migrateV1ToV2(input,now);
  if (descriptor.value === 2) return migrateV2ToV3(input,now);
  if (descriptor.value === 3) return migrateV3ToV4(input,now);
  if (descriptor.value === 4) return migrateV4ToV5(input,now);
  if (descriptor.value === 5) return migrateV5ToV6(input,now);
  if (descriptor.value === 6) return migrateV6ToV7(input,now);
  if (descriptor.value === 7) return migrateV7ToV8(input,now);
  if (descriptor.value === 8) return migrateV8ToV9(input,now);
  if (descriptor.value === SAVE_VERSION) return validateWorld(input);
  throw new Error('保存データを読み込めません：対応していない版です。元の保存はそのままです。');
}
export function serializeWorld(w) {
  // Compact output keeps even a dense, bounded 128-bird relationship graph importable.
  const text = JSON.stringify(readCompatibleWorld(w));
  if (new TextEncoder().encode(text).byteLength > MAX_SAVE_BYTES) throw new Error('保存データが4MBを超えています。');
  return text;
}
/** Versioned import boundary. Strict v1/v2/v3 migrate purely to v4; future versions fail closed. */
export function parseSave(text) { if (typeof text !== 'string' || text.length > MAX_SAVE_BYTES || new TextEncoder().encode(text).byteLength > MAX_SAVE_BYTES) throw new Error('保存ファイルは4MB以下のJSONを選んでください。'); return readCompatibleWorld(JSON.parse(text)); }

/** Restore temporary wellbeing only. Never lower a full bar or reopen reward capacity.
 * Fresh-state transaction required. No story tick, care clock, RNG or history writes.
 */
export function resetTemporaryState(world) {
  let changed=false;
  for(const bird of world.birds){
    if(bird.home==='departed'||!['juvenile','adult'].includes(bird.stage))continue;
    for(const [key,floor] of Object.entries({food:80,energy:80,play:60})){
      if(bird.needs[key]<floor){bird.needs[key]=floor;changed=true;}
    }
    if(bird.mood<70){bird.mood=70;changed=true;}
  }
  if(world.care.cleanliness<100){world.care.cleanliness=100;changed=true;}
  if(changed)bumpRevision(world);
  return changed;
}

/** Initial owned furniture only; never grant items or alter inventory/currency. */
export function resetFurniturePlacement(world){
  let changed=false;
  for(const slot of Object.keys(world.decor.equipped)){
    const id=`${slot}-mint-cozy`;
    const item=world.decor.inventory.find(i=>i.id===id&&i.slot===slot)||world.decor.inventory.find(i=>i.slot===slot);
    if(item&&world.decor.equipped[slot]!==item.id){world.decor.equipped[slot]=item.id;changed=true;}
  }
  if(changed)bumpRevision(world);return changed;
}

/** Strict whole-world replacement boundary. No care bar merge/decrement, no money
 * merge. A restored snapshot carries its own wallet, items, receipts and quota.
 * Only clock high-water marks are advanced to prevent replaying elapsed absence.
 */
export function prepareWorldReplacement(current,replacement,now=Date.now(),newWorldId){
 if(!Number.isSafeInteger(now)||now<0||now>MAX_DATE_MS)throw new Error('端末の日時を確認してください。');
 if(typeof newWorldId!=='string'||!newWorldId||newWorldId===current.worldId)throw new Error('新しい庭の識別子が必要です。');
 const next=readCompatibleWorld(replacement,now);
 if(newWorldId===next.worldId)throw new Error('新しい庭の識別子が必要です。');
 const effective=Math.max(now,current.lastUpdated,next.lastUpdated,current.careSchedule.seenAt,next.careSchedule.seenAt,current.economy.seenAt,next.economy.seenAt,current.lifecycle?.seenAt??0,next.lifecycle.seenAt);
 const at=careTime(effective);
 next.lastUpdated=effective;
 next.careSchedule={seenAt:at,windowAt:careWindow(at).at};
 syncEconomy(next.economy,at);
 // Import restores its recorded health/deaths; advance the clock without replaying absence.
 rebaseLifecycleClock(next,at);
 next.settings={...next.settings,motion:current.settings.motion,careSound:current.settings.careSound};next.worldId=newWorldId;
 return validateWorld(next);
}

/** Hand-triggered social thank-you: one real JST care window across all gardens.
 * Pure encounter system remains reward-free for fixtures/observation-only callers.
 */
export function meetGardenFriendReward(w,friendId,action,expectedToken,now=Date.now()){
 if(!currentToken(w,expectedToken))return staleEconomy();
 const at=careTime(Math.max(now,w.economy.seenAt,w.careSchedule.seenAt));
 const windowAt=careWindow(at).at;
 const result=encounterSystem.meetGardenFriend(w,friendId,action,expectedToken);
 if(!result.changed)return {...result,gemAward:0,goldAward:0};
 syncEconomy(w.economy,at);
 let gemAward=0;
 if(w.economy.gardenWindowAt===null||windowAt>w.economy.gardenWindowAt){
  gemAward=grantGems(w,5);if(gemAward)w.economy.gardenWindowAt=windowAt;
 }
 // Encounter interaction already increments world.revision in this same transaction.
 return {...result,gemAward,goldAward:0};
}

/** First completed encounter only, independent of ordinary garden social quota.
 * Explicit system injection is for trusted local fixtures; UI uses approved catalog.
 */
export function completeEncounterReward(w,instanceId,action,expectedToken,now=Date.now(),system=encounterSystem){
 if(!currentToken(w,expectedToken))return staleEconomy();
 const at=careTime(Math.max(now,w.economy.seenAt,w.careSchedule.seenAt));careWindow(at);
 const result=system.act(w,instanceId,action,expectedToken);
 let gemAward=0;
 if(result.changed){
  syncEconomy(w.economy,at);
  if(result.revealed&&result.first&&!w.economy.firstMeetingClaimed.includes(result.id)){
   gemAward=grantGems(w,5);w.economy.firstMeetingClaimed.push(result.id);
  }
 }
 return {...result,gemAward,goldAward:0};
}
