import {RAPTOR_SPECIES} from './data/raptor-species.js';
import {RAPTOR_ART,JAVA_LENGTH_AXIS} from './data/raptor-art.js';
import {raptorScene,raptorTarget,raptorFriendship,RAPTOR_RULES} from './garden-raptors.js';
import {JAVA_LENGTH_CM} from './garden-crows.js';
import {renderGardenBirdSprite} from './garden-bird-motion.js';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const image=(id,base)=>`${esc(base)}game-art/raptors/${esc(id)}.webp`;
export function renderRaptorNotice(w,{homeAttribute='data-game-raptor-home'}={}){
 const s=raptorScene(w);if(!s)return '';
 const seconds=Math.ceil(s.remainingMs/1000),urgent=s.hostile&&s.remainingMs<=10000,bird=raptorTarget(w),hostile=s.hostile,friendly=raptorFriendship(w,s.species.id).friendly;
 return `<aside class="game-raptor-notice ${hostile?'is-danger':'is-friendly'}" data-raptor-notice data-raptor-urgent="${urgent}" data-raptor-kind="${s.species.id}" data-raptor-phase="${hostile?'warning':'visiting'}" data-raptor-friendly="${friendly}" role="status" aria-live="polite"><div><strong data-raptor-heading>${esc(s.species.name)}${urgent?'・すぐおうちへ！':hostile?'が近づいている！':s.species.harmless?'が水辺に来たよ':friendly?'が遊びに来たよ':'が庭に来たよ'}</strong>${hostile?`<span class="game-raptor-deadline">あと <b data-raptor-seconds aria-live="off">${seconds}</b> 秒で危険</span><span class="game-raptor-instruction">${esc(bird?.name||'主人公')}をおうちへ。間に合わないと事故死してしまいます。</span>`:`<span class="game-raptor-instruction">${s.species.harmless?'魚を捕る水辺の仲間。文鳥は襲わないよ。':friendly?'もうなかよしだから、襲わないよ。':'庭を訪れています。そっと観察してみよう。'}</span>`}</div><button type="button" ${homeAttribute}>${urgent?'今すぐ帰る':'おうちへ戻る'}</button></aside>`;
}
export function updateRaptorNotice(root,w){
 const s=raptorScene(w);
 for(const notice of root.querySelectorAll('[data-raptor-notice]')){if(!s)notice.remove();else if(notice.dataset.raptorPhase!==s.phase||notice.dataset.raptorKind!==s.species.id||notice.dataset.raptorFriendly!==String(raptorFriendship(w,s.species.id).friendly))notice.outerHTML=renderRaptorNotice(w);}
 if(s)for(const dialog of root.querySelectorAll('dialog[open]'))if(!dialog.matches('.game-raptor-return-dialog')&&!dialog.querySelector('[data-raptor-notice]'))dialog.insertAdjacentHTML('afterbegin',renderRaptorNotice(w));
 if(s)for(const notice of root.querySelectorAll('[data-raptor-notice]')){
  const urgent=s.hostile&&s.remainingMs<=10000;
  if(notice.dataset.raptorUrgent!==String(urgent)){
   notice.dataset.raptorUrgent=String(urgent);
   const heading=notice.querySelector('[data-raptor-heading]');if(heading)heading.textContent=s.species.name+(urgent?'・すぐおうちへ！':s.hostile?'が近づいている！':s.species.harmless?'が水辺に来たよ':raptorFriendship(w,s.species.id).friendly?'が遊びに来たよ':'が庭に来たよ');
   const home=notice.querySelector('button');if(home)home.textContent=urgent?'今すぐ帰る':'おうちへ戻る';
  }
 }
 for(const node of root.querySelectorAll('[data-raptor-seconds]'))node.textContent=String(Math.ceil((s?.remainingMs||0)/1000));
}
/** Pixel/cm shares the Java Sparrow's measured profile. Upright owls use their
 * measured bill-to-tail axis, not a square canvas or horizontal footprint. */
