import {effectiveHealthDeadline,relaxedBird} from './care-rules.js';
import {allBirds,activateBird} from './world-birds.js';
import {renderCaretakerRecruitment} from './caretaker-recruitment-ui.js';
import {memorialDesignForBird,renderMemorialArtwork} from './memorial-designs.js';
import {protagonistStatus,familySuccessorCandidates} from './protagonist.js';
import {LIFE_RULES,isAlive,lifeStatus,caretakerStatus,conditionName,ageLabel} from './life-care.js';

const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const colors={white:'白文鳥',sakura:'桜文鳥',silver:'シルバー文鳥',cinnamon:'シナモン文鳥'};
const number=value=>Math.max(0,Math.floor(Number(value)||0)).toLocaleString('ja-JP');
const now=world=>Number(world.lifecycle?.seenAt)||0;
const remaining=ms=>{const minutes=Math.max(0,Math.ceil(ms/60000));return minutes>=1440?`${Math.floor(minutes/1440)}日 ${Math.floor(minutes%1440/60)}時間`:minutes>=60?`${Math.floor(minutes/60)}時間 ${minutes%60}分`:`${minutes}分`;};
const remainingUnits=ms=>remaining(ms).split(' ').map(unit=>`<span class="life-time-unit">${unit}</span>`).join(' ');
const names=(world,ids)=>ids.map(id=>allBirds(world).find(b=>b.id===id)?.name||'庭の仲間').map(escape).join('・');
const causeLabel=cause=>({accident:'事故死',lifespan:'寿命',age:'寿命',neglect:'お世話のない時間が続いたため',starvation:'お世話のない時間が続いたため',illness:'病気',disease:'病気',injury:'けが',untreated:'病気・けが'}[cause]||'病気・けが');
const warning='<p class="life-care-warning"><strong>ここにある年齢・期限・治療は、すべてゲームのルールです。</strong>実際の文鳥の飼育目安には使えません。現実の体調変化やけがは、待たずに鳥を診られる獣医師へ相談してください。</p>';

export function renderProtagonistSummary(world){
 const {bird,generation,waiting,heir}=protagonistStatus(world);
 if(!bird)return '';
 const candidates=waiting==='no-child'?familySuccessorCandidates(world):[];
 const explanation=waiting==='no-child'?(candidates.length?'引き継げる存命の子がいないため、残っている家族から次の主人公を選べます。確認するまで代替わりしません。':'引き継げる存命の子も、選べる家族もいません。次の主人公は決まりませんが、家系・思い出・お墓・持ち物は残ります。メニューの操作はそのまま使えます。'):waiting==='hatch'?'子の卵がかえるのを待っています。かえった子へ、物語を引き継ぎます。':waiting==='room'?`${heir.name}が帰ってくるため、おうちに空きができるのを待っています。家族を消すことはありません。`:waiting?'代替わりを準備しています。':'名前や選んでいる文鳥が変わっても、主人公は同じです。';
 const choices=candidates.length?`<div class="life-successor-choices">${candidates.map(({bird:b,reason})=>`<div><button type="button" data-successor-open="${escape(b.id)}" ${reason?'disabled':''}>${escape(b.name)}を次の主人公に選ぶ</button>${reason?`<p class="life-small">${reason==='hatch'?'卵がかえってから選べます。自動では交代しません。':reason==='clock'?'保存された日時が上限に近いため、帰宅後の通院時間を確保できません。':'帰宅には家族の空きが必要です。誰かを追い出すことはありません。'}</p>`:b.home!=='resident'?'<p class="life-small">同じ文鳥が帰宅して引き継ぎます。</p>':''}</div>`).join('')}</div><p class="life-small">名前・血縁・つがい・記録は変わりません。新しい文鳥は作りません。</p>${candidates.some(c=>c.reason==='room')?'<button type="button" data-game-panel="family">家族の様子と独立相談を見る</button>':''}`:'';
 return `<section class="life-protagonist" aria-label="主人公の代替わり"><h4>第${generation}代の主人公 · ${escape(bird.name)}</h4><p>${escape(explanation)}</p>${choices}<p class="life-small">主人公が旅立つと、存命の子のうち、先に生まれた長男か長女へ引き継ぎます。卵のときは、かえるまで待ちます。存命の子がいないときだけ、家族から選べます。</p></section>`;
}

