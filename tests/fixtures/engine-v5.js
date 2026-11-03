/** A deterministic, offline, non-punitive story simulation. No real husbandry advice. */
import { initializeCareSchedule, validateCareSchedule, syncCareSchedule, applyScheduledCare, reconcileImportedCare, careWindow } from '../../src/care-schedule.js';
import { defaultNameFields, automaticNaming, manualNaming, legacyNaming, isValidNaming } from '../../src/bird-names.js';
export const SAVE_VERSION = 5;
const careTime = now => Math.max(0, Math.min(253402268399999, now));
export { reconcileImportedCare, careWindow };
export const TICK_MS = 15000;
export const MAX_SAVE_BYTES = 4000000;
const MAX_DATE_MS = 8640000000000000;
const LEGACY_EVENT_KINDS = ['welcome','visit','revisit','adopt','movein','pair','egg','hatch','grow','declined','play','bath','reconcile','depart'];
const EVENT_KINDS = [...LEGACY_EVENT_KINDS, 'user-feed', 'user-pet'];
const MILESTONE_KINDS = ['welcome','adopt','movein','pair','egg','hatch','grow','depart'];
const LEGACY_MEMORY_KINDS = [...LEGACY_EVENT_KINDS, ...['hello','rest','bath','friend','play','food','unknown'].map(kind => `user-${kind}`)];
const MEMORY_KINDS = [...LEGACY_MEMORY_KINDS, 'user-feed', 'user-pet'];
export const CARE_RULES = Object.freeze({ feedGain: 20, petMoodGain: 4, feedCooldownTicks: 2, petCooldownTicks: 1, cleanCooldownTicks: 1, soilPerTick: 1 });
export const LIMITS = Object.freeze({ residents: 10, visitors: 2, birds: 128, events: 240, memories: 16, offlineTicks: 576 });
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
  if(expectedRevision!==undefined&&expectedRevision!==w.revision)return {changed:false,gemAward:0,droppingId,message:'お部屋が変わったよ。もう一度見つけてね。'};
  const index=w.gems.droppings.findIndex(d=>d.id===droppingId);
  if(index<0||w.field.place!=='home')return {changed:false,gemAward:0,droppingId,message:index<0?'もうきれいになっているよ。':'おうちで見つけてね。'};
  const [drop]=w.gems.droppings.splice(index,1),gemAward=grantGems(w,GEM_RULES.collect);
  bumpRevision(w);return {changed:true,gemAward,droppingId,birdId:drop.birdId,message:`きれいになったよ。${gemAward} Gem！`};
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
  if(w.field.place==='park')return [...w.birds.filter(b=>b.home!=='departed'&&['juvenile','adult'].includes(b.stage)),...w.birds.filter(b=>b.home==='departed'&&b.stage==='adult')].slice(0,12);
  const host=findBird(w,w.field.hostId);
  return [...resident,...w.birds.filter(b=>!resident.includes(b)&&(b.id===host?.id||b.id===host?.partner))].slice(0,12);
}
export function travelTo(w,place,hostId=null) {
  if(!['home','park','friend'].includes(place))throw new Error('行き先を選んでね。');
  const host=place==='friend'?findBird(w,hostId):null;
  if(place==='friend'&&(!host||host.home==='resident'||host.stage!=='adult'))throw new Error('お友達の成鳥のお部屋を選んでね。');
  if(w.field.place===place&&w.field.hostId===(host?.id||null))return {changed:false,message:'いまここにいるよ。'};
  w.field={place,hostId:host?.id||null,enteredTick:w.tick};bumpRevision(w);
  return {changed:true,message:place==='home'?'自分たちの籠に帰ったよ。':place==='park'?'文鳥公園に着いたよ。':`${host.name}のお部屋に遊びに来たよ。`};
}
export function inviteFriend(w,birdId) {
  const b=findBird(w,birdId);
  if(!b||b.home==='resident'||b.stage!=='adult')throw new Error('お友達の成鳥を選んでね。');
  if(b.home==='visitor')return {changed:false,message:'もう遊びに来ているよ。'};
  if(w.birds.filter(x=>x.home==='visitor').length>=LIMITS.visitors)throw new Error('お客さんは2羽まで。今いる友達と過ごそう。');
  b.home='visitor';b.arrivedTick=w.tick;setAction(w,b,'visit');record(w,'revisit',[b.id],'お友達を自分たちの籠へ招いた','いっしょに過ごす時間が始まった');bumpRevision(w);
  return {changed:true,message:`${b.name}を招いたよ。籠に帰って一緒に過ごそう。`};
}
export function decorOdds(w) { const n=DECOR_TIERS.filter(t=>decorLevel(w)>=t.level).length;return DECOR_TIERS.slice(0,n).map((t,i)=>({tierId:t.id,probability:(n===1?[1]:n===2?[.65,.35]:[.65,.25,.1])[i]})); }
export function drawDecoration(w,slot='perch') {
  if(!Object.hasOwn(SLOT_LABELS,slot))throw new Error('9種類の道具から選んでね。');
  if(w.decor.lastDrawTick===w.tick)return {changed:false,message:'さっきのお飾りを楽しもう。次のゲーム時間にまた引けるよ。'};
  if(w.decor.points<DECOR_DRAW_COST)throw new Error('20Gemで1回。友達との交流や家族の成長を見守ろう。');
  const available=DECOR_TIERS.filter(t=>decorLevel(w)>=t.level);
  const roll=random(w),tier=available.length===3&&roll>=.9?available[2]:available.length>=2&&roll>=.65?available[1]:available[0];
  const color=pick(w,Object.keys(COLOR_HEX)),id=`${slot}-${color}-${tier.id}`;
  const item={id,slot,color,tier:tier.id},duplicate=w.decor.inventory.some(x=>x.id===id);
  w.decor.points-=DECOR_DRAW_COST;
  if(duplicate)w.decor.points=Math.min(POINT_CAP,w.decor.points+8);else w.decor.inventory.push(item);
  w.decor.draws=Math.min(POINT_CAP,w.decor.draws+1);w.decor.lastDrawTick=w.tick;bumpRevision(w);
  return {changed:true,item,duplicate,message:duplicate?'同じお飾りだったので8Gemを返したよ。':`${SLOT_LABELS[slot]}のお飾りが仲間入り！`};
}
export function equipDecoration(w,itemId) {
  const item=w.decor.inventory.find(x=>x.id===itemId);if(!item)throw new Error('持っているお飾りを選んでね。');
  if(w.decor.equipped[item.slot]===itemId)return {changed:false,message:'もう飾ってあるよ。'};
  w.decor.equipped[item.slot]=itemId;bumpRevision(w);return {changed:true,message:`${SLOT_LABELS[item.slot]}を飾ったよ。`};
}
function awardEvent(w,kind) {
  const amount={play:2,bath:2,reconcile:3,movein:10,pair:30,egg:25,hatch:35,grow:20}[kind]||0;
  if(!amount)return;
  w.decor.points=Math.min(POINT_CAP,w.decor.points+amount);w.decor.lifetimePoints=Math.min(POINT_CAP,w.decor.lifetimePoints+amount);
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
  w.birds.push(b); return b;
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
export function createWorld(now = Date.now(), seed = 842911) {
  const w = { version: SAVE_VERSION, revision: 0, worldId: `garden-${now}-${seed}`, epoch: now, lastUpdated: now, seed: seed >>> 0, tick: 0, nextId: 1, nextEvent: 1, paused: false, settings: { motion: true, careSound: true }, care: { cleanliness: 100, lastCleanTick: null }, birds: [], events: [], offlineSummary: null, field: initialField(), decor: initialDecor(), gems: {droppings:[],nextDropId:1} };
  initializeCareSchedule(w,careTime(now));
  const b = createBird(w, { name: 'おもち', automaticName:true, sex: 'female', color: 'white', home: 'resident' });
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
export function canPair(w, a, b) { return !!a && !!b && a.id !== b.id && a.stage === 'adult' && b.stage === 'adult' && a.sex !== b.sex && !a.partner && !b.partner && a.home !== 'departed' && b.home !== 'departed' && !isRelated(w, a.id, b.id); }
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
    if ((!visitor.partner || findBird(w, visitor.partner)?.home === 'resident') && vr.affection >= 32 && vr.meetings >= 4 && w.birds.filter(x => x.home === 'resident').length < LIMITS.residents) {
      visitor.home = 'resident'; record(w, 'movein', [visitor.id], '何度も会って親しくなった', '庭の仲間になった');
    }
  }
  if (canPair(w, a, b) && ar.affection > 74 && br.affection > 70 && ar.trust > 55 && br.trust > 55 && ar.meetings >= 10 && w.tick - Math.max(a.arrivedTick, b.arrivedTick) >= 16 && ar.compatibility >= 55) {
    a.partner = b.id; b.partner = a.id; a.pairTick = b.pairTick = w.tick;
    record(w, 'pair', [a.id, b.id], '成鳥で、血縁がなく、双方の信頼が育った', 'つがいになった');
  }
}
function grow(w) {
  for (const b of w.birds) {
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
function visits(w) {
  if (w.tick === 1 || w.tick % 28 === 0) {
    const resident = w.birds.filter(b => b.home === 'resident');
    const visitors = w.birds.filter(b => b.home === 'visitor');
    if (visitors.length < LIMITS.visitors && resident.length < LIMITS.residents && w.birds.length < LIMITS.birds) {
      const single = resident.filter(b => b.stage === 'adult' && !b.partner).sort((a, b) => b.generation - a.generation)[0];
      const v = createBird(w, { skipNameDraw:w.tick === 1, sex: single ? (single.sex === 'female' ? 'male' : 'female') : undefined });
      if (w.tick === 1) { v.personality.sociability = 70; v.personality.caution = 25; }
      setAction(w, v, 'visit'); record(w, 'visit', [v.id], '庭の外からやって来た', '新しい出会い');
    }
    if (w.tick % 84 === 0) {
      const away = w.birds.filter(b => b.home === 'departed' && b.stage === 'adult');
      if (away.length && w.birds.filter(b => b.home === 'visitor').length < LIMITS.visitors) {
        const v = pick(w, away); v.home = 'visitor'; v.arrivedTick = w.tick; setAction(w, v, 'visit'); record(w, 'revisit', [v.id], '昔の庭のことを覚えていた', 'また遊びに来た');
      }
    }
  }
  // Once adults have lived together for a while, pairs or independent adults can start a new garden.
  if (w.birds.filter(b => b.home === 'resident').length >= 8) {
    const candidates = w.birds.filter(b => b.home === 'resident' && b.id !== 'b1' && b.partner !== 'b1' && b.stage === 'adult' && w.tick - b.stageTick > 100 && !w.birds.some(c => c.parents.includes(b.id) && c.stage !== 'adult'));
    const b = candidates.find(x => x.partner && (x.eggsLaid >= 1 || w.tick - x.arrivedTick > 300)) || candidates.find(x => !x.partner && w.tick - x.arrivedTick > 160);
    if (b) {
      const pair = b.partner ? findBird(w, b.partner) : null;
      if (!pair || pair.id !== 'b1') { const leaving = [b, ...(pair && pair.home === 'resident' ? [pair] : [])]; for (const x of leaving) x.home = 'departed'; record(w, 'depart', leaving.map(x => x.id), '成鳥が新しい庭へ出発する時期になった', '名簿と家系図にはずっと残る'); }
    }
  }
  for (const b of w.birds.filter(b => b.home === 'visitor' && w.tick - b.arrivedTick > 96)) { b.home = 'departed'; record(w, 'depart', [b.id], '外の庭にも暮らしがある', 'また会う約束をした'); }
}
export function stepWorld(w) {
  if (w.paused || !Number.isSafeInteger(w.tick + 1) || w.epoch + (w.tick + 1) * TICK_MS > MAX_DATE_MS) return w;
  w.tick++; w.care.cleanliness = Math.max(0, w.care.cleanliness - CARE_RULES.soilPerTick); grow(w); visits(w);
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
  births(w); produceDroppings(w); bumpRevision(w); return w;
}
export function advanceTicks(w, count) { if (!Number.isFinite(count) || count <= 0) return w; for (let i = 0; i < Math.min(Math.floor(count), 100000); i++) stepWorld(w); return w; }
export function advanceTo(w, now = Date.now()) {
  if (!Number.isSafeInteger(now) || now < 0 || now > MAX_DATE_MS) return w;
  const careSync=syncCareSchedule(w,careTime(now));
  if(careSync.renewed)bumpRevision(w);
  // Keep a high-water mark: moving the wall clock back must not replay an interval.
  if (now < w.lastUpdated) return w;
  if (w.paused) { w.lastUpdated = now; return w; }
  const due = Math.floor((now - w.lastUpdated) / TICK_MS);
  if (!due) return w;
  const count = Math.min(due, LIMITS.offlineTicks, Math.max(0, Math.floor((MAX_DATE_MS - w.epoch) / TICK_MS) - w.tick)), before = { birds: w.birds.length, tick: w.tick };
  advanceTicks(w, count);
  w.lastUpdated = due > LIMITS.offlineTicks ? now : w.lastUpdated + count * TICK_MS;
  if (due > 4) w.offlineSummary = { ticks: w.tick - before.tick, skipped: Math.max(0, due - (w.tick - before.tick)), newBirds: w.birds.length - before.birds, fromTick: before.tick, toTick: w.tick };
  return w;
}
export function renameBird(w, birdId, name) {
  const b = findBird(w, birdId); const clean = typeof name === 'string' ? name.trim().slice(0, 16) : '';
  if (!b || !clean || /[\u0000-\u001f\u007f]/.test(clean)) throw new Error('名前を1〜16文字で入力してね。');
  b.name = clean; b.naming=manualNaming(clean); bumpRevision(w); return b;
}
export function adoptBird(w, birdId, name) {
  const b = findBird(w, birdId); if (!b || b.home !== 'visitor') throw new Error('今来ている文鳥を選んでね。');
  if (w.birds.filter(x => x.home === 'resident').length >= LIMITS.residents) throw new Error('この庭は10羽まで。今いる仲間を見守ろう。');
  if (name) renameBird(w, b.id, name);
  b.home = 'resident'; record(w, 'adopt', [b.id], '利用者が迎え入れた', 'この庭で暮らし始めた'); bumpRevision(w); return b;
}
// Care is fictional interaction. Cleanliness never changes biological or social state.
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
  return { kind, birdId, changed, before, after, cooldownTicks, message, reason, gemAward:0 };
}
export function feedBird(w, birdId, now=Date.now()) {
  const bird=careBird(w,birdId),result=applyScheduledCare(w,birdId,'feed',careTime(now));
  if(!result.changed)return {...careResult('feed',birdId,false,result.before,result.after,0,`${bird.name}は、おなかいっぱい。`,'full'),nextAt:result.nextAt};
  bird.care.lastFedTick=w.tick;fullMeal(w,bird);setAction(w,bird,'eat');
  const gemAward=grantGems(w,result.gemAward);
  record(w,'user-feed',[birdId],'利用者がゲームのごはんを選んだ','おなかの満ちぐあいが増えた');bumpRevision(w);
  return {...careResult('feed',birdId,true,result.before,result.after,0,`${bird.name}がごはんを食べたよ。`,'success'),gemAward,nextAt:result.nextAt};
}
export function petBird(w, birdId, now=Date.now()) {
  const bird=careBird(w,birdId),result=applyScheduledCare(w,birdId,'pet',careTime(now));
  if(!result.changed)return {...careResult('pet',birdId,false,result.before,result.after,0,`${bird.name}は、元気いっぱい。`,'full'),nextAt:result.nextAt};
  bird.mood=clamp(bird.mood+CARE_RULES.petMoodGain);bird.care.lastPetTick=w.tick;setAction(w,bird,'talk');
  const gemAward=grantGems(w,result.gemAward);
  record(w,'user-pet',[birdId],'利用者がゲームのふれあいを選んだ','元気が少し増えた');bumpRevision(w);
  return {...careResult('pet',birdId,true,result.before,result.after,0,`${bird.name}「ぴっ♪」`,'success'),gemAward,nextAt:result.nextAt};
}
export function cleanGarden(w) {
  const before = w.care.cleanliness;
  const wait = remaining(w.care.lastCleanTick, w.tick, CARE_RULES.cleanCooldownTicks);
  if (before === 100 || wait) return careResult('clean', null, false, before, before, wait, '庭の床はきれいだよ。のんびり過ごそう。', before === 100 ? 'clean' : 'cooldown');
  w.care.cleanliness = 100;
  w.care.lastCleanTick = w.tick;
  bumpRevision(w);
  return careResult('clean', null, true, before, 100, CARE_RULES.cleanCooldownTicks, '庭の床をきれいにしたよ。文鳥の羽の色は変わらないよ。', 'success');
}
export function talkToBird(w, birdId, text, now=Date.now()) {
  const b = findBird(w, birdId); if (!b) throw new Error('文鳥を選んでね。');
  const input = String(text).trim().slice(0, 100);
  const care=applyScheduledCare(w,birdId,'talk',careTime(now),input);
  if(care.reason==='empty'||care.reason==='full')return {answer:care.reason==='full'?`${b.name}は、元気いっぱい。またあとで遊ぼう。`:'ことばを入れてね。',topic:'hello',gemAward:0,careChanged:false,nextAt:care.nextAt};
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
  let gemAward=0;
  if(care.changed){b.gemCare.lastChatTick=w.tick;gemAward=grantGems(w,care.gemAward);}
  b.mood = clamp(b.mood + 2); remember(w, b, `user-${topic}`); bumpRevision(w); return { answer, topic, gemAward, careChanged:care.changed, nextAt:care.nextAt };
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
  const worldKeys = ['version','revision','worldId','epoch','lastUpdated','seed','tick','nextId','nextEvent','paused','settings','birds','events','offlineSummary', ...(version >= 2 ? ['care'] : []), ...(version >= 3 ? ['field','decor'] : []), ...(version >= 4 ? ['gems'] : []), ...(version >= 5 ? ['careSchedule'] : [])];
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
  if (!shape(w.settings, version >= 2 ? ['motion', 'careSound'] : ['motion'])) fail('保存の項目が不正です。');
  const num = (n, lo = 0, hi = Number.MAX_SAFE_INTEGER) => typeof n === 'number' && Number.isFinite(n) && n >= lo && n <= hi;
  const integer = (n, lo = 0, hi = Number.MAX_SAFE_INTEGER) => Number.isInteger(n) && num(n, lo, hi);
  const str = (v, max = 100) => typeof v === 'string' && v.length > 0 && v.length <= max && !/[\u0000-\u001f\u007f]/.test(v);
  if (version >= 2 && (!shape(w.care, ['cleanliness', 'lastCleanTick']) || !integer(w.care.cleanliness, 0, 100) || !(w.care.lastCleanTick === null || integer(w.care.lastCleanTick, 0, w.tick)) || typeof w.settings.careSound !== 'boolean')) fail('お世話の情報が不正です。');
  const validEvents = version >= 2 ? EVENT_KINDS : LEGACY_EVENT_KINDS, validMemories = version >= 2 ? MEMORY_KINDS : LEGACY_MEMORY_KINDS;
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
  if (w.birds.filter(b => b.home === 'resident').length > LIMITS.residents || w.birds.filter(b => b.home === 'visitor').length > LIMITS.visitors) fail('庭の定員を超えています。');
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
    const expectedIds = ['pair','declined','play','bath','reconcile'].includes(e.kind) ? 2 : e.kind === 'egg' ? 3 : ['grow','hatch'].includes(e.kind) ? 1 + findBird(w,e.ids[0]).parents.length : e.kind === 'depart' ? e.ids.length : 1;
    if (e.ids.length !== expectedIds || e.kind === 'depart' && e.ids.length > 2) fail('日記の文鳥の組み合わせが不正です。');
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
  return validateWorld(world);
}
export function readCompatibleWorld(input, now=Date.now()) {
  // Do not execute an accessor even to discover the version of an untrusted object.
  const descriptor = input && typeof input === 'object' ? Object.getOwnPropertyDescriptor(input, 'version') : null;
  if (!descriptor || !Object.hasOwn(descriptor, 'value')) throw new Error('保存データを読み込めません：版の形式が違います。');
  if (descriptor.value === 1) return migrateV1ToV2(input,now);
  if (descriptor.value === 2) return migrateV2ToV3(input,now);
  if (descriptor.value === 3) return migrateV3ToV4(input,now);
  if (descriptor.value === 4) return migrateV4ToV5(input,now);
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