export function renderRaptorScene(w,{base='/buncho-ureshi/'}={}){
 const s=raptorScene(w),b=raptorTarget(w);if(!s)return '';
 const art=RAPTOR_ART[s.species.id];if(!art)return '';
 const javaLength=JAVA_LENGTH_AXIS[b?.color]||JAVA_LENGTH_AXIS.white;
 const ratio=s.species.lengthCm/JAVA_LENGTH_CM,canvasRatio=ratio*javaLength/(art.lengthPx/art.width),heightRatio=canvasRatio*art.height/art.width;
 const left=1.5,width=Math.max(2.6,left+canvasRatio),topHeight=Math.max(1.2,heightRatio*art.footY);
 return `<div class="finch-raptor-scale-scene" data-raptor-species="${s.species.id}" data-length-ratio="${ratio}" data-length-axis="${art.lengthPx/art.width}" style="--raptor-span:${width};--raptor-height:${topHeight};--raptor-canvas-ratio:${canvasRatio};--raptor-aspect:${art.width}/${art.height};--raptor-foot-y:${art.footY};--raptor-foot-x:${art.footX}" aria-label="${b?`${esc(b.name)}と${esc(s.species.name)}。同じ縮尺で描いた全長の目安。`:`${esc(s.species.name)}。文鳥約14cmを基準にした全長の目安。`}">${b?`<div class="finch-raptor-java">${renderGardenBirdSprite(b.color,'raptor-protagonist',{base,pose:'right'})}<span>${esc(b.name)} · 約14cm</span></div>`:''}<figure class="finch-raptor-actor"><img src="${image(s.species.id,base)}" width="${art.width}" height="${art.height}" alt="${esc(s.species.name)}の全身イラスト" decoding="async"><figcaption>${esc(s.species.name)} · 約${s.species.lengthCm}cm</figcaption>${s.species.harmless?'<span class="finch-raptor-fish" aria-label="魚を捕っています"><svg viewBox="0 0 50 24" aria-hidden="true"><path d="M5 12 0 3v18L5 12C17-1 33 0 48 12 33 24 17 25 5 12Z" fill="#86a2a4" stroke="#405e67" stroke-width="2"/><circle cx="38" cy="10" r="2" fill="#243e49"/></svg></span>':''}</figure></div>`;
}
export function renderRaptorFriendship(w,id){
 const s=RAPTOR_SPECIES.find(s=>s.id===id),bond=raptorFriendship(w,id),visit=w.encounters.raptor?.visits.find(v=>v.id===id);if(!s||!bond.discovered)return '';
 return `<section class="finch-friendship" data-raptor-friendship><div class="finch-bond-heading"><strong>${bond.friendly?'なかよし':'親しみの記録'}</strong><span>庭で会った回数 ${visit?.count||0} 回</span></div><label>親しみ <span data-raptor-points>${bond.points}</span> ポイント<meter min="0" max="${RAPTOR_RULES.friendPoints}" value="${Math.min(bond.points,RAPTOR_RULES.friendPoints)}">${Math.min(bond.points,RAPTOR_RULES.friendPoints)}</meter></label><p>${s.harmless?'ミサゴは最初から文鳥を襲いません。なでて、もっと親しくなれます。':bond.friendly?'もう襲わないよ。この種類は、これからも安心していっしょに過ごせるよ。':'絵をなでると少しずつ親しくなるよ。親しみ100でなかよしになると、この種類はもう襲わなくなるよ。'}</p><p>指やマウスを絵の上で動かしてね。キーボードはEnterまたはスペース。</p></section>`;
}
export function renderRaptorCatalog(w,{base='/buncho-ureshi/'}={}){
 const cards=harmless=>RAPTOR_SPECIES.filter(s=>s.harmless===harmless).map((s,i)=>{const known=raptorFriendship(w,s.id).discovered;return `<button type="button" class="finch-card finch-raptor-card" data-raptor-entry="${s.id}" ${known?'':'disabled'}><img class="finch-art${known?'':' is-silhouette'}" src="${image(s.id,base)}" alt="${known?s.name:'まだ出会っていない鳥の影'}" draggable="false"><strong>${known?s.name:`まだ出会っていない鳥 ${i+1}`}</strong>${known?`<small>${s.harmless?'襲わない水辺の仲間':raptorFriendship(w,s.id).friendly?'なかよし · 襲わない':'天敵'}</small>`:''}</button>`;}).join('');
 const seen=w.encounters.raptor?.visits?.length||0;
 return `<section class="finch-raptor-catalog"><h4>猛禽類の記録</h4><p>出会い ${seen} / ${RAPTOR_SPECIES.length} 種類</p><p>庭で3秒過ごすと、カラスと猛禽をあわせて25%の抽選。その後も2分ごとに25%の抽選。次の猛禽との出会いは2分後から抽選できます。危険な来訪だけは全種類・全庭あわせて24時間に1回まで。その間も安全な来訪で図鑑を増やせます。危険な来訪では、帰るかどうかをえらぶ間は時間が止まります。「にわに のこる」を選んだら、残り時間以内におうちへ戻ってね。</p><div class="finch-catalog">${cards(false)}</div><h4>水辺の仲間 · 襲わない鳥</h4><div class="finch-catalog">${cards(true)}</div></section>`;
}
export function renderRaptorNotebook(w,{base='/buncho-ureshi/',id=null}={}){
 const s=RAPTOR_SPECIES.find(s=>s.id===id),visit=w.encounters.raptor?.visits.find(v=>v.id===id);
 if(!s||!visit)return `<section class="finch-notebook"><h3 tabindex="-1">猛禽類の記録</h3>${renderRaptorCatalog(w,{base})}<div class="finch-page-actions"><button data-crow-notebook>天敵の記録へ</button><button data-finch-go-garden>庭へ戻る</button></div></section>`;
 return `<article class="finch-entry finch-record-card finch-predator-record finch-raptor-entry"><h3 tabindex="-1">${s.name}</h3><p><i>${s.scientific}</i></p><figure class="finch-record-portrait"><div data-encounter-rub="${id}" tabindex="0" role="button" aria-label="${s.name}のゲームの絵をなでる。Enterまたはスペース。"><img src="${image(id,base)}" alt="${s.name}の全身イラスト" draggable="false"></div><figcaption class="finch-predator-relation">${s.harmless?'文鳥を襲わない、水辺の仲間':'親しみ100から、襲わない仲間'}</figcaption></figure>${renderRaptorFriendship(w,id)}<p class="finch-predator-pet"><strong>絵をなでて、もっと親しく。</strong><small>ゲーム用のオリジナルイラスト。現実の野鳥には触れず、離れて観察してね。</small></p><p>${s.description}</p><details data-notebook-reading="ecology"><summary>くわしい説明</summary><p>全長の目安 約${s.lengthCm}cm。文鳥約14cmを基準に、約${(s.lengthCm/JAVA_LENGTH_CM).toFixed(1)}倍の全長として描いています。立ち姿や個体差で見え方は変わります。</p><p>${s.harmless?'ミサゴは魚を捕る非攻撃の仲間です。':'警告・避難・事故死はゲームのルールです。猛禽類を悪者とするものではありません。'}現実の文鳥を屋外に放すことは勧めていません。</p></details>${s.sources?.length?`<details data-notebook-reading="sources"><summary>資料と出典</summary><ul>${s.sources.map(q=>`<li><a href="${esc(q.url)}" target="_blank" rel="noopener noreferrer">${esc(q.title)}</a></li>`).join('')}</ul></details>`:''}<nav class="finch-page-actions finch-route-actions" aria-label="ページの移動"><button type="button" data-finch-go-garden>庭へ戻る</button><button type="button" data-finch-go-home>おうちへ</button><button type="button" data-crow-notebook>天敵の記録へ</button></nav></article>`;
}