/** The illness deadline never replaces the independent feeding deadline. */
function renderCareDeadlines(world,state,care){
  const grace=relaxedBird(world,state.birdId)?.healthGraceUntil??0;
  if(grace===253402268399999)return '<p class="life-small" data-return-care>おかえり。ごはんや、びょういんでおせわしよう。</p>';
  if(grace>now(world))return `<p class="life-small" data-return-care>おかえり。ごはんや、びょういんでおせわしよう。おせわできるじかん ${remainingUnits(grace-now(world))}</p>`;
  if(!state.condition)return `<p class="life-small">${care.active?'飼育員がお世話をしています。':`ごはんの期限まで：実時間 ${remainingUnits(effectiveHealthDeadline(world,state,state.lastCareAt+LIFE_RULES.neglectMs)-now(world))}`}</p>`;
  const deadlines=[{kind:'feed',label:'ごはん',at:effectiveHealthDeadline(world,state,state.lastCareAt+LIFE_RULES.neglectMs)},{kind:'treatment',label:'通院',at:effectiveHealthDeadline(world,state,state.condition.deadlineAt)}].sort((a,b)=>a.at-b.at);
  const tied=deadlines[0].at===deadlines[1].at;
  return '<div class="life-deadline-grid">'+deadlines.map((d,i)=>`<p class="life-deadline" data-life-deadline="${d.kind}"><span class="life-deadline-priority${tied||i===0?' is-priority':''}">${tied?'同じ時刻':i===0?'先に必要':''}</span><span class="life-deadline-label">${d.label}まで<small>（実時間）</small></span><strong>${remainingUnits(d.at-now(world))}</strong></p>`).join('')+'</div>';
}

/** Render-only: never changes lifecycle, money, or the wall clock. */
export function renderLifeSummary(world,bird){
  const state=lifeStatus(world,bird);
  if(state.death)return `<p class="life-summary is-memorial">${escape(ageLabel(world,bird))} · 思い出の庭で、ずっと一緒</p>`;
  const label=state.condition?conditionName(state.condition.kind):'体調はおだやか';
  return `<p class="life-summary${state.condition?' is-unwell':''}">${escape(ageLabel(world,bird))} · ${escape(label)}</p>`;
}

export function renderLifeCarePanel(world,{birdSvg=()=>''}={}){
  const residents=allBirds(world).filter(b=>b.home==='resident'&&isAlive(world,b));
  const care=caretakerStatus(world),gold=Math.max(0,Number(world.economy?.gold)||0);
  const cost=LIFE_RULES.hospitalGold;
  const unwell=residents.filter(b=>lifeStatus(world,b).condition);
  const waiting=protagonistStatus(world).waiting;
  const protagonist=renderProtagonistSummary(world);
  const stageNames={egg:'卵',chick:'ひな',juvenile:'幼鳥',adult:'成鳥'};
  const birds=[...residents].sort((a,b)=>Number(!!lifeStatus(world,b).condition)-Number(!!lifeStatus(world,a).condition)).map(b=>{
    const state=lifeStatus(world,b),condition=state.condition;
    return `<article class="life-bird-card${condition?' is-unwell':''}">${condition?'<div class="life-card-state"><span class="life-badge">通院が必要</span></div>':''}<div class="life-bird-identity"><span class="life-bird-portrait game-mini-bird" aria-hidden="true">${birdSvg(b.color,b.stage)}</span><div><div class="life-bird-name-row"><h4>${escape(b.name)}</h4>${condition?'':'<span class="life-badge">体調おだやか</span>'}</div>${condition?`<p class="life-health-condition">${escape(conditionName(condition.kind))}</p>`:''}<p class="life-small life-bird-kind">${escape(colors[b.color]||'文鳥')} · ${escape(stageNames[b.stage]||'文鳥')}</p><p class="life-small life-bird-age">${escape(ageLabel(world,b))}</p></div></div>${renderCareDeadlines(world,state,care)}${condition?`<button type="button" data-life-treat="${escape(b.id)}" ${gold<cost?'disabled':''}>病院へ連れていく · ${number(cost)} Gold</button><p class="life-small life-deadline-note">ごはんと通院は、それぞれ必要です。片方だけでは、もう片方の期限は延びません。</p>${gold<cost?'<p class="life-small">Goldが足りません。</p>':''}`:''}</article>`;
  }).join('');
  return `<section class="life-care-panel life-health-notebook" aria-label="健康とお留守番"><header class="life-panel-heading"><div class="life-health-title"><h3>みんなの健康</h3><span class="life-badge">家族 ${residents.length}羽</span></div><p>${unwell.length?`通院が必要な子が${unwell.length}羽います。`:residents.length?'今日も、一羽ずつ見守ろう。':'また一緒に暮らす日を待っています。'}</p></header>${waiting?protagonist:''}<div class="life-bird-grid">${birds||'<p class="life-empty">この庭で暮らしている文鳥はいません。</p>'}</div><details class="life-caretaker-fold" data-game-details="health-caretaker"><summary><span>お留守番の飼育員</span><span class="life-badge">${care.active?'契約中':'くわしく'}</span></summary>${renderCaretakerRecruitment({active:care.active,dailyGoldLabel:number(LIFE_RULES.caretakerDailyGold),goldLabel:number(gold),remainingLabel:remaining(care.remainingMs),insufficientGold:gold<LIFE_RULES.caretakerDailyGold,options:[1,3,7].map(days=>{const price=days*LIFE_RULES.caretakerDailyGold;return {days,priceLabel:number(price),disabled:gold<price||!residents.length||care.remainingMs+days*86400000>30*86400000};})})}</details>${warning}<p class="life-health-wallet">所持金 ${number(gold)} Gold</p><details class="life-health-rules" data-game-details="health-rules"><summary>健康とお世話のルールを読む</summary><div class="life-care-rules"><span>寿命 <strong>ゲーム内10年</strong></span><span>お世話なし <strong>実時間3日</strong></span><span>通院期限 <strong>発症から実時間24時間</strong></span></div><details class="life-risk-help"><summary>ゲーム内で体調が変わるきっかけ</summary><p>きれいさ20以下が実時間1日続くと呼吸器の病気、おなかと元気がともに40以下で実時間1日続くとおなかの病気が起こります。6羽以上のおうちで、相性の低い相手に繰り返し近づくと、けんかのけがが起こることもあります。</p><p>期限を更新するのはごはんです。なでる・話す・そうじだけでは給餌期限は変わりません。古い保存には導入時の猶予があります。</p></details><p class="life-small">ごはんと通院の実時間の期限は、画面を閉じている間や物語を一時停止している間も進みます。</p>${waiting?'':protagonist}</details></section>`;
}

