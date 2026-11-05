import {protagonistStatus} from './protagonist.js';
import {LIFE_RULES,isAlive,lifeStatus,caretakerStatus,conditionName,ageLabel} from './life-care.js';

const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const colors={white:'白文鳥',sakura:'桜文鳥',silver:'シルバー文鳥',cinnamon:'シナモン文鳥'};
const number=value=>Math.max(0,Math.floor(Number(value)||0)).toLocaleString('ja-JP');
const now=world=>Number(world.lifecycle?.seenAt)||0;
const remaining=ms=>{const minutes=Math.max(0,Math.ceil(ms/60000));return minutes>=1440?`${Math.floor(minutes/1440)}日 ${Math.floor(minutes%1440/60)}時間`:minutes>=60?`${Math.floor(minutes/60)}時間 ${minutes%60}分`:`${minutes}分`;};
const names=(world,ids)=>ids.map(id=>world.birds.find(b=>b.id===id)?.name||'庭の仲間').map(escape).join('・');
const causeLabel=cause=>({accident:'事故死',lifespan:'寿命',age:'寿命',neglect:'お世話のない時間が続いたため',starvation:'お世話のない時間が続いたため',illness:'病気',disease:'病気',injury:'けが',untreated:'病気・けが'}[cause]||'病気・けが');
const warning='<p class="life-care-warning"><strong>ここにある年齢・期限・治療は、すべてゲームのルールです。</strong>実際の文鳥の飼育目安には使えません。現実の体調変化やけがは、待たずに鳥を診られる獣医師へ相談してください。</p>';

export function renderProtagonistSummary(world){
 const {bird,generation,waiting,heir}=protagonistStatus(world);
 if(!bird)return '';
 const explanation=waiting==='no-child'?'引き継げる存命の子がいないため、代替わりを待っています。家族・お墓・持ち物はそのまま残ります。':waiting==='hatch'?'子の卵がかえるのを待っています。かえった子へ、物語を引き継ぎます。':waiting==='room'?`${heir.name}が帰ってくるため、おうちに空きができるのを待っています。家族を消すことはありません。`:waiting?'代替わりを準備しています。':'名前や選んでいる文鳥が変わっても、主人公は同じです。';
 return `<section class="life-protagonist" aria-label="主人公の代替わり"><h4>第${generation}代の主人公 · ${escape(bird.name)}</h4><p>${escape(explanation)}</p><p class="life-small">主人公が旅立つと、存命の子のうち、先に生まれた長男か長女へ引き継ぎます。卵のときは、かえるまで待ちます。</p></section>`;
}

/** The illness deadline never replaces the independent feeding deadline. */
function renderCareDeadlines(world,state,care){
  if(!state.condition)return `<p class="life-small">${care.active?'飼育員がお世話をしています。':`ごはんの期限まで：実時間 ${remaining(state.lastCareAt+LIFE_RULES.neglectMs-now(world))}`}</p>`;
  const deadlines=[{kind:'feed',label:'ごはん',at:state.lastCareAt+LIFE_RULES.neglectMs},{kind:'treatment',label:'通院',at:state.condition.deadlineAt}].sort((a,b)=>a.at-b.at);
  const tied=deadlines[0].at===deadlines[1].at;
  return deadlines.map((d,i)=>`<p class="life-deadline" data-life-deadline="${d.kind}">${tied?'同じ時刻：':i===0?'先に必要：':''}${d.label}の期限まで：<strong>実時間 ${remaining(d.at-now(world))}</strong></p>`).join('')+'<p class="life-small">ごはんと通院は、それぞれ必要です。片方だけでは、もう片方の期限は延びません。</p>';
}

/** Render-only: never changes lifecycle, money, or the wall clock. */
export function renderLifeSummary(world,bird){
  const state=lifeStatus(world,bird);
  if(state.death)return `<p class="life-summary is-memorial">${escape(ageLabel(world,bird))} · 思い出の庭で、ずっと一緒</p>`;
  const label=state.condition?conditionName(state.condition.kind):'体調はおだやか';
  return `<p class="life-summary${state.condition?' is-unwell':''}">${escape(ageLabel(world,bird))} · ${escape(label)}</p>`;
}

