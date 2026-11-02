/** A deterministic, offline, non-punitive story simulation. No real husbandry advice. */
export const SAVE_VERSION = 1;
export const TICK_MS = 15000;
export const MAX_SAVE_BYTES = 4000000;
const MAX_DATE_MS = 8640000000000000;
const EVENT_KINDS = ['welcome','visit','revisit','adopt','movein','pair','egg','hatch','grow','declined','play','bath','reconcile','depart'];
const MILESTONE_KINDS = ['welcome','adopt','movein','pair','egg','hatch','grow','depart'];
const MEMORY_KINDS = [...EVENT_KINDS, ...['hello','rest','bath','friend','play','food','unknown'].map(kind => `user-${kind}`)];
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
export function findBird(w, id) { return w.birds.find(b => b.id === id); }
export function birdName(w, id) { return findBird(w, id)?.name || '文鳥'; }
function id(w) { return `b${w.nextId++}`; }
// Revision tokens are compared for equality, so rollover is safe and stays serializable.
export function bumpRevision(w) { w.revision = w.revision >= Number.MAX_SAFE_INTEGER ? 0 : w.revision + 1; return w.revision; }
export function createBird(w, options = {}) {
  if (w.birds.length >= LIMITS.birds) return null;
  const b = { id: id(w), name: options.name || pick(w, names), sex: options.sex || (random(w) < .5 ? 'female' : 'male'), color: options.color || pick(w, COLORS), stage: options.stage || 'adult', bornTick: w.tick, stageTick: w.tick, arrivedTick: w.tick, parents: options.parents || [], generation: options.generation || 0, partner: null, pairTick: null, eggsLaid: 0, lastEggTick: -1000, home: options.home || 'visitor', personality: { curiosity: 25 + Math.floor(random(w) * 65), sociability: 35 + Math.floor(random(w) * 55), caution: 15 + Math.floor(random(w) * 65) }, preference: pick(w, PREFERENCES), mood: 70, needs: { energy: 80, food: 80, play: 60 }, relations: {}, memories: [], milestones: [], action: { kind: 'rest', target: null, startedTick: w.tick }, lastSocialTick: -1 };
  w.birds.push(b); return b;
}
function remember(w, b, kind, otherId = null) { const memory = { kind, otherId, tick: w.tick }; b.memories.push(memory); if (b.memories.length > LIMITS.memories) b.memories.shift(); if (['welcome','adopt','movein','pair','egg','hatch','grow','depart'].includes(kind) && !b.milestones.some(m => m.kind === kind && m.otherId === otherId)) { b.milestones.push(memory); if (b.milestones.length > LIMITS.memories) b.milestones.shift(); } }
function record(w, kind, ids, condition, result, data = {}) {
  const prior = w.events.at(-1);
  if (prior && prior.kind === kind && prior.ids.join() === ids.join() && w.tick - prior.tick < 3) return;
  // An imported astronomic counter must not lose numeric precision. Bird IDs never change.
  if (w.nextEvent >= Number.MAX_SAFE_INTEGER) { w.events.forEach((event, i) => { event.id = `e${i + 1}`; }); w.nextEvent = w.events.length + 1; }
  const e = { id: `e${w.nextEvent++}`, kind, ids, condition, result, data, tick: w.tick, at: w.epoch + w.tick * TICK_MS };
  w.events.push(e); if (w.events.length > LIMITS.events) w.events.shift();
  for (const bid of ids) { const b = findBird(w, bid); if (b) remember(w, b, kind, ids.find(i => i !== bid) || null); }
}
export function createWorld(now = Date.now(), seed = 842911) {
  const w = { version: SAVE_VERSION, revision: 0, worldId: `garden-${now}-${seed}`, epoch: now, lastUpdated: now, seed: seed >>> 0, tick: 0, nextId: 1, nextEvent: 1, paused: false, settings: { motion: true }, birds: [], events: [], offlineSummary: null };
  const b = createBird(w, { name: 'おもち', sex: 'female', color: 'white', home: 'resident' });
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
  a.needs.energy = clamp(a.needs.energy - 3); b.needs.energy = clamp(b.needs.energy - 2);
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
    if (next) { b.stage = next; b.stageTick = w.tick; if (next === 'chick' && /^たまご[12]$/.test(b.name)) b.name = `${pick(w, names)}${b.id.slice(1)}`; record(w, next === 'chick' ? 'hatch' : 'grow', [b.id, ...b.parents], '成長の時間がたった', `${STAGES[next]}になった`, { stage: next }); }
  }
}
function births(w) {
  for (const mother of w.birds.filter(b => b.sex === 'female' && b.stage === 'adult' && b.partner && b.home === 'resident')) {
    const father = findBird(w, mother.partner); if (!father || father.home !== 'resident' || isRelated(w, mother.id, father.id)) continue;
    const r = mother.relations[father.id], rr = father.relations[mother.id];
    if (!r || !rr || r.trust < 60 || rr.trust < 60 || mother.mood < 55 || father.mood < 55 || mother.needs.energy < 35 || mother.eggsLaid >= 2 || w.tick - mother.pairTick < 20 || w.tick - mother.lastEggTick < 65 || w.birds.filter(b => b.home === 'resident').length >= LIMITS.residents || w.birds.length >= LIMITS.birds) continue;
    if (w.tick % 7 !== 0) continue;
    const egg = createBird(w, { name: `たまご${mother.eggsLaid + 1}`, stage: 'egg', parents: [mother.id, father.id], generation: Math.max(mother.generation, father.generation) + 1, home: 'resident' });
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
      const v = createBird(w, { name: w.tick === 1 ? 'ななしの訪問者' : undefined, sex: single ? (single.sex === 'female' ? 'male' : 'female') : undefined });
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
  w.tick++; grow(w); visits(w);
  const active = w.birds.filter(b => b.home !== 'departed' && b.stage !== 'egg');
  for (const b of active) {
    b.needs.energy = clamp(b.needs.energy - (b.stage === 'chick' ? 2 : 4), 12, 100);
    b.needs.food = clamp(b.needs.food - 5, 12, 100); b.needs.play = clamp(b.needs.play - 4, 8, 100);
    b.mood = clamp(b.mood + (b.needs.energy > 40 ? .3 : -.3), 35, 100);
    if (b.stage === 'chick') { setAction(w, b, 'nest'); b.needs.food = 85; b.needs.energy = 90; continue; }
    if (b.needs.energy < 33 || b.action.kind === 'rest' && b.needs.energy < 65) { b.needs.energy = clamp(b.needs.energy + 24); setAction(w, b, 'rest'); continue; }
    if (b.needs.food < 35) { b.needs.food = 93; b.mood = clamp(b.mood + 2); setAction(w, b, 'eat'); continue; }
    const social = (b.needs.play < 48 ? .68 : .42) + b.personality.sociability / 350;
    if (random(w) < social && b.lastSocialTick !== w.tick) {
      const target = chooseTarget(w, b, active);
      if (target) { b.lastSocialTick = w.tick; target.lastSocialTick = w.tick; interact(w, b, target); continue; }
    }
    const repeat = b.action.kind;
    const options = ['bath', 'explore', 'rest'].filter(k => k !== repeat);
    const kind = pick(w, options); setAction(w, b, kind);
    if (kind === 'rest') b.needs.energy = clamp(b.needs.energy + 15);
    else { b.needs.play = clamp(b.needs.play + 12); if ((kind === 'bath' && b.preference === '水浴び') || (kind === 'explore' && b.personality.curiosity > 60)) b.mood = clamp(b.mood + 4); }
  }
  births(w); bumpRevision(w); return w;
}
export function advanceTicks(w, count) { if (!Number.isFinite(count) || count <= 0) return w; for (let i = 0; i < Math.min(Math.floor(count), 100000); i++) stepWorld(w); return w; }
export function advanceTo(w, now = Date.now()) {
  if (!Number.isSafeInteger(now) || now < 0 || now > MAX_DATE_MS) return w;
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
  b.name = clean; bumpRevision(w); return b;
}
export function adoptBird(w, birdId, name) {
  const b = findBird(w, birdId); if (!b || b.home !== 'visitor') throw new Error('今来ている文鳥を選んでね。');
  if (w.birds.filter(x => x.home === 'resident').length >= LIMITS.residents) throw new Error('この庭は10羽まで。今いる仲間を見守ろう。');
  if (name) renameBird(w, b.id, name);
  b.home = 'resident'; record(w, 'adopt', [b.id], '利用者が迎え入れた', 'この庭で暮らし始めた'); bumpRevision(w); return b;
}
export function talkToBird(w, birdId, text) {
  const b = findBird(w, birdId); if (!b) throw new Error('文鳥を選んでね。');
  const input = String(text).trim().slice(0, 100);
  const friend = Object.entries(b.relations).sort((a, c) => c[1].affection - a[1].affection).find(([bid]) => findBird(w, bid));
  const near = friend ? birdName(w, friend[0]) : '庭のみんな';
  const last = b.memories.at(-1);
  let topic = 'hello', answer;
  if (b.stage === 'egg') answer = `${b.name}は、巣のなかで静かに育っているよ。`;
  else if (/(おやすみ|ねむ|眠|休)/.test(input)) { topic = 'rest'; b.needs.energy = clamp(b.needs.energy + 8); setAction(w, b, 'rest'); answer = `${b.name}だよ。${b.needs.energy < 50 ? 'ちょうど眠かったんだ。' : '静かな時間もいいね。'}枝でひとやすみするね。`; }
  else if (/(水|みず|おふろ|浴)/.test(input)) { topic = 'bath'; b.needs.play = clamp(b.needs.play - 10); b.preference === '水浴び' && (b.mood = clamp(b.mood + 6)); setAction(w, b, 'bath'); answer = `${b.name}だよ。${b.preference === '水浴び' ? '水浴びの話、大好き！' : '花びらの水場を見にいこうかな。'}${near}も来るかな？`; }
  else if (/(ともだち|友|家族|なかよし|好き)/.test(input)) { topic = 'friend'; b.needs.play = clamp(b.needs.play - 8); answer = `${b.name}だよ。${friend ? `${near}とは「${relationshipLabel(w, b, findBird(w, friend[0]))}」。会うたび少しずつ知っていくんだ。` : 'まだ出会ったばかり。少しずつ仲良くなりたいな。'}`; }
  else if (/(あそ|遊|探検|たんけん)/.test(input)) { topic = 'play'; b.needs.play = clamp(b.needs.play - 12); b.mood = clamp(b.mood + 5); answer = `${b.name}だよ。${b.needs.energy < 35 ? 'いまは少し休みたいな。元気になったらね。' : b.personality.curiosity > 60 ? '新しい葉っぱの向こうを探検したい！' : 'いつもの枝で、ゆっくり遊ぼう。'}`; }
  else if (/(ごはん|食|おいし|たべ)/.test(input)) { topic = 'food'; b.needs.food = clamp(b.needs.food + 8); setAction(w, b, 'eat'); answer = `${b.name}だよ。ごはんは自分でも食べられるよ。声をかけてくれてうれしいな。`; }
  else if (/(今日|きょう|げんき|元気|どう|おは|こん|よん|呼)/.test(input) || input.includes(b.name)) {
    answer = `${b.name}だよ。いまは${b.needs.energy < 40 ? 'のんびりしたい気分' : b.mood > 75 ? 'わくわくした気分' : 'おだやかな気分'}。${last?.otherId ? `さっきは${birdName(w, last.otherId)}のことを考えていたよ。` : `${b.preference}が気になるな。`}`;
  } else { topic = 'unknown'; answer = `${b.name}だよ。そのお話はまだわからないけれど、声は届いたよ。「遊ぼう」「水浴び」「友達」「おやすみ」のお話ならできるよ。`; }
  b.mood = clamp(b.mood + 2); remember(w, b, `user-${topic}`); bumpRevision(w); return { answer, topic };
}
export function eventText(w, e) {
  const n = e.ids.map(i => birdName(w, i));
  const phrases = { welcome: `${n[0]}の文鳥ぐらしが始まった。`, visit: `${n[0]}が庭へ遊びに来た。`, revisit: `${n[0]}が久しぶりに遊びに来た。`, adopt: `${n[0]}を庭の仲間に迎えた。`, movein: `${n[0]}が、この庭で暮らすことにした。`, pair: `${n[0]}と${n[1]}がつがいになった。`, egg: `${n[1]}と${n[2]}の巣に、${n[0]}が生まれた。`, hatch: `${n[0]}が卵からかえった。`, grow: `${n[0]}が${STAGES[e.data.stage] || '次の段階'}になった。`, declined: `${n[0]}「遊ぼう」 ${n[1]}「今日は休むね。また今度！」`, play: `${n[0]}「いっしょに遊ぼう」 ${n[1]}「いいね！」`, bath: `${n[0]}「水場へいこう」 ${n[1]}「いっしょにいこう！」`, reconcile: `${n[0]}と${n[1]}は、今日は元気に遊べた。`, depart: `${n.join('と')}が別の庭へ巣立った。また会えるね。` };
  return phrases[e.kind] || `${n.join('と')}：${e.result}`;
}
export function validateWorld(input) {
  const fail = msg => { throw new Error(`保存データを読み込めません：${msg}`); };
  if (!input || typeof input !== 'object' || Array.isArray(input)) fail('形式が違います。');
  const shape = (value, keys) => value !== null && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key));
  const worldKeys = ['version','revision','worldId','epoch','lastUpdated','seed','tick','nextId','nextEvent','paused','settings','birds','events','offlineSummary'];
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
  if (input.version !== SAVE_VERSION) fail('対応していない版です。元の保存はそのままです。');
  let w; try { w = clone(input); } catch { fail('JSONの構造が不正です。'); }
  if (!shape(w.settings, ['motion'])) fail('保存の項目が不正です。');
  const num = (n, lo = 0, hi = Number.MAX_SAFE_INTEGER) => typeof n === 'number' && Number.isFinite(n) && n >= lo && n <= hi;
  const integer = (n, lo = 0, hi = Number.MAX_SAFE_INTEGER) => Number.isInteger(n) && num(n, lo, hi);
  const str = (v, max = 100) => typeof v === 'string' && v.length > 0 && v.length <= max && !/[\u0000-\u001f\u007f]/.test(v);
  if (!str(w.worldId) || !integer(w.revision) || !integer(w.seed, 0, 4294967295) || !integer(w.tick) || !integer(w.nextId, 1, LIMITS.birds + 1) || !integer(w.nextEvent, 2) || !integer(w.epoch, 0, MAX_DATE_MS) || !integer(w.lastUpdated, 0, MAX_DATE_MS) || !integer(w.epoch + w.tick * TICK_MS, 0, MAX_DATE_MS) || typeof w.paused !== 'boolean' || !w.settings || typeof w.settings.motion !== 'boolean') fail('基本情報が不正です。');
  if (!Array.isArray(w.birds) || !w.birds.length || w.birds.length > LIMITS.birds || !Array.isArray(w.events) || !w.events.length || w.events.length > LIMITS.events) fail('鳥や日記が多すぎます。');
  if (w.birds.some(b => !shape(b, ['id','name','sex','color','stage','bornTick','stageTick','arrivedTick','parents','generation','partner','pairTick','eggsLaid','lastEggTick','home','personality','preference','mood','needs','relations','memories','milestones','action','lastSocialTick']))) fail('文鳥の項目が不正です。');
  const ids = new Set(w.birds.map(b => b.id));
  if (ids.size !== w.birds.length) fail('同じIDが重なっています。');
  if (w.nextId !== w.birds.length + 1 || w.birds.some((_, i) => !ids.has(`b${i + 1}`))) fail('文鳥のIDの順序が不正です。');
  const ref = (bid, optional = false) => optional && bid === null || typeof bid === 'string' && ids.has(bid);
  for (const b of w.birds) {
    if (!/^b[1-9]\d{0,8}$/.test(b.id) || Number(b.id.slice(1)) >= w.nextId || !str(b.name, 16) || !b.name.trim() || !['female', 'male'].includes(b.sex) || !COLORS.includes(b.color) || !Object.hasOwn(STAGES, b.stage) || !['resident','visitor','departed'].includes(b.home) || !PREFERENCES.includes(b.preference)) fail('文鳥の情報が不正です。');
    for (const k of ['bornTick', 'stageTick', 'arrivedTick']) if (!integer(b[k], 0, w.tick) || k !== 'bornTick' && b[k] < b.bornTick) fail('成長の時刻が不正です。');
    if (!integer(b.generation, 0, LIMITS.birds) || !integer(b.eggsLaid, 0, 2) || !integer(b.lastEggTick, -1000, w.tick) || !integer(b.lastSocialTick, -1, w.tick) || !(b.pairTick === null || integer(b.pairTick, 0, w.tick)) || !num(b.mood, 0, 100) || !b.personality || !b.needs) fail('状態が不正です。');
    if (!shape(b.personality, ['curiosity','sociability','caution']) || !shape(b.needs, ['energy','food','play']) || ['curiosity','sociability','caution'].some(k => !num(b.personality[k], 0, 100)) || ['energy','food','play'].some(k => !num(b.needs[k], 0, 100))) fail('気分や欲求が不正です。');
    if (!Array.isArray(b.parents) || ![0,2].includes(b.parents.length) || b.parents.some(p => !ref(p) || p === b.id) || new Set(b.parents).size !== b.parents.length || !ref(b.partner, true) || b.partner === b.id) fail('家族の参照が不正です。');
    if (!shape(b.action, ['kind','target','startedTick']) || !Object.hasOwn(ACTIONS, b.action.kind) || !ref(b.action.target, true) || !integer(b.action.startedTick, b.bornTick, w.tick)) fail('行動が不正です。');
    if (!b.relations || typeof b.relations !== 'object' || Array.isArray(b.relations) || Object.keys(b.relations).length > LIMITS.birds) fail('関係が不正です。');
    for (const [other, r] of Object.entries(b.relations)) if (!ref(other) || other === b.id || !shape(r, ['affection','trust','compatibility','meetings','lastTick']) || ['affection','trust','compatibility'].some(k => !num(r[k], 0, 100)) || !integer(r.meetings) || !integer(r.lastTick, 0, w.tick)) fail('関係の数値が不正です。');
    for (const list of [b.memories, b.milestones]) if (!Array.isArray(list) || list.length > LIMITS.memories || list.some(m => !shape(m, ['kind','otherId','tick']) || !(list === b.milestones ? MILESTONE_KINDS : MEMORY_KINDS).includes(m.kind) || !ref(m.otherId, true) || !integer(m.tick, b.bornTick, w.tick))) fail('記憶が不正です。');
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
    if (!shape(e, ['id','kind','ids','condition','result','data','tick','at']) || !/^e[1-9]\d*$/.test(e.id) || !Number.isSafeInteger(Number(e.id.slice(1))) || Number(e.id.slice(1)) <= previousId || Number(e.id.slice(1)) >= w.nextEvent || eventIds.has(e.id) || !EVENT_KINDS.includes(e.kind) || !Array.isArray(e.ids) || !e.ids.length || e.ids.length > 3 || new Set(e.ids).size !== e.ids.length || e.ids.some(x => !ref(x)) || !str(e.condition, 120) || !str(e.result, 120) || !integer(e.tick, previousTick, w.tick) || !integer(e.at, 0, MAX_DATE_MS) || e.at !== w.epoch + e.tick * TICK_MS || e.ids.some(id => findBird(w,id).bornTick > e.tick)) fail('日記が不正です。');
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
  return w;
}
export function serializeWorld(w) {
  // Compact output keeps even a dense, bounded 128-bird relationship graph importable.
  const text = JSON.stringify(validateWorld(w));
  if (new TextEncoder().encode(text).byteLength > MAX_SAVE_BYTES) throw new Error('保存データが4MBを超えています。');
  return text;
}
/** Migration boundary: v1 is the first public schema; newer versions must add an explicit pure migration here. */
export function parseSave(text) { if (typeof text !== 'string' || text.length > MAX_SAVE_BYTES || new TextEncoder().encode(text).byteLength > MAX_SAVE_BYTES) throw new Error('保存ファイルは4MB以下のJSONを選んでください。'); return validateWorld(JSON.parse(text)); }