export function renderMemorialPanel(world){
  const departed=allBirds(world).filter(b=>lifeStatus(world,b).death);
  return `<section class="life-memorial-panel life-memorial-gallery" aria-label="思い出の庭"><header class="life-panel-heading"><p class="game-eyebrow">ALWAYS IN OUR GARDEN</p><h3>思い出の庭</h3><p>名前も、家族も、過ごした時間も。ここに残ります。</p></header>${renderProtagonistSummary(world)}<p class="life-small">お線香とお祈りにGoldはかかりません。それぞれ1分に1回できます。お線香は画面の中だけの表現です。現実では、生きている鳥に煙を近づけないでください。</p><div class="life-grave-grid">${departed.map(b=>{
    const state=lifeStatus(world,b),design=memorialDesignForBird(world,b),family=[b.partner?`つがい：${names(world,[b.partner])}`:'',b.parents?.length?`親：${names(world,b.parents)}`:'',allBirds(world).some(child=>child.parents?.includes(b.id))?`子：${names(world,allBirds(world).filter(child=>child.parents?.includes(b.id)).map(child=>child.id))}`:''].filter(Boolean).join('<br>');
    return `<article class="life-grave" data-memorial-bird="${escape(b.id)}" data-memorial-design="${design.id}">${renderMemorialArtwork(design,b)}<h4>${escape(b.name)}</h4><p class="life-small">${escape(colors[b.color]||'文鳥')} · ${escape(ageLabel(world,b))}</p><p>${escape(causeLabel(state.death.cause))}で旅立ちました</p>${family?`<p class="life-family">${family}</p>`:''}<div class="life-memorial-counts"><span>お線香 ${number(state.incenseCount)}回</span><span>お祈り ${number(state.prayerCount)}回</span></div><div class="life-memorial-actions"><button type="button" data-life-incense="${escape(b.id)}" ${state.lastIncenseAt!=null&&now(world)-state.lastIncenseAt<60000?'disabled':''}>お線香をあげる</button><button type="button" data-life-pray="${escape(b.id)}" ${state.lastPrayerAt!=null&&now(world)-state.lastPrayerAt<60000?'disabled':''}>お祈りする</button></div><button type="button" class="life-memory-card" data-game-art="${escape(b.id)}">思い出の記念カード</button><a class="memorial-lineage-link" href="${design.sourceURL}" target="_blank" rel="noopener noreferrer" aria-label="${escape(design.linkLabel)}（DESIGN LINEAGE・新しいタブ）">${escape(design.linkLabel)}<span aria-hidden="true"> ↗</span></a></article>`;
  }).join('')||'<div class="life-empty"><span aria-hidden="true">❀</span><p>今は、まだお墓はありません。<br>一緒に過ごす今日を大切に。</p></div>'}</div></section>`;
}