export function renderLifeCarePanel(world){
  const residents=world.birds.filter(b=>b.home==='resident'&&isAlive(world,b));
  const care=caretakerStatus(world),gold=Math.max(0,Number(world.economy?.gold)||0);
  const cost=LIFE_RULES.hospitalGold;
  const birds=residents.map(b=>{
    const state=lifeStatus(world,b),condition=state.condition;
    return `<article class="life-bird-card${condition?' is-unwell':''}"><div class="life-bird-title"><h4>${escape(b.name)}</h4><span class="life-badge">${condition?'通院が必要':'見守り中'}</span></div>${renderLifeSummary(world,b)}${renderCareDeadlines(world,state,care)}${condition?`<p>${escape(conditionName(condition.kind))}のため、病院で手当てしましょう。</p><button type="button" data-life-treat="${escape(b.id)}" ${gold<cost?'disabled':''}>病院へ連れていく · ${number(cost)} Gold</button>${gold<cost?'<p class="life-small">Goldが足りません。</p>':''}`:''}</article>`;
  }).join('');
  return `<section class="life-care-panel" aria-label="健康とお留守番"><header class="life-panel-heading"><p class="game-eyebrow">LITTLE LIFE, EVERY DAY</p><h3>健やかな日も、留守の日も。</h3><p>一羽ずつの時間を、大切に。</p></header>${warning}${renderProtagonistSummary(world)}<div class="life-care-rules"><span>寿命 <strong>ゲーム内10年</strong></span><span>お世話なし <strong>実時間3日</strong></span><span>通院期限 <strong>発症から実時間24時間</strong></span></div><section class="life-caretaker" aria-label="飼育員を雇う"><div class="life-bird-title"><h4>お留守番の飼育員</h4><span class="life-badge">${care.active?'契約中':'前払い'}</span></div><p>実時間1日につき <strong>${number(LIFE_RULES.caretakerDailyGold)} Gold</strong>。この庭で暮らす全員のごはん・掃除・自動通院（追加料金なし）をお任せできます。</p><p class="life-small">Gold・Gemsは増えません。寿命は延びません。契約は残り合計30日までです。</p>${care.active?`<p class="life-contract">契約の残り：<strong>実時間 ${remaining(care.remainingMs)}</strong><br><small>延長分は現在の契約の後に追加されます。</small></p>`:''}<div class="life-hire-options">${[1,3,7].map(days=>{const price=days*LIFE_RULES.caretakerDailyGold;return `<button type="button" data-life-hire="${days}" ${gold<price||!residents.length||care.remainingMs+days*86400000>30*86400000?'disabled':''}><span>${days}日${care.active?'延長':'お願いする'}</span><strong>${number(price)} Gold</strong></button>`;}).join('')}</div><p class="life-small">所持金：${number(gold)} Gold${gold<LIFE_RULES.caretakerDailyGold?' · 契約に必要なGoldが足りません。':''}</p></section><details class="life-risk-help"><summary>ゲーム内で体調が変わるきっかけ</summary><p>きれいさ20以下が実時間1日続くと呼吸器の病気、おなかと元気がともに40以下で実時間1日続くとおなかの病気が起こります。6羽以上のおうちで、相性の低い相手に繰り返し近づくと、けんかのけがが起こることもあります。</p><p>期限を更新するのはごはんです。なでる・話す・そうじだけでは給餌期限は変わりません。古い保存には導入時の猶予があります。</p></details><h4 class="life-list-heading">みんなの健康 <span>${residents.length}羽</span></h4><div class="life-bird-grid">${birds||'<p class="life-empty">この庭で暮らしている文鳥はいません。</p>'}</div></section>`;
}

export function renderMemorialPanel(world){
  const departed=world.birds.filter(b=>lifeStatus(world,b).death);
  return `<section class="life-memorial-panel" aria-label="思い出の庭"><header class="life-panel-heading"><p class="game-eyebrow">ALWAYS IN OUR GARDEN</p><h3>思い出の庭</h3><p>名前も、家族も、過ごした時間も。ここに残ります。</p></header>${renderProtagonistSummary(world)}<p class="life-small">お線香とお祈りにGoldはかかりません。それぞれ1分に1回できます。お線香は画面の中だけの表現です。現実では、生きている鳥に煙を近づけないでください。</p><div class="life-grave-grid">${departed.map(b=>{
    const state=lifeStatus(world,b),family=[b.partner?`つがい：${names(world,[b.partner])}`:'',b.parents?.length?`親：${names(world,b.parents)}`:'',world.birds.some(child=>child.parents?.includes(b.id))?`子：${names(world,world.birds.filter(child=>child.parents?.includes(b.id)).map(child=>child.id))}`:''].filter(Boolean).join('<br>');
    return `<article class="life-grave"><div class="life-gravestone" aria-hidden="true"><span>❀</span></div><h4>${escape(b.name)}</h4><p class="life-small">${escape(colors[b.color]||'文鳥')} · ${escape(ageLabel(world,b))}</p><p>${escape(causeLabel(state.death.cause))}で旅立ちました</p>${family?`<p class="life-family">${family}</p>`:''}<div class="life-memorial-counts"><span>お線香 ${number(state.incenseCount)}回</span><span>お祈り ${number(state.prayerCount)}回</span></div><div class="life-memorial-actions"><button type="button" data-life-incense="${escape(b.id)}" ${state.lastIncenseAt!=null&&now(world)-state.lastIncenseAt<60000?'disabled':''}>お線香をあげる</button><button type="button" data-life-pray="${escape(b.id)}" ${state.lastPrayerAt!=null&&now(world)-state.lastPrayerAt<60000?'disabled':''}>お祈りする</button></div><button type="button" class="life-memory-card" data-game-art="${escape(b.id)}">思い出の記念カード</button></article>`;
  }).join('')||'<div class="life-empty"><span aria-hidden="true">❀</span><p>今は、まだお墓はありません。<br>一緒に過ごす今日を大切に。</p></div>'}</div></section>`;
}
